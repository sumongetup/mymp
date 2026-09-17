import type { Metadata } from 'next';
import Link from 'next/link';
import { getMemberById, bn } from '@/lib/data';
import { normalise } from '@/lib/search';
import { requireAdmin } from '@/lib/admin/auth';
import { allQuestions, questionStates, QUESTION_CATEGORIES } from '@/lib/admin/questions';
import { AdminPage, Panel, Stat, Empty } from '@/app/admin/ui';
import { QuestionItem } from './QuestionItem';

export const metadata: Metadata = { title: 'তথ্য যাচাইয়ের প্রশ্ন' };

export default async function QuestionsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; cat?: string; q?: string }> }) {
  await requireAdmin();
  const { status = 'open', cat = '', q = '' } = await searchParams;
  const [states] = await Promise.all([questionStates()]);
  const all = allQuestions();
  const open = all.filter((x) => !states.get(x.id)?.resolved);

  const words = normalise(q).split(' ').filter(Boolean);
  const shown = all.filter((x) => {
    const resolved = !!states.get(x.id)?.resolved;
    if (status === 'open' && resolved) return false;
    if (status === 'resolved' && !resolved) return false;
    if (cat && x.category !== cat) return false;
    if (!words.length) return true;
    const m = getMemberById(x.memberId);
    const key = normalise([m?.nameBn, m?.nameEn, m?.seat?.nameBn, m?.seat?.nameEn, x.text].filter(Boolean).join(' '));
    return words.every((w) => key.includes(w));
  });

  // One card per member, in seat order.
  const byMember = new Map<string, typeof shown>();
  for (const x of shown) byMember.set(x.memberId, [...(byMember.get(x.memberId) ?? []), x]);
  const groups = [...byMember.entries()]
    .map(([id, items]) => ({ m: getMemberById(id), id, items }))
    .sort((a, b) => (a.m?.seat?.no ?? 999) - (b.m?.seat?.no ?? 999));

  const tab = (value: string, label: string, n: number) => {
    const params = new URLSearchParams({ ...(value !== 'open' ? { status: value } : {}), ...(cat ? { cat } : {}), ...(q ? { q } : {}) });
    const on = status === value;
    return (
      <Link
        href={`/admin/questions${params.size ? `?${params}` : ''}`}
        aria-current={on ? 'page' : undefined}
        className={`px-3.5 h-9 inline-flex items-center rounded-full text-[13.5px] font-semibold border ${on ? 'bg-ink text-white border-ink' : 'bg-surface border-rule hover:border-ink'}`}
      >
        {label} <span className={`ms-1.5 tnum ${on ? 'text-white/70' : 'text-muted'}`}>{bn(n)}</span>
      </Link>
    );
  };
  const back = `/admin/questions?${new URLSearchParams({ status, ...(cat ? { cat } : {}), ...(q ? { q } : {}) })}`;

  return (
    <AdminPage
      title="তথ্য যাচাইয়ের প্রশ্ন"
      lede="প্রত্যেক সদস্যের জীবনী লেখার সময় সূত্রের সঙ্গে যেখানে সাইটের তথ্য মেলেনি বা কিছু বাদ পড়েছে, তার তালিকা। সাইটে এগুলো বদলানো হয়নি, জীবনীতে শুধু বিতর্কিত অংশটি বাদ রাখা হয়েছে। সূত্র দেখে সদস্যের পাতায় ঠিক করুন, তারপর এখানে নিষ্পন্ন চিহ্ন দিন।"
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="খোলা প্রশ্ন" value={bn(open.length)} tone={open.length ? 'warn' : 'good'} icon="message" />
        <Stat label="নিষ্পন্ন" value={bn(all.length - open.length)} tone="good" icon="check" />
        <Stat label="যে সদস্যদের নিয়ে প্রশ্ন" value={bn(new Set(open.map((x) => x.memberId)).size)} icon="users" />
        <Stat label="মোট প্রশ্ন" value={bn(all.length)} icon="file" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {tab('open', 'খোলা', open.length)}
          {tab('resolved', 'নিষ্পন্ন', all.length - open.length)}
          {tab('all', 'সব', all.length)}
        </div>
        <form className="flex flex-wrap gap-2">
          {status !== 'open' && <input type="hidden" name="status" value={status} />}
          <select name="cat" defaultValue={cat} className="h-11 rounded-lg border border-rule bg-surface px-3 text-[14.5px]">
            <option value="">সব ধরনের প্রশ্ন</option>
            {Object.entries(QUESTION_CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>{label} ({bn(open.filter((x) => x.category === k).length)} খোলা)</option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={q}
            placeholder="সদস্যের নাম, আসন বা প্রশ্নের কোনো শব্দ"
            className="grow min-w-0 basis-[220px] rounded-lg border border-rule bg-surface px-3.5 h-11 text-[15px] focus:border-brand outline-none"
          />
          <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">দেখান</button>
        </form>
      </div>

      {groups.length === 0 ? (
        <Panel title="কিছু নেই">
          <Empty>{status === 'open' ? 'এই বাছাইয়ে কোনো খোলা প্রশ্ন নেই।' : 'এই বাছাইয়ে কিছু পাওয়া যায়নি।'}</Empty>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ m, id, items }) => (
            <Panel
              key={id}
              title={`${m?.nameBn ?? id}${m?.seat?.nameBn ? `, ${m.seat.nameBn}` : ''}`}
              action={<Link href={`/admin/members/${id}`}>সদস্যের তথ্য সম্পাদনা →</Link>}
            >
              <ul className="flex flex-col divide-y divide-rulesoft">
                {items.map((x) => (
                  <QuestionItem key={x.id} question={x} state={states.get(x.id) ?? null} back={back} />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
