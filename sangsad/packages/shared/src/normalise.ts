/**
 * Bangla / English normalisation shared by search (web) and the matcher (worker).
 *
 * Readers and news desks spell the same name many ways. This folds the
 * variations real Bangladeshi text actually shows, so "মোঃ" and "মোহাম্মদ",
 * "Chittagong" and "Chattogram", "Rahmaan" and "Rahman" compare equal.
 * Ported from mymp.bd, where it was verified against all 349 sitting members.
 */

const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};
const LATIN_TO_BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Bengali digits for Bangla copy: 349 → ৩৪৯. */
export const bnDigits = (n: number | string): string => String(n).replace(/\d/g, (d) => LATIN_TO_BN[Number(d)] ?? d);

/** Latin digits from Bangla ones: ১১৮ → 118. */
export const toLatinDigits = (s: string): string => s.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);

/** Bengali letters and marks that readers routinely swap when typing a name. */
const BN_FOLD: [RegExp, string][] = [
  [/[‌‍]/g, ''], // zero-width joiners: invisible, break every match
  [/ঢ়/g, 'ড়'],
  [/য়/g, 'য'],
  [/[ীি]/g, 'ি'], // long and short vowels fold together
  [/[ূু]/g, 'ু'],
  [/ণ/g, 'ন'],
  [/[ষশ]/g, 'স'],
  [/ঁ/g, ''], // chandrabindu
  [/মোহাম্মদ|মুহাম্মদ|মুহম্মদ|মোঃ|মো\./g, 'মো'], // "Md." is written at least five ways
  [/ঃ/g, ''], // visarga, decorative in abbreviations
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
  [/([a-z])\1+/g, '$1'], // rahmaan -> rahman
  [/[aeiou]+/g, 'a'], // vowels are the least reliable part of a transliteration
];

/** Search key for a Bangla or English string; two spellings of one name give one key. */
export function normalise(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).normalize('NFC').toLowerCase();
  for (const [re, to] of BN_FOLD) s = s.replace(re, to);
  s = s.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
  // English rules only touch Latin runs, so Bengali text is left alone.
  s = s.replace(/[a-z]+/g, (word) => {
    let w = ` ${word} `;
    for (const [re, to] of EN_FOLD) w = w.replace(re, to);
    return w.trim();
  });
  // Keep combining marks (\p{M}): Bangla vowel signs are marks, and dropping
  // them would fold unrelated names such as কামাল and কমল together.
  return s.replace(/[^\p{L}\p{M}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}
