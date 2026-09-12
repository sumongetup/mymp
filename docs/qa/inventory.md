# QA inventory (2026-09-12)

The map for the QA pass. Counts are from the committed snapshot in `data/` and a read-only count of the live Supabase tables.

## 1. Data model

The public site reads no database: `scripts/sync.mjs` runs at build time, pulls parliament.gov.bd (via the সংসদ engine's mirror), merges the admin tables, and writes `data/*.json`. Pages import those files. The admin reads and writes Supabase directly.

### Build-time snapshot (`data/`)

| File | Shape | Rows | Fields |
|---|---|---|---|
| members.json | array | 349 (348 sitting, 1 resigned) | id, slug, nameBn, nameEn, photoUrl, gender, dateOfBirth, professionBn (72 empty), fatherBn/En, motherBn/En, isFreedomFighter, presentAddressBn and permanentAddressBn (always null, scrubbed on purpose), email (52 empty), hasMobile, shareImage, bioBn (2), summaryBn (2), term {start, end, status…}, facebook/x/youtube/instagram/website, socialSource, educationBn (75), birthPlaceBn (207), bioFromWiki, bioSource, partyRoleBn (1), ministryBn, govPost, party {abbr, nameBn…}, seat {no, nameBn, slug, reserved…}, offices (4 non-empty), status, termsCount (2 empty), resignedOn (1) |
| seats.json | array | 349 (300 general + 49 reserved women's seats; seat 281 is not in the source) | no, reserved, nameBn, nameEn, slug, boundaryBn (50 empty: all reserved), memberId, vacantSince (1) |
| parties.json | array | 11 | abbr, slug, nameBn, nameEn, seats, seatsTerritorial, seatsReserved |
| committees.json | array | 66 | id, slug, nameBn, nameEn, type, startDate, rosterCurrent, memberCount, members[] (35 empty: rosters not yet updated for the 13th parliament), previousStartDate |
| activity.json | object | speakers 11, sessions 3, notices 404 | parliament {no, electionDate, oathDate, gazetteDate, endDate}; speakers {role, nameBn, nameEn, tenureBn, memberId}; sessions {id, titleBn, titleEn, startDate, endDate, circulars[], sittings[]}; notices {id, type, category, date, titleBn, titleEn, pdfUrl, memberId, committeeId} |
| history.json | object | parliaments 13, priorTerms 63 members, seatHolders 298 seats, partySeats 9 parliaments | earlier parliaments' seat holders and party totals |
| results.json | array | 297 seats | seatNo, parliamentNo, candidates[] {name, party, votes}, totalVotes (always null), turnout (1), sourceUrl, sourceNote |
| news.json | array | 65 | id, titleBn, sourceName, sourceUrl, publishedOn, excerptBn, memberId, seatSlug |
| posts.json | object | rows 90, pending 6 | government and parliamentary posts (a snapshot of cabinet.gov.bd and /api/speakers; the live table does not exist yet, see Blocked) |
| ecs.json | object | 1 | national voter and polling-centre figures, entered by hand from ecs.gov.bd |
| meta.json | object | 1 | parliamentNo, overridesApplied, hidden, syncedAt, builtAt, source, via, counts |
| public/search-index.json | array | ~709 | [type, bn, en, url, sub] rows for the client-side search |

### Supabase (project `pcujccdothjgfrvppphi`, service role only; RLS on, no policies)

| Table | Live rows | Purpose | Key fields |
|---|---|---|---|
| admin_users | 1 | who may sign in to /admin | user_id, email, role (super_admin, editor) |
| overrides | 797 | per-field hand edits applied on top of the source at build time | entity_type (member, seat, party, committee), entity_id, field, value, updated_by, updated_at |
| hidden_entities | 0 | members or committees kept off the site | entity_type, entity_id, reason |
| news_posts | 246 | headline queue (65 published reach the site) | title_bn, source_name, source_url, published_on, excerpt_bn, member_id, seat_slug, status (draft, published, rejected) |
| corrections | 1 | the public "সংশোধন জানান" form | page_path, message, reporter_name, reporter_email, status (open, accepted, rejected), resolution_note |
| audit_log | 18 | every admin action | actor, actor_email, action, entity_type, entity_id, field, old_value, new_value |
| sync_runs | 80 | one row per build-time sync | started_at, finished_at, ok, members, committees, overrides_applied, message |
| election_results | 298 (297 published) | per-seat vote counts | seat_no, parliament_no, candidates jsonb, total_votes, turnout, source_url, source_note, status (draft, published) |
| posts | 91 | government and House posts, kept by the posts sync | type, title, rank_note, ministry_bn, member_id, is_mp, person_name_bn/en, photo_url, from_date, to_date, appointed_on, source_order, source_key, source_url, source_hash, auto_synced, auto_closed |
| post_sync_runs | 4 | one row per posts-sync run | status, trigger, source_hashes, source_counts, added, closed, unchanged, unmatched, unmatched_names, changes, errors |
| post_aliases | 0 | names an editor resolved for the posts sync | name_key, name_bn, member_id |

`supabase/migrations/003_posts.sql` creates the three missing tables. Not run in production (see blocked.md).

## 2. Public routes

All public pages are prerendered at build time (static), except where noted.

| Route | Renders | Source |
|---|---|---|
| `/` | home: hero search, composition chart, House now, officers, districts, news | `(site)/page.tsx` |
| `/mp` | all sitting members with a client-side filter (name, seat kind, party) | `(site)/mp/page.tsx` + `MemberFilter` |
| `/mp/[slug]` | member profile: badges, introduction, facts, term history, votes, notices, committees, news, contact | 349 pages |
| `/ason/[slug]` | seat: current member, boundary, earlier holders, results, district neighbours | 349 pages, `dynamicParams=false` |
| `/jela/[slug]` | district: its seats and members | 64 pages |
| `/dol` | parties with profiles and House share | |
| `/dol/[slug]` | party: profile, leader, members (first 12, rest behind a tap) | 11 pages |
| `/committee` | committees, current roster or "awaiting update" | |
| `/committee/[slug]` | committee: duties, members, notices | 66 pages |
| `/odhibeshon` | sessions, sittings, circulars, notices, officers | |
| `/parisonkhan` | statistics computed from the members | |
| `/nirbachon` | 13th election: composition, ECS figures, per-district winners; `#jela` anchor | |
| `/songbad` | news, folded into stories, with filters (`#mp=<slug>`) | `NewsBrowser` (client) |
| `/ministers` | cabinet by rank, ministry filter, change log | `MinistersBrowser` (client) |
| `/somporke`, `/sutro`, `/jogajog`, `/gopaniyota` | about, sources and method, contact, privacy and terms | |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | route handlers; sitemap is `force-static` | |
| `/api/og/mp/[slug]`, `/api/og/party/[slug]` | share cards (ImageResponse, HarfBuzz-shaped Bangla), revalidate daily | |
| `/api/news/latest` | ticker headlines, ISR 300 s | |
| `/api/corrections` | POST from the correction form, force-dynamic | |
| `/api/cron/republish` | nightly rebuild (Vercel Cron 21:00 UTC), CRON_SECRET | |
| `/api/cron/sync-posts` | posts sync (GitHub Actions 6-hourly + Vercel daily 03:10 UTC), CRON_SECRET, `?dry=1` | |
| `/api/cron/probe` | parliament.gov.bd reachability check, CRON_SECRET | |
| not-found | root `not-found.tsx`, Bangla, noindex | |

Redirects (308, `next.config.ts`): `/mps`→`/mp`, `/mps/:id`→`/mp`, `/parties`→`/dol`, `/parties/:slug`→`/dol`, `/about`→`/somporke`, `/contact`→`/jogajog`, `/privacy`→`/gopaniyota`, `/terms`→`/gopaniyota`, `/election-2026`→`/nirbachon`, `/sources`→`/sutro`, `/jela/chittagong`→`/jela/chattogram`, `/jela/pabna-5`→`/jela/pabna`, `/jela/cox-sbazar`→`/jela/coxs-bazar`.

## 3. Admin routes

`src/app/admin/layout.tsx` is `force-dynamic` and `noindex`; `src/proxy.ts` refreshes the Supabase session on every `/admin` request. `robots.txt` disallows `/admin` and `/api` (allows `/api/og/`).

Access is enforced on the server: every page under `admin/(auth)/` calls `requireAdmin()` (redirects to `/admin/login?denied=1` unless the signed-in user has an `admin_users` row), and every server action in `admin/actions.ts` calls `requireAdmin()` or `requireSuperAdmin()` itself. Bootstrap: while `admin_users` is empty, the user whose email is `ADMIN_BOOTSTRAP_EMAIL` becomes super_admin on first sign-in.

| Route | Who | What |
|---|---|---|
| `/admin/login` | anyone | email + password sign-in |
| `/admin/setup` | anyone | shown until the Supabase env vars exist |
| `/admin` | admin | dashboard: counts, last sync |
| `/admin/members`, `/admin/members/[id]` | admin | list; per-field overrides (EDITABLE list), socials, hide/unhide |
| `/admin/seats`, `/admin/seats/[no]` | admin | seat name and boundary overrides |
| `/admin/parties`, `/admin/parties/[abbr]` | admin | party profile overrides |
| `/admin/committees`, `/admin/committees/[id]` | admin | committee name overrides, hide/unhide |
| `/admin/social` | admin | bulk import of official social links |
| `/admin/news`, `/admin/news/[id]` | admin | headline queue: draft, publish, reject |
| `/admin/corrections` | admin | public correction requests: accept, reject |
| `/admin/results`, `/admin/results/[seat]`, `/admin/results/go` | admin | vote counts per seat, draft/publish |
| `/admin/sync` | admin | site publish, posts sync, review queue, run history |
| `/admin/audit` | admin | audit log |
| `/admin/password` | admin | change own password |
| `/admin/users` | **super_admin only** | add/remove admins (the nav hides it from editors, and the page and both actions check the role) |

Server actions: signIn, signOut, changePassword, saveOverrides, importSocialLinks, revertOverride, toggleHidden, saveNews, changeNewsStatus, decideCorrection, createAdmin (super), deleteAdmin (super), publishSite, runPostsSyncNow, resolvePostName, saveResult, changeResultStatus.

There is no admin screen for: adding a member (members come from parliament.gov.bd only), assigning committee members (rosters come from the source), or setting a ministerial post directly (posts come from the posts sync; overrides on `ministryBn`/`govPost` exist per member).
