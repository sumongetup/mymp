# Durbin News · সংসদ — Build plan

Status: **Phase 1 approved and built (2026-09-10).** Code, tests and CI are in place and green on fixtures. Two steps remain before Phase 1 counts as done, both waiting on the owner: push to `sumongetup/mymp`, and `pnpm db:migrate && pnpm db:seed` against the new Supabase project once its keys are in `.env`.

What works now: monorepo (`apps/web`, `packages/db`, `packages/shared`, `worker`), the full Drizzle schema with one migration and idempotent RLS, a seed for parliaments/divisions/districts/350 constituencies from parliament.gov.bd, the bilingual listing page on fixtures (`/sangsad` and `/sangsad/en`), the about-data skeleton, 17 unit tests, a 10-case Playwright suite (phone + desktop), and a CI workflow. What does not yet: nothing has touched a real database, so the seed and the RLS policies are untested against Postgres until the keys arrive.

Public, bilingual (বাংলা first) directory of every Member of the 13th Jatiya Sangsad, with a verified profile and an auto-updated, link-only news feed per MP. Runs at `durbinnews.com/sangsad` (configurable `BASE_PATH`) or a subdomain.

## 0. What is already known (from building mymp.bd, verified on 2026-09-10)

These are findings, not assumptions. They shape the phases below.

