/**
 * Writes members' official Facebook pages and websites, with how far each page
 * is confirmed, into the admin overrides table, as an editor saving the form
 * would. No member is created: each row must match exactly one sitting member
 * by name and constituency, or it is skipped and reported.
 *
 *   npx tsx scripts/apply-official-pages.ts            report, write nothing
 *   npx tsx scripts/apply-official-pages.ts --apply    write
 *   npx tsx scripts/apply-official-pages.ts --dir <folder> [--ids a,b] [--apply]
 *       read researched rows instead: <folder>/<id>.json, one per member, as
 *       described in the research brief (facebook, fbUsername, fbType,
 *       fbStatus, website, sourceUrl, evidence). Each must name a sitting member
 *       whose name and constituency match the roll; a member whose status is
 *       already set is left alone. A verified page must carry its sourceUrl.
 *
 * Fields (the brief's names, stored under the site's keys):
 *   fb_url → facebook, website → website, fb_page_id → fbPageId,
 *   fb_username → fbUsername, fb_type → fbType, fb_verified → fbVerified,
 *   fb_status → fbStatus, source_url → sourceUrl, last_checked → lastChecked.
 * A field a row does not give is left as it is. What each status shows is
 * decided in src/lib/history.ts (facebookState).
 *
 * The rows below were supplied by the owner on 2026-09-17. The site picks the
 * overrides up on its next build.
 */
import fs from 'node:fs';

const envFile = new URL('../.env.local', import.meta.url);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

