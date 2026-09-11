import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import Link from 'next/link';
import { Page, PageHead, Card } from '@/components/ui';
import Icon from '@/components/Icon';
import BrandIcon from '@/components/BrandIcon';
import { SITE_EMAIL, SITE_FACEBOOK } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/jogajog' },
  openGraph: shareGraph('/jogajog'),
  title: 'যোগাযোগ',
  description: `আমার এমপির সঙ্গে যোগাযোগ করুন ইমেইলে (${SITE_EMAIL}) বা ফেসবুক পেজে। কোনো সংসদ সদস্যের দাপ্তরিক ঠিকানা কোথায় পাবেন আর সাইটে ভুল তথ্য পেলে কীভাবে জানাবেন, এই পাতায়।`,
};

const REPO_ISSUES = 'https://github.com/sumongetup/mymp/issues';

export default function ContactPage() {
  return (
    <Page>
      <PageHead
        eyebrow="আমার এমপি"
        title="যোগাযোগ"
        lede="ভুল তথ্য জানাতে, পরামর্শ দিতে বা সাইট নিয়ে কিছু বলতে।"
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="display text-[21px] font-bold">আমার এমপির সঙ্গে যোগাযোগ</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            ইমেইলে লিখুন, অথবা ফেসবুক পেজে বার্তা পাঠান। সাইটে ভুল তথ্য পেলে কোন পাতা এবং কী ভুল, তা লিখে
            দিলে সূত্র মিলিয়ে ঠিক করা হয়।
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:${SITE_EMAIL}`}
              className="h-12 px-5 inline-flex items-center gap-2.5 rounded-xl bg-brand text-white text-[15px] font-semibold hover:bg-branddark transition-colors"
            >
              <Icon name="mail" size={18} />
              {SITE_EMAIL}
            </a>
            <a
              href={SITE_FACEBOOK}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-5 inline-flex items-center gap-2.5 rounded-xl border border-rule bg-surface text-[15px] font-semibold hover:border-brand hover:text-brand transition-colors"
            >
              <BrandIcon name="facebook" size={18} />
              ফেসবুক পেজ
              <Icon name="external" size={14} className="text-muted" />
            </a>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">কোনো সংসদ সদস্যের সঙ্গে যোগাযোগ</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            এই সাইট কোনো সদস্যের পক্ষে বার্তা নেয় না। প্রত্যেক সদস্যের পাতায় সংসদ কর্তৃক প্রকাশিত
            দাপ্তরিক ইমেইল ও ঠিকানা দেওয়া আছে, সরাসরি সেখানে লিখুন।{' '}
            <Link href="/mp" className="text-brand font-semibold hover:underline">সদস্যদের তালিকা →</Link>
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="display text-[21px] font-bold">GitHub-এ জানাতে চাইলে</h2>
          <p className="text-[15.5px] leading-relaxed text-inksoft">
            সাইটের কোড ও তথ্য উন্মুক্ত। GitHub ব্যবহার করলে সেখানেও একটি ইস্যু খুলে ভুল বা অসংগতি জানাতে
            পারেন; প্রতিটি রিপোর্ট সূত্র মিলিয়ে যাচাই করা হয়।
          </p>
          <a
            href={REPO_ISSUES}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start px-5 h-11 inline-flex items-center rounded-full border border-rule text-[14.5px] font-semibold hover:border-brand hover:text-brand"
          >
            GitHub-এ জানান ↗
          </a>
        </Card>
      </div>
    </Page>
  );
}
