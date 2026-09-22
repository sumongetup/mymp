import { bn, bnGroup, getMemberById, meta, partyShortBn } from './data';
import { genitiveBn } from './seo/mpDescription';
import { seatHolders, resultForSeat, electionYear, parliamentOrdinal } from './history';
import type { DistrictGroup } from './districts';

/**
 * A paragraph about a district, written from the data the site already holds:
 * its division, its seats and the upazilas they cover, who holds them in this
 * parliament, who held them in the last one, and how many votes were cast.
 *
 * Nothing here is looked up outside the site's own records, so every sentence
 * is exactly as current as the pages it sits above. The owner asked for a
 * description on every district page (23 September 2026).
 */

/** Division of each district, by the district's slug. The eight divisions are fixed by law. */
const DIVISION: Record<string, string> = {
  panchagarh: 'রংপুর', thakurgaon: 'রংপুর', dinajpur: 'রংপুর', nilphamari: 'রংপুর', lalmonirhat: 'রংপুর', rangpur: 'রংপুর', kurigram: 'রংপুর', gaibandha: 'রংপুর',
  jaipurhat: 'রাজশাহী', bogura: 'রাজশাহী', chapainawabganj: 'রাজশাহী', naogaon: 'রাজশাহী', rajshahi: 'রাজশাহী', natore: 'রাজশাহী', sirajganj: 'রাজশাহী', pabna: 'রাজশাহী',
  meherpur: 'খুলনা', kushtia: 'খুলনা', chuadanga: 'খুলনা', jhenaidah: 'খুলনা', jashore: 'খুলনা', magura: 'খুলনা', narail: 'খুলনা', bagerhat: 'খুলনা', khulna: 'খুলনা', satkhira: 'খুলনা',
  barguna: 'বরিশাল', patuakhali: 'বরিশাল', bhola: 'বরিশাল', barishal: 'বরিশাল', jhalokathi: 'বরিশাল', pirojpur: 'বরিশাল',
  tangail: 'ঢাকা', kishoreganj: 'ঢাকা', manikganj: 'ঢাকা', munshiganj: 'ঢাকা', dhaka: 'ঢাকা', gazipur: 'ঢাকা', narsingdi: 'ঢাকা', narayanganj: 'ঢাকা', rajbari: 'ঢাকা', faridpur: 'ঢাকা', gopalgonj: 'ঢাকা', madaripur: 'ঢাকা', shariatpur: 'ঢাকা',
  jamalpur: 'ময়মনসিংহ', sherpur: 'ময়মনসিংহ', mymensingh: 'ময়মনসিংহ', netrokona: 'ময়মনসিংহ',
  sunamganj: 'সিলেট', sylhet: 'সিলেট', maulvibazar: 'সিলেট', habiganj: 'সিলেট',
  brahmanbaria: 'চট্টগ্রাম', cumilla: 'চট্টগ্রাম', chandpur: 'চট্টগ্রাম', feni: 'চট্টগ্রাম', noakhali: 'চট্টগ্রাম', laxmipur: 'চট্টগ্রাম', chattogram: 'চট্টগ্রাম', 'coxs-bazar': 'চট্টগ্রাম', khagrachhari: 'চট্টগ্রাম', rangamati: 'চট্টগ্রাম', bandarban: 'চট্টগ্রাম',
};

/** "(ক) পঞ্চগড় সদর, (খ) তেঁতুলিয়া এবং (গ)আটোয়ারী উপজেলা" → "পঞ্চগড় সদর, তেঁতুলিয়া ও আটোয়ারী উপজেলা". */
function areaOf(boundary: string | null): string | null {
  if (!boundary) return null;
  // A boundary that goes down to unions ("...উপজেলার নিম্নলিখিত ইউনিয়ন সমূহ:
  // (১)ধর্মগড় ...") is too long for a sentence; the seat page carries it in full.
  if (/ইউনিয়ন|ব্যতীত|ওয়ার্ড/.test(boundary)) return null;
  const s = boundary
    .replace(/\([ক-হ]\)\s*/g, '')
    .replace(/\s*এবং\s*/g, ' ও ')
    .replace(/\s+/g, ' ')
    .trim();
  return s && s.length <= 70 ? s : null;
}

