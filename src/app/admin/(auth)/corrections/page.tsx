import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { listCorrections } from '@/lib/admin/store';
import { decideCorrection } from '@/app/admin/actions';
import { AdminPage, Panel, Badge, Empty, when } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'সংশোধন অনুরোধ' };

export default async function CorrectionsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status === 'accepted' || status === 'rejected' ? status : 'open';
  const rows = await listCorrections(filter);

  return (
    <AdminPage
      title="সংশোধন অনুরোধ"
      lede="সাইটের যোগাযোগ ফরম থেকে আসা রিপোর্ট। গ্রহণ করলে সংশ্লিষ্ট সদস্যের পাতায় গিয়ে তথ্যটি নিজে সম্পাদনা করুন; এখানে গ্রহণ করা মানে শুধু রিপোর্টটি বন্ধ করা।"
    >
      <div className="flex gap-2 flex-wrap">
        {[['open', 'খোলা'], ['accepted', 'গৃহীত'], ['rejected', 'বাতিল']].map(([v, l]) => (
          <Link key={v} href={`/admin/corrections?status=${v}`}
            className={`px-3.5 h-9 inline-flex items-center rounded-full text-[13.5px] font-medium border ${filter === v ? 'bg-brand text-white border-brand' : 'bg-surface border-rule'}`}>
            {l}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>{filter === 'open' ? 'কোনো খোলা রিপোর্ট নেই। সাইটের যোগাযোগ ফরম চালু হলে রিপোর্ট এখানে আসবে।' : 'এই তালিকায় কিছু নেই।'}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Panel key={r.id}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span>{when(r.created_at)}</span>
                  <span>·</span>
                  <Link href={r.page_path} className="text-brand font-semibold hover:underline">{r.page_path}</Link>
                  {r.reporter_name && <><span>·</span><span>{r.reporter_name}</span></>}
                  {r.reporter_email && <span className="text-muted">({r.reporter_email})</span>}
                  <Badge tone={r.status === 'open' ? 'warn' : r.status === 'accepted' ? 'good' : 'bad'}>
                    {r.status === 'open' ? 'খোলা' : r.status === 'accepted' ? 'গৃহীত' : 'বাতিল'}
                  </Badge>
                </div>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{r.message}</p>
                {r.resolution_note && <p className="text-[13.5px] text-inksoft border-t border-rule pt-2">সিদ্ধান্ত: {r.resolution_note}</p>}
                {r.status === 'open' && (
                  <form action={decideCorrection} className="flex flex-col sm:flex-row gap-2 border-t border-rule pt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="note" placeholder="সিদ্ধান্তের নোট (ঐচ্ছিক)" className="grow rounded-lg border border-rule bg-paper px-3.5 h-10 text-[14px] outline-none focus:border-brand" />
                    <button type="submit" name="status" value="accepted" className="h-10 px-4 rounded-lg bg-brand text-white font-semibold text-[13.5px]">গ্রহণ</button>
                    <button type="submit" name="status" value="rejected" className="h-10 px-4 rounded-lg bg-[#fbe9ea] text-[#a8323d] border border-[#f0c9cc] font-semibold text-[13.5px]">বাতিল</button>
                  </form>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
