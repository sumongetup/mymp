import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCabinetPage, parseOfficers, parseBnDate, parseBnLongDate } from './parse';

// The layout of cabinet.gov.bd's lists (2026-09-12), cut down to the cases that matter.
const PAGE = `
<p>মন্ত্রীর পদমর্যাদায় উপদেষ্টাগণ</p>
<figure class="table"><table class="ck-table-resized"><thead>
<tr><th>ক্রম</th><th>ছবি</th><th>নাম</th><th>পদবি</th><th>নিয়োগের তারিখ</th><th>দায়িত্ব/মন্ত্রণালয়/বিভাগ</th><th>বণ্টনের তারিখ</th></tr></thead><tbody>
<tr><td colspan="7">উপদেষ্টাগণ</td></tr>
<tr><td rowspan="2">১.</td><td rowspan="2"><img src="https://example.org/a.png"></td><td rowspan="2">জনাব নজরুল ইসলাম খান</td><td rowspan="2">উপদেষ্টা</td><td rowspan="2">১৭-০২-২০২৬</td><td>১. রাজনৈতিক উপদেষ্টা</td><td>০৪-০৩-২০২৬</td></tr>
<tr><td>২. কৃষি মন্ত্রণালয়</td><td>০৬.০৬.২০২৬</td></tr>
<tr><td>২.</td><td></td><td>জনাব মাহ্‌দী আমিন</td><td>উপদেষ্টা</td><td>১৭-০২-২০২৬</td><td>শিক্ষা মন্ত্রণালয়</td><td></td></tr>
</tbody></table></figure>`;

test('a person with two ministries gives two posts, each with its own date', () => {
  const posts = parseCabinetPage(PAGE, { key: 'cabinet_advisers', url: 'https://cabinet.gov.bd/x' });
  assert.equal(posts.length, 3);
  assert.deepEqual(posts.map((p) => [p.nameBn, p.ministryBn, p.fromDate]), [
    ['জনাব নজরুল ইসলাম খান', 'রাজনৈতিক উপদেষ্টা', '2026-03-04'],
    ['জনাব নজরুল ইসলাম খান', 'কৃষি মন্ত্রণালয়', '2026-06-06'],
    ['জনাব মাহ্‌দী আমিন', 'শিক্ষা মন্ত্রণালয়', '2026-02-17'],
  ]);
  assert.equal(posts[0]!.title, 'উপদেষ্টা');
  assert.equal(posts[0]!.rankNote, 'মন্ত্রীর পদমর্যাদা');
  assert.equal(posts[0]!.photoUrl, 'https://example.org/a.png');
  assert.equal(posts[2]!.photoUrl, null);
});

test('Bangla dates in both separators', () => {
  assert.equal(parseBnDate('১৭-০২-২০২৬'), '2026-02-17');
  assert.equal(parseBnDate('০৬.০৬.২০২৬ /'), '2026-06-06');
  assert.equal(parseBnDate('চলমান'), null);
  assert.equal(parseBnLongDate('১২ মার্চ ২০২৬ -'), '2026-03-12');
});

test('House offices come from the current parliament only, in Bangla', () => {
  const posts = parseOfficers(
    [
      { role: 'SPEAKER', nameBn: 'হাফিজ উদ্দিন আহমদ বীর বিক্রম', nameEn: 'Hafiz Uddin Ahmad Bir Bikram', parliamentNo: 13, isCurrent: true, tenureTextBn: '১২ মার্চ ২০২৬ -', location: 'Bhola-3' },
      { role: 'SPEAKER', nameBn: 'পুরনো স্পিকার', parliamentNo: 12, isCurrent: false },
      { role: 'WHIP', nameBn: 'কেউ একজন', parliamentNo: 13, isCurrent: true },
    ],
    { key: 'parliament_officers', url: 'https://www.parliament.gov.bd/api/speakers', parliamentNo: 13 },
  );
  assert.deepEqual(posts.map((p) => [p.title, p.fromDate, p.seatEn]), [
    ['স্পিকার', '2026-03-12', 'Bhola-3'],
    ['হুইপ', null, null],
  ]);
});
