/**
 * Pull the current parliament from parliament.gov.bd into a local snapshot.
 *
 * Run with `npm run sync`. Writes JSON into data/, which the site reads at build
 * time. Keeping a committed snapshot means a deploy never depends on their API
 * being up, and refreshing the data is a deliberate, reviewable act.
 *
 * Mobile numbers are deliberately NOT stored. Every sitting member has one in the
 * API, but bulk-publishing 349 personal numbers is a decision the site owner has
 * to make first; until then we record only whether one exists.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import tls from 'node:tls';

const BASE = 'https://www.parliament.gov.bd';
const HOST = 'www.parliament.gov.bd';
const PARLIAMENT = 13;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

/**
 * --soft: used by the production build. If parliament.gov.bd cannot be reached,
 * keep the committed snapshot and exit 0 so a deploy never fails because a
 * government server is down. Without --soft (manual runs) a failure is fatal.
 */
const SOFT = process.argv.includes('--soft');

/**
 * Optional admin database. When the Supabase variables are present, admin
 * overrides, hidden entities and published news are merged into the snapshot.
 * When absent (local runs, or before the database exists) this is skipped and
 * the site is built purely from the parliament API.
 */
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbConfigured = () => !!SB_URL && !!SB_KEY;

async function db(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: init.method === 'POST' ? 'return=minimal' : '',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status} ${await res.text().catch(() => '')}`);
  return res.status === 204 || init.method === 'POST' ? null : res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Two things about parliament.gov.bd's TLS make a plain fetch() fail on a clean
 * machine, which is why this uses node:https rather than fetch:
 *
 *  1. The server sends only its leaf certificate, not the GoGetSSL intermediate
 *     that signs it. Browsers paper over that by fetching the intermediate from
 *     the AIA extension; Node does not, and reports UNABLE_TO_VERIFY_LEAF_
 *     SIGNATURE. certs/parliament-chain.pem supplies the intermediate and its
 *     root, added ALONGSIDE Node's bundled roots (passing `ca` replaces them).
 *  2. Requests with no User-Agent get their connection reset.
 *
 * Verified locally: without these, ECONNRESET / UNABLE_TO_VERIFY_LEAF_SIGNATURE;
 * with them, HTTP 200.
 */
const CA_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs', 'parliament-chain.pem');
let agent = null;

async function getAgent() {
  if (agent) return agent;
  let extra = [];
  try {
    const pem = await readFile(CA_FILE, 'utf8');
    extra = pem.split(/(?=-----BEGIN CERTIFICATE-----)/).filter((s) => s.includes('BEGIN CERTIFICATE'));
  } catch {
    console.warn('  certs/parliament-chain.pem missing; TLS verification may fail');
  }
  agent = new https.Agent({ ca: [...tls.rootCertificates, ...extra], keepAlive: true });
  return agent;
}

async function request(path) {
  const ca = await getAgent();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: HOST,
        path,
        method: 'GET',
        agent: ca,
        timeout: 30000,
        headers: { accept: 'application/json', 'user-agent': 'mymp-sync/1.0 (+https://mymp.bd)' },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${res.statusCode} ${res.statusMessage}`));
            return;
          }
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`bad JSON: ${e.message}`)); }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => reject(new Error(e.code ?? e.message)));
    req.end();
  });
}

async function getJson(path, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await request(path);
    } catch (err) {
      if (i === tries) throw new Error(`GET ${path} failed after ${tries} tries: ${err.message}`);
      await sleep(1500 * i);
    }
  }
}

async function getAllPages(path, limit = 100) {
  const rows = [];
  let page = 1;
  let total = null;
  while (total === null || rows.length < total) {
    const sep = path.includes('?') ? '&' : '?';
    const j = await getJson(`${path}${sep}limit=${limit}&page=${page}`);
    total = j.total ?? 0;
    const batch = j.data ?? [];
    if (!batch.length) break;
    rows.push(...batch);
    process.stdout.write(`  ${path} page ${page}/${j.totalPages ?? '?'} — ${rows.length}/${total}\n`);
    page++;
    await sleep(700);
  }
  return rows;
}

