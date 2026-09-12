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
  districtOf, partyColor, currentPosts, type Member,
} from '@/lib/data';
import { priorTermsOf, socialsOf } from '@/lib/history';

export interface AppParty {
  abbr: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  color: string;
  seats: number;
}

export interface AppMemberBrief {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string | null;
  photoUrl: string | null;
  gender: string | null;
  party: string | null;
  seatNo: number | null;
  seatBn: string | null;
  seatSlug: string | null;
  districtBn: string | null;
  /** "প্রধানমন্ত্রী", "স্পিকার", a ministry — whatever the site shows beside the name. */
  officeBn: string | null;
  reserved: boolean;
}

const office = (m: Member): string | null =>
  m.govPost ?? m.offices?.[0] ?? (m.ministryBn ? `${m.ministryBn}` : null);

const brief = (m: Member): AppMemberBrief => {
  const d = m.seat ? districtOf(m.seat) : null;
  return {
    id: m.id,
    slug: m.slug,
    nameBn: m.nameBn ?? m.nameEn ?? '',
    nameEn: m.nameEn,
    photoUrl: m.photoUrl,
    gender: m.gender,
    party: m.party?.abbr ?? null,
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
    })),
    districts,
    members: members.map(brief),
  };
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
      role: c.members.find((x) => x.memberId === m.id)?.role ?? null,
    })),
    priorTerms: priorTermsOf(m.id),
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
