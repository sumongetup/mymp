# Sources

What each source provides, how we read it, and its status. Every entry records what was actually inspected (robots.txt, RSS, JSON API, XHR) before any scraping decision. Nothing here is guessed; "not inspected yet" means exactly that.

## Official

### Bangladesh Parliament — parliament.gov.bd (inspected 2026-09-10)

- **robots.txt:** none (`/robots.txt` returns the site's 404 page). Nothing is disallowed; we still keep to one request per second.
- **Structured access:** the site is a JavaScript app over an open JSON API. No HTML scraping and no Playwright needed.
- **Endpoints used**
  - `GET /api/parliaments` — all parliaments with election, oath and end dates; `externalId` is the election set id (13th = 112).
  - `GET /api/constituencies?limit=100&page=N` — 2,924 rows across election sets; `electionId` ties each row to a parliament. The 13th has 350 seats (1–300 territorial with division/district/boundary, 301–350 "Women Seat-N" with no district). The seed loads every set the source has; divisions and districts come from the current set only, and older sets look districts up by the source's district id, which is the same in every set (all 64 current districts cover every older set's districts).
  - `GET /api/members?parliamentNo=N&limit=100&page=M` — the 13th has 349 sitting members: names bn/en, photo URL, DOB, profession, parents, addresses, official email, mobile (read and discarded, never stored), term with constituency and party, Speaker/Deputy biography HTML, `empId` person id. Records also exist for the 4th, 5th and 7th–12th parliaments; identity across parliaments is matched with corroborated rules (see `worker/src/jobs/person-match.ts`).
  - `GET /api/parties?limit=100` — 45 parties. `abbreviation` is not unique (two "JP", two "BJP"), so parties are keyed on the source id.
  - `GET /api/speakers` — presiding officers past and present: SPEAKER, DEPUTY_SPEAKER, LEADER_OF_HOUSE, OPPOSITION_LEADER, CHIEF_WHIP, WHIP, with `isCurrent`.
  - `GET /api/committees?limit=50&page=N` — one record per committee per parliament; a roster may still be the previous parliament's, which the worker detects and withholds.
  - `GET /api/sessions?parliamentId=13` — sessions with circulars (পরিপত্র) and orders of the day (one per sitting, PDF on the parliament's server).
  - `GET /api/notices?limit=100&page=N` — 845 secretariat notices: NOC_GO (government orders about individual members, seat number in the title), COMMITTEE (meeting notices with `committeeId`), GENERAL, plus TENDER/DOWNLOAD/OTHERS which are not shown.
- **Quirks (verified):** the server omits its TLS intermediate certificate and resets connections that send no User-Agent. `@durbin/shared`'s client adds the GoGetSSL intermediate + USERTrust root alongside Node's bundled CAs and always sends `DurbinNewsSangsadBot/1.0`.
- **Constituency data quirks (verified 2026-09-11 against the live seed):**
  - A district record's own `divisionId` uses an alphabetical 1-8 numbering, while division objects use ids 1-7 and 9 (Sylhet's districts say 8, the Sylhet division is 7; Mymensingh's say 5, which is Rajshahi's id). Matching them directly would put Mymensingh's districts under Rajshahi, Rajshahi's under Rangpur and Rangpur's under Sylhet. The seed translates the numbering by majority vote over the rows (`resolveDistrictDivisions`).
  - The two signals disagree on one district: Kishoreganj's seat rows say Mymensingh, its district record says Dhaka (the official map agrees with the record). The record is used and the seed logs the disagreement. Result: 64 districts, Dhaka 13, Chattogram 11, Khulna 10, Rajshahi 8, Rangpur 8, Barishal 6, Mymensingh 4, Sylhet 4.
  - Older sets carry no division objects (only the 11th, 12th and 13th do).
  - Some sets repeat a seat name: the 1st parliament lists seats 241 and 242 both as COMILLA-1 / কুমিল্লা-১, the 4th has two BHOLA-1, and the 12th gives Cox's Bazar 1-4 the English name "Cox" (Bangla correct). Names are stored exactly as published; a repeated name's slug gets the seat number (`cox-295`).
  - Election set 9 has only 13 seats and set 4 no reserved seats; stored as the source has them.
- **Rate:** 1 request/second, 3 tries with backoff.
- **Status:** active. Seeded by `pnpm db:seed`; refreshed nightly by the `parliament` worker job.

### Parliament photo host — prp.parliament.gov.bd (inspected 2026-09-10)

- **robots.txt:** `/robots.txt` redirects (302) to the site; no rules are served.
- **Access:** member photos at `/api/files?_=<token>` return `image/jpeg`, about 10 KB each, with an ordinary TLS chain and no User-Agent requirement (checked all three ways).
- **Use:** the `parliament:photos` job copies each sitting member's official photo into the public Supabase Storage bucket `member-photos`, keeps the source URL on the member, and re-downloads only when that URL changes. No other image source is ever used; a failed copy leaves the neutral placeholder.
- **Status:** active.

### Election Commission — ecs.gov.bd (inspected 2026-09-10)

- **Access:** the site sits behind a Cloudflare bot challenge; automated requests receive the challenge page. No RSS, no JSON API found.
- **Decision (owner, 2026-09-10):** editors download result gazettes and affidavit PDFs in a normal browser and upload them in the admin panel; the worker extracts from the uploaded files. Bot protection is never bypassed.
- **Status:** manual intake (Phase 3).

## Trusted verification sources (biography only)

Prothom Alo, The Daily Star, BBC Bangla, The Business Standard, New Age, DW Bangla. Used by editors as citations; nothing is fetched from them automatically in Phase 1–3. Feed inspection happens in Phase 4 together with the news sources.

## News sources (50)

Listed in `config/sources.json` with `status: pending_inspection`. Phase 4 inspects each one (robots.txt, RSS, JSON, XHR, YouTube uploads playlist) and records the findings here, one row per source. No feed URL or channel id is written down before it has been seen to work.
