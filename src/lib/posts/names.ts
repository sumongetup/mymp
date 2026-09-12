/**
 * Names as the Cabinet Division, parliament and the member list write them
 * differ in honorifics ("জনাব", "মোঃ", "ব্যারিস্টার"), in how "Md." is spelt,
 * and in small spelling habits ("আব্দুল" and "আবদুল"). normalizeName folds
 * all of that away so the same person gives the same key; nameSimilarity
 * scores what is left for the fuzzy step. Neither reads site data, so the
 * sync, the admin and the tests share them.
 */
import { foldBangla as fold, HONORIFICS } from '@/lib/matching/nameMatch';

/** Gallantry titles written after some names: "বীর বিক্রম", "বীর উত্তম", "বীর প্রতীক". */
const GALLANTRY = /বীর\s*(উত্তম|বিক্রম|প্রতীক|শ্রেষ্ঠ)/g;

/** The comparable form of a Bangla name. */
export function normalizeName(raw: string): string {
  const s = fold(
    raw
      .normalize('NFC')
      .replace(/\([^)]*\)/g, ' ') // (অব:), (অবঃ)
      // A credential after a final comma (", সিএফএ") goes; commas between initials ("এ, কে, এম, …") are just spaces.
      .replace(/,\s*[^,\s]{1,6}\s*$/, '')
      .replace(GALLANTRY, ' '),
  )
    .replace(/[ঃ.,:;'"‘’“”\-–—/]/g, ' ') // visarga in মোঃ/ডাঃ, dots, commas, dashes
    .replace(/\s+/g, ' ')
    .trim();
  return s
    .split(' ')
    .filter((t) => t && !HONORIFICS.has(t))
    .join(' ');
}

/**
 * A ministry name for comparing and grouping. The lists carry typing slips
 * ("কর্মসংংস্থান", "বিজ্ঞানও প্রযুক্তি", a stray hasanta in "প্রযু্ক্তি"); a later
 * fix must not read as a new ministry. Pages still show the list's own text.
 */
export function ministryKey(raw: string | null | undefined): string {
  return fold(raw ?? '')
    .replace(/([ংঃা-ৌ])\1+/g, '$1') // a sign typed twice
    .replace(/(\S)ও\s/g, '$1 ও ') // "বিজ্ঞানও প্রযুক্তি"
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EN_HONORIFICS = new Set(['md', 'mohammad', 'mohammed', 'muhammad', 'mohd', 'dr', 'barrister', 'advocate', 'adv', 'alhaj', 'alhajj', 'prof', 'professor', 'engr', 'engineer', 'major', 'general', 'brigadier', 'retd', 'mr', 'mrs', 'begum']);

/** The comparable form of an English name. */
export function normalizeNameEn(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/bir\s*(uttam|bikram|protik|sreshtho)/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !EN_HONORIFICS.has(t))
    .join(' ');
}

/** 1 for the same text, 0 for nothing alike: 1 minus the edit distance over the longer length. */
export function nameSimilarity(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (!x.length && !y.length) return 1;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[y.length]! / Math.max(x.length, y.length);
}
