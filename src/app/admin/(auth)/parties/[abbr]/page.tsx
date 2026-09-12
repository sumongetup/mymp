import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parties, membersOfParty, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { overridesFor } from '@/lib/admin/store';
import { PARTY_PROFILES, PROFILE_KEYS } from '@/lib/partyProfiles';
import { AdminPage, Panel, Button } from '@/app/admin/ui';
import { EntityEditor, EditFlags, AuditLink } from '../../EntityEditor';

export async function generateMetadata({ params }: { params: Promise<{ abbr: string }> }): Promise<Metadata> {
  const { abbr } = await params;
  const p = parties.find((x) => x.abbr === abbr);
  return { title: p ? `${p.nameBn ?? p.abbr} | দল` : 'দল' };
}

export default async function EditParty({
  params,
  searchParams,
}: {
  params: Promise<{ abbr: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { abbr } = await params;
  const flags = await searchParams;
  const party = parties.find((p) => p.abbr === abbr);
  if (!party) notFound();

  const overrides = await overridesFor('party', abbr);
  const sourced = PARTY_PROFILES[abbr];
  const snapshot: Record<string, string | null | undefined> = {
    ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, sourced?.[k] ?? null])),
    ...(party as unknown as Record<string, string | null | undefined>),
  };
  const list = membersOfParty(abbr);

  return (
    <AdminPage
      title={party.nameBn ?? party.abbr}
      lede={`${party.nameEn ?? ''}, ${bn(party.seats)}টি আসন`}
      actions={<Button kind="secondary" href={`/dol/${party.slug}`}>সাইটে দেখুন ↗</Button>}
    >
      <EditFlags flags={flags} noun="দলটি" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <EntityEditor
          type="party"
          id={abbr}
          snapshot={snapshot}
          overrides={overrides}
          backHref="/admin/parties"
        />

        <div className="flex flex-col gap-4">
          <Panel title="সংসদের তথ্যভান্ডার থেকে">
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-muted">সংক্ষেপ</dt><dd>{party.abbr}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">মোট আসন</dt><dd className="tnum">{bn(party.seats)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">নির্বাচিত</dt><dd className="tnum">{bn(party.seatsTerritorial)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">সংরক্ষিত</dt><dd className="tnum">{bn(party.seatsReserved)}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] text-muted">
              আসনসংখ্যা গোনা হয় কোন সদস্য কোন দলে আছেন তা থেকে, তাই এখানে বদলানো যায় না।
            </p>
          </Panel>
          <Panel title={`সদস্য (${bn(list.length)})`}>
            <ul className="flex flex-col gap-1.5 text-[13.5px] max-h-[280px] overflow-y-auto">
              {list.slice(0, 60).map((m) => (
                <li key={m.id} className="flex justify-between gap-3">
                  <span className="truncate">{m.nameBn}</span>
                  <span className="text-muted shrink-0">{m.seat?.nameBn}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <AuditLink id={abbr} />
        </div>
      </div>
    </AdminPage>
  );
}
