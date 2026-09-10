import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { seats, getMemberById, districtOf, bn, meta, dateBn } from '@/lib/data';
import { Page, PageHead, Card, Breadcrumb, MemberRow, PartyDot, Stat } from '@/components/ui';
import Link from 'next/link';

/** Every district that has at least one territorial seat. */
function districts() {
  const map = new Map<string, { en: string; bn: string; slug: string; seats: typeof seats }>();
  for (const s of seats) {
    const d = districtOf(s);
    if (!d) continue;
    const e = map.get(d.slug) ?? { ...d, seats: [] as typeof seats };
    e.seats.push(s);
    map.set(d.slug, e);
  }
  return map;
}

export function generateStaticParams() {
  return [...districts().keys()].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/jela/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const d = districts().get(slug);
  if (!d) return { title: 'জেলা পাওয়া যায়নি' };
  return {
    title: `${d.bn} জেলার সংসদ সদস্য`,
    alternates: { canonical: `/jela/${d.slug}` },
    description: `${d.bn} জেলার ${bn(d.seats.length)}টি সংসদীয় আসন ও তাদের বর্তমান সদস্য। তথ্যসূত্র বাংলাদেশ জাতীয় সংসদ।`,
  };
}

export default async function DistrictPage({ params }: PageProps<'/jela/[slug]'>) {
  const { slug } = await params;
  const d = districts().get(slug);
  if (!d) notFound();

  const rows = d.seats.map((s) => ({ seat: s, m: s.memberId ? getMemberById(s.memberId) : undefined }));
  const parties = new Map<string, number>();
  for (const r of rows) if (r.m?.party) parties.set(r.m.party.abbr, (parties.get(r.m.party.abbr) ?? 0) + 1);

  return (
    <Page>
      <Breadcrumb items={[{ href: '/', label: 'হোম' }, { href: '/mp', label: 'সংসদ সদস্য' }, { label: `${d.bn} জেলা` }]} />
      <PageHead
        eyebrow="জেলা"
        title={`${d.bn} জেলা`}
        lede={`${d.en} · ${bn(d.seats.length)}টি সংসদীয় আসন। প্রতিটি আসনের বর্তমান সদস্য, সংসদের তথ্যভান্ডার অনুযায়ী।`}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <Stat label="আসন" value={bn(d.seats.length)} />
            <Stat label="দল" value={bn(parties.size)} />
          </div>
        }
      />

      <div className="mt-8 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <ul className="flex flex-col gap-3">
          {rows.map(({ seat, m }) => (
            <li key={seat.no} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <Link href={`/ason/${seat.slug}`} className="text-[14px] font-bold text-brand hover:underline">
                  {seat.nameBn} <span className="text-muted font-medium">· আসন {bn(seat.no)}</span>
                </Link>
              </div>
              {m ? (
                <MemberRow m={m} />
              ) : (
                <Card className="px-4 py-3 text-[14px] text-muted">এই আসনের সদস্যের তথ্য সংসদের তথ্যভান্ডারে নেই।</Card>
              )}
            </li>
          ))}
        </ul>

        <aside className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-3">
            <h2 className="display text-[18px]">দলভিত্তিক আসন</h2>
            <ul className="flex flex-col gap-2 text-[14.5px]">
              {[...parties.entries()].sort((a, b) => b[1] - a[1]).map(([abbr, n]) => (
                <li key={abbr} className="flex items-center gap-2.5">
                  <PartyDot abbr={abbr} />
                  <span className="grow">{rows.find((r) => r.m?.party?.abbr === abbr)?.m?.party?.nameBn ?? abbr}</span>
                  <span className="tnum font-bold">{bn(n)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="px-1 text-[12.5px] text-muted leading-relaxed">
            তথ্যসূত্র: বাংলাদেশ জাতীয় সংসদ · হালনাগাদ {dateBn(meta.syncedAt)}
          </p>
        </aside>
      </div>
    </Page>
  );
}

export const dynamicParams = false;
