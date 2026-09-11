import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { listAudit } from '@/lib/admin/store';
import { AdminPage, Table, Td, Empty, when } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'পরিবর্তনের ইতিহাস' };

export default async function AuditAdmin({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  await requireAdmin();
  const { entity } = await searchParams;
  const all = await listAudit(300);
  const rows = entity ? all.filter((r) => r.entity_id === entity) : all;

  return (
    <AdminPage
      title="পরিবর্তনের ইতিহাস"
      lede={entity ? `শুধু ${entity} সংক্রান্ত পরিবর্তন। কে, কখন, কী বদলেছেন আর আগের মান কী ছিল।` : 'কে, কখন, কী বদলেছেন আর আগের মান কী ছিল। এই তালিকা কখনো মোছা হয় না।'}
    >
      {rows.length === 0 ? (
        <Empty>এখনো কোনো পরিবর্তন লেখা হয়নি।</Empty>
      ) : (
        <Table head={['কখন', 'কে', 'কাজ', 'কোথায়', 'আগে', 'পরে']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-muted">{when(r.created_at)}</Td>
              <Td className="whitespace-nowrap">{r.actor_email ?? '—'}</Td>
              <Td><code className="text-[12.5px]">{r.action}</code></Td>
              <Td className="text-[13px] text-muted">{[r.entity_type, r.entity_id, r.field].filter(Boolean).join(' · ')}</Td>
              <Td className="text-[13px] max-w-[220px] break-words">{r.old_value ?? '—'}</Td>
              <Td className="text-[13px] max-w-[220px] break-words">{r.new_value ?? '—'}</Td>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
