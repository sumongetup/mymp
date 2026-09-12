import { requireAdmin } from '@/lib/admin/auth';
import { signOut } from '@/app/admin/actions';
import AdminNav, { type NavGroup } from './AdminNav';
import FormGuard from './FormGuard';

const GROUPS: { label: string; items: (NavGroup['items'][number] & { super?: boolean })[] }[] = [
  {
    label: 'তথ্য',
    items: [
      { href: '/admin', label: 'ড্যাশবোর্ড', icon: 'grid' },
      { href: '/admin/members', label: 'সংসদ সদস্য', icon: 'users' },
      { href: '/admin/seats', label: 'আসন', icon: 'pin' },
      { href: '/admin/parties', label: 'দল', icon: 'flag' },
      { href: '/admin/committees', label: 'কমিটি', icon: 'layers' },
      { href: '/admin/social', label: 'সোশ্যাল লিংক', icon: 'globe' },
    ],
  },
  {
    label: 'প্রকাশনা',
    items: [
      { href: '/admin/news', label: 'সংবাদ', icon: 'file' },
      { href: '/admin/feed', label: 'সংবাদ ফিড', icon: 'layers' },
      { href: '/admin/feed/review', label: 'ফিড যাচাই', icon: 'check' },
      { href: '/admin/feed/runs', label: 'ফিড সংগ্রহ', icon: 'history' },
      { href: '/admin/corrections', label: 'সংশোধন অনুরোধ', icon: 'message' },
      { href: '/admin/results', label: 'নির্বাচনের ফল', icon: 'chart' },
      { href: '/admin/sync', label: 'সিঙ্ক ও প্রকাশ', icon: 'refresh' },
    ],
  },
  {
    label: 'ব্যবস্থা',
    items: [
      { href: '/admin/audit', label: 'পরিবর্তনের ইতিহাস', icon: 'clock' },
      { href: '/admin/users', label: 'ব্যবহারকারী', icon: 'userplus', super: true },
      { href: '/admin/password', label: 'পাসওয়ার্ড', icon: 'key' },
    ],
  },
];

/** Signed-in shell. requireAdmin() redirects anyone who is not an admin. */
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const groups: NavGroup[] = GROUPS.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => !i.super || me.role === 'super_admin')
      .map(({ href, label, icon }) => ({ href, label, icon })),
  }));

  const account = (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex flex-col">
        <span className="text-[13px] font-semibold text-white truncate">{me.email}</span>
        <span className="text-[11.5px] text-[#9fb8ac]">{me.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 'সম্পাদক'}</span>
      </span>
      <form action={signOut}>
        <button type="submit" className="text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 whitespace-nowrap">
          লগআউট
        </button>
      </form>
    </div>
  );

  return (
    <div className="grow flex flex-col lg:flex-row">
      <FormGuard />
      <AdminNav groups={groups} account={account} />
      <main className="grow min-w-0">{children}</main>
    </div>
  );
}
