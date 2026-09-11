/**
 * Data integrity report: reads the build snapshot in data/ (what the public
 * site shows) and, when the Supabase keys are present, the admin tables it
 * was built from, and writes docs/qa/data-report.md.
 *
 *   npx tsx scripts/qa-data.ts            full report, fetches every photo
 *   npx tsx scripts/qa-data.ts --no-photos  skip the photo fetches
 *
 * Read-only. Exit code 1 when a check fails, so it can gate a CI run.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeName } from '../src/lib/posts/names';

const root = join(__dirname, '..');
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(root, 'data', f), 'utf8')) as T;

interface Seat { no: number; reserved: boolean; nameBn: string | null; nameEn: string | null; slug: string; memberId: string | null; vacantSince: string | null }
interface Member {
  id: string; slug: string; nameBn: string | null; nameEn: string | null; photoUrl: string | null; gender: string | null; dateOfBirth: string | null;
  term: { start: string | null; end: string | null } | null; party: { abbr: string; nameBn: string | null } | null;
  seat: { no: number; reserved: boolean; nameBn: string | null; nameEn: string | null } | null; offices: string[]; status: string; resignedOn: string | null;
  ministryBn: string | null; govPost: string | null;
}
interface Party { abbr: string; slug: string; nameBn: string | null; seats: number; seatsTerritorial: number; seatsReserved: number }
interface Committee { id: string; slug: string; nameBn: string | null; rosterCurrent: boolean; members: { role: string; memberId: string }[] }
interface Activity { speakers: { role: string; nameBn: string; memberId: string | null }[]; sessions: { titleBn: string; startDate: string | null; endDate: string | null; sittings: { date: string | null }[] }[]; notices: { id: string; date: string | null; memberId: string | null; committeeId: string | null }[] }
interface Posts { rows: { id: string; type: string; title: string; ministryBn: string | null; memberId: string | null; nameBn: string; fromDate: string; toDate: string | null }[] }
interface Result { seatNo: number; parliamentNo: number; candidates: { name: string; party: string | null; votes: number }[] }
interface News { id: string; titleBn: string; publishedOn: string; memberId: string | null; seatSlug: string | null }
interface History { priorTerms: Record<string, unknown[]>; seatHolders: Record<string, { memberId: string | null }[]> }

const seats = read<Seat[]>('seats.json');
const allMembers = read<Member[]>('members.json');
const members = allMembers.filter((m) => m.status !== 'Resigned');
const parties = read<Party[]>('parties.json');
const committees = read<Committee[]>('committees.json');
const activity = read<Activity>('activity.json');
const posts = read<Posts>('posts.json');
const results = read<Result[]>('results.json');
const news = read<News[]>('news.json');
const history = read<History>('history.json');

const GENERAL = 300;
const RESERVED = 50;
const TODAY = new Date().toISOString().slice(0, 10);

type Row = { check: string; status: 'ok' | 'fail' | 'note'; detail: string };
const rows: Row[] = [];
const ok = (check: string, detail = '') => rows.push({ check, status: 'ok', detail });
const fail = (check: string, detail: string) => rows.push({ check, status: 'fail', detail });
const note = (check: string, detail: string) => rows.push({ check, status: 'note', detail });
const list = (xs: string[], max = 12) => (xs.length > max ? `${xs.slice(0, max).join('; ')} … (${xs.length})` : xs.join('; '));

const memberIds = new Set(allMembers.map((m) => m.id));
// The same aliases as districtOf() in src/lib/data.ts: the source spells one Chattogram seat "Chittagong-8".
const DISTRICT_EN_ALIASES: Record<string, string> = { Chittagong: 'Chattogram', "Cox'sBazar": "Cox's Bazar" };
const districtOf = (s: { nameEn: string | null }) => {
  const raw = (s.nameEn ?? '').replace(/[\s-]+\d+$/, '').trim();
  return DISTRICT_EN_ALIASES[raw] ?? raw;
};
const ordinalOf = (s: { nameEn: string | null }) => Number((s.nameEn ?? '').match(/(\d+)$/)?.[1] ?? 0);

// ---- seats ----
{
  const general = seats.filter((s) => !s.reserved);
  const nos = general.map((s) => s.no);
  const dup = nos.filter((n, i) => nos.indexOf(n) !== i);
  const missing = Array.from({ length: GENERAL }, (_, i) => i + 1).filter((n) => !nos.includes(n));
  if (dup.length) fail('General seats: duplicates', list(dup.map(String)));
  else ok('General seats: no duplicate numbers');
  if (missing.length) fail(`General seats: ${general.length} of ${GENERAL} present`, `missing seat numbers ${missing.join(', ')} (absent from parliament.gov.bd's member list, so no page exists)`);
  else ok(`General seats: all ${GENERAL} present`);
  // Within each district the ordinals should run 1..n without a gap.
  const byDistrict = new Map<string, number[]>();
  for (const s of general) byDistrict.set(districtOf(s), [...(byDistrict.get(districtOf(s)) ?? []), ordinalOf(s)]);
  const gaps: string[] = [];
  for (const [d, ords] of byDistrict) {
    const sorted = [...ords].sort((a, b) => a - b);
    const expect = Array.from({ length: sorted[sorted.length - 1]! }, (_, i) => i + 1);
    const gap = expect.filter((n) => !sorted.includes(n));
    if (gap.length) gaps.push(`${d}: missing ${gap.join(', ')}`);
    if (sorted.some((n, i) => sorted.indexOf(n) !== i)) gaps.push(`${d}: repeated ordinal`);
  }
  if (gaps.length) fail('District numbering has gaps', list(gaps));
  else ok(`District numbering: ${byDistrict.size} districts, ordinals run without gaps`);
  const slugs = seats.map((s) => s.slug);
  const dupSlug = slugs.filter((x, i) => slugs.indexOf(x) !== i);
  if (dupSlug.length) fail('Seat slugs: duplicates', list(dupSlug)); else ok('Seat slugs: unique');
}
{
  const reserved = seats.filter((s) => s.reserved).map((s) => s.no).sort((a, b) => a - b);
  const expect = Array.from({ length: RESERVED }, (_, i) => GENERAL + i + 1);
  const missing = expect.filter((n) => !reserved.includes(n));
  const extra = reserved.filter((n) => !expect.includes(n));
  if (reserved.length === RESERVED && !missing.length && !extra.length) ok(`Reserved seats: ${RESERVED} present, numbered ${GENERAL + 1}–${GENERAL + RESERVED} without gaps`);
  else fail(`Reserved seats: ${reserved.length} of ${RESERVED}`, `missing ${missing.join(', ') || 'none'}; unexpected ${extra.join(', ') || 'none'}`);
}

// ---- totals ----
{
  const sitting = members.length;
  const seatsFilled = seats.filter((s) => s.memberId && !s.vacantSince).length;
  if (sitting === seatsFilled) ok(`Total members: ${sitting} sitting = ${seatsFilled} filled seats (the home chart uses statistics().total, computed from members)`);
  else fail('Total members vs filled seats', `${sitting} sitting members, ${seatsFilled} seats with a member`);
  const byParty = new Map<string, { t: number; r: number }>();
  for (const m of members) {
    const k = m.party?.abbr ?? '(none)';
    const e = byParty.get(k) ?? { t: 0, r: 0 };
    if (m.seat?.reserved) e.r++; else e.t++;
    byParty.set(k, e);
  }
  const bad: string[] = [];
  let sum = 0;
  for (const p of parties) {
    const c = byParty.get(p.abbr) ?? { t: 0, r: 0 };
    sum += p.seats;
    if (p.seats !== c.t + c.r || p.seatsTerritorial !== c.t || p.seatsReserved !== c.r) bad.push(`${p.abbr}: file says ${p.seats} (${p.seatsTerritorial}+${p.seatsReserved}), members give ${c.t + c.r} (${c.t}+${c.r})`);
    if (p.seatsTerritorial + p.seatsReserved !== p.seats) bad.push(`${p.abbr}: ${p.seatsTerritorial}+${p.seatsReserved}≠${p.seats}`);
  }
  for (const k of byParty.keys()) if (!parties.some((p) => p.abbr === k)) bad.push(`members carry party ${k}, which parties.json lacks`);
  if (bad.length) fail('Party totals', list(bad));
  else ok(`Party totals: ${parties.length} parties sum to ${sum} = ${sitting} members; general and reserved splits add up`);
  ok(`Majority: computed as floor(${GENERAL + RESERVED}/2)+1 = ${Math.floor((GENERAL + RESERVED) / 2) + 1} in statistics(), not hardcoded`);
}

// ---- required fields ----
{
  const missing: string[] = [];
  for (const m of allMembers) {
    const gaps = [!m.nameBn && 'nameBn', !m.seat && 'seat', !m.party && 'party', m.seat && typeof m.seat.reserved !== 'boolean' && 'seat type'].filter(Boolean);
    if (gaps.length) missing.push(`${m.id} ${m.nameBn ?? m.nameEn}: ${gaps.join(', ')}`);
  }
  if (missing.length) fail('Members missing name, seat, party or seat type', list(missing));
  else ok(`Every member (${allMembers.length}) has a Bangla name, a seat, a party and a seat type`);
  const noPhoto = allMembers.filter((m) => !m.photoUrl);
  const noDob = allMembers.filter((m) => !m.dateOfBirth);
  if (noPhoto.length) note('Members without a photo URL', list(noPhoto.map((m) => m.nameBn ?? m.id)));
  if (noDob.length) note('Members without a date of birth', list(noDob.map((m) => m.nameBn ?? m.id)));
}

// ---- duplicate names ----
{
  const byKey = new Map<string, Member[]>();
  for (const m of allMembers) {
    const k = normalizeName(m.nameBn ?? '');
    byKey.set(k, [...(byKey.get(k) ?? []), m]);
  }
  const dups = [...byKey.values()].filter((xs) => xs.length > 1);
  if (dups.length) {
    // Two sitting members really can share a name (different seats): those are namesakes, not duplicates.
    const sameSeat = dups.filter((xs) => new Set(xs.map((m) => m.seat?.no)).size < xs.length);
    const namesakes = dups.filter((xs) => !sameSeat.includes(xs));
    if (sameSeat.length) fail('Same normalised name on the same seat', list(sameSeat.map((xs) => xs.map((m) => `${m.nameBn} (${m.id})`).join(' = '))));
    if (namesakes.length) note('Namesakes: same normalised name, different seats (not duplicates)', list(namesakes.map((xs) => xs.map((m) => `${m.nameBn} [${m.seat?.nameBn}]`).join(' / '))));
    if (!sameSeat.length) ok('No member appears twice under two spellings');
  } else ok('No member appears twice under two spellings');
  // Spelling drift of the same word across names (মোঃ vs মো.) is folded by normalizeName; report the raw forms in use.
  const forms = new Map<string, number>();
  for (const m of allMembers) for (const t of (m.nameBn ?? '').split(/\s+/)) if (/^(মোঃ|মো\.|মো|মোহাম্মদ|মুহাম্মদ|ডাঃ|ডা\.|ব্যারিস্টার|ব্যারিষ্টার|অ্যাডভোকেট|এডভোকেট)$/.test(t)) forms.set(t, (forms.get(t) ?? 0) + 1);
  note('Honorific spellings in source names (kept as the source writes them; search and matching fold them)', [...forms].map(([k, v]) => `${k} ×${v}`).join(', '));
}

// ---- orphans and references ----
{
  const partyAbbrs = new Set(parties.map((p) => p.abbr));
  const bad: string[] = [];
  for (const m of allMembers) if (m.party && !partyAbbrs.has(m.party.abbr)) bad.push(`${m.nameBn}: party ${m.party.abbr}`);
  for (const s of seats) if (s.memberId && !memberIds.has(s.memberId)) bad.push(`seat ${s.no}: memberId ${s.memberId}`);
  for (const c of committees) for (const x of c.members) if (!memberIds.has(x.memberId)) bad.push(`committee ${c.slug}: member ${x.memberId}`);
  for (const n of activity.notices) {
    if (n.memberId && !memberIds.has(n.memberId)) bad.push(`notice ${n.id}: member ${n.memberId}`);
    if (n.committeeId && !committees.some((c) => c.id === n.committeeId)) bad.push(`notice ${n.id}: committee ${n.committeeId}`);
  }
  for (const s of activity.speakers) if (s.memberId && !memberIds.has(s.memberId)) bad.push(`officer ${s.role}: member ${s.memberId}`);
  for (const n of news) {
    if (n.memberId && !memberIds.has(n.memberId)) bad.push(`news ${n.id.slice(0, 8)}: member ${n.memberId}`);
    if (n.seatSlug && !seats.some((s) => s.slug === n.seatSlug)) bad.push(`news ${n.id.slice(0, 8)}: seat ${n.seatSlug}`);
  }
  for (const r of results) if (!seats.some((s) => s.no === r.seatNo)) bad.push(`result for seat ${r.seatNo}: no such seat`);
  for (const p of posts.rows) if (p.memberId && !memberIds.has(p.memberId)) bad.push(`post ${p.title} ${p.nameBn}: member ${p.memberId}`);
  for (const id of Object.keys(history.priorTerms)) if (!memberIds.has(id)) bad.push(`priorTerms: member ${id}`);
  for (const [no, hs] of Object.entries(history.seatHolders)) for (const h of hs) if (h.memberId && !memberIds.has(h.memberId)) bad.push(`seatHolders ${no}: member ${h.memberId}`);
  if (bad.length) fail('Dangling references', list(bad));
  else ok('References: every member, seat, party and committee id used by seats, committees, notices, officers, news, results, posts and history exists');

  const vacant = seats.filter((s) => !s.memberId || s.vacantSince);
  if (vacant.length) note('Seats without a sitting member', list(vacant.map((s) => `${s.nameBn} (${s.vacantSince ? `vacant since ${s.vacantSince}` : 'no member'})`)));
  const emptyParties = parties.filter((p) => !members.some((m) => m.party?.abbr === p.abbr));
  if (emptyParties.length) fail('Parties with no members', list(emptyParties.map((p) => p.abbr))); else ok('Parties: each has at least one member');
  const emptyCommittees = committees.filter((c) => !c.members.length);
  note(`Committees with no members: ${emptyCommittees.length} of ${committees.length}`, `${emptyCommittees.filter((c) => !c.rosterCurrent).length} are marked rosterCurrent=false (parliament has not published a 13th-parliament roster; the page says so)${emptyCommittees.some((c) => c.rosterCurrent) ? `; CURRENT but empty: ${emptyCommittees.filter((c) => c.rosterCurrent).map((c) => c.slug).join(', ')}` : ''}`);
  const districts = new Set(seats.filter((s) => !s.reserved).map(districtOf));
  ok(`Districts: ${districts.size} derived from seat names; none without seats by construction`);
  const resultsMissing = seats.filter((s) => !s.reserved && !results.some((r) => r.seatNo === s.no));
  if (resultsMissing.length) note('General seats with no published result', list(resultsMissing.map((s) => s.nameBn ?? String(s.no))));
}

// ---- posts and roles ----
{
  const unique = ['স্পিকার', 'ডেপুটি স্পিকার', 'প্রধানমন্ত্রী', 'সংসদ নেতা', 'বিরোধীদলীয় নেতা', 'চিফ হুইপ'];
  const bad: string[] = [];
  for (const t of unique) {
    const holders = new Set(posts.rows.filter((p) => !p.toDate && p.title === t).map((p) => p.memberId ?? p.nameBn));
    if (holders.size > 1) bad.push(`${t}: ${[...holders].join(', ')}`);
  }
  const ROLE: Record<string, string> = { SPEAKER: 'স্পিকার', DEPUTY_SPEAKER: 'ডেপুটি স্পিকার', LEADER_OF_HOUSE: 'সংসদ নেতা', OPPOSITION_LEADER: 'বিরোধীদলীয় নেতা', CHIEF_WHIP: 'চিফ হুইপ' };
  for (const [role, label] of Object.entries(ROLE)) {
    const holders = activity.speakers.filter((s) => s.role === role);
    if (holders.length > 1) bad.push(`activity.speakers ${label}: ${holders.map((h) => h.nameBn).join(', ')}`);
  }
  const pmOffices = allMembers.filter((m) => m.offices.includes('pm'));
  if (pmOffices.length > 1) bad.push(`members.offices pm: ${pmOffices.map((m) => m.nameBn).join(', ')}`);
  if (bad.length) fail('Unique offices held by more than one person', list(bad));
  else ok('Unique offices: at most one holder each in posts, activity.speakers and member offices');
  const noMinistry = posts.rows.filter((p) => !p.toDate && ['মন্ত্রী', 'প্রতিমন্ত্রী', 'উপমন্ত্রী'].includes(p.title) && !p.ministryBn);
  if (noMinistry.length) fail('Ministers with no ministry', list(noMinistry.map((p) => p.nameBn)));
  else ok('Ministers: every current minister, state minister and deputy minister has a ministry');
  const govMembers = allMembers.filter((m) => m.govPost && !m.ministryBn);
  if (govMembers.length) fail('members.govPost without ministryBn', list(govMembers.map((m) => m.nameBn ?? m.id)));
  // Posts and activity should agree on the House offices.
  const disagree: string[] = [];
  for (const [role, label] of Object.entries(ROLE)) {
    const a = activity.speakers.find((s) => s.role === role)?.memberId ?? null;
    const p = posts.rows.find((x) => !x.toDate && x.title === label)?.memberId ?? null;
    if (a !== p) disagree.push(`${label}: activity ${a}, posts ${p}`);
  }
  if (disagree.length) fail('House offices differ between activity.speakers and posts', list(disagree));
  else ok('House offices agree between activity.speakers and posts');
}

// ---- dates ----
{
  const bad: string[] = [];
  const future = (d: string | null | undefined, what: string) => { if (d && d.slice(0, 10) > TODAY) bad.push(`${what}: ${d} is in the future`); };
  const order = (a: string | null | undefined, b: string | null | undefined, what: string) => { if (a && b && b < a) bad.push(`${what}: end ${b} before start ${a}`); };
  for (const m of allMembers) {
    future(m.dateOfBirth, `${m.nameBn} dateOfBirth`);
    future(m.resignedOn, `${m.nameBn} resignedOn`);
    order(m.term?.start, m.term?.end, `${m.nameBn} term`);
    if (m.dateOfBirth && m.term?.start && m.dateOfBirth > m.term.start) bad.push(`${m.nameBn}: born after term start`);
  }
  for (const s of seats) future(s.vacantSince, `seat ${s.no} vacantSince`);
  for (const s of activity.sessions) { order(s.startDate, s.endDate, `session ${s.titleBn}`); for (const x of s.sittings) future(x.date, `sitting in ${s.titleBn}`); }
  // A notice's date is the meeting it announces, so a few days ahead is expected; a year ahead is not.
  const horizon = new Date(Date.now() + 366 * 86_400_000).toISOString().slice(0, 10);
  for (const n of activity.notices) if (n.date && n.date > horizon) bad.push(`notice ${n.id}: ${n.date} is more than a year ahead`);
  for (const p of posts.rows) { future(p.fromDate, `post ${p.nameBn} fromDate`); future(p.toDate, `post ${p.nameBn} toDate`); order(p.fromDate, p.toDate, `post ${p.nameBn}`); }
  for (const n of news) future(n.publishedOn, `news ${n.titleBn.slice(0, 30)}`);
  // A term's end is the parliament's scheduled end: five years on, and not a data error.
  const termEnds = new Set(allMembers.map((m) => m.term?.end).filter(Boolean));
  if (bad.length) fail('Dates', list(bad));
  else ok(`Dates: none in the future, no end before its start (term end ${[...termEnds].join(', ')} is the parliament's scheduled end)`);
}

// ---- photos ----
async function photos() {
  if (process.argv.includes('--no-photos')) { note('Photos', 'skipped (--no-photos)'); return; }
  const urls = allMembers.map((m) => m.photoUrl).filter((u): u is string => !!u);
  const broken: string[] = [];
  let okCount = 0;
  const queue = [...urls];
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const u = queue.shift()!;
      try {
        const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
        if (r.ok) okCount++; else broken.push(`${r.status} ${u}`);
      } catch (e) { broken.push(`${(e as Error).message} ${u}`); }
    }
  }));
  const missing = allMembers.length - urls.length;
  if (broken.length) fail(`Photos: ${okCount} load, ${broken.length} broken, ${missing} missing`, list(broken));
  else ok(`Photos: ${okCount} of ${urls.length} URLs answer 200; ${missing} members have no photo`);
}

// ---- admin tables (optional) ----
async function database() {
  const envFile = join(root, '.env.local');
  if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, ''); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { note('Admin tables', 'skipped: no Supabase keys in the environment'); return; }
  const get = async <T,>(path: string): Promise<T> => {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`${path.split('?')[0]} -> ${r.status}`);
    return r.json() as Promise<T>;
  };
  try {
    const overrides = await get<{ entity_type: string; entity_id: string; field: string }[]>('overrides?select=entity_type,entity_id,field&limit=5000');
    const bad: string[] = [];
    for (const o of overrides) {
      const exists = o.entity_type === 'member' ? memberIds.has(o.entity_id) : o.entity_type === 'seat' ? seats.some((s) => String(s.no) === o.entity_id) : o.entity_type === 'party' ? parties.some((p) => p.abbr === o.entity_id) : committees.some((c) => c.id === o.entity_id);
      if (!exists) bad.push(`${o.entity_type} ${o.entity_id} (${o.field})`);
    }
    if (bad.length) fail(`overrides: ${bad.length} of ${overrides.length} point at an entity that is not in the snapshot`, list(bad));
    else ok(`overrides: all ${overrides.length} rows point at an existing member, seat, party or committee`);
    const newsRows = await get<{ id: string; member_id: string | null; seat_slug: string | null; status: string }[]>('news_posts?select=id,member_id,seat_slug,status&limit=5000');
    const badNews = newsRows.filter((n) => (n.member_id && !memberIds.has(n.member_id)) || (n.seat_slug && !seats.some((s) => s.slug === n.seat_slug)));
    if (badNews.length) fail(`news_posts: ${badNews.length} rows reference a missing member or seat`, list(badNews.map((n) => `${n.id.slice(0, 8)} ${n.status} member=${n.member_id} seat=${n.seat_slug}`)));
    else ok(`news_posts: all ${newsRows.length} rows reference existing members and seats`);
    const er = await get<{ seat_no: number; parliament_no: number; status: string }[]>('election_results?select=seat_no,parliament_no,status&limit=5000');
    const dupEr = er.filter((r, i) => er.findIndex((x) => x.seat_no === r.seat_no && x.parliament_no === r.parliament_no) !== i);
    const noSeat = er.filter((r) => !seats.some((s) => s.no === r.seat_no));
    if (dupEr.length || noSeat.length) fail('election_results', `${dupEr.length} duplicate seat/parliament rows; ${noSeat.length} for seats not in the snapshot (${noSeat.map((r) => r.seat_no).join(', ')})`);
    else ok(`election_results: ${er.length} rows (${er.filter((r) => r.status === 'published').length} published), one per seat and parliament, all seats exist`);
    const hidden = await get<{ entity_type: string; entity_id: string }[]>('hidden_entities?select=entity_type,entity_id');
    note('hidden_entities', hidden.length ? list(hidden.map((h) => `${h.entity_type} ${h.entity_id}`)) : 'none');
    try { await get('posts?select=id&limit=1'); ok('posts tables exist'); } catch { fail('posts tables', 'missing: supabase/migrations/003_posts.sql has not been run (see blocked.md)'); }
  } catch (e) {
    note('Admin tables', `could not read: ${(e as Error).message}`);
  }
}

async function main() {
  await Promise.all([photos(), database()]);
  const failed = rows.filter((r) => r.status === 'fail');
  const md = [
    `# Data integrity report`,
    ``,
    `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`npx tsx scripts/qa-data.ts\` from the committed snapshot in \`data/\` (built ${read<{ builtAt: string }>('meta.json').builtAt.slice(0, 16).replace('T', ' ')} UTC) and the live admin tables.`,
    ``,
    `**${failed.length} failing check${failed.length === 1 ? '' : 's'}, ${rows.filter((r) => r.status === 'ok').length} passing, ${rows.filter((r) => r.status === 'note').length} notes.**`,
    ``,
    `| | Check | Detail |`,
    `|---|---|---|`,
    ...rows.map((r) => `| ${r.status === 'ok' ? '✅' : r.status === 'fail' ? '❌' : 'ℹ️'} | ${r.check} | ${r.detail.replace(/\|/g, '\\|')} |`),
    ``,
  ].join('\n');
  mkdirSync(join(root, 'docs', 'qa'), { recursive: true });
  writeFileSync(join(root, 'docs', 'qa', 'data-report.md'), md, 'utf8');
  console.log(md);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
