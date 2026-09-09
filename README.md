# আমার এমপি · MY MP

Open reference for the members of the Bangladesh parliament: all 349 sitting
members, their seats, parties and committees, in Bengali with English names
alongside.

## How the data gets here

Everything comes from the parliament's own open JSON API and is committed as a
snapshot under `data/`. No database is queried when a visitor loads a page.

```bash
npm run sync     # pull parliament.gov.bd into data/ and public/search-index.json
npm run dev      # local site
npm run build    # prerenders every page
```

`npm run sync` writes `data/members.json`, `committees.json`, `parties.json`,
`seats.json` and `meta.json`, plus the search index. Re-run it whenever the
parliament publishes changes, then rebuild.

**Do not run `npm run build` while `npm run dev` is running.** They share
`.next` and the dev server breaks. Stop dev first.

## Rules this project holds to

- **Nothing invented.** If a source has no value, the page says so instead of
  showing a zero or a guess. Vote counts, turnout, attendance and oath dates are
  not published anywhere we can reach, so they do not appear.
- **Two different seat counts, never mixed up.** The constituency result is BNP
  211 / Jamaat 68. The seated parliament is BNP 247 / Jamaat 77, because the 50
  reserved women's seats are allocated after the general result. Any chart says
  which one it is showing.
- **Committee rosters are checked before they are shown.** The API returns a
  record per committee per parliament, so the same committee appears twice, and
  35 of the 66 still list members of the previous parliament. Those are shown as
  awaiting an update rather than presenting former members as current.
- **No personal phone numbers.** Every sitting member has one in the API. The
  sync stores only whether one exists, pending a decision on publishing them.
- **Public pages read no session.** Nothing under the public routes may call
  auth, or the whole site stops being cacheable.

## Layout

```
data/                 committed snapshot, refreshed by npm run sync
scripts/sync.mjs      the sync
src/lib/data.ts       typed access + derived statistics
src/lib/search.ts     bilingual search: type Bengali or English, same results
src/components/       shared UI
src/app/              routes
```

Routes: `/` `/mp` `/mp/[slug]` `/ason/[slug]` `/dol` `/dol/[slug]`
`/committee` `/committee/[slug]` `/parisonkhan` `/nirbachon` `/songbad`

## Not built yet

Admin panel, the news pipeline, the contact form, and the Supabase layer that
will hold admin edits as overrides the nightly sync must not clobber.