import { allMembers, OFFICE_LABELS, type Member } from '../src/lib/data';
import { foldBangla, nameTokens } from '../src/lib/matching/nameMatch';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error('.env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };
const ACTOR = 'editorial: official Facebook pages and websites (owner list, 2026-09-17)';
const CHECKED = '2026-09-17';

interface Row {
  name: string;
  /** Null when the row names the member by office instead. */
  seat: string | null;
  /** An office from OFFICE_LABELS, when there is no seat to match on. */
  office?: string;
  /** Researched rows name their member by id; the name and seat must still agree. */
  byId?: string;
  fields: Partial<Record<'facebook' | 'fbPageId' | 'fbUsername' | 'fbType' | 'fbStatus' | 'website' | 'sourceUrl', string>>;
  note?: string;
}

const OWNER_ROWS: Row[] = [
  // verified
  { name: 'তারেক রহমান', seat: 'ঢাকা-১৭', fields: { facebook: 'https://www.facebook.com/tariquerahman.bdbnp', fbUsername: 'trahmanbnp', fbType: 'page', website: 'https://tariquerahman.info', fbStatus: 'verified' } },
  { name: 'ডা. শফিকুর রহমান', seat: null, office: 'বিরোধীদলীয় নেতা', fields: { facebook: 'https://www.facebook.com/Drshafiqurrahman.Official', fbType: 'page', fbStatus: 'verified' } },
  { name: 'আখতার হোসেন', seat: 'রংপুর-৪', fields: { facebook: 'https://www.facebook.com/akhters.official.page', fbType: 'page', website: 'https://akhterhossen.org', fbStatus: 'verified' } },
  { name: 'আমীর খসরু মাহমুদ চৌধুরী', seat: 'চট্টগ্রাম-১১', fields: { facebook: 'https://www.facebook.com/amirkhasrumahmudchowdhury.fb', fbType: 'profile', fbStatus: 'verified' } },
  { name: 'সালাহউদ্দিন আহমদ', seat: 'কক্সবাজার-১', fields: { facebook: 'https://www.facebook.com/salahuddin.a.bnp', fbType: 'page', fbStatus: 'verified' } },
  { name: 'রুমিন ফারহানা', seat: 'ব্রাহ্মণবাড়িয়া-২', fields: { facebook: 'https://www.facebook.com/rumeenfarhanaa', fbType: 'page', fbStatus: 'verified' } },
  { name: 'আবদুল হান্নান মাসউদ', seat: 'নোয়াখালী-৬', fields: { facebook: 'https://www.facebook.com/abdul.hannan.masud.480487', fbType: 'profile', website: 'https://abdulhannanmasud.com', fbStatus: 'verified' } },
  // pending
  { name: 'আসাদুল হাবিব দুলু', seat: 'লালমনিরহাট-৩', fields: { facebook: 'https://www.facebook.com/p/Asadul-Habib-Dulu-100078789522976', fbPageId: '100078789522976', fbType: 'profile', fbStatus: 'pending' }, note: 'like count low for a sitting minister' },
  { name: 'হাসনাত আবদুল্লাহ', seat: 'কুমিল্লা-৪', fields: { facebook: 'https://www.facebook.com/HasnatAbdullah1998', fbType: 'page', fbStatus: 'pending' }, note: 'follower count does not match reported figures for his verified page; he also runs a separate page for Debidwar' },
  // disputed
  { name: 'নাহিদ ইসলাম', seat: 'ঢাকা-১১', fields: { fbStatus: 'disputed', website: 'https://nahidislam.info' }, note: 'two candidate pages exist, nahidislamjuly and nahidislam.july36; official one not confirmed' },
  // website only
  { name: 'শহীদ উদ্দিন চৌধুরী এ্যানি', seat: 'লক্ষ্মীপুর-৩', fields: { website: 'https://aneechowdhury.com', fbStatus: 'not_found' } },
  { name: 'সুলতান সালাউদ্দিন টুকু', seat: 'টাঙ্গাইল-৫', fields: { website: 'https://sultansalauddintuku.com', fbStatus: 'disputed' }, note: 'four competing pages found, none confirmed' },
  { name: 'মীর শাহে আলম', seat: 'বগুড়া-২', fields: { website: 'https://mirshahealam.com', fbStatus: 'not_found' } },
];

/** A name for comparison: honorifics and initials out, spelling folded, spaces gone ("শহীদ উদ্দিন" = "শহীদউদ্দীন"). */
const nameKey = (s: string) => nameTokens(s).join('');
const seatKey = (s: string | null | undefined) => (s ? foldBangla(s).replace(/\s+/g, '') : '');

function matchRow(row: Row, sitting: Member[]): { member?: Member; problem?: string } {
  if (row.byId) {
    const m = sitting.find((x) => x.id === row.byId);
    if (!m) return { problem: `no sitting member with id ${row.byId}` };
    if (nameKey(m.nameBn ?? '') !== nameKey(row.name)) return { problem: `name ${row.name} is not the roll's ${m.nameBn}` };
    if (row.seat && seatKey(m.seat?.nameBn) !== seatKey(row.seat)) return { problem: `seat ${row.seat} is not the roll's ${m.seat?.nameBn}` };
    return { member: m };
  }
  const byName = sitting.filter((m) => nameKey(m.nameBn ?? '') === nameKey(row.name));
  let found: Member[];
  if (row.seat) {
    const bySeat = sitting.filter((m) => seatKey(m.seat?.nameBn) === seatKey(row.seat));
    found = byName.filter((m) => bySeat.includes(m));
    if (found.length !== 1) {
      const there = bySeat.map((m) => m.nameBn).join(', ') || 'no sitting member';
      return { problem: `name and constituency do not match one member: ${row.seat} is ${there}; members named ${row.name}: ${byName.length}` };
    }
  } else {
    found = byName.filter((m) => (m.offices ?? []).some((o) => OFFICE_LABELS[o] === row.office));
    if (found.length !== 1) return { problem: `no constituency given, and ${byName.length} members share the name; office ${row.office} matched ${found.length}` };
  }
  return { member: found[0] };
}

async function call(pathAndQuery: string, init: RequestInit = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, { ...init, headers: { ...HEAD, ...(init.headers ?? {}) } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${pathAndQuery.split('?')[0]} -> ${res.status} ${body}`);
  return body ? JSON.parse(body) : null;
}

interface Researched {
  id: string;
  nameBn: string;
  seat: string;
  facebook: string | null;
  fbUsername?: string | null;
  fbType?: string | null;
  fbStatus: string;
  website: string | null;
  sourceUrl: string | null;
  evidence?: string;
}

const STATUSES = new Set(['verified', 'pending', 'disputed', 'not_found']);
const TYPES = new Set(['page', 'profile', 'party_page']);
const isFacebook = (u: string) => /^https:\/\/(www\.)?facebook\.com\/[^\s?#]+$/.test(u);
const isHttps = (u: string) => /^https:\/\/[^\s/]+\.[^\s]+$/.test(u) && !/facebook\.com|wikipedia\.org/.test(u);

/** Researched files turned into rows, or a reason each one cannot be used. */
async function rowsFromDir(dir: string, only: Set<string> | null) {
  const rows: (Row & { id: string })[] = [];
  const rejected: { file: string; problem: string }[] = [];
  const status = new Map<string, string>();
  // Members whose status an editor or an earlier run has already set.
  const set = (await call('overrides?entity_type=eq.member&field=eq.fbStatus&select=entity_id,value')) as { entity_id: string; value: string }[];
  for (const r of set) status.set(r.entity_id, r.value);

  for (const file of fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort()) {
    const r = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8').replace(/^\uFEFF/, '')) as Researched;
    if (only && !only.has(r.id)) continue;
    const reject = (problem: string) => rejected.push({ file, problem });
    if (status.has(r.id)) { reject(`status already set (${status.get(r.id)}); left alone`); continue; }
    if (!STATUSES.has(r.fbStatus)) { reject(`unknown fbStatus ${r.fbStatus}`); continue; }
    if (r.fbType && !TYPES.has(r.fbType)) { reject(`unknown fbType ${r.fbType}`); continue; }
    if (r.facebook && !isFacebook(r.facebook)) { reject(`not a clean facebook.com link: ${r.facebook}`); continue; }
    if ((r.fbStatus === 'verified' || r.fbStatus === 'pending') && !r.facebook) { reject(`${r.fbStatus} without a link`); continue; }
    if ((r.fbStatus === 'disputed' || r.fbStatus === 'not_found') && r.facebook) { reject(`${r.fbStatus} must not carry a link`); continue; }
    if (r.fbStatus === 'verified' && !r.sourceUrl) { reject('verified without a sourceUrl'); continue; }
    if (r.website && !isHttps(r.website)) { reject(`website is not a plain https site: ${r.website}`); continue; }
    const fields: Row['fields'] = { fbStatus: r.fbStatus };
    if (r.facebook) fields.facebook = r.facebook;
    if (r.fbUsername) fields.fbUsername = r.fbUsername;
    if (r.fbType) fields.fbType = r.fbType;
    if (r.website) fields.website = r.website;
    if (r.sourceUrl) fields.sourceUrl = r.sourceUrl;
    rows.push({ id: r.id, name: r.nameBn, seat: r.seat === 'সংরক্ষিত আসন' ? null : r.seat, fields, note: r.evidence });
  }
  return { rows, rejected };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sitting = allMembers.filter((m) => !m.resignedOn);
  const dirAt = process.argv.indexOf('--dir');
  const idsAt = process.argv.indexOf('--ids');
  const only = idsAt >= 0 ? new Set(process.argv[idsAt + 1]!.split(',')) : null;
  let ROWS = OWNER_ROWS;
  if (dirAt >= 0) {
    const { rows, rejected } = await rowsFromDir(process.argv[dirAt + 1]!, only);
    for (const r of rejected) console.log(`REJECT ${r.file}: ${r.problem}`);
    // A researched row names its member by id; name and seat are checked against the roll.
    ROWS = rows.map((r) => ({ ...r, byId: r.id }));
  }
  const applied: { row: Row; member: Member }[] = [];
  const skipped: { row: Row; problem: string }[] = [];
  for (const row of ROWS) {
    const { member, problem } = matchRow(row, sitting);
    if (member) applied.push({ row, member });
    else skipped.push({ row, problem: problem! });
  }

  console.log(`rows ${ROWS.length}: to apply ${applied.length}, skipped ${skipped.length}\n`);
  for (const { row, member } of applied) {
    console.log(`APPLY  ${row.name} | ${row.seat ?? row.office ?? 'সংরক্ষিত'}  ->  ${member.nameBn} [${member.id}] ${member.seat?.nameBn ?? ''}`);
    if (row.byId && row.note) console.log(`         evidence    ${row.note}`);
    for (const [k, v] of Object.entries(row.fields)) {
      const old = (member as unknown as Record<string, unknown>)[k];
      console.log(`         ${k.padEnd(11)} ${old ?? '∅'} → ${v}`);
    }
  }
  for (const { row, problem } of skipped) console.log(`SKIP   ${row.name} | ${row.seat ?? row.office}: ${problem}`);
  if (!apply) {
    console.log('\nnothing written: pass --apply');
    return;
  }

  const now = new Date().toISOString();
  for (const { row, member } of applied) {
    const fields = { ...row.fields, lastChecked: CHECKED };
    const current = (await call(
      `overrides?entity_type=eq.member&entity_id=eq.${member.id}&select=field,value`,
    )) as { field: string; value: string | null }[];
    const before = new Map(current.map((o) => [o.field, o.value]));
    await call('overrides?on_conflict=entity_type,entity_id,field', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(Object.entries(fields).map(([field, value]) => ({
        entity_type: 'member', entity_id: member.id, field, value, updated_by: null, updated_at: now,
      }))),
    });
    await call('audit_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(Object.entries(fields).map(([field, value]) => ({
        actor: null, actor_email: ACTOR, action: 'override.set', entity_type: 'member', entity_id: member.id,
        field, old_value: before.get(field) ?? (member as unknown as Record<string, unknown>)[field] ?? null, new_value: value,
      }))),
    });
    // These links are an editor's now. While the Wikipedia marker stays, the
    // nightly social-wiki job treats a script's unsigned rows as its own and
    // would write over them; removing the marker is what saving the admin form does.
    if (before.has('socialSource')) {
      await call(`overrides?entity_type=eq.member&entity_id=eq.${member.id}&field=eq.socialSource`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await call('audit_log', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{ actor: null, actor_email: ACTOR, action: 'override.clear', entity_type: 'member', entity_id: member.id, field: 'socialSource', old_value: before.get('socialSource'), new_value: null }]),
      });
    }
    console.log(`written ${member.nameBn}: ${Object.keys(fields).length} fields${before.has('socialSource') ? ', Wikipedia marker removed' : ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
