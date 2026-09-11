/**
 * The public mirror that mymp.bd builds from.
 *
 * Each night the `parliament` job writes the parliament.gov.bd responses that
 * mymp.bd's build reads (members, committees, sessions, notices, officers,
 * parliaments, earlier parliaments) to the public Storage bucket `mirror`, and
 * the photos job writes a map of member id → our stored photo. mymp.bd's
 * scripts/sync.mjs reads these instead of calling the government server on
 * every build, and falls back to the live API when the mirror is missing or
 * older than it accepts.
 *
 * The bucket is public, and the raw responses carry things that must never be
 * published: every member's mobile number, a second mobile and email, the
 * image of their signature, internal user ids, and the presiding officers'
 * phone numbers. So nothing is copied wholesale. Each record is rebuilt from
 * an allow-list of the fields mymp.bd actually uses; a mobile number survives
 * only as the yes/no `hasMobile`. assertNoPrivateFields() then checks the
 * whole document again before anything is uploaded.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const MIRROR_BUCKET = 'mirror';
export const MIRROR_VERSION = 1;
export const MIRROR_SOURCE = 'https://www.parliament.gov.bd';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Copies only `keys` from `obj`; absent keys stay absent. */
function pick(obj: unknown, keys: readonly string[]): Rec {
  const out: Rec = {};
  if (!isRec(obj)) return out;
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

const MEMBER_KEYS = [
  'id', 'externalId', 'empId', 'nameEng', 'nameBng', 'fatherNameEng', 'fatherNameBng', 'motherNameEng', 'motherNameBng',
  'dateOfBirth', 'isFreedomFighter', 'email', 'presentAddressBng', 'permanentAddressBng', 'gender', 'photoUrl',
  'professionBn', 'speakerHeroSummaryBn', 'speakerDetailsBioBn', 'updatedAt',
] as const;
/** `count` is how many times the member has been elected, as the secretariat records it. */
const TERM_KEYS = ['parliamentNo', 'startDate', 'endDate', 'status', 'count', 'isPm', 'isSpeaker', 'isDeputySpeaker', 'isOppositionLeader'] as const;
const PARTY_KEYS = ['id', 'abbreviation', 'nameEng', 'nameBng'] as const;
const CONSTITUENCY_KEYS = ['constituencyNo', 'constituencyEng', 'constituencyBng', 'boundaryDetails'] as const;
const COMMITTEE_KEYS = ['id', 'nameEn', 'nameBn', 'type', 'startDate'] as const;
const SESSION_KEYS = ['id', 'titleBn', 'titleEn', 'startDate', 'endDate'] as const;
const CIRCULAR_KEYS = ['id', 'poripotraNo', 'titleBn', 'date', 'pdfUrl'] as const;
const SITTING_KEYS = ['id', 'titleBn', 'date', 'pdfUrl'] as const;
const NOTICE_KEYS = ['id', 'noticeType', 'category', 'date', 'titleBn', 'titleEn', 'pdfUrl', 'committeeId'] as const;
const OFFICER_KEYS = ['role', 'nameBn', 'nameEn', 'tenureTextBn', 'isCurrent', 'parliamentNo', 'sortOrder'] as const;
const PARLIAMENT_KEYS = ['id', 'externalId', 'parliamentNo', 'electionDate', 'oathDate', 'gazetteDate', 'parliamentLastDate'] as const;

export function mirrorMember(m: unknown): Rec {
  const out = pick(m, MEMBER_KEYS);
  out.hasMobile = isRec(m) && typeof m.mobile === 'string' ? m.mobile.trim() !== '' : !!(isRec(m) && m.mobile);
  const terms = isRec(m) && Array.isArray(m.terms) ? m.terms : [];
  out.terms = terms.map((t) => {
    const term = pick(t, TERM_KEYS);
    if (isRec(t) && isRec(t.party)) term.party = pick(t.party, PARTY_KEYS);
    if (isRec(t) && isRec(t.constituency)) term.constituency = pick(t.constituency, CONSTITUENCY_KEYS);
    return term;
  });
  return out;
}

export function mirrorCommittee(c: unknown): Rec {
  const out = pick(c, COMMITTEE_KEYS);
  const entries = isRec(c) && Array.isArray(c.members) ? c.members : [];
  out.members = entries.map((e) => ({
    ...pick(e, ['role']),
    member: isRec(e) && isRec(e.member) ? pick(e.member, ['externalId']) : null,
  }));
  return out;
}

export function mirrorSession(s: unknown): Rec {
  const out = pick(s, SESSION_KEYS);
  const circulars = isRec(s) && Array.isArray(s.poripotras) ? s.poripotras : [];
  out.poripotras = circulars.map((c) => ({
    ...pick(c, CIRCULAR_KEYS),
    orderOfTheDays: (isRec(c) && Array.isArray(c.orderOfTheDays) ? c.orderOfTheDays : []).map((o) => pick(o, SITTING_KEYS)),
  }));
  return out;
}

export const mirrorNotice = (n: unknown) => pick(n, NOTICE_KEYS);
export const mirrorOfficer = (o: unknown) => pick(o, OFFICER_KEYS);
export const mirrorParliament = (p: unknown) => pick(p, PARLIAMENT_KEYS);

export interface MirrorInput {
  currentParliament: number;
  /** The source's own id for the current parliament, as used in the sessions query. */
  currentParliamentSourceId: number;
  parliaments: unknown[];
  members: unknown[];
  committees: unknown[];
  sessions: unknown[];
  notices: unknown[];
  officers: unknown[];
  earlier: Record<number, unknown[]>;
}

export interface MirrorDoc {
  version: number;
  source: string;
  fetchedAt: string;
  /** Keyed by the exact API path mymp.bd's sync requests (without the paging parameters). */
  responses: Record<string, Rec[]>;
}

/** The request paths, spelled exactly as mymp.bd's scripts/sync.mjs spells them. */
export const mirrorPaths = (current: number, sessionsId: number) => ({
  parliaments: '/api/parliaments',
  members: `/api/members?parliamentNo=${current}`,
  committees: '/api/committees',
  sessions: `/api/sessions?parliamentId=${sessionsId}`,
  notices: '/api/notices',
  officers: '/api/speakers',
  earlier: (n: number) => `/api/members?parliamentNo=${n}`,
});

export function buildMirror(input: MirrorInput, fetchedAt: Date): MirrorDoc {
  const p = mirrorPaths(input.currentParliament, input.currentParliamentSourceId);
  const responses: Record<string, Rec[]> = {
    [p.parliaments]: input.parliaments.map(mirrorParliament),
    [p.members]: input.members.map(mirrorMember),
    [p.committees]: input.committees.map(mirrorCommittee),
    [p.sessions]: input.sessions.map(mirrorSession),
    [p.notices]: input.notices.map(mirrorNotice),
    [p.officers]: input.officers.map(mirrorOfficer),
  };
  for (const [n, list] of Object.entries(input.earlier)) responses[p.earlier(Number(n))] = list.map(mirrorMember);
  const doc: MirrorDoc = { version: MIRROR_VERSION, source: MIRROR_SOURCE, fetchedAt: fetchedAt.toISOString(), responses };
  assertNoPrivateFields(doc);
  return doc;
}

/** Field names that exist in the source and must never reach the public mirror. */
const PRIVATE_KEYS = new Set(['mobile', 'additionalMobile', 'additionalEmail', 'signUrl', 'userId', 'phoneLocal', 'phonePermanent']);

export function assertNoPrivateFields(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPrivateFields(v, `${path}[${i}]`));
    return;
  }
  if (!isRec(value)) return;
  for (const [k, v] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(k)) throw new Error(`mirror would publish a private field: ${path}.${k}`);
    assertNoPrivateFields(v, `${path}.${k}`);
  }
}

