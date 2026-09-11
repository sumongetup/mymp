/**
 * `results:wikipedia`: draft 2026 general-election results for every
 * territorial seat from Wikipedia, for editors to check against the Election
 * Commission's gazette before anything is published.
 *
 * The owner chose this route (2026-09-11) because ecs.gov.bd answers bots
 * with a challenge, which nothing here works around. Wikipedia is read
 * through /wiki/<title>?action=raw (the raw path its robots.txt allows), one
 * request per second per host, Bangla first, then English. Only the "General election 2026" results box counts:
 * by-election boxes and boxes without real vote counts are skipped. Each
 * draft carries the article's link and the date it was read. Rows that already exist in
 * mymp.bd (an editor's draft or a published result) are never touched.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { and, eq, lte } from 'drizzle-orm';
import { schema } from '@sangsad/db';
import { mayFetch, nameSimilarity, normalise, politeGet, toLatinDigits } from '@sangsad/shared';
import type { Db } from './parliament-core';

const { constituencies, memberTerms, members, parliaments, parties } = schema;

const HONORIFICS = new Set(['মো', 'মুহাম্মদ', 'ডা', 'ড', 'ব্যারিস্টার', 'অ্যাডভোকেট', 'আলহাজ্ব', 'বেগম', 'প্রফেসর', 'ইঞ্জিনিয়ার'].map((w) => normalise(w)));
const bnTokens = (s: string) => normalise(s).replace(/\s+/g, ' ').split(' ').filter((t) => t && !HONORIFICS.has(t));

/** Whether a Wikipedia winner and a sitting member are the same person, allowing for spelling. */
export function sameName(wikiName: string, nameBn: string | null, nameEn: string | null): boolean {
  if (nameEn && /[A-Za-z]/.test(wikiName) && nameSimilarity(wikiName, nameEn) >= 0.8) return true;
  if (!nameBn) return false;
  const a = bnTokens(wikiName.replace(/\./g, ' '));
  const b = bnTokens(nameBn.replace(/\./g, ' '));
  if (!a.length || !b.length) return false;
  if (a.join('') === b.join('')) return true;
  // Compare consonant skeletons: vowel signs are where spellings of one name differ (মজিবুর / মজিবর).
  const skel = (t: string) => t.replace(/[ঁ-ঃা-্ৗ]/g, '');
  const setB = new Set(b.map(skel));
  return a.filter((t) => setB.has(skel(t))).length / Math.min(a.length, b.length) >= 0.75;
}

export interface WikiCandidate {
  name: string;
  party: string | null;
  votes: number;
}
export interface WikiResult {
  candidates: WikiCandidate[];
  turnout: number | null;
  title: string;
}

/* ---------------- wikitext parsing ---------------- */

/** Splits a template body on its top-level pipes, leaving [[a|b]] and nested {{…}} intact. */
export function splitParams(body: string): string[] {
  const out: string[] = [];
  let depthLink = 0;
  let depthTpl = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '[[') { depthLink++; cur += two; i++; continue; }
    if (two === ']]') { depthLink = Math.max(0, depthLink - 1); cur += two; i++; continue; }
    if (two === '{{') { depthTpl++; cur += two; i++; continue; }
    if (two === '}}') { depthTpl = Math.max(0, depthTpl - 1); cur += two; i++; continue; }
    if (body[i] === '|' && depthLink === 0 && depthTpl === 0) { out.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  out.push(cur);
  return out;
}

/** Plain text from a wikitext value: links reduced to their label, refs, templates and markup removed. */
export function plain(value: string): string {
  return value
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const numberOf = (v: string | undefined): number | null => {
  if (!v) return null;
  const s = toLatinDigits(plain(v)).replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
};

/** Top-level {{…}} templates in a stretch of wikitext, as name + params. */
function templates(text: string): { name: string; params: Record<string, string> }[] {
  const out: { name: string; params: Record<string, string> }[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text.slice(i, i + 2) !== '{{') continue;
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text.slice(j, j + 2) === '{{') { depth++; j++; continue; }
      if (text.slice(j, j + 2) === '}}') { depth--; j++; if (depth === 0) break; }
    }
    const body = text.slice(i + 2, j - 1);
    const [head = '', ...rest] = splitParams(body);
    const params: Record<string, string> = {};
    rest.forEach((p, k) => {
      const eq = p.indexOf('=');
      if (eq > 0) params[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
      else params[String(k + 1)] = p.trim();
    });
    out.push({ name: head.trim().toLowerCase(), params });
    i = j;
  }
  return out;
}

const BY_ELECTION = /by-?election|উপ-?নির্বাচন/i;
const GENERAL_2026 = /(2026|২০২৬|ত্রয়োদশ)/;

