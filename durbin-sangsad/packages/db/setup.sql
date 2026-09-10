-- Durbin News · সংসদ — one-shot setup for Supabase's SQL Editor.
-- Generated from packages/db/migrations + sql/rls.sql on 2026-09-10.
-- Safe to run once on a fresh project. Afterwards use `pnpm db:migrate` for new migrations.

create schema if not exists drizzle;
create table if not exists drizzle.__drizzle_migrations (
  id serial primary key,
  hash text not null,
  created_at bigint
);

-- ---------------- migration 0000_init ----------------
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor');
CREATE TYPE "public"."alias_language" AS ENUM('bn', 'en');
CREATE TYPE "public"."correction_status" AS ENUM('open', 'resolved', 'rejected');
CREATE TYPE "public"."extraction_method" AS ENUM('text', 'ocr', 'manual');
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'unknown');
CREATE TYPE "public"."match_status" AS ENUM('auto', 'approved', 'rejected', 'pending');
CREATE TYPE "public"."source_status" AS ENUM('active', 'no_feed', 'blocked', 'disabled', 'pending_inspection');
CREATE TYPE "public"."source_type" AS ENUM('portal', 'tv', 'official', 'verification');
CREATE TYPE "public"."verify_status" AS ENUM('pending', 'verified', 'rejected');
CREATE TABLE "admin_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "admin_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);

CREATE TABLE "affidavit_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"affidavit_id" integer NOT NULL,
	"case_description" text NOT NULL,
	"status" text,
	"source_page" integer
);

CREATE TABLE "affidavits" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"parliament_id" integer NOT NULL,
	"pdf_url" text NOT NULL,
	"stored_pdf_path" text,
	"education" text,
	"profession" text,
	"annual_income" text,
	"total_assets" text,
	"liabilities" text,
	"raw_text" text,
	"extraction_method" "extraction_method" DEFAULT 'text' NOT NULL,
	"status" "verify_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affidavits_member_parliament" UNIQUE("member_id","parliament_id")
);

CREATE TABLE "article_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"match_reason" text NOT NULL,
	"status" "match_status" NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_members_pair" UNIQUE("article_id","member_id")
);

CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary_short" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"language" text,
	CONSTRAINT "articles_url_unique" UNIQUE("url")
);

CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"row_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bio_fact_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"bio_fact_id" integer NOT NULL,
	"source_id" text,
	"url" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL
);

CREATE TABLE "bio_facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"field" text NOT NULL,
	"value_bn" text,
	"value_en" text,
	"status" "verify_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "committees" (
	"id" serial PRIMARY KEY NOT NULL,
	"parliament_id" integer NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"type" text,
	"roster_current" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"source_id" integer,
	"source_url" text,
	CONSTRAINT "committees_parliament_slug" UNIQUE("parliament_id","slug")
);

CREATE TABLE "constituencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"parliament_id" integer NOT NULL,
	"number" integer NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"slug" text NOT NULL,
	"district_id" integer,
	"is_reserved_women" boolean DEFAULT false NOT NULL,
	"boundary_bn" text,
	"source_id" integer,
	"source_url" text,
	CONSTRAINT "constituencies_parliament_number" UNIQUE("parliament_id","number"),
	CONSTRAINT "constituencies_parliament_slug" UNIQUE("parliament_id","slug")
);

CREATE TABLE "corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"page_path" text,
	"field" text,
	"message" text NOT NULL,
	"submitted_by_email" text,
	"status" "correction_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"division_id" integer NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"slug" text NOT NULL,
	"source_id" integer,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "districts_source_id_unique" UNIQUE("source_id")
);

CREATE TABLE "divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"slug" text NOT NULL,
	"source_id" integer,
	CONSTRAINT "divisions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "divisions_source_id_unique" UNIQUE("source_id")
);

CREATE TABLE "election_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"parliament_id" integer NOT NULL,
	"constituency_id" integer NOT NULL,
	"candidate_name" text NOT NULL,
	"party_id" integer,
	"party_label" text,
	"votes" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"turnout" numeric(5, 2),
	"source_url" text NOT NULL,
	"stored_pdf_path" text,
	"status" "verify_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"source_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"error_text" text
);

CREATE TABLE "member_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"alias" text NOT NULL,
	"language" "alias_language" NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_aliases_member_alias" UNIQUE("member_id","alias")
);

CREATE TABLE "member_committees" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"role" text DEFAULT 'Member' NOT NULL,
	CONSTRAINT "member_committees_pair" UNIQUE("committee_id","member_id")
);

