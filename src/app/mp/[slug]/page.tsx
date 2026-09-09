import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  members, getMember, committeesOfMember, membersOfParty, districtOf,
  bn, ageFrom, dateBn, initial, meta, OFFICE_LABELS, committeeCounts,
} from '@/lib/data';
import { Page, Card, Breadcrumb, Empty, PartyDot } from '@/components/ui';
import MemberPhoto from '@/components/MemberPhoto';

export function generateStaticParams() {
  return members.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<'/mp/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) return { title: 'সদস্য পাওয়া যায়নি' };
  const where = m.seat?.nameBn ? `, ${m.seat.nameBn}` : '';
  return {
    title: `${m.nameBn ?? m.nameEn}`,
    alternates: { canonical: `/mp/${m.slug}` },
    description: `${m.nameBn ?? m.nameEn}${where}। ত্রয়োদশ জাতীয় সংসদের সদস্য${m.party?.nameBn ? `, ${m.party.nameBn}` : ''}। তথ্যসূত্র বাংলাদেশ জাতীয় সংসদ।`,
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-rulesoft last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-end font-medium">{children}</span>
    </div>
  );
}

export default async function MemberPage({ params }: PageProps<'/mp/[slug]'>) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) notFound();

  const age = ageFrom(m.dateOfBirth);
  const district = districtOf(m.seat);
  const onCommittees = committeesOfMember(m.id);
  const cc = committeeCounts();
  const partyMates = m.party ? membersOfParty(m.party.abbr).filter((x) => x.id !== m.id) : [];
  const sameDistrict = district
    ? members.filter((x) => x.id !== m.id && districtOf(x.seat)?.en === district.en)
    : [];

  const bio = [
    m.dateOfBirth && { label: 'জন্ম', value: `${dateBn(m.dateOfBirth)}${age !== null ? ` · ${bn(age)} বছর` : ''}` },
    m.gender && { label: 'লিঙ্গ', value: m.gender === 'Female' ? 'নারী' : 'পুরুষ' },
    m.professionBn && { label: 'পেশা', value: m.professionBn },
    m.fatherBn && { label: 'পিতা', value: m.fatherBn },
    m.motherBn && { label: 'মাতা', value: m.motherBn },
    m.isFreedomFighter && { label: 'মুক্তিযোদ্ধা', value: 'হ্যাঁ' },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Page>
      <Breadcrumb
        items={[
          { href: '/', label: 'হোম' },
          { href: '/mp', label: 'সংসদ সদস্য' },
          ...(district ? [{ label: district.bn }] : []),
          { label: m.seat?.nameBn ?? (m.nameBn ?? '') },
        ]}
      />

      <header className="pt-7 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <MemberPhoto src={m.photoUrl} alt={m.nameBn ?? m.nameEn ?? ''} initial={initial(m)} size={128} />
        <div className="grow flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-brandsoft text-brand text-[13px] font-bold">
              বর্তমান সদস্য · ত্রয়োদশ সংসদ
            </span>
            {m.offices.map((o) => (
              <span key={o} className="px-3 py-1 rounded-full bg-ink text-white text-[13px] font-bold">
                {OFFICE_LABELS[o] ?? o}
              </span>
            ))}
            {m.seat?.reserved && (
              <span className="px-3 py-1 rounded-full border border-rule text-[13px] font-semibold text-inksoft">
                সংরক্ষিত নারী আসন
              </span>
            )}
          </div>
          <h1 className="serif text-[32px] sm:text-[44px] leading-[1.15] font-extrabold text-balance">
            {m.nameBn ?? m.nameEn}
          </h1>
          {m.nameEn && m.nameBn && <p className="text-[17px] text-muted">{m.nameEn}</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] sm:text-[16px]">
            {m.party && (
              <Link href={`/dol/${m.party.abbr.toLowerCase()}`} className="flex items-center gap-2 font-semibold hover:underline">
                <PartyDot abbr={m.party.abbr} />
                {m.party.nameBn ?? m.party.abbr}
              </Link>
            )}
            {m.seat && (
              <Link href={`/ason/${m.seat.slug}`} className="font-semibold text-brand hover:underline">
                {m.seat.nameBn}
              </Link>
            )}
            {district && <span className="text-inksoft">{district.bn} জেলা</span>}
          </div>
        </div>
      </header>

      <div className="pt-9 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10 items-start">
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">পরিচিতি</h2>
            {bio.length ? (
              <Card className="px-5 py-3 text-[15px]">
                {bio.map((b) => <Row key={b.label} label={b.label}>{b.value}</Row>)}
              </Card>
            ) : (
              <Empty title="পরিচিতির তথ্য সংসদের তথ্যভান্ডারে নেই।" />
            )}
          </section>

          {m.seat && !m.seat.reserved && (
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-baseline gap-4">
                <h2 className="serif text-[24px] font-bold">আসন · {m.seat.nameBn}</h2>
                <Link href={`/ason/${m.seat.slug}`} className="text-[14px] font-semibold text-brand hover:underline">
                  আসনের পাতা →
                </Link>
              </div>
              {m.seat.boundaryBn ? (
                <Card className="p-5 flex flex-col gap-2">
                  <span className="text-[13px] font-bold tracking-[1px] text-muted">এলাকা</span>
                  <p className="text-[15px] leading-relaxed">{m.seat.boundaryBn}</p>
                </Card>
              ) : (
                <Empty title="এই আসনের এলাকার বিবরণ পাওয়া যায়নি।" />
              )}
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">সংসদীয় কমিটি</h2>
            {onCommittees.length ? (
              <ul className="flex flex-col gap-2.5">
                {onCommittees.map((c) => {
                  const role = c.members.find((x) => x.memberId === m.id)?.role;
                  return (
                    <li key={c.id}>
                      <Link href={`/committee/${c.slug}`} className="bg-surface border border-rule rounded-xl px-5 py-4 flex items-center gap-4 hover:border-brand transition-colors">
                        <span className="grow serif text-[16px] font-bold">{c.nameBn ?? c.nameEn}</span>
                        {role && role !== 'Member' && (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-brandsoft text-brand text-[12px] font-bold">
                            {role === 'Chairman' ? 'সভাপতি' : role}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty
                title="হালনাগাদ কোনো কমিটিতে এই সদস্যের নাম নেই।"
                body={`সংসদের ${bn(cc.total)}টি কমিটির মধ্যে ${bn(cc.current)}টির সদস্য তালিকা ত্রয়োদশ সংসদের জন্য হালনাগাদ হয়েছে। বাকিগুলো হালনাগাদ হলে এখানে যুক্ত হবে।`}
              />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">সংবাদ</h2>
            <Empty
              title="সংবাদ সংযোজন এখনো চালু হয়নি।"
              body="অনুমোদিত সংবাদমাধ্যম থেকে আসা শিরোনাম যাচাইয়ের পর এখানে দেখানো হবে।"
            />
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-3">
            <h2 className="serif text-[19px] font-bold">যোগাযোগ</h2>
            {m.email ? (
              <>
                <p className="text-[14px] text-inksoft leading-relaxed">
                  এটি সংসদ কর্তৃক প্রকাশিত দাপ্তরিক ঠিকানা। বার্তা সরাসরি সদস্যের কাছে যাবে, আমার এমপি
                  তাঁর পক্ষে উত্তর দেয় না।
                </p>
                <a
                  href={`mailto:${m.email}`}
                  className="break-all text-[14px] font-semibold text-brand hover:underline"
                >
                  {m.email}
                </a>
              </>
            ) : (
              <p className="text-[14px] text-inksoft leading-relaxed">
                সংসদের তথ্যভান্ডারে এই সদস্যের কোনো দাপ্তরিক ইমেইল প্রকাশ করা নেই।
                {m.seat?.reserved && ' সংরক্ষিত আসনের সদস্যদের ক্ষেত্রে এটি সাধারণ।'}
              </p>
            )}
            {m.presentAddressBn && (
              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[13px] font-bold text-muted">ঠিকানা</span>
                <span className="text-[14px] leading-relaxed">{m.presentAddressBn}</span>
              </div>
            )}
          </Card>

          {partyMates.length > 0 && m.party && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <h2 className="serif text-[19px] font-bold">একই দলের</h2>
                <Link href={`/dol/${m.party.abbr.toLowerCase()}`} className="text-[13px] font-semibold text-brand hover:underline">
                  সব {bn(partyMates.length + 1)} →
                </Link>
              </div>
              <ul className="flex flex-col gap-2 text-[14.5px]">
                {partyMates.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <Link href={`/mp/${x.slug}`} className="flex justify-between gap-3 hover:text-brand">
                      <span className="truncate">{x.nameBn ?? x.nameEn}</span>
                      <span className="text-muted shrink-0">{x.seat?.nameBn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sameDistrict.length > 0 && (
            <Card className="p-5 flex flex-col gap-3">
              <h2 className="serif text-[19px] font-bold">{district?.bn} জেলার অন্য আসন</h2>
              <ul className="flex flex-col gap-2 text-[14.5px]">
                {sameDistrict.slice(0, 6).map((x) => (
                  <li key={x.id}>
                    <Link href={`/ason/${x.seat?.slug}`} className="flex justify-between gap-3 hover:text-brand">
                      <span>{x.seat?.nameBn}</span>
                      <span className="text-muted truncate max-w-[55%]">{x.nameBn ?? x.nameEn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="p-4 rounded-xl bg-brandsoft flex flex-col gap-2">
            <span className="text-[14.5px] font-bold text-branddark">তথ্যসূত্র</span>
            <span className="text-[13px] leading-relaxed text-brand">
              বাংলাদেশ জাতীয় সংসদ। সর্বশেষ হালনাগাদ {dateBn(meta.syncedAt)}। ভুল দেখলে আমাদের জানান।
            </span>
          </div>
        </aside>
      </div>
    </Page>
  );
}
