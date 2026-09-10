/**
 * The parliament job's logic, separated from its network calls so it runs
 * against PGlite in tests and Supabase in production.
 *
 * Everything here is an idempotent upsert keyed on parliament.gov.bd's own
 * ids. Nothing is invented: a field the source leaves empty stays null.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { schema } from '@sangsad/db';
import { nameSimilarity, normalise, slugify, toLatinDigits, PARLIAMENT_BASE } from '@sangsad/shared';
import { realDob, samePerson, type MatchReason, type PersonRecord } from './person-match';

const {
  committees, constituencies, memberAliases, memberCommittees, memberTerms, members, noticeMembers, notices,
  parliamentSessions, parliaments, parties, sittings,
} = schema;

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/* ---------------- raw shapes, exactly as the source sends them ---------------- */

export interface RawParty {
  id: number;
  nameEng: string | null;
  nameBng: string | null;
  abbreviation: string | null;
}
export interface RawTerm {
  parliamentNo: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  isPm?: boolean;
  isSpeaker?: boolean;
  isDeputySpeaker?: boolean;
  isOppositionLeader?: boolean;
  party?: { id: number; abbreviation?: string | null; nameEng?: string | null; nameBng?: string | null } | null;
  constituency?: { constituencyNo?: number | null; constituencyEng?: string | null; constituencyBng?: string | null } | null;
}
export interface RawMember {
  id: number;
  externalId: string;
  empId?: number | null;
  nameEng?: string | null;
  nameBng?: string | null;
  fatherNameBng?: string | null;
  motherNameBng?: string | null;
  dateOfBirth?: string | null;
  isFreedomFighter?: boolean | null;
  email?: string | null;
  presentAddressBng?: string | null;
  professionBn?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  speakerHeroSummaryBn?: string | null;
  speakerDetailsBioBn?: string | null;
  updatedAt?: string | null;
  terms?: RawTerm[] | null;
}
export interface RawOfficer {
  role: string;
  nameBn?: string | null;
  nameEn?: string | null;
  isCurrent?: boolean;
  parliamentNo?: number | null;
  sortOrder?: number | null;
}
export interface RawCommittee {
  id: number;
  nameEn?: string | null;
  nameBn?: string | null;
  type?: string | null;
  startDate?: string | null;
  members?: { role?: string | null; member?: { externalId?: string | null } | null }[] | null;
}
export interface RawSession {
  id: number;
  titleBn?: string | null;
  titleEn?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  poripotras?:
    | { id: number; poripotraNo?: number | null; orderOfTheDays?: { id: number; titleBn?: string | null; date?: string | null; pdfUrl?: string | null }[] | null }[]
    | null;
}
export interface RawNotice {
  id: number;
  noticeType?: string | null;
  category?: string | null;
  date?: string | null;
  titleBn?: string | null;
  titleEn?: string | null;
  pdfUrl?: string | null;
  committeeId?: number | null;
}

export interface ParliamentPayload {
  parliamentNumber: number;
  parties: RawParty[];
  members: RawMember[];
  officers: RawOfficer[];
  committees: RawCommittee[];
  sessions: RawSession[];
  notices: RawNotice[];
  /** Earlier parliaments' member lists, keyed by parliament number. */
  earlier: Record<number, RawMember[]>;
}

/* ---------------- helpers ---------------- */

