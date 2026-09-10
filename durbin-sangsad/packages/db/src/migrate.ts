/**
 * Apply versioned migrations, then (re)apply the RLS policies.
 *
 * Policies live in sql/rls.sql as idempotent statements so they can be
 * re-run after every migration: a new table is locked down the moment it
 * exists, not when someone remembers.
 */
import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

config({ path: resolve(import.meta.dirname, '../../../.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const client = postgres(url, { max: 1, ssl: 'require', prepare: false });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../migrations') });
    console.log('migrations: up to date');

    const rls = await readFile(resolve(import.meta.dirname, '../sql/rls.sql'), 'utf8');
    await client.unsafe(rls);
    console.log('rls: policies applied');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('migrate failed:', err.message ?? err);
  process.exit(1);
});
