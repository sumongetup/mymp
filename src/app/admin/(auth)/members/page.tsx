import type { Metadata } from 'next';
import Link from 'next/link';
import { allMembers as members, bn } from '@/lib/data';
import { normalise } from '@/lib/search';
import { requireAdmin } from '@/lib/admin/auth';
import { hiddenList, overrideCounts, editedIds } from '@/lib/admin/store';
import { memberCoverage, membersWithBio } from '@/lib/admin/health';
import { allQuestions, questionStates } from '@/lib/admin/questions';
import { AdminPage, Table, Td, Badge, Empty, when } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'সংসদ সদস্য' };

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'সবাই' },
  { key: 'nobio', label: 'জীবনী নেই' },
  { key: 'nonews', label: 'কোনো খবর নেই' },
  { key: 'novideo', label: 'কোনো ভিডিও নেই' },
  { key: 'questions', label: 'খোলা প্রশ্ন আছে' },
  { key: 'edited', label: 'হাতে সম্পাদিত' },
  { key: 'hidden', label: 'লুকানো' },
];

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  await requireAdmin();
  const { q = '', filter = '' } = await searchParams;

  const [hidden, oc, edited, coverage, withBio, states] = await Promise.all([
    hiddenList(),
    overrideCounts(),
    editedIds('member'),
    memberCoverage(),
    membersWithBio(),
    questionStates(),
  ]);
  const hiddenIds = new Set(hidden.filter((h) => h.entity_type === 'member').map((h) => h.entity_id));
  const hiddenOnly = hidden.filter((h) => h.entity_type === 'member' && !members.some((m) => m.id === h.entity_id));
  const openQuestions = new Map<string, number>();
  for (const x of allQuestions()) if (!states.get(x.id)?.resolved) openQuestions.set(x.memberId, (openQuestions.get(x.memberId) ?? 0) + 1);

  const test: Record<string, (id: string) => boolean> = {
    nobio: (id) => !withBio.has(id),
    nonews: (id) => !coverage[id]?.news,
    novideo: (id) => !coverage[id]?.video,
    questions: (id) => (openQuestions.get(id) ?? 0) > 0,
    edited: (id) => edited.has(id),
    hidden: (id) => hiddenIds.has(id),
  };
  // Counts on the filter chips are for sitting members; a resigned member still appears in "সবাই".
  const sitting = members.filter((m) => !m.resignedOn);
  const counted = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === 'hidden' ? hiddenIds.size : f.key ? sitting.filter((m) => test[f.key]!(m.id)).length : members.length]));

  const words = normalise(q).split(' ').filter(Boolean);
  const list = (filter && test[filter] ? sitting.filter((m) => test[filter]!(m.id)) : members)
    .filter((m) => {
      if (!words.length) return true;
      const key = [m.nameBn, m.nameEn, m.seat?.nameBn, m.seat?.nameEn, m.party?.abbr].map((s) => normalise(s ?? '')).join(' ');
      return words.every((w) => key.includes(w));
    })
    .sort((a, b) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999));

  const href = (f: string) => {
    const p = new URLSearchParams({ ...(f ? { filter: f } : {}), ...(q ? { q } : {}) });
    return `/admin/members${p.size ? `?${p}` : ''}`;
  };

  return (
    <AdminPage
      title="সংসদ সদস্য"
      lede={`${bn(members.length)} জন সদস্য সংসদের তথ্যভান্ডার থেকে। ${bn(oc.member)}টি ফিল্ড হাতে সম্পাদিত, ${bn(hiddenIds.size)} জন সাইট থেকে লুকানো। খবর ও ভিডিওর সংখ্যা দশ মিনিট পরপর হালনাগাদ হয়।`}
    >
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Link
              key={f.key || 'all'}
              href={href(f.key)}
              aria-current={on ? 'page' : undefined}
              className={`px-3.5 h-9 inline-flex items-center rounded-full text-[13.5px] font-semibold border ${on ? 'bg-ink text-white border-ink' : 'bg-surface border-rule hover:border-ink'}`}
            >
              {f.label} <span className={`ms-1.5 tnum ${on ? 'text-white/70' : 'text-muted'}`}>{bn(counted[f.key] ?? 0)}</span>
            </Link>
          );
        })}
      </div>

      <form className="flex gap-2 max-w-[520px]">
        {filter && <input type="hidden" name="filter" value={filter} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="নাম বা আসন, বাংলা বা ইংরেজি"
          className="grow min-w-0 rounded-lg border border-rule bg-surface px-3.5 h-11 text-[15px] focus:border-brand outline-none"
        />
        <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">খুঁজুন</button>
      </form>

      {/* A hidden member is left out of the published list, so they are listed here by id to be brought back. */}
      {filter === 'hidden' && hiddenOnly.length > 0 && (
        <Table head={['আইডি', 'কবে সরানো', 'কারণ', '']} minWidth={560}>
          {hiddenOnly.map((h) => (
            <tr key={h.entity_id}>
              <Td className="tnum">{h.entity_id}</Td>
              <Td className="whitespace-nowrap text-muted">{when(h.hidden_at)}</Td>
              <Td>{h.reason ?? 'নেই'}</Td>
              <Td className="text-end whitespace-nowrap">
                <Link href={`/admin/members/${h.entity_id}`} className="font-semibold text-brand hover:underline">আবার দেখান →</Link>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {list.length === 0 ? (
        filter === 'hidden' && hiddenOnly.length ? null : <Empty>কিছু পাওয়া যায়নি।</Empty>
      ) : (
        <>
          <p className="text-[13px] text-muted">{bn(list.length)} জন</p>
          <Table head={['আসন', 'নাম', 'দল', 'খবর', 'ভিডিও', 'অবস্থা', '']} minWidth={780}>
            {list.map((m) => {
              const cov = coverage[m.id] ?? { news: 0, video: 0 };
              const openQ = openQuestions.get(m.id) ?? 0;
              return (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap">{m.seat?.nameBn ?? 'নেই'}</Td>
                  <Td>
                    <span className="display font-bold">{m.nameBn}</span>
                    <span className="block text-[12.5px] text-muted">{m.nameEn}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{m.party?.abbr ?? 'নেই'}</Td>
                  <Td className={`tnum ${cov.news ? '' : 'text-danger font-semibold'}`}>
                    <Link href={`/admin/feed?mp=${m.id}`} className="hover:underline">{bn(cov.news)}</Link>
                  </Td>
                  <Td className={`tnum ${cov.video ? '' : 'text-danger font-semibold'}`}>{bn(cov.video)}</Td>
                  <Td>
                    <span className="flex gap-1.5 flex-wrap">
                      {withBio.has(m.id) ? <Badge tone="good">জীবনী আছে</Badge> : <Badge tone="warn">জীবনী নেই</Badge>}
                      {openQ > 0 && <Badge tone="warn">{bn(openQ)}টি প্রশ্ন</Badge>}
                      {edited.has(m.id) && <Badge tone="good">সম্পাদিত</Badge>}
                      {hiddenIds.has(m.id) && <Badge tone="bad">লুকানো</Badge>}
                      {m.resignedOn && <Badge tone="bad">পদত্যাগ</Badge>}
                      {m.seat?.reserved && <Badge>সংরক্ষিত</Badge>}
                    </span>
                  </Td>
                  <Td className="text-end whitespace-nowrap">
                    <Link href={`/admin/members/${m.id}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </>
      )}
    </AdminPage>
  );
}
