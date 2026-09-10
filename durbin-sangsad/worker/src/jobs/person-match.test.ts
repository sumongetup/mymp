import { describe, expect, it } from 'vitest';
import { districtKey, samePerson, seatKey, type PersonRecord } from './person-match';

/**
 * Real pairs from parliament.gov.bd that a naive matcher gets wrong. They are
 * public figures' names as the source spells them, not fabricated data; the
 * point of each case is stated in its title.
 */
const rec = (p: Partial<PersonRecord>): PersonRecord => ({ personId: null, nameEn: null, dob: null, seatNo: null, seatName: null, ...p });

describe('seat and district keys', () => {
  it('folds spelling changes and renumbering into one key', () => {
    expect(districtKey('BOGRA-6')).toBe('bogura');
    expect(districtKey('Bogura-6')).toBe('bogura');
    expect(seatKey('CHITTAGONG-8')).toBe('chattogram-8');
    expect(seatKey('Bandarban')).toBe('bandarban-1');
    expect(seatKey(null)).toBeNull();
  });
});

describe('samePerson', () => {
  it('rejects one person id shared by two different men in neighbouring districts', () => {
    const feni = rec({ personId: 1672, nameEn: 'JOYNAL ABDIN', dob: '1948-05-01', seatNo: 266, seatName: 'Feni-2' });
    const noakhali2001 = rec({ personId: 1672, nameEn: 'Joynul Abdin Faruk', dob: '1900-01-01', seatNo: 269, seatName: 'NOAKHALI-1' });
    expect(samePerson(feni, noakhali2001)).toBeNull();
  });

  it('accepts a person id when the seat corroborates it, across a spelling change', () => {
    const cur = rec({ personId: 1340, nameEn: 'Md Lutfozzaman Babar', dob: '1958-10-10', seatNo: 157, seatName: 'Netrokona-4' });
    const old = rec({ personId: 1340, nameEn: 'Md. Lutfuzzaman Babor', dob: '1900-01-01', seatNo: 157, seatName: 'NETROKONA-4' });
    expect(samePerson(cur, old)).toBe('person-id');
  });

  it('accepts a person id when the name is similar and the district agrees, even with a different seat number', () => {
    const cur = rec({ personId: 1689, nameEn: 'Amir Khosru Mahmud Chowdhury', dob: '1950-02-20', seatNo: 288, seatName: 'Chattogram-11' });
    const old = rec({ personId: 1689, nameEn: 'Amir Khashru Mahmud Chowdhury', dob: '1900-01-01', seatNo: 285, seatName: 'CHITTAGONG-8' });
    expect(samePerson(cur, old)).toBe('person-id');
  });

  it('never matches on name alone', () => {
    const cur = rec({ personId: 22017839, nameEn: 'Md. Abdul Aziz', dob: '1959-06-26', seatNo: 61, seatName: 'Natore-4' });
    const other = rec({ personId: 3208605, nameEn: 'Md. Abdul Aziz', dob: '1963-04-23', seatNo: 64, seatName: 'Sirajganj-3' });
    expect(samePerson(cur, other)).toBeNull();
    const noDob = rec({ personId: null, nameEn: 'Md. Abdul Aziz', dob: '1900-01-01', seatNo: 64, seatName: 'SIRAJGANJ-3' });
    expect(samePerson(cur, noDob)).toBeNull();
  });

  it('accepts a similar name with an equal real birth date when the ids differ', () => {
    const cur = rec({ personId: 22017820, nameEn: 'ANDALEEVE RAHMAN', dob: '1974-04-20', seatNo: 115, seatName: 'Bhola-1' });
    const old = rec({ personId: 167, nameEn: 'Andaleeve Rahman', dob: '1974-04-20', seatNo: null, seatName: null });
    expect(samePerson(cur, old)).toBe('name+dob');
  });

  it('accepts a similar name in the same named seat when the old birth date is a placeholder', () => {
    const cur = rec({ personId: 22017833, nameEn: 'Hafiz Uddin Ahmad Bir Bikram', dob: '1944-10-29', seatNo: 117, seatName: 'Bhola-3' });
    const old = rec({ personId: 1221, nameEn: 'Hafiz Uddin Ahmmad Bir Bikram', dob: '1900-01-01', seatNo: 117, seatName: 'BHOLA-3' });
    expect(samePerson(cur, old)).toBe('name+seat');
  });

  it('lets a real, different birth date veto everything, including a shared id', () => {
    const cur = rec({ personId: 57, nameEn: 'Hafiz Uddin Ahmad Bir Bikram', dob: '1944-10-29', seatNo: 117, seatName: 'Bhola-3' });
    const other = rec({ personId: 57, nameEn: 'Hafiz Uddin Ahmed', dob: '1946-02-03', seatNo: 3, seatName: 'Thakurgaon-3' });
    expect(samePerson(cur, other)).toBeNull();
  });
});
