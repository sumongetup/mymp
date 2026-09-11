import { notFound } from 'next/navigation';
import { getMemberById, bn, dateBn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { overridesFor, isHidden } from '@/lib/admin/store';
import { AdminPage, Panel, Button, Notice, when } from '@/app/admin/ui';
import { EntityEditor, EditFlags, HidePanel, AuditLink } from '../../EntityEditor';

export default async function EditMember({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const m = getMemberById(id);
  if (!m) notFound();

  const [overrides, hidden] = await Promise.all([overridesFor('member', id), isHidden('member', id)]);

  return (
    <AdminPage
      title={m.nameBn ?? m.nameEn ?? id}
      lede={[m.seat?.nameBn, m.party?.nameBn, m.nameEn].filter(Boolean).join(' · ')}
      actions={<Button kind="secondary" href={`/mp/${m.slug}`}>সাইটে দেখুন ↗</Button>}
    >
      <EditFlags flags={flags} noun="সদস্যটি" />
      {hidden && !flags.hidden && (
        <Notice tone="warn">
          এই সদস্য সাইট থেকে সরানো আছে ({when(hidden.hidden_at)}){hidden.reason ? `: ${hidden.reason}` : ''}।
        </Notice>
      )}

      {m.socialSource && (
        <Notice tone="warn">
          এই সদস্যের সোশ্যাল লিংকগুলো স্বয়ংক্রিয়ভাবে তাঁর উইকিপিডিয়া নিবন্ধ থেকে নেওয়া ({m.socialSource.split(' ').join(', ')})। সাইটে সূত্র হিসেবে উইকিপিডিয়া দেখানো হচ্ছে। যাচাই করে কোনো লিংক বদলে সংরক্ষণ করলে সাইটে “সম্পাদক যাচাই করেছেন” দেখাবে।
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <EntityEditor
          type="member"
          id={id}
          snapshot={m as unknown as Record<string, string | null | undefined>}
          overrides={overrides}
          backHref="/admin/members"
        />

        <div className="flex flex-col gap-4">
          <Panel title="সংসদের তথ্যভান্ডার থেকে">
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-muted">আইডি</dt><dd className="tnum">{m.id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">জন্ম</dt><dd>{dateBn(m.dateOfBirth) ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">লিঙ্গ</dt><dd>{m.gender === 'Female' ? 'নারী' : 'পুরুষ'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">আসন</dt><dd>{m.seat?.nameBn ?? '—'}{m.seat ? ` (${bn(m.seat.no)})` : ''}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">মোবাইল</dt><dd>{m.hasMobile ? 'আছে, প্রকাশ করা হয় না' : 'নেই'}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] text-muted">
              এগুলো এখানে বদলানো যায় না; প্রতি সিঙ্কে সংসদের তথ্যভান্ডার থেকে আসে।
            </p>
          </Panel>

          <HidePanel type="member" id={id} hidden={hidden} noun="সদস্যের তথ্য" />
          <AuditLink id={id} />
        </div>
      </div>
    </AdminPage>
  );
}
