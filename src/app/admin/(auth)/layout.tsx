import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { signOut } from '@/app/admin/actions';

const NAV = [
  { href: '/admin', label: 'ড্যাশবোর্ড' },
  { href: '/admin/members', label: 'সংসদ সদস্য' },
  { href: '/admin/news', label: 'সংবাদ' },
  { href: '/admin/corrections', label: 'সংশোধন অনুরোধ' },
  { href: '/admin/sync', label: 'সিঙ্ক ও প্রকাশ' },
  { href: '/admin/audit', label: 'পরিবর্তনের ইতিহাস' },
  { href: '/admin/users', label: 'ব্যবহারকারী', super: true },
];

/** Signed-in shell. requireAdmin() redirects anyone who is not an admin. */
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <div className="grow flex flex-col lg:flex-row">
      <aside className="lg:w-[240px] shrink-0 bg-[#14322a] text-[#e6efe9] flex flex-col">
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="serif text-[20px] font-extrabold text-white">আমার এমপি</Link>
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10.5px] font-bold tracking-[1px]">ADMIN</span>
        </div>
        <nav className="flex lg:flex-col gap-0.5 p-3 overflow-x-auto text-[14.5px] font-medium">
          {NAV.filter((n) => !n.super || me.role === 'super_admin').map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-2 rounded-lg whitespace-nowrap text-[#cfe0d7] hover:bg-white/10 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10 flex flex-col gap-3">
          <Link href="/" className="text-[13.5px] text-[#cfe0d7] hover:text-white">সাইট দেখুন ↗</Link>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex flex-col">
              <span className="text-[13px] font-semibold text-white truncate">{me.email}</span>
              <span className="text-[11.5px] text-[#9fb8ac]">{me.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 'সম্পাদক'}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="text-[12.5px] font-semibold text-[#cfe0d7] hover:text-white whitespace-nowrap">লগআউট</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="grow min-w-0">{children}</main>
    </div>
  );
}
