import type { Metadata } from 'next';
import { shareGraph } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { parties, getParty, membersOfParty, bn, partyColor } from '@/lib/data';
import { Page, PageHead, Stat, MemberRow, Breadcrumb, PartyMark, LogoCredit } from '@/components/ui';
import { partyLogo } from '@/lib/partyLogos';
import { partyBn } from '@/lib/seo/mpDescription';
import { siteUrl } from '@/lib/site';

export function generateStaticParams() {
  return parties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/dol/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = getParty(slug);
  if (!p) return { title: 'দল পাওয়া যায়নি' };
  return {
    title: p.nameBn ?? p.abbr,
    alternates: { canonical: `/dol/${p.slug}` },
    openGraph: shareGraph(`/dol/${p.slug}`),
    description:
      p.abbr === 'Ind'
        ? `ত্রয়োদশ জাতীয় সংসদে ${bn(p.seats)} জন স্বতন্ত্র সংসদ সদস্য আছেন। তাঁদের নাম, আসন, জেলা ও ছবিসহ তালিকা এই পাতায়।`
        : `${partyBn(p)?.name ?? p.nameBn ?? p.abbr} ত্রয়োদশ জাতীয় সংসদে ${bn(p.seats)}টি আসনে প্রতিনিধিত্ব করছে। দলের সব সংসদ সদস্যের নাম, আসন, জেলা ও ছবিসহ তালিকা এই পাতায়।`,
  };
}

export default async function PartyPage({ params }: PageProps<'/dol/[slug]'>) {
  const { slug } = await params;
  const party = getParty(slug);
  if (!party) notFound();

  const list = membersOfParty(party.abbr);
  const territorial = list.filter((m) => m.seat && !m.seat.reserved);
  const reserved = list.filter((m) => m.seat?.reserved);
  const logo = partyLogo(party.abbr);

  // A party is a PoliticalParty to search engines; independents are not a party, so they get none.
  const partyLd =
    party.abbr === 'Ind'
      ? null
      : {
          '@context': 'https://schema.org',
          '@type': 'PoliticalParty',
          name: partyBn(party)?.name ?? party.nameBn ?? party.abbr,
          alternateName: [party.nameBn, party.nameEn, party.abbr].filter(Boolean),
          url: `${siteUrl}/dol/${party.slug}`,
          ...(logo?.kind === 'logo' ? { logo: `${siteUrl}${logo.src}` } : {}),
        };

  return (
    <Page>
      {partyLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(partyLd) }} />}
      <Breadcrumb items={[{ href: '/', label: 'হোম' }, { href: '/dol', label: 'দল' }, { label: party.nameBn ?? party.abbr }]} />

      <PageHead
        eyebrow="ত্রয়োদশ জাতীয় সংসদ"
        title={party.nameBn ?? party.abbr}
        lede={party.nameEn ?? undefined}
        mark={<PartyMark abbr={party.abbr} size={76} />}
        aside={
          <div className="grid grid-cols-3 gap-3">
            <Stat label="মোট আসন" value={bn(party.seats)} />
            <Stat label="নির্বাচিত" value={bn(party.seatsTerritorial)} />
            <Stat label="সংরক্ষিত" value={bn(party.seatsReserved)} />
          </div>
        }
      />

      <div
        className="mt-7 h-1.5 rounded-full"
        style={{ background: partyColor(party.abbr) }}
        aria-hidden="true"
      />

      <div className="pt-8 pb-14 flex flex-col gap-9">
        {territorial.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="display text-[24px] font-bold">
              আসন থেকে নির্বাচিত <span className="text-muted font-semibold text-[19px]">({bn(territorial.length)})</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {territorial.map((m) => <li key={m.id}><MemberRow m={m} /></li>)}
            </ul>
          </section>
        )}

        {reserved.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="display text-[24px] font-bold">
              সংরক্ষিত নারী আসন <span className="text-muted font-semibold text-[19px]">({bn(reserved.length)})</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {reserved.map((m) => <li key={m.id}><MemberRow m={m} /></li>)}
            </ul>
          </section>
        )}

        {logo && (
          <p className="text-[13px] text-muted">
            {logo.kind === 'flag' ? 'দলের পতাকা' : 'দলের লোগো'}: <LogoCredit abbr={party.abbr} />
          </p>
        )}
      </div>
    </Page>
  );
}

export const dynamicParams = false;
