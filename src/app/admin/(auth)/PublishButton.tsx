'use client';

import { useActionState } from 'react';
import { publishSite, type ActionState } from '@/app/admin/actions';

export default function PublishButton({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async () => publishSite(), {});

  return (
    <form action={action} className="flex flex-col gap-2 items-start">
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center rounded-lg bg-brand text-white font-semibold hover:bg-branddark disabled:opacity-60 ${compact ? 'h-9 px-3.5 text-[13.5px]' : 'h-11 px-5 text-[14.5px]'}`}
      >
        {pending ? 'পাঠানো হচ্ছে…' : 'সাইটে প্রকাশ করুন'}
      </button>
      {state.ok && <p className="text-[13.5px] text-brand">{state.ok}</p>}
      {state.error && <p role="alert" className="text-[13.5px] text-[#a8323d]">{state.error}</p>}
    </form>
  );
}
