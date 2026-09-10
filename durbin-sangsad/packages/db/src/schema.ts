/**
 * Durbin News · সংসদ schema.
 *
 * Every fact that reaches a reader carries its provenance: a source URL, a
 * stored copy where allowed, and for anything editorial a verifier. Rows the
 * public may see are gated by status columns; the RLS policies in sql/rls.sql
 * expose only those. Workers and admins write through the service role.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/* ---------------- reference ---------------- */

export const parliaments = pgTable('parliaments', {
  id: serial('id').primaryKey(),
  number: integer('number').notNull().unique(),
  electionDate: date('election_date'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  /** parliament.gov.bd's own id for the election set this parliament came from. */
  sourceElectionId: integer('source_election_id'),
});

export const parties = pgTable('parties', {
  id: serial('id').primaryKey(),
  nameBn: text('name_bn').notNull(),
  nameEn: text('name_en').notNull(),
  shortName: text('short_name').notNull().unique(),
  /** Hex colour used identically for every party chip; no party gets a special treatment. */
  color: text('color'),
  sourceId: integer('source_id'),
});

export const divisions = pgTable('divisions', {
  id: serial('id').primaryKey(),
  nameBn: text('name_bn').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull().unique(),
  sourceId: integer('source_id').unique(),
});

export const districts = pgTable(
  'districts',
  {
    id: serial('id').primaryKey(),
    divisionId: integer('division_id')
      .notNull()
      .references(() => divisions.id),
    nameBn: text('name_bn').notNull(),
    nameEn: text('name_en').notNull(),
    slug: text('slug').notNull().unique(),
    sourceId: integer('source_id').unique(),
  },
  (t) => [index('districts_division_idx').on(t.divisionId)],
);

export const constituencies = pgTable(
  'constituencies',
  {
    id: serial('id').primaryKey(),
    parliamentId: integer('parliament_id')
      .notNull()
      .references(() => parliaments.id),
    number: integer('number').notNull(),
    nameBn: text('name_bn').notNull(),
    nameEn: text('name_en').notNull(),
    slug: text('slug').notNull(),
    /** Null for the fifty reserved women's seats, which belong to no district. */
    districtId: integer('district_id').references(() => districts.id),
    isReservedWomen: boolean('is_reserved_women').notNull().default(false),
    boundaryBn: text('boundary_bn'),
    sourceId: integer('source_id'),
    sourceUrl: text('source_url'),
  },
  (t) => [
    unique('constituencies_parliament_number').on(t.parliamentId, t.number),
    unique('constituencies_parliament_slug').on(t.parliamentId, t.slug),
    index('constituencies_district_idx').on(t.districtId),
  ],
);

/* ---------------- members ---------------- */

export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'unknown']);

export const members = pgTable(
  'members',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    nameBn: text('name_bn').notNull(),
    nameEn: text('name_en'),
    /** Our stored copy (Supabase Storage). Null means the neutral placeholder is shown. */
    photoUrl: text('photo_url'),
    /** Where the photo came from: only parliament.gov.bd is acceptable. */
    photoSourceUrl: text('photo_source_url'),
    dateOfBirth: date('date_of_birth'),
    gender: genderEnum('gender').notNull().default('unknown'),
    /** parliament.gov.bd externalId, e.g. 013019001. Stable within a parliament. */
    sourceExternalId: text('source_external_id').unique(),
    /** parliament.gov.bd person id (empId); reliable from the 11th parliament on. */
    sourcePersonId: integer('source_person_id'),
    sourceUrl: text('source_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('members_name_bn_idx').on(t.nameBn)],
);

export const memberTerms = pgTable(
  'member_terms',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    parliamentId: integer('parliament_id')
      .notNull()
      .references(() => parliaments.id),
    constituencyId: integer('constituency_id').references(() => constituencies.id),
    partyId: integer('party_id').references(() => parties.id),
    /** MP, Speaker, Deputy Speaker, Leader of the House, Leader of the Opposition, Chief Whip, Whip, Minister… */
    role: text('role').notNull().default('MP'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    sourceUrl: text('source_url'),
  },
  (t) => [
    unique('member_terms_member_parliament_role').on(t.memberId, t.parliamentId, t.role),
    index('member_terms_parliament_idx').on(t.parliamentId),
    index('member_terms_constituency_idx').on(t.constituencyId),
  ],
);

export const aliasLanguageEnum = pgEnum('alias_language', ['bn', 'en']);

export const memberAliases = pgTable(
  'member_aliases',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    language: aliasLanguageEnum('language').notNull(),
    addedBy: uuid('added_by'),
    createdAt: createdAt(),
  },
  (t) => [unique('member_aliases_member_alias').on(t.memberId, t.alias), index('member_aliases_alias_idx').on(t.alias)],
);

