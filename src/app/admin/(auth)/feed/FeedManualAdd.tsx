'use client';

import { useActionState } from 'react';
import { addFeedItemByUrl } from '@/app/admin/actions';
import { Panel, Field, Button, Notice } from '@/app/admin/ui';

/** Paste a link, pick a member: the page is read once and the item goes live. */
export default function FeedManualAdd({ members }: { members: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(addFeedItemByUrl, {});
  return (
    <Panel title="হাতে যুক্ত করুন">
      <form action={action} className="flex flex-col gap-3">
        {state.error && <Notice tone="bad">{state.error}</Notice>}
        {state.ok && <Notice tone="good">{state.ok}</Notice>}
        <Field label="খবরের বা ভিডিওর ঠিকানা" name="url" type="url" hint="ইউটিউব লিংক দিলে ভিডিও হিসেবে যুক্ত হবে।" />
        <Field label="শিরোনাম (ঐচ্ছিক)" name="title" hint="পাতাটি পড়া না গেলে এই শিরোনাম ব্যবহার হবে।" />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">সংসদ সদস্য</span>
          <select name="mp_id" required defaultValue="" className="h-11 rounded-lg border border-rule bg-surface px-3 text-[14.5px]">
            <option value="" disabled>সংসদ সদস্য বাছুন</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <div><Button>{pending ? "আনা হচ্ছে…" : "যুক্ত করুন"}</Button></div>
      </form>
    </Panel>
  );
}
