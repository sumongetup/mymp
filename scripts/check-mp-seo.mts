// Prints the title and description of a spread of members, and checks every member's
// for the characters the owner ruled out (· — –) and for the 160-character cap:
//   npx tsx scripts/check-mp-seo.mts
import { allMembers, type Member } from '../src/lib/data';
import { charCount, DESCRIPTION_MAX, isIndependent, mpDescription, mpTitle } from '../src/lib/seo/mpDescription';

const by = (f: (m: Member) => boolean) => allMembers.find(f);
const longest = [...allMembers].sort((a, b) => charCount(mpDescription(b)) - charCount(mpDescription(a)))[0]!;
const longName = [...allMembers].sort((a, b) => (b.nameBn?.length ?? 0) - (a.nameBn?.length ?? 0))[0]!;

// No member holds a ministry in the data yet, so the minister case is a constructed example.
const tarique = by((m) => m.slug === 'tarique-rahman')!;
const minister = { ...tarique, nameBn: 'উদাহরণ সদস্য (কাল্পনিক)', partyRoleBn: null, ministryBn: 'স্বরাষ্ট্র মন্ত্রণালয়', govPost: 'minister' };
const ministerWithRole = { ...minister, partyRoleBn: 'মহাসচিব', govPost: 'state-minister' };

const cases: [string, Member | typeof minister | undefined][] = [
  ['general seat, party role', tarique],
  ['general seat, no role (BNP)', by((m) => m.party?.abbr === 'BNP' && !m.seat?.reserved && !m.partyRoleBn && !m.resignedOn)],
  ['general seat, no role (Jamaat)', by((m) => m.party?.abbr === 'BJEI' && !m.seat?.reserved)],
  ['general seat, NCP', by((m) => m.party?.abbr === 'NCP')],
  ['reserved seat', by((m) => !!m.seat?.reserved)],
  ['independent', by((m) => isIndependent(m))],
  ['minister (constructed example)', minister],
  ['party role and state minister (constructed example)', ministerWithRole],
  ['very long name', longName],
  ['longest description, long party (JAGPA)', by((m) => m.party?.abbr === 'JAGPA') ?? longest],
  ['resigned', by((m) => !!m.resignedOn)],
];
for (const [label, m] of cases) {
  if (!m) continue;
  const d = mpDescription(m);
  console.log(`\n# ${label}\n  title (${charCount(mpTitle(m))}): ${mpTitle(m)}\n  description (${charCount(d)}): ${d}`);
}

let bad = 0;
let over = 0;
for (const m of allMembers) {
  const t = mpTitle(m);
  const d = mpDescription(m);
  if (/[·—–]/.test(t + d)) {
    bad++;
    console.log('FORBIDDEN CHARACTER', m.slug, t, d);
  }
  if (charCount(d) > DESCRIPTION_MAX) {
    over++;
    console.log('OVER 160 (sentence 1 alone is longer)', m.slug, charCount(d));
  }
}
const lengths = allMembers.map((m) => charCount(mpDescription(m)));
console.log(`\nall ${allMembers.length} members: forbidden characters ${bad}, over ${DESCRIPTION_MAX}: ${over}, description length ${Math.min(...lengths)}-${Math.max(...lengths)}`);
