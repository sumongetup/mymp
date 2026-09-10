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

/**
 * Which division each district belongs to, from the source's two signals.
 *
 * A district record carries its own `divisionId`, but in a different
 * numbering from the division objects (alphabetical 1-8, where the division
 * objects use 1-7 and 9). Each seat row also prints a division. The numbering
 * is translated by majority vote over the rows; a district then takes the
 * division from its own record, and falls back to its rows' division only when
 * the record's number cannot be translated. Every disagreement is reported
 * (the source puts Kishoreganj's seats under Mymensingh while its district
 * record, and the official map, say Dhaka).
 */
export function resolveDistrictDivisions(rows: SrcConstituency[]): { divisionOfDistrict: Map<number, number>; conflicts: string[] } {
  const votes = new Map<number, Map<number, number>>();
  const rowDivisions = new Map<number, Set<number>>();
  const districts = new Map<number, NonNullable<SrcConstituency['district']>>();
  const divisionName = new Map<number, string>();
  for (const c of rows) {
    if (!c.district?.externalId) continue;
    districts.set(c.district.externalId, c.district);
    if (!c.division?.externalId) continue;
    divisionName.set(c.division.externalId, c.division.nameEng.trim());
    const tally = votes.get(c.district.divisionId) ?? new Map<number, number>();
    tally.set(c.division.externalId, (tally.get(c.division.externalId) ?? 0) + 1);
    votes.set(c.district.divisionId, tally);
    const seen = rowDivisions.get(c.district.externalId) ?? new Set<number>();
    seen.add(c.division.externalId);
    rowDivisions.set(c.district.externalId, seen);
  }

  const translate = new Map<number, number>();
  for (const [recordNo, tally] of votes) {
    const ranked = [...tally].sort((a, b) => b[1] - a[1]);
    const [top, second] = ranked;
    if (top && (!second || top[1] > second[1])) translate.set(recordNo, top[0]);
  }

  const divisionOfDistrict = new Map<number, number>();
  const conflicts: string[] = [];
  const nameOf = (id: number) => divisionName.get(id) ?? String(id);
  for (const [id, d] of districts) {
    const fromRecord = translate.get(d.divisionId);
    const fromRows = rowDivisions.get(id);
    const onlyRow = fromRows?.size === 1 ? [...fromRows][0] : undefined;
    const chosen = fromRecord ?? onlyRow;
    if (chosen === undefined) continue;
    divisionOfDistrict.set(id, chosen);
    if (fromRows && [...fromRows].some((r) => r !== chosen)) {
      const rowsSay = [...fromRows].map(nameOf).join('/');
      conflicts.push(`${d.nameEng.trim()}: seat rows say ${rowsSay}, district record says ${nameOf(chosen)}; district record used`);
    }
  }
  return { divisionOfDistrict, conflicts };
}

export interface ConstituencySeedReport {
  divisions: number;
  districts: number;
  constituencies: number;
  territorial: number;
  reserved: number;
  missingBoundary: number;
  skippedDistricts: string[];
  /** Districts whose seat rows and own record name different divisions. */
  divisionConflicts: string[];
  /** Districts named on seat rows that no set has created (older sets only look districts up). */
  unknownDistricts: string[];
  /** Seats whose name repeats another seat's in the same set; kept as given, slug gets the seat number. */
  duplicateNames: string[];
}

