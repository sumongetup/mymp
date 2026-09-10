/**
 * Person-name similarity for English transliterations of Bangla names.
 *
 * Built for matching one person across years of records that spell them
 * differently ("Lutfuzzaman Babor" / "Lutfozzaman Babar", "Mosarrof" /
 * "Mosharraf"). A high score means "could be the same name", never "is the
 * same person": the source holds several unrelated MPs with identical names,
 * so callers must add context (seat, district, date of birth, party) before
 * asserting identity. Ported from mymp.bd's history matcher.
 */

const TITLES =
  /\b(md|mohammad|muhammad|mohd|mohammed|mohammod|alhaj|alhajj|haji|hajee|advocate|adv|barrister|dr|prof|professor|engineer|engr|begum|late|mrs|mr|ms|major|maj|retd|ret|rtd|general|gen|brig|colonel|col|captain|capt|lt|justice|bir|bikram|uttam|protik|khan|sarkar|sarker|mia|miah|mian|khandaker|khandakar|khandoker|khondakar|khondkar|khondaker|kazi|quazi|syed|sayed|shaikh|sheikh|shekh)\b\.?/g;

const ALIAS: [RegExp, string][] = [
  [/ahmm?e?d|ahmad|ahamed|ahammed|ahammad/g, 'ahmad'],
  [/hoss?ain|hussain|hossen|hosen|husain/g, 'hossain'],
  [/rahaman|rahman/g, 'rahman'],
  [/chowdhury|choudhury|chaudhury|chowdhuri|chaudhuri/g, 'chowdhury'],
  [/haque|hoque|huq|hoq/g, 'haque'],
  [/siddiqu?e?y?|siddiqi/g, 'siddique'],
  [/uddin|oddin|udin/g, 'uddin'],
  [/abdul|abdool/g, 'abdul'],
  [/islam|eslam/g, 'islam'],
  [/kabir|kobir/g, 'kabir'],
  [/karim|korim/g, 'karim'],
  [/hasan|hassan|hasaan/g, 'hasan'],
  [/mahmud|mahmood|mahamud/g, 'mahmud'],
  [/salim|selim/g, 'selim'],
  [/jahan|zahan/g, 'jahan'],
  [/nur|noor|nure/g, 'nur'],
  [/zaman|jaman/g, 'zaman'],
  [/akter|akhter|aktar|akhtar/g, 'akter'],
];

/** Lower-case letters only, titles removed, common surnames aliased. */
export function nameKey(raw: string | null | undefined): string {
  let t = String(raw ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(TITLES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of ALIAS) t = t.replace(re, to);
  return t.replace(/\s/g, '');
}

/**
 * Consonant skeleton: vowels vary most between transliterations, so drop them
 * (except a leading one), fold aspirates, and collapse doubled letters.
 */
export function skeleton(key: string): string {
  return key
    .replace(/sh|ch/g, 's')
    .replace(/ph/g, 'f')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/q/g, 'k')
    .replace(/z/g, 'j')
    .replace(/w/g, 'v')
    .replace(/(?!^)[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const bigrams = (t: string): Set<string> => {
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};

/** Dice coefficient on letter bigrams, 0..1. */
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let hit = 0;
  for (const x of A) if (B.has(x)) hit++;
  return (2 * hit) / (A.size + B.size);
}

/**
 * The better of spelled and skeleton Dice, with containment ("Mirza Abbas"
 * inside "Mirza Abbas Uddin Ahmad") counted as similar when both are long.
 */
export function nameSimilarity(rawA: string | null | undefined, rawB: string | null | undefined): number {
  const a = nameKey(rawA);
  const b = nameKey(rawB);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))) return 0.9;
  return Math.max(dice(a, b), dice(skeleton(a), skeleton(b)));
}
