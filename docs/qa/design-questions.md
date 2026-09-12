# Design questions

Things a fix would change the look or the cost of, with my recommendation. Nothing here was changed.

## 1. Member photos and party logos are served larger than drawn

Every list draws member photos at 44 to 64 px from the engine's 300 px files, and party logos at 18 px from 256 px WebP files. Lighthouse counts about 50 KB of avoidable download per page (`docs/qa/screenshots/mp-360.jpg` shows 60 such rows). Options: (a) have the সংসদ engine also publish a 96 px thumbnail of each photo and switch lists to it; (b) route photos through Next's image optimisation, which the Hobby plan meters (1,000 source images a month) and which would break the "no function on the read path" rule.

**Recommendation:** (a). One extra job in the engine's photo step; the site then reads `photoThumbUrl` where it draws small circles.

## 2. Party share card text outside the centre square

`/api/og/party/[slug]` puts only the logo in the centre 630 px square on purpose, since WhatsApp crops to that square; the party name on the left and the seat count on the right are cut off in that crop but show in full on Facebook and X (see the card in `docs/qa/screenshots/` after a deploy, or `/api/og/party/bnp`). The MP card keeps photo and name inside the square.

**Recommendation:** keep it. Moving the text inside the square would leave a 1200 × 630 image that is mostly empty on the wide previews.

## 3. Muted captions are now darker

`--color-muted` moved from #6c766f (4.3:1 on the page background, under the 4.5:1 minimum) to #5e6863 (5.3:1). Captions, breadcrumbs and "তথ্যসূত্র" lines are a little heavier than the earlier design. If that reads too dark, #616b66 (5.0:1) is the lightest value that still passes everywhere.

## 4. The "সর্বশেষ" ticker

The Lighthouse `target-size` audit flags the ticker pill because headline links that have scrolled out of view are still laid out beside it. A ticker without a moving track (a rotating single headline, or a static "latest" strip) would satisfy the audit and cost less main-thread time on phones.

**Recommendation:** leave the ticker; it is the owner's chosen design and the flagged overlap cannot be tapped.
