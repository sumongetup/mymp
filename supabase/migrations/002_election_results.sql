-- Election results, entered by an admin from the Election Commission's gazette.
-- Run once in Supabase → SQL Editor after schema.sql. Nothing on the public
-- site reads this table directly: the sync copies published rows into
-- data/results.json at build time, so a wrong draft can never reach readers.

create table if not exists public.election_results (
  id            uuid primary key default gen_random_uuid(),
  seat_no       int  not null check (seat_no between 1 and 300),
  parliament_no int  not null check (parliament_no between 1 and 20),
  -- [{ "name": "…", "party": "BNP", "votes": 123456 }, …] in the order entered
  candidates    jsonb not null default '[]'::jsonb,
  total_votes   int,
  turnout       numeric(5, 2),
  source_url    text not null,
  source_note   text,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id),
  updated_at    timestamptz not null default now(),
  unique (seat_no, parliament_no)
);
create index if not exists election_results_status_idx on public.election_results (status, seat_no);

alter table public.election_results enable row level security;
revoke all on public.election_results from anon, authenticated;
grant all on public.election_results to service_role;
