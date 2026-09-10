import { describe, expect, it } from 'vitest';
import { resolveDistrictDivisions, type SrcConstituency } from './seed-core';

// Shaped like parliament.gov.bd's /api/constituencies: division objects use
// ids 3 (Dhaka), 7 (Sylhet), 9 (Mymensingh); district records number their
// division alphabetically (3 Dhaka, 5 Mymensingh, 8 Sylhet).
const div = (externalId: number, name: string) => ({ externalId, nameEng: name, nameBng: `TEST_${name}` });
const DHAKA = div(3, 'TEST_Dhaka');
const SYLHET = div(7, 'TEST_Sylhet');
const MYMENSINGH = div(9, 'TEST_Mymensingh');
const dist = (externalId: number, name: string, divisionId: number) => ({ externalId, nameEng: name, nameBng: `TEST_${name}`, divisionId });

let n = 0;
const row = (division: ReturnType<typeof div> | null, district: ReturnType<typeof dist>): SrcConstituency => {
  n++;
  return { id: n, externalId: n, electionId: 112, constituencyNo: n, constituencyEng: `TEST_${n}`, constituencyBng: `TEST_${n}`, boundaryDetails: null, division, district };
};

describe('resolveDistrictDivisions', () => {
  it('translates the district numbering by majority and prefers the district record', () => {
    const dhaka = dist(26, 'TEST_DHAKA', 3);
    const tangail = dist(40, 'TEST_TANGAIL', 3);
    const mymensingh = dist(30, 'TEST_MYMENSINGH', 5);
    const kishoreganj = dist(29, 'TEST_KISHOREGONJ', 3);
    const sylhet = dist(63, 'TEST_SYLHET', 8);
    const rows = [
      row(DHAKA, dhaka), row(DHAKA, dhaka), row(DHAKA, dhaka),
      row(DHAKA, tangail), row(DHAKA, tangail),
      row(MYMENSINGH, mymensingh), row(MYMENSINGH, mymensingh),
      row(MYMENSINGH, kishoreganj), // the source's contradiction
      row(SYLHET, sylhet),
    ];
    const { divisionOfDistrict, conflicts } = resolveDistrictDivisions(rows);
    expect(Object.fromEntries(divisionOfDistrict)).toEqual({ 26: 3, 40: 3, 30: 9, 29: 3, 63: 7 });
    expect(conflicts).toEqual(['TEST_KISHOREGONJ: seat rows say TEST_Mymensingh, district record says TEST_Dhaka; district record used']);
  });

  it('falls back to the rows when the record number cannot be translated', () => {
    // Number 4 is voted for equally by two divisions: no translation.
    const a = dist(1, 'TEST_A', 4);
    const b = dist(2, 'TEST_B', 4);
    const orphan = dist(3, 'TEST_C', 6); // no row carries a division
    const { divisionOfDistrict, conflicts } = resolveDistrictDivisions([row(DHAKA, a), row(SYLHET, b), row(null, orphan)]);
    expect(Object.fromEntries(divisionOfDistrict)).toEqual({ 1: 3, 2: 7 });
    expect(conflicts).toEqual([]);
  });
});
