import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedIndex, matchItem, ministryWord, textTokens, type FeedMp } from '../matchMp';
import { seedVariants } from '../nameVariants';

// Run with: npm test
//
// Every headline here is a real one the সংসদ engine collected between
// 2026-09-04 and 2026-09-12.

const MEMBERS: Omit<FeedMp, 'variants'>[] = [
  { id: 'rumin', nameBn: 'রুমিন ফারহানা', nameEn: 'Rumeen Farhana', seatBn: 'ব্রাহ্মণবাড়িয়া-২', seatEn: 'Brahmanbaria-2', districtBn: 'ব্রাহ্মণবাড়িয়া', districtEn: 'Brahmanbaria', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: [], ministries: [] },
  { id: 'moyeen', nameBn: 'ড, আবদুল মঈন খান', nameEn: 'DR. ABDUL MOYEEN KHAN', seatBn: 'নরসিংদী-২', seatEn: 'Narsingdi-2', districtBn: 'নরসিংদী', districtEn: 'Narsingdi', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: ['মন্ত্রী'], ministries: ['স্থানীয় সরকার, পল্লী উন্নয়ন ও সমবায় মন্ত্রণালয়'] },
  { id: 'salahuddin', nameBn: 'সালাহউদ্দিন আহমদ', nameEn: 'Salahuddin Ahmed', seatBn: 'কক্সবাজার-১', seatEn: 'Cox\'sBazar-1', districtBn: 'কক্সবাজার', districtEn: 'Cox\'s Bazar', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: ['মন্ত্রী'], ministries: ['পররাষ্ট্র মন্ত্রণালয়'] },
  { id: 'tarique', nameBn: 'তারেক রহমান', nameEn: 'Tarique Rahman', seatBn: 'ঢাকা-১৭', seatEn: 'Dhaka-17', districtBn: 'ঢাকা', districtEn: 'Dhaka', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: ['প্রধানমন্ত্রী'], ministries: ['মন্ত্রিপরিষদ বিভাগ'] },
  { id: 'hafiz', nameBn: 'হাফিজ উদ্দিন আহমদ বীর বিক্রম', nameEn: 'Hafiz Uddin Ahmad', seatBn: 'ভোলা-৩', seatEn: 'Bhola-3', districtBn: 'ভোলা', districtEn: 'Bhola', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: ['স্পিকার'], ministries: [] },
  { id: 'moni', nameBn: 'নূরুল ইসলাম মনি', nameEn: 'Nurul Islam Moni', seatBn: 'বরগুনা-২', seatEn: 'Barguna-2', districtBn: 'বরগুনা', districtEn: 'Barguna', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: ['চিফ হুইপ'], ministries: [] },
  { id: 'bobby', nameBn: 'ববি হাজ্জাজ', nameEn: 'Bobby Hajjaj', seatBn: 'ঢাকা-১৩', seatEn: 'Dhaka-13', districtBn: 'ঢাকা', districtEn: 'Dhaka', partyBn: 'ন্যাশনাল ডেমোক্রেটিক মুভমেন্ট', partyAbbr: 'NDM', posts: ['প্রতিমন্ত্রী'], ministries: ['প্রাথমিক ও গণশিক্ষা মন্ত্রণালয়'] },
  { id: 'jahidur', nameBn: 'মোঃ জাহিদুর রহমান', nameEn: 'Md Jahidur Rahman', seatBn: 'ঠাকুরগাঁও-৩', seatEn: 'Thakurgaon-3', districtBn: 'ঠাকুরগাঁও', districtEn: 'Thakurgaon', partyBn: 'বাংলাদেশ জাতীয়তাবাদী দল', partyAbbr: 'BNP', posts: [], ministries: [] },
  { id: 'azizur', nameBn: 'মুহাম্মাদ আজীজুর রহমান', nameEn: 'Muhammad Azizur Rahman', seatBn: 'যশোর-১', seatEn: 'Jashore-1', districtBn: 'যশোর', districtEn: 'Jashore', partyBn: 'বাংলাদেশ জামায়াতে ইসলামী', partyAbbr: 'BJEI', posts: [], ministries: [] },
];

const seeds = seedVariants(MEMBERS);
const INDEX = buildFeedIndex(
  MEMBERS.map((m) => ({ ...m, variants: seeds.filter((s) => s.mpId === m.id).map((s) => ({ variant: s.variant, weight: s.weight })) })),
);

const who = (title: string, summary?: string) => matchItem(INDEX, { title, summary }).map((m) => m.mpId);
const scoreOf = (title: string, id: string, summary?: string) => matchItem(INDEX, { title, summary }).find((m) => m.mpId === id)?.score ?? 0;

test('a member named in the headline is attached', () => {
  assert.deepEqual(who('আমাকে সংসদে অকথ্য ভাষায় গালাগালি করা হয়েছে: রুমিন ফারহানা'), ['rumin']);
  assert.ok(scoreOf('এই সংসদে ভিন্নমত প্রকাশ করা যায় না: রুমিন ফারহানা', 'rumin') >= 60);
});

test('a case ending on the last word is still the name', () => {
  // "খানের", "আহমেদের": the genitive, and আহমেদ where the member list writes আহমদ.
  const ids = who('দায়িত্ব বাড়ল সালাহউদ্দিন আহমেদ ও মঈন খানের');
  assert.deepEqual(ids.sort(), ['moyeen', 'salahuddin']);
  assert.ok(scoreOf('ড. মঈন খান ও সালাহউদ্দিন আহমেদের সংসদীয় দায়িত্ব বাড়ল', 'moyeen') >= 60);
});

