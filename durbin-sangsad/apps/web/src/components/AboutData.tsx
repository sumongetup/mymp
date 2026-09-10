import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/site';

/**
 * The methodology page. Phase 1 states the rules the product is built on;
 * later phases add a row per source and the matcher's thresholds.
 */
export default function AboutData({ locale }: { locale: Locale }) {
  const s = t(locale);
  const bn = locale === 'bn';
  const rows = bn
    ? [
        ['সদস্য, আসন, দল, কমিটি', 'বাংলাদেশ জাতীয় সংসদের তথ্যভান্ডার (parliament.gov.bd), প্রতিদিন হালনাগাদ।'],
        ['নির্বাচনের ফল ও হলফনামা', 'নির্বাচন কমিশনের গেজেট ও হলফনামার মূল PDF; একজন সম্পাদক মূল নথির সঙ্গে মিলিয়ে যাচাই করার পরই প্রকাশিত হয়।'],
        ['জীবনী', 'প্রতিটি তথ্যের জন্য অন্তত দুটি বিশ্বস্ত উৎস, অথবা একটি বিশ্বস্ত ও একটি সরকারি উৎস; নিজের ভাষায় লেখা, উৎসের লিংকসহ।'],
        ['সংবাদ', 'শুধু শিরোনাম, উৎসের নাম, সময় ও মূল সংবাদের লিংক। কোনো সংবাদের পুরো লেখা বা ছবি এখানে রাখা হয় না। সময় অনুযায়ী সাজানো, কোনো সম্পাদকীয় ক্রম নেই।'],
        ['যা নেই', 'যে তথ্য উৎসে নেই তা খালি থাকে এবং “তথ্য পাওয়া যায়নি” দেখানো হয়। কোনো তথ্য অনুমান করে বসানো হয় না।'],
      ]
    : [
        ['Members, seats, parties, committees', 'The Bangladesh Parliament’s database (parliament.gov.bd), refreshed daily.'],
        ['Election results and affidavits', 'The Election Commission’s gazettes and the original affidavit PDFs; published only after an editor has checked each field against the original document.'],
        ['Biography', 'At least two trusted sources per fact, or one trusted and one official source; written in our own words with source links.'],
        ['News', 'Only the headline, the source’s name, the time and a link to the original. No article bodies or images are kept here. Sorted by time, with no editorial ranking.'],
        ['What is absent', 'A field the source does not have stays empty and reads “No data available”. Nothing is guessed.'],
      ];

  return (
    <div className="mx-auto max-w-[860px] px-4 sm:px-5 pt-9 sm:pt-12 pb-14 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="display text-[30px] sm:text-[40px] leading-[1.15]">{s.aboutData}</h1>
        <p className="text-[16px] text-inksoft leading-relaxed">{s.aboutDataLede}</p>
      </div>
      <dl className="bg-surface border border-rule rounded-card shadow-card divide-y divide-rulesoft">
        {rows.map(([k, v]) => (
          <div key={k} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4">
            <dt className="font-semibold">{k}</dt>
            <dd className="text-[14.5px] text-inksoft leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[14px] text-muted leading-relaxed">
        {bn ? 'ভুল পেলে লিখুন: ' : 'Found an error? Write to '}
        <a href="mailto:info@durbinnews.com" className="text-accent font-semibold hover:underline">info@durbinnews.com</a>
      </p>
    </div>
  );
}