/* ---------------- elections ---------------- */

export const verifyStatusEnum = pgEnum('verify_status', ['pending', 'verified', 'rejected']);

export const electionResults = pgTable(
  'election_results',
  {
    id: serial('id').primaryKey(),
    parliamentId: integer('parliament_id')
      .notNull()
      .references(() => parliaments.id),
    constituencyId: integer('constituency_id')
      .notNull()
      .references(() => constituencies.id),
    candidateName: text('candidate_name').notNull(),
    partyId: integer('party_id').references(() => parties.id),
    /** Free text when the party is not in `parties` (an independent, a defunct party). */
    partyLabel: text('party_label'),
    votes: integer('votes'),
    isWinner: boolean('is_winner').notNull().default(false),
    /** Percentage of registered voters who voted, for the constituency as a whole. */
    turnout: numeric('turnout', { precision: 5, scale: 2 }),
    sourceUrl: text('source_url').notNull(),
    storedPdfPath: text('stored_pdf_path'),
    status: verifyStatusEnum('status').notNull().default('pending'),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('election_results_constituency_idx').on(t.parliamentId, t.constituencyId)],
);

/* ---------------- affidavits ---------------- */

export const extractionMethodEnum = pgEnum('extraction_method', ['text', 'ocr', 'manual']);

export const affidavits = pgTable(
  'affidavits',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    parliamentId: integer('parliament_id')
      .notNull()
      .references(() => parliaments.id),
    /** Where the PDF was published (ECS). Required so every figure links back to its proof. */
    pdfUrl: text('pdf_url').notNull(),
    storedPdfPath: text('stored_pdf_path'),
    education: text('education'),
    profession: text('profession'),
    annualIncome: text('annual_income'),
    totalAssets: text('total_assets'),
    liabilities: text('liabilities'),
    /** Raw extractor output, kept for the reviewer; never rendered publicly. */
    rawText: text('raw_text'),
    extractionMethod: extractionMethodEnum('extraction_method').notNull().default('text'),
    status: verifyStatusEnum('status').notNull().default('pending'),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique('affidavits_member_parliament').on(t.memberId, t.parliamentId)],
);

export const affidavitCases = pgTable('affidavit_cases', {
  id: serial('id').primaryKey(),
  affidavitId: integer('affidavit_id')
    .notNull()
    .references(() => affidavits.id, { onDelete: 'cascade' }),
  caseDescription: text('case_description').notNull(),
  /** Exactly as declared: pending, disposed, acquitted… Never our own judgement. */
  status: text('status'),
  sourcePage: integer('source_page'),
});

/* ---------------- committees ---------------- */

export const committees = pgTable(
  'committees',
  {
    id: serial('id').primaryKey(),
    parliamentId: integer('parliament_id')
      .notNull()
      .references(() => parliaments.id),
    nameBn: text('name_bn').notNull(),
    nameEn: text('name_en'),
    slug: text('slug').notNull(),
    type: text('type'),
    /** False while the source still lists the previous parliament's members. */
    rosterCurrent: boolean('roster_current').notNull().default(false),
    startDate: date('start_date'),
    sourceId: integer('source_id'),
    sourceUrl: text('source_url'),
  },
  (t) => [unique('committees_parliament_slug').on(t.parliamentId, t.slug)],
);

export const memberCommittees = pgTable(
  'member_committees',
  {
    id: serial('id').primaryKey(),
    committeeId: integer('committee_id')
      .notNull()
      .references(() => committees.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('Member'),
  },
  (t) => [unique('member_committees_pair').on(t.committeeId, t.memberId)],
);

/* ---------------- biography ---------------- */

export const bioFacts = pgTable(
  'bio_facts',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    /** e.g. previous_position, political_history, notable_event, education */
    field: text('field').notNull(),
    valueBn: text('value_bn'),
    valueEn: text('value_en'),
    /** Verified requires two trusted sources, or one plus an official one (enforced in the admin). */
    status: verifyStatusEnum('status').notNull().default('pending'),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('bio_facts_member_idx').on(t.memberId)],
);