| Source | Finding | Consequence |
|---|---|---|
| parliament.gov.bd | Has an **open JSON API** behind the JS site: `/api/members?parliamentNo=13&limit=100&page=N`, `/api/committees`, `/api/parties`, `/api/constituencies`, `/api/sessions?parliamentId=13` (orders of the day PDFs), `/api/notices` (845 secretariat notices), `/api/speakers` (Speaker, Deputy, Leader of House, Opposition Leader, whips), `/api/parliaments` (dates). No Playwright needed. | Phase 2 scraper is an API client, not a browser. |
| parliament.gov.bd TLS | Server **omits its intermediate certificate** (GoGetSSL) and **resets connections without a User-Agent**. Plain `fetch()` in Node fails (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ECONNRESET`). Fix: `node:https` with the intermediate + root added alongside Node's bundled CAs, and a UA string. | Worker HTTP client must carry this; a naive fetch will silently fail in CI. |
| Member count | The API returns **349** sitting members (299 constituency + 50 reserved), not 350. One constituency seat is not seated in the source. | The site says 349 and names the vacant seat; it never pads to 350. |
| Member fields | Names bn/en, photo URL (parliament-hosted), DOB, profession (241/349), parents, addresses, official email (297), mobile (all, we do not publish), term with constituency + party, Speaker/Deputy bio HTML for two members. `electionCount` is 1 for everyone (dead field). | Photos hotlink to parliament today; Phase 2 copies them to Supabase Storage with `photo_source_url`. |
| Committees | One record per committee **per parliament**; 35 of 66 committees still carry the 12th parliament's roster. | Never show ex-MPs as current members; store `roster_current`. |
| Earlier parliaments | Records exist for the 4th, 5th, 7th–12th. Person ids are stable only from the 11th on; older records have placeholder birth dates (1900-01-01) and varying transliterations; one id sits on two people. | `member_terms` history needs corroborated matching (id + name/seat/DOB), never name alone. Existing rules and test cases will be ported. |
| ecs.gov.bd | **Behind a Cloudflare bot challenge.** Plain requests get the challenge page; there is no JSON API or RSS. | Election results and affidavits **cannot be fetched by a worker as things stand**. See "Blockers" below. We will not bypass bot protection. |
| Name matching | A working Bangla/English normaliser exists (ZWJ, ড়/ঢ়, য়/য, ী/ি, ণ/ন, ষ/শ/স, মো./মোঃ/মোহাম্মদ/মুহাম্মদ → মো, Md/Mohammad, honorifics) plus a consonant-skeleton similarity for transliteration variance. | Ported into `/worker/matcher` and `packages/shared` with its tests. |

## 1. Blockers to decide before Phase 2/3

1. **ECS access.** Options, in order of preference: (a) Durbin News requests the result gazette and affidavit PDFs from ECS directly (they are public records) and an editor uploads them in the admin; (b) an editor downloads PDFs in a normal browser and drops them into a watched Supabase Storage bucket the worker processes; (c) a semi-manual Playwright session where a human clears the challenge once. Option (a)/(b) keep the "never bypass bot protection" rule. The pipeline (download → pdf-parse → OCR → review) is the same whichever way the PDF arrives.
2. **The 350th seat.** Confirm with parliament.gov.bd or ECS which constituency is unseated; until then the UI shows 349 and marks the seat "তথ্য পাওয়া যায়নি".

## 2. Repository layout (pnpm workspaces)

```
durbin-sangsad/
  apps/web/            Next.js 15 app (App Router, TS strict, Tailwind v4), BASE_PATH aware
  packages/db/         Drizzle schema, migrations, seed scripts, typed client
  packages/shared/     Bangla/English normalisation, slugs, types shared by web + worker
  worker/              Node worker: jobs (parliament, ecs, rss, googlenews, youtube, affidavits), matcher/, scheduler
  config/sources.json  the 50 news sources (discovered feed URLs, not guessed)
  fixtures/            TEST_-prefixed data for local dev; loader refuses to run when NODE_ENV=production
  docs/                PLAN.md, SOURCES.md, RUNBOOK.md
  .github/workflows/   scheduled worker runs (every 30 min), CI (typecheck, vitest, playwright smoke)
```

Why a separate `packages/db`: both the web app and the worker need the schema; migrations stay versioned in one place.

## 3. Phase 1 — Foundation (this phase)

Goal: migrations run cleanly; the listing page renders constituencies from the database.

Steps
1. Scaffold the monorepo (pnpm, TypeScript strict, ESLint, Prettier, Vitest). `apps/web` on Next.js 15 with `basePath` from `BASE_PATH` env, `next/font` Noto Sans Bengali + Inter, Tailwind v4 tokens, a `bn`/`en` route segment (`/sangsad` and `/sangsad/en`).
2. Supabase project (new, dedicated). `packages/db` with the Drizzle schema from brief section 5, one initial migration, RLS enabled on every table, public `SELECT` policies only on published/verified rows, writes only through the service role.
3. Seed script for `parliaments`, `divisions`, `districts`, `constituencies` from parliament.gov.bd `/api/constituencies` (official names bn/en, numbers, boundary text), with the TLS-safe HTTP client. Reserved seats 301–350 flagged `is_reserved_women`.
4. Public `/sangsad` listing page (server component, ISR 1h) reading constituencies grouped by division/district from the database. `/sangsad/about-data` skeleton.
5. Fixtures: `fixtures/TEST_members.json` etc., loader guarded by `NODE_ENV !== 'production'` and a `FIXTURES=1` flag.
6. Tests: Vitest for the normaliser, slugger and the fixture guard; Playwright smoke test that `/sangsad` renders 64 districts and 300 constituencies; CI workflow.
7. Docs: `SOURCES.md` first entry (parliament.gov.bd API, TLS notes), `RUNBOOK.md` (run migrations, seed, start web, start worker locally), `.env.example`.

Done when: `pnpm db:migrate` and `pnpm db:seed` succeed on a fresh Supabase project; `/sangsad` shows every constituency from the database; CI is green.

Estimated size: about a day of work.

## 4. Later phases (outline, each gets its own plan for approval)

- **Phase 2 — Official data.** Port the proven parliament sync into `worker/jobs/parliament.ts` (members, roles, photos → Storage, committees with roster check, sessions, notices, earlier terms with corroborated matching). ECS results per the blocker decision. Report of MPs with missing fields.
- **Phase 3 — Affidavits.** PDF intake (per blocker decision), `pdf-parse` then Tesseract `ben`, extraction into `affidavits` + `affidavit_cases` with `status=pending`, admin verify screen (PDF left, fields right). Nothing publishes without `verified_by`.
- **Phase 4 — News + matcher.** Inspect all 50 sources (robots.txt, RSS, JSON, XHR) and record in `SOURCES.md`; RSS every 30 min; Google News RSS fallback, rate-limited and cached; YouTube uploads playlist via `playlistItems.list`; matcher with alias table, context signals, 0–1 confidence, ambiguity guard, `match_reason` logging, tricky-case unit tests; 48-hour soak and the 100-sample accuracy check.
- **Phase 5 — Public pages + SEO.** All pages in brief section 7, fuzzy search (FTS + pg_trgm), JSON-LD, OG images, sitemaps, hreflang, Lighthouse ≥ 90 mobile.
- **Phase 6 — Admin + hardening.** Full admin, corrections inbox, audit log, source-failure alerts (3 runs), rate limiting, backups.

## 5. Decisions taken (owner, 2026-09-10)

- **Repository:** the `durbin-sangsad/` folder inside `sumongetup/mymp` (owner, 2026-09-10; a separate repo was the first choice). Local path `Desktop/Github/mymp/durbin-sangsad`. mymp.bd itself is untouched: its build ignores this folder, and Vercel skips mymp.bd builds for pushes that only change it. The proven code is ported, not linked.
- **ECS data:** editors download result gazettes and affidavit PDFs in a normal browser and **upload them in the admin**; the worker then runs pdf-parse/OCR and queues fields for verification. No bot-protection bypass, ever. Blocker 1 is therefore resolved by design; Phase 3 gets an upload intake instead of a crawler.
- **Database:** a new, dedicated Supabase project (Singapore region, same as the readers).
- **Next.js:** 16 (current stable, already proven on mymp.bd). Everything else in the brief stands.

## 6. Remaining assumptions (say so if any is wrong)

- Workers run on GitHub Actions scheduled workflows to start; a VPS node-cron runner can replace it later without code changes.
- Photos: parliament's official photos are copied into Supabase Storage with the source URL kept; if the copy fails, the profile shows the neutral placeholder, never a third-party image.
- Bangla is the default locale at `/sangsad`; English at `/sangsad/en`.
- The 350th (unseated) constituency is shown as vacant with "তথ্য পাওয়া যায়নি" until an official source names the reason.
