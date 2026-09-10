import { describe, expect, it } from 'vitest';
import { buildIndex, matchArticle, type MatchMember } from './match';

// Invented people, so no real person is tied to a test headline.
const member = (id: number, nameBn: string, nameEn: string | null, seatBn: string | null, districtBn: string | null, roles: string[] = [], aliases: MatchMember['aliases'] = []): MatchMember => ({
  id,
  externalId: `TEST_${id}`,
  nameBn,
  nameEn,
  aliases,
  seatBn,
  seatEn: null,
  districtBn,
  districtEn: null,
  roles,
});

const members: MatchMember[] = [
  member(1, 'করিমুল ইসলাম চৌধুরী রাজু', 'Karimul Islam Chowdhury Raju', 'নদীগ্রাম-১', 'নদীগ্রাম'),
  member(2, 'তানভীর হাসান', 'Tanvir Hasan', 'সাগরকূল-২', 'সাগরকূল', ['Prime Minister']),
  member(3, 'মো. আব্দুল আজিজ', 'Md. Abdul Aziz', 'উত্তরপাড়া-৩', 'উত্তরপাড়া'),
  member(4, 'মোঃ আব্দুল আজিজ', 'Md Abdul Aziz', 'পূর্বগাঁও-১', 'পূর্বগাঁও'),
  member(5, 'রফিক উদ্দিন', 'Rafiq Uddin', 'দক্ষিণপুর-৪', 'দক্ষিণপুর'),
  member(6, 'রফিক উদ্দিন খান মজলিস', 'Rafiq Uddin Khan Majlis', 'পশ্চিমপাড়া-২', 'পশ্চিমপাড়া'),
  member(7, 'ব্যারিস্টার সেলিনা পারভীন সুলতানা', null, 'মধ্যনগর-১', 'মধ্যনগর', ['Chief Whip'], [{ alias: 'সেলিনা পারভীন সুলতানা', language: 'bn' }]),
];
const index = buildIndex(members);
const ids = (title: string, summary: string | null = null) => matchArticle(index, title, summary).map((m) => `${m.memberId}:${m.status}`);

describe('news matcher', () => {
  it('publishes a distinctive full name with MP context automatically', () => {
    const [m] = matchArticle(index, 'এমপি করিমুল ইসলাম চৌধুরী রাজুর উদ্যোগে নদীগ্রামে সেতু');
    expect(m).toMatchObject({ memberId: 1, status: 'auto' });
    expect(m!.reason).toContain('MP word');
  });

  it('holds a distinctive full name without context for an editor', () => {
    expect(ids('করিমুল ইসলাম চৌধুরী রাজু বললেন, উন্নয়ন চলবে')).toEqual(['1:pending']);
  });

  it('never links a bare two-word name', () => {
    expect(ids('তানভীর হাসান গ্রেপ্তার')).toEqual([]);
    expect(ids('রফিক উদ্দিন নামে এক ব্যবসায়ী নিখোঁজ')).toEqual([]);
  });

  it("lets a unique office carry a short name, but only for the member who holds it", () => {
    expect(ids('প্রধানমন্ত্রী তানভীর হাসানের সঙ্গে বৈঠক')).toEqual(['2:auto']);
    expect(ids('PM Tanvir Hasan meets business leaders')).toEqual(['2:auto']);
    // The same office word next to a different short name adds nothing to that name.
    expect(ids('প্রধানমন্ত্রীর সঙ্গে দেখা করলেন রফিক উদ্দিন')).toEqual([]);
  });

  it('keeps a name two members share in review unless the seat settles it', () => {
    expect(ids('এমপি মো. আব্দুল আজিজের বক্তব্য')).toEqual(['3:pending', '4:pending']);
    const settled = matchArticle(index, 'উত্তরপাড়া-৩ আসনের এমপি মোঃ আব্দুল আজিজ বললেন');
    expect(settled.map((m) => `${m.memberId}:${m.status}`)).toEqual(['3:auto']);
  });

  it('does not find a shorter name inside a longer one', () => {
    expect(ids('এমপি রফিক উদ্দিন খান মজলিসের সংবর্ধনা')).toEqual(['6:auto']);
    expect(ids('আব্দুল আজিজুল হক এমপি হলেন')).toEqual([]);
  });

  it('reads Bangla case endings and honorific-free aliases', () => {
    expect(ids('চিফ হুইপ সেলিনা পারভীন সুলতানাকে সংবর্ধনা')).toEqual(['7:auto']);
    expect(ids('করিমুল ইসলাম চৌধুরী রাজুর বিরুদ্ধে অভিযোগ, জানালেন নদীগ্রাম-১ আসনের ভোটাররা')).toEqual(['1:auto']);
  });

  it('does not take a former MP with a longer name for a sitting member', () => {
    const idx = buildIndex([member(8, 'মোঃ মনোয়ার হোসেন', 'Md. Monowar Hossain', 'চরপাড়া-২', 'চরপাড়া', [], [{ alias: 'মনোয়ার হোসেন', language: 'bn' }])]);
    expect(matchArticle(idx, 'আ. লীগের সাবেক এমপি মনোয়ার হোসেন চৌধুরী গ্রেপ্তার')).toEqual([]);
    expect(matchArticle(idx, 'সাবেক এমপি মনোয়ার হোসেনকে নিয়ে প্রশ্ন')).toEqual([]);
    // Name, MP word and the member's own seat together: that is the sitting member.
    expect(matchArticle(idx, 'চরপাড়া-২ আসনের এমপি মনোয়ার হোসেনের উঠান বৈঠক').map((m) => m.status)).toEqual(['auto']);
  });

  it('gives a name found only in the summary a little less weight', () => {
    const inTitle = matchArticle(index, 'করিমুল ইসলাম চৌধুরী রাজু বললেন')[0]!;
    const inSummary = matchArticle(index, 'উন্নয়ন নিয়ে বক্তব্য', 'করিমুল ইসলাম চৌধুরী রাজু বললেন')[0]!;
    expect(inSummary.confidence).toBeLessThan(inTitle.confidence);
    expect(inSummary.reason).toContain('only in the summary');
  });
});
