/**
 * A short introduction for every member, written only from facts this site
 * already shows on the member's page: parliament.gov.bd's record (party,
 * seat, birth date, profession, times elected, earlier terms, committees,
 * offices), the published 2026 result, and education and birthplace where
 * the member's Wikipedia article gives them in Bangla. No adjective and no
 * claim the data does not hold; a missing fact is left out, never filled.
 * Where parliament.gov.bd has written a biography (the Speaker and Deputy
 * Speaker) or an editor has written one, that is shown instead.
 */
import { bn, bnGroup, committeesOfMember, dateBn, districtOf, type Member } from './data';
import { parliamentOrdinal, priorTermsOf, type SeatResult } from './history';

const ZW = /[‌‍]/g;
const hasLatin = (s: string) => /[A-Za-z]/.test(s);

/** "ক, খ ও গ" */
function listBn(items: string[], sep = ', '): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(sep)} ও ${items[items.length - 1]}`;
}

/** Bangla genitive: "কমিটি" → "কমিটির", "বাংলাদেশ" → "বাংলাদেশের", "দল (বি.এন.পি)" → "দল (বি.এন.পি)-এর". */
export function genitive(s: string): string {
  const last = s.slice(-1);
  if (/[া-ৌৗঅ-ঔ]/.test(last)) return `${s}র`;
  if (/[ক-হড়ঢ়য়ৎং়]/.test(last)) return `${s}ের`;
  return `${s}-এর`;
}

/* ---------------- profession ---------------- */

/** Unicode as stored varies (য় in one code point or two, stray zero-width joiners); compare on one form. */
const nfc = (s: string) => s.normalize('NFC').replace(ZW, '');

/** Activities written as the person who does them, so the sentence reads "পেশায় তিনি …". */
const AS_PERSON = new Map(
  Object.entries({
    শিক্ষকতা: 'শিক্ষক',
    অধ্যাপনা: 'অধ্যাপক',
    কৃষি: 'কৃষিজীবী',
    আইনজীবি: 'আইনজীবী',
    সমাজসেবা: 'সমাজসেবক',
    'সমাজ সেবা': 'সমাজসেবক',
    গৃহিনী: 'গৃহিণী',
  }).map(([k, v]) => [nfc(k), nfc(v)]),
);
const PEOPLE = new Set(
  [
    'ব্যবসায়ী', 'আইনজীবী', 'শিক্ষক', 'চিকিৎসক', 'লেখক', 'প্রভাষক', 'শিল্পপতি', 'অবসরপ্রাপ্ত শিক্ষক', 'কৃষিজীবী',
    'সমাজসেবক', 'চাকরিজীবী', 'গৃহিণী', 'অধ্যাপক', 'অধ্যক্ষ', 'পরামর্শক', 'প্রকৌশলী', 'সাংবাদিক', 'ব্যারিস্টার',
    'উদ্যোক্তা', 'অর্থনীতিবিদ', 'আলেম', 'ব্যাংকার', 'ভূতত্ত্ববিদ', 'শিক্ষাবিদ', 'সামরিক কর্মকর্তা', 'সরকারি কর্মকর্তা',
    'সমাজকর্মী', 'হিসাববিদ',
  ].map(nfc),
);
/** Politics and offices are not professions here: every member holds a seat. */
const POLITICS = new RegExp(['সংসদ সদস্য', 'সাংসদ', 'এমপি', 'প্রতিমন্ত্রী', 'মন্ত্রী', 'রাজনীতিবিদ', 'রাজনৈতিক কর্মী', 'রাজনীতি'].map(nfc).join('|'), 'g');
const NOT_A_JOB = new RegExp(`^(${['অবসর', 'অবসরপ্রাপ্ত', 'অন্যান্য'].map(nfc).join('|')})$`);

/** One profession as the person who does it ("ব্যবসা" → "ব্যবসায়ী", "বেসরকারি চাকুরী" → "বেসরকারি চাকরিজীবী"), or null. */
function asPerson(word: string): string | null {
  const w = nfc(word).trim();
  if (!w) return null;
  const known = AS_PERSON.get(w) ?? (PEOPLE.has(w) ? w : null);
  if (known) return known;
  let m = w.match(new RegExp(`^(.+ )?(${['ব্যবসা', 'ব্যাবসা', 'ব্যবসায়'].map(nfc).join('|')})$`));
  if (m) return m[1] === nfc('আইন ') ? nfc('আইনজীবী') : `${m[1] ?? ''}${nfc('ব্যবসায়ী')}`;
  m = w.match(new RegExp(`^(.+ )?(${['চাকুরী', 'চাকরি'].map(nfc).join('|')})$`));
  if (m) return `${m[1] ?? ''}${nfc('চাকরিজীবী')}`;
  m = w.match(new RegExp(`^(.+ )?${nfc('ডাক্তার')}$`));
  if (m) return `${m[1] ?? ''}${nfc('চিকিৎসক')}`;
  return null;
}

/**
 * "পেশায় তিনি ব্যবসায়ী ও কৃষিজীবী।", or null when parliament's entry holds
 * nothing this table knows as a profession (the table on the page still
 * shows the entry as written).
 */
export function professionSentence(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Politics out first, then every "ও"/"এবং" that joined it becomes a plain separator ("রাজনীতি ও ব্যবসা" → "ব্যবসা").
  const clean = nfc(raw)
    .replace(/\(.*?\)/g, ' ')
    .replace(POLITICS, ' ')
    .replace(/(^|\s)(?:ও|এবং)(?=\s|$)/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = clean
    .split(/\s*[,،;/]\s*/)
    .map((p) => p.replace(/[।.]+$/, '').trim())
    .filter((p) => p && !NOT_A_JOB.test(p));
  if (!parts.length) return null;
  // "ব্যবসা কৃষি": two professions with only a space between them.
  const words = parts.flatMap((p) => (asPerson(p) || !p.split(' ').every((w) => asPerson(w)) ? [p] : p.split(' ')));
  const people = words.map(asPerson);
  if (!people.every(Boolean)) return null;
  return `পেশায় তিনি ${listBn([...new Set(people as string[])])}।`;
}

/* ---------------- education ---------------- */

const INSTITUTION = /(বিশ্ববিদ্যালয়|ইউনিভার্সিটি|কলেজ|বিদ্যালয়|স্কুল|মাদ্রাসা|মাদরাসা|একাডেমি|ইনস্টিটিউট|কামিল|আলিয়া)/;

/** "তাঁর শিক্ষাপ্রতিষ্ঠান: ক, খ ও গ।" from a Bangla education entry; degrees and notes are left to the table below. */
export function educationSentence(raw: string | null | undefined): string | null {
  if (!raw || hasLatin(raw)) return null;
  const places = [
    ...new Set(
      raw
        .split(/;\s*/)
        .map((p) => p.split(':')[0]!.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim())
        .filter((p) => INSTITUTION.test(p)),
    ),
  ];
  if (!places.length) return null;
  return `তাঁর শিক্ষাপ্রতিষ্ঠান: ${listBn(places, places.some((p) => p.includes(',')) ? '; ' : ', ')}।`;
}

/* ---------------- the introduction ---------------- */

export interface IntroContext {
  /** Offices in Bangla (প্রধানমন্ত্রী, চিফ হুইপ …), as the page shows them. */
  roles: string[];
  /** This parliament's result for the member's seat, when the member won it. */
  result: SeatResult | null;
  /** How the result card names its source, for "(… অনুযায়ী)". */
  resultSourceBy: string | null;
  year: number | null;
}

/** The introduction as paragraphs, or [] when the member has too little on record for one. */
export function introOf(m: Member, ctx: IntroContext): string[] {
  const name = m.nameBn ?? m.nameEn;
  if (!name) return [];
  const first: string[] = [];
  const second: string[] = [];

  // Who: party, seat, office.
  const party = m.party?.nameBn?.trim();
  const who = !party ? 'রাজনীতিবিদ' : party === 'স্বতন্ত্র' ? 'স্বতন্ত্র রাজনীতিবিদ' : `${genitive(party)} রাজনীতিবিদ`;
  const district = districtOf(m.seat);
  const seat = !m.seat
    ? null
    : m.seat.reserved
      ? `সংরক্ষিত ${m.seat.nameBn ?? m.seat.nameEn} থেকে`
      : `${district ? `${district.bn} জেলার ` : ''}${m.seat.nameBn ?? m.seat.nameEn} আসনের`;
  if (m.resignedOn) {
    first.push(`${name} ${who}; ত্রয়োদশ জাতীয় সংসদে ${seat ? `${seat} ` : ''}সংসদ সদস্য ছিলেন এবং ${dateBn(m.resignedOn)} তারিখে পদত্যাগ করেন।`);
  } else {
    first.push(`${name} ${who}; ত্রয়োদশ জাতীয় সংসদে ${seat ? `${seat} ` : ''}সংসদ সদস্য।`);
    if (ctx.roles.length) first.push(`বর্তমানে তিনি ${listBn(ctx.roles)}।`);
  }

  // Birth, birthplace (Bangla only), freedom fighter.
  const place = m.birthPlaceBn && !hasLatin(m.birthPlaceBn) ? m.birthPlaceBn.replace(/[।.]+$/, '') : null;
  if (m.dateOfBirth) first.push(`তিনি ${dateBn(m.dateOfBirth)} তারিখে জন্মগ্রহণ করেন${place ? `; জন্মস্থান ${place}` : ''}।`);
  else if (place) first.push(`তাঁর জন্মস্থান ${place}।`);
  if (m.isFreedomFighter) first.push('তিনি একজন মুক্তিযোদ্ধা।');

  const job = professionSentence(m.professionBn);
  if (job) first.push(job);
  const school = educationSentence(m.educationBn);
  if (school) first.push(school);

  // Parliament: times elected, earlier terms.
  const prior = [...priorTermsOf(m.id)].sort((a, b) => a.parliamentNo - b.parliamentNo);
  if (m.termsCount === 1) {
    second.push(`সংসদ সদস্য হিসেবে এটি তাঁর প্রথম মেয়াদ${m.resignedOn ? ' ছিল' : ''}।`);
  } else if (m.termsCount && m.termsCount > 1) {
    second.push(`এ নিয়ে তিনি মোট ${bn(m.termsCount)} বার সংসদ সদস্য নির্বাচিত হয়েছেন।`);
    // "অষ্টম সংসদ (বরিশাল-৫)"; the party only when it was not the member's present one.
    const earlier = prior.map((t) => {
      const detail = [t.seatNameBn, t.partyNameBn && t.partyNameBn !== party ? t.partyNameBn : null].filter(Boolean).join(', ');
      return `${parliamentOrdinal(t.parliamentNo)}${detail ? ` (${detail})` : ''}`;
    });
    // parliament.gov.bd has no member lists for some early parliaments, so the list may be short of the count.
    if (earlier.length === m.termsCount - 1) second.push(`আগের মেয়াদ: ${listBn(earlier)}।`);
    else if (earlier.length) second.push(`আগের মেয়াদের মধ্যে সংসদের তথ্যভান্ডারে আছে: ${listBn(earlier)}।`);
  }

  // The 2026 result, when the member won it.
  const r = ctx.result;
  if (r && r.candidates.length >= 2) {
    const [top, next] = [...r.candidates].sort((a, b) => b.votes - a.votes);
    if (top && next && top.votes > next.votes) {
      second.push(
        `${ctx.year ? `${bn(ctx.year)} সালের` : 'এই সংসদের'} নির্বাচনে তিনি ${bnGroup(top.votes)} ভোট পেয়ে নির্বাচিত হন; নিকটতম প্রতিদ্বন্দ্বীর চেয়ে ${bnGroup(top.votes - next.votes)} ভোট বেশি${ctx.resultSourceBy ? ` (${ctx.resultSourceBy})` : ''}।`,
      );
    }
  }

  // Committees of this parliament.
  const cs = committeesOfMember(m.id);
  if (cs.length) {
    const chairs = cs.filter((c) => c.members.find((x) => x.memberId === m.id)?.role === 'Chairman');
    const rest = cs.length - chairs.length;
    if (chairs.length) {
      const names = chairs.map((c) => c.nameBn ?? c.nameEn).filter(Boolean) as string[];
      second.push(`তিনি ${listBn(names.map(genitive))} সভাপতি${rest ? ` এবং আরও ${bn(rest)}টি সংসদীয় কমিটির সদস্য` : ''}।`);
    } else {
      second.push(`তিনি সংসদের ${bn(cs.length)}টি কমিটির সদস্য।`);
    }
  }

  return [first.join(' '), second.join(' ')].filter(Boolean);
}
