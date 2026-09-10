import 'server-only';
import {
  fixturesEnabled,
  getDb,
  groupListing,
  listConstituencies,
  loadFixture,
  type ConstituencyListing,
  type ConstituencyRow,
} from '@durbin/db';

interface FixtureFile {
  parliamentNumber: number;
  constituencies: {
    number: number;
    name_bn: string;
    name_en: string;
    slug: string;
    isReservedWomen: boolean;
    boundaryBn: string | null;
    district: { name_bn: string; name_en: string; slug: string } | null;
    division: { name_bn: string; name_en: string; slug: string } | null;
  }[];
}

/** One read model for the listing page, from Postgres or, in local development, from TEST_ fixtures. */
export async function getListing(): Promise<ConstituencyListing> {
  if (fixturesEnabled()) {
    const f = loadFixture<FixtureFile>('TEST_constituencies.json');
    const rows: ConstituencyRow[] = f.constituencies.map((c) => ({
      number: c.number,
      nameBn: c.name_bn,
      nameEn: c.name_en,
      slug: c.slug,
      isReservedWomen: c.isReservedWomen,
      boundaryBn: c.boundaryBn,
      district: c.district ? { nameBn: c.district.name_bn, nameEn: c.district.name_en, slug: c.district.slug } : null,
      division: c.division ? { nameBn: c.division.name_bn, nameEn: c.division.name_en, slug: c.division.slug } : null,
    }));
    return groupListing(f.parliamentNumber, rows);
  }
  return listConstituencies(getDb());
}

export const usingFixtures = () => fixturesEnabled();
