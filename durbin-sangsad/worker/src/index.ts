/**
 * Worker entry point. Jobs are plain async functions registered by name and
 * run one at a time: `pnpm worker <job>`. The scheduler (GitHub Actions or a
 * VPS cron) calls the same entry, so a job behaves identically everywhere.
 * Every run is recorded in ingest_runs, success or failure.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { getDb } from '@durbin/db';
import { ingestRuns } from '@durbin/db/schema';
import { parliamentGet } from '@durbin/shared';
import { runParliament } from './jobs/parliament';
import { runPhotos } from './jobs/photos';
import { runReport } from './jobs/report';

config({ path: resolve(import.meta.dirname, '../../.env') });

type Job = () => Promise<{ itemsFound: number; itemsNew: number }>;

const jobs: Record<string, Job> = {
  /** Proves the two things every later job depends on: the database and parliament.gov.bd. */
  async health() {
    const db = getDb();
    const rows = await db.execute<{ now: string }>(sql`select now()::text as now`);
    const now = rows[0]?.now ?? '?';
    const parl = await parliamentGet<{ total: number }>('/api/members?parliamentNo=13&limit=1&page=1');
    console.log(`db ok (${now}); parliament.gov.bd ok (${parl.total} sitting members)`);
    return { itemsFound: parl.total, itemsNew: 0 };
  },
  /** Members, parties, officers, committees, sessions, notices, earlier terms. */
  parliament: () => runParliament(getDb()),
  /** Copies official photos into Supabase Storage. */
  'parliament:photos': () => runPhotos(getDb()),
  /** Writes docs/reports/parliament-<date>.md. */
  'parliament:report': () => runReport(getDb()),
};

async function run(name: string) {
  const job = jobs[name];
  if (!job) {
    console.error(`unknown job "${name}"; known: ${Object.keys(jobs).join(', ')}`);
    process.exit(2);
  }
  const db = getDb();
  const [runRow] = await db.insert(ingestRuns).values({ job: name }).returning({ id: ingestRuns.id });
  const started = Date.now();
  try {
    const result = await job();
    await db
      .update(ingestRuns)
      .set({ finishedAt: new Date(), ok: true, itemsFound: result.itemsFound, itemsNew: result.itemsNew })
      .where(sql`${ingestRuns.id} = ${runRow!.id}`);
    console.log(`job ${name}: ok in ${Math.round((Date.now() - started) / 1000)}s`);
    process.exit(0);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    await db
      .update(ingestRuns)
      .set({ finishedAt: new Date(), ok: false, errors: 1, errorText: message.slice(0, 2000) })
      .where(sql`${ingestRuns.id} = ${runRow!.id}`);
    console.error(`job ${name}: failed: ${message}`);
    process.exit(1);
  }
}

run(process.argv[2] ?? 'health');
