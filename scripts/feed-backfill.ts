/**
 * Reads the past out of the outlets that file a sitemap per day.
 *
 * The scheduled collectors can only see what is on the site now: a feed holds
 * twenty stories and a news sitemap a day or two. That is enough for a minister
 * and nothing at all for a member whose name reaches print once a fortnight —
 * which is why most pages were empty. কালের কণ্ঠ, বাংলাদেশ প্রতিদিন,
 * বাংলানিউজ২৪ and নিউজ২৪ keep one sitemap per day at a dated address, so their
 * archive can simply be read, a day at a time, back as far as it goes.
 *
 *   npm run feed:backfill                 the last 30 days
 *   npm run feed:backfill -- --days 90    further back
 *   npm run feed:backfill -- --dry-run    report only, write nothing
 *
 * Only headlines that name a member are stored, so a hundred thousand football
 * results do not land in the table. Requests are spaced: this asks a newsroom's
 * server for a month of its own index, and there is no hurry.
 */
import fs from 'node:fs';

const envFile = new URL('../.env.local', import.meta.url);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

import { NEWS_SOURCES } from '../config/news-sources';
import { buildIndex, ingest, type IngestCounts } from '../src/lib/feed/collect';
import { fetchFeed } from '../src/lib/feed/rss';
import { startRun, finishRun, type FeedItemInput } from '../src/lib/feed/store';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const days = arg('days', 30);
  const dryRun = process.argv.includes('--dry-run');
  const sources = NEWS_SOURCES.filter((s) => s.sitemaps?.some((m) => m.daily));
  if (!sources.length) throw new Error('no outlet files a sitemap per day');

  const index = await buildIndex();
  const run = dryRun ? null : await startRun('backfill', 'terminal');
  const counts: IngestCounts = { found: 0, stored: 0, attached: 0, lowConfidence: 0, unmatched: 0 };
  const errors: { source: string; message: string }[] = [];
  const detail: Record<string, number> = {};

  console.log(`${sources.map((s) => s.nameBn).join(', ')} — ${days} days back\n`);

  // One queue per host, walked round-robin with a gap between two requests to
  // the same host. These outlets serve a cold request happily and answer 403 to
  // a stream of them, so the gap is the whole trick: the work is spread over
  // minutes instead of being refused in seconds.
  const gap = arg('gap', 20) * 1000;
  const queues = sources.map((source) => ({
    source,
    lastAt: 0,
    urls: Array.from({ length: days }, (_, i) => {
      const date = new Date(Date.now() - (i + 1) * 86_400_000).toISOString().slice(0, 10);
      return source.sitemaps!.filter((m) => m.daily).map((m) => ({ url: m.url.replace('{d}', date), date }));
    }).flat(),
  }));

  let done = 0;
  const total = queues.reduce((n, q) => n + q.urls.length, 0);
  while (queues.some((q) => q.urls.length)) {
    for (const q of queues) {
      const next = q.urls.shift();
      if (!next) continue;
      const since = Date.now() - q.lastAt;
      if (since < gap) await wait(gap - since);
      q.lastAt = Date.now();
      const { items, error } = await fetchFeed(next.url, 30_000);
      done++;
      if (error) {
        errors.push({ source: q.source.key, message: `${next.date}: ${error}` });
      } else {
        detail[q.source.key] = (detail[q.source.key] ?? 0) + items.length;
        await store(items, q.source, next.date);
      }
      process.stdout.write(
        `\r${String(done).padStart(4)}/${total}  ${q.source.key.padEnd(13)} ${next.date}  ` +
        `read ${counts.found}, kept ${counts.stored}, linked ${counts.attached}   `,
      );
    }
  }


  console.log('\n');
  console.log(`headlines read   ${counts.found}`);
  console.log(`stored           ${counts.stored}${dryRun ? ' (dry run: nothing written)' : ''}`);
  console.log(`new links        ${counts.attached}  (${counts.lowConfidence} to review)`);
  console.log(`named nobody     ${counts.unmatched}`);
  console.log(`per outlet       ${JSON.stringify(detail)}`);
  if (errors.length) console.log(`days missed      ${errors.length}`);

  if (run) {
    await finishRun(run, {
      status: 'ok',
      itemsFound: counts.found, itemsNew: counts.stored, itemsAttached: counts.attached,
      unmatched: counts.unmatched, lowConfidence: counts.lowConfidence,
      errors: errors.slice(0, 40), detail,
    });
  }

  async function store(items: { title: string; url: string; publishedAt: string | null; summary: string | null }[], source: (typeof NEWS_SOURCES)[number], date: string) {
    const batch: FeedItemInput[] = items
      .filter((i) => i.title && i.url)
      .map((i) => ({
        type: 'news' as const,
        title: i.title,
        url: i.url,
        summary: i.summary,
        outletName: source.nameBn,
        outletId: source.key,
        // A dateless entry still belongs to the day whose sitemap held it.
        publishedAt: i.publishedAt ?? `${date}T12:00:00.000Z`,
        source: 'rss' as const,
      }));
    if (dryRun) {
      counts.found += batch.length;
      return;
    }
    await ingest(batch, index, counts, undefined, { onlyMatched: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
