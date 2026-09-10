# Runbook

This monorepo lives in the `durbin-sangsad/` folder of the `sumongetup/mymp` repository. Every command below runs from that folder. Its CI workflow is `.github/workflows/durbin-ci.yml` at the repository root (GitHub only reads workflows from the root) and triggers only on changes under `durbin-sangsad/`.

## First-time setup

```bash
pnpm install
cp .env.example .env        # fill DATABASE_URL and the Supabase keys
pnpm db:migrate             # applies migrations, then re-applies RLS policies (idempotent)
pnpm db:seed                # parliaments, divisions, districts, 350 constituencies from parliament.gov.bd
pnpm dev                    # http://localhost:3000/sangsad (BASE_PATH from .env)
```

Without a database: set `FIXTURES=1` in `.env` and skip migrate/seed. The site then serves the `TEST_` fixtures in `fixtures/` and shows a yellow banner. This cannot happen on a production deployment: the loader throws when `VERCEL_ENV=production`, when `APP_ENV=production`, or when `NEXT_PUBLIC_SITE_URL` is durbinnews.com (NODE_ENV is not used, because `next build` sets it to production even in CI).

On Windows Git Bash, prefix commands that pass `BASE_PATH=/sangsad` with `MSYS_NO_PATHCONV=1`, or the shell rewrites `/sangsad` into a Windows path.

## Everyday commands

| Task | Command |
|---|---|
| Typecheck everything | `pnpm typecheck` |
| Unit + integration tests (Vitest; the db package runs the real migration, RLS file and seed logic on PGlite, an in-process Postgres) | `pnpm test` |
| End-to-end (Playwright, needs a build) | `pnpm --filter @durbin/web build && pnpm --filter @durbin/web e2e` |
| Change the schema | edit `packages/db/src/schema.ts` → `pnpm db:generate` → review the SQL in `packages/db/migrations/` → `pnpm db:migrate` |
| Change RLS | edit `packages/db/sql/rls.sql` → `pnpm db:migrate` (re-applies all policies) |
| Run a worker job | `pnpm worker <job>` (Phase 1: `health`) |

## Workers

`worker/src/index.ts` runs one named job per invocation and records it in `ingest_runs` (started, finished, ok, counts, error text). The scheduled runner (GitHub Actions in `.github/workflows/`, from Phase 2) calls the same entry point, so a job behaves identically on a laptop and in CI.

Jobs today:

| Job | What it does | Needs |
|---|---|---|
| `health` | proves the database and parliament.gov.bd are reachable | DATABASE_URL |
| `parliament` | members, parties, officers, committees (roster rule), sessions and sittings, notices matched to members and committees, earlier terms of sitting members with corroborated matching | DATABASE_URL; about 45 requests at 1/s |
| `parliament:photos` | copies official photos into the public Storage bucket `member-photos`; only members whose copy is missing are fetched | plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY |
| `parliament:report` | writes `docs/reports/parliament-<date>.md`: counts against the source, the unseated seat, officers, every member with a missing photo, email, profession, date of birth or party | DATABASE_URL |

The nightly workflow `.github/workflows/durbin-worker.yml` (repository root) runs the three parliament jobs at 02:00 Dhaka and can be started by hand with a job name. It needs the repository secrets `DURBIN_DATABASE_URL`, `DURBIN_SUPABASE_URL` and `DURBIN_SUPABASE_SERVICE_ROLE_KEY`.

To re-run a failed job: run it again by name; every job is idempotent (upserts keyed on the source's ids).

To find why a source failed: `select * from ingest_runs where job = '<name>' order by started_at desc limit 20;` and read `error_text`.

## Fixing a broken source

1. Check `docs/SOURCES.md` for how the source was read the last time it worked.
2. Re-inspect: robots.txt, then RSS/JSON/XHR, in that order. Update the entry with the date and what changed.
3. If the source now blocks automated access, do not work around it. Set its `status` to `blocked` in `config/sources.json`, note it in SOURCES.md, and tell the owner.

## Environments

- **Web:** Vercel, env vars from `.env.example`. `BASE_PATH=/sangsad` for durbinnews.com/sangsad.
- **Database:** Supabase (Singapore). Migrations run from a developer machine or CI with the session pooler URL; the web app uses the transaction pooler.
- **Backups:** Supabase daily backups (Phase 6 adds a weekly `pg_dump` to Storage).
