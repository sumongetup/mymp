# সংসদ: the data engine behind mymp.bd

This workspace keeps a normalised Postgres copy of Bangladesh's official parliamentary data (members, terms, parties, committees, sessions, notices, photos) and, in later phases, the affidavits, election results and news that mymp.bd shows. The website itself is the Next.js app at the root of this repository (mymp.bd); this folder has no web app of its own.

- `packages/db`: Drizzle schema, migrations, Row Level Security, seed
- `packages/shared`: Bangla/English name normalisation, similarity, slugs, the parliament.gov.bd client
- `worker`: the nightly jobs (GitHub Actions, 02:00 Dhaka)
- `docs/PLAN.md`: the phase plan and decisions; `docs/SOURCES.md`: every source and how it was inspected; `docs/RUNBOOK.md`: how to run and fix things

Rules the code enforces: no invented data (gaps read "তথ্য পাওয়া যায়নি"), fixtures are `TEST_`-prefixed and cannot load in production, every fact keeps its source link, and news is headline, source, time and link only.

```bash
pnpm install && cp .env.example .env && pnpm db:migrate && pnpm db:seed && pnpm worker parliament
```
