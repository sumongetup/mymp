/**
 * The title and description every member's page uses for search results and
 * link previews, and as the first paragraph of the page itself, in full
 * Bangla sentences built from the member's record:
 *
 *   তারেক রহমান ঢাকা-১৭ আসন থেকে নির্বাচিত ত্রয়োদশ জাতীয় সংসদের সদস্য এবং
 *   বাংলাদেশ জাতীয়তাবাদী দলের চেয়ারম্যান। এই পাতায় তাঁর পরিচিতি … রয়েছে।
 *
 * The party role and a government post come only from sourced fields
 * (partyRoleBn, ministryBn and govPost: an editor's entry or a hand-checked
 * fact in the engine); without them the sentence says only what the record
 * holds. The description is held to 160 characters by dropping items from the
 * second sentence, never by cutting the first or breaking a word.
 */
import type { Member } from '@/lib/data';
import { dateBn } from '@/lib/data';

/** The full Bangla name of each party in the database, and its genitive as a sentence needs it. */
export const PARTY_BN: Record<string, { name: string; of: string }> = {
  BNP: { name: 'বাংলাদেশ জাতীয়তাবাদী দল', of: 'বাংলাদেশ জাতীয়তাবাদী দলের' },
  BJEI: { name: 'বাংলাদেশ জামায়াতে ইসলামী', of: 'বাংলাদেশ জামায়াতে ইসলামীর' },
  NCP: { name: 'জাতীয় নাগরিক পার্টি', of: 'জাতীয় নাগরিক পার্টির' },
  BKM: { name: 'বাংলাদেশ খেলাফত মজলিস', of: 'বাংলাদেশ খেলাফত মজলিসের' },
  IMB: { name: 'ইসলামী আন্দোলন বাংলাদেশ', of: 'ইসলামী আন্দোলন বাংলাদেশের' },
  GOP: { name: 'গণঅধিকার পরিষদ', of: 'গণঅধিকার পরিষদের' },
  BJP: { name: 'বাংলাদেশ জাতীয় পার্টি', of: 'বাংলাদেশ জাতীয় পার্টির' },
  KM: { name: 'খেলাফত মজলিস', of: 'খেলাফত মজলিসের' },
  PSM: { name: 'গণসংহতি আন্দোলন', of: 'গণসংহতি আন্দোলনের' },
  JAGPA: { name: 'জাতীয় গণতান্ত্রিক পার্টি', of: 'জাতীয় গণতান্ত্রিক পার্টির' },
};
const INDEPENDENT = new Set(['Ind', 'IND']);

/** Bangla genitive for a name not in the table: -র after a vowel sound, -এর (as ের) after a consonant. */
export function genitiveBn(s: string): string {
  const last = s.slice(-1);
  if (/[া-ৌৗঅ-ঔ]/.test(last)) return `${s}র`;
  if (/[ক-হড়ঢ়য়ৎং়]/.test(last)) return `${s}ের`;
  return `${s}-এর`;
}

/** A party's full name and genitive: from the table, else the source's name without its abbreviation. */
export function partyBn(party: Member['party']): { name: string; of: string } | null {
  if (!party) return null;
  const known = PARTY_BN[party.abbr];
  if (known) return known;
  const name = (party.nameBn ?? party.nameEn ?? party.abbr)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/-[^\s-]+$/, '')
    .trim();
  return { name, of: genitiveBn(name) };
}

export const isIndependent = (m: Pick<Member, 'party'>) => !!m.party && (INDEPENDENT.has(m.party.abbr) || m.party.nameBn === 'স্বতন্ত্র');

const GOV_POST_BN: Record<string, string> = {
  minister: 'মন্ত্রী',
  'state-minister': 'প্রতিমন্ত্রী',
  'state minister': 'প্রতিমন্ত্রী',
  'deputy-minister': 'উপমন্ত্রী',
  'deputy minister': 'উপমন্ত্রী',
  মন্ত্রী: 'মন্ত্রী',
  প্রতিমন্ত্রী: 'প্রতিমন্ত্রী',
  উপমন্ত্রী: 'উপমন্ত্রী',
};

