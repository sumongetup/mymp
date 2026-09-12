import Link from 'next/link';
import { EDITABLE, type EntityType, type Override, type Hidden } from '@/lib/admin/store';
import { saveOverrides, revertOverride, toggleHidden } from '@/app/admin/actions';
import { Panel, Field, Button, Badge, Notice, when } from '@/app/admin/ui';

/**
 * The edit form shared by members, seats, parties and committees.
 *
 * Every field is an override on top of what parliament.gov.bd supplies, so each
 * one shows the source value it replaces and can be reverted on its own. The
 * per-field revert buttons submit this same form to a different action, because
 * a form inside a form is invalid HTML.
 */
export function EntityEditor({
  type,
  id,
  snapshot,
  overrides,
  backHref,
}: {
  type: EntityType;
  id: string;
  snapshot: Record<string, string | null | undefined>;
  overrides: Override[];
  backHref: string;
}) {
  const byField = new Map(overrides.map((o) => [o.field, o]));

  return (
    <Panel title="তথ্য সম্পাদনা">
      <form action={saveOverrides} className="flex flex-col gap-4">
        <input type="hidden" name="entity_type" value={type} />
        <input type="hidden" name="entity_id" value={id} />
        {EDITABLE[type].map((f) => {
          const o = byField.get(f.key);
          const value = o ? o.value : snapshot[f.key] ?? null;
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              {f.group && (
                <span className="mt-3 pt-4 border-t border-rulesoft text-[11.5px] font-bold tracking-[1.4px] text-muted">{f.group}</span>
              )}
              <Field
                label={f.label}
                name={`field__${f.key}`}
                defaultValue={value}
                multiline={f.multiline}
                type={f.url ? 'url' : 'text'}
                badge={o ? <Badge tone="good">হাতে সম্পাদিত</Badge> : undefined}
                hint={o ? `সংসদের মান: ${snapshot[f.key] || '(নেই)'}, বদলেছেন ${when(o.updated_at)}` : f.hint}
              />
              <input type="hidden" name={`current__${f.key}`} value={value ?? ''} />
              {o && (
                <button
                  type="submit"
                  formAction={revertOverride.bind(null, f.key)}
                  className="self-start text-[12.5px] font-semibold text-brand hover:underline"
                >
                  {f.url ? 'লিংক মুছুন' : 'সংসদের মানে ফেরান'}
                </button>
              )}
            </div>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button>সংরক্ষণ</Button>
          <Button kind="secondary" href={backHref}>ফিরে যান</Button>
        </div>
      </form>
    </Panel>
  );
}

/** Hide/unhide. Deliberately not a delete: the record stays and can come back. */
export function HidePanel({
  type,
  id,
  hidden,
  noun,
}: {
  type: 'member' | 'committee';
  id: string;
  hidden: Hidden | null;
  noun: string;
}) {
  return (
    <Panel title={hidden ? 'আবার দেখান' : 'সাইট থেকে সরান'}>
      <form action={toggleHidden} className="flex flex-col gap-3">
        <input type="hidden" name="entity_type" value={type} />
        <input type="hidden" name="entity_id" value={id} />
        <input type="hidden" name="hide" value={hidden ? '0' : '1'} />
        {!hidden && <Field label="কারণ (ঐচ্ছিক)" name="reason" />}
        <p className="text-[13px] text-muted leading-relaxed">
          সরানো মানে মুছে ফেলা নয়। {noun} ডেটাবেসে থাকে, শুধু সাইটে দেখানো হয় না, আর যেকোনো সময়
          ফিরিয়ে আনা যায়।
        </p>
        <Button kind={hidden ? 'secondary' : 'danger'}>{hidden ? 'আবার দেখান' : 'সরান'}</Button>
      </form>
    </Panel>
  );
}

const fieldLabel = (type: EntityType, key: string) => EDITABLE[type].find((f) => f.key === key)?.label ?? key;

export function EditFlags({ flags, noun, type = 'member' }: { flags: Record<string, string | undefined>; noun: string; type?: EntityType }) {
  return (
    <>
      {flags.saved && <Notice tone="good">সংরক্ষিত হয়েছে। সাইটে দেখাতে ড্যাশবোর্ড থেকে “সাইটে প্রকাশ করুন” চাপুন।</Notice>}
      {flags.reverted && <Notice tone="good">ফিল্ডটি সংসদের মূল মানে ফিরিয়ে আনা হয়েছে।</Notice>}
      {flags.hidden && <Notice tone="warn">{noun} সাইট থেকে সরানো হয়েছে। পরের প্রকাশ থেকে দেখা যাবে না।</Notice>}
      {flags.unhidden && <Notice tone="good">{noun} আবার দেখানো হবে।</Notice>}
      {flags.invalid && (
        <Notice tone="bad">
          “{fieldLabel(type, flags.invalid)}” ঘরের লিংকটি গ্রহণ করা হয়নি: পুরো https:// ঠিকানা দিন, আর সেটি সংশ্লিষ্ট
          সাইটেরই হতে হবে (যেমন facebook.com)। অন্য ঘরগুলো সংরক্ষিত হয়েছে।
        </Notice>
      )}
    </>
  );
}

export function AuditLink({ id }: { id: string }) {
  return (
    <p className="text-[12.5px] text-muted px-1">
      <Link href={`/admin/audit?entity=${id}`} className="text-brand font-semibold hover:underline">
        এটির পরিবর্তনের ইতিহাস →
      </Link>
    </p>
  );
}
