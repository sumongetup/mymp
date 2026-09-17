/**
 * The app's নির্বাচন screen: the 2026 election and the House it produced, from
 * the same snapshot the site's /nirbachon and /parisonkhan pages read. Nothing
 * here is computed that those pages do not already publish, apart from the vote
 * totals and margins, which are sums over the same per-seat results.
 */
import { members, parties, seats, meta, ecs, statistics, partyShortBn, getMemberById, GENERAL_SEATS } from '@/lib/data';
import { parliament } from '@/lib/activity';
import { experienceStats, resultForSeat } from '@/lib/history';
import { brief } from '@/lib/app/payload';

/** Parties that won votes but no seat carry codes the party list does not know. */
const VOTE_ONLY_BN: Record<string, string> = {
  IAB: 'ইসলামী আন্দোলন',
  LDP: 'এলডিপি',
  'JP(ERSHAD)': 'জাতীয় পার্টি',
  JUIB: 'জমিয়তে উলামায়ে ইসলাম',
};

/**
 * Professions as the secretariat typed them: "ব্যবসা", "ব্যবসায়ী" and "ব্যাবসা"
 * are one job, and "সংসদ সদস্য" is not a profession at all.
 */
function professionGroups(rows: { label: string; count: number }[]) {
  const clean = (x: string) => x.replace(/[\u200c\u200d]/g, '').trim();
  const group = (x: string) => {
    const t = clean(x);
    if (/^(ব্যবসা|ব্যাবসা|ব্যবসায়ী|ব্যাবসায়ী)$/.test(t)) return 'ব্যবসা';
    if (/^(শিক্ষক|শিক্ষকতা|অবসরপ্রাপ্ত শিক্ষক)$/.test(t)) return 'শিক্ষকতা';
    if (/^(আইনজীবী|আইন পেশা|আইনজীবি)$/.test(t)) return 'আইনজীবী';
    if (/^সংসদ সদস্য$/.test(t)) return null;
    return t;
  };
  const out = new Map<string, number>();
  for (const r of rows) {
    const g = group(r.label);
    if (g) out.set(g, (out.get(g) ?? 0) + r.count);
  }
  return [...out].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

const partyLabel = (abbr: string) => {
  const known = parties.find((p) => p.abbr === abbr);
  return known ? partyShortBn(known) ?? abbr : VOTE_ONLY_BN[abbr] ?? null;
};

export function election() {
  const s = statistics();
  const x = experienceStats();

  // Per-seat results: vote totals by party, and each winner's margin over the runner-up.
  const votesByParty = new Map<string, number>();
  let counted = 0;
  let totalVotes = 0;
  const margins: { seatNo: number; margin: number; winnerVotes: number; runnerUpParty: string | null }[] = [];
  for (const seat of seats) {
    if (seat.reserved) continue;
    const r = resultForSeat(seat.no, meta.parliamentNo);
    if (!r || !r.candidates.length) continue;
    counted++;
    for (const c of r.candidates) {
      totalVotes += c.votes;
      const party = c.party ?? 'Ind';
      votesByParty.set(party, (votesByParty.get(party) ?? 0) + c.votes);
    }
    const [top, second] = [...r.candidates].sort((a, b) => b.votes - a.votes);
    // An exact tie is a transcription error in the source (Tangail-3 as read), not a result to headline.
    if (top && second && top.votes > second.votes) margins.push({ seatNo: seat.no, margin: top.votes - second.votes, winnerVotes: top.votes, runnerUpParty: second.party ? partyLabel(second.party) : null });
  }

  const ranked = [...votesByParty].sort((a, b) => b[1] - a[1]);
  const shown = ranked.filter(([abbr]) => partyLabel(abbr)).slice(0, 6);
  const other = totalVotes - shown.reduce((n, [, v]) => n + v, 0);
  const voteShare = [
    ...shown.map(([abbr, votes]) => ({ abbr, labelBn: partyLabel(abbr)!, votes })),
    ...(other > 0 ? [{ abbr: 'other', labelBn: 'অন্যান্য', votes: other }] : []),
  ];

  const seatRow = (m: (typeof margins)[number]) => {
    const seat = seats.find((z) => z.no === m.seatNo)!;
    const member = seat.memberId ? getMemberById(seat.memberId) : undefined;
    return { seatNo: m.seatNo, seatBn: seat.nameBn, margin: m.margin, winnerVotes: m.winnerVotes, runnerUpParty: m.runnerUpParty, member: member ? brief(member) : null };
  };
  const byMargin = [...margins].sort((a, b) => a.margin - b.margin);

  return {
    version: meta.builtAt,
    parliamentNo: meta.parliamentNo,
    dates: {
      election: parliament.electionDate ?? null,
      gazette: parliament.gazetteDate ?? null,
      oath: parliament.oathDate ?? null,
      end: parliament.endDate ?? null,
    },
    house: {
      total: s.total,
      generalSeats: GENERAL_SEATS,
      territorial: s.territorial,
      reserved: s.reserved,
      majority: s.majority,
      parties: parties
        .filter((p) => members.some((m) => m.party?.abbr === p.abbr))
        .map((p) => ({
          abbr: p.abbr,
          labelBn: partyShortBn(p) ?? p.abbr,
          seats: members.filter((m) => m.party?.abbr === p.abbr).length,
          seatsTerritorial: p.seatsTerritorial,
        }))
        .sort((a, b) => b.seats - a.seats),
    },
    voters: {
      registered: ecs.national.registeredVoters,
      male: ecs.national.maleVoters,
      female: ecs.national.femaleVoters,
      pollingCentres: ecs.national.pollingCentres,
      registeredParties: ecs.national.registeredParties,
      sourceBn: 'বাংলাদেশ নির্বাচন কমিশন',
      readOn: ecs.readOn,
    },
    results: {
      seatsCounted: counted,
      totalVotes,
      voteShare,
      closest: byMargin.slice(0, 5).map(seatRow),
      widest: byMargin.slice(-5).reverse().map(seatRow),
      sourceBn: 'দ্য বিজনেস স্ট্যান্ডার্ড ও উইকিপিডিয়ায় প্রকাশিত আসনভিত্তিক ফল; নির্বাচন কমিশনের গেজেটের সঙ্গে এখনো মিলিয়ে দেখা হয়নি।',
    },
    members: {
      women: s.women,
      womenTerritorial: s.womenTerritorial,
      womenReserved: s.womenReserved,
      medianAge: s.medianAge,
      youngest: s.youngest ? { age: s.youngest.age, member: brief(s.youngest.m) } : null,
      oldest: s.oldest ? { age: s.oldest.age, member: brief(s.oldest.m) } : null,
      ageBands: s.ageBands,
      professions: professionGroups(s.professions).slice(0, 6),
      freedomFighters: s.freedomFighters,
      firstTime: x.firstTime,
      returning: x.returning,
      experience: x.bands,
    },
  };
}
