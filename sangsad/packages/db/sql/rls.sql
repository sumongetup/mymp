-- Row Level Security for the সংসদ engine behind mymp.bd.
-- Idempotent: re-run after every migration. The service role bypasses RLS,
-- so workers and admin server actions write freely; anon and authenticated
-- (the browser, PostgREST) may read published rows only and can never write.
--
-- Privileges and policies are both explicit here. Supabase grants anon and
-- authenticated everything on new tables by default; a bare Postgres grants
-- nothing. This file makes both behave the same: every table starts with no
-- public privilege, and a SELECT grant appears only together with a policy.

grant usage on schema public to anon, authenticated;

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
      and tablename not like '__drizzle%'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- helper: drop-then-create keeps this file re-runnable; the grant travels with the policy
create or replace function public._policy(tbl text, name text, using_expr text) returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', name, tbl);
  execute format('create policy %I on public.%I for select to anon, authenticated using (%s)', name, tbl, using_expr);
  execute format('grant select on public.%I to anon, authenticated', tbl);
end $$;

-- reference data: fully public
select public._policy('parliaments',   'public_read', 'true');
select public._policy('parties',       'public_read', 'true');
select public._policy('divisions',     'public_read', 'true');
select public._policy('districts',     'public_read', 'true');
select public._policy('constituencies','public_read', 'true');
select public._policy('members',       'public_read', 'true');
select public._policy('member_terms',  'public_read', 'true');
select public._policy('committees',    'public_read', 'true');
select public._policy('member_committees', 'public_read', 'true');
select public._policy('sources',       'public_read', 'status = ''active''');

-- what the House is doing: official, public
select public._policy('parliament_sessions', 'public_read', 'true');
select public._policy('sittings',            'public_read', 'true');
select public._policy('notices',             'public_read', 'true');
select public._policy('notice_members',      'public_read', 'true');

-- editorial data: only what an editor verified
select public._policy('election_results', 'public_read_verified', 'status = ''verified''');
select public._policy('affidavits',       'public_read_verified', 'status = ''verified''');
select public._policy('affidavit_cases',  'public_read_verified',
  'exists (select 1 from public.affidavits a where a.id = affidavit_id and a.status = ''verified'')');
select public._policy('bio_facts',        'public_read_verified', 'status = ''verified''');
select public._policy('bio_fact_sources', 'public_read_verified',
  'exists (select 1 from public.bio_facts f where f.id = bio_fact_id and f.status = ''verified'')');

-- news: headlines are public; a match is public only when auto-published or approved
select public._policy('articles',        'public_read', 'true');
select public._policy('videos',          'public_read', 'true');
select public._policy('article_members', 'public_read_published', 'status in (''auto'', ''approved'')');
select public._policy('video_members',   'public_read_published', 'status in (''auto'', ''approved'')');

-- never public: member_aliases, corrections, audit_log, ingest_runs, admin_users
-- (no policy and no SELECT grant: a public read is refused outright)
drop policy if exists public_read on public.member_aliases;
drop policy if exists public_read on public.corrections;
drop policy if exists public_read on public.audit_log;
drop policy if exists public_read on public.ingest_runs;
drop policy if exists public_read on public.admin_users;

-- the public correction form may INSERT, nothing else, and only open rows with no resolution
drop policy if exists public_submit on public.corrections;
create policy public_submit on public.corrections for insert to anon, authenticated
  with check (status = 'open' and resolution is null and resolved_by is null);
grant insert on public.corrections to anon, authenticated;
grant usage, select on sequence public.corrections_id_seq to anon, authenticated;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
