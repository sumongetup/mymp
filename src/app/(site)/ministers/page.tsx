import type { Metadata } from 'next';
import Link from 'next/link';
import { shareGraph } from '@/lib/seo';
import { posts, currentPosts, getMemberById, bn, dateBn, initial, partyColor, postsCheckedOnBn, type PostEntry } from '@/lib/data';
import { ministryKey, normalizeName } from '@/lib/posts/names';
import { Page, PageHead, Card, Stat } from '@/components/ui';
import MinistersBrowser, { type MinisterGroup, type MinisterPerson } from '@/components/MinistersBrowser';
import { CABINET_PAGE_FOR_READERS } from '../../../../config/sync-sources';

const GROUPS = ['প্রধানমন্ত্রী', 'মন্ত্রী', 'প্রতিমন্ত্রী', 'উপমন্ত্রী', 'উপদেষ্টা'];

/** The list writes "জনাব" before most names; the site's names never carry it. */
const plainName = (name: string) => name.replace(/^জনাব\s+/, '').trim();
const firstLetter = (name: string) => (plainName(name).replace(/^(ড\.|ডাঃ|ডা\.|মোঃ|ব্রিগেডিয়ার জেনারেল \(অব:\))\s*/, '') || name).charAt(0);

function cabinet() {
  const people = new Map<string, MinisterPerson>();
  for (const r of currentPosts('government')) {
    const m = r.memberId ? getMemberById(r.memberId) : undefined;
    const key = `${r.title}|${r.memberId ?? normalizeName(r.nameBn)}`;
    let p = people.get(key);
    if (!p) {
      p = {
        key,
        title: r.title,
        name: m?.nameBn ?? plainName(r.nameBn),
        href: m ? `/mp/${m.slug}` : null,
        photo: m?.photoUrl ?? r.photoUrl,
        initial: m ? initial(m) : firstLetter(r.nameBn),
        party: m?.party ? { abbr: m.party.abbr, name: m.party.nameBn ?? m.party.abbr, color: partyColor(m.party.abbr) } : null,
        seat: m?.seat?.nameBn ?? null,
        rankNote: r.rankNote,
        isMp: !!m,
        pending: false,
        ministries: [],
        sourceUrl: r.sourceUrl,
      };
      people.set(key, p);
    }
    if (r.ministryBn) p.ministries.push({ name: r.ministryBn, key: ministryKey(r.ministryBn), since: dateBn(r.fromDate) });
  }
  for (const x of posts.pending ?? []) {
    const key = `${x.title}|pending|${normalizeName(x.nameBn)}`;
    people.set(key, {
      key, title: x.title, name: plainName(x.nameBn), href: null, photo: null, initial: firstLetter(x.nameBn), party: null, seat: null,
      rankNote: null, isMp: false, pending: true, ministries: x.ministries.map((n) => ({ name: n, key: ministryKey(n), since: null })),
      sourceUrl: CABINET_PAGE_FOR_READERS,
    });
  }
  const all = [...people.values()];
  const titles = [...GROUPS, ...new Set(all.map((p) => p.title).filter((t) => !GROUPS.includes(t)))];
  const groups: MinisterGroup[] = titles.map((title) => ({ title, people: all.filter((p) => p.title === title) }));

  const ministries = new Map<string, { key: string; label: string; count: number }>();
  for (const p of all) {
    for (const m of new Map(p.ministries.map((x) => [x.key, x])).values()) {
      const e = ministries.get(m.key) ?? { key: m.key, label: m.name, count: 0 };
      e.count++;
      ministries.set(m.key, e);
    }
  }
  return { groups, ministries: [...ministries.values()].sort((a, b) => a.label.localeCompare(b.label, 'bn')) };
}

interface Change { date: string; name: string; href: string | null; text: string; kind: 'start' | 'end' | 'change' }

