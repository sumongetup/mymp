/**
 * Names as the Cabinet Division, parliament and the member list write them
 * differ in honorifics ("জনাব", "মোঃ", "ব্যারিস্টার"), in how "Md." is spelt,
 * and in small spelling habits ("আব্দুল" and "আবদুল"). normalizeName folds
 * all of that away so the same person gives the same key; nameSimilarity
 * scores what is left for the fuzzy step. Neither reads site data, so the
 * sync, the admin and the tests share them.
 */

/** Spelling folds, applied to every name and to the honorific list alike. */
function fold(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u09CD/g, '') // hasanta: আব্দুল and আবদুল
    .replace(/\u09BC/g, '') // nukta: য় (NFC keeps it as য + ়) and য
    .replace(/ী/g, 'ি') // ী and ি
    .replace(/ূ/g, 'ু') // ূ and ু
    .replace(/ণ/g, 'ন') // ণ and ন
    .replace(/[ষশ]/g, 'স') // ষ, শ and স
    .replace(/ৎ/g, 'ত') // ৎ and ত
    .replace(/\u0981/g, '') // chandrabindu
    .toLowerCase();
}

/** Titles, honorifics and ranks: how a name is written, not whose it is. */
const HONORIFICS = new Set(
  [
    'মো', 'মোহাম্মদ', 'মোহাম্মাদ', 'মুহাম্মদ', 'মুহাম্মাদ', 'মুহম্মদ', 'মোহম্মদ', 'মোহাম্মেদ',
    'ডা', 'ডাক্তার', 'ড', 'ডক্টর', 'ব্যারিস্টার', 'ব্যারিষ্টার', 'অ্যাডভোকেট', 'এডভোকেট', 'অ্যাড',
    'জনাব', 'বেগম', 'আলহাজ্ব', 'আলহাজ', 'আলহাজ্জ', 'অধ্যাপক', 'প্রফেসর', 'প্রকৌশলী', 'ইঞ্জিনিয়ার', 'মাননীয়',
    'ব্রিগেডিয়ার', 'জেনারেল', 'মেজর', 'কর্নেল', 'লে', 'লেফটেন্যান্ট', 'ক্যাপ্টেন', 'কমোডর', 'অ্যাডমিরাল', 'অব',
  ].map(fold),
);

/** Gallantry titles written after some names: "বীর বিক্রম", "বীর উত্তম", "বীর প্রতীক". */
const GALLANTRY = /বীর\s*(উত্তম|বিক্রম|প্রতীক|শ্রেষ্ঠ)/g;

/** The comparable form of a Bangla name. */
export function normalizeName(raw: string): string {
  const s = fold(
    raw
      .normalize('NFC')
      .replace(/\([^)]*\)/g, ' ') // (অব:), (অবঃ)
      .split(',')[0]! // ", সিএফএ"
      .replace(GALLANTRY, ' '),
  )
    .replace(/[ঃ.:;'"‘’“”\-–—/]/g, ' ') // visarga in মোঃ/ডাঃ, dots, dashes
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
