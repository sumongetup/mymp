# MYMP VPS deployment and Supabase Cron

This is the production runbook for the self-hosted VPS deployment.

## Production architecture

```text
GitHub Actions
  ├─ deploy.yml
  │    └─ build + sync data/*.json + Docker image + SSH deploy
  ├─ sangsad-worker.yml
  │    └─ parliament refresh → Supabase Storage mirror → dispatch deploy.yml
  ├─ sangsad-news.yml
  │    └─ news matching → MYMP public tables → dispatch deploy.yml
  └─ feed-loop.yml / sync-posts.yml
       └─ authenticated HTTP calls to MYMP cron routes

Supabase Cron
  └─ authenticated HTTP calls to MYMP cron routes

VPS
  ├─ /home/devuser/opt/apps/mymp/.env
  ├─ Docker container: mymp
  └─ Caddy/Nginx reverse proxy → 127.0.0.1:3000
```

The public parliamentary pages do not query PostgreSQL on each request. A deployment runs `scripts/sync.mjs`, writes the generated `data/*.json` snapshot, runs `next build`, and starts a container containing that snapshot.

## One-time VPS prerequisites

On the VPS, install and configure:

- Docker Engine and Docker Compose plugin
- Caddy or Nginx
- A shared external Docker network named `caddy_net`
- DNS for `mymp.bd` pointing to the VPS
- A dedicated deploy user named `devuser`
- An SSH public key for the GitHub Actions deploy workflow

The application project root is fixed at:

```text
/home/devuser/opt/apps/mymp
```

The repository workflow writes these files there:

```text
/home/devuser/opt/apps/mymp/docker-compose.yml
/home/devuser/opt/apps/mymp/.env
```

The workflow transfers the Docker image over SSH. It does not clone the repository on the VPS.

## GitHub Actions configuration

Create the `prod` environment in the repository and add these secrets.

### Required deploy secrets

```text
DEPLOY_HOST
DEPLOY_SSH_KEY
DEPLOY_ENV_FILE_B64
```

`DEPLOY_ENV_FILE_B64` is the base64 encoding of the complete production runtime environment file. It must include all required application variables, including:

```env
NEXT_PUBLIC_SITE_URL=https://mymp.bd
NEXT_PUBLIC_SUPABASE_URL=https://supabase.mymp.bd
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SANGSAD_SUPABASE_URL=https://supabase.mymp.bd
DATABASE_URL=postgresql://...
DATABASE_SSL=disable
DATABASE_SCHEMA=sangsad
CRON_SECRET=...
```

Keep the service-role key only in this runtime file. Never pass it as a Docker build argument.

### All GitHub Actions secrets

Configure these repository/environment secrets:

```text
DEPLOY_HOST
DEPLOY_SSH_KEY
DEPLOY_ENV_FILE_B64
MYMP_DEPLOY_TOKEN
MYMP_CRON_SECRET
SANGSAD_DATABASE_URL
SANGSAD_SUPABASE_URL
SANGSAD_SUPABASE_SERVICE_ROLE_KEY
MYMP_SUPABASE_URL
MYMP_SUPABASE_SERVICE_ROLE_KEY
```

Use the following ownership:

- `DEPLOY_HOST`, `DEPLOY_SSH_KEY`: GitHub-to-VPS Docker deployment.
- `DEPLOY_ENV_FILE_B64`: complete MYMP VPS runtime `.env`, including `DATABASE_URL`, `DATABASE_SSL=disable`, `DATABASE_SCHEMA=sangsad`, Supabase keys, and `CRON_SECRET`.
- `MYMP_DEPLOY_TOKEN`: fine-grained GitHub token with repository Contents read/write permission; dispatches `sangsad-data-updated`.
- `MYMP_CRON_SECRET`: same value as the runtime `CRON_SECRET`; used by GitHub HTTP cron callers.
- `SANGSAD_DATABASE_URL`: shared PostgreSQL URL used by Sangsad GitHub jobs.
- `SANGSAD_SUPABASE_URL`: shared Supabase URL used for the public mirror bucket.
- `SANGSAD_SUPABASE_SERVICE_ROLE_KEY`: service key used by Sangsad worker/mirror jobs.
- `MYMP_SUPABASE_URL`, `MYMP_SUPABASE_SERVICE_ROLE_KEY`: MYMP database delivery credentials used by Sangsad news/enrichment jobs.

