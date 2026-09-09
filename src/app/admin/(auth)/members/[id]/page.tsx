import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMemberById, bn, dateBn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { EDITABLE, overridesFor, isHidden } from '@/lib/admin/store';
import { saveOverrides, revertOverride, toggleHidden } from '@/app/admin/actions';
import { AdminPage, Panel, Field, Button, Badge, Notice, when } from '@/app/admin/ui';

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

  const [ov, hidden] = await Promise.all([overridesFor('member', id), isHidden('member', id)]);
  const override = new Map(ov.map((o) => [o.field, o]));
  const snapshot = m as unknown as Record<string, string | null | undefined>;
  const effective = (key: string) => (override.has(key) ? override.get(key)!.value : snapshot[key] ?? null);

  return (
    <AdminPage
      title={m.nameBn ?? m.nameEn ?? id}
      lede={[m.seat?.nameBn, m.party?.nameBn, m.nameEn].filter(Boolean).join(' · ')}
      actions={<Button kind="secondary" href={`/mp/${m.slug}`}>সাইটে দেখুন ↗</Button>}
    >
      {flags.saved && <Notice tone="good">সংরক্ষিত হয়েছে। সাইটে দেখাতে ড্যাশবোর্ড থেকে “সাইটে প্রকাশ করুন” চাপুন।</Notice>}
      {flags.reverted && <Notice tone="good">ফিল্ডটি সংসদের মূল মানে ফিরিয়ে আনা হয়েছে।</Notice>}
      {flags.hidden && <Notice tone="warn">সদস্যটি সাইট থেকে লুকানো হয়েছে। পরের প্রকাশ থেকে দেখা যাবে না।</Notice>}
      {flags.unhidden && <Notice tone="good">সদস্যটি আবার দেখানো হবে।</Notice>}
      {hidden && !flags.hidden && (
        <Notice tone="warn">এই সদস্য সাইট থেকে লুকানো আছে ({when(hidden.hidden_at)}){hidden.reason ? `: ${hidden.reason}` : ''}।</Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Panel title="তথ্য সম্পাদনা">
          {/* One form. The per-field "revert" buttons post the same form to a different action via formAction. */}
          <form action={saveOverrides} className="flex flex-col gap-4">
            <input type="hidden" name="entity_type" value="member" />
            <input type="hidden" name="entity_id" value={id} />
            {EDITABLE.member.map((f) => {
              const o = override.get(f.key);
              const value = effective(f.key);
              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Field
                    label={f.label}
                    name={`field__${f.key}`}
                    defaultValue={value}
                    multiline={f.multiline}
                    badge={o ? <Badge tone="good">হাতে সম্পাদিত</Badge> : undefined}
                    hint={o ? `সংসদের মান: ${snapshot[f.key] || '(নেই)'} · বদলেছেন ${when(o.updated_at)}` : undefined}
                  />
                  <input type="hidden" name={`current__${f.key}`} value={value ?? ''} />
                  {o && (
                    <button
                      type="submit"
                      name="field"
                      value={f.key}
                      formAction={revertOverride}
                      className="self-start text-[12.5px] font-semibold text-brand hover:underline"
                    >
                      সংসদের মানে ফেরান
                    </button>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Button>সংরক্ষণ</Button>
              <Button kind="secondary" href="/admin/members">ফিরে যান</Button>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="সংসদের তথ্যভান্ডার থেকে">
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-muted">আইডি</dt><dd className="tnum">{m.id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">জন্ম</dt><dd>{dateBn(m.dateOfBirth) ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">লিঙ্গ</dt><dd>{m.gender === 'Female' ? 'নারী' : 'পুরুষ'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">আসন নং</dt><dd className="tnum">{m.seat ? bn(m.seat.no) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">মোবাইল</dt><dd>{m.hasMobile ? 'আছে, প্রকাশ করা হয় না' : 'নেই'}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] text-muted">এগুলো এখানে বদলানো যায় না; সংসদের তথ্যভান্ডার থেকে প্রতি সিঙ্কে আসে।</p>
          </Panel>

          <Panel title={hidden ? 'আবার দেখান' : 'সাইট থেকে লুকান'}>
            <form action={toggleHidden} className="flex flex-col gap-3">
              <input type="hidden" name="entity_type" value="member" />
              <input type="hidden" name="entity_id" value={id} />
              <input type="hidden" name="hide" value={hidden ? '0' : '1'} />
              {!hidden && <Field label="কারণ (ঐচ্ছিক)" name="reason" />}
              <p className="text-[13px] text-muted">
                লুকানো মানে মুছে ফেলা নয়। তথ্য ডেটাবেসে থাকে, শুধু সাইটে দেখানো হয় না, আর যেকোনো সময় ফিরিয়ে আনা যায়।
              </p>
              <Button kind={hidden ? 'secondary' : 'danger'}>{hidden ? 'আবার দেখান' : 'লুকান'}</Button>
            </form>
          </Panel>

          <p className="text-[12.5px] text-muted px-1">
            <Link href={`/admin/audit?entity=${id}`} className="text-brand font-semibold hover:underline">এই সদস্যের পরিবর্তনের ইতিহাস →</Link>
          </p>
        </div>
      </div>
    </AdminPage>
  );
}