const clean = (v) => (typeof v === 'string' ? v.trim() : v) || null;
const slugify = (s) =>
  String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  console.log(`Syncing the ${PARLIAMENT}th parliament from ${BASE}\n`);

  const rawMembers = await getAllPages(`/api/members?parliamentNo=${PARLIAMENT}`);
  const rawCommittees = await getAllPages('/api/committees', 50);

  // ---- members ----
  // Two pairs of sitting members share a name, so the seat has to disambiguate the
  // slug. Without this their pages silently collapse into one.
  const nameCount = new Map();
  for (const m of rawMembers) {
    const s = slugify(m.nameEng || m.externalId);
    nameCount.set(s, (nameCount.get(s) ?? 0) + 1);
  }

  const members = rawMembers.map((m) => {
    const term = (m.terms ?? []).find((t) => t.parliamentNo === PARLIAMENT) ?? {};
    const c = term.constituency ?? {};
    const p = term.party ?? {};
    const seatNo = typeof c.constituencyNo === 'number' ? c.constituencyNo : null;
    const base = slugify(m.nameEng || m.externalId);
    return {
      id: m.externalId,
      slug: nameCount.get(base) > 1 && c.constituencyEng ? `${base}-${slugify(c.constituencyEng)}` : base,
      nameBn: clean(m.nameBng),
      nameEn: clean(m.nameEng),
      photoUrl: clean(m.photoUrl),
      gender: clean(m.gender),
      dateOfBirth: clean(m.dateOfBirth),
      professionBn: clean(m.professionBn),
      fatherBn: clean(m.fatherNameBng),
      fatherEn: clean(m.fatherNameEng),
      motherBn: clean(m.motherNameBng),
      motherEn: clean(m.motherNameEng),
      isFreedomFighter: !!m.isFreedomFighter,
      presentAddressBn: clean(m.presentAddressBng),
      permanentAddressBn: clean(m.permanentAddressBng),
      email: clean(m.email),
      hasMobile: !!m.mobile, // the number itself is deliberately not stored
      bioBn: null, // only ever set through an admin override
      party: p.abbreviation ? { abbr: p.abbreviation, nameBn: clean(p.nameBng), nameEn: clean(p.nameEng) } : null,
      seat: seatNo
        ? {
            no: seatNo,
            reserved: seatNo > 300,
            nameBn: clean(c.constituencyBng),
            nameEn: clean(c.constituencyEng),
            slug: slugify(c.constituencyEng || `seat-${seatNo}`),
            boundaryBn: clean(c.boundaryDetails),
          }
        : null,
      offices: [
        term.isSpeaker && 'speaker',
        term.isDeputySpeaker && 'deputy-speaker',
        term.isPm && 'pm',
        term.isOppositionLeader && 'opposition-leader',
      ].filter(Boolean),
      status: clean(term.status),
    };
  });

  const memberIds = new Set(members.map((m) => m.id));

  // ---- committees ----
  // The endpoint returns a record per committee PER PARLIAMENT, so the same body
  // appears twice: one constituted in 2026 for this parliament and one from 2024.
  // Group by name and keep the newest, or the site would list every standing
  // committee twice and lose half of them to slug collisions.
  //
  // A roster counts as current only when every listed member is a sitting member.
  // Many still hold the previous parliament's names, and presenting former members
  // as current would be publishing wrong information about real people.
  const records = rawCommittees.map((c) => {
    const people = (c.members ?? [])
      .filter((x) => x.member?.externalId)
      .map((x) => ({ role: clean(x.role) ?? 'Member', memberId: x.member.externalId }));
    const sitting = people.filter((x) => memberIds.has(x.memberId));
    const startDate = c.startDate && c.startDate !== 'null' ? c.startDate : null;
    return {
      id: String(c.id),
      slug: slugify(c.nameEn || `committee-${c.id}`),
      nameBn: clean(c.nameBn),
      nameEn: clean(c.nameEn),
      type: clean(c.type),
      startDate,
      rosterCurrent: people.length > 0 && sitting.length === people.length,
      memberCount: people.length,
      members: sitting,
    };
  });

  const grouped = new Map();
  for (const r of records) {
    const existing = grouped.get(r.slug);
    if (!existing) { grouped.set(r.slug, r); continue; }
    // Prefer a current roster, then the later start date.
    const better =
      r.rosterCurrent !== existing.rosterCurrent
        ? (r.rosterCurrent ? r : existing)
        : (r.startDate ?? '') > (existing.startDate ?? '') ? r : existing;
    const older = better === r ? existing : r;
    grouped.set(r.slug, { ...better, previousStartDate: older.startDate });
  }
  const committees = [...grouped.values()].sort((a, b) => {
    if (a.rosterCurrent !== b.rosterCurrent) return a.rosterCurrent ? -1 : 1;
    return (a.nameEn ?? '').localeCompare(b.nameEn ?? '');
  });

  // ---- parties, derived from who actually holds seats ----
  const partyMap = new Map();
  for (const m of members) {
    if (!m.party) continue;
    const e = partyMap.get(m.party.abbr) ?? {
      abbr: m.party.abbr, slug: slugify(m.party.abbr),
      nameBn: m.party.nameBn, nameEn: m.party.nameEn,
      seats: 0, seatsTerritorial: 0, seatsReserved: 0,
    };
    e.seats++;
    if (m.seat?.reserved) e.seatsReserved++; else e.seatsTerritorial++;
    partyMap.set(m.party.abbr, e);
  }
  const parties = [...partyMap.values()].sort((a, b) => b.seats - a.seats);

  // ---- seats ----
  const seats = members
    .filter((m) => m.seat)
    .map((m) => ({ ...m.seat, memberId: m.id }))
    .sort((a, b) => a.no - b.no);

  // ---- admin overrides and hidden entities ----
  // Applied AFTER everything above so a hand edit always wins over the source,
  // and re-applied on every sync so the source can never quietly undo it.
  let overridesApplied = 0;
  let hiddenApplied = 0;
  let adminNote = 'admin database not configured; built from parliament.gov.bd only';
  if (dbConfigured()) {
    try {
      const [overrides, hidden] = await Promise.all([
        db('overrides?select=entity_type,entity_id,field,value'),
        db('hidden_entities?select=entity_type,entity_id'),
      ]);
      const byType = { member: members, party: parties, committee: committees, seat: seats };
      const keyOf = { member: (x) => x.id, party: (x) => x.abbr, committee: (x) => x.id, seat: (x) => String(x.no) };
      for (const o of overrides) {
        const list = byType[o.entity_type];
        const target = list?.find((x) => keyOf[o.entity_type](x) === o.entity_id);
        if (!target) continue;
        target[o.field] = o.value;
        overridesApplied++;
        // A member's seat name lives on the member object too; keep them in step.
        if (o.entity_type === 'seat') {
          const m = members.find((x) => x.seat && String(x.seat.no) === o.entity_id);
          if (m) m.seat[o.field] = o.value;
        }
      }
      const hiddenMembers = new Set(hidden.filter((h) => h.entity_type === 'member').map((h) => h.entity_id));
      const hiddenCommittees = new Set(hidden.filter((h) => h.entity_type === 'committee').map((h) => h.entity_id));
      // Mutate in place: these arrays are consts referenced below.
      for (const s of seats) if (hiddenMembers.has(s.memberId)) s.memberId = null;
      members.splice(0, members.length, ...members.filter((m) => !hiddenMembers.has(m.id)));
      committees.splice(0, committees.length, ...committees.filter((c) => !hiddenCommittees.has(c.id)));
      for (const c of committees) c.members = c.members.filter((x) => !hiddenMembers.has(x.memberId));
      hiddenApplied = hiddenMembers.size + hiddenCommittees.size;
      adminNote = `applied ${overridesApplied} overrides, ${hiddenApplied} hidden`;
      console.log(`  admin: ${adminNote}`);
    } catch (err) {
      adminNote = `admin merge skipped: ${err.message}`;
      console.warn(`  ${adminNote}`);
    }
  }

  const meta = {
    parliamentNo: PARLIAMENT,
    overridesApplied,
    hidden: hiddenApplied,
    syncedAt: new Date().toISOString(),
    source: `${BASE}/api`,
    counts: {
      members: members.length,
      territorial: members.filter((m) => m.seat && !m.seat.reserved).length,
      reserved: members.filter((m) => m.seat?.reserved).length,
      parties: parties.length,
      committees: committees.length,
      committeesCurrent: committees.filter((c) => c.rosterCurrent).length,
    },
  };

  // ---- search index ----
  // Names only, in both scripts. Match keys are built in the browser, which halves
  // the download for about 8 ms of work once on load.
  const districts = new Map();
  for (const s of seats) {
    if (s.reserved || !s.nameEn || !s.nameBn) continue;
    const en = s.nameEn.replace(/-\d+$/, '');
    const bnName = s.nameBn.replace(/-[০-৯\d]+$/, '');
    if (!districts.has(en)) districts.set(en, bnName);
  }

  const searchIndex = [
    ...seats.map((s) => ['seat', s.nameBn ?? '', s.nameEn ?? '', `/ason/${s.slug}`, s.reserved ? 'সংরক্ষিত আসন' : 'আসন']),
    ...members.map((m) => ['member', m.nameBn ?? '', m.nameEn ?? '', `/mp/${m.slug}`,
      [m.seat?.nameBn, m.party?.abbr].filter(Boolean).join(' · ')]),
    ...parties.map((p) => ['party', p.nameBn ?? '', `${p.nameEn ?? ''} ${p.abbr}`, `/dol/${p.slug}`, 'দল']),
    ...[...districts].map(([en, bnName]) => ['district', bnName, en, `/jela/${slugify(en)}`, 'জেলা']),
  ];

  await mkdir(OUT, { recursive: true });
  for (const [name, value] of Object.entries({ members, committees, parties, seats, meta })) {
    await writeFile(join(OUT, `${name}.json`), JSON.stringify(value, null, 1), 'utf8');
  }
  await mkdir(join(OUT, '..', 'public'), { recursive: true });
  await writeFile(join(OUT, '..', 'public', 'search-index.json'), JSON.stringify(searchIndex), 'utf8');

  console.log('\nWrote data/ —', JSON.stringify(meta.counts));
  console.log('Wrote public/search-index.json —', searchIndex.length, 'entries');

  // ---- published news + a record of this run ----
  // Only published items reach the site, and only the fields the site shows.
  if (dbConfigured()) {
    try {
      const rows = await db('news_posts?select=id,title_bn,source_name,source_url,published_on,excerpt_bn,member_id,seat_slug&status=eq.published&order=published_on.desc&limit=500');
      const news = rows.map((r) => ({
        id: r.id, titleBn: r.title_bn, sourceName: r.source_name, sourceUrl: r.source_url,
        publishedOn: r.published_on, excerptBn: r.excerpt_bn ?? null, memberId: r.member_id ?? null, seatSlug: r.seat_slug ?? null,
      }));
      await writeFile(join(OUT, 'news.json'), JSON.stringify(news, null, 1), 'utf8');
      console.log('Wrote data/news.json —', news.length, 'published items');
    } catch (err) {
      console.warn('  news skipped:', err.message);
    }
    try {
      await db('sync_runs', {
        method: 'POST',
        body: JSON.stringify({
          finished_at: new Date().toISOString(), ok: true,
          members: members.length, committees: committees.length,
          overrides_applied: overridesApplied, message: adminNote,
        }),
      });
    } catch (err) {
      console.warn('  sync_runs not recorded:', err.message);
    }
  }
  if (members.length === 0) {
    console.error('\nNo members returned. Refusing to treat this as a successful sync.');
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('\nSync failed:', err.message);
  if (SOFT) {
    // Production build: keep the committed snapshot and let the deploy proceed.
    console.warn('--soft: keeping the committed snapshot in data/ and continuing the build.');
    if (dbConfigured()) {
      await db('sync_runs', {
        method: 'POST',
        body: JSON.stringify({ finished_at: new Date().toISOString(), ok: false, message: err.message.slice(0, 500) }),
      }).catch(() => {});
    }
    process.exit(0);
  }
  process.exit(1);
});
