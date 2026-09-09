/**
 * The site's data layer.
 *
 * Everything is read from the committed snapshot in data/, refreshed by
 * `npm run sync`. No database call happens when a visitor loads a page.
 */
import membersJson from '../../data/members.json';
import committeesJson from '../../data/committees.json';
import partiesJson from '../../data/parties.json';
import seatsJson from '../../data/seats.json';
import metaJson from '../../data/meta.json';
import ecsJson from '../../data/ecs.json';
import { normalise } from './search';

export interface Party {
  abbr: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  seats: number;
  seatsTerritorial: number;
  seatsReserved: number;
}

export interface Seat {
  no: number;
  reserved: boolean;
  nameBn: string | null;
  nameEn: string | null;
  slug: string;
  boundaryBn: string | null;
}

export interface Member {
  id: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  photoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  professionBn: string | null;
  fatherBn: string | null;
  fatherEn: string | null;
  motherBn: string | null;
  motherEn: string | null;
  isFreedomFighter: boolean;
  presentAddressBn: string | null;
  permanentAddressBn: string | null;
  email: string | null;
  hasMobile: boolean;
  party: { abbr: string; nameBn: string | null; nameEn: string | null } | null;
  seat: Seat | null;
  offices: string[];
  status: string | null;
}

export interface CommitteeMemberRef {
  role: string;
  memberId: string;
}

export interface Committee {
  id: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  type: string | null;
  startDate: string | null;
  /** False when the roster still lists members of the previous parliament. */
  rosterCurrent: boolean;
  memberCount: number;
  members: CommitteeMemberRef[];
  /** Set when the same committee also has a record from the previous parliament. */
  previousStartDate?: string | null;
}

export const committeeCounts = () => ({
  total: committees.length,
  current: committees.filter((c) => c.rosterCurrent).length,
  pending: committees.filter((c) => !c.rosterCurrent).length,
});

export const members = membersJson as Member[];
export const committees = committeesJson as Committee[];
export const parties = partiesJson as Party[];
export const seats = seatsJson as (Seat & { memberId: string })[];
export const meta = metaJson as {
  parliamentNo: number;
  syncedAt: string;
  source: string;
  counts: Record<string, number>;
};

/**
 * National figures the Election Commission publishes on its own pages.
 * Kept separate from the parliament sync because they are read by a person,
 * not fetched: the commission's site sits behind bot protection.
 */
export const ecs = ecsJson as {
  source: string;
  sourceUrl: string;
  readOn: string;
  note: string;
  national: {
    registeredVoters: number;
    maleVoters: number;
    femaleVoters: number;
    pollingCentres: number;
    registeredParties: number;
  };
};

/** Bengali number grouping: 12,77,11,899 rather than 127,711,899. */
export function bnGroup(n: number): string {
  const s = String(n);
  if (s.length <= 3) return bn(s);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return bn(`${rest},${last3}`);
}

const bySlug = new Map(members.map((m) => [m.slug, m]));
const byId = new Map(members.map((m) => [m.id, m]));

export const getMember = (slug: string) => bySlug.get(slug);
export const getMemberById = (id: string) => byId.get(id);
export const getSeat = (slug: string) => seats.find((s) => s.slug === slug);
export const getParty = (slug: string) => parties.find((p) => p.slug === slug);
export const getCommittee = (slug: string) => committees.find((c) => c.slug === slug);

export const membersOfParty = (abbr: string) =>
  members.filter((m) => m.party?.abbr === abbr).sort(seatOrder);

export const seatOrder = (a: Member, b: Member) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999);

export const committeesOfMember = (id: string) =>
  committees.filter((c) => c.rosterCurrent && c.members.some((x) => x.memberId === id));

/**
 * The district a seat belongs to. Grouping keys off the English name because it is
 * stable, but the label shown is Bengali, since the site is Bengali first.
 * Reserved seats belong to no district.
 */
