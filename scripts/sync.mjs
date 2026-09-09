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
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.parliament.gov.bd';
const PARLIAMENT = 13;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(BASE + path, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
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

  const meta = {
    parliamentNo: PARLIAMENT,
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
  if (members.length === 0) {
    console.error('\nNo members returned. Refusing to treat this as a successful sync.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nSync failed:', err.message);
  process.exit(1);
});
