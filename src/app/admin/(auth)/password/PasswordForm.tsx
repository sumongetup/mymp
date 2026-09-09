'use client';

import { useActionState } from 'react';
import { changePassword, type ActionState } from '@/app/admin/actions';

export default function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  const cls = 'w-full rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-[15px] focus:border-brand outline-none';

  return (
    <form action={action} className="flex flex-col gap-4 max-w-[420px]">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">নতুন পাসওয়ার্ড</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={10} className={cls} />
        <span className="text-[12.5px] text-muted">কমপক্ষে ১০ অক্ষর।</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">আবার লিখুন</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} className={cls} />
      </label>
      {state.error && <p role="alert" className="px-3.5 py-2.5 rounded-lg bg-[#fbe9ea] text-[#a8323d] text-[14px]">{state.error}</p>}
      {state.ok && <p className="px-3.5 py-2.5 rounded-lg bg-brandsoft text-branddark text-[14px]">{state.ok}</p>}
      <button type="submit" disabled={pending} className="h-11 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark disabled:opacity-60">
        {pending ? 'বদলানো হচ্ছে…' : 'পাসওয়ার্ড বদলান'}
      </button>
    </form>
  );
}