CREATE TABLE "member_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"parliament_id" integer NOT NULL,
	"constituency_id" integer,
	"party_id" integer,
	"role" text DEFAULT 'MP' NOT NULL,
	"start_date" date,
	"end_date" date,
	"source_url" text,
	CONSTRAINT "member_terms_member_parliament_role" UNIQUE("member_id","parliament_id","role")
);

CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text,
	"photo_url" text,
	"photo_source_url" text,
	"date_of_birth" date,
	"gender" "gender" DEFAULT 'unknown' NOT NULL,
	"source_external_id" text,
	"source_person_id" integer,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_slug_unique" UNIQUE("slug"),
	CONSTRAINT "members_source_external_id_unique" UNIQUE("source_external_id")
);

CREATE TABLE "parliaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"election_date" date,
	"start_date" date,
	"end_date" date,
	"source_election_id" integer,
	CONSTRAINT "parliaments_number_unique" UNIQUE("number")
);

CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"short_name" text NOT NULL,
	"color" text,
	"source_id" integer,
	CONSTRAINT "parties_short_name_unique" UNIQUE("short_name")
);

CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"type" "source_type" NOT NULL,
	"homepage" text,
	"rss_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"youtube_channel_id" text,
	"facebook_url" text,
	"logo_url" text,
	"language" text,
	"status" "source_status" DEFAULT 'pending_inspection' NOT NULL,
	"notes" text,
	"last_success_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "video_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"match_reason" text NOT NULL,
	"status" "match_status" NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_members_pair" UNIQUE("video_id","member_id")
);

CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"youtube_id" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone,
	"thumbnail_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_youtube_id_unique" UNIQUE("youtube_id")
);

ALTER TABLE "affidavit_cases" ADD CONSTRAINT "affidavit_cases_affidavit_id_affidavits_id_fk" FOREIGN KEY ("affidavit_id") REFERENCES "public"."affidavits"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "affidavits" ADD CONSTRAINT "affidavits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "affidavits" ADD CONSTRAINT "affidavits_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "article_members" ADD CONSTRAINT "article_members_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "article_members" ADD CONSTRAINT "article_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bio_fact_sources" ADD CONSTRAINT "bio_fact_sources_bio_fact_id_bio_facts_id_fk" FOREIGN KEY ("bio_fact_id") REFERENCES "public"."bio_facts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bio_fact_sources" ADD CONSTRAINT "bio_fact_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bio_facts" ADD CONSTRAINT "bio_facts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "committees" ADD CONSTRAINT "committees_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "districts" ADD CONSTRAINT "districts_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_constituency_id_constituencies_id_fk" FOREIGN KEY ("constituency_id") REFERENCES "public"."constituencies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ingest_runs" ADD CONSTRAINT "ingest_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "member_aliases" ADD CONSTRAINT "member_aliases_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member_committees" ADD CONSTRAINT "member_committees_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member_committees" ADD CONSTRAINT "member_committees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member_terms" ADD CONSTRAINT "member_terms_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "member_terms" ADD CONSTRAINT "member_terms_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "member_terms" ADD CONSTRAINT "member_terms_constituency_id_constituencies_id_fk" FOREIGN KEY ("constituency_id") REFERENCES "public"."constituencies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "member_terms" ADD CONSTRAINT "member_terms_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "video_members" ADD CONSTRAINT "video_members_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "video_members" ADD CONSTRAINT "video_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "videos" ADD CONSTRAINT "videos_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "article_members_member_idx" ON "article_members" USING btree ("member_id","status");
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at");
CREATE INDEX "articles_source_idx" ON "articles" USING btree ("source_id");
CREATE INDEX "audit_log_table_row_idx" ON "audit_log" USING btree ("table_name","row_id");
CREATE INDEX "bio_facts_member_idx" ON "bio_facts" USING btree ("member_id");
CREATE INDEX "constituencies_district_idx" ON "constituencies" USING btree ("district_id");
CREATE INDEX "districts_division_idx" ON "districts" USING btree ("division_id");
CREATE INDEX "election_results_constituency_idx" ON "election_results" USING btree ("parliament_id","constituency_id");
CREATE INDEX "ingest_runs_job_idx" ON "ingest_runs" USING btree ("job","started_at");
CREATE INDEX "member_aliases_alias_idx" ON "member_aliases" USING btree ("alias");
CREATE INDEX "member_terms_parliament_idx" ON "member_terms" USING btree ("parliament_id");
CREATE INDEX "member_terms_constituency_idx" ON "member_terms" USING btree ("constituency_id");
CREATE INDEX "members_name_bn_idx" ON "members" USING btree ("name_bn");
CREATE INDEX "video_members_member_idx" ON "video_members" USING btree ("member_id","status");
CREATE INDEX "videos_published_idx" ON "videos" USING btree ("published_at");

