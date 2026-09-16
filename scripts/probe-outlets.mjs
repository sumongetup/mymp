// Asks every configured feed and sitemap once, from wherever this runs, and
// records the answer. Used to learn whether a host blocks that network: many
// Bangladeshi outlets answer 403 to data-centre addresses and 200 to a home
// connection, which decides where the collectors can run.
import fs from 'node:fs';

const UA = 'mymp-feed/1.0 (+https://mymp.bd)';
const list = JSON.parse(fs.readFileSync(new URL('./probe-outlets.json', import.meta.url), 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
for (const item of list) {
  let status = 0;
  let items = 0;
  try {
    const res = await fetch(item.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(25000), redirect: 'follow' });
    status = res.status;
    if (res.ok) {
      const text = await res.text();
      items = (text.match(/<item[\s>]/gi) ?? []).length + (text.match(/<url>/gi) ?? []).length + (text.match(/<entry[\s>]/gi) ?? []).length;
    }
  } catch (e) {
    status = e.name === 'TimeoutError' ? -1 : -2;
  }
  results.push({ ...item, status, items });
  console.log(`${String(status).padStart(4)} ${String(items).padStart(5)}  ${item.key} ${item.kind}`);
  await wait(800);
}

const where = process.env.GITHUB_ACTIONS ? 'github-actions' : 'local';
const out = new URL(`../docs/feed/probe-${where}.json`, import.meta.url);
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), where, results }, null, 1));
const ok = results.filter((r) => r.status === 200 && r.items > 0).length;
console.log(`\n${ok} of ${results.length} answered with items from ${where}`);
