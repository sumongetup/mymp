'use client';

import { useActionState } from 'react';
import { runFeedCollectorNow, type ActionState } from '@/app/admin/actions';

export default function FeedRunButton() {
  const [state, action, pending] = useActionState<ActionState, FormData>(async () => runFeedCollectorNow(), {});

  return (
    <form action={action} className="flex flex-col gap-2 items-start">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center h-10 px-4 rounded-lg bg-brand text-white text-[14px] font-semibold hover:bg-branddark disabled:opacity-60"
      >
        {pending ? 'সংগ্রহ চলছে…' : 'এখনই সংগ্রহ করুন'}
      </button>
      {state.ok && <p className="text-[13.5px] text-brand">{state.ok}</p>}
      {state.error && <p role="alert" className="text-[13.5px] text-[#a8323d]">{state.error}</p>}
    </form>
  );
}
