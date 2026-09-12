# The per-MP news and video feed

What a member's profile shows under **সংবাদ ও ভিডিও**, where it comes from,
and what an editor can do about it.

## How it works

```
config/news-sources.ts     32 feeds that answer, 10 outlets that need search
      ↓  lib/feed/rss.ts   headline, link, date, the feed's own summary
lib/feed/collect.ts        stores the item, then asks the matcher who it is about
      ↓  lib/feed/matchMp.ts
feed_items + feed_item_mps live as soon as they are stored
      ↓  /api/feed/[slug]  cached five minutes at the edge
MemberFeed on the profile
```

Nothing is deleted, ever. `hidden` and `removed` are statuses on the join row,
so an article can be wrong on one member's page and right on another's, and a
removed match is never made again.

Only the headline, a short summary and a thumbnail are stored. The article body
is never fetched, and every item links out to the source.

## The collectors

| collector | what it reads | how often | needs |
|---|---|---|---|
| `rss` | 32 news feeds | every 30 min (GitHub Actions), daily backstop (Vercel) | nothing |
| `press` | parliament notices already in `data/activity.json` | daily | nothing |
| `youtube` | YouTube Data API v3, four members an hour | hourly | `YOUTUBE_API_KEY` |
| `search` | the ten outlets with no feed, four members an hour | hourly | `FEED_SEARCH_KEY` (+ `FEED_SEARCH_PROVIDER`, `FEED_SEARCH_CX` for Google) |
| `learn` | the editors' decisions | weekly | nothing |

From the terminal:

```bash
npm run feed:rss                        # every feed, once
npm run feed:rss -- --dry-run           # fetch and match, write nothing
npm run feed:rss -- --collector=press   # parliament notices
npm run feed:seed                       # name variants and feed start dates
```

### Quota

Both paid collectors are paced the same way, and for the same reason: a full
pass over 348 members in one go costs more than a day's allowance.

| | allowance | cost each | so a run takes | a full pass |
|---|---|---|---|---|
| YouTube `search.list` | 10,000 units a day | 100 units | 4 members an hour (9,600 a day) | ~3.5 days |
| Google Programmable Search | 100 queries a day free | 1 query | 4 members an hour (96 a day) | ~3.5 days |

Members holding a government or House post sit in the cycle twice, so they come
round twice as often. Raise `YOUTUBE_MEMBERS_PER_RUN` or `FEED_SEARCH_PER_RUN`
when an allowance is raised. What a run spent is written to
`feed_runs.quota_used` and shown on `/admin/feed/runs`.

Bing News Search is still in `searchProvider.ts` but Microsoft retired the Bing
Search APIs, so Google Programmable Search or SerpAPI are the live choices.

## The matcher

`lib/feed/matchMp.ts`. A name counts only when every word of a stored variant
appears together, in order, with at least two words in it, so a shared surname
is never a mention.

| signal | points |
|---|---|
| name variant in the headline | 60 |
| name variant in the summary only | 35 |
| the member's own seat | 25 |
| the member's own district | 10 |
| the member's own party | 5 |
| an office title the member holds | 30 |
| a namesake's trade or place | −30 |

60 and over attaches. 40 to 59 attaches and waits in the review queue. Below 40
is dropped. An item that names one member is not given to another who only
picked up context points, and when two members share a spelling the higher
score wins, or a tie goes to a reviewer.

Two rules came out of testing against the real corpus:

- a name word immediately in front of a match means a longer name, so
  "মনোয়ার হোসেন চৌধুরী" is not "আলতাফ হোসেন চৌধুরী";
- the two sitting members called শফিকুর রহমান are told apart by seat, party or
  office, and otherwise handed to a person.

### Name variants

`mp_name_variants`, seeded by `npm run feed:seed` from the member list: the
official name, the English name, a শফিকুর/শফিকুল swap, and the short form the
press uses ("মঈন খান") **only when it belongs to exactly one member**. Editors
add more on the member's admin page; the weekly learning job adds what it sees
them attach by hand twice.

## Where a feed starts

`mp_feed_settings.feed_start_at`, defaulting to `nomination_filed_at`. Nobody
has given us each member's filing date yet, so every row carries the
election-wide fallback in `app_settings.nomination_window_start` and is flagged
`needs_confirming`. The date is only a floor for the month list: **an item older
than it still shows**, so a wrong fallback can never hide anything.

## The admin

- `/admin/feed` — every attachment, filtered by member, outlet, type, status,
  date or low-confidence only. Hide, remove, pin with an expiry, give to another
  member, add one by hand from a link, or hide a whole outlet or date range.
- `/admin/feed/review` — the queue, with the score broken into named signals.
- `/admin/feed/runs` — the last 50 runs, what each outlet gave, a red banner
  after three failures in a row, and a warning naming feeds that went quiet.
- `/admin/members/[id]` — নামের ভিন্ন রূপ, and a link to that member's feed.

Items are live as they are collected. The admin corrects; it does not approve.

## Safeguards

- A run that finds nothing where the last found more than fifty is **aborted
  without writing**: a source that changes its page must not look like a quiet
  news day.
- A member takes at most **50 new items a day** from a collector; the rest go to
  review, so one name collision cannot flood a page.
- An attachment an editor has ruled on is never touched by a later run.
- Items carry a content hash, so an edited headline updates the row it already
  has instead of adding another.
- One story syndicated across outlets keeps one row and lists the rest in
  `also_in`.
