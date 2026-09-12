import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareNames, nameTokens, buildIdf, rankMatches, matchStrength, FIRST_TOKEN_MIN } from '../nameMatch';
import { NAME_IDF } from '../nameIdf';

// Run with: npm test

/**
 * Every pair below was suggested by the old whole-string scorer, some at 89%,
 * and every one is two different people. What they share is a last word that a
 * large share of the House shares: রহমান, রশিদ, হক, ইসলাম, আমিন.
 */
const DIFFERENT_PEOPLE: [string, string][] = [
  ['ড. খলিলুর রহমান', 'মুহাম্মাদ আজীজুর রহমান'],
  ['জনাব মোহাম্মদ আমিন উর রশিদ', 'মোঃ হারুন-অর-রশিদ'],
  ['জনাব মোঃ আমিনুল হক', 'মোঃ মমিনুল হক'],
  ['জনাব নজরুল ইসলাম খান', 'মোঃ আমিরুল ইসলাম খান'],
  ['ব্রিগেডিয়ার জেনারেল (অব:) ড. এ কে এম শামছুল ইসলাম', 'এ টি এম আজহারুল ইসলাম'],
  ['জনাব মাহ্‌দী আমিন', 'মোঃ রুহুল আমিন'],
  ['ডাঃ জাহেদ উর রহমান', 'মোঃ জাহিদুর রহমান'],
  ['জনাব নজরুল ইসলাম খান', 'মোঃ নজরুল ইসলাম আজাদ'],
];

/** The same person, written by two lists that disagree about honorifics and spelling. */
const SAME_PERSON: [string, string][] = [
  ['মোঃ আব্দুল করিম', 'মো. আবদুল করিম'],
  ['ডা. শফিকুর রহমান', 'ডাঃ মোহাম্মদ শফিকুর রহমান'],
  ['ব্যারিস্টার কায়সার কামাল', 'কায়সার কামাল'],
  ['হাফিজ উদ্দিন আহমদ বীর বিক্রম', 'হাফিজ উদ্দিন আহমদ'],
];

for (const [a, b] of DIFFERENT_PEOPLE) {
  test(`no suggestion: ${a} is not ${b}`, () => {
    assert.equal(compareNames(a, b, NAME_IDF).ok, false);
    assert.equal(compareNames(b, a, NAME_IDF).ok, false, 'the answer cannot depend on which name is asked about');
  });
}

for (const [a, b] of SAME_PERSON) {
  test(`still matches: ${a} is ${b}`, () => {
    const s = compareNames(a, b, NAME_IDF);
    assert.equal(s.ok, true, `score ${s.score.toFixed(2)}, first ${s.first.toFixed(2)}, matched ${s.matched}`);
  });
}

test('a shared surname alone never suggests, however common the surname', () => {
  for (const surname of ['রহমান', 'ইসলাম', 'হক', 'খান', 'আহমেদ', 'উদ্দিন', 'আলী']) {
    const s = compareNames(`কামরুল ${surname}`, `সাইফুল ${surname}`, NAME_IDF);
    assert.equal(s.ok, false, surname);
    assert.ok(s.first < FIRST_TOKEN_MIN, `${surname}: the first tokens must not count as a match`);
  }
});

test('honorifics, ranks, initials and gallantry titles are not part of the name', () => {
  assert.deepEqual(nameTokens('ব্রিগেডিয়ার জেনারেল (অব:) ড. এ কে এম শামছুল ইসলাম'), ['সামছুল', 'ইসলাম']);
  assert.deepEqual(nameTokens('জনাব মোঃ আমিনুল হক'), ['আমিনুল', 'হক']);
  assert.deepEqual(nameTokens('হাফিজ উদ্দিন আহমদ বীর বিক্রম'), nameTokens('হাফিজ উদ্দিন আহমদ'));
  assert.deepEqual(nameTokens('মাহ্‌দী   আমিন'), nameTokens('মাহদী আমিন'));
});

test('a hyphenated name is three words, not one', () => {
  assert.deepEqual(nameTokens('মোঃ হারুন-অর-রশিদ'), ['হারুন', 'অর', 'রসিদ']);
});

test('a name that is only initials keeps them', () => {
  assert.deepEqual(nameTokens('এ কে এম'), ['এ', 'কে', 'এম']);
});

test('rare words carry a match, common ones cannot', () => {
  const idf = buildIdf(['কামরুল ইসলাম', 'সাইফুল ইসলাম', 'নজরুল ইসলাম', 'রফিকুল ইসলাম', 'তারেক জিয়াউদ্দিন']);
  // Same rare first word, different common second: still one person's name to a reader.
  assert.ok(compareNames('তারেক জিয়াউদ্দিন', 'তারেক জিয়াউদ্দিন', idf).ok);
  // Same common second word, different first: never.
  assert.equal(compareNames('কামরুল ইসলাম', 'সাইফুল ইসলাম', idf).ok, false);
});

test('two matching words are the least a suggestion can rest on', () => {
  const s = compareNames('আখতারুজ্জামান', 'মোঃ আখতারুজ্জামান মিয়া', NAME_IDF);
  assert.equal(s.matched, 1);
  assert.equal(s.ok, false);
});

test('rankMatches returns nothing rather than a weak guess', () => {
  const people = [
    { id: '1', nameBn: 'মুহাম্মাদ আজীজুর রহমান' },
    { id: '2', nameBn: 'মোঃ মমিনুল হক' },
    { id: '3', nameBn: 'ডাঃ মোহাম্মদ শফিকুর রহমান' },
  ];
  assert.deepEqual(rankMatches('ড. খলিলুর রহমান', people, NAME_IDF), []);
  assert.deepEqual(rankMatches('জনাব মোঃ আমিনুল হক', people, NAME_IDF), []);
  const hit = rankMatches('ডা. শফিকুর রহমান', people, NAME_IDF);
  assert.equal(hit.length, 1);
  assert.equal(hit[0]!.id, '3');
});

test('the strength of a match is said in words, not in a percentage', () => {
  assert.equal(matchStrength(1), 'সম্ভাব্য');
  assert.equal(matchStrength(0.93), 'দুর্বল মিল');
});

test('the built table knows the House: ইসলাম and রহমান are common, a given name is not', () => {
  assert.ok(NAME_IDF.names > 300, 'the table is built from the member list');
  assert.ok((NAME_IDF.df['ইসলাম'] ?? 0) > 20);
  assert.ok((NAME_IDF.df['রহমান'] ?? 0) > 20);
});
