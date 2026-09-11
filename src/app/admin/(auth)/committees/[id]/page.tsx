import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { committees, getMemberById, bn, dateBn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { overridesFor, isHidden } from '@/lib/admin/store';
import { AdminPage, Panel, Button, Notice } from '@/app/admin/ui';
import { EntityEditor, EditFlags, HidePanel, AuditLink } from '../../EntityEditor';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = committees.find((x) => x.id === id);
  return { title: c ? `${c.nameBn ?? c.nameEn} · কমিটি` : 'কমিটি' };
}

export default async function EditCommittee({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const c = committees.find((x) => x.id === id);
  if (!c) notFound();

  const [overrides, hidden] = await Promise.all([overridesFor('committee', id), isHidden('committee', id)]);

  return (
    <AdminPage
      title={c.nameBn ?? c.nameEn ?? id}
      lede={[c.nameEn, c.type, c.startDate ? `গঠিত ${dateBn(c.startDate)}` : null].filter(Boolean).join(' · ')}
      actions={<Button kind="secondary" href={`/committee/${c.slug}`}>সাইটে দেখুন ↗</Button>}
    >
      <EditFlags flags={flags} noun="কমিটিটি" />
      {!c.rosterCurrent && (
        <Notice tone="warn">
          এই কমিটির সদস্য তালিকা সংসদের তথ্যভান্ডারে এখনো দ্বাদশ সংসদের। সাইটে সদস্যদের নাম দেখানো হয় না,
          শুধু কমিটির নাম দেখানো হয়। সংসদ হালনাগাদ করলে পরের সিঙ্কেই সদস্যরা যুক্ত হবেন।
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <EntityEditor
            type="committee"
            id={id}
            snapshot={c as unknown as Record<string, string | null | undefined>}
            overrides={overrides}
            backHref="/admin/committees"
          />

          <Panel title={`সদস্য (${bn(c.members.length)})`}>
            {c.members.length ? (
              <ul className="flex flex-col gap-2 text-[14px]">
                {c.members.map((x) => {
                  const m = getMemberById(x.memberId);
                  return (
                    <li key={x.memberId} className="flex justify-between gap-3 py-1 border-b border-rulesoft last:border-0">
                      <span>{m?.nameBn ?? x.memberId}</span>
                      <span className="text-muted shrink-0">{x.role === 'Chairman' ? 'সভাপতি' : x.role === 'Member' ? 'সদস্য' : x.role}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">
                বর্তমান সংসদের কোনো সদস্য এই কমিটিতে তালিকাভুক্ত নেই।
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-muted">
              সদস্য তালিকা সংসদের তথ্যভান্ডার থেকে আসে এবং এখানে বদলানো যায় না। যাঁরা এখন আর সংসদ সদস্য
              নন, তাঁদের কখনো বর্তমান সদস্য হিসেবে দেখানো হয় না।
            </p>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <HidePanel type="committee" id={id} hidden={hidden} noun="কমিটিটি" />
          <AuditLink id={id} />
        </div>
      </div>
    </AdminPage>
  );
}
