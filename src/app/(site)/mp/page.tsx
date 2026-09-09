import type { Metadata } from 'next';
import { members, parties, bn, statistics } from '@/lib/data';
import { Page, PageHead, Stat } from '@/components/ui';
import MemberFilter from '@/components/MemberFilter';

export const metadata: Metadata = {
  alternates: { canonical: '/mp' },
  title: 'সব সংসদ সদস্য',
  description: 'ত্রয়োদশ জাতীয় সংসদের সব সদস্যের তালিকা, দল ও আসনসহ।',
};

export default function AllMps() {
  const stats = statistics();
  const sorted = [...members].sort((a, b) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999));

  return (
    <Page>
      <PageHead
        eyebrow="ত্রয়োদশ জাতীয় সংসদ"
        title="সব সংসদ সদস্য"
        lede={`${bn(stats.total)} জন সদস্য। ${bn(stats.territorial)} জন আসন থেকে নির্বাচিত, ${bn(stats.reserved)} জন সংরক্ষিত নারী আসনে।`}
        aside={
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <Stat label="মোট সদস্য" value={bn(stats.total)} />
            <Stat label="নারী সদস্য" value={bn(stats.women)} />
          </div>
        }
      />

      <div className="py-8">
        <MemberFilter
          members={sorted.map((m) => ({
            id: m.id,
            slug: m.slug,
            nameBn: m.nameBn,
            nameEn: m.nameEn,
            photoUrl: m.photoUrl,
            party: m.party?.abbr ?? null,
            partyBn: m.party?.nameBn ?? null,
            seatBn: m.seat?.nameBn ?? null,
            seatNo: m.seat?.no ?? null,
            reserved: !!m.seat?.reserved,
            gender: m.gender,
          }))}
          parties={parties.map((p) => ({ abbr: p.abbr, label: p.nameBn ?? p.abbr, seats: p.seats }))}
        />
      </div>
    </Page>
  );
}
