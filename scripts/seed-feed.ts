/**
 * Fills the feed's reference tables from the committed member snapshot:
 *
 *   mp_name_variants   the spellings a headline might use for each member
 *   mp_feed_settings   where each member's feed starts
 *   app_settings       the election-wide nomination window, used as the fallback
 *
 * Run after supabase/migrations/004_feed.sql, and again whenever the member
 * list changes (a by-election, a resignation):
 *
 *   npm run feed:seed            add what is missing, leave editors' work alone
 *   npm run feed:seed -- --prune remove seeded variants that no longer belong
 *
 * Variants an editor typed (source = manual) and variants learned from
 * confirmed matches are never touched.
 */
import fs from 'node:fs';
import { seedVariants } from '../src/lib/feed/nameVariants';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] as const }),
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error('.env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const prune = process.argv.includes('--prune');

interface Member { id: string; nameBn: string | null; nameEn: string | null; resignedOn?: string | null }
const members = (JSON.parse(fs.readFileSync(new URL('../data/members.json', import.meta.url), 'utf8')) as Member[])
  .filter((m) => !m.resignedOn);

async function rest(path: string, init?: RequestInit) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function main() {
  // ------------------------------------------------------------------ variants

  const seeds = seedVariants(members);
  const existing = (await (await rest('mp_name_variants?select=mp_id,variant,source')).json()) as
    { mp_id: string; variant: string; source: string }[];
  const have = new Set(existing.map((e) => `${e.mp_id}|${e.variant}`));
  const wanted = new Set(seeds.map((s) => `${s.mpId}|${s.variant}`));

  const missing = seeds.filter((s) => !have.has(`${s.mpId}|${s.variant}`));
  for (let i = 0; i < missing.length; i += 200) {
    const batch = missing.slice(i, i + 200).map((s) => ({ mp_id: s.mpId, variant: s.variant, source: s.source, weight: s.weight, created_by: 'seed' }));
    await rest('mp_name_variants', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(batch) });
  }
  console.log(`name variants: ${seeds.length} wanted, ${missing.length} added, ${existing.length} already there`);

  if (prune) {
    const stale = existing.filter((e) => e.source === 'official' && !wanted.has(`${e.mp_id}|${e.variant}`));
    for (const s of stale) {
      await rest(`mp_name_variants?mp_id=eq.${encodeURIComponent(s.mp_id)}&variant=eq.${encodeURIComponent(s.variant)}&source=eq.official`, { method: 'DELETE' });
    }
    console.log(`pruned ${stale.length} seeded variants that no longer match the member list`);
  }

  // ------------------------------------------------------------------ where each feed starts
  //
  // Nobody has given us the day each member filed nomination papers, so the
  // election-wide fallback is used and every row it fills is flagged. The date
  // is only a floor for the month list: an item older than it still shows, so a
  // wrong fallback can never hide anything.

  const FALLBACK = { key: 'nomination_window_start', value: { date: '2026-02-12', confirmed: false } };
  await rest('app_settings', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify([{
      key: FALLBACK.key,
      value: FALLBACK.value,
      note: 'The 13th parliament\'s election day, standing in for the nomination filing window until the Election Commission date is entered. Every mp_feed_settings row built from it is flagged needs_confirming.',
      updated_by: 'seed',
    }]),
  });
  const setting = (await (await rest(`app_settings?key=eq.${FALLBACK.key}&select=value`)).json()) as { value: { date: string; confirmed: boolean } }[];
  const fallbackDate = setting[0]?.value?.date ?? FALLBACK.value.date;

  const settings = (await (await rest('mp_feed_settings?select=mp_id')).json()) as { mp_id: string }[];
  const haveSettings = new Set(settings.map((s) => s.mp_id));
  const newSettings = members
    .filter((m) => !haveSettings.has(m.id))
    .map((m) => ({ mp_id: m.id, nomination_filed_at: fallbackDate, feed_start_at: fallbackDate, needs_confirming: true, updated_by: 'seed' }));
  for (let i = 0; i < newSettings.length; i += 200) {
    await rest('mp_feed_settings', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(newSettings.slice(i, i + 200)) });
  }
  console.log(`feed settings: ${newSettings.length} members start at the fallback ${fallbackDate} (flagged for correction), ${haveSettings.size} already set`);

}

main().catch((e) => { console.error(e); process.exit(1); });