export const bioFactSources = pgTable('bio_fact_sources', {
  id: serial('id').primaryKey(),
  bioFactId: integer('bio_fact_id')
    .notNull()
    .references(() => bioFacts.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').references(() => sources.id),
  url: text('url').notNull(),
  /** Official sources (parliament, ECS) count double; see the verification rule. */
  isOfficial: boolean('is_official').notNull().default(false),
});

/* ---------------- news ---------------- */

export const sourceTypeEnum = pgEnum('source_type', ['portal', 'tv', 'official', 'verification']);
export const sourceStatusEnum = pgEnum('source_status', ['active', 'no_feed', 'blocked', 'disabled', 'pending_inspection']);

/** Mirrors config/sources.json; the worker upserts it on every run. */
export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  nameBn: text('name_bn').notNull(),
  nameEn: text('name_en').notNull(),
  type: sourceTypeEnum('type').notNull(),
  homepage: text('homepage'),
  rssUrls: jsonb('rss_urls').$type<string[]>().notNull().default([]),
  youtubeChannelId: text('youtube_channel_id'),
  /** Link only; Facebook is never scraped. */
  facebookUrl: text('facebook_url'),
  logoUrl: text('logo_url'),
  language: text('language'),
  status: sourceStatusEnum('status').notNull().default('pending_inspection'),
  notes: text('notes'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
});

export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id),
    url: text('url').notNull().unique(),
    title: text('title').notNull(),
    /** The feed's own summary, cut to 160 characters. Never a body, never rewritten. */
    summaryShort: text('summary_short'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    language: text('language'),
  },
  (t) => [index('articles_published_idx').on(t.publishedAt), index('articles_source_idx').on(t.sourceId)],
);

export const videos = pgTable(
  'videos',
  {
    id: serial('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id),
    youtubeId: text('youtube_id').notNull().unique(),
    title: text('title').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** YouTube-hosted thumbnail; never downloaded. */
    thumbnailUrl: text('thumbnail_url'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('videos_published_idx').on(t.publishedAt)],
);

export const matchStatusEnum = pgEnum('match_status', ['auto', 'approved', 'rejected', 'pending']);

export const articleMembers = pgTable(
  'article_members',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    /** Why the matcher decided what it did, for the reviewer. */
    matchReason: text('match_reason').notNull(),
    status: matchStatusEnum('status').notNull(),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('article_members_pair').on(t.articleId, t.memberId),
    index('article_members_member_idx').on(t.memberId, t.status),
  ],
);

export const videoMembers = pgTable(
  'video_members',
  {
    id: serial('id').primaryKey(),
    videoId: integer('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    matchReason: text('match_reason').notNull(),
    status: matchStatusEnum('status').notNull(),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique('video_members_pair').on(t.videoId, t.memberId), index('video_members_member_idx').on(t.memberId, t.status)],
);

/* ---------------- editorial operations ---------------- */

export const correctionStatusEnum = pgEnum('correction_status', ['open', 'resolved', 'rejected']);

export const corrections = pgTable('corrections', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id, { onDelete: 'set null' }),
  pagePath: text('page_path'),
  field: text('field'),
  message: text('message').notNull(),
  submittedByEmail: text('submitted_by_email'),
  status: correctionStatusEnum('status').notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    actorId: uuid('actor_id'),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    tableName: text('table_name').notNull(),
    rowId: text('row_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_table_row_idx').on(t.tableName, t.rowId)],
);

export const ingestRuns = pgTable(
  'ingest_runs',
  {
    id: serial('id').primaryKey(),
    job: text('job').notNull(),
    sourceId: text('source_id').references(() => sources.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ok: boolean('ok'),
    itemsFound: integer('items_found').notNull().default(0),
    itemsNew: integer('items_new').notNull().default(0),
    errors: integer('errors').notNull().default(0),
    errorText: text('error_text'),
  },
  (t) => [index('ingest_runs_job_idx').on(t.job, t.startedAt)],
);

export const adminRoleEnum = pgEnum('admin_role', ['admin', 'editor']);

/** Who may use /admin. user_id is the Supabase Auth user id. */
export const adminUsers = pgTable('admin_users', {
  userId: uuid('user_id').primaryKey(),
  email: text('email').notNull().unique(),
  role: adminRoleEnum('role').notNull().default('editor'),
  createdAt: createdAt(),
});