`DATABASE_SSL=disable` and `DATABASE_SCHEMA=sangsad` are non-secret workflow settings already defined in `sangsad-worker.yml` and `sangsad-news.yml`.

### Cron caller secret

`MYMP_CRON_SECRET` must equal `CRON_SECRET` in the VPS runtime environment. Supabase Cron uses `CRON_SECRET` directly; GitHub workflows use `MYMP_CRON_SECRET`.

## Deploying the application

A push to `main` or `prod`, a manual dispatch, or a `sangsad-data-updated` event runs:

```bash
npm ci
npm run build
npm run typecheck
docker build ...
ssh ... /home/devuser/opt/apps/mymp
docker compose up -d --force-recreate web
```

`npm run build` is the important step:

```text
scripts/sync.mjs --soft
  → data/*.json
  → public/search-index.json
  → scripts/build-name-idf.ts
  → next build
```

The container image uses `npm run build:local` because the snapshot has already been generated in the workflow. A failed build stops before the VPS container is replaced.

## Supabase Cron setup

Open the self-hosted Supabase dashboard at:

```text
https://supabase.mymp.bd/project/default/integrations/cron/jobs
```

Create HTTP jobs that call the public MYMP origin. Every request must include:

```http
Authorization: Bearer <CRON_SECRET>
```

Use the Supabase Cron UI’s HTTP-request/job feature if available. If the UI requires SQL, enable the `pg_cron` and `pg_net` extensions and use the equivalent `cron.schedule`/`net.http_get` configuration supplied by your self-hosted Supabase version.

Do not put the service-role key in a Cron job. Only `CRON_SECRET` is required for these routes.

### Exact production scheduler ownership

Cron expressions are UTC. Dhaka is UTC+6. Follow this table exactly; do not create jobs marked **Do not create**.

| Job | Owner | Schedule | URL/action |
|---|---|---:|---|
| Government posts sync | **GitHub Actions** | `40 */6 * * *` | `/api/cron/sync-posts?trigger=github` |
| Parliament reachability probe | **Supabase Cron** | `0 */6 * * *` | `/api/cron/probe` |
| RSS collector | **GitHub Actions** | every 15 minutes via `feed-loop.yml` | `/api/cron/feed?collector=rss&trigger=github` |
| Sitemap collector | **GitHub Actions** | every 15 minutes via `feed-loop.yml` | `/api/cron/feed?collector=sitemap&trigger=github` |
| YouTube collector | **GitHub Actions** | hourly within `feed-loop.yml` | `/api/cron/feed?collector=youtube&trigger=github` |
| Thumbnail fill | **GitHub Actions** | after RSS runs within `feed-loop.yml` | `/api/cron/feed?collector=thumbs&trigger=github` |
| Press collector | **Do not create** | not part of the selected feed loop | — |
| Learning/feedback | **Do not create** | not part of the selected feed loop | — |
| Republish | **Do not create** | VPS deployment is GitHub-dispatch based | — |

### What to create in Supabase Cron

Create exactly one HTTP job:

1. **Parliament probe**
   ```text
   Schedule: 0 */6 * * *
   URL: https://mymp.bd/api/cron/probe
   Header: Authorization: Bearer <CRON_SECRET>
   ```

### What not to create in Supabase Cron

Do not create a posts-sync, RSS, sitemap, YouTube, thumbnail, press, learning, or republish job.

- `sync-posts.yml` owns government posts sync.
- `feed-loop.yml` owns RSS, sitemap, YouTube, and thumbnail collection.
- Sangsad/GitHub Actions owns rebuild dispatches.
- `/api/cron/republish` is obsolete for VPS deployment.

Keep these GitHub workflows enabled:

```text
.github/workflows/feed-loop.yml
.github/workflows/sync-posts.yml
.github/workflows/sangsad-worker.yml
.github/workflows/sangsad-news.yml
```

`sync-posts.yml` is the sole production scheduler for posts sync. Do not create a Supabase Cron posts job, or the posts sync will run twice.

### Republish caveat for VPS

The existing `/api/cron/republish` route still calls `VERCEL_DEPLOY_HOOK_URL`. It cannot deploy a Docker image on the VPS by itself. For VPS production, use the Sangsad repository-dispatch workflow for parliamentary rebuilds, or update this route to call a separately secured GitHub dispatch endpoint.

