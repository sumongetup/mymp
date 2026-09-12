# QA pass report, 2026-09-12

Full pass over mymp.bd (Next 16 + Supabase, repo `sumongetup/mymp`, branch `main`). Seventeen commits from `fa9795b` to `b07302f`, each built and type-checked before it landed. Detail lives in the files beside this one: `inventory.md`, `data-report.md`, `glossary.md`, `lighthouse.md`, `design-questions.md`, `blocked.md`, `screenshots/`.

## 1. What was fixed, by phase

**Phase 1, inventory.** `inventory.md`: every `data/*.json` file with counts, every Supabase table with live row counts, every public and admin route, redirects, roles and server actions. Found while writing it: the three posts tables are missing in production (migration never run), and Chattogram-4 had no seat page at all.

**Phase 2, data integrity.** `scripts/qa-data.ts` (read-only, `npx tsx scripts/qa-data.ts [--no-photos]`) writes `data-report.md`: 20 checks pass, 1 fails (the missing posts tables), 7 notes. Fixed on the way:
- Chattogram-4 (seat 281) was absent from `data/seats.json`, so the site counted 299 general seats and had no page for it. `scripts/sync.mjs` now fills any general seat 1 to 300 that the member list lacks from the live constituency API with `memberId: null`; `/ason/chattogram-4` exists and says the source lists no member.
- The seat total was hardcoded as 300 in several places; now `GENERAL_SEATS`, `RESERVED_SEATS`, `HOUSE_SEATS` in `src/lib/data.ts`.
- `normalizeName` in `src/lib/posts/names.ts` cut "এ, জেড, এম, রেজওয়ানুল হক" down to "এ" (it treated the first comma as a credential separator). Fixed, with tests (16 pass).
- All 349 member photos answer 200; every id referenced by seats, committees, notices, officers, news, results, posts and history exists; 797 overrides, 246 news_posts and 298 election_results all point at real entities.

**Phase 3, content and language.** One patch across 25 files: middle dots and em/en dashes out of the UI (", " or " | " between facts, "থেকে" for ranges, "তথ্য নেই" / "তারিখ নেই" / "দল নেই" / "নাম নেই" for missing values, "০" in result tables); notice and news titles pass through `bnText()` so Latin digits in Bangla text render as Bangla digits; dates come from `dhakaYmd()` / `dateBn()` in Asia/Dhaka; notice categories (NOC, GO, notification) have Bangla labels; reserved seats are "সংরক্ষিত নারী আসন" everywhere; `history.ts` labels read "নবম সংসদ, ২০০৮". Bangla 500 pages (`error.tsx`, `global-error.tsx`) with a retry button and links home; the 404 already was. The disclaimer on the about page now also says the site has no link to any party or member. `glossary.md` fixes the terms (সংসদ সদস্য in prose, এমপি only in the brand) and the punctuation rules.

**Phase 4, every page, every state.** 49 route types at 360, 768 and 1280 (`screenshots/`, 147 files): no console errors, no hydration warnings, no horizontal overflow. Link crawl of all 853 built pages: 857 distinct internal hrefs, 0 broken. Search: exact, partial, Bangla, English and misspelt queries (তারিক রহমান, তারেক রহমন, মিরজা ফখরুল, কুমিলা, জামাত, Tarik Rahman) all land on the right member; `src/lib/search.ts` gained an edit-distance fallback for near misses. List filters (`/mp` q/party/kind, `/songbad` mp/outlet/q, `/ministers` ministry) now live in the URL through `useQueryParam`, so a filtered list can be shared and back/forward restores it; the old `#songrokkhito` and `#mp=` hashes still work.