/** "ক, খ ও গ" */
const listBn = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ও ${xs[xs.length - 1]}`);

function partyCounts(rows: { party: string | null }[]): [string, number][] {
  const c = new Map<string, number>();
  for (const r of rows) if (r.party) c.set(r.party, (c.get(r.party) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]);
}

/** A party's short name in the possessive: বিএনপি → বিএনপির; "স্বতন্ত্র" stays as it is. */
const genitive = (name: string) => (name === 'স্বতন্ত্র' ? name : genitiveBn(name));

/** A former holder's party, shortened the way the site shows parties: no bracketed initials, no suffix. */
const shortName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').replace(/^বাংলাদেশ আওয়ামী লীগ$/, 'আওয়ামী লীগ').trim();

/**
 * "বিএনপির ১৩টি, জামায়াতে ইসলামীর ৬টি ও এনসিপির ১টি"; with one seat, "বিএনপির";
 * with every seat one party's, "সবগুলো আসনই বিএনপির".
 */
function holdingsBn(counts: [string, number][], total: number, single: boolean): string {
  if (single) return genitive(counts[0][0]);
  if (counts.length === 1 && counts[0][1] === total) return `সবগুলো আসনই ${genitive(counts[0][0])}`;
  return listBn(counts.map(([p, n]) => `${genitive(p)} ${bn(n)}টি`));
}

export interface DistrictIntro {
  /** Two to four sentences for the page. */
  text: string;
  /** One sentence for the description tag. */
  short: string;
}

export function districtIntro(d: DistrictGroup): DistrictIntro {
  const division = DIVISION[d.slug];
  const seats = d.seats;
  const n = seats.length;
  const parts: string[] = [];

  // 1. Where it is and what it sends.
  parts.push(
    `${d.bn} জেলা ${division ? `${division} বিভাগের একটি জেলা, ` : ''}জাতীয় সংসদে যার ${bn(n)}টি আসন: ` +
      (n <= 6
        ? listBn(seats.map((s) => `${s.nameBn}${areaOf(s.boundaryBn) ? ` (${areaOf(s.boundaryBn)})` : ''}`))
        : `${seats[0].nameBn} থেকে ${seats[n - 1].nameBn}`) +
      '।',
  );

  // 2. Who holds them now.
  const now = seats.map((s) => {
    const m = s.memberId && !s.vacantSince ? getMemberById(s.memberId) : undefined;
    return { party: partyShortBn(m?.party) ?? null, vacant: !m };
  });
  const vacant = now.filter((x) => x.vacant).length;
  const nowCounts = partyCounts(now);
  if (nowCounts.length) {
    parts.push(
      vacant
        ? // "১টি আসন এখন শূন্য, বাকি ২টিই বিএনপির" / "বাকি ১৫টির মধ্যে বিএনপির ১৩টি ও ..."
          `${parliamentOrdinal(meta.parliamentNo)}ে ${bn(vacant)}টি আসন এখন শূন্য, বাকি ${
            nowCounts.length === 1
              ? `${bn(n - vacant)}টিই ${genitive(nowCounts[0][0])}`
              : `${bn(n - vacant)}টির মধ্যে ${holdingsBn(nowCounts, n - vacant, false)}`
          }।`
        : `${parliamentOrdinal(meta.parliamentNo)}ে ${n === 1 ? 'আসনটি' : nowCounts.length === 1 ? '' : 'আসনগুলোর মধ্যে'} ${holdingsBn(nowCounts, n, n === 1)}।`.replace(/\s{2,}/g, ' '),
    );
  }

  // 3. Who held them last time, when the record has it.
  const prevNo = meta.parliamentNo - 1;
  const prev = seats
    .map((s) => seatHolders(s.no).find((h) => h.parliamentNo === prevNo))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .map((h) => ({ party: h.partyNameBn ? shortName(h.partyNameBn) : h.partyAbbr }));
  const prevCounts = partyCounts(prev);
  if (prev.length === n && prevCounts.length) {
    const year = electionYear(prevNo);
    parts.push(`${parliamentOrdinal(prevNo)}ে${year ? ` (${bn(year)})` : ''} ${n === 1 ? 'আসনটি ছিল' : prevCounts.length === 1 ? '' : 'এই আসনগুলো ছিল'} ${holdingsBn(prevCounts, n, n === 1)}${prevCounts.length === 1 && n > 1 ? ' ছিল' : ''}।`.replace(/\s{2,}/g, ' '));
  }

  // 4. The vote, where every seat's result is on record.
  const results = seats.map((s) => resultForSeat(s.no, meta.parliamentNo));
  if (results.every((r) => r && r.totalVotes)) {
    const total = results.reduce((t, r) => t + (r!.totalVotes ?? 0), 0);
    const year = electionYear(meta.parliamentNo);
    parts.push(`${year ? `${bn(year)} সালের` : 'এই'} নির্বাচনে জেলার ${n === 1 ? 'আসনটিতে' : `${bn(n)}টি আসনে`} মোট ${bnGroup(total)} ভোট গণনা হয়, প্রকাশিত ফল অনুযায়ী।`);
  }

  return {
    text: parts.join(' '),
    short: `${d.bn} জেলার ${bn(n)}টি সংসদীয় আসন${nowCounts.length ? `, ${parliamentOrdinal(meta.parliamentNo)}ে ${holdingsBn(nowCounts, n - vacant, n === 1)}` : ''}। প্রতিটি আসনের বর্তমান সংসদ সদস্য, দল ও এলাকা।`,
  };
}
