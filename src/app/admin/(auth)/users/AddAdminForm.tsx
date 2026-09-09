'use client';

import { useActionState } from 'react';
import { createAdmin, type ActionState } from '@/app/admin/actions';

export default function AddAdminForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createAdmin, {});
  const cls = 'w-full rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-[15px] focus:border-brand outline-none';

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">ইমেইল</span>
        <input name="email" type="email" required className={cls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">ভূমিকা</span>
        <select name="role" defaultValue="editor" className={cls}>
          <option value="editor">সম্পাদক</option>
          <option value="super_admin">সুপার অ্যাডমিন</option>
        </select>
      </label>
      {state.error && <p role="alert" className="px-3.5 py-2.5 rounded-lg bg-[#fbe9ea] text-[#a8323d] text-[14px]">{state.error}</p>}
      {state.ok && <p className="px-3.5 py-2.5 rounded-lg bg-brandsoft text-branddark text-[14px] break-all">{state.ok}</p>}
      <button type="submit" disabled={pending} className="h-11 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark disabled:opacity-60">
        {pending ? 'যোগ হচ্ছে…' : 'যোগ করুন'}
      </button>
    </form>
  );
}