export function districtOf(
  seat: Seat | null,
): { en: string; bn: string; slug: string } | null {
  if (!seat || seat.reserved || !seat.nameEn) return null;
  const en = seat.nameEn.replace(/-\d+$/, '').trim();
  const bn = (seat.nameBn ?? en).replace(/-[০-৯\d]+$/, '').trim();
  return { en, bn, slug: en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') };
}

/** Party colour token. Anything outside the top four shares one colour. */
export function partyColor(abbr: string | null | undefined): string {
  switch (abbr) {
    case 'BNP': return 'var(--color-pbnp)';
    case 'BJEI': return 'var(--color-pjamaat)';
    case 'Ind': return 'var(--color-pind)';
    case 'NCP': return 'var(--color-pncp)';
    default: return 'var(--color-pother)';
  }
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Bengali numerals, used everywhere numbers appear in Bengali copy. */
export function bn(n: number | string): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export function dateBn(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
}

export const OFFICE_LABELS: Record<string, string> = {
  'speaker': 'স্পিকার',
  'deputy-speaker': 'ডেপুটি স্পিকার',
  'pm': 'প্রধানমন্ত্রী',
  'opposition-leader': 'বিরোধীদলীয় নেতা',
};

/** First letter of the Bengali name, for the avatar when a photo will not load. */
export function initial(m: Member): string {
  const name = (m.nameBn || m.nameEn || '?').trim();
  const stripped = name.replace(/^(মোঃ|মো\.|ব্যারিস্টার|ড\.|অ্যাডভোকেট)\s*/, '');
  return (stripped || name).charAt(0);
}

/* ---------------- statistics, all computed from the snapshot ---------------- */

export function statistics() {
  const territorial = members.filter((m) => m.seat && !m.seat.reserved);
  const reserved = members.filter((m) => m.seat?.reserved);
  const women = members.filter((m) => m.gender === 'Female');

  const ages = members
    .map((m) => ({ m, age: ageFrom(m.dateOfBirth) }))
    .filter((x): x is { m: Member; age: number } => x.age !== null)
    .sort((a, b) => a.age - b.age);

  const bands = [
    { label: '৩০-এর নিচে', test: (a: number) => a < 30 },
    { label: '৩০-৩৯', test: (a: number) => a >= 30 && a < 40 },
    { label: '৪০-৪৯', test: (a: number) => a >= 40 && a < 50 },
    { label: '৫০-৫৯', test: (a: number) => a >= 50 && a < 60 },
    { label: '৬০-৬৯', test: (a: number) => a >= 60 && a < 70 },
    { label: '৭০+', test: (a: number) => a >= 70 },
  ].map((b) => ({ label: b.label, count: ages.filter((x) => b.test(x.age)).length }));

  // Profession values arrive with invisible joiners and spelling variants, so the
  // same job appears more than once. Fold before counting, or the chart lies.
  const profs = new Map<string, { label: string; count: number }>();
  for (const m of members) {
    if (!m.professionBn) continue;
    const key = normalise(m.professionBn);
    if (!key) continue;
    const e = profs.get(key) ?? { label: m.professionBn.trim(), count: 0 };
    e.count++;
    profs.set(key, e);
  }

  return {
    total: members.length,
    territorial: territorial.length,
    reserved: reserved.length,
    women: women.length,
    womenTerritorial: territorial.filter((m) => m.gender === 'Female').length,
    womenReserved: reserved.filter((m) => m.gender === 'Female').length,
    freedomFighters: members.filter((m) => m.isFreedomFighter).length,
    withProfession: members.filter((m) => m.professionBn).length,
    youngest: ages[0] ?? null,
    oldest: ages[ages.length - 1] ?? null,
    medianAge: ages.length ? ages[Math.floor(ages.length / 2)].age : null,
    ageBands: bands,
    professions: [...profs.values()].sort((a, b) => b.count - a.count),
    majority: Math.floor(members.length / 2) + 1,
  };
}
