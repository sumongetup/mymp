# Blocked: only the owner can do these

One line each: where, what is needed.

- **Credentials**: `RESEND_API_KEY` (and `MAIL_FROM`, which needs mymp.bd verified in Resend) in Vercel, so the posts sync can email mymp.bangladesh@gmail.com when something changes or a source breaks. Without it the sync still runs; it just cannot tell anyone.
- **Chattogram-4 (seat 281)**: parliament.gov.bd lists no member for it and no result for it was published by TBS or Wikipedia. The seat page now exists and says the source lists no member. Whether the election there was postponed, is under dispute, or the member is simply not yet entered is not stated in any source I have; confirm and, if there is a member, tell me the name and source so the sync can be checked.
- **Old mirror files**: the public bucket still holds `mirror/parliament/2026-09-10.json` and `2026-09-11.json`, which contain members' home addresses from before the privacy pass. Say the word and the address fields come out of them.

Done since this list was written:

- `supabase/migrations/003_posts.sql` run 2026-09-12. First sync added 91 posts (63 ministers/advisers who are MPs, 17 who are not, 11 House offices); 13 names sit in the review queue at `/admin/sync`.
- `MYMP_CRON_SECRET` set in GitHub Actions (and `CRON_SECRET` rotated in Vercel, because Vercel would not show the old value). The six-hourly workflow runs green.
