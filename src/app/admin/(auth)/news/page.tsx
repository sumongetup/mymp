import Link from 'next/link';
import { getMemberById, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { listNews } from '@/lib/admin/store';
import { AdminPage, Table, Td, Badge, Button, Empty } from '@/app/admin/ui';

const STATUS_BN = { draft: 'খসড়া', published: 'প্রকাশিত', rejected: 'বাতিল' } as const;
const TONE = { draft: 'warn', published: 'good', rejected: 'bad' } as const;

export default async function NewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status === 'draft' || status === 'published' || status === 'rejected' ? status : undefined;
  const rows = await listNews(filter);

  return (
    <AdminPage
      title="সংবাদ"
      lede="শুধু শিরোনাম, সংবাদমাধ্যমের নাম, তারিখ ও মূল লিংক। পুরো সংবাদ কখনো কপি করা হয় না। প্রকাশ করলে পরের সাইট-প্রকাশে যুক্ত হয়।"
      actions={<Button href="/admin/news/new">নতুন সংবাদ</Button>}
    >
      <div className="flex gap-2 flex-wrap">
        {[['', 'সব'], ['draft', 'খসড়া'], ['published', 'প্রকাশিত'], ['rejected', 'বাতিল']].map(([v, l]) => (
          <Link
            key={v}
            href={v ? `/admin/news?status=${v}` : '/admin/news'}
            className={`px-3.5 h-9 inline-flex items-center rounded-full text-[13.5px] font-medium border ${
              (filter ?? '') === v ? 'bg-brand text-white border-brand' : 'bg-surface border-rule'
            }`}
          >
            {l}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>এই তালিকায় কোনো সংবাদ নেই।</Empty>
      ) : (
        <Table head={['তারিখ', 'শিরোনাম', 'সংশ্লিষ্ট', 'অবস্থা', '']}>
          {rows.map((n) => {
            const member = n.member_id ? getMemberById(n.member_id) : null;
            return (
              <tr key={n.id}>
                <Td className="whitespace-nowrap tnum text-muted">{n.published_on}</Td>
                <Td>
                  <span className="display font-bold">{n.title_bn}</span>
                  <span className="block text-[12.5px] text-muted">{n.source_name}</span>
                </Td>
                <Td className="text-[13px]">{member?.nameBn ?? n.seat_slug ?? '—'}</Td>
                <Td><Badge tone={TONE[n.status]}>{STATUS_BN[n.status]}</Badge></Td>
                <Td className="text-end whitespace-nowrap">
                  <Link href={`/admin/news/${n.id}`} className="font-semibold text-brand hover:underline">খুলুন →</Link>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="text-[13px] text-muted">{bn(rows.length)}টি দেখানো হচ্ছে।</p>
    </AdminPage>
  );
}