type SeoMember = Pick<Member, 'nameBn' | 'nameEn' | 'party' | 'seat' | 'resignedOn'> & {
  partyRoleBn?: string | null;
  ministryBn?: string | null;
  govPost?: string | null;
};

/** "ঢাকা-১৭", or "সংরক্ষিত মহিলা আসন-১" for a reserved seat. */
export function constituencyBn(m: SeoMember): string | null {
  if (!m.seat) return null;
  const seat = m.seat.nameBn ?? m.seat.nameEn;
  return m.seat.reserved ? `সংরক্ষিত ${seat}` : seat;
}

/** `{name} | {constituency} | আমার এমপি` */
export function mpTitle(m: SeoMember): string {
  const where = constituencyBn(m);
  return [m.nameBn ?? m.nameEn, where, 'আমার এমপি'].filter(Boolean).join(' | ');
}

/** Sentence 1: who the member is, the party, and a government post when one is on record. */
export function mpSentence1(m: SeoMember): string {
  const name = m.nameBn ?? m.nameEn ?? '';
  const where = constituencyBn(m);
  const from = where ? `${where}${m.seat?.reserved ? '' : ' আসন'} থেকে ` : '';
  if (m.resignedOn) {
    return `${name} ${from}নির্বাচিত ত্রয়োদশ জাতীয় সংসদের সদস্য ছিলেন এবং ${dateBn(m.resignedOn)} তারিখে পদত্যাগ করেন।`;
  }
  const parts: string[] = [];
  const party = partyBn(m.party);
  if (isIndependent(m)) parts.push('স্বতন্ত্র সংসদ সদস্য');
  else if (party) parts.push(`${party.of} ${m.partyRoleBn?.trim() || 'সংসদ সদস্য'}`);
  const post = m.govPost ? GOV_POST_BN[m.govPost.trim().toLowerCase()] ?? GOV_POST_BN[m.govPost.trim()] : undefined;
  if (m.ministryBn?.trim() && post) parts.push(`বর্তমানে ${genitiveBn(m.ministryBn.trim())} ${post}`);
  const tail = parts.length === 0 ? '' : parts.length === 1 ? ` এবং ${parts[0]}` : `, ${parts.slice(0, -1).join(', ')} এবং ${parts[parts.length - 1]}`;
  return `${name} ${from}নির্বাচিত ত্রয়োদশ জাতীয় সংসদের সদস্য${tail}।`;
}

/** Items of sentence 2 in order, and the order they are dropped in when the description is too long. */
const ITEMS = ['পরিচিতি', 'নির্বাচনী ফলাফল', 'আগের মেয়াদ', 'সংসদীয় কমিটি', 'যোগাযোগের'];
const DROP_ORDER = ['নির্বাচনী ফলাফল', 'আগের মেয়াদ', 'সংসদীয় কমিটি'];
export const DESCRIPTION_MAX = 160;

const sentence2 = (items: string[]) =>
  `এই পাতায় তাঁর ${items.length > 1 ? `${items.slice(0, -1).join(', ')} ও ${items[items.length - 1]}` : items[0]} তথ্য রয়েছে।`;

/**
 * Characters as a reader sees them: grapheme clusters, so a conjunct with its
 * vowel sign counts once ("ত্রয়ো" is 3, not 7). The owner's own example
 * description is 131 by this count and 204 in code points.
 */
const graphemes = new Intl.Segmenter('bn', { granularity: 'grapheme' });
export const charCount = (s: string) => [...graphemes.segment(s)].length;

/** The description: sentence 1 whole, then as much of sentence 2 as fits in 160 characters. */
export function mpDescription(m: SeoMember): string {
  const first = mpSentence1(m);
  let items = [...ITEMS];
  const fits = (s: string) => charCount(s) <= DESCRIPTION_MAX;
  let text = `${first} ${sentence2(items)}`;
  for (const drop of DROP_ORDER) {
    if (fits(text)) break;
    items = items.filter((i) => i !== drop);
    text = `${first} ${sentence2(items)}`;
  }
  // Sentence 1 is never cut; when even the shortest second sentence will not fit, it stands alone.
  return fits(text) ? text : first;
}
