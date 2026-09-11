import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import { Page, PageHead, Card } from '@/components/ui';
import { dateBn, meta } from '@/lib/data';
import { SITE_EMAIL, SITE_FACEBOOK } from '@/lib/site';

/*
 * "তথ্যসূত্র ও পদ্ধতি" (owner's footer spec, 2026-09-12), on the same template as
 * the privacy page. It says what the site actually does: results come from
 * The Business Standard and Wikipedia and are not yet checked against the
 * Election Commission's gazette, so the gazette is not named as a source.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/sutro' },
  openGraph: shareGraph('/sutro'),
  title: 'তথ্যসূত্র ও পদ্ধতি',
  description: 'আমার এমপির তথ্য কোথা থেকে আসে, কত দিন পরপর হালনাগাদ হয় এবং কীভাবে যাচাই হয়: জাতীয় সংসদ, নির্বাচন কমিশন আর প্রতিটি পাতায় লেখা বাকি সূত্র।',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 flex flex-col gap-3">
      <h2 className="display text-[21px] font-bold">{title}</h2>
      <div className="flex flex-col gap-2.5 text-[15.5px] leading-relaxed text-inksoft">{children}</div>
    </Card>
  );
}

const link = 'text-brand font-semibold hover:underline';
const ext = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={link}>{label} ↗</a>
);

export default function SourcesPage() {
  return (
    <Page>
      <PageHead
        eyebrow="আমার এমপি"
        title="তথ্যসূত্র ও পদ্ধতি"
        lede={`এই সাইটের তথ্য কোথা থেকে আসে, কবে হালনাগাদ হয় আর কীভাবে যাচাই হয়। সর্বশেষ হালনাগাদ: ${dateBn(meta.syncedAt)}।`}
      />

      <div className="pt-8 pb-14 flex flex-col gap-6 max-w-[760px]">
        <Section title="কোথা থেকে তথ্য আসে">
          <p>
            সংসদ সদস্য, আসন, দল, সংসদীয় কমিটি, অধিবেশন, বৈঠক ও সংসদ সচিবালয়ের প্রজ্ঞাপন আসে বাংলাদেশ জাতীয় সংসদের ওয়েবসাইট
            ({ext('https://www.parliament.gov.bd', 'parliament.gov.bd')}) থেকে। কমিটির কাজের বিবরণ সংসদের কার্যপ্রণালী বিধি থেকে।
          </p>
          <p>
            নিবন্ধিত ভোটার ও ভোটকেন্দ্রের সংখ্যা আসে নির্বাচন কমিশনের ওয়েবসাইট ({ext('https://www.ecs.gov.bd', 'ecs.gov.bd')}) থেকে।
          </p>
          <p>
            ২০২৬ সালের আসনভিত্তিক ভোটের ফল নেওয়া হয়েছে দ্য বিজনেস স্ট্যান্ডার্ড ও উইকিপিডিয়া থেকে; নির্বাচন কমিশনের গেজেটের সঙ্গে
            এখনো মেলানো হয়নি, প্রতিটি ফলের নিচে তা লেখা থাকে। দলের ইতিহাস এবং কিছু সদস্যের শিক্ষা ও জন্মস্থান বাংলা ও ইংরেজি
            উইকিপিডিয়া থেকে, আলাদা করে চিহ্নিত। সংবাদ অংশে শুধু অনুমোদিত সংবাদমাধ্যমের শিরোনাম ও মূল সংবাদের লিংক থাকে।
          </p>
        </Section>

        <Section title="কত দিন পরপর হালনাগাদ">
          <p>
            প্রতিদিন। সংসদের ওয়েবসাইটে নতুন সদস্য তথ্য, প্রজ্ঞাপন, বৈঠকের কার্যসূচি বা কমিটির পরিবর্তন প্রকাশ হলে এক দিনের মধ্যে
            এখানে যুক্ত হয়। সংবাদ শিরোনাম দিনে কয়েকবার হালনাগাদ হয়।
          </p>
        </Section>

        <Section title="কীভাবে যাচাই হয়">
          <p>
            প্রতিটি পাতায় তথ্যের সূত্র লেখা থাকে, যেখানে সম্ভব মূল নথি বা পাতার লিংকসহ। দুটি সূত্রে তথ্য না মিললে বা কোনো সূত্রে
            না থাকলে তথ্যটি বাদ রাখা হয়; কোনো তথ্য অনুমান করে বসানো হয় না।
          </p>
          <p>
            ভুল পেলে সদস্যের পাতার “সংশোধন জানান” বোতাম দিয়ে, আমাদের{' '}
            <a href={SITE_FACEBOOK} target="_blank" rel="noopener noreferrer" className={link}>ফেসবুক পেজে</a> মেসেজ করে বা{' '}
            <a href={`mailto:${SITE_EMAIL}`} className={link}>{SITE_EMAIL}</a> ঠিকানায় ইমেইল করে সূত্রসহ জানালে ২৪ ঘণ্টার মধ্যে
            যাচাই করে ঠিক করা হয়।
          </p>
        </Section>
      </div>
    </Page>
  );
}
