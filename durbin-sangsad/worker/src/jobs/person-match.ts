/**
 * Is an earlier parliament's record the same person as a sitting member?
 *
 * parliament.gov.bd is uneven about identity. From the 11th parliament on,
 * its person id (empId) is reliable. For the 8th and earlier, dates of birth
 * are mostly the placeholder 1900-01-01, names are transliterated differently
 * each time ("Lutfuzzaman Babor" / "Lutfozzaman Babar"), and one id was found
 * on two different men from neighbouring districts. So no single field
 * decides:
 *   - a birth-date conflict (two real, different dates) vetoes everything;
 *   - the same person id needs a corroboration: an equal real birth date, the
 *     same seat by name, or a similar name with no district conflict;
 *   - without an id, a similar name needs an equal real birth date, or the
 *     same seat by name.
 * Name alone never matches: the source has several unrelated members who
 * share a name exactly. Every rule here was checked against real pairs on
 * mymp.bd before being trusted.
 */
import { nameSimilarity } from '@durbin/shared';

export interface PersonRecord {
  personId: number | null;
  nameEn: string | null;
  /** ISO date or null. Placeholders count as null. */
  dob: string | null;
  seatNo: number | null;
  /** From the constituency's English name, e.g. "Bogura-6" or "BOGRA-6". */
  seatName: string | null;
}

const PLACEHOLDER_DOB = new Set(['1900-01-01', '1970-01-01', '0001-01-01']);
export const realDob = (d: string | null | undefined): d is string => !!d && !PLACEHOLDER_DOB.has(d);

/** District spellings changed in 2018 and vary in the older records. */
const DISTRICT_ALIAS: Record<string, string> = {
  bogra: 'bogura',
  comilla: 'cumilla',
  chittagong: 'chattogram',
  chattagram: 'chattogram',
  jessore: 'jashore',
  barisal: 'barishal',
  nawabganj: 'chapainawabganj',
  chapainababganj: 'chapainawabganj',
  moulvibazar: 'maulvibazar',
  netrakona: 'netrokona',
  jhalakathi: 'jhalokati',
  munshigonj: 'munshiganj',
  narayangonj: 'narayanganj',
  coxbazar: 'coxsbazar',
  dacca: 'dhaka',
  kishorganj: 'kishoreganj',
  kishoregonj: 'kishoreganj',
  laxmipur: 'lakshmipur',
  gopalgonj: 'gopalganj',
  habigonj: 'habiganj',
  sunamgonj: 'sunamganj',
  manikgonj: 'manikganj',
  jhenidah: 'jhenaidah',
};

/** "BOGRA-6" → "bogura" */
export function districtKey(seatName: string | null | undefined): string {
  const raw = String(seatName ?? '')
    .replace(/\s*-\s*\d+\s*$/, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return DISTRICT_ALIAS[raw] ?? raw;
}

/**
 * Seats are matched by NAME (district + ordinal), never by number: the 2008
 * delimitation renumbered them, so 2001's Noakhali-1 carried today's
 * Noakhali-2 number. A single-seat district ("Bandarban") counts as seat 1.
 */
export function seatKey(seatName: string | null | undefined): string | null {
  const d = districtKey(seatName);
  if (!d) return null;
  const ord = String(seatName ?? '').match(/-\s*(\d+)\s*$/);
  return `${d}-${ord ? Number(ord[1]) : 1}`;
}

export type MatchReason = 'person-id' | 'name+dob' | 'name+seat';

export function samePerson(cur: PersonRecord, old: PersonRecord): MatchReason | null {
  const nameSim = nameSimilarity(cur.nameEn, old.nameEn);
  const dobEqual = realDob(cur.dob) && realDob(old.dob) && cur.dob === old.dob;
  const dobConflict = realDob(cur.dob) && realDob(old.dob) && cur.dob !== old.dob;
  if (dobConflict) return null;

  const curSeat = seatKey(cur.seatName);
  const oldSeat = seatKey(old.seatName);
  const territorial = (r: PersonRecord) => r.seatNo !== null && r.seatNo <= 300;
  const sameSeat = !!curSeat && curSeat === oldSeat && territorial(old);
  const districtConflict =
    territorial(cur) && territorial(old) && !!districtKey(cur.seatName) && !!districtKey(old.seatName) &&
    districtKey(cur.seatName) !== districtKey(old.seatName);

  if (cur.personId !== null && old.personId !== null && cur.personId === old.personId) {
    if (dobEqual) return 'person-id';
    if (sameSeat) return 'person-id';
    if (nameSim >= 0.7 && !districtConflict) return 'person-id';
    return null;
  }
  if (nameSim >= 0.8 && dobEqual) return 'name+dob';
  if (nameSim >= 0.85 && sameSeat) return 'name+seat';
  return null;
}
