/**
 * Fills in the share picture of member stories that arrived without one.
 *
 *   npm run feed:thumbs                  stories from the last 30 days
 *   npm run feed:thumbs -- --days 365    further back
 *
 * The server does the same every half hour for the last three days
 * (src/lib/feed/thumbnails.ts). Run this from a home connection to reach the
 * outlets that refuse data-centre addresses.
 */
import fs from 'node:fs';

const envFile = new URL('../.env.local', import.meta.url);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

async function main() {
  const i = process.argv.indexOf('--days');
  const days = i >= 0 ? Number(process.argv[i + 1]) : 30;
  const { fillThumbnails } = await import('../src/lib/feed/thumbnails');
  const total = { tried: 0, found: 0, unreadable: 0, none: 0 };
  // Batches until a batch finds nothing new to try: a failed story's
  // updated_at moves forward, so the loop ends once every story was tried once.
  const started = new Date().toISOString();
  for (;;) {
    const c = await fillThumbnails({ days, limit: 60, budgetMs: 10 * 60_000, concurrency: 6, triedBefore: started });
    total.tried += c.tried; total.found += c.found; total.unreadable += c.unreadable; total.none += c.none;
    console.log(`batch: tried ${c.tried}, picture ${c.found}, no picture ${c.none}, unreadable ${c.unreadable}`);
    if (!c.tried) break;
  }
  console.log(`\ndone: tried ${total.tried}, picture ${total.found}, no picture ${total.none}, unreadable ${total.unreadable}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
