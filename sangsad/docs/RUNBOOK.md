# Runbook

The data engine behind mymp.bd lives in the `sangsad/` folder of the `sumongetup/mymp` repository. Every command below runs from that folder. Its CI workflow is `.github/workflows/sangsad-ci.yml` at the repository root (GitHub only reads workflows from the root) and triggers only on changes under `sangsad/`. mymp.bd's own build ignores this folder, and Vercel skips mymp.bd builds for pushes that only change it.

## First-time setup

```bash
pnpm install
cp .env.example .env        # fill DATABASE_URL and the Supabase keys
pnpm db:migrate             # applies migrations, then re-applies RLS policies (idempotent)
                            # (or, once, paste packages/db/setup.sql into Supabase → SQL Editor; regenerate it with pnpm --filter @sangsad/db sql:bundle)
pnpm db:seed                # parliaments, divisions, districts, 350 constituencies from parliament.gov.bd
pnpm worker parliament      # members, terms, parties, committees, sessions, notices
```

Fixtures: `FIXTURES=1` lets code load the `TEST_` files in `fixtures/`. The loader throws on a production deployment: when `VERCEL_ENV=production`, when `APP_ENV=production`, or when `NEXT_PUBLIC_SITE_URL` is on mymp.bd (NODE_ENV is not used, because `next build` sets it to production even in CI).

**Supabase connection.** Use the **session pooler** string from the dashboard's Connect sheet: host `aws-0-ap-southeast-1.pooler.supabase.com`, port 5432, user `postgres.<project-ref>`. The direct host `db.<ref>.supabase.co` is IPv6-only and does not resolve on many networks. Set the database password when the project is created and copy it then: on the first project (2026-09-10) four dashboard password resets never reached the pooler (28P01 every time), and a fresh project with its creation password worked at once.


## Everyday commands

| Task | Command |
|---|---|
| Typecheck everything | `pnpm typecheck` |
| Unit + integration tests (Vitest; the db package runs the real migration, RLS file and seed logic on PGlite, an in-process Postgres) | `pnpm test` |
| Change the schema | edit `packages/db/src/schema.ts` → `pnpm db:generate` → review the SQL in `packages/db/migrations/` → `pnpm db:migrate` |
| Change RLS | edit `packages/db/sql/rls.sql` → `pnpm db:migrate` (re-applies all policies) |
| Run a worker job | `pnpm worker <job>` (Phase 1: `health`) |

## Workers

`worker/src/index.ts` runs one named job per invocation and records it in `ingest_runs` (started, finished, ok, counts, error text). The scheduled runner (GitHub Actions in `.github/workflows/`, from Phase 2) calls the same entry point, so a job behaves identically on a laptop and in CI.

Jobs today:

| Job | What it does | Needs |
|---|---|---|
| `health` | proves the database and parliament.gov.bd are reachable | DATABASE_URL |
| `parliament` | writes the public mirror mymp.bd builds from (below), then members, parties, officers, committees (roster rule), sessions and sittings, notices matched to members and committees, earlier terms of sitting members with corroborated matching | DATABASE_URL, plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the mirror; about 45 requests at 1/s |
| `parliament:photos` | copies official photos into the public Storage bucket `member-photos` (only members whose copy is missing are fetched), then writes the photo map for mymp.bd | plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY |
| `parliament:report` | writes `docs/reports/parliament-<date>.md`: counts against the source, the unseated seat, officers, every member with a missing photo, email, profession, date of birth or party | DATABASE_URL |

The nightly workflow `.github/workflows/sangsad-worker.yml` (repository root) runs the three parliament jobs at 02:00 Dhaka and can be started by hand with a job name. It reads the repository secrets `SANGSAD_DATABASE_URL`, `SANGSAD_SUPABASE_URL` and `SANGSAD_SUPABASE_SERVICE_ROLE_KEY`, and falls back to the older `DURBIN_*` names until those are deleted.

## The mirror mymp.bd builds from

The `parliament` job writes `mirror/parliament/latest.json` (plus a dated copy for rollback) to the public Storage bucket `mirror`: the parliament.gov.bd responses mymp.bd's `scripts/sync.mjs` needs, keyed by the exact request path. The photos job writes `mirror/photos/latest.json`, member id to our stored photo. mymp.bd reads both at build time when the copy is at most 36 hours old and reads parliament.gov.bd directly otherwise, so its own derivations (slugs, committees, notices, seat history) stay one piece of code.

The bucket is public, and the source's records carry every member's mobile number, a second mobile and email, a signature image, user ids and officers' phone numbers. `worker/src/jobs/mirror.ts` therefore rebuilds each record from an allow-list of fields, keeps a mobile number only as `hasMobile`, and scans the whole document for private field names before uploading; `mirror.test.ts` covers this. A copy with fewer than 300 sitting members is refused, so a bad night never replaces a good copy.

After the nightly jobs the workflow calls mymp.bd's deploy hook when the repository secret `MYMP_DEPLOY_HOOK_URL` exists; mymp.bd's own cron (03:00 Dhaka) rebuilds it anyway.

To check what mymp.bd will read: open `https://<engine-ref>.supabase.co/storage/v1/object/public/mirror/parliament/latest.json` and look at `fetchedAt`. To force a build straight from parliament.gov.bd: `node scripts/sync.mjs --live` in the repository root.

To re-run a failed job: run it again by name; every job is idempotent (upserts keyed on the source's ids).

To find why a source failed: `select * from ingest_runs where job = '<name>' order by started_at desc limit 20;` and read `error_text`.

## Fixing a broken source

1. Check `docs/SOURCES.md` for how the source was read the last time it worked.
2. Re-inspect: robots.txt, then RSS/JSON/XHR, in that order. Update the entry with the date and what changed.
3. If the source now blocks automated access, do not work around it. Set its `status` to `blocked` in `config/sources.json`, note it in SOURCES.md, and tell the owner.

## Environments

- **Website:** mymp.bd, the Next.js app at the repository root (Vercel). It reads this database at build time (from phase M1).
- **Database:** the sangsad Supabase project (Singapore, in the mymp organization). Migrations run from a developer machine or CI with the session pooler URL.
- **Backups:** Supabase daily backups (Phase 6 adds a weekly `pg_dump` to Storage).
