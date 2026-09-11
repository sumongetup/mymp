/**
 * Bilingual search for MY MP.
 *
 * A reader types Bengali or English and gets the same result. No transliteration
 * guessing is needed for names, seats or parties, because parliament.gov.bd supplies
 * both scripts for every one of them; we simply index both and fold the spellings
 * that real Bangladeshi text varies on.
 *
 * The published index ships raw names only (about 15 KB gzipped for the whole
 * country). Normalising all of it in the browser costs roughly 8 ms once on load,
 * which is half the payload of shipping precomputed keys.
 *
 * Verified against all 349 sitting members on 9 September 2026.
 */

export type EntryType = 'seat' | 'member' | 'party' | 'district' | 'division';

/** One row as published in search-index.json: [type, bengali, english, url, subtitle] */
export type IndexRow = [EntryType, string, string, string, string];

export interface Entry {
  type: EntryType;
  bn: string;
  en: string;
  url: string;
  sub: string;
  /** normalised match keys, built in the browser */
  keys: string[];
}

const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/** Bengali letters and marks that readers routinely swap when typing a name. */
const BN_FOLD: [RegExp, string][] = [
  [/[‌‍]/g, ''],                       // zero-width joiners: invisible, break every match
  [/ঢ়/g, 'ড়'],
  [/য়/g, 'য'],
  [/[ীি]/g, 'ি'],                                 // long and short vowels fold together
  [/[ূু]/g, 'ু'],
  [/ণ/g, 'ন'],
  [/[ষশ]/g, 'স'],
  [/ঁ/g, ''],                                     // chandrabindu
  [/মোহাম্মদ|মুহাম্মদ|মোঃ|মো\./g, 'মো'],              // "Md." is written at least four ways
  [/ঃ/g, ''],                                     // visarga, decorative in abbreviations
  // Conjuncts are written both ways: আব্দুল and আবদুল, মাহ্‌মুদ and মাহমুদ, লুৎফর and
  // লুতফর. So the hasanta goes (after the "Md." rule, which spells মোহাম্মদ with one)
  // and khanda ta, which is ত with a hasanta, becomes ত.
  [/্/g, ''],
  [/ৎ/g, 'ত'],
  [/[।,\-–—()'"/]/g, ' '],
];

/** English spellings of the same Bangladeshi place or sound. */
const EN_FOLD: [RegExp, string][] = [
  [/\b(chittagong|chattagram)\b/g, 'chattogram'],
  [/\bbarisal\b/g, 'barishal'],
  [/\bbogra\b/g, 'bogura'],
  [/\bcomilla\b/g, 'cumilla'],
  [/\bjessore\b/g, 'jashore'],
  [/\b(maulvibazar|moulavibazar)\b/g, 'moulvibazar'],
  [/\b(laxmipur|lakhsmipur)\b/g, 'lakshmipur'],
  [/\bkhagrachhari\b/g, 'khagrachari'],
  [/\bjaipurhat\b/g, 'joypurhat'],
  [/\b(nababganj)\b/g, 'nawabganj'],
  [/\b(mohammad|muhammad|mohammed|md|mohd)\b/g, 'md'],
  [/\b(barrister|advocate|dr|prof|alhaj|alhajj|begum|engr|engineer)\b/g, ' '],
  [/ph/g, 'f'],
  [/[zj]/g, 'j'],
  [/v/g, 'b'],
  [/w/g, 'o'],
  [/kh/g, 'k'], [/gh/g, 'g'], [/th/g, 't'], [/dh/g, 'd'], [/bh/g, 'b'], [/ch/g, 'c'],
  [/([a-z])\1+/g, '$1'],                          // rahmaan -> rahman
  [/[aeiou]+/g, 'a'],                             // vowels are the least reliable part of a transliteration
];

export function normalise(raw: string): string {
  if (!raw) return '';
  let s = String(raw).normalize('NFC').toLowerCase();
  for (const [re, to] of BN_FOLD) s = s.replace(re, to);
  s = s.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
  // Apply the English rules only to Latin runs, so Bengali text is left alone.
  s = s.replace(/[a-z]+/g, (word) => {
    let w = ` ${word} `;
    for (const [re, to] of EN_FOLD) w = w.replace(re, to);
    return w.trim();
  });
  // Keep combining marks (\p{M}): Bangla vowel signs are marks, and turning them into
  // spaces split "তারেক" into "ত র ক", whose one-letter pieces match almost any name.
  return s.replace(/[^\p{L}\p{M}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Every key also gets a separator-free twin. That is what lets "বিএনপি" find the
 * official "বাংলাদেশ জাতীয়তাবাদী দল (বি.এন.পি)" and "cox's bazar" find the API's
 * own unspaced "Cox'sBazar-1".
 */
export function buildEntry(row: IndexRow): Entry {
  const [type, bn, en, url, sub] = row;
  const base = [bn, en].filter(Boolean).map(normalise).filter(Boolean);
  const compact = base.map((k) => k.replace(/ /g, '')).filter(Boolean);
  return { type, bn, en, url, sub, keys: [...new Set([...base, ...compact])] };
}

export function buildIndex(rows: IndexRow[]): Entry[] {
  return rows.map(buildEntry);
}

function score(entry: Entry, q: string, words: string[]): number {
  let best = 0;
  for (const key of entry.keys) {
    if (key === q) return 100;
    if (key.startsWith(q)) { best = Math.max(best, 80); continue; }
    // Every query word must appear, so "rahman dhaka" narrows rather than widens.
    if (words.length && words.every((w) => key.includes(w))) {
      best = Math.max(best, key.includes(q) ? 60 : 45);
    }
  }
  return best;
}

const TYPE_RANK: Record<EntryType, number> = {
  seat: 3, member: 2, party: 1, district: 1, division: 0,
};

export function search(index: Entry[], raw: string, limit = 8): Entry[] {
  const typed = normalise(raw);
  if (!typed) return [];

  const run = (q: string) => {
    const words = q.split(' ').filter(Boolean);
    return index
      .map((e) => ({ e, s: score(e, q, words) }))
      .filter((r) => r.s > 0);
  };

  // Try as typed; if nothing lands, try the separator-free form of the query too.
  let hits = run(typed);
  if (!hits.length) hits = run(typed.replace(/ /g, ''));

  return hits
    .sort((a, b) =>
      (b.s - a.s) ||
      (TYPE_RANK[b.e.type] - TYPE_RANK[a.e.type]) ||
      (a.e.keys[0]?.length ?? 0) - (b.e.keys[0]?.length ?? 0))
    .slice(0, limit)
    .map((r) => r.e);
}
