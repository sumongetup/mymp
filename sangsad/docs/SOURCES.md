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
- **Quirks (verified):** the server omits its TLS intermediate certificate and resets connections that send no User-Agent. `@sangsad/shared`'s client adds the GoGetSSL intermediate + USERTrust root alongside Node's bundled CAs and always sends `MyMPBot/1.0`.
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

## News sources (80)

The owner's list of 80 outlets (2026-09-11). Link-only: a headline, the outlet, the time and the link are shown; never the text or an image. One request per second per host, robots.txt respected, Facebook never read.

<!-- news-sources:start -->
Inspected 2026-09-10 by `pnpm worker sources:inspect` (robots.txt, the homepage's feed links, known feed addresses, the usual feed paths). 43 active, 16 without a usable feed, 21 blocked. Only active sources are read by the news job; the others are re-inspected on the next inspection run, never worked around.

### Newspapers and portals (Bangladesh)

| Source | Status | Feed | Notes |
|---|---|---|---|
| The Daily Star (www.thedailystar.net) | active | news sitemap `https://www.thedailystar.net/googlenews.xml` | news sitemap https://www.thedailystar.net/googlenews.xml: 332 items, newest 2026-09-10 21:43 UTC |
| Prothom Alo (www.prothomalo.com) | active | RSS `https://www.prothomalo.com/feed/` | feed https://www.prothomalo.com/feed/: 26 items, newest 2026-09-10 21:00 UTC |
| bdnews24.com (bdnews24.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| BBC Bangla (www.bbc.com) | active | RSS `https://feeds.bbci.co.uk/bengali/rss.xml` | feed https://feeds.bbci.co.uk/bengali/rss.xml: 14 items, newest 2026-09-10 15:50 UTC |
| The Business Standard (www.tbsnews.net) | active | RSS `https://www.tbsnews.net/top-news/rss.xml` | feed https://www.tbsnews.net/top-news/rss.xml: 20 items, newest 2026-09-10 18:35 UTC |
| New Age (www.newagebd.net) | no_feed |  | no usable feed among 13 candidates (HTTP 404 ×10; not a news sitemap ×3) |
| Dhaka Tribune (www.dhakatribune.com) | active | RSS `https://www.dhakatribune.com/feed/` | feed https://www.dhakatribune.com/feed/: 100 items, newest 2026-09-10 18:00 UTC |
| Bonik Barta (bonikbarta.com) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×8; not a news sitemap ×3) |
| Samakal (samakal.com) | active | RSS `https://samakal.com/rss` | feed https://samakal.com/rss: 100 items, newest 2026-09-10 20:44 UTC |
| DW Bangla (www.dw.com) | no_feed |  | no usable feed among 15 candidates (not a feed (text; not a feed (application; HTTP 404 ×8; news sitemap mostly outside  ×5) |
| The Financial Express (thefinancialexpress.com.bd) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×8; not a news sitemap ×3) |
| Kaler Kantho (www.kalerkantho.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Jugantor (www.jugantor.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Ittefaq (www.ittefaq.com.bd) | active | RSS `https://www.ittefaq.com.bd/feed/` | feed https://www.ittefaq.com.bd/feed/: 100 items, newest 2026-09-10 21:29 UTC |
| Bangla Tribune (www.banglatribune.com) | active | RSS `https://www.banglatribune.com/feed/` | feed https://www.banglatribune.com/feed/: 100 items, newest 2026-09-10 21:06 UTC |
| Jagonews24 (www.jagonews24.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Dhaka Post (www.dhakapost.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Ajker Patrika (www.ajkerpatrika.com) | active | RSS `https://www.ajkerpatrika.com/feed` | feed https://www.ajkerpatrika.com/feed: 20 items, newest 2026-09-10 21:40 UTC |
| Manab Zamin (mzamin.com) | no_feed |  | no usable feed among 11 candidates (HTTP 404 ×10; only 1 items) |
| Netra News (netra.news) | active | RSS `https://netra.news/rss/` | feed https://netra.news/rss/: 15 items, newest 2026-09-10 17:40 UTC |
| Banglanews24 (www.banglanews24.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Desh Rupantor (www.deshrupantor.com) | active | RSS `https://www.deshrupantor.com/feed/` | feed https://www.deshrupantor.com/feed/: 100 items, newest 2026-09-10 19:10 UTC |
| UNB (unb.com.bd) | no_feed |  | no usable feed among 11 candidates (HTTP 404 ×11) |
| BSS (www.bssnews.net) | active | RSS `https://www.bssnews.net/rss/rss.xml` | feed https://www.bssnews.net/rss/rss.xml: 15 items, newest 2026-09-10 19:13 UTC |
| Bangladesh Pratidin (www.bd-pratidin.com) | blocked |  | robots.txt of www.bd-pratidin.com unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.bd-pratidin.com unread ×8) |
| Naya Diganta (www.dailynayadiganta.com) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×8; not a news sitemap ×3) |
| Daily Sun (www.daily-sun.com) | blocked |  | robots.txt of www.daily-sun.com unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.daily-sun.com unreadab ×8) |
| Sarabangla (sarabangla.net) | active | RSS `https://sarabangla.net/feed` | feed https://sarabangla.net/feed: 10 items, newest 2026-09-10 17:50 UTC |
| Risingbd (www.risingbd.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Janakantha (www.dailyjanakantha.com) | active | RSS `https://www.dailyjanakantha.com/rss/rss.xml` | feed https://www.dailyjanakantha.com/rss/rss.xml: 30 items, newest 2026-09-10 18:29 UTC |
| Bhorer Kagoj (www.bhorerkagoj.com) | active | news sitemap `https://www.bhorerkagoj.net/news_sitemap.xml` | news sitemap https://www.bhorerkagoj.net/news_sitemap.xml: 94 items, newest 2026-09-10 17:42 UTC |
| The Daily Observer (www.observerbd.com) | active | RSS `https://www.observerbd.com/rss` | feed https://www.observerbd.com/rss: 15 items, newest 2026-09-11 00:00 UTC |
| Daily Inqilab (dailyinqilab.com) | active | RSS `https://dailyinqilab.com/rss/rss.xml` | feed https://dailyinqilab.com/rss/rss.xml: 100 items, newest 2026-09-10 19:00 UTC |
| Alokito Bangladesh (www.alokitobangladesh.com) | active | RSS `https://www.alokitobangladesh.com/rss/rss.xml` | feed https://www.alokitobangladesh.com/rss/rss.xml: 15 items, newest 2026-09-10 17:28 UTC |
| Bangladesh Post (bangladeshpost.net) | blocked |  | robots.txt of bangladeshpost.net unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of bangladeshpost.net unreada ×8) |
| Kalbela (www.kalbela.com) | blocked |  | robots.txt of www.kalbela.com unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.kalbela.com unreadable ×8) |
| Amar Desh (www.dailyamardesh.com) | active | RSS `https://www.dailyamardesh.com/feed` | feed https://www.dailyamardesh.com/feed: 20 items, newest 2026-09-10 21:50 UTC |
| Protidiner Bangladesh (www.protidinerbangladesh.com) | active | news sitemap `https://protidinerbangladesh.com/news_sitemap.xml` | news sitemap https://protidinerbangladesh.com/news_sitemap.xml: 91 items, newest 2026-09-10 16:36 UTC |
| Dainik Bangla (www.dainikbangla.com.bd) | no_feed |  | no usable feed among 11 candidates (HTTP 404 ×10; HTTP 500) |
| The Independent (theindependentbd.com) | no_feed |  | homepage unreachable: The operation was aborted due to timeout; no usable feed among 11 candidates (HTTP 404 ×11) |
| Sangbad (sangbad.net.bd) | active | RSS `https://sangbad.net.bd/rss.xml` | feed https://sangbad.net.bd/rss.xml: 120 items, newest 2026-09-10 15:43 UTC |
| Jai Jai Din (www.jaijaidinbd.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Naya Shatabdi (www.dailynayashatabdi.com) | blocked |  | robots.txt of www.dailynayashatabdi.com unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.dailynayashatabdi.com  ×8) |
| Dhaka Times (www.dhakatimes24.com) | blocked |  | no usable feed among 1 candidates (bot challenge) |
| Barta24 (barta24.com) | active | RSS `https://barta24.com/rss/rss.xml` | feed https://barta24.com/rss/rss.xml: 120 items, newest 2026-09-10 17:49 UTC |
| Share Biz (sharebiz.net) | active | RSS `https://sharebiz.net/rss/rss.xml` | feed https://sharebiz.net/rss/rss.xml: 30 items, newest 2026-09-10 18:20 UTC |
| Arthosuchak (arthosuchak.com) | active | RSS `https://www.arthosuchak.com/feed/` | feed https://www.arthosuchak.com/feed/: 10 items, newest 2026-09-10 17:32 UTC |
| Prothom Alo English (en.prothomalo.com) | active | news sitemap `https://en.prothomalo.com/news_sitemap.xml` | news sitemap https://en.prothomalo.com/news_sitemap.xml: 66 items, newest 2026-09-10 16:12 UTC |
| The Daily Star Bangla (bangla.thedailystar.net) | active | news sitemap `https://bangla.thedailystar.net/googlenews.xml` | news sitemap https://bangla.thedailystar.net/googlenews.xml: 112 items, newest 2026-09-10 17:47 UTC |
| Durbin News (durbinnews.com) | active | RSS `https://durbinnews.com/feed.xml` | feed https://durbinnews.com/feed.xml: 30 items, newest 2026-09-10 17:03 UTC |

### TV channel websites (Bangladesh)

| Source | Status | Feed | Notes |
|---|---|---|---|
| Somoy TV (www.somoynews.tv) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Jamuna TV (jamuna.tv) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| Channel 24 (www.channel24bd.tv) | active | RSS `https://www.channel24bd.tv/rss/rss.xml` | feed https://www.channel24bd.tv/rss/rss.xml: 120 items, newest 2026-09-10 19:10 UTC |
| Independent Television (www.itvbd.com) | active | RSS `https://www.itvbd.com/feed/` | feed https://www.itvbd.com/feed/: 100 items, newest 2026-09-10 16:39 UTC |
| NTV (www.ntvbd.com) | active | news sitemap `https://www.ntvbd.com/googlenews.xml` | news sitemap https://www.ntvbd.com/googlenews.xml: 248 items, newest 2026-09-10 21:30 UTC |
| Channel i (www.channelionline.com) | active | RSS `https://www.channelionline.com/rss.xml` | feed https://www.channelionline.com/rss.xml: 30 items, newest 2026-09-10 20:14 UTC |
| DBC News (dbcnews.tv) | no_feed |  | no usable feed among 13 candidates (HTTP 404 ×11; news sitemap index without a usable chil; not a news sitemap) |
| ATN News (www.atnnewstv.com) | active | news sitemap `https://www.atnnewstv.com/news_sitemap.xml` | news sitemap https://www.atnnewstv.com/news_sitemap.xml: 20 items, newest 2026-09-10 12:37 UTC |
| Ekattor TV (ekattor.tv) | active | RSS `https://ekattor.tv/feed/` | feed https://ekattor.tv/feed/: 100 items, newest 2026-09-10 16:59 UTC |
| Maasranga TV (www.maasranga.tv) | no_feed |  | no usable feed among 12 candidates (stale, newest 2026-03-28 ×3; HTTP 404 ×8; only 0 items) |
| RTV (www.rtvonline.com) | no_feed |  | no usable feed among 11 candidates (HTTP 403 ×2; not a feed (text ×6; not a news sitemap ×3) |
| Ekushey TV (www.ekushey-tv.com) | active | RSS `https://www.ekushey-tv.com/rss/rss.xml` | feed https://www.ekushey-tv.com/rss/rss.xml: 30 items, newest 2026-09-10 16:43 UTC |
| BanglaVision (www.banglavision.tv) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×8; not a news sitemap ×3) |
| News24 (www.news24bd.tv) | active | RSS `https://www.news24bd.tv/rss.xml` | feed https://www.news24bd.tv/rss.xml: 57 items, newest 2026-09-06 13:44 UTC |
| Ekhon TV (www.ekhon.tv) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×8; not a news sitemap ×3) |
| ATN Bangla (www.atnbangla.tv) | no_feed |  | no usable feed among 11 candidates (not a feed (text ×5; HTTP 404 ×3; not a news sitemap ×3) |
| Desh TV (www.desh.tv) | active | news sitemap `https://www.desh.tv/sitemap/news-sitemap.xml` | news sitemap https://www.desh.tv/sitemap/news-sitemap.xml: 232 items, newest 2026-09-10 17:12 UTC |
| Boishakhi TV (www.boishakhi.tv) | blocked |  | robots.txt of www.boishakhi.tv unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.boishakhi.tv unreadabl ×8) |
| Nagorik TV (www.nagorik.com) | blocked |  | robots.txt of www.nagorik.com unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.nagorik.com unreadable ×8) |
| BTV (www.btv.gov.bd) | blocked |  | robots.txt of www.btv.gov.bd unreadable (5xx, challenge or network); no usable feed among 8 candidates (robots.txt of www.btv.gov.bd unreadable  ×8) |

### International

| Source | Status | Feed | Notes |
|---|---|---|---|
| Reuters (www.reuters.com) | blocked |  | robots.txt of www.reuters.com disallows /; no usable feed among 8 candidates (robots.txt of www.reuters.com disallows  ×8) |
| Associated Press (apnews.com) | blocked |  | homepage serves a bot challenge; no usable feed among 1 candidates (bot challenge) |
| AFP (www.afp.com) | no_feed |  | no usable feed among 11 candidates (HTTP 404 ×10; stale, newest 2021-09-17) |
| BBC News (www.bbc.com) | active | RSS `https://feeds.bbci.co.uk/news/world/asia/rss.xml` | feed https://feeds.bbci.co.uk/news/world/asia/rss.xml: 17 items, newest 2026-09-10 12:24 UTC |
| Al Jazeera (www.aljazeera.com) | active | RSS `https://www.aljazeera.com/xml/rss/all.xml` | feed https://www.aljazeera.com/xml/rss/all.xml: 25 items, newest 2026-09-10 21:19 UTC |
| The Guardian (www.theguardian.com) | active | RSS `https://www.theguardian.com/world/bangladesh/rss` | feed https://www.theguardian.com/world/bangladesh/rss: 20 items, newest 2026-09-03 16:51 UTC |
| The New York Times (www.nytimes.com) | active | RSS `https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml` | feed https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml: 20 items, newest 2026-09-10 21:05 UTC |
| Bloomberg (www.bloomberg.com) | active | RSS `https://feeds.bloomberg.com/politics/news.rss` | feed https://feeds.bloomberg.com/politics/news.rss: 20 items, newest 2026-09-10 21:24 UTC |
| CNN (www.cnn.com) | active | news sitemap `https://www.cnn.com/sitemap/news.xml` | news sitemap https://www.cnn.com/sitemap/news.xml: 272 items, newest 2026-09-10 21:30 UTC |
| The Economist (www.economist.com) | active | RSS `https://www.economist.com/asia/rss.xml` | feed https://www.economist.com/asia/rss.xml: 300 items, newest 2026-09-10 14:20 UTC |

<!-- news-sources:end -->
