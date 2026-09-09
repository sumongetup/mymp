import { notFound } from 'next/navigation';
import { members, seats } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { getNews } from '@/lib/admin/store';
import { saveNews, changeNewsStatus } from '@/app/admin/actions';
import { AdminPage, Panel, Field, Button, Badge, Notice, when } from '@/app/admin/ui';

const STATUS_BN = { draft: 'খসড়া', published: 'প্রকাশিত', rejected: 'বাতিল' } as const;

export default async function EditNews({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const isNew = id === 'new';
  const n = isNew ? null : await getNews(id);
  if (!isNew && !n) notFound();

  const sel = 'w-full rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-[15px] focus:border-brand outline-none';

  return (
    <AdminPage
      title={isNew ? 'নতুন সংবাদ' : n!.title_bn}
      lede={isNew ? 'প্রকাশ না করা পর্যন্ত খসড়া হিসেবে থাকবে।' : `${n!.source_name} · ${n!.published_on}`}
      actions={
        n ? (
          <form action={changeNewsStatus} className="flex gap-2">
            <input type="hidden" name="id" value={n.id} />
            {n.status !== 'published' && <button type="submit" name="status" value="published" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px] hover:bg-branddark">প্রকাশ করুন</button>}
            {n.status === 'published' && <button type="submit" name="status" value="draft" className="h-11 px-5 rounded-lg bg-surface border border-rule font-semibold text-[14.5px] hover:border-brand">প্রকাশ তুলে নিন</button>}
            {n.status !== 'rejected' && <button type="submit" name="status" value="rejected" className="h-11 px-4 rounded-lg bg-[#fbe9ea] text-[#a8323d] border border-[#f0c9cc] font-semibold text-[14.5px]">বাতিল</button>}
          </form>
        ) : undefined
      }
    >
      {flags.saved && <Notice tone="good">সংরক্ষিত হয়েছে।</Notice>}
      {flags.status && <Notice tone="good">অবস্থা বদলে হয়েছে: {STATUS_BN[flags.status as keyof typeof STATUS_BN] ?? flags.status}। সাইটে দেখাতে “সাইটে প্রকাশ করুন” চাপুন।</Notice>}
      {n && (
        <p className="flex items-center gap-2 text-[13.5px] text-muted">
          অবস্থা <Badge tone={n.status === 'published' ? 'good' : n.status === 'rejected' ? 'bad' : 'warn'}>{STATUS_BN[n.status]}</Badge>
          · শেষ বদল {when(n.updated_at)}
        </p>
      )}

      <Panel>
        <form action={saveNews} className="flex flex-col gap-4 max-w-[760px]">
          {n && <input type="hidden" name="id" value={n.id} />}
          <Field label="শিরোনাম (বাংলা)" name="title_bn" defaultValue={n?.title_bn} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="সংবাদমাধ্যম" name="source_name" defaultValue={n?.source_name} required hint="যেমন: প্রথম আলো, দ্য ডেইলি স্টার" />
            <Field label="প্রকাশের তারিখ" name="published_on" type="date" defaultValue={n?.published_on} required />
          </div>
          <Field label="মূল সংবাদের লিংক" name="source_url" type="url" defaultValue={n?.source_url} required hint="পাঠক এই লিংকেই যাবেন। পুরো সংবাদ এখানে লেখা হবে না।" />
          <Field label="সংক্ষিপ্ত উদ্ধৃতি (ঐচ্ছিক, এক-দুই বাক্য)" name="excerpt_bn" defaultValue={n?.excerpt_bn} multiline />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">সংশ্লিষ্ট সংসদ সদস্য</span>
              <select name="member_id" defaultValue={n?.member_id ?? ''} className={sel}>
                <option value="">কেউ নয়</option>
                {[...members].sort((a, b) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999)).map((m) => (
                  <option key={m.id} value={m.id}>{m.seat?.nameBn ? `${m.seat.nameBn} · ` : ''}{m.nameBn ?? m.nameEn}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">সংশ্লিষ্ট আসন</span>
              <select name="seat_slug" defaultValue={n?.seat_slug ?? ''} className={sel}>
                <option value="">কোনোটি নয়</option>
                {seats.map((s) => <option key={s.slug} value={s.slug}>{s.nameBn}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button>{isNew ? 'খসড়া হিসেবে রাখুন' : 'সংরক্ষণ'}</Button>
            <Button kind="secondary" href="/admin/news">ফিরে যান</Button>
          </div>
        </form>
      </Panel>
    </AdminPage>
  );
}
