# Durbin News · সংসদ — Build plan

Public, bilingual (বাংলা first) directory of every Member of the 13th Jatiya Sangsad, with a verified profile and an auto-updated, link-only news feed per member. Runs at `durbinnews.com/sangsad` (configurable `BASE_PATH`) or a subdomain.

## Status

- **Phase 1 — built, pushed, CI green (2026-09-10).** The database layer is proven on real Postgres through a PGlite integration test (migration, every RLS policy, the seed logic, the listing query) that runs in CI with no external service. The one thing still owed is the same migration and seed on the owner's Supabase project, which waits for its keys; nothing in the code changes for that.
- **Live on Supabase (2026-09-11).** Project `ckeorrzppdgsutqfqdor` (org mymp, Singapore). `setup.sql` applied (28 tables, RLS on all, 24 policies, 2 migrations), `db:migrate` a no-op, `db:seed` loaded 13 parliaments and 10 election sets (350 current seats, 8 divisions, 64 districts), `pnpm worker parliament` stored 349 members, 45 parties, 11 officers, 66 committees (31 current rosters), 61 sittings, 391 notices and 71 earlier terms; `parliament:photos` copied all 349 photos; the first report is `docs/reports/parliament-2026-09-10.md` (vacant seat: চট্টগ্রাম-৪, 281). The live seed exposed two source quirks that the PGlite fixtures could not: a second division numbering on district records, and repeated seat names; both fixed with tests (see SOURCES.md). Still owed for Phase 2's "done": the nightly workflow's three repository secrets and one green scheduled run.
- **Phase 2 — approved and built (2026-09-10).** The history below is kept as written before the first live run. The `parliament`, `parliament:photos` and `parliament:report` jobs exist with the corroborated person matcher, the roster rule, alias derivation, notice-to-member matching and the four additive tables; 19 worker tests (8 matcher cases on real pairs, 11 on PGlite with TEST_ payloads, run twice) plus the 24 earlier ones are green in CI. What is still owed, all of it waiting on the owner's Supabase keys: `db:migrate` (two migrations), `db:seed`, a first `pnpm worker parliament` run, the photo copy, the first report, and the nightly workflow's secrets. Until that run, the counts against the live source (349 members, the unseated seat) are known from mymp.bd, not from this code.

## 0. What is already known (from building mymp.bd, verified on 2026-09-10)

These are findings, not assumptions. They shape the phases below.

