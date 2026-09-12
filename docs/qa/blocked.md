# Blocked: only the owner can do these

One line each: where, what is needed.

- **Production database**: run `supabase/migrations/003_posts.sql` in Supabase → SQL Editor. Until then the `posts`, `post_sync_runs` and `post_aliases` tables do not exist, `/api/cron/sync-posts` fails cleanly, `/admin/sync` shows the "table missing" notice, and `/ministers` and the MP badges come from the committed `data/posts.json` snapshot of 2026-09-12.
- **Credentials**: `RESEND_API_KEY` (and optionally `MAIL_FROM`) in Vercel, so the posts sync can email mymp.bangladesh@gmail.com; `MYMP_CRON_SECRET` in GitHub → Settings → Secrets → Actions (same value as Vercel's `CRON_SECRET`), so the six-hourly workflow can call the site.
- **Chattogram-4 (seat 281)**: parliament.gov.bd lists no member for it and no result for it was published by TBS or Wikipedia. The seat page now exists and says the source lists no member. Whether the election there was postponed, is under dispute, or the member is simply not yet entered is not stated in any source I have; confirm and, if there is a member, tell me the name and source so the sync can be checked.
