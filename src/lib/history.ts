/**
 * Earlier parliaments and election results.
 *
 * parliament.gov.bd keeps member records for the 4th, 5th and 7th to 12th
 * parliaments (the 1st to 3rd and the 6th are absent there). The sync matches
 * people across parliaments by the secretariat's own person id, and seats by
 * number within the same district. Vote counts do not exist in that source;
 * they come from the Election Commission's gazette through the admin panel,
 * and only published rows reach this file.
 */
import historyJson from '../../data/history.json';
import resultsJson from '../../data/results.json';
import { members, bn, type Member } from './data';

export interface PriorTerm {
  parliamentNo: number;
  seatNo: number | null;
  seatNameBn: string | null;
  seatNameEn: string | null;
  partyAbbr: string | null;
  partyNameBn: string | null;
}

export interface SeatHolder {
  parliamentNo: number;
  nameBn: string | null;
  nameEn: string | null;
  partyAbbr: string | null;
  partyNameBn: string | null;
  /** Set when the holder is a sitting member of the 13th parliament. */
  memberId: string | null;
}

export interface PartySeats {
  abbr: string;
  nameBn: string | null;
  territorial: number;
  reserved: number;
}

export interface ParliamentInfo {
  no: number;
  electionDate: string | null;
  oathDate: string | null;
  endDate: string | null;
  /** Members the source records for that parliament. */
  recorded: number;
}

export const history = historyJson as {
  parliaments: ParliamentInfo[];
  priorTerms: Record<string, PriorTerm[]>;
  seatHolders: Record<string, SeatHolder[]>;
  partySeats: Record<string, PartySeats[]>;
};

export interface Candidate {
  name: string;
  party: string | null;
  votes: number;
}

export interface SeatResult {
  seatNo: number;
  parliamentNo: number;
  candidates: Candidate[];
  totalVotes: number | null;
  turnout: number | null;
  sourceUrl: string;
  sourceNote: string | null;
}

export const results = resultsJson as SeatResult[];

const ORDINALS = ['', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'একাদশ', 'দ্বাদশ', 'ত্রয়োদশ', 'চতুর্দশ', 'পঞ্চদশ'];

export const parliamentInfo = (no: number) => history.parliaments.find((p) => p.no === no) ?? null;

/** "নবম সংসদ" */
export const parliamentOrdinal = (no: number) => `${ORDINALS[no] ?? `${bn(no)}তম`} সংসদ`;

/** "নবম সংসদ, ২০০৮" (the year of that parliament's election, when the source has it). */
export function parliamentLabel(no: number): string {
  const p = parliamentInfo(no);
  const year = p?.electionDate ? bn(new Date(p.electionDate).getFullYear()) : null;
  return year ? `${parliamentOrdinal(no)}, ${year}` : parliamentOrdinal(no);
}

export const electionYear = (no: number) => {
  const p = parliamentInfo(no);
  return p?.electionDate ? new Date(p.electionDate).getFullYear() : null;
};

/** Earlier terms of a sitting member, newest first. */
export const priorTermsOf = (memberId: string): PriorTerm[] => history.priorTerms[memberId] ?? [];

/** Who held a territorial seat in earlier parliaments, newest first. */
export const seatHolders = (seatNo: number): SeatHolder[] => history.seatHolders[String(seatNo)] ?? [];

/** The 2008 delimitation redrew most constituencies; older seats of the same number may cover different ground. */
export const SAME_AREA_SINCE = 9;

export const partySeatsOf = (parliamentNo: number): PartySeats[] => history.partySeats[String(parliamentNo)] ?? [];

export const parliamentsWithRecords = () => history.parliaments.filter((p) => p.recorded > 0).sort((a, b) => b.no - a.no);

export const resultsForSeat = (seatNo: number): SeatResult[] =>
  results.filter((r) => r.seatNo === seatNo).sort((a, b) => b.parliamentNo - a.parliamentNo);