**Phase 5, SEO and sharing.** Script over all 853 pages: every page has a unique Bangla title and a description under 160 characters, a canonical, complete OG and Twitter tags, JSON-LD (Person on MP pages, PoliticalParty, WebSite with a SearchAction pointing at `/mp?q=`, BreadcrumbList). Sitemap lists all 853 URLs; robots allows the site and blocks `/admin` and `/api` except `/api/og/`; the only `noindex` is the 404. Share images keep the subject inside the centre square (the party card's side text is a documented exception, see design questions). Post-deploy check on the real host is at the end of this file.

**Phase 6, performance and accessibility.** Lighthouse mobile before and after in `lighthouse.md`: home 77 to 86, total blocking time cut by 60 to 80 percent on all four pages (the scroll-driven card animation now runs only from 768 px up), accessibility 96 everywhere. `--color-muted` moved from 4.3:1 to 5.3:1 contrast; search boxes and selects got a visible focus ring; every image has alt and dimensions; `lang="bn"`; reduced motion stops every animation.

**Phase 7, admin.** Clicked through as a throwaway editor (created and deleted with the service key; no trace left except two audit rows, see section 2). Confirmed server-side: signed out, all 18 admin routes 307 to `/admin/login`; an editor opening `/admin/users` is sent to `/admin?forbidden=1`; every action calls `requireAdmin()` / `requireSuperAdmin()` itself. Fixed:
- **The per-field "সংসদের মানে ফেরান" button never worked.** React renames a `formAction` button, so the action read an empty field and threw "bad field". The field is now bound into the action; save, reload, revert, reload verified against the database.
- Bangla validation messages and an unsaved-changes prompt for every admin form (`FormGuard.tsx`).
- The committees list (66 rows) had no search; it has the same name search as members.
- Middle dots and dashes replaced across all admin pages, same rules as the site.
- 12 admin pages at 360 and 1280 in `screenshots/admin_*.jpg`: no overflow, tables scroll inside their own box.
Lists: members, seats, news, corrections and results have search or filters; parties (11 rows) has none and does not need one. There are no screens for "add an MP", "assign a committee member" or "set a ministerial post" and none were added: members and rosters come only from parliament.gov.bd, posts from the posts sync, and per-member `ministryBn` / `govPost` overrides already exist for corrections.

## 2. Data corrections, before and after

| What | Before | After | Source |
|---|---|---|---|
| Seat 281 চট্টগ্রাম-৪ | not in `data/seats.json`; 299 general seats; no page | present with `memberId: null`, boundary from the constituency API; page says the source lists no member | parliament.gov.bd `/api/constituencies` (election 112) |
| Seat totals | `300` hardcoded in stats, sitemap, sync, seat page | `GENERAL_SEATS` / `RESERVED_SEATS` / `HOUSE_SEATS` constants | none needed |
| Post-sync name matching | "এ, জেড, এম, রেজওয়ানুল হক" normalised to "এ" | full name kept, commas between initials ignored | none needed |
| QA rows in `audit_log` | | two rows by `qa-editor-2026-09-12@mymp.bd` on member 013019001 (`override.set` then `override.clear` of nameEn); the override itself is gone | left in place: audit rows are never deleted |

No official-source value was changed or invented. `election_results` is 298 rows, 297 published, exactly as before.

## 3. Blocked (needs the owner)

Contents of `blocked.md`:
- **Production database**: run `supabase/migrations/003_posts.sql` in Supabase → SQL Editor. Until then `posts`, `post_sync_runs` and `post_aliases` do not exist, `/api/cron/sync-posts` fails cleanly, `/admin/sync` shows the "table missing" notice, and `/ministers` and the MP badges come from the committed `data/posts.json` snapshot.
- **Credentials**: `RESEND_API_KEY` (and optionally `MAIL_FROM`) in Vercel so the posts sync can email; `MYMP_CRON_SECRET` in GitHub → Settings → Secrets → Actions (same value as Vercel's `CRON_SECRET`) so the six-hourly workflow can call the site.
- **Chattogram-4 (seat 281)**: parliament.gov.bd lists no member and no result was published by TBS or Wikipedia. Whether the election was postponed, is disputed, or the member is not yet entered is stated nowhere I can read; confirm, and if there is a member, give the name and source.

## 4. Migrations

- `supabase/migrations/003_posts.sql` (written in the posts-sync work, still not run). Command: open Supabase → SQL Editor, paste the file, run. Safe to run twice.
- No new migration was needed in this pass.

## 5. Design questions

In `design-questions.md`, with recommendations: (1) member photos and party logos are served larger than drawn, recommend engine-published 96 px thumbnails; (2) the party share card's side text falls outside the WhatsApp crop square, recommend keeping it; (3) muted captions are now darker for contrast, `#616b66` is the lightest that still passes; (4) the "সর্বশেষ" ticker trips a Lighthouse target-size audit that no reader can actually hit, recommend keeping it.

## 6. Deliberately left alone

- An en dash inside one editor-entered override ("১৯৮৫–৮৬ শিক্ষাবর্ষে", member education) and dashes inside outlet headlines on `/admin/news` and `/songbad`: that is data as written by the editor or the newspaper, not site copy.
- Six technocrat cabinet members the posts sync could not match to an MP: they sit in the review queue by design, since they are not members.
- The `_global-error.html` static fallback is Next's English default; the Bangla `global-error.tsx` is what a browser with JavaScript shows.
- Source spellings of honorifics (মোঃ / মোহাম্মদ / ডাঃ) are kept as parliament.gov.bd writes them; search folds them.
- Committee types ("Ministry Related Standing Committee") show in English on the admin list, as the source names them.
- The admin `zzz`-style nonsense query matching two committees is the search normaliser folding Latin letters (z to j); harmless.

## 7. Three fixes to do next

1. **Run `003_posts.sql`** and set the two secrets: it turns the ministers page and MP badges from a one-off snapshot into a self-updating list, and lights up the review queue on `/admin/sync`.
2. **Photo thumbnails from the engine** (design question 1): about 50 KB less per list page on phones, the single largest remaining Lighthouse item after fonts.
3. **Resolve Chattogram-4**: either a member from the source or a one-line note on the seat page saying why it is empty, so the 349 vs 350 gap on the home chart is explained rather than silent.

## Post-deploy check

Filled in after the push: see the end of the session notes below.
