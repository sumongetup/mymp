/**
 * Read models for the public site. Each returns plain data, so the web app
 * can serve the same shape from the database or, in local development, from
 * the TEST_ fixtures.
 */
import { asc, eq } from 'drizzle-orm';
import type { Db } from './client';
import { constituencies, districts, divisions, parliaments } from './schema';

export interface ConstituencyRow {
  number: number;
  nameBn: string;
  nameEn: string;
  slug: string;
  isReservedWomen: boolean;
  boundaryBn: string | null;
  district: { nameBn: string; nameEn: string; slug: string } | null;
  division: { nameBn: string; nameEn: string; slug: string } | null;
}

export interface DivisionGroup {
  division: { nameBn: string; nameEn: string; slug: string };
  districts: { district: { nameBn: string; nameEn: string; slug: string }; constituencies: ConstituencyRow[] }[];
}

export interface ConstituencyListing {
  parliamentNumber: number;
  total: number;
  territorial: number;
  reserved: number;
  divisions: DivisionGroup[];
  reservedSeats: ConstituencyRow[];
}

export async function listConstituencies(db: Db, parliamentNumber = 13): Promise<ConstituencyListing> {
  const rows = await db
    .select({
      number: constituencies.number,
      nameBn: constituencies.nameBn,
      nameEn: constituencies.nameEn,
      slug: constituencies.slug,
      isReservedWomen: constituencies.isReservedWomen,
      boundaryBn: constituencies.boundaryBn,
      districtNameBn: districts.nameBn,
      districtNameEn: districts.nameEn,
      districtSlug: districts.slug,
      divisionNameBn: divisions.nameBn,
      divisionNameEn: divisions.nameEn,
      divisionSlug: divisions.slug,
    })
    .from(constituencies)
    .innerJoin(parliaments, eq(parliaments.id, constituencies.parliamentId))
    .leftJoin(districts, eq(districts.id, constituencies.districtId))
    .leftJoin(divisions, eq(divisions.id, districts.divisionId))
    .where(eq(parliaments.number, parliamentNumber))
    .orderBy(asc(constituencies.number));

  const list: ConstituencyRow[] = rows.map((r) => ({
    number: r.number,
    nameBn: r.nameBn,
    nameEn: r.nameEn,
    slug: r.slug,
    isReservedWomen: r.isReservedWomen,
    boundaryBn: r.boundaryBn,
    district: r.districtSlug ? { nameBn: r.districtNameBn!, nameEn: r.districtNameEn!, slug: r.districtSlug } : null,
    division: r.divisionSlug ? { nameBn: r.divisionNameBn!, nameEn: r.divisionNameEn!, slug: r.divisionSlug } : null,
  }));
  return groupListing(parliamentNumber, list);
}

/** Shared by the database path and the fixture path. */
export function groupListing(parliamentNumber: number, list: ConstituencyRow[]): ConstituencyListing {
  const divMap = new Map<string, DivisionGroup>();
  const reservedSeats: ConstituencyRow[] = [];
  for (const c of list) {
    if (c.isReservedWomen || !c.division || !c.district) {
      reservedSeats.push(c);
      continue;
    }
    const g = divMap.get(c.division.slug) ?? { division: c.division, districts: [] };
    let d = g.districts.find((x) => x.district.slug === c.district!.slug);
    if (!d) {
      d = { district: c.district, constituencies: [] };
      g.districts.push(d);
    }
    d.constituencies.push(c);
    divMap.set(c.division.slug, g);
  }
  return {
    parliamentNumber,
    total: list.length,
    territorial: list.length - reservedSeats.length,
    reserved: reservedSeats.length,
    divisions: [...divMap.values()],
    reservedSeats,
  };
}
