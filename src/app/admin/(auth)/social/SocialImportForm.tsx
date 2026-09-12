'use client';

import { useActionState } from 'react';
import { importSocialLinks, type SocialImportState } from '@/app/admin/actions';
import { inputClass } from '@/app/admin/ui';

export default function SocialImportForm({ template }: { template: string }) {
  const [state, action, pending] = useActionState<SocialImportState, FormData>(importSocialLinks, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">প্রতি লাইনে একজন সদস্য, তারপর তাঁর লিংক</span>
        <textarea
          name="lines"
          rows={12}
          spellCheck={false}
          placeholder={'ঢাকা-১৭ | https://www.facebook.com/… https://x.com/…\nthakurgaon-2 https://www.youtube.com/@…'}
          className={`${inputClass} font-mono text-[13.5px] leading-relaxed`}
        />
      </label>
      {state.error && <p role="alert" className="px-3.5 py-2.5 rounded-lg bg-dangersoft text-danger text-[14px]">{state.error}</p>}
      {state.lines && (
        <div className="flex flex-col gap-2">
          <p className="px-3.5 py-2.5 rounded-lg bg-brandsoft text-branddark text-[14px]">
            {state.saved}টি লিংক সংরক্ষিত, {state.unchanged}টি আগের মতোই ছিল, {state.lines.filter((l) => !l.ok).length}টি লাইন পড়া যায়নি।
            সাইটে দেখাতে “সিঙ্ক ও প্রকাশ” থেকে প্রকাশ করুন।
          </p>
          <ul className="flex flex-col gap-1 text-[13.5px]">
            {state.lines.map((l) => (
              <li key={l.line} className={`px-3 py-2 rounded-md border ${l.ok ? 'border-rule' : 'border-danger bg-dangersoft/40'}`}>
                <span className="text-muted tnum">লাইন {l.line}: </span>
                {l.who && <strong className="font-semibold">{l.who}: </strong>}
                <span className={l.ok ? 'text-inksoft' : 'text-danger'}>{l.message}</span>
                {!l.ok && <span className="block text-[12.5px] text-muted break-all">{l.raw}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center">
        <button type="submit" disabled={pending} className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark disabled:opacity-60">
          {pending ? 'সংরক্ষণ হচ্ছে…' : 'লিংক সংরক্ষণ করুন'}
        </button>
        <span className="text-[12.5px] text-muted">সংরক্ষণের পর প্রতিটি পরিবর্তন “পরিবর্তনের ইতিহাস”-এ থাকবে।</span>
      </div>
      <details className="text-[13.5px]">
        <summary className="cursor-pointer font-semibold text-brand">যাঁদের এখনো কোনো লিংক নেই, তাঁদের তালিকা (কপি করে লিংক বসিয়ে ফেরত দিন)</summary>
        <textarea readOnly rows={10} defaultValue={template} className={`${inputClass} mt-2 font-mono text-[13px]`} />
      </details>
    </form>
  );
}
