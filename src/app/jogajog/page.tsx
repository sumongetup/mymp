import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHead, Card, Empty } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/jogajog' },
  title: 'যোগাযোগ',
  description: 'আমার এমপি সাইটে ভুল তথ্য জানানো বা যোগাযোগের উপায়।',
};

const REPO_ISSUES = 'https://github.com/sumongetup/mymp/issues';

export default function ContactPage() {
  return (
    <Page>
      <PageHead
        eyebrow="আমার এমপি"
        title="যোগাযোগ"
        lede="ভুল তথ্য জানাতে, বা সাইট নিয়ে কিছু বলতে।"
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        <Card className="p-6 flex flex-col gap-3">
          <h2 className="serif text-[21px] font-bold">কোনো সংসদ সদস্যের সঙ্গে যোগাযোগ</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            এই সাইট কোনো সদস্যের পক্ষে বার্তা নেয় না। প্রত্যেক সদস্যের পাতায় সংসদ কর্তৃক প্রকাশিত
            দাপ্তরিক ইমেইল ও ঠিকানা দেওয়া আছে, সরাসরি সেখানে লিখুন।{' '}
            <Link href="/mp" className="text-brand font-semibold hover:underline">সদস্যদের তালিকা →</Link>
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="serif text-[21px] font-bold">ভুল তথ্য জানাতে</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            সাইটের কোড ও তথ্য উন্মুক্ত। ভুল বা অসংগতি পেলে GitHub-এ একটি ইস্যু খুলুন, তাতে কোন পাতা এবং
            কী ভুল তা লিখুন। প্রতিটি রিপোর্ট সূত্র মিলিয়ে যাচাই করা হয়।
          </p>
          <a
            href={REPO_ISSUES}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start px-5 h-11 inline-flex items-center rounded-full bg-brand text-white text-[14.5px] font-semibold hover:bg-branddark"
          >
            GitHub-এ জানান ↗
          </a>
        </Card>

        <Empty
          title="সাইটের ভেতরের যোগাযোগ ফরম এখনো চালু হয়নি"
          body="যাঁরা GitHub ব্যবহার করেন না, তাঁদের জন্য একটি ফরম তৈরি হচ্ছে। চালু হলে এই পাতায় পাওয়া যাবে।"
        />
      </div>
    </Page>
  );
}
