import Link from 'next/link';
import { members, committees, meta, bn, dateBn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { counts, listAudit, listSyncRuns } from '@/lib/admin/store';
import { AdminPage, Panel, Stat, Table, Td, Empty, Notice, when } from '@/app/admin/ui';
import PublishButton from './PublishButton';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  await requireAdmin();
  const { forbidden } = await searchParams;
  const [c, recent, runs] = await Promise.all([counts(), listAudit(8), listSyncRuns(1)]);
  const lastRun = runs[0];
  const stale = committees.filter((x) => !x.rosterCurrent).length;

  return (
    <AdminPage
      title="ড্যাশবোর্ড"
      lede={`সাইটে এখন ${bn(members.length)} জন সদস্য, ${bn(committees.length)}টি কমিটি। তথ্য হালনাগাদ ${dateBn(meta.syncedAt)}।`}
      actions={<PublishButton />}
    >
      {forbidden && <Notice tone="warn">ওই পাতাটি শুধু সুপার অ্যাডমিন দেখতে পারেন।</Notice>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="সংশোধন অনুরোধ (খোলা)" value={bn(c.correctionsOpen)} href="/admin/corrections" />
        <Stat label="সংবাদ খসড়া" value={bn(c.newsDraft)} href="/admin/news?status=draft" />
        <Stat label="প্রকাশিত সংবাদ" value={bn(c.newsPublished)} href="/admin/news?status=published" />
        <Stat label="হাতে সম্পাদিত ফিল্ড" value={bn(c.overrides)} href="/admin/members" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="কীভাবে পরিবর্তন সাইটে যায়">
          <ol className="flex flex-col gap-2 text-[14px] leading-relaxed text-inksoft list-decimal ps-5">
            <li>এখানে কোনো সদস্যের তথ্য বদলালে বা সংবাদ প্রকাশ করলে তা ডেটাবেসে জমা হয়।</li>
            <li>উপরের <strong className="text-ink">সাইটে প্রকাশ করুন</strong> চাপলে সাইট নতুন করে তৈরি হয়: সংসদের তথ্যভান্ডার থেকে সর্বশেষ তথ্য আসে, তার উপর আপনার সম্পাদনা বসে, প্রকাশিত সংবাদ যুক্ত হয়।</li>
            <li>প্রতি রাতে এটি নিজে নিজেও একবার চলে, তাই সংসদের নতুন তথ্য দিন পার হওয়ার আগেই সাইটে আসে।</li>
          </ol>
          <p className="mt-3 text-[13px] text-muted">আপনার সম্পাদনা সংসদের তথ্যের উপরে থাকে; রাতের সিঙ্ক সেগুলো কখনো মুছে দেয় না।</p>
        </Panel>

        <Panel title="সর্বশেষ সিঙ্ক">
          {lastRun ? (
            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3"><span className="text-muted">সময়</span><span>{when(lastRun.started_at)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">ফল</span><span className={lastRun.ok ? 'text-brand font-semibold' : 'text-[#a8323d] font-semibold'}>{lastRun.ok ? 'সফল' : 'ব্যর্থ'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">সদস্য / কমিটি</span><span className="tnum">{bn(lastRun.members ?? 0)} / {bn(lastRun.committees ?? 0)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">সম্পাদনা প্রয়োগ</span><span className="tnum">{bn(lastRun.overrides_applied ?? 0)}</span></div>
              {lastRun.message && <p className="text-[13px] text-muted border-t border-rule pt-2">{lastRun.message}</p>}
              <Link href="/admin/sync" className="text-[13.5px] font-semibold text-brand hover:underline">সব সিঙ্ক দেখুন →</Link>
            </div>
          ) : (
            <Empty>ডেটাবেস যুক্ত হওয়ার পর প্রথম প্রকাশে এখানে সিঙ্কের হিসাব আসবে।</Empty>
          )}
          <p className="mt-3 text-[13px] text-muted">{bn(stale)}টি কমিটির সদস্য তালিকা সংসদের তথ্যভান্ডারে এখনো আগের সংসদের; সেগুলো সাইটে অপেক্ষমাণ হিসেবে দেখানো হয়।</p>
        </Panel>
      </div>

      <Panel title="সাম্প্রতিক পরিবর্তন">
        {recent.length ? (
          <Table head={['কখন', 'কে', 'কী', 'কোথায়']}>
            {recent.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{when(r.created_at)}</Td>
                <Td>{r.actor_email ?? '—'}</Td>
                <Td><code className="text-[12.5px]">{r.action}</code></Td>
                <Td className="text-muted">{[r.entity_type, r.entity_id, r.field].filter(Boolean).join(' · ')}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>এখনো কোনো পরিবর্তন করা হয়নি।</Empty>
        )}
      </Panel>
    </AdminPage>
  );
}
