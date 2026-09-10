import type { Metadata } from 'next';
import { publishedNews, bn } from '@/lib/data';
import { Page, PageHead, Card, Empty, NewsCard } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/songbad' },
  title: 'সংবাদ',
  description: 'সংসদ সদস্যদের নিয়ে অনুমোদিত সংবাদমাধ্যমের শিরোনাম।',
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
            <p className="text-[13.5px] text-muted tnum">{bn(items.length)}টি সংবাদ</p>
            <ul className="flex flex-col gap-3">
              {items.map((n) => <li key={n.id}><NewsCard n={n} /></li>)}
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
              <span>শুধু অনুমোদিত সংবাদমাধ্যমের শিরোনাম নেওয়া হয়। অন্য কোনো উৎস থেকে নয়।</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">২</span>
              <span>প্রতিটি শিরোনাম সংশ্লিষ্ট সংসদ সদস্য বা আসনের সঙ্গে মিলিয়ে নেওয়া হয়।</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">৩</span>
              <span>
                <strong className="text-ink font-semibold">কোনো সংবাদ নিজে নিজে প্রকাশ হয় না।</strong>{' '}
                একজন সম্পাদক দেখে অনুমোদন করার পরই তা সাইটে আসে।
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
