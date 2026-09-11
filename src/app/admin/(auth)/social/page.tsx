import { AdminPage, Notice, Panel, Stat } from '@/app/admin/ui';
import { allMembers, bn } from '@/lib/data';
import { SOCIAL_KEYS } from '@/lib/admin/social-import';
import SocialImportForm from './SocialImportForm';

const linksOf = (m: (typeof allMembers)[number]) =>
  SOCIAL_KEYS.filter((k) => !!(m as unknown as Record<string, string | null>)[k]);

export default function SocialPage() {
  const sitting = allMembers.filter((m) => !m.resignedOn);
  const withAny = sitting.filter((m) => linksOf(m).length > 0);
  const missing = sitting.filter((m) => linksOf(m).length === 0).sort((a, b) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999));
  const template = missing.map((m) => `${m.seat?.nameBn ?? m.nameBn} (${m.nameBn ?? m.nameEn}) | `).join('\n');

  return (
    <AdminPage
      title="সোশ্যাল মিডিয়া লিংক"
      lede="অনেক সংসদ সদস্যের অফিসিয়াল Facebook, X, YouTube, Instagram ও ওয়েবসাইট একসঙ্গে যোগ করুন। কোন লিংক কোন মাধ্যমের, তা ঠিকানা দেখেই চেনা হয়।"
      crumbs={[{ href: '/admin', label: 'ড্যাশবোর্ড' }, { label: 'সোশ্যাল লিংক' }]}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Stat label="অন্তত একটি লিংক আছে" value={bn(withAny.length)} hint={`${bn(sitting.length)} জন সদস্যের মধ্যে · সর্বশেষ প্রকাশ অনুযায়ী`} icon="globe" tone="good" />
        <Stat label="কোনো লিংক নেই" value={bn(missing.length)} icon="users" tone="warn" />
      </div>
      <Notice tone="warn">
        শুধু সদস্যের নিজের অফিসিয়াল পেজ বা অ্যাকাউন্ট দিন, ফ্যান পেজ বা দলের পেজ নয়। যাচাইয়ের উপায়: যাচাইকৃত ব্যাজ, সদস্যের নিজের ওয়েবসাইট বা দলের ওয়েবসাইটে দেওয়া লিংক, অথবা সদস্যের দপ্তরের নিশ্চিত করা ঠিকানা।
      </Notice>
      <Panel>
        <SocialImportForm template={template} />
      </Panel>
    </AdminPage>
  );
}
