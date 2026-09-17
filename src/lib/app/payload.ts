/**
 * What the mobile app is given.
 *
 * The app is a reader, so this is a read-only, unauthenticated, versioned view
 * of exactly what mymp.bd already publishes on its own pages — no more. A
 * member's home address and mobile number are in the source data and on
 * neither; they are not here either, and the shaping below is the only place
 * that decides so.
 *
 * `version` is the build stamp. The app keeps the last bootstrap it fetched and
 * only replaces it when this changes, so a phone on a slow connection opens
 * instantly and a corrected name still reaches it within the hour.
 */
import {
  members, parties, seats, meta, getMember, committeesOfMember, governmentPostsOf,
  districtOf, partyColor, partyShortBn, currentPosts, OFFICE_LABELS, type Member,
} from '@/lib/data';
import { priorTermsOf, socialsOf, resultForSeat } from '@/lib/history';
import { officers } from '@/lib/activity';
import { adviserForPost, getAdviser, adviserPosts } from '@/lib/advisers';
import { sourceList } from '@/lib/sourceLabel';

export interface AppParty {
  abbr: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  color: string;
  seats: number;
  /** "বিএনপি": what a chip on a phone has room for. */
  shortBn: string;
}

export interface AppMemberBrief {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string | null;
  photoUrl: string | null;
  gender: string | null;
  party: string | null;
  /** The party's short Bengali name, because a Bengali app should not read "BNP". */
  partyBn: string | null;
  seatNo: number | null;
  seatBn: string | null;
  seatSlug: string | null;
  districtBn: string | null;
  /** "প্রধানমন্ত্রী", "স্পিকার", a ministry — whatever the site shows beside the name. */
  officeBn: string | null;
  reserved: boolean;
}

/**
 * What the member holds, in Bengali: a House office first (the source stores
 * those as codes, "pm", "speaker"), then a post on the cabinet list, then an
 * editor's entry. A code must never reach a reader: the app once showed "pm".
 */
const office = (m: Member): string | null => {
  const house = (m.offices ?? []).map((o) => OFFICE_LABELS[o]).find(Boolean);
  if (house) return house;
  const post = governmentPostsOf(m.id)[0]?.title;
  if (post) return post;
  return m.govPost ?? null;
};

/**
 * Parties on the 2026 ballot that won no seat carry codes the party list does
 * not know. Named here where the name is certain; any other code is shown as
 * the source gives it rather than guessed.
 */
const BALLOT_PARTY_BN: Record<string, string> = {
  IAB: 'ইসলামী আন্দোলন',
  'JP(ERSHAD)': 'জাতীয় পার্টি',
  JUIB: 'জমিয়তে উলামায়ে ইসলাম',
  LDP: 'এলডিপি',
  CPB: 'সিপিবি',
  AB: 'এবি পার্টি',
  JSD: 'জাসদ',
  'Bangladesh JaSad': 'জাসদ',
  'Jatiya Samajtantrik Dal-JASAD': 'জাসদ',
  Basad: 'বাসদ',
  'Socialist Party of Bangladesh (Marxist)': 'বাসদ (মার্কসবাদী)',
  'Bangladesh Labour Party': 'বাংলাদেশ লেবার পার্টি',
  'Bangladesh Muslim League': 'বাংলাদেশ মুসলিম লীগ',
  'Bangladesh Congress': 'বাংলাদেশ কংগ্রেস',
  IOJ: 'ইসলামী ঐক্যজোট',
  'Janotar Dol': 'জনতার দল',
  'Amjanatar Dol': 'আমজনতার দল',
};

/** A ballot party's Bengali name, or null when it is not certain. */
export const partyLabelBn = (abbr: string | null | undefined): string | null => {
  if (!abbr) return null;
  const known = parties.find((p) => p.abbr === abbr);
  return known ? partyShortBn(known) ?? abbr : BALLOT_PARTY_BN[abbr] ?? null;
};

const COMMITTEE_ROLE_BN: Record<string, string> = { Chairman: 'সভাপতি', Member: 'সদস্য' };

export const brief = (m: Member): AppMemberBrief => {
  const d = m.seat ? districtOf(m.seat) : null;
  return {
    id: m.id,
    slug: m.slug,
    nameBn: m.nameBn ?? m.nameEn ?? '',
    nameEn: m.nameEn,
    photoUrl: m.photoUrl,
    gender: m.gender,
    party: m.party?.abbr ?? null,
    partyBn: partyShortBn(m.party),
    seatNo: m.seat?.no ?? null,
    seatBn: m.seat?.nameBn ?? null,
    seatSlug: m.seat?.slug ?? null,
    districtBn: d?.bn ?? null,
    officeBn: office(m),
    reserved: !m.seat,
  };
};

/** Everything the app holds offline: the member list, the parties, the districts. */
export function bootstrap() {
  const seatsByParty = new Map<string, number>();
  for (const m of members) if (m.party?.abbr) seatsByParty.set(m.party.abbr, (seatsByParty.get(m.party.abbr) ?? 0) + 1);

  const districts = [...new Set(members.map((m) => (m.seat ? districtOf(m.seat)?.bn : null)).filter((x): x is string => !!x))]
    .sort((a, b) => a.localeCompare(b, 'bn'));

  return {
    version: meta.builtAt,
    parliamentNo: meta.parliamentNo,
    counts: meta.counts,
    parties: parties.map<AppParty>((p) => ({
      abbr: p.abbr,
      slug: p.slug,
      nameBn: p.nameBn,
      nameEn: p.nameEn,
      color: partyColor(p.abbr),
      seats: seatsByParty.get(p.abbr) ?? 0,
      shortBn: partyShortBn(p) ?? p.abbr,
    })),
    districts,
    members: members.map(brief),
    leaders: leaders(),
  };
}

