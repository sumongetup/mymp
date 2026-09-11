// Prints the generated introduction for a few members, to read before a build: npx tsx scripts/preview-intro.mts [slug…]
import { allMembers, meta, OFFICE_LABELS } from '../src/lib/data';
import { rolesOf } from '../src/lib/activity';
import { resultForSeat, electionYear, priorTermsOf } from '../src/lib/history';
import { introOf } from '../src/lib/intro';
import { sourceOf } from '../src/components/results';

const pick = process.argv.slice(2);
const sample = pick.length
  ? allMembers.filter((m) => pick.includes(m.slug))
  : [
      allMembers.find((m) => m.slug === 'tarique-rahman'),
      allMembers.find((m) => m.resignedOn),
      allMembers.find((m) => m.seat?.reserved),
      allMembers.find((m) => m.party?.nameBn === 'স্বতন্ত্র'),
      allMembers.find((m) => (m.termsCount ?? 0) >= 4 && priorTermsOf(m.id).length >= 2),
      allMembers.find((m) => m.slug === 'md-rezaul-karim-badsha'),
      allMembers.find((m) => m.party?.abbr === 'NCP'),
    ].filter(Boolean);

for (const m of sample) {
  if (!m) continue;
  const result = m.seat && !m.seat.reserved ? resultForSeat(m.seat.no, meta.parliamentNo) : null;
  const won = !!result && [...result.candidates].sort((a, b) => b.votes - a.votes)[0]?.name === m.nameBn;
  const roles = [...new Set([...m.offices.map((o) => OFFICE_LABELS[o] ?? o), ...rolesOf(m.id)])];
  const intro = introOf(m, { roles, result: won ? result : null, resultSourceBy: result ? sourceOf(result.sourceUrl).by : null, year: electionYear(meta.parliamentNo) });
  console.log(`--- ${m.slug}\n${intro.join('\n\n')}\n`);
}