/** Upserts the divisions, districts and constituencies of one election set into one parliament. */
export async function upsertConstituencySet(
  db: SeedDb,
  parliamentNumber: number,
  rows: SrcConstituency[],
  opts: { writePlaces: boolean } = { writePlaces: true },
): Promise<ConstituencySeedReport> {
  const [parliamentRow] = await db.select().from(parliaments).where(sql`${parliaments.number} = ${parliamentNumber}`);
  if (!parliamentRow) throw new Error(`parliament ${parliamentNumber} must be upserted first`);
  if (rows.length === 0) throw new Error('no constituencies to seed');

  const divisionIdBySource = new Map<number, number>();
  const skippedDistricts: string[] = [];
  const divisionConflicts: string[] = [];
  if (opts.writePlaces) {
    // See resolveDistrictDivisions: the source's two division signals use
    // different numberings and disagree on one district.
    const divBySource = new Map<number, SrcPlace>();
    const distBySource = new Map<number, SrcPlace>();
    for (const c of rows) {
      if (c.division?.externalId && clean(c.division.nameEng)) divBySource.set(c.division.externalId, c.division);
      if (c.district?.externalId && clean(c.district.nameEng)) distBySource.set(c.district.externalId, c.district);
    }
    const resolved = resolveDistrictDivisions(rows);
    const divisionOfDistrict = resolved.divisionOfDistrict;
    divisionConflicts.push(...resolved.conflicts);

    for (const d of divBySource.values()) {
      const [row] = await db
        .insert(divisions)
        .values({ nameBn: d.nameBng.trim(), nameEn: d.nameEng.trim(), slug: slugify(d.nameEng), sourceId: d.externalId })
        .onConflictDoUpdate({ target: divisions.sourceId, set: { nameBn: sql`excluded.name_bn`, nameEn: sql`excluded.name_en` } })
        .returning({ id: divisions.id });
      if (row) divisionIdBySource.set(d.externalId, row.id);
    }

    for (const d of distBySource.values()) {
      const src = divisionOfDistrict.get(d.externalId);
      const divisionId = src === undefined ? undefined : divisionIdBySource.get(src);
      if (!divisionId) {
        skippedDistricts.push(d.nameEng);
        continue;
      }
      await db
        .insert(districts)
        .values({ divisionId, nameBn: d.nameBng.trim(), nameEn: d.nameEng.trim(), slug: slugify(d.nameEng), sourceId: d.externalId })
        .onConflictDoUpdate({
          target: districts.sourceId,
          set: { divisionId: sql`excluded.division_id`, nameBn: sql`excluded.name_bn`, nameEn: sql`excluded.name_en` },
        });
    }
  }

  // Seats point at districts by the source's district id, which is the same in
  // every election set; older sets carry no divisions and only look districts up.
  const districtIdBySource = new Map<number, number>();
  for (const d of await db.select({ id: districts.id, sourceId: districts.sourceId }).from(districts)) {
    if (d.sourceId !== null) districtIdBySource.set(d.sourceId, d.id);
  }
  const unknownDistricts = new Set<string>();
  for (const c of rows) {
    if (c.district?.externalId && !districtIdBySource.has(c.district.externalId)) unknownDistricts.add(c.district.nameEng.trim());
  }

  // The source sometimes gives two seats of one set the same name (the 1st
  // parliament lists both 241 and 242 as COMILLA-1 / কুমিল্লা-১). The names stay
  // exactly as published; the later seat's slug gets its number so each has an address.
  const usedSlugs = new Set<string>();
  const slugByNumber = new Map<number, string>();
  const duplicateNames: string[] = [];
  for (const c of [...rows].sort((a, b) => a.constituencyNo - b.constituencyNo)) {
    const base = slugify(c.constituencyEng);
    const slug = usedSlugs.has(base) ? `${base}-${c.constituencyNo}` : base;
    if (slug !== base) duplicateNames.push(`${c.constituencyNo} ${c.constituencyEng.trim()}`);
    usedSlugs.add(slug);
    slugByNumber.set(c.constituencyNo, slug);
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
        slug: slugByNumber.get(c.constituencyNo) ?? slugify(c.constituencyEng),
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
    districts: new Set(rows.flatMap((c) => (c.district?.externalId && districtIdBySource.has(c.district.externalId) ? [c.district.externalId] : []))).size,
    constituencies: rows.length,
    territorial: rows.length - reserved,
    reserved,
    missingBoundary,
    skippedDistricts,
    divisionConflicts,
    unknownDistricts: [...unknownDistricts],
    duplicateNames,
  };
}
