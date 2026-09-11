/**
 * The Business Standard's Election 2026 page (tbsnews.net/election-2026)
 * carries the count for every seat in its page settings: each constituency's
 * candidates with name, party and votes, and whether counting was final. One
 * request reads all 300 seats; its robots.txt allows the page (it asks for 10
 * seconds between requests, which politeGet honours). Only the facts are kept:
 * names, parties and numbers, each seat linked to its TBS seat page.
 *
 * The source has small faults, handled openly rather than silently: a
 * candidate listed twice (dropped once, and said so), two names for one
 * party at the same count (shown together, and said so), and candidates
 * without a count (left out, and counted in the note).
 */
import { nameSimilarity, politeGet, mayFetch } from '@sangsad/shared';

export const TBS_INDEX = 'https://www.tbsnews.net/election-2026';

export interface TbsCandidate {
  name: string;
  /** As TBS writes it, e.g. "Bangladesh Nationalist Party (BNP)". */
  party: string;
  votes: number;
}
export interface TbsSeat {
  seatNo: number;
  seatName: string;
  url: string;
  /** Highest count first. */
  candidates: TbsCandidate[];
  /** Candidates the source lists without a count. */
  withoutVotes: number;
  /** Faults in the source, in Bangla, for the public note. */
  notes: string[];
}

/** The site's own slug rule, so each seat links to the page TBS shows for it. */
export const tbsSlug = (seatName: string) =>
  seatName
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

interface Settings {
  election2026?: {
    constituencies?: Record<string, { seat_number: string; seat_name: string; voting_finalized?: boolean; election_results?: Record<string, { votes: number | null }> }>;
    candidates?: Record<string, { diid: string; name: string; party: string }[]>;
  };
}

/** The Drupal.settings object embedded in the page. */
function settingsOf(html: string): Settings {
  const marker = 'jQuery.extend(Drupal.settings, ';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('TBS election page: no Drupal.settings block (the page layout changed)');
  const end = html.indexOf('</script>', start);
  const body = html.slice(start + marker.length, end).trim().replace(/\);\s*$/, '');
  return JSON.parse(body) as Settings;
}

/** Every seat whose count TBS marks final, with at least two candidates who have votes. */
export function parseTbs(html: string): Map<number, TbsSeat> {
  const e = settingsOf(html).election2026;
  if (!e?.constituencies || !e.candidates) throw new Error('TBS election page: no election2026 data');
  const out = new Map<number, TbsSeat>();
  for (const [cid, c] of Object.entries(e.constituencies)) {
    const seatNo = Number(c.seat_number);
    if (!c.voting_finalized || !Number.isInteger(seatNo)) continue;
    const listed = (e.candidates[cid] ?? []).map((x) => ({
      name: x.name.replace(/\s+/g, ' ').trim(),
      party: x.party.replace(/\s+/g, ' ').trim(),
      votes: c.election_results?.[x.diid]?.votes ?? null,
    }));
    const notes: string[] = [];
    const kept: TbsCandidate[] = [];
    for (const x of listed) {
      if (x.votes === null || !x.name) continue;
      const twin = kept.find((k) => k.party === x.party && k.votes === x.votes);
      if (twin && nameSimilarity(twin.name, x.name) >= 0.6) {
        notes.push(`উৎসে একই প্রার্থী দুবার আছে (${twin.name}, ${x.name}; একই দল, একই ভোট); একবার দেখানো হয়েছে।`);
        continue;
      }
      if (twin && !/independent/i.test(x.party)) {
        notes.push(`উৎসে একই দলের দুটি নাম (${twin.name}, ${x.name}) একই ভোটসংখ্যায় আছে; কোনটি সঠিক তা যাচাই করা হয়নি।`);
        twin.name = `${twin.name} / ${x.name}`;
        continue;
      }
      kept.push({ name: x.name, party: x.party, votes: x.votes });
    }
    if (kept.filter((k) => k.votes > 0).length < 2) continue;
    out.set(seatNo, {
      seatNo,
      seatName: c.seat_name,
      url: `https://www.tbsnews.net/election-2026-seat/${tbsSlug(c.seat_name)}`,
      candidates: kept.sort((a, b) => b.votes - a.votes),
      withoutVotes: listed.filter((x) => x.votes === null).length,
      notes,
    });
  }
  return out;
}

/** Reads the page once, if robots.txt allows it; null (with the reason logged) otherwise. */
export async function fetchTbs(): Promise<Map<number, TbsSeat> | null> {
  const allowed = await mayFetch(TBS_INDEX);
  if (!allowed.ok) {
    process.stdout.write(`  TBS not read: ${allowed.why}\n`);
    return null;
  }
  const r = await politeGet(TBS_INDEX, 'text/html', 60000);
  if (r.challenged || r.status !== 200) {
    process.stdout.write(`  TBS not read: HTTP ${r.status}${r.challenged ? ' (bot challenge; not worked around)' : ''}\n`);
    return null;
  }
  return parseTbs(r.text);
}
