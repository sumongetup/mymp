-- MY MP admin schema. Run once in the Supabase SQL editor of a NEW project
-- dedicated to this site (never a project shared with another app).
--
-- Every table has row level security enabled and NO policies. That means the
-- anon and authenticated keys can read nothing; only the service role key,
-- which is used exclusively inside server actions after the admin session has
-- been verified, can touch these tables. Public pages never query this database.

create extension if not exists pgcrypto;

-- who may use the admin panel ------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  role       text not null default 'editor' check (role in ('super_admin', 'editor')),
  created_at timestamptz not null default now()
);

-- a hand-edited field on a member / seat / party / committee -------------------
-- The nightly sync applies these AFTER fetching parliament.gov.bd, so an
-- admin edit is never overwritten by the source.
create table if not exists public.overrides (
  id          bigserial primary key,
  entity_type text not null check (entity_type in ('member', 'seat', 'party', 'committee')),
  entity_id   text not null,
  field       text not null,
  value       text,
  updated_by  uuid references auth.users (id),
  updated_at  timestamptz not null default now(),
  unique (entity_type, entity_id, field)
);

-- soft delete: hidden from the public site, never destroyed --------------------
create table if not exists public.hidden_entities (
  entity_type text not null check (entity_type in ('member', 'committee')),
  entity_id   text not null,
  reason      text,
  hidden_by   uuid references auth.users (id),
  hidden_at   timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

-- news: headline + source + link, never the article body -----------------------
create table if not exists public.news_posts (
  id           uuid primary key default gen_random_uuid(),
  title_bn     text not null,
  source_name  text not null,
  source_url   text not null,
  published_on date not null,
  excerpt_bn   text,
  member_id    text,
  seat_slug    text,
  status       text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id),
  updated_at   timestamptz not null default now()
);
create index if not exists news_posts_status_idx on public.news_posts (status, published_on desc);
create index if not exists news_posts_member_idx on public.news_posts (member_id);

-- reports of wrong information from the public ---------------------------------
create table if not exists public.corrections (
  id              uuid primary key default gen_random_uuid(),
  page_path       text not null,
  message         text not null,
  reporter_name   text,
  reporter_email  text,
  status          text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  resolution_note text,
  resolved_by     uuid references auth.users (id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- who changed what, when, and what it was before --------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor       uuid,
  actor_email text,
  action      text not null,
  entity_type text,
  entity_id   text,
  field       text,
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- every build-time sync from parliament.gov.bd ---------------------------------
create table if not exists public.sync_runs (
  id                bigserial primary key,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  ok                boolean,
  members           integer,
  committees        integer,
  overrides_applied integer,
  message           text
);

-- lock everything down: RLS on, no policies, so only the service role reads ----
alter table public.admin_users     enable row level security;
alter table public.overrides       enable row level security;
alter table public.hidden_entities enable row level security;
alter table public.news_posts      enable row level security;
alter table public.corrections     enable row level security;
alter table public.audit_log       enable row level security;
alter table public.sync_runs       enable row level security;

revoke all on all tables in schema public from anon, authenticated;