/** The last changes in the cabinet, from the posts' own dates: a start, an end, or both on one day. */
function changes(limit = 20): Change[] {
  const byDay = new Map<string, { date: string; name: string; href: string | null; starts: PostEntry[]; ends: PostEntry[] }>();
  for (const r of posts.rows.filter((x) => x.type === 'government')) {
    const m = r.memberId ? getMemberById(r.memberId) : undefined;
    const person = r.memberId ?? normalizeName(r.nameBn);
    const add = (date: string, side: 'starts' | 'ends') => {
      const k = `${date}|${person}`;
      const e = byDay.get(k) ?? { date, name: m?.nameBn ?? plainName(r.nameBn), href: m ? `/mp/${m.slug}` : null, starts: [], ends: [] };
      e[side].push(r);
      byDay.set(k, e);
    };
    add(r.fromDate, 'starts');
    if (r.toDate) add(r.toDate, 'ends');
  }
  const label = (rows: PostEntry[]) => `${rows[0]!.title}${rows.some((r) => r.ministryBn) ? `, ${rows.map((r) => r.ministryBn).filter(Boolean).join(', ')}` : ''}`;
  return [...byDay.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((e) => ({
      date: e.date,
      name: e.name,
      href: e.href,
      kind: e.starts.length && e.ends.length ? 'change' : e.starts.length ? 'start' : 'end',
      text: e.starts.length && e.ends.length
        ? `${label(e.ends)} থেকে ${label(e.starts)}`
        : e.starts.length ? `${label(e.starts)}: দায়িত্ব পেলেন` : `${label(e.ends)}: দায়িত্ব শেষ`,
    }));
}

const data = cabinet();
const count = (title: string) => data.groups.find((g) => g.title === title)?.people.length ?? 0;

export const metadata: Metadata = {
  alternates: { canonical: '/ministers' },
  openGraph: shareGraph('/ministers'),
  title: 'মন্ত্রিসভা',
  description: `বাংলাদেশের মন্ত্রিসভা: প্রধানমন্ত্রী, ${bn(count('মন্ত্রী'))} জন মন্ত্রী, ${bn(count('প্রতিমন্ত্রী'))} জন প্রতিমন্ত্রী ও ${bn(count('উপদেষ্টা'))} জন উপদেষ্টা, মন্ত্রণালয় ও দায়িত্ব পাওয়ার তারিখসহ। সূত্র মন্ত্রিপরিষদ বিভাগ।`,
};

export default function MinistersPage() {
  const checked = postsCheckedOnBn();
  const log = changes();
  return (
    <Page>
      <PageHead
        eyebrow="সরকার"
        title="মন্ত্রিসভা"
        lede="প্রধানমন্ত্রী, মন্ত্রী, প্রতিমন্ত্রী, উপমন্ত্রী ও উপদেষ্টারা, কে কোন মন্ত্রণালয়ে এবং কবে থেকে। তালিকা মন্ত্রিপরিষদ বিভাগের ওয়েবসাইট থেকে দিনে কয়েকবার মিলিয়ে হালনাগাদ হয়।"
      />

      <div className="pt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {GROUPS.map((t) => <Stat key={t} label={t} value={bn(count(t))} />)}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        {checked ? <>সরকারি পদ সর্বশেষ যাচাই: {checked}, </> : null}
        সূত্র:{' '}
        <a href={CABINET_PAGE_FOR_READERS} target="_blank" rel="noopener noreferrer" className="underline decoration-rule underline-offset-2 hover:text-brand">
          মন্ত্রিপরিষদ বিভাগ ↗
        </a>
        {(posts.pending?.length ?? 0) > 0 && <>। {bn(posts.pending!.length)} জন সংসদ সদস্য কিনা তা এখনো যাচাই হচ্ছে; তাঁদের নামের পাশে তা লেখা আছে।</>}
      </p>

      <div className="pt-8 pb-10">
        <MinistersBrowser groups={data.groups} ministries={data.ministries} />
      </div>

      <section className="pb-14 flex flex-col gap-4" aria-labelledby="changes">
        <h2 id="changes" className="display text-[24px]">পরিবর্তন</h2>
        <Card className="p-5 sm:p-6">
          {log.length === 0 ? (
            <p className="text-[14.5px] text-muted">এখনো কোনো পরিবর্তন লেখা হয়নি।</p>
          ) : (
            <ol className="flex flex-col divide-y divide-rulesoft">
              {log.map((c, i) => (
                <li key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-x-4 gap-y-0.5">
                  <span className="shrink-0 sm:w-[150px] text-[13px] text-muted">{dateBn(c.date)}</span>
                  <span className="text-[14.5px] leading-relaxed">
                    {c.href ? <Link href={c.href} className="font-semibold hover:text-brand">{c.name}</Link> : <span className="font-semibold">{c.name}</span>}
                    {', '}
                    <span className={c.kind === 'end' ? 'text-muted' : ''}>{c.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 pt-3 border-t border-rule text-[12.5px] text-muted leading-relaxed">
            দায়িত্ব পাওয়ার তারিখ মন্ত্রিপরিষদ বিভাগের তালিকার বণ্টনের তারিখ। কারও নাম তালিকা থেকে সরে গেলে যেদিন তা ধরা পড়ে, সেদিনকে দায়িত্ব শেষের তারিখ ধরা হয়।
          </p>
        </Card>
      </section>
    </Page>
  );
}
