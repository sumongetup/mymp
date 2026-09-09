import type { Metadata } from 'next';
import { Page, PageHead, Card, Empty } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/songbad' },
  title: 'সংবাদ',
  description: 'সংসদ সদস্যদের নিয়ে অনুমোদিত সংবাদমাধ্যমের শিরোনাম।',
};

export default function NewsPage() {
  return (
    <Page>
      <PageHead
        eyebrow="মিডিয়া ও সংবাদ"
        title="সংবাদ"
        lede="সংসদ সদস্য ও আসন নিয়ে অনুমোদিত সংবাদমাধ্যমের শিরোনাম, প্রতিটির সঙ্গে মূল সংবাদের লিংক।"
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        <Empty
          title="সংবাদ সংযোজন এখনো চালু হয়নি"
          body="অনুমোদিত সংবাদমাধ্যম থেকে শিরোনাম আনার ব্যবস্থা তৈরি হচ্ছে। চালু হলে এখানে সর্বশেষ সংবাদ দেখা যাবে।"
        />

        <Card className="p-6 flex flex-col gap-4">
          <h2 className="serif text-[20px] font-bold">সংবাদ কীভাবে যুক্ত হবে</h2>
          <ol className="flex flex-col gap-3 text-[15px] leading-relaxed text-inksoft">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">১</span>
              <span>শুধু অনুমোদিত সংবাদমাধ্যমের তালিকা থেকে শিরোনাম আনা হবে। অন্য কোনো উৎস থেকে নয়।</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">২</span>
              <span>প্রতিটি শিরোনাম সংশ্লিষ্ট সংসদ সদস্য বা আসনের সঙ্গে মিলিয়ে নেওয়া হবে।</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">৩</span>
              <span>
                <strong className="text-ink font-semibold">কোনো সংবাদ নিজে নিজে প্রকাশ হবে না।</strong>{' '}
                একজন সম্পাদক দেখে অনুমোদন করার পরই তা সাইটে আসবে। জীবিত মানুষের নামের সঙ্গে ভুল সংবাদ
                জুড়ে যাওয়া ছোট ভুল নয়।
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brandsoft text-brand text-[12px] font-bold grid place-items-center tnum">৪</span>
              <span>
                শুধু শিরোনাম, সংবাদমাধ্যমের নাম, তারিখ ও মূল সংবাদের লিংক রাখা হবে। পুরো সংবাদ এখানে
                কপি করা হবে না, পাঠককে মূল সূত্রে পাঠানো হবে।
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </Page>
  );
}
