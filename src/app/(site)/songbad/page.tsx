import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import { publishedNews, bn } from '@/lib/data';
import { Page, PageHead, Card, Empty, NewsCard } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/songbad' },
  openGraph: shareGraph('/songbad'),
  title: 'সংবাদ',
  description: 'সংসদ সদস্যদের নিয়ে দেশের সংবাদমাধ্যমের সর্বশেষ শিরোনাম, মূল খবরের লিংকসহ। প্রতিটি শিরোনাম সংশ্লিষ্ট সংসদ সদস্যের পাতাতেও দেখা যায়।',
};

export default function NewsPage() {
  const items = publishedNews();

  return (
    <Page>
      <PageHead
        eyebrow="মিডিয়া ও সংবাদ"
        title="সংবাদ"
        lede="সংসদ সদস্য ও আসন নিয়ে অনুমোদিত সংবাদমাধ্যমের শিরোনাম, প্রতিটির সঙ্গে মূল সংবাদের লিংক।"
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        {items.length ? (
          <>
            <p className="text-[13.5px] text-muted tnum">
              {items.length > 300 ? `সর্বশেষ ${bn(300)}টি দেখানো হচ্ছে, মোট ${bn(items.length)}টি সংবাদ` : `${bn(items.length)}টি সংবাদ`}
            </p>
            <ul className="flex flex-col gap-3">
              {items.slice(0, 300).map((n) => <li key={n.id}><NewsCard n={n} /></li>)}
            </ul>
          </>
        ) : (
          <Empty
            title="এখনো কোনো সংবাদ প্রকাশ করা হয়নি"
            body="অনুমোদিত সংবাদমাধ্যমের শিরোনাম যাচাইয়ের পর এখানে দেখানো হবে।"
          />
        )}

        <Card className="p-6 flex flex-col gap-4">
          <h2 className="display text-[20px] font-bold">সংবাদ কীভাবে যুক্ত হয়</h2>
          <ol className="flex flex-col gap-3 text-[15px] leading-relaxed text-inksoft">
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
      </div>
    </Page>
  );
}