export const resultForSeat = (seatNo: number, parliamentNo: number): SeatResult | null =>
  results.find((r) => r.seatNo === seatNo && r.parliamentNo === parliamentNo) ?? null;

/** How many sitting members are new to the House, and who has served most. */
export function experienceStats() {
  // Earlier terms: the secretariat's own count when it has one (it also covers the 1st to 3rd
  // and 6th parliaments, whose lists are not in the database), otherwise the terms matched here.
  const withTerms = members.map((m) => ({ m, prior: m.termsCount ? m.termsCount - 1 : priorTermsOf(m.id).length }));
  const bands = [
    { label: 'প্রথমবার', count: withTerms.filter((x) => x.prior === 0).length },
    { label: 'দ্বিতীয় মেয়াদ', count: withTerms.filter((x) => x.prior === 1).length },
    { label: 'তৃতীয় মেয়াদ', count: withTerms.filter((x) => x.prior === 2).length },
    { label: 'চতুর্থ বা তার বেশি', count: withTerms.filter((x) => x.prior >= 3).length },
  ];
  const most: { m: Member; terms: number }[] = withTerms
    .filter((x) => x.prior > 0)
    .sort((a, b) => b.prior - a.prior || (a.m.nameBn ?? '').localeCompare(b.m.nameBn ?? '', 'bn'))
    .slice(0, 8)
    .map((x) => ({ m: x.m, terms: x.prior + 1 }));
  return {
    firstTime: bands[0].count,
    returning: members.length - bands[0].count,
    bands,
    most,
  };
}

/**
 * The member's own accounts. "অফিসিয়াল" tells them apart from the share
 * buttons beside them on the profile (Facebook, X…); a Facebook page still
 * being checked drops the word (see socialsOf).
 */
export const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'অফিসিয়াল ফেসবুক পেজ', icon: 'facebook' },
  { key: 'x', label: 'অফিসিয়াল X', icon: 'x' },
  { key: 'youtube', label: 'অফিসিয়াল ইউটিউব চ্যানেল', icon: 'youtube' },
  { key: 'instagram', label: 'অফিসিয়াল ইনস্টাগ্রাম', icon: 'instagram' },
  { key: 'website', label: 'অফিসিয়াল ওয়েবসাইট', icon: 'globe' },
] as const;

/**
 * What the page may show for the member's Facebook, by fbStatus:
 *   verified (or not set)  the link
 *   pending                the link, marked "যাচাই করা হয়নি"
 *   disputed               no link, only "ফেসবুক পেজ যাচাই করা হয়নি"
 *   not_found              nothing
 */
export function facebookState(m: Member): { show: 'link'; unverified: boolean } | { show: 'notice'; text: string } | { show: 'nothing' } {
  const status = m.fbStatus ?? null;
  if (status === 'disputed') return { show: 'notice', text: 'ফেসবুক পেজ যাচাই করা হয়নি' };
  if (status === 'not_found' || !m.facebook) return { show: 'nothing' };
  return { show: 'link', unverified: status === 'pending' };
}

export const UNVERIFIED_LABEL = 'যাচাই করা হয়নি';

export interface SocialLink { key: string; label: string; icon: string; url: string; unverified: boolean }

/** The member's links the page shows, Facebook by the rule above. */
export const socialsOf = (m: Member): SocialLink[] => {
  const fb = facebookState(m);
  return SOCIAL_FIELDS.flatMap((f): SocialLink[] => {
    const url = (m as unknown as Record<string, string | null>)[f.key] ?? null;
    if (!url) return [];
    // A page still being checked is not called official.
    if (f.key === 'facebook') {
      if (fb.show !== 'link') return [];
      return [{ ...f, url, unverified: fb.unverified, label: fb.unverified ? 'ফেসবুক পেজ' : f.label }];
    }
    return [{ ...f, url, unverified: false }];
  });
};

/** The line shown in place of a Facebook link that is in dispute, or null. */
export const facebookNotice = (m: Member): string | null => {
  const fb = facebookState(m);
  return fb.show === 'notice' ? fb.text : null;
};
