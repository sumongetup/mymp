CREATE TABLE "notice_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"notice_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"matched_by" text NOT NULL,
	CONSTRAINT "notice_members_pair" UNIQUE("notice_id","member_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "parties" DROP CONSTRAINT "parties_short_name_unique";--> statement-breakpoint
ALTER TABLE "member_aliases" ALTER COLUMN "added_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "committees" ADD COLUMN "source_member_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_terms" ADD COLUMN "seat_label_bn" text;--> statement-breakpoint
ALTER TABLE "member_terms" ADD COLUMN "seat_label_en" text;--> statement-breakpoint
ALTER TABLE "member_terms" ADD COLUMN "matched_by" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "photo_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "profession_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "father_name_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "mother_name_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "present_address_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "official_email" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_freedom_fighter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "official_summary_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "official_bio_bn" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "source_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notice_members" ADD CONSTRAINT "notice_members_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_members" ADD CONSTRAINT "notice_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliament_sessions" ADD CONSTRAINT "parliament_sessions_parliament_id_parliaments_id_fk" FOREIGN KEY ("parliament_id") REFERENCES "public"."parliaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sittings" ADD CONSTRAINT "sittings_session_id_parliament_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."parliament_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notice_members_member_idx" ON "notice_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "notices_date_idx" ON "notices" USING btree ("date");--> statement-breakpoint
CREATE INDEX "notices_committee_idx" ON "notices" USING btree ("committee_id");--> statement-breakpoint
CREATE INDEX "sittings_date_idx" ON "sittings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "members_person_idx" ON "members" USING btree ("source_person_id");--> statement-breakpoint
ALTER TABLE "committees" ADD CONSTRAINT "committees_source_id_unique" UNIQUE("source_id");--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_source_id_unique" UNIQUE("source_id");