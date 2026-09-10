'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import { Mark } from '@/components/Brand';

export interface NavGroup {
  label: string;
  items: { href: string; label: string; icon: string }[];
}

/**
 * Admin navigation: a fixed sidebar from lg up, a top bar with a slide-in sheet
 * below it. `account` is rendered on the server (it holds the sign-out action)
 * and dropped into both.
 */
export default function AdminNav({ groups, account }: { groups: NavGroup[]; account: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const list = (
    <nav className="flex flex-col gap-5 px-3 py-4 text-[14px]">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          <span className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[1.6px] text-white/40">{g.label}</span>
          {g.items.map((it) => {
            const on = active(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  on ? 'bg-white/12 text-white shadow-[inset_3px_0_0_0_#7fd3ac]' : 'text-[#c6d6cd] hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon name={it.icon} size={17} className={on ? 'text-[#9fe0bf]' : 'text-white/45'} />
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const head = (
    <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
      <Mark size={26} tone="light" />
      <span className="flex flex-col leading-none gap-[3px]">
        <span className="display text-[17px] text-white">আমার এমপি</span>
        <span className="text-[9.5px] font-bold tracking-[2px] text-white/50">ADMIN</span>
      </span>
    </Link>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col w-[250px] shrink-0 sticky top-0 h-screen bg-[#10281f] text-[#e4ece7]">
        <div className="px-5 h-16 flex items-center border-b border-white/10">{head}</div>
        <div className="grow overflow-y-auto">{list}</div>
        <div className="border-t border-white/10 p-4 flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2 text-[13px] text-[#c6d6cd] hover:text-white">
            <Icon name="external" size={15} /> সাইট দেখুন
          </Link>
          {account}
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-[#10281f] text-white">
        {head}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20"
        >
          <Icon name={open ? 'x' : 'menu'} size={20} />
          <span className="sr-only">মেনু</span>
        </button>
      </div>
      {open && (
        <div id="admin-nav" className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-[#10281f] text-[#e4ece7] overflow-y-auto flex flex-col">
          <div className="grow">{list}</div>
          <div className="border-t border-white/10 p-4 flex flex-col gap-3">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 text-[13px] text-[#c6d6cd]">
              <Icon name="external" size={15} /> সাইট দেখুন
            </Link>
            {account}
          </div>
        </div>
      )}
    </>
  );
}