/** Refuses a mirror that looks truncated, so a bad night never replaces a good copy. */
export function checkMirror(doc: MirrorDoc, current: number, sessionsId: number): void {
  const p = mirrorPaths(current, sessionsId);
  const need: [string, number][] = [[p.members, 300], [p.committees, 1], [p.parliaments, 1], [p.officers, 1]];
  for (const [path, min] of need) {
    const n = doc.responses[path]?.length ?? 0;
    if (n < min) throw new Error(`mirror: ${path} has ${n} records, expected at least ${min}; not uploading`);
  }
}

/** The service-role client for Storage writes, or null when the environment does not carry one. */
export function storageClientFromEnv(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function ensureBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(MIRROR_BUCKET, { public: true, fileSizeLimit: 20 * 1024 * 1024 });
  if (error && !/already exists/i.test(error.message)) throw new Error(`mirror bucket: ${error.message}`);
}

/** Writes `<name>/latest.json` and a dated copy `<name>/<YYYY-MM-DD>.json` for rollback. */
export async function uploadMirrorFile(supabase: SupabaseClient, name: string, doc: unknown, day: string): Promise<string> {
  await ensureBucket(supabase);
  const body = Buffer.from(JSON.stringify(doc));
  for (const path of [`${name}/latest.json`, `${name}/${day}.json`]) {
    const { error } = await supabase.storage
      .from(MIRROR_BUCKET)
      .upload(path, body, { contentType: 'application/json', upsert: true, cacheControl: '300' });
    if (error) throw new Error(`mirror upload ${path}: ${error.message}`);
  }
  return supabase.storage.from(MIRROR_BUCKET).getPublicUrl(`${name}/latest.json`).data.publicUrl;
}
