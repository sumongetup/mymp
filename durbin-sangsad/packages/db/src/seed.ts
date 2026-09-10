/**
 * Seed reference data from parliament.gov.bd: parliaments, divisions,
 * districts and the 350 constituencies of the current election set.
 *
 * Network here, logic in seed-core.ts (shared with the PGlite integration
 * test). Re-running is safe: every write is an upsert on the source's ids.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { parliamentGet, parliamentGetAll } from '@durbin/shared';
import { getDb } from './client';
import { upsertConstituencySet, upsertParliaments, type SrcConstituency, type SrcParliament } from './seed-core';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const CURRENT_PARLIAMENT = 13;

async function main() {
  const db = getDb();

  const rawParliaments = await parliamentGet<SrcParliament[]>('/api/parliaments');
  const n = await upsertParliaments(db, rawParliaments);
  const current = rawParliaments.find((p) => p.parliamentNo === CURRENT_PARLIAMENT);
  if (!current) throw new Error(`parliament ${CURRENT_PARLIAMENT} not in source`);
  console.log(`parliaments: ${n} upserted; current = ${CURRENT_PARLIAMENT} (election set ${current.externalId})`);

  const all = await parliamentGetAll<SrcConstituency>('/api/constituencies', 100, (page, pages, count) =>
    process.stdout.write(`  constituencies page ${page}/${pages} — ${count}\n`),
  );
  const rows = all.filter((c) => c.electionId === current.externalId);
  const r = await upsertConstituencySet(db, CURRENT_PARLIAMENT, rows);

  console.log(
    `divisions: ${r.divisions}, districts: ${r.districts}, constituencies: ${r.constituencies} (${r.territorial} territorial + ${r.reserved} reserved)`,
  );
  for (const d of r.skippedDistricts) console.warn(`  district ${d} has no known division; skipped`);
  if (r.missingBoundary) console.log(`  note: ${r.missingBoundary} territorial constituencies have no boundary text in the source`);
  if (r.constituencies !== 350) console.warn(`  WARNING: expected 350 constituencies, source has ${r.constituencies}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err.message ?? err);
  process.exit(1);
});