| Source | Finding | Consequence |
|---|---|---|
| parliament.gov.bd | Has an **open JSON API** behind the JS site: `/api/members?parliamentNo=13&limit=100&page=N`, `/api/committees`, `/api/parties`, `/api/constituencies`, `/api/sessions?parliamentId=13` (orders of the day PDFs), `/api/notices` (845 secretariat notices), `/api/speakers` (Speaker, Deputy, Leader of House, Opposition Leader, whips), `/api/parliaments` (dates). No Playwright needed. | Phase 2 scraper is an API client, not a browser. |
| parliament.gov.bd TLS | Server **omits its intermediate certificate** (GoGetSSL) and **resets connections without a User-Agent**. Plain `fetch()` in Node fails. Fix: `node:https` with the intermediate + root added alongside Node's bundled CAs, and a UA string. | Done in `@durbin/shared`; the seed already uses it. |
| Member count | The API returns **349** sitting members (299 constituency + 50 reserved), not 350. One constituency seat is not seated in the source. | The site says 349 and names the vacant seat; it never pads to 350. |
| Member fields | Names bn/en, photo URL (parliament-hosted), DOB, profession (241/349), parents, addresses, official email (297), mobile (all; never published), term with constituency + party, Speaker/Deputy biography HTML. `electionCount` is 1 for everyone (dead field). | Phase 2 copies photos to Supabase Storage with `photo_source_url`. |
| Committees | One record per committee **per parliament**; 35 of 66 committees still carry the 12th parliament's roster. | Never show ex-MPs as current members; `roster_current` decides. |
| Earlier parliaments | Records exist for the 4th, 5th, 7th–12th. Person ids are stable only from the 11th on; older records have placeholder birth dates and varying transliterations; one id sits on two people. | Earlier terms need corroborated matching (id + name/seat/DOB), never name alone. |
| ecs.gov.bd | **Behind a Cloudflare bot challenge.** No JSON API or RSS. | Editors upload the PDFs (owner's decision); nothing bypasses the challenge. |
| Name matching | A working Bangla/English normaliser plus a consonant-skeleton similarity, both now in `packages/shared` with tests. | The matcher (Phase 4) builds on it. |

## 1. Repository layout

```
durbin-sangsad/            inside sumongetup/mymp
  apps/web/                Next.js 16 app (App Router, TS strict, Tailwind v4), BASE_PATH aware
  packages/db/             Drizzle schema, migrations, RLS, seed, queries, PGlite integration test
  packages/shared/         normalisation, name similarity, slugs, parliament.gov.bd client
  worker/                  jobs by name (Phase 2: parliament; Phase 4: feeds, YouTube, matcher)
  config/sources.json      the 50 news sources (feed URLs only after inspection)
  fixtures/                TEST_-prefixed data; refused on a production deployment
  docs/                    PLAN.md, SOURCES.md, RUNBOOK.md
../.github/workflows/      durbin-ci.yml at the repository root (path-filtered); worker schedule from Phase 2
```

## 2. Phase 1 — Foundation (done)

Delivered: monorepo, full schema (24 tables) with one migration and idempotent RLS, seed of parliaments/divisions/districts/350 constituencies from parliament.gov.bd, bilingual listing page, about-data skeleton, fixtures with a production guard, 17 unit tests, a PGlite integration test (7 cases), a 10-case Playwright suite (phone + desktop), CI. Owed: `pnpm db:migrate && pnpm db:seed` on the Supabase project once keys exist.

## 3. Phase 2 — Official data (plan, awaiting approval)

Goal (brief): every sitting MP loads with name, seat, party, photo; counts match the official site; a report lists MPs with missing fields. The source has 349 sitting members; the report will say so and name the unseated constituency rather than invent a 350th.

Steps

1. **Worker job `parliament`** (`worker/src/jobs/parliament.ts`), one idempotent run: parties (`/api/parties`), members (`/api/members?parliamentNo=13`, 4 pages), presiding officers (`/api/speakers`), committees (`/api/committees`). Upserts keyed on the source's ids: `parties`, `members` (slug from the English name, seat appended on collision, exactly as mymp), `member_terms` (role `MP` from the term; `Speaker`, `Deputy Speaker`, `Leader of the House`, `Leader of the Opposition`, `Chief Whip`, `Whip` from term flags and the officers list), `committees` + `member_committees` with the roster rule (a roster is current only when every listed person is a sitting member; otherwise the committee is stored with `roster_current = false` and no members). Mobile numbers are read and discarded, never stored.
2. **Aliases.** Seed `member_aliases` with the source's Bangla and English names plus their title-stripped forms, so the Phase 4 matcher starts from a complete alias table; editors add more later.
3. **Photos.** Download each member's official photo (parliament-hosted, `prp.parliament.gov.bd`; robots and TLS checked first and recorded in SOURCES.md), store it in a public Supabase Storage bucket `member-photos`, set `photo_url` to our copy and keep `photo_source_url`. Re-download only when the source URL changes. A failed download leaves `photo_url` null and the profile shows the neutral placeholder; no other image source is ever used. About 6 minutes for a full run at one request per second.
4. **Earlier terms of sitting members.** Read the 4th, 5th and 7th–12th parliaments (2,510 records) and attach earlier `member_terms` to sitting members using the corroborated rules already proven on mymp (person id needs a corroboration; otherwise similar name plus equal real birth date, or similar name plus the same seat by name; a birth-date conflict vetoes; name alone never matches). Historical holders of each seat, which need `members` rows for people who are not in the 13th parliament, move to Phase 5 with the constituency page.
5. **Schema additions (explained).** The brief's schema has no place for what the House is doing, which is the one official signal that changes daily: sittings with their orders-of-the-day PDFs, and secretariat notices about individual members (foreign-travel orders and the like). Proposed: `parliament_sessions`, `sittings`, `notices` (+ `notice_members`) so Phase 5 can show them per member and per parliament. Small, additive, and ingested by the same job. Skip if you would rather keep the brief's schema exactly.
6. **Report.** `pnpm worker parliament:report` writes `docs/reports/parliament-<date>.md`: counts against the source, the vacant seat, and every member missing a photo, official email, profession or date of birth. Committed so it is reviewable.
7. **Schedule.** `.github/workflows/durbin-worker.yml` runs `parliament` nightly (02:00 Dhaka) with `DATABASE_URL` and the service key as repository secrets; also runnable by hand.
8. **Tests.** Unit: slug collisions, the roster rule, officer-role mapping, and the person matcher against the real tricky pairs found on mymp (Joynul Abdin Faruk of Noakhali versus Joynal Abdin of Feni; Lutfuzzaman Babor / Lutfozzaman Babar; the two Md. Abdul Aziz). Integration on PGlite: the full upsert path with TEST_ records, run twice, no duplicates.

Not in Phase 2: election results and affidavits. Both arrive as editor-uploaded ECS PDFs and share one intake, so they are built together in Phase 3.

Done when: 349 members are in the database with name, seat, party and a stored photo (or a recorded reason for its absence); counts equal the source's; the vacant seat is named; the report exists; the nightly workflow has run green once against Supabase.

Estimated size: about a day and a half.

## 4. Later phases (outline, each gets its own plan for approval)

- **Phase 3 — Affidavits and results.** Admin upload of ECS PDFs (gazette results and affidavits), `pdf-parse` then Tesseract `ben`, extraction into `election_results`, `affidavits` and `affidavit_cases` with `status = pending`, a verify screen with the PDF beside the fields. Nothing publishes without `verified_by`.
- **Phase 4 — News + matcher.** Inspect all 50 sources and record findings in `SOURCES.md`; RSS every 30 minutes; Google News RSS fallback, rate-limited and cached; YouTube uploads playlists; matcher with alias table, context signals, 0–1 confidence, ambiguity guard, `match_reason`; tricky-case unit tests; 48-hour soak and the 100-sample accuracy check.
- **Phase 5 — Public pages + SEO.** All pages in brief section 7, fuzzy search (FTS + pg_trgm), JSON-LD, OG images, sitemaps, hreflang, Lighthouse ≥ 90 on mobile.
- **Phase 6 — Admin + hardening.** Full admin, corrections inbox, audit log, source-failure alerts (3 runs), rate limiting, backups.

## 5. Decisions taken (owner, 2026-09-10)

- **Repository:** the `durbin-sangsad/` folder inside `sumongetup/mymp` (a separate repository was the first choice). mymp.bd is untouched: its build ignores the folder, and Vercel skips mymp.bd builds for pushes that only change it (verified).
- **ECS data:** editors download result gazettes and affidavit PDFs in a normal browser and **upload them in the admin**; the worker extracts from the uploads. No bot-protection bypass, ever.
- **Database:** a new, dedicated Supabase project (Singapore).
- **Next.js:** 16.

## 6. Remaining assumptions (say so if any is wrong)

- Workers run on GitHub Actions scheduled workflows to start; a VPS node-cron runner can replace that later without code changes.
- Bangla is the default locale at `/sangsad`; English at `/sangsad/en`.
- The unseated constituency is shown as vacant with "তথ্য পাওয়া যায়নি" until an official source names the reason.
