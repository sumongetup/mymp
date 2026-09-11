import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import Link from 'next/link';
import { parties, statistics, bn } from '@/lib/data';
import { partyLogo } from '@/lib/partyLogos';
import { Page, PageHead, Card, CompositionBar, PartyMark, LogoCredit } from '@/components/ui';

const independents = parties.find((p) => p.abbr === 'Ind')?.seats ?? 0;
const partyCount = parties.filter((p) => p.abbr !== 'Ind' && p.seats > 0).length;
export const metadata: Metadata = {
  alternates: { canonical: '/dol' },
  openGraph: shareGraph('/dol'),
  title: 'রাজনৈতিক দল',
  description: `ত্রয়োদশ জাতীয় সংসদে প্রতিনিধিত্বকারী ${bn(partyCount)}টি রাজনৈতিক দল ও ${bn(independents)} জন স্বতন্ত্র সংসদ সদস্যের তালিকা, প্রতিটি দলের আসনসংখ্যা ও সংসদ সদস্যদের নামসহ।`,
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

      <ul className="mt-6 pb-10 flex flex-col gap-3">
        {parties.map((p) => (
          <li key={p.abbr}>
            <Link
              href={`/dol/${p.slug}`}
              className="bg-surface border border-rule rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-brand transition-colors"
            >
              <span className="flex items-center gap-4 grow min-w-0">
                <PartyMark abbr={p.abbr} size={52} />
                <span className="grow min-w-0 flex flex-col gap-1">
                  <span className="display text-[19px] font-bold leading-snug">{p.nameBn ?? p.abbr}</span>
                  <span className="text-[13.5px] text-muted">{p.nameEn}</span>
                </span>
              </span>
              <span className="flex gap-6 sm:gap-8 shrink-0 ps-[68px] sm:ps-0">
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

      <section className="pb-14 text-[13px] text-muted leading-relaxed">
        <h2 className="font-bold text-inksoft">দলের লোগোর উৎস</h2>
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {parties.filter((p) => partyLogo(p.abbr)).map((p) => (
            <li key={p.abbr}>{p.nameBn ?? p.abbr}{partyLogo(p.abbr)?.kind === 'flag' ? ' (পতাকা)' : ''}: <LogoCredit abbr={p.abbr} /></li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