const clean = (v: string | null | undefined) => (typeof v === 'string' ? v.trim() : '') || null;
const isoDate = (v: string | null | undefined) => {
  const s = clean(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const dobOrNull = (v: string | null | undefined) => (realDob(isoDate(v)) ? isoDate(v) : null);

/** The Speaker biographies arrive as HTML; the site renders plain paragraphs. */
export const htmlToText = (html: string | null | undefined) =>
  clean(
    String(html ?? '')
      .replace(/<\/p>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  );

const OFFICIAL_MAIL = /@parliament\.gov\.bd$/i;
const genderOf = (v: string | null | undefined): 'male' | 'female' | 'unknown' =>
  v === 'Male' ? 'male' : v === 'Female' ? 'female' : 'unknown';

const termOf = (m: RawMember, parliamentNo: number): RawTerm | undefined =>
  (m.terms ?? []).find((t) => t.parliamentNo === parliamentNo) ?? (m.terms ?? [])[0];

export const OFFICER_ROLES: Record<string, string> = {
  SPEAKER: 'Speaker',
  DEPUTY_SPEAKER: 'Deputy Speaker',
  LEADER_OF_HOUSE: 'Leader of the House',
  OPPOSITION_LEADER: 'Leader of the Opposition',
  CHIEF_WHIP: 'Chief Whip',
  WHIP: 'Whip',
};

/** Honorifics that readers and news desks drop; each stripped form becomes an alias. */
const BN_HONORIFICS = /^(ব্যারিস্টার|ব্যারিষ্টার|অ্যাডভোকেট|এডভোকেট|ডাঃ|ডা\.|ড\.|প্রফেসর|অধ্যাপক|ইঞ্জিনিয়ার|আলহাজ্ব|আলহাজ|মেজর|জেনারেল|বেগম|জনাব|মোঃ|মো\.|মোহাম্মদ|মুহাম্মদ)\s+/u;
const EN_HONORIFICS = /^(barrister|advocate|adv\.?|dr\.?|prof\.?|professor|engineer|engr\.?|alhaj|alhajj|major|general|gen\.?|begum|md\.?|mohammad|muhammad|mohd\.?)\s+/i;

export function aliasVariants(nameBn: string | null, nameEn: string | null): { alias: string; language: 'bn' | 'en' }[] {
  const out = new Map<string, 'bn' | 'en'>();
  const push = (s: string | null, language: 'bn' | 'en') => {
    const v = clean(s);
    if (v && v.length > 2) out.set(v, language);
  };
  push(nameBn, 'bn');
  push(nameEn, 'en');
  // Peel honorifics one at a time so "ডাঃ মোঃ শফিকুর রহমান" also yields "শফিকুর রহমান".
  let bn = clean(nameBn);
  for (let i = 0; bn && i < 3; i++) {
    const next = bn.replace(BN_HONORIFICS, '');
    if (next === bn) break;
    push(next, 'bn');
    bn = next;
  }
  let en = clean(nameEn);
  for (let i = 0; en && i < 3; i++) {
    const next = en.replace(EN_HONORIFICS, '');
    if (next === en) break;
    push(next, 'en');
    en = next;
  }
  // Names in brackets are nicknames: "A.B.M. Ashraf Uddin (Nizan)" → "Nizan"
  for (const [s, language] of [[nameBn, 'bn'], [nameEn, 'en']] as const) {
    const nick = clean(s)?.match(/\(([^)]{2,})\)/)?.[1];
    if (nick) push(nick, language);
  }
  return [...out.entries()].map(([alias, language]) => ({ alias, language }));
}

/** "জনাব X, ১১৮ ভোলা-৪", "৩১২ মহিলা আসন-১২" and "(293 Chattagram-16)" all carry the seat number. */
export function seatInTitle(title: string | null | undefined): number | null {
  const m = String(title ?? '').match(/(?:^|[\s,(])([০-৯\d]{1,3})\s+(?:মহিলা\s+আসন|[^\s,()]+)-[০-৯\d]+/u);
  return m ? Number(toLatinDigits(m[1]!)) : null;
}

/* ---------------- sync steps ---------------- */

export interface SittingMember {
  id: number;
  externalId: string;
  nameBn: string | null;
  nameEn: string | null;
  person: PersonRecord;
}

export async function syncParties(db: Db, raw: RawParty[]): Promise<Map<number, number>> {
  const ids = new Map<number, number>();
  for (const p of raw) {
    const nameEn = clean(p.nameEng);
    const nameBn = clean(p.nameBng);
    if (!nameEn && !nameBn) continue;
    const [row] = await db
      .insert(parties)
      .values({ sourceId: p.id, nameBn: nameBn ?? nameEn!, nameEn: nameEn ?? nameBn!, shortName: clean(p.abbreviation) ?? nameEn ?? nameBn! })
      .onConflictDoUpdate({
        target: parties.sourceId,
        set: { nameBn: sql`excluded.name_bn`, nameEn: sql`excluded.name_en`, shortName: sql`excluded.short_name` },
      })
      .returning({ id: parties.id });
    if (row) ids.set(p.id, row.id);
  }
  return ids;
}

export interface MembersResult {
  sitting: SittingMember[];
  byExternalId: Map<string, SittingMember>;
  parliamentId: number;
  seatIdByNumber: Map<number, number>;
  photoSourceChanged: number;
}

export async function syncMembers(
  db: Db,
  parliamentNumber: number,
  raw: RawMember[],
  partyIdBySource: Map<number, number>,
): Promise<MembersResult> {
  const [parl] = await db.select().from(parliaments).where(eq(parliaments.number, parliamentNumber));
  if (!parl) throw new Error(`parliament ${parliamentNumber} is not seeded`);
  const seatRows = await db
    .select({ id: constituencies.id, number: constituencies.number })
    .from(constituencies)
    .where(eq(constituencies.parliamentId, parl.id));
  const seatIdByNumber = new Map(seatRows.map((s) => [s.number, s.id]));

  // Two sitting members can share a name; the seat then disambiguates the slug.
  const baseSlug = (m: RawMember) => slugify(clean(m.nameEng) ?? m.externalId);
  const slugCount = new Map<string, number>();
  for (const m of raw) slugCount.set(baseSlug(m), (slugCount.get(baseSlug(m)) ?? 0) + 1);

  const existing = await db
    .select({ ext: members.sourceExternalId, photo: members.photoSourceUrl })
    .from(members)
    .where(inArray(members.sourceExternalId, raw.map((m) => m.externalId)));
  const previousPhoto = new Map(existing.map((e) => [e.ext, e.photo]));

  const sitting: SittingMember[] = [];
  let photoSourceChanged = 0;
  for (const m of raw) {
    const term: Partial<RawTerm> = termOf(m, parliamentNumber) ?? {};
    const c: NonNullable<RawTerm['constituency']> = term.constituency ?? {};
    const seatNo = typeof c.constituencyNo === 'number' ? c.constituencyNo : null;
    const slug =
      (slugCount.get(baseSlug(m)) ?? 0) > 1 && clean(c.constituencyEng)
        ? `${baseSlug(m)}-${slugify(c.constituencyEng)}`
        : baseSlug(m);
    const photoSourceUrl = clean(m.photoUrl);
    const photoChanged = previousPhoto.has(m.externalId) && previousPhoto.get(m.externalId) !== photoSourceUrl;
    if (photoChanged) photoSourceChanged++;
    const email = clean(m.email);

    const values = {
      slug,
      nameBn: clean(m.nameBng) ?? clean(m.nameEng) ?? m.externalId,
      nameEn: clean(m.nameEng),
      photoSourceUrl,
      dateOfBirth: dobOrNull(m.dateOfBirth),
      gender: genderOf(m.gender),
      professionBn: clean(m.professionBn),
      fatherNameBn: clean(m.fatherNameBng),
      motherNameBn: clean(m.motherNameBng),
      presentAddressBn: clean(m.presentAddressBng),
      officialEmail: email && OFFICIAL_MAIL.test(email) ? email : null,
      isFreedomFighter: !!m.isFreedomFighter,
      officialSummaryBn: clean(m.speakerHeroSummaryBn),
      officialBioBn: htmlToText(m.speakerDetailsBioBn),
      sourceExternalId: m.externalId,
      sourcePersonId: typeof m.empId === 'number' ? m.empId : null,
      sourceUrl: `${PARLIAMENT_BASE}/api/members/${m.id}`,
      sourceUpdatedAt: m.updatedAt && !Number.isNaN(Date.parse(m.updatedAt)) ? new Date(m.updatedAt) : null,
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(members)
      .values(values)
      .onConflictDoUpdate({
        target: members.sourceExternalId,
        set: {
          ...values,
          // A new source photo invalidates our copy; the photos job fetches it again.
          ...(photoChanged ? { photoUrl: null } : {}),
        },
      })
      .returning({ id: members.id });
    if (!row) continue;

    const partyId = term.party?.id !== undefined ? (partyIdBySource.get(term.party.id) ?? null) : null;
    const termValues = {
      memberId: row.id,
      parliamentId: parl.id,
      constituencyId: seatNo !== null ? (seatIdByNumber.get(seatNo) ?? null) : null,
      seatLabelBn: clean(c.constituencyBng),
      seatLabelEn: clean(c.constituencyEng),
      partyId,
      startDate: isoDate(term.startDate),
      endDate: isoDate(term.endDate),
      matchedBy: null,
      sourceUrl: `${PARLIAMENT_BASE}/api/members/${m.id}`,
    };
    const roles = ['MP'];
    if (term.isSpeaker) roles.push('Speaker');
    if (term.isDeputySpeaker) roles.push('Deputy Speaker');
    if (term.isPm) roles.push('Prime Minister');
    if (term.isOppositionLeader) roles.push('Leader of the Opposition');
    for (const role of roles) {
      await db
        .insert(memberTerms)
        .values({ ...termValues, role })
        .onConflictDoUpdate({
          target: [memberTerms.memberId, memberTerms.parliamentId, memberTerms.role],
          set: {
            constituencyId: sql`excluded.constituency_id`,
            seatLabelBn: sql`excluded.seat_label_bn`,
            seatLabelEn: sql`excluded.seat_label_en`,
            partyId: sql`excluded.party_id`,
            startDate: sql`excluded.start_date`,
            endDate: sql`excluded.end_date`,
          },
        });
    }

    for (const a of aliasVariants(values.nameBn, values.nameEn)) {
      await db
        .insert(memberAliases)
        .values({ memberId: row.id, alias: a.alias, language: a.language, addedBy: 'source' })
        .onConflictDoNothing();
    }

    sitting.push({
      id: row.id,
      externalId: m.externalId,
      nameBn: values.nameBn,
      nameEn: values.nameEn,
      person: {
        personId: values.sourcePersonId,
        nameEn: values.nameEn,
        dob: values.dateOfBirth,
        seatNo,
        seatName: clean(c.constituencyEng),
      },
    });
  }

  return { sitting, byExternalId: new Map(sitting.map((s) => [s.externalId, s])), parliamentId: parl.id, seatIdByNumber, photoSourceChanged };
}

/** Best sitting member for a name, only when one candidate clearly stands out. */
function findByName(sitting: SittingMember[], nameEn: string | null | undefined, nameBn: string | null | undefined): SittingMember | null {
  const bnKey = normalise(nameBn);
  const exactBn = bnKey ? sitting.filter((s) => normalise(s.nameBn) === bnKey) : [];
  if (exactBn.length === 1) return exactBn[0]!;
  const scored = sitting
    .map((s) => ({ s, score: nameSimilarity(nameEn, s.nameEn) }))
    .sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  if (best && best.score >= 0.85 && (!second || second.score < best.score - 0.05)) return best.s;
  return null;
}

export async function syncOfficers(db: Db, parliamentNumber: number, parliamentId: number, raw: RawOfficer[], sitting: SittingMember[]) {
  let matched = 0;
  const unmatched: string[] = [];
  for (const o of raw) {
    if (!o.isCurrent || o.parliamentNo !== parliamentNumber) continue;
    const role = OFFICER_ROLES[o.role];
    if (!role) continue;
    const m = findByName(sitting, o.nameEn, o.nameBn);
    if (!m) {
      unmatched.push(`${role}: ${clean(o.nameBn) ?? clean(o.nameEn) ?? '?'}`);
      continue;
    }
    await db
      .insert(memberTerms)
      .values({ memberId: m.id, parliamentId, role, sourceUrl: `${PARLIAMENT_BASE}/api/speakers` })
      .onConflictDoNothing();
    matched++;
  }
  return { matched, unmatched };
}

export async function syncCommittees(db: Db, parliamentId: number, raw: RawCommittee[], byExternalId: Map<string, SittingMember>) {
  // The source repeats a committee per parliament; keep one record per name,
  // preferring a current roster, then the later start date.
  const records = raw.map((c) => {
    const people = (c.members ?? [])
      .filter((x) => clean(x.member?.externalId))
      .map((x) => ({ role: clean(x.role) ?? 'Member', externalId: x.member!.externalId!.trim() }));
    const sittingPeople = people.filter((p) => byExternalId.has(p.externalId));
    return {
      sourceId: c.id,
      slug: slugify(clean(c.nameEn) ?? `committee-${c.id}`),
      nameBn: clean(c.nameBn) ?? clean(c.nameEn) ?? `Committee ${c.id}`,
      nameEn: clean(c.nameEn),
      type: clean(c.type),
      startDate: isoDate(c.startDate),
      rosterCurrent: people.length > 0 && sittingPeople.length === people.length,
      sourceMemberCount: people.length,
      people: sittingPeople,
    };
  });
  const kept = new Map<string, (typeof records)[number]>();
  for (const r of records) {
    const e = kept.get(r.slug);
    if (!e) {
      kept.set(r.slug, r);
      continue;
    }
    const better = r.rosterCurrent !== e.rosterCurrent ? (r.rosterCurrent ? r : e) : (r.startDate ?? '') > (e.startDate ?? '') ? r : e;
    kept.set(r.slug, better);
  }
  // Every raw id (both parliaments' records) maps to the record that survived, for notices.
  const committeeIdBySource = new Map<number, number>();
  let current = 0;
  for (const r of kept.values()) {
    const [row] = await db
      .insert(committees)
      .values({
        parliamentId,
        slug: r.slug,
        nameBn: r.nameBn,
        nameEn: r.nameEn,
        type: r.type,
        startDate: r.startDate,
        rosterCurrent: r.rosterCurrent,
        sourceMemberCount: r.sourceMemberCount,
        sourceId: r.sourceId,
        sourceUrl: `${PARLIAMENT_BASE}/api/committees/${r.sourceId}`,
      })
      .onConflictDoUpdate({
        target: [committees.parliamentId, committees.slug],
        set: {
          nameBn: sql`excluded.name_bn`,
          nameEn: sql`excluded.name_en`,
          type: sql`excluded.type`,
          startDate: sql`excluded.start_date`,
          rosterCurrent: sql`excluded.roster_current`,
          sourceMemberCount: sql`excluded.source_member_count`,
          sourceId: sql`excluded.source_id`,
          sourceUrl: sql`excluded.source_url`,
        },
      })
      .returning({ id: committees.id });
    if (!row) continue;
    for (const rec of records) if (rec.slug === r.slug) committeeIdBySource.set(rec.sourceId, row.id);
    if (r.rosterCurrent) current++;

    // The roster is replaced wholesale; a stale roster leaves the committee with no members.
    await db.delete(memberCommittees).where(eq(memberCommittees.committeeId, row.id));
    if (r.rosterCurrent) {
      for (const p of r.people) {
        await db
          .insert(memberCommittees)
          .values({ committeeId: row.id, memberId: byExternalId.get(p.externalId)!.id, role: p.role })
          .onConflictDoNothing();
      }
    }
  }
  return { committees: kept.size, current, pending: kept.size - current, committeeIdBySource };
}

export async function syncSessions(db: Db, parliamentId: number, raw: RawSession[]) {
  let sittingCount = 0;
  for (const s of raw) {
    const [row] = await db
      .insert(parliamentSessions)
      .values({
        parliamentId,
        sourceId: s.id,
        titleBn: clean(s.titleBn),
        titleEn: clean(s.titleEn),
        startDate: isoDate(s.startDate),
        endDate: isoDate(s.endDate),
        sourceUrl: `${PARLIAMENT_BASE}/api/sessions/${s.id}`,
      })
      .onConflictDoUpdate({
        target: parliamentSessions.sourceId,
        set: { titleBn: sql`excluded.title_bn`, titleEn: sql`excluded.title_en`, startDate: sql`excluded.start_date`, endDate: sql`excluded.end_date` },
      })
      .returning({ id: parliamentSessions.id });
    if (!row) continue;
    for (const c of s.poripotras ?? []) {
      for (const o of c.orderOfTheDays ?? []) {
        await db
          .insert(sittings)
          .values({ sessionId: row.id, sourceId: o.id, titleBn: clean(o.titleBn), date: isoDate(o.date), pdfUrl: clean(o.pdfUrl), circularNo: c.poripotraNo ?? null })
          .onConflictDoUpdate({
            target: sittings.sourceId,
            set: { sessionId: sql`excluded.session_id`, titleBn: sql`excluded.title_bn`, date: sql`excluded.date`, pdfUrl: sql`excluded.pdf_url`, circularNo: sql`excluded.circular_no` },
          });
        sittingCount++;
      }
    }
  }
  return { sessions: raw.length, sittings: sittingCount };
}

/** Notice types that concern the House and its members; the rest is the secretariat's own business. */
const KEPT_NOTICE_TYPES = new Set(['NOC_GO', 'COMMITTEE', 'GENERAL']);

export async function syncNotices(db: Db, raw: RawNotice[], sitting: SittingMember[], committeeIdBySource: Map<number, number>) {
  const bySeat = new Map(sitting.filter((s) => s.person.seatNo !== null).map((s) => [s.person.seatNo!, s]));
  const nameKeys = sitting.map((s) => ({ s, key: normalise(s.nameBn) })).filter((x) => x.key.length > 6);
  let kept = 0;
  let toMembers = 0;
  let toCommittees = 0;
  for (const n of raw) {
    const type = clean(n.noticeType) ?? '';
    if (!KEPT_NOTICE_TYPES.has(type)) continue;
    const committeeId = n.committeeId ? (committeeIdBySource.get(n.committeeId) ?? null) : null;
    const matches: { member: SittingMember; by: 'seat' | 'name' }[] = [];
    if (type === 'NOC_GO') {
      const seatNo = seatInTitle(n.titleBn) ?? seatInTitle(n.titleEn);
      const bySeatHit = seatNo !== null ? bySeat.get(seatNo) : undefined;
      if (bySeatHit) matches.push({ member: bySeatHit, by: 'seat' });
      else {
        const t = normalise(n.titleBn);
        const hit = nameKeys.find((x) => t.includes(x.key));
        if (hit) matches.push({ member: hit.s, by: 'name' });
      }
    }
    const general = type === 'GENERAL' && clean(n.category) === 'notification';
    if (!matches.length && !committeeId && !general) continue;

    const [row] = await db
      .insert(notices)
      .values({
        sourceId: n.id,
        type,
        category: clean(n.category),
        date: isoDate(n.date),
        titleBn: clean(n.titleBn),
        titleEn: clean(n.titleEn),
        pdfUrl: clean(n.pdfUrl),
        committeeId,
        sourceUrl: `${PARLIAMENT_BASE}/api/notices/${n.id}`,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notices.sourceId,
        set: {
          type: sql`excluded.type`, category: sql`excluded.category`, date: sql`excluded.date`, titleBn: sql`excluded.title_bn`,
          titleEn: sql`excluded.title_en`, pdfUrl: sql`excluded.pdf_url`, committeeId: sql`excluded.committee_id`, fetchedAt: sql`excluded.fetched_at`,
        },
      })
      .returning({ id: notices.id });
    if (!row) continue;
    kept++;
    if (committeeId) toCommittees++;
    await db.delete(noticeMembers).where(eq(noticeMembers.noticeId, row.id));
    for (const m of matches) {
      await db.insert(noticeMembers).values({ noticeId: row.id, memberId: m.member.id, matchedBy: m.by }).onConflictDoNothing();
      toMembers++;
    }
  }
  return { kept, toMembers, toCommittees, total: raw.length };
}

export async function syncEarlierTerms(db: Db, earlier: Record<number, RawMember[]>, sitting: SittingMember[], partyIdBySource: Map<number, number>) {
  const parlRows = await db.select({ id: parliaments.id, number: parliaments.number }).from(parliaments);
  const parliamentIdByNumber = new Map(parlRows.map((p) => [p.number, p.id]));
  let matched = 0;
  let ambiguous = 0;
  const byReason: Record<MatchReason, number> = { 'person-id': 0, 'name+dob': 0, 'name+seat': 0 };
  for (const [nStr, list] of Object.entries(earlier)) {
    const n = Number(nStr);
    const parliamentId = parliamentIdByNumber.get(n);
    if (!parliamentId) continue;
    const seatRows = await db
      .select({ id: constituencies.id, number: constituencies.number })
      .from(constituencies)
      .where(eq(constituencies.parliamentId, parliamentId));
    const seatIdByNumber = new Map(seatRows.map((s) => [s.number, s.id]));
    for (const m of list) {
      const term: Partial<RawTerm> = termOf(m, n) ?? {};
      const c: NonNullable<RawTerm['constituency']> = term.constituency ?? {};
      const old: PersonRecord = {
        personId: typeof m.empId === 'number' ? m.empId : null,
        nameEn: clean(m.nameEng),
        dob: dobOrNull(m.dateOfBirth),
        seatNo: typeof c.constituencyNo === 'number' ? c.constituencyNo : null,
        seatName: clean(c.constituencyEng),
      };
      if (!old.nameEn && old.personId === null) continue;
      const hits = sitting.map((s) => ({ s, reason: samePerson(s.person, old) })).filter((x) => x.reason);
      if (hits.length !== 1) {
        if (hits.length > 1) ambiguous++;
        continue;
      }
      const { s, reason } = hits[0]!;
      await db
        .insert(memberTerms)
        .values({
          memberId: s.id,
          parliamentId,
          constituencyId: old.seatNo !== null ? (seatIdByNumber.get(old.seatNo) ?? null) : null,
          seatLabelBn: clean(c.constituencyBng),
          seatLabelEn: clean(c.constituencyEng),
          partyId: term.party?.id !== undefined ? (partyIdBySource.get(term.party.id) ?? null) : null,
          role: 'MP',
          startDate: isoDate(term.startDate),
          endDate: isoDate(term.endDate),
          matchedBy: reason,
          sourceUrl: `${PARLIAMENT_BASE}/api/members/${m.id}`,
        })
        .onConflictDoUpdate({
          target: [memberTerms.memberId, memberTerms.parliamentId, memberTerms.role],
          set: {
            constituencyId: sql`excluded.constituency_id`, seatLabelBn: sql`excluded.seat_label_bn`, seatLabelEn: sql`excluded.seat_label_en`,
            partyId: sql`excluded.party_id`, startDate: sql`excluded.start_date`, endDate: sql`excluded.end_date`, matchedBy: sql`excluded.matched_by`,
          },
        });
      matched++;
      byReason[reason!]++;
    }
  }
  return { matched, ambiguous, byReason };
}

export interface SyncSummary {
  parties: number;
  members: number;
  photoSourceChanged: number;
  officers: { matched: number; unmatched: string[] };
  committees: { committees: number; current: number; pending: number };
  sessions: { sessions: number; sittings: number };
  notices: { kept: number; toMembers: number; toCommittees: number; total: number };
  earlier: { matched: number; ambiguous: number; byReason: Record<MatchReason, number> };
}

/** One complete refresh from a payload. Safe to run as often as the source is polled. */
export async function syncParliament(db: Db, p: ParliamentPayload): Promise<SyncSummary> {
  const partyIds = await syncParties(db, p.parties);
  const m = await syncMembers(db, p.parliamentNumber, p.members, partyIds);
  const officers = await syncOfficers(db, p.parliamentNumber, m.parliamentId, p.officers, m.sitting);
  const c = await syncCommittees(db, m.parliamentId, p.committees, m.byExternalId);
  const sessions = await syncSessions(db, m.parliamentId, p.sessions);
  const noticesResult = await syncNotices(db, p.notices, m.sitting, c.committeeIdBySource);
  const earlier = await syncEarlierTerms(db, p.earlier, m.sitting, partyIds);
  return {
    parties: partyIds.size,
    members: m.sitting.length,
    photoSourceChanged: m.photoSourceChanged,
    officers,
    committees: { committees: c.committees, current: c.current, pending: c.pending },
    sessions,
    notices: noticesResult,
    earlier,
  };
}

/** Members recorded for a parliament that the source no longer lists: reported, never deleted. */
export async function membersNotInSource(db: Db, parliamentId: number, externalIds: string[]): Promise<string[]> {
  const rows = await db
    .select({ ext: members.sourceExternalId, name: members.nameBn })
    .from(members)
    .innerJoin(memberTerms, and(eq(memberTerms.memberId, members.id), eq(memberTerms.parliamentId, parliamentId), eq(memberTerms.role, 'MP')));
  const present = new Set(externalIds);
  return rows.filter((r) => r.ext && !present.has(r.ext)).map((r) => `${r.name} (${r.ext})`);
}
