'use client';

import { useActionState } from 'react';
import { signIn, type ActionState } from '@/app/admin/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
  const cls = 'w-full rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-[15px] focus:border-brand outline-none';

  return (
    <form action={action} className="bg-surface border border-rule rounded-xl p-5 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">ইমেইল</span>
        <input name="email" type="email" autoComplete="username" required className={cls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">পাসওয়ার্ড</span>
        <input name="password" type="password" autoComplete="current-password" required className={cls} />
      </label>
      {state.error && (
        <p role="alert" className="px-3.5 py-2.5 rounded-lg bg-[#fbe9ea] text-[#a8323d] text-[14px]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark disabled:opacity-60"
      >
        {pending ? 'লগইন হচ্ছে…' : 'লগইন'}
      </button>
    </form>
  );
}