/**
 * The House's senior office holders, in the order a reader looks for them:
 * the Prime Minister, the Speaker and Deputy, the Leader of the Opposition,
 * the Chief Whip. The app shows these above the member list.
 */
function leaders() {
  const order = ['LEADER_OF_HOUSE', 'SPEAKER', 'DEPUTY_SPEAKER', 'OPPOSITION_LEADER', 'CHIEF_WHIP'];
  const label: Record<string, string> = {
    SPEAKER: 'স্পিকার',
    DEPUTY_SPEAKER: 'ডেপুটি স্পিকার',
    LEADER_OF_HOUSE: 'সংসদ নেতা',
    OPPOSITION_LEADER: 'বিরোধীদলীয় নেতা',
    CHIEF_WHIP: 'চিফ হুইপ',
  };
  const out: { roleBn: string; memberId: string }[] = [];
  for (const role of order) {
    for (const o of officers.filter((x) => x.role === role && x.memberId)) {
      const m = members.find((x) => x.id === o.memberId);
      if (!m || out.some((x) => x.memberId === m.id)) continue;
      // The Leader of the House is the Prime Minister, the title readers know; it fits a card's pill.
      const roleBn = role === 'LEADER_OF_HOUSE' && (m.offices ?? []).includes('pm') ? 'প্রধানমন্ত্রী' : label[role]!;
      out.push({ roleBn, memberId: m.id });
    }
  }
  return out;
}

/** The cabinet, in the order the site's মন্ত্রিসভা page uses. */
export function cabinet() {
  return {
    version: meta.builtAt,
    posts: currentPosts('government').map((p) => {
      const m = p.memberId ? members.find((x) => x.id === p.memberId) : null;
      return {
        title: p.title,
        ministryBn: p.ministryBn ?? null,
        fromDate: p.fromDate ?? null,
        member: m ? brief(m) : null,
        holderBn: p.nameBn,
        photoUrl: m ? m.photoUrl : p.photoUrl ?? null,
        adviserSlug: adviserForPost(p)?.slug ?? null,
      };
    }),
  };
}

/** One member's page, with the same facts the website shows and no others. */
export function memberDetail(slug: string) {
  const m = getMember(slug);
  if (!m) return null;
  const d = m.seat ? districtOf(m.seat) : null;
  const socials = socialsOf(m);

  return {
    version: meta.builtAt,
    ...brief(m),
    professionBn: m.professionBn,
    educationBn: m.educationBn ?? null,
    birthPlaceBn: m.birthPlaceBn ?? null,
    dateOfBirth: m.dateOfBirth,
    fatherBn: m.fatherBn,
    motherBn: m.motherBn,
    isFreedomFighter: m.isFreedomFighter,
    email: m.email,
    bioBn: m.bioBn,
    summaryBn: m.summaryBn,
    bioSource: m.bioSource ?? null,
    bioSources: sourceList(m.bioSources),
    bioFromWiki: m.bioFromWiki ?? null,
    term: m.term,
    termsCount: m.termsCount ?? null,
    status: m.status,
    resignedOn: m.resignedOn ?? null,
    partyRoleBn: m.partyRoleBn ?? null,
    ministryBn: m.ministryBn ?? null,
    partyNameBn: m.party?.nameBn ?? null,
    districtEn: d?.en ?? null,
    offices: m.offices ?? [],
    socials,
    governmentPosts: governmentPostsOf(m.id).map((p) => ({ title: p.title, ministryBn: p.ministryBn ?? null, fromDate: p.fromDate ?? null })),
    committees: committeesOfMember(m.id).map((c) => ({
      slug: c.slug,
      nameBn: c.nameBn,
      role: ((r) => (r ? COMMITTEE_ROLE_BN[r] ?? r : null))(c.members.find((x) => x.memberId === m.id)?.role),
    })),
    priorTerms: priorTermsOf(m.id),
    result: seatResult(m),
  };
}

/** The seat's 2026 result, every candidate by votes, where one has been published. */
function seatResult(m: Member) {
  if (!m.seat || m.seat.reserved) return null;
  const r = resultForSeat(m.seat.no, meta.parliamentNo);
  if (!r || !r.candidates.length) return null;
  return {
    candidates: [...r.candidates]
      .sort((a, b) => b.votes - a.votes)
      .map((c) => ({ name: c.name, party: c.party, partyBn: partyLabelBn(c.party), votes: c.votes })),
    sourceUrl: r.sourceUrl ?? null,
    sourceNote: r.sourceNote ?? null,
  };
}

/** The list the app's seat browser shows. */
export function seatList() {
  return {
    version: meta.builtAt,
    seats: seats.map((s) => {
      const d = districtOf(s);
      return {
        no: s.no,
        slug: s.slug,
        nameBn: s.nameBn,
        nameEn: s.nameEn,
        districtBn: d?.bn ?? null,
        memberId: s.memberId,
      };
    }),
  };
}

/** An adviser from outside parliament, for the app's profile screen. */
export function adviserDetail(slug: string) {
  const a = getAdviser(slug);
  if (!a) return null;
  const { rows, photoUrl } = adviserPosts(a);
  return {
    version: meta.builtAt,
    ...a,
    photoUrl,
    posts: rows.map((r) => ({ title: r.title, ministryBn: r.ministryBn ?? null, fromDate: r.fromDate ?? null })),
  };
}
