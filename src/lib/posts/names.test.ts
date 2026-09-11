import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, normalizeNameEn, nameSimilarity, ministryKey } from './names';

// Run with: npm test

test('মোঃ আব্দুল করিম and মো. আবদুল করিম are one name', () => {
  assert.equal(normalizeName('মোঃ আব্দুল করিম'), normalizeName('মো. আবদুল করিম'));
});

test('ডা. শফিকুর রহমান and ডাঃ মোহাম্মদ শফিকুর রহমান are one name', () => {
  assert.equal(normalizeName('ডা. শফিকুর রহমান'), normalizeName('ডাঃ মোহাম্মদ শফিকুর রহমান'));
});

test('ব্যারিস্টার কায়সার কামাল and কায়সার কামাল are one name', () => {
  assert.equal(normalizeName('ব্যারিস্টার কায়সার কামাল'), normalizeName('কায়সার কামাল'));
});

test('the parliament spelling ব্যারিষ্টার folds the same way', () => {
  assert.equal(normalizeName('ব্যারিষ্টার কায়সার কামাল'), normalizeName('কায়সার কামাল'));
});

test('the cabinet list\'s জনাব, ranks, (অব:) and a trailing credential go', () => {
  assert.equal(normalizeName('জনাব তারেক রহমান'), normalizeName('তারেক রহমান'));
  assert.equal(
    normalizeName('ব্রিগেডিয়ার জেনারেল (অব:) ড. এ কে এম শামছুল ইসলাম'),
    normalizeName('এ কে এম শামছুল ইসলাম'),
  );
  assert.equal(normalizeName('চৌধুরী আশিক মাহমুদ বিন হারুন, সিএফএ'), normalizeName('চৌধুরী আশিক মাহমুদ বিন হারুন'));
});

test('commas between initials are not a credential', () => {
  assert.equal(normalizeName('এ, জেড, এম, রেজওয়ানুল হক'), normalizeName('এ জেড এম রেজওয়ানুল হক'));
  assert.notEqual(normalizeName('এ, জেড, এম, রেজওয়ানুল হক'), normalizeName('এ, কে, এম, সেলিম রেজা হাবিব'));
  assert.equal(normalizeName('এস,এম, রফিকুল ইসলাম'), normalizeName('এস এম রফিকুল ইসলাম'));
  assert.equal(normalizeName('ড, আবদুল মঈন খান'), normalizeName('আবদুল মঈন খান'));
});

test('zero-width joiners and extra spaces do not matter', () => {
  assert.equal(normalizeName('মাহ্‌দী   আমিন'), normalizeName('মাহ্দী আমিন'));
});

test('a gallantry title after the name goes', () => {
  assert.equal(normalizeName('হাফিজ উদ্দিন আহমদ বীর বিক্রম'), normalizeName('হাফিজ উদ্দিন আহমদ'));
});

test('initials stay part of the name', () => {
  assert.notEqual(normalizeName('এ কে এম শামছুল ইসলাম'), normalizeName('শামছুল ইসলাম'));
});

test('different people stay apart', () => {
  assert.notEqual(normalizeName('মোঃ আব্দুল করিম'), normalizeName('মোঃ আব্দুর রহিম'));
  assert.ok(nameSimilarity(normalizeName('তারেক রহমান'), normalizeName('মিজানুর রহমান')) < 0.9);
});

test('similarity is 1 for equal names and scales with edits', () => {
  assert.equal(nameSimilarity('abc', 'abc'), 1);
  assert.equal(nameSimilarity('abcd', 'abce'), 0.75);
});

test('ministry names compare past the lists\' typing slips', () => {
  assert.equal(ministryKey('প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংংস্থান মন্ত্রণালয়'), ministryKey('প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়'));
  assert.equal(ministryKey('বিজ্ঞানও প্রযুক্তি মন্ত্রণালয়'), ministryKey('বিজ্ঞান ও প্রযু্ক্তি মন্ত্রণালয়'));
  assert.notEqual(ministryKey('শিক্ষা মন্ত্রণালয়'), ministryKey('প্রাথমিক ও গণশিক্ষা মন্ত্রণালয়'));
});

test('English names drop Md., Barrister and punctuation', () => {
  assert.equal(normalizeNameEn('Barrister Kayser Kamal'), normalizeNameEn('Kayser Kamal'));
  assert.equal(normalizeNameEn('Md. Abdul Karim'), normalizeNameEn('Mohammad Abdul Karim'));
});
