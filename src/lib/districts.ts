import { seats, districtOf } from './data';

export interface DistrictGroup {
  en: string;
  bn: string;
  slug: string;
  seats: typeof seats;
}

/**
 * Every district that holds at least one territorial seat, in seat order, with
 * its seats. The district pages, the district index and the seat index all read
 * the same grouping, so a change in districtOf cannot make them disagree.
 */
export function districtGroups(): Map<string, DistrictGroup> {
  const map = new Map<string, DistrictGroup>();
  for (const s of seats) {
    const d = districtOf(s);
    if (!d) continue;
    const e = map.get(d.slug) ?? { ...d, seats: [] as typeof seats };
    e.seats.push(s);
    map.set(d.slug, e);
  }
  return map;
}

/** The same groups as a list, in the order the seats are numbered. */
export const districtList = (): DistrictGroup[] => [...districtGroups().values()];
