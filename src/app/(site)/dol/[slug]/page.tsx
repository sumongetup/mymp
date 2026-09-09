import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parties, getParty, membersOfParty, bn, partyColor } from '@/lib/data';
import { Page, PageHead, Stat, MemberRow, Breadcrumb } from '@/components/ui';

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
    description: `${p.nameBn ?? p.abbr} ত্রয়োদশ জাতীয় সংসদে ${p.seats}টি আসন পেয়েছে। সদস্যদের তালিকা।`,
  };
}

export default async function PartyPage({ params }: PageProps<'/dol/[slug]'>) {
  const { slug } = await params;
  const party = getParty(slug);
  if (!party) notFound();

  const list = membersOfParty(party.abbr);
  const territorial = list.filter((m) => m.seat && !m.seat.reserved);
  const reserved = list.filter((m) => m.seat?.reserved);

  return (
    <Page>
      <Breadcrumb items={[{ href: '/', label: 'হোম' }, { href: '/dol', label: 'দল' }, { label: party.nameBn ?? party.abbr }]} />

      <PageHead
        eyebrow="ত্রয়োদশ জাতীয় সংসদ"
        title={party.nameBn ?? party.abbr}
        lede={party.nameEn ?? undefined}
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
            <h2 className="serif text-[24px] font-bold">
              আসন থেকে নির্বাচিত <span className="text-muted font-semibold text-[19px]">({bn(territorial.length)})</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {territorial.map((m) => <li key={m.id}><MemberRow m={m} /></li>)}
            </ul>
          </section>
        )}

        {reserved.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">
              সংরক্ষিত নারী আসন <span className="text-muted font-semibold text-[19px]">({bn(reserved.length)})</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {reserved.map((m) => <li key={m.id}><MemberRow m={m} /></li>)}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}

export const dynamicParams = false;
