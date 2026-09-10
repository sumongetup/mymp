import { describe, expect, it } from 'vitest';
import { assertNoPrivateFields, buildMirror, checkMirror, mirrorCommittee, mirrorMember, mirrorOfficer, mirrorPaths } from './mirror';

// Shaped like parliament.gov.bd's records, private fields included on purpose.
const rawMember = (n: number, mobile: string | null) => ({
  id: n,
  externalId: `TEST_0130${n}`,
  userId: 900 + n,
  empId: 5000 + n,
  nameEng: `TEST_Member ${n}`,
  nameBng: `TEST_সদস্য ${n}`,
  fatherNameEng: 'TEST_Father',
  motherNameBng: 'TEST_মা',
  dateOfBirth: '1960-01-01',
  isFreedomFighter: false,
  mobile,
  additionalMobile: '01700000000',
  email: `test${n}@parliament.gov.bd`,
  additionalEmail: 'TEST_private@example.com',
  presentAddressEng: 'TEST_Road',
  presentAddressBng: 'TEST_রাস্তা',
  permanentAddressBng: 'TEST_গ্রাম',
  gender: 'Male',
  photoUrl: 'https://prp.parliament.gov.bd/api/files?_=TEST',
  signUrl: 'https://prp.parliament.gov.bd/api/files?_=TEST_SIGNATURE',
  professionBn: 'TEST_পেশা',
  terms: [
    {
      id: 1, memberId: n, parliamentNo: 13, startDate: '2026-02-17', endDate: null, status: 'ACTIVE', isPm: false, isSpeaker: false,
      isDeputySpeaker: false, isOppositionLeader: false,
      party: { id: 7, abbreviation: 'TEST', nameEng: 'TEST_Party', nameBng: 'TEST_দল', president: 'TEST_President', email: 'party@example.com' },
      constituency: { id: 3, constituencyNo: n, constituencyEng: `TEST_Seat-${n}`, constituencyBng: `TEST_আসন-${n}`, boundaryDetails: 'TEST_সীমানা', thana: 'x', division: { id: 1 } },
    },
  ],
});

describe('the public mirror', () => {
  it('keeps what mymp.bd uses and drops every private field', () => {
    const m = mirrorMember(rawMember(1, '01711111111'));
    expect(m).toMatchObject({
      externalId: 'TEST_01301', empId: 5001, nameBng: 'TEST_সদস্য 1', fatherNameEng: 'TEST_Father', email: 'test1@parliament.gov.bd',
      permanentAddressBng: 'TEST_গ্রাম', hasMobile: true,
    });
    for (const k of ['mobile', 'additionalMobile', 'additionalEmail', 'signUrl', 'userId', 'presentAddressEng']) expect(m).not.toHaveProperty(k);
    const term = (m.terms as Record<string, unknown>[])[0]!;
    expect(term.party).toEqual({ id: 7, abbreviation: 'TEST', nameEng: 'TEST_Party', nameBng: 'TEST_দল' });
    expect(term.constituency).toEqual({ constituencyNo: 1, constituencyEng: 'TEST_Seat-1', constituencyBng: 'TEST_আসন-1', boundaryDetails: 'TEST_সীমানা' });
    expect(mirrorMember(rawMember(2, '')).hasMobile).toBe(false);
    expect(mirrorMember(rawMember(3, null)).hasMobile).toBe(false);
  });

  it('reduces committee members to their id and officers to their public fields', () => {
    const c = mirrorCommittee({ id: 5, nameEn: 'TEST_Committee', members: [{ id: 1, role: 'Chairman', officialId: 2, member: rawMember(1, '017') }] });
    expect(c.members).toEqual([{ role: 'Chairman', member: { externalId: 'TEST_01301' } }]);
    const o = mirrorOfficer({ role: 'SPEAKER', nameBn: 'TEST_স্পিকার', tenureTextBn: 'TEST_মেয়াদ', phoneLocal: '02-000', phonePermanent: '017', email: 'x@y', isCurrent: true, parliamentNo: 13, sortOrder: 1 });
    expect(o).toEqual({ role: 'SPEAKER', nameBn: 'TEST_স্পিকার', tenureTextBn: 'TEST_মেয়াদ', isCurrent: true, parliamentNo: 13, sortOrder: 1 });
  });

  it('keys responses by the exact paths mymp.bd requests and refuses a truncated copy', () => {
    const members = Array.from({ length: 300 }, (_, i) => rawMember(i + 1, '017'));
    const doc = buildMirror(
      {
        currentParliament: 13, currentParliamentSourceId: 13, parliaments: [{ id: 13, parliamentNo: 13, status: 'x', hideMember: false }], members,
        committees: [{ id: 1, nameEn: 'TEST_C', members: [] }], sessions: [], notices: [{ id: 1, noticeType: 'GENERAL', branch: 'x' }],
        officers: [{ role: 'SPEAKER', phoneLocal: '1' }], earlier: { 12: [rawMember(999, '017')] },
      },
      new Date('2026-09-11T00:00:00Z'),
    );
    const p = mirrorPaths(13, 13);
    expect(Object.keys(doc.responses).sort()).toEqual(
      [p.parliaments, p.members, p.committees, p.sessions, p.notices, p.officers, p.earlier(12)].sort(),
    );
    expect(doc.responses['/api/members?parliamentNo=13']).toHaveLength(300);
    expect(doc.responses['/api/notices']![0]).toEqual({ id: 1, noticeType: 'GENERAL' });
    expect(doc.fetchedAt).toBe('2026-09-11T00:00:00.000Z');
    expect(JSON.stringify(doc)).not.toMatch(/0170000|TEST_private|SIGNATURE|phoneLocal/);
    expect(() => checkMirror(doc, 13, 13)).not.toThrow();
    const short = { ...doc, responses: { ...doc.responses, [p.members]: doc.responses[p.members]!.slice(0, 10) } };
    expect(() => checkMirror(short, 13, 13)).toThrow(/at least 300/);
  });

  it('catches a private field anywhere in the document', () => {
    expect(() => assertNoPrivateFields({ a: [{ b: { mobile: '017' } }] })).toThrow('$.a[0].b.mobile');
    expect(() => assertNoPrivateFields({ a: [{ b: { hasMobile: true } }] })).not.toThrow();
  });
});
