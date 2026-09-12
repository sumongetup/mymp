# Why only তারেক রহমান has news, 2026-09-12

Measured against the সংসদ engine's database (the thing that currently collects
news) and mymp's `news_posts`, not from reading the code.

## The numbers

| | |
|---|---|
| Articles the engine has collected, all time | **5,873** |
| Of which linked to any member | **259 (4.4%)** |
| Members with at least one link | **40 of 349 (11%)** |
| Links belonging to তারেক রহমান | **103 of 259 (40%)** |
| Links that reached the site (`auto`, published) | 98; the other 161 sit as drafts and are invisible |
| Published items on the site now | 100, across **15** members, 52 of them তারেক রহমান |
| Videos collected, all time | **0** |
| Sources configured | 80 |
| Sources that have ever produced one article | **16** |
| Articles published on 2026-09-10 / 09-11 / 09-12 | 812 / 3 / **0** |

## What is actually wrong

**1. Collection, not matching, is the main failure.** Sixty-four of the eighty
configured outlets have never yielded a single article: প্রথম আলো has 26 in
total, যুগান্তর, কালের কণ্ঠ, বাংলাদেশ প্রতিদিন, মানবজমিন, ইনকিলাব, আমার দেশ,
সমকালের বাইরে বেশিরভাগ টেলিভিশন — nothing at all. Six outlets stop at exactly
100 items, the page size, so they were read once and never paged.

**2. Collection has stopped.** 812 articles came in on 10 September, 3 on the
11th, none on the 12th. Whatever schedule drives the engine is not running.

**3. Matching is better than the brief assumes — where an article exists.**
Searching the 5,873 collected headlines:

| name in a headline | articles | linked |
|---|---|---|
| রুমিন ফারহানা | 15 | 14 |
| সালাহউদ্দিন আহমেদ | 2 | 1 |
| রিজভী | 13 | 0 (correct: he is not an MP) |
| মির্জা আব্বাস, আমির খসরু, ইশরাক, গয়েশ্বর, নজরুল ইসলাম খান, খন্দকার মোশাররফ, ফখরুল | **0** | 0 |

Recall where the article exists is about 93%. The names that show nothing show
nothing because **the articles were never collected**, not because the matcher
missed them. The matcher's own weakness is different and real: it gives +0.15
to any word ending in মন্ত্রী, which put an English opinion piece about
polythene on the Prime Minister's page, and it can attach on a name found only
in the summary.

**4. Six of ten matches never appear.** 161 of 259 links are `pending`, waiting
for an editor who has no reason to know they are there. The site shows only
`published`, so a correct match sits invisible.

**5. There is no video pipeline at all.** The `videos` table has never had a row.

## What this means for the build

- The matcher work is worth doing (traps 3 and 4 above are real), but it is not
  what empties the feeds. **Collection breadth and schedule come first.**
- mymp now owns its own collection (`feed_items`), rather than waiting for the
  engine: one place to see what ran, what it found, and what failed.
- Publishing immediately, with the admin correcting rather than approving,
  removes failure 4 entirely.
- The history problem stands on its own: the oldest article anywhere is
  2026-09-04. A feed that starts at nomination filing needs the search
  collector to reach back, and even then outlets rarely expose old items over
  RSS. The month rows will be honestly empty for months nobody collected.