/** The 2026 general-election results box of an article, or null when there is none with real votes. */
export function parse2026(wikitext: string): WikiResult | null {
  const starts = [...wikitext.matchAll(/\{\{\s*Election box begin/gi)].map((m) => m.index!);
  for (const start of starts) {
    const stop = wikitext.slice(start).search(/\{\{\s*Election box end\s*\}\}/i);
    if (stop < 0) continue;
    const block = wikitext.slice(start, start + stop);
    const tpls = templates(block);
    const begin = tpls.find((t) => t.name.startsWith('election box begin'));
    const title = plain(begin?.params.title ?? '');
    if (!GENERAL_2026.test(title) || BY_ELECTION.test(title)) continue;
    const candidates: WikiCandidate[] = [];
    let turnout: number | null = null;
    for (const t of tpls) {
      if (/^election box (winning )?candidate/.test(t.name)) {
        const name = plain(t.params.candidate ?? '');
        const votes = numberOf(t.params.votes);
        if (!name || /^tbd$/i.test(name) || votes === null) continue;
        candidates.push({ name, party: plain(t.params.party ?? '') || null, votes });
      } else if (t.name.startsWith('election box turnout')) {
        turnout = numberOf(t.params.percentage);
      }
    }
    const real = candidates.filter((c) => c.votes > 0);
    if (real.length >= 2) return { candidates: real.sort((a, b) => b.votes - a.votes), turnout: turnout && turnout > 0 && turnout <= 100 ? turnout : null, title };
  }
  return null;
}

/* ---------------- fetching ---------------- */

interface WikiPage {
  title: string;
  wikitext: string;
}

const pageUrl = (host: string, title: string) => `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/**
 * Each article's wikitext through /wiki/<title>?action=raw, the one raw path
 * Wikipedia's robots.txt allows (it disallows /w/ and /api/, so the API is
 * not used). A redirect is followed once.
 */
async function fetchPages(host: string, titles: string[]): Promise<Map<string, WikiPage>> {
  const out = new Map<string, WikiPage>();
  for (const requested of titles) {
    let title = requested;
    for (let hop = 0; hop < 2; hop++) {
      const url = `${pageUrl(host, title)}?action=raw`;
      const allowed = await mayFetch(url);
      if (!allowed.ok) throw new Error(allowed.why);
      const r = await politeGet(url, 'text/x-wiki,text/plain;q=0.9,*/*;q=0.5');
      if (r.status === 404) break;
      if (r.status !== 200) throw new Error(`${host} HTTP ${r.status} for ${title}`);
      const redirect = r.text.match(/^#(?:REDIRECT|পুনর্নির্দেশ)\s*\[\[([^\]|#]+)/i)?.[1];
      if (redirect && hop === 0) {
        title = redirect.trim();
        continue;
      }
      out.set(requested, { title, wikitext: r.text });
      break;
    }
  }
  return out;
}

/** "Cox'sBazar-1" → "Cox's Bazar-1", the way Wikipedia titles constituencies. */
const enTitle = (s: string) => s.replace(/([a-z'’])([A-Z])/g, '$1 $2').trim();

/* ---------------- party labels ---------------- */

async function partyLabeller(db: Db) {
  const rows = await db.select({ nameBn: parties.nameBn, nameEn: parties.nameEn, short: parties.shortName }).from(parties);
  const byName = new Map<string, string>();
  for (const p of rows) {
    for (const n of [p.nameBn, p.nameEn]) if (n) byName.set(normalise(n.replace(/\(.*?\)/g, ' ')), p.short);
  }
  const extra: [RegExp, string][] = [
    [/independent|স্বতন্ত্র/i, 'Ind'],
    [/^(bnp|বিএনপি)$/i, 'BNP'],
    [/jamaat|জামায়াত|জামাত/i, 'BJEI'],
    [/national citizen party|জাতীয় নাগরিক পার্টি|এনসিপি/i, 'NCP'],
  ];
  return (label: string | null): string | null => {
    if (!label) return null;
    const hit = byName.get(normalise(label.replace(/\(.*?\)/g, ' ')));
    if (hit) return hit;
    for (const [re, abbr] of extra) if (re.test(label)) return abbr;
    return label;
  };
}

/* ---------------- job ---------------- */

export async function runResultsWiki(db: Db, parliamentNumber = 13): Promise<{ itemsFound: number; itemsNew: number }> {
  const [parl] = await db.select({ id: parliaments.id }).from(parliaments).where(eq(parliaments.number, parliamentNumber));
  if (!parl) throw new Error(`parliament ${parliamentNumber} not seeded`);
  const seats = await db
    .select({ number: constituencies.number, nameBn: constituencies.nameBn, nameEn: constituencies.nameEn })
    .from(constituencies)
    .where(and(eq(constituencies.parliamentId, parl.id), lte(constituencies.number, 300)));

  // The two hosts are read in parallel; each still gets one request per second.
  const [bnPages, enPages] = await Promise.all([
    fetchPages('bn.wikipedia.org', seats.map((s) => s.nameBn)),
    fetchPages('en.wikipedia.org', seats.map((s) => enTitle(s.nameEn))),
  ]);
  const label = await partyLabeller(db);
  const sitting = await db
    .select({ seatNo: constituencies.number, nameBn: members.nameBn, nameEn: members.nameEn })
    .from(memberTerms)
    .innerJoin(members, eq(members.id, memberTerms.memberId))
    .innerJoin(constituencies, eq(constituencies.id, memberTerms.constituencyId))
    .where(and(eq(memberTerms.parliamentId, parl.id), eq(memberTerms.role, 'MP')));
  const mpBySeat = new Map(sitting.map((m) => [m.seatNo, m]));

  const drafts: { seatNo: number; seat: string; result: WikiResult; sourceUrl: string; note: string }[] = [];
  const missing: string[] = [];
  for (const s of seats.sort((a, b) => a.number - b.number)) {
    const bn = bnPages.get(s.nameBn);
    const en = enPages.get(enTitle(s.nameEn));
    const bnRes = bn ? parse2026(bn.wikitext) : null;
    const enRes = en ? parse2026(en.wikitext) : null;
    const pick = bnRes ? { res: bnRes, page: bn!, host: 'bn.wikipedia.org', lang: 'বাংলা' } : enRes ? { res: enRes, page: en!, host: 'en.wikipedia.org', lang: 'ইংরেজি' } : null;
    if (!pick) {
      missing.push(`${s.number} ${s.nameBn}`);
      continue;
    }
    let note = `উৎস: উইকিপিডিয়া (${pick.lang}), নিবন্ধ «${pick.page.title}», ${new Date().toISOString().slice(0, 10)} তারিখে পড়া। নির্বাচন কমিশনের গেজেটের সঙ্গে মিলিয়ে দেখা হয়নি।`;
    if (bnRes && enRes && bnRes.candidates[0]!.votes !== enRes.candidates[0]!.votes) {
      note += ` ইংরেজি উইকিপিডিয়ায় বিজয়ীর ভোট ${enRes.candidates[0]!.votes}, বাংলায় ${bnRes.candidates[0]!.votes}।`;
    }
    const candidates = pick.res.candidates.map((c) => ({ ...c, party: label(c.party) }));
    const mp = mpBySeat.get(s.number);
    if (mp && sameName(candidates[0]!.name, mp.nameBn, mp.nameEn)) {
      // The same person: show the winner under the official Bangla name.
      candidates[0] = { ...candidates[0]!, name: mp.nameBn };
    } else if (mp) {
      note += ` বিজয়ীর নাম এই আসনের বর্তমান সংসদ সদস্য ${mp.nameBn}-এর সঙ্গে মেলেনি; উপনির্বাচন হয়ে থাকতে পারে, অথবা তথ্যটি ভুল।`;
    }
    drafts.push({
      seatNo: s.number,
      seat: s.nameBn,
      result: { ...pick.res, candidates },
      sourceUrl: pageUrl(pick.host, pick.page.title),
      note,
    });
  }

  const day = new Date().toISOString().slice(0, 10);
  const report = resolve(import.meta.dirname, `../../../docs/reports/results-wikipedia-${day}.json`);
  writeFileSync(report, JSON.stringify({ generatedAt: new Date().toISOString(), drafts: drafts.length, missing, items: drafts }, null, 1));
  process.stdout.write(`  seats with a usable 2026 result on Wikipedia: ${drafts.length} of ${seats.length}; report ${report}\n`);

  const url = process.env.MYMP_SUPABASE_URL;
  const key = process.env.MYMP_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    process.stdout.write('  not written to mymp.bd (MYMP_SUPABASE_URL / MYMP_SUPABASE_SERVICE_ROLE_KEY not set)\n');
    return { itemsFound: seats.length, itemsNew: 0 };
  }
  const mymp = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing, error } = await mymp.from('election_results').select('seat_no').eq('parliament_no', parliamentNumber);
  if (error) throw new Error(`mymp election_results read: ${error.message}`);
  const have = new Set((existing ?? []).map((r) => r.seat_no as number));
  const rows = drafts
    .filter((d) => !have.has(d.seatNo))
    .map((d) => ({
      seat_no: d.seatNo,
      parliament_no: parliamentNumber,
      candidates: d.result.candidates,
      total_votes: null,
      turnout: d.result.turnout,
      source_url: d.sourceUrl,
      source_note: d.note,
      status: 'draft',
    }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error: insertError } = await mymp.from('election_results').insert(rows.slice(i, i + 50));
    if (insertError) throw new Error(`mymp election_results insert: ${insertError.message}`);
  }
  process.stdout.write(`  mymp.bd: ${rows.length} drafts written, ${drafts.length - rows.length} seats already had a row\n`);
  return { itemsFound: seats.length, itemsNew: rows.length };
}
