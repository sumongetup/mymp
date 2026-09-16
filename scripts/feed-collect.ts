/**
 * Runs a feed collector from the terminal.
 *
 *   npm run feed:rss                        every configured feed, once
 *   npm run feed:rss -- --dry-run           fetch and match, write nothing
 *   npm run feed:rss -- --collector=press   parliament notices
 *   npm run feed:rss -- --collector=sitemap every outlet sitemap in one pass; from a
 *                                           home connection this reaches the outlets
 *                                           that refuse the servers
 *   npm run feed:rss -- --collector=youtube needs YOUTUBE_API_KEY
 *   npm run feed:rss -- --collector=search  needs FEED_SEARCH_KEY
 *
 * The same code the cron route runs, so what happens here is what happens on
 * the schedule.
 */
import fs from 'node:fs';

// The collectors read Supabase through the site's admin client, which expects
// the environment the server has. A terminal run loads .env.local itself.
const envFile = new URL('../.env.local', import.meta.url);
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

const dryRun = process.argv.includes('--dry-run');
const which = (process.argv.find((a) => a.startsWith('--collector='))?.split('=')[1] ?? 'rss') as 'rss' | 'sitemap' | 'youtube' | 'search' | 'press';

async function main() {
  const { runRssCollector, runSitemapCollector } = await import('../src/lib/feed/collect');
  const { SITEMAP_SOURCES } = await import('../config/news-sources');
  const { runYoutubeCollector, runSearchCollector, runPressCollector } = await import('../src/lib/feed/collectors');
  const r =
    which === 'youtube' ? await runYoutubeCollector({ trigger: 'cli' })
    : which === 'search' ? await runSearchCollector({ trigger: 'cli' })
    : which === 'sitemap' ? await runSitemapCollector({ trigger: 'cli', dryRun, perRun: SITEMAP_SOURCES.length })
    : which === 'press' ? await runPressCollector({ trigger: 'cli' })
    : await runRssCollector({ trigger: 'cli', dryRun });
  const detail = Object.entries((r.detail ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]);
  console.log(`\n${which}${dryRun ? ' (dry run)' : ''}: ${r.status}`);
  console.log(`  found ${r.itemsFound}, new ${r.itemsNew}, attached ${r.itemsAttached} (${r.lowConfidence} to review), matched nobody ${r.unmatched}`);
  console.log(`  outlets: ${detail.map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (r.errors.length) console.log(`  errors:\n    ${r.errors.map((e) => `${e.source}: ${e.message}`).join('\n    ')}`);
  if (r.status === 'failed' || r.status === 'aborted') process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
