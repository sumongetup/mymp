import type { Metadata } from 'next';
import { meta, bn, dateBn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { listSyncRuns } from '@/lib/admin/store';
import { AdminPage, Panel, Table, Td, Badge, Empty, when } from '@/app/admin/ui';
import PublishButton from '../PublishButton';

export const metadata: Metadata = { title: 'সিঙ্ক ও প্রকাশ' };

export default async function SyncAdmin() {
  await requireAdmin();
  const runs = await listSyncRuns(40);

  return (
    <AdminPage
      title="সিঙ্ক ও প্রকাশ"
      lede={`সাইট এখন যে তথ্য দেখাচ্ছে তা ${dateBn(meta.syncedAt)}-এ সংসদের তথ্যভান্ডার থেকে আনা। প্রতিটি প্রকাশে তা নতুন করে আনা হয়।`}
      actions={<PublishButton />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="প্রকাশ চাপলে কী হয়">
          <ol className="flex flex-col gap-2 text-[14px] leading-relaxed text-inksoft list-decimal ps-5">
            <li>parliament.gov.bd থেকে সব সদস্য ও কমিটি নতুন করে আনা হয়।</li>
            <li>আপনার হাতে-সম্পাদিত প্রতিটি ফিল্ড তার উপরে বসানো হয়, তাই সংসদের তথ্য বদলালেও আপনার সম্পাদনা থাকে।</li>
            <li>লুকানো সদস্য ও কমিটি বাদ পড়ে; প্রকাশিত সংবাদ যুক্ত হয়।</li>
            <li>সব পাতা নতুন করে তৈরি হয়ে mymp.bd-তে যায়। ২-৩ মিনিট লাগে।</li>
          </ol>
          <p className="mt-3 text-[13px] text-muted">সংসদের সার্ভার না পাওয়া গেলে আগের তথ্যই থাকে, সাইট ভাঙে না। নিচের তালিকায় সেটি “ব্যর্থ” হিসেবে লেখা থাকে।</p>
        </Panel>
        <Panel title="রাতের স্বয়ংক্রিয় সিঙ্ক">
          <p className="text-[14px] leading-relaxed text-inksoft">
            প্রতিদিন বাংলাদেশ সময় রাত ২টায় সাইট নিজে নিজে একবার প্রকাশ হয়, যাতে সংসদের নতুন তথ্য কারো
            মনে করার অপেক্ষায় না থাকে। কয়েক দিন পরপর “কিছুই বদলায়নি” দেখলে তা স্বাভাবিক; টানা ব্যর্থ দেখলে
            সংসদের সাইট বদলেছে কিনা দেখতে হবে।
          </p>
        </Panel>
      </div>

      <Panel title="সিঙ্কের ইতিহাস">
        {runs.length === 0 ? (
          <Empty>ডেটাবেস যুক্ত হওয়ার পর প্রথম প্রকাশ থেকে এখানে হিসাব জমা হবে।</Empty>
        ) : (
          <Table head={['কখন', 'ফল', 'সদস্য', 'কমিটি', 'সম্পাদনা প্রয়োগ', 'বার্তা']}>
            {runs.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{when(r.started_at)}</Td>
                <Td><Badge tone={r.ok ? 'good' : 'bad'}>{r.ok ? 'সফল' : 'ব্যর্থ'}</Badge></Td>
                <Td className="tnum">{r.members !== null ? bn(r.members) : '—'}</Td>
                <Td className="tnum">{r.committees !== null ? bn(r.committees) : '—'}</Td>
                <Td className="tnum">{r.overrides_applied !== null ? bn(r.overrides_applied) : '—'}</Td>
                <Td className="text-[13px] text-muted max-w-[320px] break-words">{r.message ?? ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
