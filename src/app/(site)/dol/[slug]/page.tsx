import type { Metadata } from 'next';
import Link from 'next/link';
import { shareGraph } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { parties, getParty, membersOfParty, getMemberById, bn, dateBn, partyColor } from '@/lib/data';
import { Page, PageHead, Card, Stat, MemberRow, Breadcrumb, PartyMark, LogoCredit } from '@/components/ui';
import { partyLogo } from '@/lib/partyLogos';
import { partyProfile, foundedYear, type ResolvedProfile } from '@/lib/partyProfiles';
import { partyBn, charCount, DESCRIPTION_MAX } from '@/lib/seo/mpDescription';
import { siteUrl } from '@/lib/site';

export function generateStaticParams() {
  return parties.map((p) => ({ slug: p.slug }));
}

/** "১ সেপ্টেম্বর ১৯৭৮", or "১৯৭৮ সাল" when only the year is on record. */
const foundedBn = (on: string) => (/^\d{4}$/.test(on) ? `${bn(on)} সাল` : dateBn(on) ?? on);

export async function generateMetadata({ params }: PageProps<'/dol/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = getParty(slug);
  if (!p) return { title: 'দল পাওয়া যায়নি' };
  const name = partyBn(p)?.name ?? p.nameBn ?? p.abbr;
  const profile = partyProfile(p);
  const year = foundedYear(profile);
  const tail = `ত্রয়োদশ জাতীয় সংসদে দলটির ${bn(p.seats)}টি আসন; সব সংসদ সদস্যের নাম, আসন ও ছবি এই পাতায়।`;
  // Founding and the current head first, when the whole sentence still fits the length search engines show.
  const full = year
    ? `${name} ${bn(year)} সালে প্রতিষ্ঠিত${profile?.leaderNameBn ? `; ${profile.leaderTitleBn ?? 'প্রধান'} ${profile.leaderNameBn}` : ''}। ${tail}`
    : null;
  const short = year ? `${name} ${bn(year)} সালে প্রতিষ্ঠিত। ${tail}` : null;
  const description =
    p.abbr === 'Ind'
      ? `ত্রয়োদশ জাতীয় সংসদে ${bn(p.seats)} জন স্বতন্ত্র সংসদ সদস্য আছেন। তাঁদের নাম, আসন, জেলা ও ছবিসহ তালিকা এই পাতায়।`
      : [full, short].find((d) => d && charCount(d) <= DESCRIPTION_MAX) ??
        `${name} ত্রয়োদশ জাতীয় সংসদে ${bn(p.seats)}টি আসনে প্রতিনিধিত্ব করছে। দলের সব সংসদ সদস্যের নাম, আসন, জেলা ও ছবিসহ তালিকা এই পাতায়।`;
  return {
    title: p.nameBn ?? p.abbr,
    alternates: { canonical: `/dol/${p.slug}` },
    openGraph: shareGraph(`/dol/${p.slug}`),
    description,
  };
}

/** A name, linked to the member's page when that person sits in this parliament. */
function Person({ name, memberId }: { name: string; memberId?: string }) {
  const m = memberId ? getMemberById(memberId) : undefined;
  return m ? (
    <Link href={`/mp/${m.slug}`} className="font-semibold text-brand hover:underline">{name}</Link>
  ) : (
    <span className="font-semibold">{name}</span>
  );
}

const sourceLabel = (url: string) =>
  url.includes('bn.wikipedia.org') ? 'বাংলা উইকিপিডিয়া' : url.includes('en.wikipedia.org') ? 'ইংরেজি উইকিপিডিয়া' : new URL(url).hostname;

/** Who founded the party, when and how, and who leads it now. */
function ProfileSection({ profile }: { profile: ResolvedProfile }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    ...(profile.foundedOn ? [{ label: 'প্রতিষ্ঠা', value: foundedBn(profile.foundedOn) }] : []),
    ...(profile.founderBn ? [{ label: 'প্রতিষ্ঠাতা', value: profile.founderBn }] : []),
    ...(profile.leaderNameBn
      ? [{ label: profile.leaderTitleBn ?? 'দলপ্রধান', value: <Person name={profile.leaderNameBn} memberId={profile.leaderMemberId} /> }]
      : []),
    ...(profile.secretaryNameBn
      ? [{ label: profile.secretaryTitleBn ?? 'দ্বিতীয় পদ', value: <Person name={profile.secretaryNameBn} memberId={profile.secretaryMemberId} /> }]
      : []),
    ...(profile.headquartersBn ? [{ label: 'প্রধান কার্যালয়', value: profile.headquartersBn }] : []),
    ...(profile.website
      ? [{
          label: 'ওয়েবসাইট',
          value: (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">
              {profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          ),
        }]
      : []),
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4 items-start">
      <Card className="p-5 sm:p-6 flex flex-col gap-3">
        <h2 className="display text-[22px]">দলের পরিচিতি</h2>
        {profile.originBn && <p className="text-[15.5px] leading-relaxed text-inksoft text-pretty">{profile.originBn}</p>}
        {profile.sources.length > 0 && (
          <p className="text-[12.5px] text-muted leading-relaxed">
            সূত্র:{' '}
            {profile.sources.map((u, i) => (
              <span key={u}>
                {i > 0 && ', '}
                <a href={u} target="_blank" rel="noopener noreferrer" className="underline decoration-rule underline-offset-2 hover:text-brand">
                  {sourceLabel(u)}
                </a>
              </span>
            ))}
            {profile.checked && <>, যাচাই {dateBn(profile.checked)}</>}
            {profile.edited && <>। কিছু তথ্য আমার এমপির সম্পাদক হালনাগাদ করেছেন।</>}
          </p>
        )}
      </Card>
      {rows.length > 0 && (
        <Card className="p-5 sm:p-6">
          <dl className="flex flex-col divide-y divide-rulesoft text-[14.5px]">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-muted shrink-0">{r.label}</dt>
                <dd className="text-end min-w-0">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </section>
  );
}

export default async function PartyPage({ params }: PageProps<'/dol/[slug]'>) {
  const { slug } = await params;
  const party = getParty(slug);
  if (!party) notFound();

  const list = membersOfParty(party.abbr);
  const territorial = list.filter((m) => m.seat && !m.seat.reserved);
  const reserved = list.filter((m) => m.seat?.reserved);
  const logo = partyLogo(party.abbr);
  const profile = party.abbr === 'Ind' ? null : partyProfile(party);

  // A party is a PoliticalParty to search engines; independents are not a party, so they get none.
  const founders = profile?.founderBn
    ? profile.founderKind === 'org'
      ? profile.founderBn.split(' ও ').map((name) => ({ '@type': 'Organization', name }))
      : [{ '@type': 'Person', name: profile.founderBn.replace(/\s*\(.*\)$/, '') }]
    : null;
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
          ...(profile?.foundedOn ? { foundingDate: profile.foundedOn } : {}),
          ...(founders ? { founder: founders } : {}),
          ...(profile?.website ? { sameAs: [profile.website] } : {}),
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
        {profile && <ProfileSection profile={profile} />}
        {party.abbr === 'Ind' && (
          <p className="text-[15px] text-inksoft leading-relaxed max-w-[720px]">
            স্বতন্ত্র কোনো রাজনৈতিক দল নয়: এই সংসদ সদস্যরা কোনো দলের প্রার্থী হিসেবে নির্বাচিত হননি, তাই এখানে দলের পরিচিতি নেই।
          </p>
        )}

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
