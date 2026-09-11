import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import { bn, initial, getMember } from '@/lib/data';
import { allStories } from '@/lib/newsView';
import { Page, PageHead, Card, Empty, Stat } from '@/components/ui';
import NewsBrowser from '@/components/NewsBrowser';
import MemberPhoto from '@/components/MemberPhoto';

export const metadata: Metadata = {
  alternates: { canonical: '/songbad' },
  openGraph: shareGraph('/songbad'),
  title: 'সংবাদ',
  description: 'সংসদ সদস্যদের নিয়ে দেশের সংবাদমাধ্যমের সর্বশেষ শিরোনাম, মূল খবরের লিংকসহ। প্রতিটি শিরোনাম সংশ্লিষ্ট সংসদ সদস্যের পাতাতেও দেখা যায়।',
};

/** The browser gets at most this many stories; the build has them all. */
const LIMIT = 300;

export default function NewsPage() {
  const stories = allStories().slice(0, LIMIT);

  // Who is in the news, by number of stories; the list's member filter and the side card both use it.
  const counts = new Map<string, { slug: string; name: string; count: number }>();
  for (const s of stories) {
    if (!s.member) continue;
    const e = counts.get(s.member.slug) ?? { slug: s.member.slug, name: s.member.name, count: 0 };
    e.count++;
    counts.set(s.member.slug, e);
  }
  const members = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'bn'));

  const outletCounts = new Map<string, number>();
  for (const s of stories) for (const src of [s.lead.source, ...s.also.map((a) => a.source)]) outletCounts.set(src, (outletCounts.get(src) ?? 0) + 1);
  const outlets = [...outletCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'bn'));

  return (
    <Page>
      <PageHead
        eyebrow="মিডিয়া ও সংবাদ"
        title="সংবাদ"
        lede="সংসদ সদস্য ও আসন নিয়ে অনুমোদিত সংবাদমাধ্যমের শিরোনাম, প্রতিটির সঙ্গে মূল সংবাদের লিংক। একই খবর কয়েকটি সংবাদমাধ্যমে এলে তা একসঙ্গে দেখানো হয়।"
        aside={
          stories.length ? (
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <Stat label="খবর" value={bn(stories.length)} />
              <Stat label="সংবাদমাধ্যম" value={bn(outlets.length)} />
            </div>
          ) : undefined
        }
      />

      <div className="pt-8 pb-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <div className="min-w-0">
          {stories.length ? (
            <NewsBrowser stories={stories} members={members} outlets={outlets} />
          ) : (
            <Empty
              title="এখনো কোনো সংবাদ প্রকাশ করা হয়নি"
              body="অনুমোদিত সংবাদমাধ্যমের শিরোনাম যাচাইয়ের পর এখানে দেখানো হবে।"
            />
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          {members.length > 0 && (
            <Card className="p-5 flex flex-col gap-3">
              <h2 className="display text-[18px] font-bold">সবচেয়ে বেশি খবরে</h2>
              <ul className="flex flex-col">
                {members.slice(0, 8).map((m) => {
                  const member = getMember(m.slug);
                  return (
                    <li key={m.slug}>
                      <a href={`#mp=${m.slug}`} className="flex items-center gap-3 py-2 rounded-lg hover:text-brand transition-colors">
                        <MemberPhoto src={member?.photoUrl ?? null} alt="" initial={member ? initial(member) : m.name.charAt(0)} size={36} />
                        <span className="grow min-w-0 text-[14.5px] font-semibold truncate">{m.name}</span>
                        <span className="shrink-0 text-[13px] text-muted">{bn(m.count)}টি খবর</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[12.5px] text-muted leading-relaxed">নামে চাপ দিলে শুধু তাঁর খবর দেখাবে।</p>
            </Card>
          )}

          <Card className="p-5 flex flex-col gap-3">
            <h2 className="display text-[18px] font-bold">সংবাদ কীভাবে যুক্ত হয়</h2>
            <ol className="flex flex-col gap-3 text-[14px] leading-relaxed text-inksoft">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">১</span>
                <span>দেশি-বিদেশি ৮০টি সংবাদমাধ্যমের তালিকা থেকে শিরোনাম নেওয়া হয়, শুধু সেই সাইটগুলো থেকে যেগুলো নিজেরাই ফিড বা নিউজ সাইটম্যাপ প্রকাশ করে এবং যাদের robots.txt তা অনুমতি দেয়।</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">২</span>
                <span>একজন সংসদ সদস্যের সঙ্গে যুক্ত হতে শিরোনামে তাঁর নাম এবং তাঁর পদ, আসন বা “এমপি”-র মতো প্রসঙ্গ দুটোই লাগে। শুধু নামের মিলে কোনো শিরোনাম কারও সঙ্গে যুক্ত হয় না।</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">৩</span>
                <span>
                  <strong className="text-ink font-semibold">মিল নিশ্চিত হলে শিরোনাম নিজে থেকে প্রকাশ হয়; সন্দেহ থাকলে একজন সম্পাদক দেখে অনুমোদন করার পরই আসে।</strong>{' '}
                  ভুল মিল চোখে পড়লে জানান, সম্পাদক তা সরিয়ে দেবেন।
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">৪</span>
                <span>শুধু শিরোনাম, সংবাদমাধ্যমের নাম, তারিখ ও মূল সংবাদের লিংক রাখা হয়। পুরো সংবাদ কপি করা হয় না।</span>
              </li>
            </ol>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
