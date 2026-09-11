import type { Metadata } from 'next';
import Link from 'next/link';
import { members, committees, meta, bn, dateBn } from '@/lib/data';
import { latestSession, latestSitting, sessionLabel, totalSittings, memberNoticeCount, activity } from '@/lib/activity';
import { requireAdmin } from '@/lib/admin/auth';
import { counts, listAudit, listSyncRuns } from '@/lib/admin/store';
import { AdminPage, Panel, Stat, Table, Td, Empty, Notice, when } from '@/app/admin/ui';
import PublishButton from './PublishButton';

export const metadata: Metadata = { title: 'ড্যাশবোর্ড' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  await requireAdmin();
  const { forbidden } = await searchParams;
  const [c, recent, runs] = await Promise.all([counts(), listAudit(8), listSyncRuns(1)]);
  const lastRun = runs[0];
  const stale = committees.filter((x) => !x.rosterCurrent).length;
  const session = latestSession();
  const sitting = latestSitting();

  return (
    <AdminPage
      title="ড্যাশবোর্ড"
      lede={`সাইটে এখন ${bn(members.length)} জন সদস্য, ${bn(committees.length)}টি কমিটি, ${bn(totalSittings())}টি বৈঠকের নথি। তথ্য হালনাগাদ ${dateBn(meta.syncedAt)}।`}
      actions={<PublishButton />}
    >
      {forbidden && <Notice tone="warn">ওই পাতাটি শুধু সুপার অ্যাডমিন দেখতে পারেন।</Notice>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="সংশোধন অনুরোধ (খোলা)" value={bn(c.correctionsOpen)} href="/admin/corrections" icon="message" tone={c.correctionsOpen ? 'warn' : 'neutral'} />
        <Stat label="সংবাদ খসড়া" value={bn(c.newsDraft)} href="/admin/news?status=draft" icon="file" tone={c.newsDraft ? 'warn' : 'neutral'} />
        <Stat label="প্রকাশিত সংবাদ" value={bn(c.newsPublished)} href="/admin/news?status=published" icon="check" tone="good" />
        <Stat label="হাতে সম্পাদিত ফিল্ড" value={bn(c.overrides)} href="/admin/members" icon="users" tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="সংসদে এখন" action={<Link href="/odhibeshon" target="_blank">সাইটে দেখুন ↗</Link>}>
          <dl className="flex flex-col text-[14px]">
            <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">সর্বশেষ অধিবেশন</dt><dd className="font-semibold text-end">{session ? sessionLabel(session) : '—'}{session?.startDate ? <span className="text-muted font-normal"> · শুরু {dateBn(session.startDate)}</span> : null}</dd></div>
            <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">সর্বশেষ বৈঠক</dt><dd className="font-semibold">{dateBn(sitting?.date ?? null) ?? '—'}</dd></div>
            <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">বৈঠকের নথি</dt><dd className="font-semibold tnum">{bn(totalSittings())}</dd></div>
            <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">সদস্যদের প্রজ্ঞাপন</dt><dd className="font-semibold tnum">{bn(memberNoticeCount())}</dd></div>
            <div className="flex justify-between gap-3 py-2"><dt className="text-muted">সংসদ পরিচালনায়</dt><dd className="font-semibold tnum">{bn(activity.speakers.length)} জন</dd></div>
          </dl>
          <p className="mt-3 text-[12.5px] text-muted leading-relaxed">
            এগুলো সংসদের তথ্যভান্ডার থেকে প্রতি সিঙ্কে আসে এবং হাতে বদলানো হয় না। সংসদ নতুন কিছু প্রকাশ করলে পরের প্রকাশে সাইটে ওঠে।
          </p>
        </Panel>

        <Panel title="সর্বশেষ সিঙ্ক" action={<Link href="/admin/sync">সব সিঙ্ক →</Link>}>
          {lastRun ? (
            <dl className="flex flex-col text-[14px]">
              <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">সময়</dt><dd className="font-semibold">{when(lastRun.started_at)}</dd></div>
              <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">ফল</dt><dd className={lastRun.ok ? 'text-brand font-bold' : 'text-danger font-bold'}>{lastRun.ok ? 'সফল' : 'ব্যর্থ'}</dd></div>
              <div className="flex justify-between gap-3 py-2 border-b border-rulesoft"><dt className="text-muted">সদস্য / কমিটি</dt><dd className="font-semibold tnum">{bn(lastRun.members ?? 0)} / {bn(lastRun.committees ?? 0)}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">সম্পাদনা প্রয়োগ</dt><dd className="font-semibold tnum">{bn(lastRun.overrides_applied ?? 0)}</dd></div>
              {lastRun.message && <p className="text-[12.5px] text-muted border-t border-rulesoft pt-2 mt-1">{lastRun.message}</p>}
            </dl>
          ) : (
            <Empty>ডেটাবেস যুক্ত হওয়ার পর প্রথম প্রকাশে এখানে সিঙ্কের হিসাব আসবে।</Empty>
          )}
          <p className="mt-3 text-[12.5px] text-muted leading-relaxed">
            {bn(stale)}টি কমিটির সদস্য তালিকা সংসদের তথ্যভান্ডারে এখনো আগের সংসদের; সেগুলো সাইটে অপেক্ষমাণ হিসেবে দেখানো হয়।
          </p>
        </Panel>
      </div>

      <Panel title="কীভাবে পরিবর্তন সাইটে যায়">
        <ol className="flex flex-col gap-2 text-[14px] leading-relaxed text-inksoft list-decimal ps-5">
          <li>এখানে কোনো সদস্য, আসন, দল বা কমিটির তথ্য বদলালে, কিংবা সংবাদ প্রকাশ করলে তা ডেটাবেসে জমা হয়।</li>
          <li>উপরের <strong className="text-ink">সাইটে প্রকাশ করুন</strong> চাপলে সাইট নতুন করে তৈরি হয়: সংসদের তথ্যভান্ডার থেকে সর্বশেষ তথ্য আসে, তার উপর আপনার সম্পাদনা বসে, প্রকাশিত সংবাদ যুক্ত হয়।</li>
          <li>প্রতি রাতে এটি নিজে নিজেও একবার চলে, তাই সংসদের নতুন তথ্য দিন পার হওয়ার আগেই সাইটে আসে।</li>
        </ol>
        <p className="mt-3 text-[12.5px] text-muted">আপনার সম্পাদনা সংসদের তথ্যের উপরে থাকে; রাতের সিঙ্ক সেগুলো কখনো মুছে দেয় না।</p>
      </Panel>

      <Panel title="সাম্প্রতিক পরিবর্তন" action={<Link href="/admin/audit">পুরো ইতিহাস →</Link>} flush>
        {recent.length ? (
          <div className="px-0 pb-0">
            <Table head={['কখন', 'কে', 'কী', 'কোথায়']} minWidth={560}>
              {recent.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{when(r.created_at)}</Td>
                  <Td className="wrap-anywhere">{r.actor_email ?? '—'}</Td>
                  <Td><code className="text-[12.5px]">{r.action}</code></Td>
                  <Td className="text-muted wrap-anywhere">{[r.entity_type, r.entity_id, r.field].filter(Boolean).join(' · ')}</Td>
                </tr>
              ))}
            </Table>
          </div>
        ) : (
          <div className="px-5 pb-5"><Empty>এখনো কোনো পরিবর্তন করা হয়নি।</Empty></div>
        )}
      </Panel>
    </AdminPage>
  );
}
