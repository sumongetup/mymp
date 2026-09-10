'use client';

import { useActionState } from 'react';
import { signIn, type ActionState } from '@/app/admin/actions';
import { inputClass } from '@/app/admin/ui';

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={action} className="bg-surface border border-rule rounded-card shadow-lift p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1 pb-1">
        <h1 className="display text-[22px]">লগইন</h1>
        <p className="text-[13.5px] text-muted">অ্যাডমিন তালিকায় থাকা ইমেইল দিয়ে ঢুকুন।</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">ইমেইল</span>
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">পাসওয়ার্ড</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {state.error && (
        <p role="alert" className="px-3.5 py-2.5 rounded-lg bg-dangersoft text-danger text-[14px]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark disabled:opacity-60 transition-colors"
      >
        {pending ? 'লগইন হচ্ছে…' : 'লগইন'}
      </button>
    </form>
  );
}
