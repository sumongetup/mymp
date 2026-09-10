# Fixtures

Local-development stand-ins for the database. Rules, enforced by `packages/db/src/fixtures.ts` and its tests:

- File names start with `TEST_`; any `name`/`title` string inside starts with `TEST_`.
- The loader throws when `NODE_ENV=production`, and `fixturesEnabled()` is false there regardless of `FIXTURES`.
- Use them by setting `FIXTURES=1` in `.env` while developing without a database. The web app then serves this data with the same code paths it uses for Postgres.

Never put a real MP, constituency, article or asset here. Real data enters only through the seed and the workers, from the sources documented in `docs/SOURCES.md`.
