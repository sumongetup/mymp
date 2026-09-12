/**
 * Writes data/name-idf.json: how many of the sitting members' names carry each
 * word. The posts matcher weights a shared word by how rare it is, so that
 * "রহমান" (which dozens of members share) cannot carry a match on its own.
 *
 * Run after scripts/sync.mjs, which writes data/members.json; `npm run build`
 * does both. By hand: npm run idf
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIdf, nameTokens } from '../src/lib/matching/nameMatch';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const members = JSON.parse(readFileSync(join(root, 'data/members.json'), 'utf8')) as {
  id: string;
  nameBn: string | null;
  resignedOn?: string | null;
}[];

const names = members.filter((m) => !m.resignedOn).map((m) => m.nameBn ?? '').filter(Boolean);
const table = { ...buildIdf(names), builtAt: new Date().toISOString() };

// Sorted by how common the word is, so reading the file tells you at a glance
// which words say nothing about who a person is.
const df = Object.fromEntries(Object.entries(table.df).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'bn')));
writeFileSync(join(root, 'data/name-idf.json'), `${JSON.stringify({ names: table.names, builtAt: table.builtAt, df }, null, 1)}\n`);

const top = Object.entries(df).slice(0, 12);
console.log(`name-idf: ${table.names} names, ${Object.keys(df).length} words`);
console.log(`  most common: ${top.map(([t, n]) => `${t} ${n}`).join(', ')}`);
console.log(`  words in one name only: ${Object.values(df).filter((n) => n === 1).length}`);
console.log(`  sample tokenisation: ${nameTokens('ব্রিগেডিয়ার জেনারেল (অব:) ড. এ কে এম শামছুল ইসলাম').join(' | ')}`);
