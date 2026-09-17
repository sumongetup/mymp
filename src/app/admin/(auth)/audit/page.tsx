import type { Metadata } from 'next';
import Link from 'next/link';
import { bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { searchAudit } from '@/lib/admin/store';
import { AdminPage, Table, Td, Empty, when } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'পরিবর্তনের ইতিহাস' };

const PAGE = 100;

export default async function AuditAdmin({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; type?: string; actor?: string; action?: string; page?: string }>;
}) {
  await requireAdmin();
  const { entity = '', type = '', actor = '', action = '', page = '1' } = await searchParams;
  const pageNo = Math.max(1, Number.parseInt(page, 10) || 1);
  // The filters run in the database: an entity edited months ago is found however many changes came after.
  const { rows, total } = await searchAudit({ entity, type, actor, action, from: (pageNo - 1) * PAGE, limit: PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const params = new URLSearchParams({ ...(entity ? { entity } : {}), ...(type ? { type } : {}), ...(actor ? { actor } : {}), ...(action ? { action } : {}), ...(p > 1 ? { page: String(p) } : {}) });
    return `/admin/audit${params.size ? `?${params}` : ''}`;
  };

  return (
    <AdminPage
      title="পরিবর্তনের ইতিহাস"
      lede={entity ? `শুধু ${entity} সংক্রান্ত পরিবর্তন। কে, কখন, কী বদলেছেন আর আগের মান কী ছিল।` : 'কে, কখন, কী বদলেছেন আর আগের মান কী ছিল। এই তালিকা কখনো মোছা হয় না।'}
    >
      <form className="flex flex-wrap gap-2">
        <input name="entity" defaultValue={entity} placeholder="আইডি (যেমন 013000101)" className="h-11 min-w-0 basis-[180px] grow rounded-lg border border-rule bg-surface px-3 text-[14.5px]" />
        <select name="type" defaultValue={type} className="h-11 rounded-lg border border-rule bg-surface px-3 text-[14.5px]">
          <option value="">সব ধরন</option>
          <option value="member">সদস্য</option>
          <option value="seat">আসন</option>
          <option value="party">দল</option>
          <option value="committee">কমিটি</option>
          <option value="news">সংবাদ</option>
          <option value="feed_item">ফিড</option>
          <option value="correction">সংশোধন</option>
          <option value="admin_user">ব্যবহারকারী</option>
        </select>
        <input name="actor" defaultValue={actor} placeholder="কে (ইমেইলের অংশ)" className="h-11 min-w-0 basis-[160px] grow rounded-lg border border-rule bg-surface px-3 text-[14.5px]" />
        <input name="action" defaultValue={action} placeholder="কাজ (যেমন override)" className="h-11 min-w-0 basis-[140px] grow rounded-lg border border-rule bg-surface px-3 text-[14.5px]" />
        <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">খুঁজুন</button>
        {(entity || type || actor || action) && (
          <Link href="/admin/audit" className="h-11 px-4 inline-flex items-center rounded-lg border border-rule text-[14px] font-semibold hover:border-ink">সব দেখান</Link>
        )}
      </form>

      {rows.length === 0 ? (
        <Empty>এই খোঁজে কোনো পরিবর্তন পাওয়া যায়নি।</Empty>
      ) : (
        <>
          <p className="text-[13px] text-muted">মোট {bn(total)}টি পরিবর্তন{pages > 1 ? `, পাতা ${bn(pageNo)} / ${bn(pages)}` : ''}</p>
          <Table head={['কখন', 'কে', 'কাজ', 'কোথায়', 'আগে', 'পরে']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{when(r.created_at)}</Td>
                <Td className="whitespace-nowrap">{r.actor_email ?? 'নেই'}</Td>
                <Td><code className="text-[12.5px]">{r.action}</code></Td>
                <Td className="text-[13px] text-muted">{[r.entity_type, r.entity_id, r.field].filter(Boolean).join(', ')}</Td>
                <Td className="text-[13px] max-w-[220px] break-words"><span className="line-clamp-4">{r.old_value ?? 'নেই'}</span></Td>
                <Td className="text-[13px] max-w-[220px] break-words"><span className="line-clamp-4">{r.new_value ?? 'নেই'}</span></Td>
              </tr>
            ))}
          </Table>
          {pages > 1 && (
            <div className="flex items-center gap-2 text-[14px]">
              {pageNo > 1 && <Link href={link(pageNo - 1)} className="h-10 px-4 inline-flex items-center rounded-lg border border-rule font-semibold hover:border-ink">← আগের</Link>}
              {pageNo < pages && <Link href={link(pageNo + 1)} className="h-10 px-4 inline-flex items-center rounded-lg border border-rule font-semibold hover:border-ink">পরের →</Link>}
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
}
