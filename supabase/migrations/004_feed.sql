-- The per-MP news and video feed.
--
-- What a member's profile shows under "সংবাদ ও ভিডিও": headlines, YouTube
-- videos and parliament notices that mention them, from the day they filed
-- nomination papers to today. Items go live as they are collected; the admin's
-- role is corrective (hide, remove, pin, attach by hand), never a gate.
--
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Rules the collectors keep:
--   * nothing is ever deleted; "removed" is a status, so a rejected item is
--     not attached again on the next run;
--   * only the headline, a short summary and a thumbnail are stored, never the
--     article body, and every item links out to the source;
--   * status and pinning live on the join row, because one article can be
--     right on one member's page and wrong on another's.

-- ---------------------------------------------------------------- items

create table if not exists public.feed_items (
  id                bigserial primary key,
  type              text not null check (type in ('news', 'video', 'press', 'social')),
  title             text not null,
  url               text not null,
  -- The address stripped of tracking and AMP, used for deduplication.
  canonical_url     text not null,
  summary           text,
  outlet_name       text,
  -- The source's key in config/news-sources.ts, or the YouTube channel.
  outlet_id         text,
  channel_id        text,
  thumbnail_url     text,
  duration_seconds  integer,
  -- The source's own publication time.
  published_at      timestamptz not null,
  fetched_at        timestamptz not null default now(),
  source            text not null check (source in ('rss', 'search', 'youtube', 'engine', 'parliament', 'manual')),
  -- sha256 of title + summary: an edited headline updates the row instead of adding one.
  content_hash      text,
  -- [{ outlet_name, url }] for the same story carried elsewhere.
  also_in           jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists feed_items_canonical_idx on public.feed_items (canonical_url);
create index if not exists feed_items_published_idx on public.feed_items (published_at desc);
create index if not exists feed_items_type_idx on public.feed_items (type, published_at desc);

-- ---------------------------------------------------------------- attachment

create table if not exists public.feed_item_mps (
  feed_item_id   bigint not null references public.feed_items(id) on delete cascade,
  -- The member's parliament id, as data/members.json writes it.
  mp_id          text not null,
  score          integer not null default 0,
  low_confidence boolean not null default false,
  -- Which signals fired, so a reviewer can see why: [{ signal, points, detail }]
  signals        jsonb not null default '[]'::jsonb,
  status         text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  pinned         boolean not null default false,
  pinned_until   timestamptz,
  attached_by    text not null default 'system',
  attached_at    timestamptz not null default now(),
  hidden_by      text,
  hidden_at      timestamptz,
  hide_reason    text,
  primary key (feed_item_id, mp_id)
);
create index if not exists feed_item_mps_mp_idx on public.feed_item_mps (mp_id, status);
create index if not exists feed_item_mps_review_idx on public.feed_item_mps (low_confidence, attached_at desc) where status = 'visible';

-- ---------------------------------------------------------------- names

create table if not exists public.mp_name_variants (
  id         bigserial primary key,
  mp_id      text not null,
  -- The normalised form the matcher looks for.
  variant    text not null,
  -- How it got here: seeded from the official name, typed by an editor, or
  -- learned from confirmed matches.
  source     text not null default 'official' check (source in ('official', 'manual', 'learned')),
  -- 1.0 for the full official name; less for a shortened or learned form.
  weight     numeric not null default 1.0,
  created_by text,
  created_at timestamptz not null default now()
);
create unique index if not exists mp_name_variants_unique on public.mp_name_variants (mp_id, variant);
create index if not exists mp_name_variants_variant_idx on public.mp_name_variants (variant);

-- ---------------------------------------------------------------- per-MP feed settings
--
-- The site's member records come from parliament.gov.bd and are rebuilt on
-- every publish, so anything an editor sets about a member lives in its own
-- table. These three belong to the feed.

create table if not exists public.mp_feed_settings (
  mp_id               text primary key,
  -- The day the member filed nomination papers with the Election Commission.
  nomination_filed_at date,
  -- Where the feed starts. Defaults to nomination_filed_at.
  feed_start_at       date,
  ec_candidate_id     text,
  -- True while nomination_filed_at is the election-wide fallback rather than
  -- this member's own date: the admin lists these for correction.
  needs_confirming    boolean not null default false,
  updated_by          text,
  updated_at          timestamptz not null default now()
);

-- Site-wide settings the feed needs, e.g. the nomination filing window.
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  note       text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- runs and feedback

create table if not exists public.feed_runs (
  id             bigserial primary key,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  collector      text not null,
  status         text not null default 'running' check (status in ('running', 'ok', 'failed', 'aborted')),
  trigger        text,
  items_found    integer not null default 0,
  items_new      integer not null default 0,
  items_attached integer not null default 0,
  unmatched      integer not null default 0,
  low_confidence integer not null default 0,
  quota_used     integer not null default 0,
  -- [{ source, message }]
  errors         jsonb not null default '[]'::jsonb,
  -- Per-source counts, so a source that goes quiet is visible.
  detail         jsonb
);
create index if not exists feed_runs_started_idx on public.feed_runs (collector, started_at desc);

create table if not exists public.feed_match_feedback (
  id           bigserial primary key,
  feed_item_id bigint not null references public.feed_items(id) on delete cascade,
  mp_id        text not null,
  action       text not null check (action in ('confirm', 'reject', 'manual_attach')),
  user_id      text,
  created_at   timestamptz not null default now()
);
create index if not exists feed_match_feedback_created_idx on public.feed_match_feedback (created_at desc);

-- ---------------------------------------------------------------- access
-- Same rule as every other table here: RLS on, no policies, service role only.
-- The public feed is read through the site's own route handler, never directly by a
-- browser holding the anon key.

alter table public.feed_items          enable row level security;
alter table public.feed_item_mps       enable row level security;
alter table public.mp_name_variants    enable row level security;
alter table public.mp_feed_settings    enable row level security;
alter table public.app_settings        enable row level security;
alter table public.feed_runs           enable row level security;
alter table public.feed_match_feedback enable row level security;

revoke all on public.feed_items, public.feed_item_mps, public.mp_name_variants,
  public.mp_feed_settings, public.app_settings, public.feed_runs, public.feed_match_feedback
  from anon, authenticated;

grant all on public.feed_items, public.feed_item_mps, public.mp_name_variants,
  public.mp_feed_settings, public.app_settings, public.feed_runs, public.feed_match_feedback
  to service_role;

grant usage, select on all sequences in schema public to service_role;