-- ---------------- migration 0001_house_activity ----------------
CREATE TABLE "notice_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"notice_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"matched_by" text NOT NULL,
	CONSTRAINT "notice_members_pair" UNIQUE("notice_id","member_id")
);

CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"date" date,
	"title_bn" text,
	"title_en" text,
	"pdf_url" text,
	"committee_id" integer,
	"source_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notices_source_id_unique" UNIQUE("source_id")
);

CREATE TABLE "parliament_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"parliament_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"title_bn" text,
	"title_en" text,
	"start_date" date,
	"end_date" date,
	"source_url" text,
	CONSTRAINT "parliament_sessions_source_id_unique" UNIQUE("source_id")
);

CREATE TABLE "sittings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"title_bn" text,
	"date" date,
	"pdf_url" text,
	"circular_no" integer,
	CONSTRAINT "sittings_source_id_unique" UNIQUE("source_id")
);

ALTER TABLE "parties" DROP CONSTRAINT "parties_short_name_unique";
ALTER TABLE "member_aliases" ALTER COLUMN "added_by" SET DATA TYPE text;
ALTER TABLE "committees" ADD COLUMN "source_member_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "member_terms" ADD COLUMN "seat_label_bn" text;
ALTER TABLE "member_terms" ADD COLUMN "seat_label_en" text;
ALTER TABLE "member_terms" ADD COLUMN "matched_by" text;
ALTER TABLE "members" ADD COLUMN "photo_checked_at" timestamp with time zone;
ALTER TABLE "members" ADD COLUMN "profession_bn" text;
ALTER TABLE "members" ADD COLUMN "father_name_bn" text;
ALTER TABLE "members" ADD COLUMN "mother_name_bn" text;
ALTER TABLE "members" ADD COLUMN "present_address_bn" text;
ALTER TABLE "members" ADD COLUMN "official_email" text;
ALTER TABLE "members" ADD COLUMN "is_freedom_fighter" boolean DEFAULT false NOT NULL;
ALTER TABLE "members" ADD COLUMN "official_summary_bn" text;
ALTER TABLE "members" ADD COLUMN "official_bio_bn" text;
ALTER TABLE "members" ADD COLUMN "source_updated_at" timestamp with time zone;
ALTER TABLE "notice_members" ADD CONSTRAINT "notice_members_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notice_members" ADD CONSTRAINT "notice_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notices" ADD CONSTRAINT "notices_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "parliament_sessions" ADD CONSTRAINT "parliament_sessions_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sittings" ADD CONSTRAINT "sittings_session_id_parliament_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."parliament_sessions"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "notice_members_member_idx" ON "notice_members" USING btree ("member_id");
CREATE INDEX "notices_date_idx" ON "notices" USING btree ("date");
CREATE INDEX "notices_committee_idx" ON "notices" USING btree ("committee_id");
CREATE INDEX "sittings_date_idx" ON "sittings" USING btree ("date");
CREATE INDEX "members_person_idx" ON "members" USING btree ("source_person_id");
ALTER TABLE "committees" ADD CONSTRAINT "committees_source_id_unique" UNIQUE("source_id");
ALTER TABLE "parties" ADD CONSTRAINT "parties_source_id_unique" UNIQUE("source_id");

-- ---------------- row level security ----------------
-- Row Level Security for Durbin News · সংসদ.
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

-- ---------------- record the migrations as applied ----------------
insert into drizzle.__drizzle_migrations (hash, created_at)
  select '5387dfa8e4be3969680da4fc728c7e27b153645ae7c414926e36b33ef35701bf', 1789031981133
  where not exists (select 1 from drizzle.__drizzle_migrations where hash = '5387dfa8e4be3969680da4fc728c7e27b153645ae7c414926e36b33ef35701bf');
insert into drizzle.__drizzle_migrations (hash, created_at)
  select '897ce6fc6d3e1c875cc0fc0085f685508b0bae1bfa07eef0f54e074de1c5be59', 1789034228553
  where not exists (select 1 from drizzle.__drizzle_migrations where hash = '897ce6fc6d3e1c875cc0fc0085f685508b0bae1bfa07eef0f54e074de1c5be59');
