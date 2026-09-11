import Link from 'next/link';
import { meta, dateBn } from '@/lib/data';
import { NAV, NAV_MORE } from '@/lib/nav';
import SiteSearch from '@/components/SiteSearch';
import Brand from '@/components/Brand';
import MobileNav from '@/components/MobileNav';
import HeaderClock from '@/components/HeaderClock';
import { siteUrl } from '@/lib/site';

/** Tells search engines who publishes the site and which image is its logo. */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'আমার এমপি',
  alternateName: 'mymp',
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
};

/** Public site shell. Reads no session, so every page beneath it can be prerendered. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand focus:text-white"
      >
        মূল বিষয়ে যান
      </a>

      {/* Today's date and time (Bangladesh), above the bar; it scrolls away and the bar stays. */}
      <div className="bg-[#10281f] text-[#cfdad3] text-[12.5px]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-5 h-7 flex items-center justify-end">
          <HeaderClock />
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-surface border-b border-rule shadow-card">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-5">
          <div className="flex items-center gap-3 lg:gap-6 h-[60px] lg:h-16">
            <Brand />

            <nav aria-label="প্রধান" className="hidden lg:flex items-center gap-0.5 grow text-[14.5px] font-semibold">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2.5 py-1.5 rounded-md text-inksoft hover:text-brand hover:bg-brandsoft transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ms-auto lg:ms-0 w-[128px] sm:w-auto sm:grow lg:grow-0 min-w-0 sm:max-w-[300px] flex justify-end">
              <SiteSearch compact />
            </div>

            <MobileNav items={NAV} more={NAV_MORE} />
          </div>
        </div>
      </header>

      <main id="main" className="grow">{children}</main>

      <footer className="mt-16 bg-[#10281f] text-[#cfdad3]">
        <div className="mx-auto max-w-[1200px] px-5 py-12 flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
            <div className="flex flex-col gap-4 max-w-[420px]">
              <Brand tone="light" />
              <p className="text-[14.5px] leading-relaxed text-[#a9b8b0]">
                বাংলাদেশের সংসদ সদস্য, আসন, কমিটি ও অধিবেশনের উন্মুক্ত তথ্যভান্ডার। প্রতিটি
                তথ্যের সূত্র বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন; কোনো তথ্য অনুমান করে বসানো হয় না।
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-[1.8px] text-white/45">বিভাগ</span>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2.5 text-[14.5px]">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="text-white hover:text-[#9fe0bf]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold tracking-[1.8px] text-white/45">আমার এমপি</span>
              <div className="flex flex-col gap-2.5 text-[14.5px]">
                {NAV_MORE.map((item) => (
                  <Link key={item.href} href={item.href} className="text-white hover:text-[#9fe0bf]">
                    {item.label}
                  </Link>
                ))}
                <a
                  href="https://www.parliament.gov.bd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#9fe0bf]"
                >
                  বাংলাদেশ জাতীয় সংসদ ↗
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row gap-2 justify-between text-[13px] text-[#8a9990]">
            <span>© ২০২৬ আমার এমপি · mymp.bd</span>
            <span>সংসদের তথ্যভান্ডার থেকে হালনাগাদ {dateBn(meta.syncedAt)}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
