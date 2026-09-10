/**
 * Seed reference data from parliament.gov.bd: parliaments, divisions,
 * districts and the 350 constituencies of the current election set.
 *
 * Idempotent upserts keyed on the source's own ids, so re-running is safe.
 * Nothing is invented: a constituency with no district in the source (the
 * fifty reserved women's seats) is stored with district_id = null.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { parliamentGet, parliamentGetAll, slugify, PARLIAMENT_BASE } from '@durbin/shared';
import { getDb } from './client';
import { constituencies, districts, divisions, parliaments } from './schema';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const CURRENT_PARLIAMENT = 13;

interface SrcParliament {
  parliamentNo: number;
  externalId: number;
  electionDate: string | null;
  oathDate: string | null;
  parliamentLastDate: string | null;
}
interface SrcPlace {
  externalId: number;
  nameEng: string;
  nameBng: string;
}
interface SrcConstituency {
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

async function main() {
  const db = getDb();

  // ---- parliaments ----
  const rawParliaments = await parliamentGet<SrcParliament[]>('/api/parliaments');
  for (const p of rawParliaments) {
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
  const current = rawParliaments.find((p) => p.parliamentNo === CURRENT_PARLIAMENT);
  if (!current) throw new Error(`parliament ${CURRENT_PARLIAMENT} not in source`);
  const [parliamentRow] = await db.select().from(parliaments).where(sql`${parliaments.number} = ${CURRENT_PARLIAMENT}`);
  if (!parliamentRow) throw new Error('parliament row missing after upsert');
  console.log(`parliaments: ${rawParliaments.length} upserted; current = ${CURRENT_PARLIAMENT} (election set ${current.externalId})`);

  // ---- constituencies of the current election set ----
  const all = await parliamentGetAll<SrcConstituency>('/api/constituencies', 100, (page, pages, n) =>
    process.stdout.write(`  constituencies page ${page}/${pages} — ${n}\n`),
  );
  const rows = all.filter((c) => c.electionId === current.externalId);
  if (rows.length === 0) throw new Error('no constituencies for the current election set');

  // divisions and districts, deduplicated on the source id
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
  for (const d of distBySource.values()) {
    const divisionId = divisionIdBySource.get(d.divisionId);
    if (!divisionId) {
      console.warn(`  district ${d.nameEng} has no known division (source divisionId ${d.divisionId}); skipped`);
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

  console.log(
    `divisions: ${divisionIdBySource.size}, districts: ${districtIdBySource.size}, constituencies: ${rows.length} (${rows.length - reserved} territorial + ${reserved} reserved)`,
  );
  if (missingBoundary) console.log(`  note: ${missingBoundary} territorial constituencies have no boundary text in the source`);
  if (rows.length !== 350) console.warn(`  WARNING: expected 350 constituencies, source has ${rows.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err.message ?? err);
  process.exit(1);
});
