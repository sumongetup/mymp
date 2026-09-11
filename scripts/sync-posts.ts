/**
 * Runs the posts sync from a terminal (src/lib/posts/sync.ts).
 *
 *   npm run sync:posts -- --dry-run      read the live lists, print them and the diff, write nothing
 *   npm run sync:posts                   a real run: writes the posts table, emails, rebuilds the site
 *   npm run sync:posts -- --dry-run --snapshot
 *                                        also writes data/posts.json from what the lists say, for a
 *                                        build that has no posts table to read yet
 *
 * Reads .env.local for the Supabase keys when present. Without them a dry run
 * still reads the lists and compares them against an empty table.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const snapshot = args.has('--snapshot');

interface MemberJson {
  id: string;
  nameBn: string | null;
  nameEn: string | null;
  resignedOn: string | null;
  seat: { nameEn: string | null } | null;
}

async function main() {
  const { runPostsSync } = await import('../src/lib/posts/sync');
  const all = JSON.parse(readFileSync(join(root, 'data', 'members.json'), 'utf8')) as MemberJson[];
  const members = all.filter((m) => m.resignedOn === null).map((m) => ({ id: m.id, nameBn: m.nameBn, nameEn: m.nameEn, seatEn: m.seat?.nameEn ?? null }));
  const nameOf = new Map(all.map((m) => [m.id, m.nameBn]));

  console.log(`posts sync${dryRun ? ' (dry run)' : ''}, ${members.length} sitting members to match against\n`);
  const r = await runPostsSync({ dryRun, trigger: 'cli', members, log: (l) => console.log(`  ${l}`) });

  if (r.status === 'skipped') return console.log('\nskipped: another run is in progress');
  console.log(`\nPARSED: ${r.parsed.length} rows`);
  const how = new Map(r.planned.map((p) => [`${p.post.sourceKey}|${p.post.order}`, p]));
  let lastGroup = '';
  for (const p of r.parsed) {
    const group = `${p.sourceKey} / ${p.title}`;
    if (group !== lastGroup) { console.log(`\n  [${group}]`); lastGroup = group; }
    const plan = how.get(`${p.sourceKey}|${p.order}`);
    const who = plan?.memberId
      ? `→ MP ${plan.memberId} ${nameOf.get(plan.memberId)} (${plan.resolution.method}${plan.resolution.method === 'fuzzy' ? ` ${plan.resolution.score}` : ''})`
      : plan ? '→ kept, not an MP' : '→ UNMATCHED, review queue';
    console.log(`   ${String(p.order).padStart(2)}. ${p.nameBn} | ${p.ministryBn ?? '-'} | from ${p.fromDate ?? '?'}${p.rankNote ? ` | ${p.rankNote}` : ''}  ${who}`);
  }

  console.log(`\nDIFF against the posts table${r.tablesMissing ? ' (table missing, so compared against empty)' : ''}:`);
  console.log(`  add ${r.add.length}, close ${r.close.length}, unchanged ${r.unchanged}, identified ${r.identified.length}, unmatched ${r.unmatched.length}`);
  for (const a of r.add) console.log(`   + ${a.post.type} ${a.post.title}${a.post.ministryBn ? `, ${a.post.ministryBn}` : ''}: ${a.post.nameBn}${a.memberId ? '' : ' (not an MP)'} from ${a.post.fromDate ?? 'today'}`);
  for (const c of r.close) console.log(`   - ${c.type} ${c.title}${c.ministry_bn ? `, ${c.ministry_bn}` : ''}: ${c.person_name_bn}`);
  for (const u of r.unmatched) {
    console.log(`   ? ${u.name_bn} (${u.title}${u.ministry_bn ? `, ${u.ministry_bn}` : ''})${u.stored_as_non_mp ? ' kept as not an MP' : ''}; nearest: ${u.candidates.map((c) => `${c.nameBn} ${c.score}`).join(', ') || 'none'}`);
  }
  if (r.errors.length) console.log('\nERRORS:\n' + r.errors.map((e) => `   ${e.source}: ${e.message}`).join('\n'));
  console.log(`\nstatus ${r.status}${r.runId ? `, run #${r.runId}` : ''}${r.mail ? `, mail ${r.mail}` : ''}${r.deploy ? `, ${r.deploy}` : ''}`);
  console.log('source hashes:', JSON.stringify(r.sourceHashes));

  if (snapshot && r.status === 'ok') {
    const rows = r.planned.map((p, i) => ({
      id: `snapshot-${i + 1}`,
      type: p.post.type,
      title: p.post.title,
      rankNote: p.post.rankNote,
      ministryBn: p.post.ministryBn,
      memberId: p.memberId,
      isMp: !!p.memberId,
      nameBn: p.post.nameBn,
      nameEn: p.post.nameEn,
      photoUrl: p.memberId ? null : p.post.photoUrl,
      fromDate: p.post.fromDate ?? new Date().toISOString().slice(0, 10),
      toDate: null,
      order: p.post.order,
      sourceKey: p.post.sourceKey,
      sourceUrl: p.post.sourceUrl,
      autoSynced: true,
    }));
    const pending = new Map<string, { nameBn: string; title: string; ministries: string[] }>();
    for (const u of r.unmatched.filter((x) => !x.stored_as_non_mp)) {
      const p = pending.get(`${u.key}|${u.title}`) ?? { nameBn: u.name_bn, title: u.title, ministries: [] };
      if (u.ministry_bn && !p.ministries.includes(u.ministry_bn)) p.ministries.push(u.ministry_bn);
      pending.set(`${u.key}|${u.title}`, p);
    }
    // Every ministry of a pending person, not only the first one the run met.
    for (const p of pending.values()) {
      for (const x of r.parsed) if (x.nameBn === p.nameBn && x.title === p.title && x.ministryBn && !p.ministries.includes(x.ministryBn)) p.ministries.push(x.ministryBn);
    }
    const out = { checkedAt: new Date().toISOString(), pending: [...pending.values()], rows };
    writeFileSync(join(root, 'data', 'posts.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
    console.log(`\nwrote data/posts.json: ${rows.length} rows`);
  }
  if (r.status === 'failed') process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
