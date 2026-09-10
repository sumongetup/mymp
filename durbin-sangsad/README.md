# দুরবীন নিউজ · সংসদ

A public, bilingual (বাংলা first) directory of every Member of the 13th Jatiya Sangsad of Bangladesh, with a verified profile per member and a link-only news feed. Built for Durbin News (durbinnews.com), served at `durbinnews.com/sangsad`. Lives in the `durbin-sangsad/` folder of the `sumongetup/mymp` repository; run every command from this folder.

- `docs/PLAN.md` — the phase plan and the decisions taken
- `docs/SOURCES.md` — every source, what it provides, how it was inspected
- `docs/RUNBOOK.md` — how to run, migrate, seed, and fix a broken source

Rules the code enforces: no invented data (empty fields read "তথ্য পাওয়া যায়নি"), fixtures are `TEST_`-prefixed and cannot load in production, every fact links to its source, and news shows headline + source + time + link only.

```bash
pnpm install && cp .env.example .env && pnpm db:migrate && pnpm db:seed && pnpm dev
```
