# Lighthouse (mobile, throttled, local build)

Run 2026-09-12 with Lighthouse 12.8 against `next start` on this machine, mobile emulation and default throttling. Before = commit 07e5260; after = the Phase 6 changes (scroll-driven card animations only from 768 px up, darker caption colour, focus rings on search boxes, a taller ticker pill).

| Page | Perf before → after | A11y | Best practices | SEO | LCP | CLS | TBT before → after | Style and layout work |
|---|---|---|---|---|---|---|---|---|
| / | 77 → **86** | 96 → 96 | 100 | 100 | 4.1 s → 4.0 s | 0 | 250 ms → **100 ms** | 1399 ms → 683 ms |
| /mp/tarique-rahman | 84 → **83** | 93 → 96 | 100 | 100 | 2.9 s → 4.3 s | 0 | 260 ms → **90 ms** | 1566 ms → 1247 ms |
| /jela/dhaka | 93 → **92** | 92 → 96 | 100 | 100 | 2.4 s → 3.3 s | 0 | 150 ms → **30 ms** | 1059 ms → 693 ms |
| /mp | 91 → **90** | 92 → 96 | 100 | 100 | 2.4 s → 3.3 s | 0 | 200 ms → **90 ms** | 1161 ms → 609 ms |

What holds the scores back, and what was decided:

- **LCP 3 to 4 s on every page** is the Bengali font: Noto Sans Bengali (variable, Bengali + Latin subsets) is 108 KB + 26 KB of woff2, preloaded with , and on a throttled phone the text paints when it lands. The site's only font; no cheaper alternative without a second face. Left as is.
- **Party logos (256 px WebP) and member photos (300 px) are served larger than they are drawn** (Lighthouse , about 50 KB a page). Photos come straight from the engine's Supabase bucket, so serving smaller sizes needs an image pipeline or Next image optimisation, which the Hobby plan meters. See design-questions.md.
- ** on the সর্বশেষ ticker pill** is a false positive: the audit counts the headline links that have already scrolled out of the ticker's clipped viewport as neighbours of the pill. Nothing a reader can tap overlaps it.
-  26 KB is the shared client chunk;  13 KB is Next's own polyfills. Left as is.
- CLS is 0 on all four pages; every image has width and height or a fixed box.