Until that route is changed, do not rely on `/api/cron/republish` for VPS deployment. It should be disabled in Supabase Cron, or left only as a health-visible no-op that is expected to return an error.

## Sangsad refresh flow

The normal parliamentary refresh is:

```text
sangsad-worker.yml nightly schedule
  → pnpm worker parliament
  → pnpm worker parliament:photos
  → pnpm worker parliament:report
  → uploads mirror/parliament/latest.json
  → repository_dispatch(sangsad-data-updated, ref=prod)
  → deploy.yml
  → npm run build
  → Docker deploy to VPS
```

The first setup on the shared database is:

```bash
cd /home/pixelsbd/Node-app/mymp/sangsad
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm worker health
```

For the current self-hosted PostgreSQL endpoint, use:

```env
DATABASE_SSL=disable
DATABASE_SCHEMA=sangsad
```

MYMP tables remain in `public`; Sangsad tables are in `sangsad`. The worker publishes the `mirror` Storage bucket, which is separate from PostgreSQL schemas.

## MYMP database setup

Run the root migrations once against the same shared PostgreSQL database:

```bash
cd /home/pixelsbd/Node-app/mymp
npm run db:migrate
```

This creates MYMP’s `public` tables:

```text
admin_users, overrides, hidden_entities, news_posts, corrections,
audit_log, sync_runs, election_results, posts, post_sync_runs,
post_aliases, feed_items, feed_item_mps, mp_name_variants,
mp_feed_settings, app_settings, feed_runs, feed_match_feedback
```

The Sangsad tables are not in this list and must not be recreated in `public`.

## Cron endpoint security

All cron routes require:

```http
Authorization: Bearer <CRON_SECRET>
```

Test from an authorized machine without exposing the secret in shell history where possible:

```bash
curl -fsS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://mymp.bd/api/cron/sync-posts?trigger=manual"
```

Expected response is JSON with `ok: true` and a sync status. A `401` means the bearer value does not match the running container’s `CRON_SECRET`.

## Health checks

### VPS container

```bash
ssh devuser@<DEPLOY_HOST> \
  'cd /home/devuser/opt/apps/mymp && docker compose ps && docker compose logs --tail 100 web'
```

The container health check requests `/` on `127.0.0.1:3000`.

### Supabase mirror

```bash
curl -fsS \
  https://supabase.mymp.bd/storage/v1/object/public/mirror/parliament/latest.json
```

Confirm the JSON has:

```text
version = 1
fetchedAt within 36 hours
responses[/api/members?parliamentNo=13] contains at least 300 records
responses[/api/committees] exists
```

### Public build freshness

After a deployment, inspect the generated metadata inside the build source or deployment artifact:

```bash
cat data/meta.json | head -40
```

The important fields are:

```text
syncedAt
builtAt
via: engine or live
source
counts
```

## Cutover checklist

1. Apply both root MYMP and Sangsad migrations.
2. Run `pnpm db:seed` and `pnpm worker health`.
3. Confirm `sangsad` has the normalized tables and `public` has MYMP tables.
4. Configure the GitHub `prod` environment secrets.
5. Deploy the `prod` branch manually once.
6. Confirm `mymp.bd` serves through the VPS reverse proxy.
7. Run one Sangsad parliamentary refresh and confirm `mirror/parliament/latest.json` changes.
8. Confirm the `sangsad-data-updated` event starts `deploy.yml`.
9. Create Supabase Cron jobs for `sync-posts` and `probe`.
10. Decide whether GitHub `feed-loop.yml` remains the feed scheduler; do not schedule duplicate feed collectors.
11. Disable or remove Vercel Cron after VPS cutover.
12. Remove obsolete Vercel deploy-hook variables from production secrets after the VPS flow is confirmed.

## Rollback

A bad build fails before Docker Compose recreates the VPS container. For an already deployed bad image:

```bash
ssh devuser@<DEPLOY_HOST> \
  'docker image ls mymp && cd /home/devuser/opt/apps/mymp && docker compose up -d web'
```

Keep the previous image tag or digest if image rollback is required. Do not delete the previous image until the new container has passed its health check and the public site has been inspected.
