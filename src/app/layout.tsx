import type { Metadata } from 'next';
import { Hind_Siliguri, Noto_Serif_Bengali } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { meta, dateBn } from '@/lib/data';
import { siteUrl } from '@/lib/site';
import SiteSearch from '@/components/SiteSearch';

/* Bengali faces are large, so only the weights actually used are requested. */
const hind = Hind_Siliguri({
  variable: '--font-hind',
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const notoBn = Noto_Serif_Bengali({
  variable: '--font-noto-bn',
  subsets: ['bengali', 'latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  title: {
    default: 'আমার এমপি — বাংলাদেশের সংসদ সদস্যদের তথ্য',
    template: '%s · আমার এমপি',
  },
  description:
    'ত্রয়োদশ জাতীয় সংসদের ৩৪৯ জন সদস্য, ৩০০ আসন, দল ও সংসদীয় কমিটির তথ্য। সূত্র বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।',
  openGraph: { type: 'website', locale: 'bn_BD', siteName: 'আমার এমপি' },
};

const NAV = [
  { href: '/nirbachon', label: 'ত্রয়োদশ নির্বাচন' },
  { href: '/dol', label: 'দল' },
  { href: '/mp', label: 'সব এমপি' },
  { href: '/committee', label: 'কমিটি' },
  { href: '/parisonkhan', label: 'পরিসংখ্যান' },
  { href: '/songbad', label: 'সংবাদ' },
];

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="bn" className={`${hind.variable} ${notoBn.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header className="bg-surface border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-5">
            <div className="flex items-center gap-5 h-16">
              <Link href="/" className="flex items-baseline gap-2.5 shrink-0">
                <span className="serif text-[22px] sm:text-2xl font-extrabold text-brand">আমার এমপি</span>
                <span className="hidden sm:inline text-[11px] font-bold tracking-[2px] text-muted">MY MP</span>
              </Link>

              <nav aria-label="প্রধান" className="hidden lg:flex gap-[22px] grow text-[15px] font-medium">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-brand">
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="ms-auto lg:ms-0 shrink-0">
                <SiteSearch compact />
              </div>
            </div>

            <nav
              aria-label="প্রধান, ছোট পর্দা"
              className="lg:hidden flex gap-4 overflow-x-auto pb-3 -mt-1 text-[14px] font-medium"
            >
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="grow">{children}</main>

        <footer className="mt-16 bg-ink text-[#d9d6cc]">
          <div className="mx-auto max-w-[1200px] px-5 py-10 flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-8 md:gap-16">
              <div className="flex flex-col gap-3 max-w-[420px]">
                <span className="serif text-2xl font-extrabold text-surface">আমার এমপি</span>
                <p className="text-[15px] leading-relaxed text-[#b5b2a7]">
                  বাংলাদেশের সংসদ সদস্য ও আসনের উন্মুক্ত তথ্যভান্ডার। প্রতিটি তথ্যের সূত্র বাংলাদেশ
                  জাতীয় সংসদ ও নির্বাচন কমিশন।
                </p>
              </div>
              <div className="flex flex-col gap-2.5 text-[15px]">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="text-surface hover:underline">
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-2.5 text-[15px] md:ms-auto">
                <Link href="/somporke" className="text-surface hover:underline">সম্পর্কে</Link>
                <Link href="/jogajog" className="text-surface hover:underline">যোগাযোগ</Link>
                <Link href="/gopaniyota" className="text-surface hover:underline">গোপনীয়তা নীতি</Link>
              </div>
            </div>
            <div className="border-t border-[#3a3f3b] pt-5 flex flex-col sm:flex-row gap-2 justify-between text-[13px] text-[#8f8c82]">
              <span>© ২০২৬ আমার এমপি · mymp.bd</span>
              <span>তথ্য হালনাগাদ {dateBn(meta.syncedAt)}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
