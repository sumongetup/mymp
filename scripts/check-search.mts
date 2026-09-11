// Runs the header search and the /mp filter against the real index and members, so a
// change to normalise() shows what it does to matching before it ships:
//   npx tsx scripts/check-search.mts
// Exits 1 if any expectation fails.
import { readFileSync } from 'node:fs';
import { buildIndex, normalise, search, type IndexRow } from '../src/lib/search';
import { districtOf, members, seats, statistics } from '../src/lib/data';

const rows = JSON.parse(readFileSync('public/search-index.json', 'utf8')) as IndexRow[];
const index = buildIndex(rows);
let failed = 0;
const fail = (msg: string) => { failed++; console.log(`  FAIL ${msg}`); };

// 1. normalise keeps every Bangla word whole. Splitting at vowel signs or the hasanta
//    turned "তারেক" into "ত র ক", and a one-letter fragment matches almost any name.
console.log('# normalise');
for (const [raw, want] of [
  ['তারেক রহমান', 'তারেক রহমান'],
  ['ব্রিকস', 'বরিকস'],
  ['ঢাকা-১৭', 'ঢাকা 17'],
  ['বাংলাদেশ জাতীয়তাবাদী দল (বি.এন.পি)', 'বাংলাদেস জাতিযতাবাদি দল বি এন পি'],
  ['মোঃ আব্দুল', 'মো আবদুল'],
  ['ইকবাল হাসান মাহ্‌মুদ', 'ইকবাল হাসান মাহমুদ'],
  ['মোঃ লুৎফর রহমান', 'মো লুতফর রহমান'],
] as const) {
  const got = normalise(raw);
  console.log(`  ${raw} -> ${got}`);
  if (got !== want) fail(`normalise(${raw}) = "${got}", want "${want}"`);
}
const split = rows.filter(([, bn]) => {
  const words = bn.split(/[\s।,\-–—()'"/.]+/).filter(Boolean).length;
  return normalise(bn).split(' ').filter(Boolean).length > words;
});
console.log(`  Bangla names split into more words than they have: ${split.length} of ${rows.length}`);
for (const [, bn] of split.slice(0, 5)) fail(`split: ${bn} -> ${normalise(bn)}`);

// 2. Header search: the first hit, and how many entries match in total (loose = many).
//    Expected hits are URLs; the index stores some names decomposed (ো as ে + া).
console.log('\n# header search (first hit, total matches)');
const cases: [query: string, first: string][] = [
  ['তারেক', '/mp/tarique-rahman'],
  ['তারেক রহমান', '/mp/tarique-rahman'],
  ['ঢাকা-১৭', '/ason/dhaka-17'],
  ['ঢাকা ১৭', '/ason/dhaka-17'],
  ['বিএনপি', '/dol/bnp'],
  ['বি.এন.পি', '/dol/bnp'],
  ['জামায়াত', '/dol/bjei'],
  ['এনসিপি', '/dol/ncp'],
  ['কক্সবাজার', '/jela/coxs-bazar'],
  ['কুমিল্লা-৪', '/ason/cumilla-4'],
  ['খোন্দকার আবু আশফাক', '/mp/khondoker-abu-ashfaque'],
  ['মোহাম্মদ আসাদুজ্জামান', '/mp/md-asaduzzaman'],
  ['হাসনাত', '/mp/md-abul-hasnat'],
  ['ইকবাল হাসান মাহমুদ', '/mp/iqbal-hassan-mahmood'],
  ['মোসাম্মত শাম্মী', '/mp/musammat-shammi-akther'],
  ['tarique', '/mp/tarique-rahman'],
  ['dhaka-17', '/ason/dhaka-17'],
  ['dhaka 17', '/ason/dhaka-17'],
  ['bnp', '/dol/bnp'],
  ["cox's bazar", '/jela/coxs-bazar'],
  ['chittagong', '/jela/chattogram'],
  ['chittagong 8', '/ason/chittagong-8'],
  ['comilla 4', '/ason/cumilla-4'],
  ['bogra', '/jela/bogura'],
  // Misspellings: nothing matches as typed, so the search falls back to near misses.
  ['তারিক রহমান', '/mp/tarique-rahman'],
  ['তারেক রহমন', '/mp/tarique-rahman'],
  ['মিরজা ফখরুল', '/mp/mirza-fakhrul-islam-alamgir'],
  ['কুমিলা', '/ason/cumilla-1'],
  ['জামাত', '/dol/bjei'],
  ['Tarik Rahman', '/mp/tarique-rahman'],
];
for (const [q, first] of cases) {
  const all = search(index, q, 10_000);
  const top = all[0];
  const ok = top?.url === first;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.padEnd(24)} ${String(all.length).padStart(4)}  ${top ? `${top.bn} ${top.url}` : '(nothing)'}`);
  if (!ok) failed++;
}

// Two spellings of one name must find the same people.
for (const [a, b] of [['আবদুল', 'আব্দুল'], ['মাহমুদ', 'মাহ্‌মুদ'], ['লুতফর', 'লুৎফর'], ['মোসাম্মত', 'মোসাম্মৎ']]) {
  const ua = search(index, a, 10_000).map((e) => e.url).sort().join();
  const ub = search(index, b, 10_000).map((e) => e.url).sort().join();
  if (ua !== ub) fail(`"${a}" and "${b}" find different entries`);
}

// Queries that are no one's name must find (almost) nothing.
for (const q of ['ব্রিকস', 'প্রধান উপদেষ্টা']) {
  const n = search(index, q, 10_000).length;
  console.log(`  ${n === 0 ? 'ok  ' : 'FAIL'} ${q.padEnd(24)} ${String(n).padStart(4)}  (no such entry)`);
  if (n) failed++;
}

// District hits link to the /jela pages districtOf() builds; sync.mjs groups them itself.
const jela = new Set(seats.map((s) => districtOf(s)?.slug).filter(Boolean).map((slug) => `/jela/${slug}`));
const indexed = rows.filter(([type]) => type === 'district').map(([, , , url]) => url);
const orphans = indexed.filter((url) => !jela.has(url));
console.log(`  districts: ${indexed.length} in the index, ${jela.size} pages, ${orphans.length} links to no page`);
if (indexed.length !== jela.size || orphans.length) fail(`district links to no page: ${orphans.join(', ') || '(count differs)'}`);

// 3. The /mp filter, keyed exactly as src/components/MemberFilter.tsx keys it.
console.log('\n# /mp filter (partial Bangla names; count of the 348 sitting members)');
const keyed = members.map((m) => ({
  m,
  key: [normalise(m.nameBn ?? ''), normalise(m.nameEn ?? ''), normalise(m.seat?.nameBn ?? '')].join(' '),
}));
const filter = (q: string) => {
  const words = normalise(q).split(' ').filter(Boolean);
  return keyed.filter(({ key }) => words.every((w) => key.includes(w))).map(({ m }) => m);
};
const counts: [query: string, max: number, mustFind?: string][] = [
  ['তারে', 5, 'tarique-rahman'],
  ['তারেক', 2, 'tarique-rahman'],
  ['রহমান', 60],
  ['আবদু', 40],
  ['হাসনাত', 5],
  ['ঢাকা', 25],
  ['ঢাকা-১', 12],
  ['ঢাকা-১৭', 1, 'tarique-rahman'],
  ['সিলেট', 10],
];
for (const [q, max, must] of counts) {
  const hits = filter(q);
  const ok = hits.length <= max && (!must || hits.some((m) => m.slug === must));
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.padEnd(10)} ${String(hits.length).padStart(4)}  ${hits.slice(0, 3).map((m) => m.nameBn).join(', ')}`);
  if (!ok) failed++;
}

// 4. The statistics page groups professions by the same key.
const profs = statistics().professions;
console.log(`\n# professions: ${profs.length} distinct; top ${profs.slice(0, 3).map((p) => `${p.label} ${p.count}`).join(', ')}`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
