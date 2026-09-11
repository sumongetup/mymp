-- Government and parliamentary posts: who is minister, state minister,
-- deputy minister or adviser, and who holds the House offices. Kept current
-- by the posts sync (src/lib/posts/sync.ts) from cabinet.gov.bd and
-- parliament.gov.bd; see config/sync-sources.ts.
--
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Rules the sync keeps:
--   * it never deletes a row; a post that ends gets to_date and auto_closed;
--   * it never touches a row an editor entered by hand (auto_synced = false);
--   * every row it writes carries the source URL and a hash of the list it read.

create table if not exists public.posts (
  id                  bigserial primary key,
  type                text not null check (type in ('government', 'parliament')),
  -- প্রধানমন্ত্রী, মন্ত্রী, প্রতিমন্ত্রী, উপমন্ত্রী, উপদেষ্টা, স্পিকার, ডেপুটি স্পিকার, সংসদ নেতা, বিরোধীদলীয় নেতা, চিফ হুইপ, হুইপ
  title               text not null,
  -- For an adviser: the rank the list gives, e.g. মন্ত্রীর পদমর্যাদা.
  rank_note           text,
  -- The ministry, division or responsibility; null for a House office.
  ministry_bn         text,
  -- The MP's parliament id (members.json "id"); null for someone who is not an MP.
  member_id           text,
  is_mp               boolean not null default true,
  -- The name exactly as the source writes it.
  person_name_bn      text not null,
  person_name_en      text,
  -- The source's photo, shown for people who have no MP profile.
  photo_url           text,
  from_date           date not null,
  -- Null while the post is held.
  to_date             date,
  -- The source's নিয়োগের তারিখ, when it gives one.
  appointed_on        date,
  -- Position in the source list, so pages can keep the official order.
  source_order        integer,
  -- Which configured source the row came from (config/sync-sources.ts).
  source_key          text,
  source_url          text,
  -- sha256 of the list the row was read from, and of the one that no longer had it.
  source_hash         text,
  closed_source_hash  text,
  auto_synced         boolean not null default false,
  auto_closed         boolean not null default false,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists posts_open_idx on public.posts (type, source_key) where to_date is null;
create index if not exists posts_member_idx on public.posts (member_id);

-- One row per run of the posts sync.
create table if not exists public.post_sync_runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null default 'running' check (status in ('running', 'ok', 'failed')),
  -- cron (Vercel), github (Actions), admin, cli
  trigger          text,
  -- { source_key: sha256 of the list read }
  source_hashes    jsonb,
  -- { source_key: rows parsed }; the next run compares against these
  source_counts    jsonb,
  parsed           integer,
  added            integer not null default 0,
  closed           integer not null default 0,
  unchanged        integer not null default 0,
  unmatched        integer not null default 0,
  -- [{ key, name_bn, title, ministry_bn, source_key, stored_as_non_mp, candidates }]
  unmatched_names  jsonb,
  -- [{ kind: added | closed | identified, title, ministry_bn, name_bn, member_id }]
  changes          jsonb,
  -- [{ source, message }]
  errors           jsonb
);
create index if not exists post_sync_runs_started_idx on public.post_sync_runs (started_at desc);

-- Names an editor has resolved in /admin/sync, so the next run knows them.
-- member_id null means "not an MP": the person is kept without a profile link.
create table if not exists public.post_aliases (
  name_key    text primary key,
  name_bn     text not null,
  member_id   text,
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table public.posts           enable row level security;
alter table public.post_sync_runs  enable row level security;
alter table public.post_aliases    enable row level security;
revoke all on public.posts, public.post_sync_runs, public.post_aliases from anon, authenticated;
grant all on public.posts, public.post_sync_runs, public.post_aliases to service_role;
grant usage, select on all sequences in schema public to service_role;