test('an article naming two members attaches to both', () => {
  const ids = who(
    'তারেক রহমান বাংলাদেশে তৃণমূলের রাজনীতির সূচনা করেছেন: মঈন খান',
    'স্থানীয় সরকার, পল্লী উন্নয়ন ও সমবায় মন্ত্রী ড. আবদুল মঈন খান বলেছেন, ২০০১ সাল থেকে',
  );
  assert.deepEqual(ids.sort(), ['moyeen', 'tarique']);
});

test('an office title adds to a name and never stands in for one', () => {
  assert.ok(scoreOf('দিল্লিতে ব্রিকস সম্মেলনে যাচ্ছেন না প্রধানমন্ত্রী তারেক রহমান', 'tarique') >= 90);
  // The office alone is 30, under the floor: nobody is named, so nobody is attached.
  assert.deepEqual(who('বাকস্বাধীনতা যেন বাকশালীনতার সীমা লঙ্ঘন না করে: প্রধানমন্ত্রী'), []);
});

test('a name in the summary carries the office title over the floor', () => {
  const ids = who(
    'দেশের জনসংখ্যাকে জনসম্পদে রূপান্তর করতে হবে: স্পিকার',
    'জাতীয় সংসদের স্পিকার হাফিজ উদ্দিন আহমদ বীর বিক্রম বলেছেন, একটি দেশের বড় সম্পদ সেই দেশের মানুষ',
  );
  assert.deepEqual(ids, ['hafiz']);
  assert.equal(scoreOf('দেশের জনসংখ্যাকে জনসম্পদে রূপান্তর করতে হবে: স্পিকার', 'hafiz', 'জাতীয় সংসদের স্পিকার হাফিজ উদ্দিন আহমদ বীর বিক্রম বলেছেন'), 65);
});

test('the chief whip is found by name in the summary plus his office', () => {
  assert.deepEqual(
    who('মোবাইল হ্যাকিং ও ভয়েস ক্লোনিং নিয়ে এমপিদের সতর্ক করলেন চিফ হুইপ', 'জাতীয় সংসদের চিফ হুইপ মো. নুরুল ইসলাম মনি সংসদ সদস্যদের মোবাইল ফোন হ্যাকিং নিয়ে সতর্ক করেছেন'),
    ['moni'],
  );
});

test('a shared surname is not a mention', () => {
  // The pair the cabinet matcher got wrong, now as a headline.
  assert.deepEqual(who('খলিলুর রহমানের সঙ্গে বৈঠক'), []);
  assert.equal(scoreOf('আজীজুর রহমানের বক্তব্য', 'jahidur'), 0);
  assert.deepEqual(who('রহমান ও ইসলামের মধ্যে আলোচনা'), []);
});

test('a story about nobody attaches to nobody', () => {
  assert.deepEqual(who('ট্রাফিক আইন লঙ্ঘনে একদিনে ডিএমপির ২২০৬ মামলা'), []);
  assert.deepEqual(who('Time to clean up our polythene problem'), []);
  // A party and no person: this used to land on the party leader's page.
  assert.deepEqual(who('ঋণখেলাপির অভিশাপ থেকে দেশকে মুক্ত করবে বিএনপি'), []);
});

test('a namesake with another job is scored down below the floor', () => {
  assert.deepEqual(who('ক্রিকেটার তারেক রহমান দলে ফিরছেন'), []);
  assert.deepEqual(who('অভিনেতা সালাহউদ্দিন আহমেদের নতুন ছবি'), []);
});

test('the constituency lifts a name that is only in the summary', () => {
  // 35 for the name in the summary + 25 for his own seat = 60.
  assert.equal(
    scoreOf('বিদ্যুৎ সংকট নিয়ে সংসদে প্রশ্ন', 'jahidur', 'ঠাকুরগাঁও-৩ আসনের সংসদ সদস্য মোঃ জাহিদুর রহমান প্রশ্ন তোলেন'),
    60,
  );
});

test('the member list spelling and the headline spelling meet', () => {
  // জাহিদুর/জাহেদুর are different people, so only the real one matches.
  assert.deepEqual(who('ঠাকুরগাঁওয়ে জাহিদুর রহমানের গণসংযোগ'), ['jahidur']);
  assert.deepEqual(who('জাহেদ উর রহমানের কলাম'), []);
});

test('short forms are seeded only when they belong to one member', () => {
  const shorts = seeds.filter((s) => s.mpId === 'moyeen').map((s) => s.variant);
  assert.ok(shorts.includes('মঈন খান'), shorts.join(' | '));
  // Both রহমানs keep their full names; neither gets "রহমান" alone.
  assert.ok(!seeds.some((s) => s.variant.split(' ').length < 2));
});

test('a ministry is read as the title a headline uses', () => {
  assert.equal(ministryWord('পররাষ্ট্র মন্ত্রণালয়'), 'পররাষ্ট্রমন্ত্রী');
  assert.equal(ministryWord('স্থানীয় সরকার, পল্লী উন্নয়ন ও সমবায় মন্ত্রণালয়'), null);
});

test('text is tokenised past punctuation and Bangla digits', () => {
  // The chandrabindu folds away on both sides, so the seat still matches.
  assert.deepEqual(textTokens('ঠাকুরগাঁও-৩ আসনের এমপি!'), ['ঠাকুরগাও', '৩', 'আসনের', 'এমপি']);
});
