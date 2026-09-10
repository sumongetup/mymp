# Sources

What each source provides, how we read it, and its status. Every entry records what was actually inspected (robots.txt, RSS, JSON API, XHR) before any scraping decision. Nothing here is guessed; "not inspected yet" means exactly that.

## Official

### Bangladesh Parliament — parliament.gov.bd (inspected 2026-09-10)

- **robots.txt:** no disallow for `/api/`.
- **Structured access:** the site is a JavaScript app over an open JSON API. No HTML scraping and no Playwright needed.
- **Endpoints used**
  - `GET /api/parliaments` — all parliaments with election, oath and end dates; `externalId` is the election set id (13th = 112).
  - `GET /api/constituencies?limit=100&page=N` — 2,924 rows across election sets; filter `electionId = 112` for the 13th: 350 seats (1–300 territorial with division/district/boundary, 301–350 "Women Seat-N" with no district).
  - `GET /api/members?parliamentNo=13&limit=100&page=N` — 349 sitting members (Phase 2): names bn/en, photo URL, DOB, profession, parents, addresses, official email, mobile (never published), term with constituency and party, Speaker/Deputy biography HTML, `empId` person id.
  - `GET /api/committees?limit=50&page=N` — one record per committee per parliament; roster may still be the previous parliament's (Phase 2).
  - `GET /api/speakers`, `/api/sessions?parliamentId=13`, `/api/notices` — presiding officers, sittings with orders-of-the-day PDFs, secretariat notices (Phase 2/5).
- **Quirks (verified):** the server omits its TLS intermediate certificate and resets connections that send no User-Agent. `@durbin/shared`'s client adds the GoGetSSL intermediate + USERTrust root alongside Node's bundled CAs and always sends `DurbinNewsSangsadBot/1.0`.
- **Rate:** 1 request/second, 3 tries with backoff.
- **Status:** active. Seeded by `pnpm db:seed`.

### Election Commission — ecs.gov.bd (inspected 2026-09-10)

- **Access:** the site sits behind a Cloudflare bot challenge; automated requests receive the challenge page. No RSS, no JSON API found.
- **Decision (owner, 2026-09-10):** editors download result gazettes and affidavit PDFs in a normal browser and upload them in the admin panel; the worker extracts from the uploaded files. Bot protection is never bypassed.
- **Status:** manual intake (Phase 3).

## Trusted verification sources (biography only)

Prothom Alo, The Daily Star, BBC Bangla, The Business Standard, New Age, DW Bangla. Used by editors as citations; nothing is fetched from them automatically in Phase 1–3. Feed inspection happens in Phase 4 together with the news sources.

## News sources (50)

Listed in `config/sources.json` with `status: pending_inspection`. Phase 4 inspects each one (robots.txt, RSS, JSON, XHR, YouTube uploads playlist) and records the findings here, one row per source. No feed URL or channel id is written down before it has been seen to work.
