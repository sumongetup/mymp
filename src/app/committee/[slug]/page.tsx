import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { committees, getCommittee, getMemberById, bn, dateBn, meta } from '@/lib/data';
import { Page, PageHead, Card, Breadcrumb, Notice, MemberRow } from '@/components/ui';

export function generateStaticParams() {
  return committees.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/committee/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const c = getCommittee(slug);
  if (!c) return { title: 'কমিটি পাওয়া যায়নি' };
  return {
    title: c.nameBn ?? c.nameEn ?? 'কমিটি',
    alternates: { canonical: `/committee/${c.slug}` },
    description: `${c.nameBn ?? c.nameEn} — ত্রয়োদশ জাতীয় সংসদের কমিটি ও তার সদস্যবৃন্দ।`,
  };
}

const ROLE_BN: Record<string, string> = {
  Chairman: 'সভাপতি',
  Member: 'সদস্য',
};

export default async function CommitteePage({ params }: PageProps<'/committee/[slug]'>) {
  const { slug } = await params;
  const c = getCommittee(slug);
  if (!c) notFound();

  const chair = c.members.find((x) => x.role === 'Chairman');
  const chairMember = chair ? getMemberById(chair.memberId) : undefined;
  const rest = c.members
    .filter((x) => x.role !== 'Chairman')
    .map((x) => ({ role: x.role, m: getMemberById(x.memberId) }))
    .filter((x): x is { role: string; m: NonNullable<ReturnType<typeof getMemberById>> } => !!x.m);

  return (
    <Page>
      <Breadcrumb
        items={[
          { href: '/', label: 'হোম' },
          { href: '/committee', label: 'কমিটি' },
          { label: c.nameBn ?? c.nameEn ?? '' },
        ]}
      />

      <PageHead
        eyebrow={c.type ?? undefined}
        title={c.nameBn ?? c.nameEn ?? ''}
        lede={[c.nameEn, c.startDate ? `গঠিত ${dateBn(c.startDate)}` : null].filter(Boolean).join(' · ')}
      />

      <div className="pt-8 pb-14 flex flex-col gap-8">
        {!c.rosterCurrent ? (
          <Notice title="এই কমিটির সদস্য তালিকা ত্রয়োদশ সংসদের জন্য এখনো হালনাগাদ হয়নি">
            সংসদের তথ্যভান্ডারে এই কমিটির তালিকায় এখনো দ্বাদশ সংসদের সদস্যদের নাম রয়েছে। যাঁরা এখন আর
            সংসদ সদস্য নন, তাঁদের বর্তমান সদস্য হিসেবে দেখানো ভুল হবে, তাই তালিকা হালনাগাদ না হওয়া
            পর্যন্ত আমরা সদস্যদের নাম দেখাচ্ছি না।
          </Notice>
        ) : (
          <>
            {chairMember && (
              <section className="flex flex-col gap-4">
                <h2 className="serif text-[24px] font-bold">সভাপতি</h2>
                <MemberRow m={chairMember} />
              </section>
            )}

            {rest.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="serif text-[24px] font-bold">
                  সদস্য <span className="text-muted font-semibold text-[19px]">({bn(rest.length)})</span>
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rest.map(({ role, m }) => (
                    <li key={m.id} className="relative">
                      <MemberRow m={m} />
                      {role !== 'Member' && (
                        <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-brandsoft text-brand text-[11px] font-bold">
                          {ROLE_BN[role] ?? role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <Card className="p-5 flex flex-col gap-2">
          <span className="text-[14.5px] font-bold">কমিটি তথ্য</span>
          <div className="flex flex-col gap-2 text-[15px]">
            {c.type && (
              <div className="flex justify-between gap-3 py-1.5 border-b border-rulesoft">
                <span className="text-muted">ধরন</span><span className="font-medium">{c.type}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 py-1.5 border-b border-rulesoft">
              <span className="text-muted">তালিকাভুক্ত সদস্য</span>
              <span className="font-medium tnum">{bn(c.memberCount)}</span>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <span className="text-muted">তথ্যসূত্র</span>
              <span className="font-medium">বাংলাদেশ জাতীয় সংসদ · {dateBn(meta.syncedAt)}</span>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}

export const dynamicParams = false;
