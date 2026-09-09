import type { Metadata } from 'next';
import Link from 'next/link';
import { members, parties, meta, bn, dateBn, statistics, districtOf, publishedNews } from '@/lib/data';
import { Page, Card, MemberCard, CompositionBar, Empty, NewsCard } from '@/components/ui';
import SiteSearch from '@/components/SiteSearch';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  const stats = statistics();
  const latestNews = publishedNews().slice(0, 3);

  // Members holding an office lead the page: Speaker, Deputy Speaker and so on.
  const notable = members.filter((m) => m.offices.length > 0);
  const featured = [
    ...notable,
    ...members.filter((m) => !m.offices.length && m.seat && !m.seat.reserved),
  ].slice(0, 4);

  const districts = new Map<string, { bn: string; count: number }>();
  for (const m of members) {
    const d = districtOf(m.seat);
    if (!d) continue;
    const e = districts.get(d.en) ?? { bn: d.bn, count: 0 };
    e.count++;
    districts.set(d.en, e);
  }
  const topDistricts = [...districts.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <Page>
      <section className="pt-10 sm:pt-16 pb-12 flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
        <div className="grow flex flex-col gap-6 w-full">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">
            ত্রয়োদশ জাতীয় সংসদ · ২০২৬
          </span>
          <h1 className="serif text-[38px] sm:text-[52px] lg:text-[58px] leading-[1.12] font-extrabold text-balance">
            আপনার সংসদ সদস্যকে চিনুন
          </h1>
          <p className="text-[17px] sm:text-[20px] leading-relaxed text-inksoft max-w-[600px] text-pretty">
            {bn(stats.total)} জন সংসদ সদস্য, {bn(300)} আসন, {bn(parties.length)}টি দল।
            আসন, জেলা, এমপি বা দলের নাম বাংলা বা ইংরেজিতে লিখে খুঁজুন।
          </p>
          <SiteSearch />
          <div className="flex flex-wrap items-center gap-2.5 text-[14px] text-muted">
            <span>জনপ্রিয়:</span>
            {['ঢাকা-১০', 'সিলেট', 'বিএনপি'].map((t) => (
              <span key={t} className="px-3.5 py-1.5 border border-rule rounded-full bg-surface text-ink font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>

        <Card className="w-full lg:w-[440px] shrink-0 p-6 sm:p-7 flex flex-col gap-4">
          <div className="flex justify-between items-baseline">
            <h2 className="serif text-[21px] font-bold">সংসদের গঠন</h2>
            <Link href="/parisonkhan" className="text-[14px] font-semibold text-brand hover:underline">
              পরিসংখ্যান →
            </Link>
          </div>
          <p className="text-[14px] text-muted -mt-2">
            {bn(stats.total)} সদস্য · {bn(stats.territorial)} আসনভিত্তিক · {bn(stats.reserved)} সংরক্ষিত নারী আসন
          </p>
          <CompositionBar parties={parties} total={stats.total} majority={stats.majority} />
          <p className="text-[12px] text-muted border-t border-rule pt-3 leading-relaxed">
            শুধু আসনভিত্তিক ফল আলাদা: {parties.slice(0, 2).map((p) => `${p.nameBn ?? p.abbr} ${bn(p.seatsTerritorial)}`).join(', ')}।
            সংরক্ষিত {bn(stats.reserved)}টি আসন ফলের পর দলগুলোর মধ্যে ভাগ হয়।
          </p>
          <p className="text-[12px] text-muted">
            তথ্যসূত্র: বাংলাদেশ জাতীয় সংসদ · হালনাগাদ {dateBn(meta.syncedAt)}
          </p>
        </Card>
      </section>

      <section className="pb-12 flex flex-col gap-5">
        <div className="flex justify-between items-baseline">
          <h2 className="serif text-[26px] sm:text-[30px] font-bold">জেলা অনুযায়ী</h2>
          <Link href="/mp" className="text-[15px] font-semibold text-brand hover:underline">
            সব এমপি →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {topDistricts.map((d) => (
            <Card key={d.bn} className="p-5 flex flex-col gap-1.5">
              <span className="serif text-[20px] font-bold">{d.bn}</span>
              <span className="text-[14px] text-muted">{bn(d.count)} আসন</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-12 flex flex-col gap-5">
        <div className="flex justify-between items-baseline">
          <h2 className="serif text-[26px] sm:text-[30px] font-bold">সংসদ সদস্য</h2>
          <Link href="/mp" className="text-[15px] font-semibold text-brand hover:underline">
            সব {bn(stats.total)} জন →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((m) => <MemberCard key={m.id} m={m} />)}
        </div>
      </section>

      <section className="pb-14 flex flex-col gap-5">
        <div className="flex justify-between items-baseline">
          <h2 className="serif text-[26px] sm:text-[30px] font-bold">সংবাদে সংসদ সদস্যরা</h2>
          <Link href="/songbad" className="text-[15px] font-semibold text-brand hover:underline">
            সংবাদ →
          </Link>
        </div>
        {latestNews.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestNews.map((n) => <NewsCard key={n.id} n={n} />)}
          </div>
        ) : (
          <Empty
            title="এখনো কোনো সংবাদ প্রকাশ করা হয়নি"
            body="অনুমোদিত সংবাদমাধ্যমের শিরোনাম যাচাইয়ের পর এখানে দেখানো হবে। যাচাই ছাড়া কোনো সংবাদ এই সাইটে প্রকাশ করা হয় না।"
          />
        )}
      </section>
    </Page>
  );
}
