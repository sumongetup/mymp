/**
 * The `parliament` job: read everything parliament.gov.bd publishes about the
 * House and its members, and upsert it. Network here, logic in
 * parliament-core.ts. About 45 requests at one per second.
 */
import { parliamentGet, parliamentGetAll } from '@sangsad/shared';
import {
  membersNotInSource,
  syncParliament,
  type Db,
  type RawCommittee,
  type RawMember,
  type RawNotice,
  type RawOfficer,
  type RawParty,
  type RawSession,
  type SyncSummary,
} from './parliament-core';

export const CURRENT_PARLIAMENT = 13;
/** Parliaments the source holds member lists for, besides the current one. */
export const EARLIER_PARLIAMENTS = [12, 11, 10, 9, 8, 7, 5, 4];

interface RawParliament {
  parliamentNo: number;
  id: number;
}

const log = (msg: string) => process.stdout.write(`  ${msg}\n`);

export async function runParliament(db: Db): Promise<{ itemsFound: number; itemsNew: number; summary: SyncSummary; gone: string[] }> {
  const parliamentsList = await parliamentGet<RawParliament[]>('/api/parliaments');
  const current = parliamentsList.find((p) => p.parliamentNo === CURRENT_PARLIAMENT);
  if (!current) throw new Error(`parliament ${CURRENT_PARLIAMENT} not in source`);

  const parties = await parliamentGetAll<RawParty>('/api/parties', 100);
  log(`parties: ${parties.length}`);
  const members = await parliamentGetAll<RawMember>(`/api/members?parliamentNo=${CURRENT_PARLIAMENT}`, 100, (page, pages, n) =>
    log(`members page ${page}/${pages} — ${n}`),
  );
  const officers = await parliamentGetAll<RawOfficer>('/api/speakers', 100);
  const committees = await parliamentGetAll<RawCommittee>('/api/committees', 50);
  const sessions = await parliamentGetAll<RawSession>(`/api/sessions?parliamentId=${current.id}`, 50);
  const notices = await parliamentGetAll<RawNotice>('/api/notices', 100, (page, pages, n) => log(`notices page ${page}/${pages} — ${n}`));
  const earlier: Record<number, RawMember[]> = {};
  for (const n of EARLIER_PARLIAMENTS) {
    earlier[n] = await parliamentGetAll<RawMember>(`/api/members?parliamentNo=${n}`, 100);
    log(`parliament ${n}: ${earlier[n].length} records`);
  }

  const summary = await syncParliament(db, { parliamentNumber: CURRENT_PARLIAMENT, parties, members, officers, committees, sessions, notices, earlier });
  const [parl] = await db.query.parliaments.findMany({ where: (t, { eq }) => eq(t.number, CURRENT_PARLIAMENT) });
  const gone = parl ? await membersNotInSource(db, parl.id, members.map((m) => m.externalId)) : [];

  log(`members ${summary.members}, parties ${summary.parties}, officers ${summary.officers.matched} (${summary.officers.unmatched.length} unmatched)`);
  log(`committees ${summary.committees.committees} (${summary.committees.current} current, ${summary.committees.pending} pending roster)`);
  log(`sessions ${summary.sessions.sessions}, sittings ${summary.sessions.sittings}`);
  log(`notices kept ${summary.notices.kept} of ${summary.notices.total} (${summary.notices.toMembers} to members, ${summary.notices.toCommittees} to committees)`);
  log(`earlier terms matched ${summary.earlier.matched} (${JSON.stringify(summary.earlier.byReason)}), ambiguous skipped ${summary.earlier.ambiguous}`);
  if (summary.photoSourceChanged) log(`photo source changed for ${summary.photoSourceChanged} members; the photos job will refetch them`);
  for (const u of summary.officers.unmatched) log(`  officer not matched to a sitting member: ${u}`);
  for (const g of gone) log(`  no longer listed by the source (kept, review): ${g}`);
  if (members.length !== 350) log(`note: the source lists ${members.length} sitting members, not 350; the report names the unseated constituency`);

  return { itemsFound: members.length, itemsNew: summary.members, summary, gone };
}
