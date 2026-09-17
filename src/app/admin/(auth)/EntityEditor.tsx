import Link from 'next/link';
import { EDITABLE, type EditableField, type EntityType, type Override, type Hidden } from '@/lib/admin/store';
import { saveOverrides, revertOverride, toggleHidden } from '@/app/admin/actions';
import { Panel, Field, Button, Badge, Notice, when } from '@/app/admin/ui';

/** A value as the editor reads it: a choice by its label, an empty one as "(নেই)". */
const shown = (f: EditableField, v: unknown) => {
  if (v == null || v === '') return '(নেই)';
  return f.options?.find((o) => o.value === String(v))?.label ?? String(v);
};

/** Fields the nightly Wikipedia jobs also write; they leave alone only what an editor saved. */
const ENGINE_FIELDS = new Set(['educationBn', 'birthPlaceBn', 'professionBn', 'facebook', 'x', 'youtube', 'instagram', 'website']);

/**
 * The edit form shared by members, seats, parties and committees.
 *
 * Every field is an override on top of what parliament.gov.bd supplies, and
 * each can be reverted on its own. A revert is its own small form, placed
 * after the edit form and reached through the button's `form` attribute: a
 * form inside a form is invalid HTML, and submitting the whole edit form to
 * revert one field threw away whatever else the editor had typed.
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
  const formId = `edit-${type}-${id}`;
  const revertId = (key: string) => `revert-${type}-${id}-${key}`;
  const reverts: { key: string; value: string | null }[] = [];

  return (
    <Panel title="তথ্য সম্পাদনা">
      <form id={formId} action={saveOverrides} className="flex flex-col gap-4">
        <input type="hidden" name="entity_type" value={type} />
        <input type="hidden" name="entity_id" value={id} />
        {/* When the form was opened: a field someone else saved after this is not overwritten. */}
        <input type="hidden" name="loaded_at" value={new Date().toISOString()} />
        {EDITABLE[type].map((f) => {
          const o = byField.get(f.key);
          // The page reads the last published data, where saved edits are already applied.
          const published = snapshot[f.key];
          const value = o ? o.value : published == null ? null : String(published);
          const byScript = !!o && !o.updated_by;
          if (o) reverts.push({ key: f.key, value: o.value });
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
                options={f.options}
                inputMode={f.number ? 'numeric' : undefined}
                pattern={f.date ? '\\d{4}-\\d{2}-\\d{2}' : f.number ? '\\d{1,2}' : undefined}
                badge={o ? <Badge tone={byScript ? 'neutral' : 'good'}>{byScript ? 'স্ক্রিপ্টে যুক্ত' : 'হাতে সম্পাদিত'}</Badge> : undefined}
                hint={
                  o
                    ? `সর্বশেষ প্রকাশিত মান: ${shown(f, published)}। ${byScript ? 'যুক্ত হয়েছে' : 'বদলেছেন'} ${when(o.updated_at)}।` +
                      (byScript && ENGINE_FIELDS.has(f.key) ? ' রাতের উইকিপিডিয়া কাজ এটি আবার লিখতে পারে; পাকাপাকি মুছতে ঘর খালি করে সংরক্ষণ করুন।' : '')
                    : f.hint
                }
              />
              <input type="hidden" name={`current__${f.key}`} value={value ?? ''} />
              {o && (
                <button type="submit" form={revertId(f.key)} className="self-start text-[12.5px] font-semibold text-brand hover:underline">
                  {f.url ? 'লিংক মুছুন' : 'সম্পাদনা বাদ দিয়ে সংসদের মানে ফেরান'}
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
      {reverts.map((r) => (
        <form key={r.key} id={revertId(r.key)} action={revertOverride.bind(null, r.key)} className="hidden">
          <input type="hidden" name="entity_type" value={type} />
          <input type="hidden" name="entity_id" value={id} />
          <input type="hidden" name="current" value={r.value ?? ''} />
        </form>
      ))}
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

/** Why a field was refused, in the terms of what that field takes. */
const invalidReason = (type: EntityType, key: string) => {
  const f = EDITABLE[type].find((x) => x.key === key);
  if (f?.date) return 'বছর-মাস-দিন আকারে একটি সঠিক, ভবিষ্যতের নয় এমন তারিখ দিন (যেমন 1970-02-03)';
  if (f?.number) return `${f.number.min} থেকে ${f.number.max} এর মধ্যে একটি পূর্ণসংখ্যা দিন`;
  if (f?.options) return 'তালিকা থেকে একটি বেছে নিন';
  if (f?.url) return 'পুরো https:// ঠিকানা দিন, আর সেটি সংশ্লিষ্ট সাইটেরই হতে হবে (যেমন facebook.com)';
  return 'লেখাটি অনেক বড়; ছোট করে দিন';
};

export function EditFlags({ flags, noun, type = 'member' }: { flags: Record<string, string | undefined>; noun: string; type?: EntityType }) {
  const invalid = (flags.invalid ?? '').split(',').filter(Boolean);
  const conflict = (flags.conflict ?? '').split(',').filter(Boolean);
  return (
    <>
      {flags.saved && <Notice tone="good">সংরক্ষিত হয়েছে। সাইটে দেখাতে ড্যাশবোর্ড থেকে “সাইটে প্রকাশ করুন” চাপুন।</Notice>}
      {flags.reverted && (
        <Notice tone="good">
          সম্পাদনাটি বাদ দেওয়া হয়েছে। সংসদের মূল মান পরের প্রকাশের পর সাইটে ও এই ঘরে দেখা যাবে; তার আগে এই পাতায় আগের প্রকাশিত মানই দেখায়।
        </Notice>
      )}
      {flags.hidden && <Notice tone="warn">{noun} সাইট থেকে সরানো হয়েছে। পরের প্রকাশ থেকে দেখা যাবে না।</Notice>}
      {flags.unhidden && <Notice tone="good">{noun} আবার দেখানো হবে।</Notice>}
      {invalid.length > 0 && (
        <Notice tone="bad">
          এই ঘরগুলো সংরক্ষণ করা হয়নি: {invalid.map((k) => `“${fieldLabel(type, k)}” (${invalidReason(type, k)})`).join('; ')}। অন্য বদলানো ঘরগুলো সংরক্ষিত হয়েছে।
        </Notice>
      )}
      {conflict.length > 0 && (
        <Notice tone="warn">
          {conflict.map((k) => `“${fieldLabel(type, k)}”`).join(', ')} ঘরটি আপনি পাতা খোলার পর অন্য কেউ বদলেছেন, তাই আপনার লেখা বসানো হয়নি। নিচে এখনকার মান দেখে আবার সংরক্ষণ করুন।
        </Notice>
      )}
    </>
  );
}

export function AuditLink({ id, type }: { id: string; type?: string }) {
  return (
    <p className="text-[12.5px] text-muted px-1">
      <Link href={`/admin/audit?entity=${encodeURIComponent(id)}${type ? `&type=${type}` : ''}`} className="text-brand font-semibold hover:underline">
        এটির পরিবর্তনের ইতিহাস →
      </Link>
    </p>
  );
}
