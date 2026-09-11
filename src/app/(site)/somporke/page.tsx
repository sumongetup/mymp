import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import Link from 'next/link';
import { meta, ecs, bn, dateBn, statistics, committeeCounts } from '@/lib/data';
import { Page, PageHead, Card } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/somporke' },
  openGraph: shareGraph('/somporke'),
  title: 'সম্পর্কে',
  description: 'আমার এমপি বাংলাদেশের সংসদ সদস্যদের তথ্যের একটি উন্মুক্ত ওয়েবসাইট। তথ্য কোথা থেকে আসে, কীভাবে হালনাগাদ হয় আর কী দেখানো হয় না, এই পাতায় জানুন।',
};

export default function AboutPage() {
  const s = statistics();
  const cc = committeeCounts();

  return (
    <Page>
      <PageHead
        eyebrow="আমার এমপি"
        title="সম্পর্কে"
        lede="বাংলাদেশের সংসদ সদস্য, আসন, দল ও সংসদীয় কমিটির একটি উন্মুক্ত তথ্যভান্ডার, যাতে একজন নাগরিক সহজে জানতে পারেন কে তাঁর প্রতিনিধি।"
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">এই সাইটে কী আছে</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            ত্রয়োদশ জাতীয় সংসদের {bn(s.total)} জন সদস্যের প্রত্যেকের একটি করে পাতা: নাম, ছবি, দল, আসন,
            জন্মতারিখ, পেশা ও দাপ্তরিক ইমেইল। {bn(300)}টি আসনের প্রতিটির পাতা, {bn(cc.total)}টি
            সংসদীয় কমিটি, দলভিত্তিক তালিকা, আর পুরো সংসদের পরিসংখ্যান। খোঁজার ঘরে বাংলা বা ইংরেজি, যেভাবে
            খুশি লেখা যায়।
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">তথ্য কোথা থেকে আসে</h2>
          <ul className="flex flex-col gap-3 text-[15.5px] leading-relaxed text-inksoft">
            <li>
              <strong className="text-ink font-semibold">বাংলাদেশ জাতীয় সংসদ</strong> (parliament.gov.bd):
              সদস্যদের সব তথ্য, আসন, দল ও কমিটি। সংসদের নিজস্ব উন্মুক্ত তথ্যভান্ডার থেকে নিয়মিত হালনাগাদ
              করা হয়। সর্বশেষ হালনাগাদ {dateBn(meta.syncedAt)}।
            </li>
            <li>
              <strong className="text-ink font-semibold">বাংলাদেশ নির্বাচন কমিশন</strong> (ecs.gov.bd):
              সারা দেশের ভোটার ও ভোটকেন্দ্রের সংখ্যা, কমিশনের প্রকাশিত তথ্য থেকে। পড়া হয়েছে {dateBn(ecs.readOn)}।
            </li>
          </ul>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            প্রতিটি পাতার নিচে লেখা থাকে তথ্যটি কোন সূত্র থেকে এসেছে এবং কবে শেষ যাচাই হয়েছে।
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">যা আমরা করি না</h2>
          <ul className="flex flex-col gap-2.5 text-[15.5px] leading-relaxed text-inksoft list-disc ps-5">
            <li>কোনো সংখ্যা, নাম বা তারিখ অনুমান করে বসাই না। সূত্রে না থাকলে পাতায় লেখা থাকে যে তথ্যটি নেই।</li>
            <li>
              যেসব কমিটির সদস্য তালিকা সংসদের তথ্যভান্ডারে এখনো আগের সংসদের নামে আছে, সেগুলোর পুরনো
              সদস্যদের বর্তমান বলে দেখাই না। এখন এমন কমিটি {bn(cc.pending)}টি।
            </li>
            <li>সদস্যদের ব্যক্তিগত মোবাইল নম্বর প্রকাশ করি না।</li>
            <li>কোনো রাজনৈতিক দল বা সংস্থার পক্ষে বা বিপক্ষে অবস্থান নিই না। এটি একটি স্বাধীন উদ্যোগ, জাতীয় সংসদ বা নির্বাচন কমিশনের সঙ্গে সম্পর্কিত নয়।</li>
          </ul>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">ভুল দেখলে</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            কোনো তথ্য ভুল মনে হলে <Link href="/jogajog" className="text-brand font-semibold hover:underline">যোগাযোগ</Link> পাতায়
            জানান। যাচাই করে সংশোধন করা হয়, আর কোন সূত্রে যাচাই হলো তা পাতায় উল্লেখ থাকে।
          </p>
        </Card>
      </div>
    </Page>
  );
}
