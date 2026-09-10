import type { Metadata } from 'next';
import Link from 'next/link';
import { parties, statistics, bn, partyColor } from '@/lib/data';
import { Page, PageHead, Card, CompositionBar } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/dol' },
  title: 'রাজনৈতিক দল',
  description: 'ত্রয়োদশ জাতীয় সংসদে আসনপ্রাপ্ত দলগুলোর তালিকা ও আসনসংখ্যা।',
};

export default function PartiesPage() {
  const stats = statistics();

  return (
    <Page>
      <PageHead
        eyebrow="ত্রয়োদশ জাতীয় সংসদ"
        title="রাজনৈতিক দল"
        lede={`সংসদে আসন আছে এমন ${bn(parties.length)}টি দল। মোট ${bn(stats.total)}টি আসনের মধ্যে ${bn(stats.territorial)}টি নির্বাচনে জেতা, ${bn(stats.reserved)}টি সংরক্ষিত নারী আসন।`}
      />

      <Card className="mt-8 p-6">
        <CompositionBar parties={parties} total={stats.total} majority={stats.majority} />
      </Card>

      <ul className="mt-6 pb-14 flex flex-col gap-3">
        {parties.map((p) => (
          <li key={p.abbr}>
            <Link
              href={`/dol/${p.slug}`}
              className="bg-surface border border-rule rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-brand transition-colors"
            >
              <span
                aria-hidden="true"
                className="w-3.5 h-3.5 rounded-[4px] shrink-0"
                style={{ background: partyColor(p.abbr) }}
              />
              <span className="grow min-w-0 flex flex-col gap-1">
                <span className="display text-[19px] font-bold leading-snug">{p.nameBn ?? p.abbr}</span>
                <span className="text-[13.5px] text-muted">{p.nameEn}</span>
              </span>
              <span className="flex gap-6 sm:gap-8 shrink-0">
                <span className="flex flex-col">
                  <span className="display tnum text-[24px] font-extrabold leading-none">{bn(p.seats)}</span>
                  <span className="text-[12px] text-muted mt-1">মোট আসন</span>
                </span>
                <span className="flex flex-col">
                  <span className="tnum text-[16px] font-semibold leading-none pt-1.5">{bn(p.seatsTerritorial)}</span>
                  <span className="text-[12px] text-muted mt-1.5">নির্বাচিত</span>
                </span>
                <span className="flex flex-col">
                  <span className="tnum text-[16px] font-semibold leading-none pt-1.5">{bn(p.seatsReserved)}</span>
                  <span className="text-[12px] text-muted mt-1.5">সংরক্ষিত</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
