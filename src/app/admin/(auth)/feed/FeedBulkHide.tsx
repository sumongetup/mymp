'use client';

import { useActionState } from 'react';
import { bulkHideFeed } from '@/app/admin/actions';
import { Panel, Field, Button, Notice } from '@/app/admin/ui';

/** When one outlet floods the feed, hide the lot in a single action. */
export default function FeedBulkHide({ outlets }: { outlets: string[] }) {
  const [state, action, pending] = useActionState(bulkHideFeed, {});
  return (
    <Panel title="একসঙ্গে লুকান">
      <form action={action} className="flex flex-col gap-3">
        {state.error && <Notice tone="bad">{state.error}</Notice>}
        {state.ok && <Notice tone="good">{state.ok}</Notice>}
        <p className="text-[13px] text-muted leading-relaxed">
          একটি সংবাদমাধ্যম বা কয়েক দিনের সব সংযুক্তি একবারে লুকানো যায়। কিছুই মুছে যায় না; কারণসহ থেকে যায় এবং পরে ফেরানো যায়।
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">সংবাদমাধ্যম</span>
          <select name="outlet" defaultValue="" className="h-11 rounded-lg border border-rule bg-surface px-3 text-[14.5px]">
            <option value="">বাছাই করা নেই</option>
            {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="থেকে" name="from" type="date" />
          <Field label="পর্যন্ত" name="to" type="date" />
        </div>
        <Field label="কারণ" name="reason" hint="কেন লুকানো হলো, পরে দেখে বোঝার জন্য।" />
        <div><Button kind="secondary">{pending ? "লুকানো হচ্ছে…" : "লুকান"}</Button></div>
      </form>
    </Panel>
  );
}
