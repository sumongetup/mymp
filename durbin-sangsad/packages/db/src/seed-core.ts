/**
 * The seed's logic, separated from its network calls so it can run against
 * any Postgres: Supabase in production, PGlite in the integration tests.
 *
 * Idempotent upserts keyed on the source's own ids. Nothing is invented: a
 * constituency with no district in the source (the fifty reserved women's
 * seats) is stored with district_id = null.
 */
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { slugify, PARLIAMENT_BASE } from '@durbin/shared';
import * as schema from './schema';
import { constituencies, districts, divisions, parliaments } from './schema';

/** Any Drizzle Postgres connection over this schema (postgres.js, PGlite…). */
export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface SrcParliament {
  parliamentNo: number;
  externalId: number;
  electionDate: string | null;
  oathDate: string | null;
  parliamentLastDate: string | null;
}
export interface SrcPlace {
  externalId: number;
  nameEng: string;
  nameBng: string;
}
export interface SrcConstituency {
  id: number;
  externalId: number;
  electionId: number;
  constituencyNo: number;
  constituencyEng: string;
  constituencyBng: string;
  boundaryDetails: string | null;
  division: SrcPlace | null;
  district: (SrcPlace & { divisionId: number }) | null;
}

const clean = (v: string | null | undefined) => (typeof v === 'string' ? v.trim() : '') || null;

export async function upsertParliaments(db: SeedDb, raw: SrcParliament[]): Promise<number> {
  for (const p of raw) {
    await db
      .insert(parliaments)
      .values({
        number: p.parliamentNo,
        electionDate: clean(p.electionDate),
        startDate: clean(p.oathDate),
        endDate: clean(p.parliamentLastDate),
        sourceElectionId: p.externalId,
      })
      .onConflictDoUpdate({
        target: parliaments.number,
        set: {
          electionDate: sql`excluded.election_date`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          sourceElectionId: sql`excluded.source_election_id`,
        },
      });
  }
  return raw.length;
}

export interface ConstituencySeedReport {
  divisions: number;
  districts: number;
  constituencies: number;
  territorial: number;
  reserved: number;
  missingBoundary: number;
  skippedDistricts: string[];
}

/** Upserts the divisions, districts and constituencies of one election set into one parliament. */
export async function upsertConstituencySet(
  db: SeedDb,
  parliamentNumber: number,
  rows: SrcConstituency[],
): Promise<ConstituencySeedReport> {
  const [parliamentRow] = await db.select().from(parliaments).where(sql`${parliaments.number} = ${parliamentNumber}`);
  if (!parliamentRow) throw new Error(`parliament ${parliamentNumber} must be upserted first`);
  if (rows.length === 0) throw new Error('no constituencies to seed');

  const divBySource = new Map<number, SrcPlace>();
  const distBySource = new Map<number, SrcPlace & { divisionId: number }>();
  for (const c of rows) {
    if (c.division?.externalId && clean(c.division.nameEng)) divBySource.set(c.division.externalId, c.division);
    if (c.district?.externalId && clean(c.district.nameEng)) distBySource.set(c.district.externalId, c.district);
  }

  const divisionIdBySource = new Map<number, number>();
  for (const d of divBySource.values()) {
    const [row] = await db
      .insert(divisions)
      .values({ nameBn: d.nameBng.trim(), nameEn: d.nameEng.trim(), slug: slugify(d.nameEng), sourceId: d.externalId })
      .onConflictDoUpdate({ target: divisions.sourceId, set: { nameBn: sql`excluded.name_bn`, nameEn: sql`excluded.name_en` } })
      .returning({ id: divisions.id });
    if (row) divisionIdBySource.set(d.externalId, row.id);
  }

  const districtIdBySource = new Map<number, number>();
  const skippedDistricts: string[] = [];
  for (const d of distBySource.values()) {
    const divisionId = divisionIdBySource.get(d.divisionId);
    if (!divisionId) {
      skippedDistricts.push(d.nameEng);
      continue;
    }
    const [row] = await db
      .insert(districts)
      .values({ divisionId, nameBn: d.nameBng.trim(), nameEn: d.nameEng.trim(), slug: slugify(d.nameEng), sourceId: d.externalId })
      .onConflictDoUpdate({
        target: districts.sourceId,
        set: { divisionId: sql`excluded.division_id`, nameBn: sql`excluded.name_bn`, nameEn: sql`excluded.name_en` },
      })
      .returning({ id: districts.id });
    if (row) districtIdBySource.set(d.externalId, row.id);
  }

  let reserved = 0;
  let missingBoundary = 0;
  for (const c of rows) {
    const isReserved = c.constituencyNo > 300;
    if (isReserved) reserved++;
    if (!isReserved && !clean(c.boundaryDetails)) missingBoundary++;
    await db
      .insert(constituencies)
      .values({
        parliamentId: parliamentRow.id,
        number: c.constituencyNo,
        nameBn: c.constituencyBng.trim(),
        nameEn: c.constituencyEng.trim(),
        slug: slugify(c.constituencyEng),
        districtId: c.district?.externalId ? (districtIdBySource.get(c.district.externalId) ?? null) : null,
        isReservedWomen: isReserved,
        boundaryBn: clean(c.boundaryDetails),
        sourceId: c.id,
        sourceUrl: `${PARLIAMENT_BASE}/api/constituencies/${c.id}`,
      })
      .onConflictDoUpdate({
        target: [constituencies.parliamentId, constituencies.number],
        set: {
          nameBn: sql`excluded.name_bn`,
          nameEn: sql`excluded.name_en`,
          slug: sql`excluded.slug`,
          districtId: sql`excluded.district_id`,
          isReservedWomen: sql`excluded.is_reserved_women`,
          boundaryBn: sql`excluded.boundary_bn`,
          sourceId: sql`excluded.source_id`,
          sourceUrl: sql`excluded.source_url`,
        },
      });
  }

  return {
    divisions: divisionIdBySource.size,
    districts: districtIdBySource.size,
    constituencies: rows.length,
    territorial: rows.length - reserved,
    reserved,
    missingBoundary,
    skippedDistricts,
  };
}
