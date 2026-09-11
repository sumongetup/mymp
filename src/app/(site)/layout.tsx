import Link from 'next/link';
import { meta, dateBn, publishedNews } from '@/lib/data';
import { NAV, NAV_MORE } from '@/lib/nav';
import SiteSearch from '@/components/SiteSearch';
import Brand from '@/components/Brand';
import MobileNav from '@/components/MobileNav';
import HeaderClock from '@/components/HeaderClock';
import Intro from '@/components/Intro';
import NewsTicker from '@/components/NewsTicker';
import Icon from '@/components/Icon';
import BrandIcon from '@/components/BrandIcon';
import { siteUrl, SITE_EMAIL, SITE_FACEBOOK } from '@/lib/site';

/** Tells search engines who publishes the site, which image is its logo, and its own page and address. */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'আমার এমপি',
  alternateName: 'mymp',
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
  email: SITE_EMAIL,
  sameAs: [SITE_FACEBOOK],
};

/** Public site shell. Reads no session, so every page beneath it can be prerendered. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // The ticker starts from this build's headlines and then asks for newer ones itself.
  const headlines = publishedNews()
    .slice(0, 12)
    .map(({ id, titleBn, sourceName, sourceUrl }) => ({ id, titleBn, sourceName, sourceUrl }));

  return (
    <>
      <Intro />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand focus:text-white"
      >
        মূল বিষয়ে যান
      </a>

      {/* Today's date and time (Bangladesh), above the bar; it scrolls away and the bar stays.
          Centred on a phone, where a lone line at one edge looked lost. */}
      <div className="bg-[#10281f] text-[#cfdad3] text-[12.5px]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-5 h-7 flex items-center justify-center sm:justify-end gap-2">
          <span className="live-dot text-logo" aria-hidden="true" />
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

      <NewsTicker initial={headlines} />

      <main id="main" className="grow">{children}</main>

      {/* How the site works, in three lines, above the footer (owner, 2026-09-12). */}
      <section aria-label="তথ্যের সূত্র ও হালনাগাদ" className="mt-16 border-t border-rule bg-sunk/60">
        <div className="mx-auto max-w-[1200px] px-5 py-9 grid grid-cols-1 md:grid-cols-3 gap-7 md:gap-10">
          <div className="flex flex-col gap-1.5">
            <h2 className="display text-[16.5px] font-bold">কোথা থেকে তথ্য আসে</h2>
            <p className="text-[14px] leading-relaxed text-inksoft">
              বাংলাদেশ জাতীয় সংসদের ওয়েবসাইট ও সংসদ সচিবালয়ের প্রজ্ঞাপন, নির্বাচন কমিশনের প্রকাশিত তথ্য; ভোটের ফল ও দলের
              ইতিহাসের মতো বাকি তথ্যের সূত্র প্রতিটি পাতায় লেখা। কোনো তথ্য অনুমান করে বসানো হয় না।
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="display text-[16.5px] font-bold">কত দিন পরপর হালনাগাদ</h2>
            <p className="text-[14px] leading-relaxed text-inksoft">
              প্রতিদিন। সংসদের নতুন প্রজ্ঞাপন, বৈঠকের কার্যসূচি ও কমিটির পরিবর্তন প্রকাশের পরদিনের মধ্যে যুক্ত হয়; সংবাদ
              শিরোনাম আরও ঘন ঘন।
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="display text-[16.5px] font-bold">ভুল পেলে</h2>
            <p className="text-[14px] leading-relaxed text-inksoft">
              প্রতিটি সদস্যের পাতায় “সংশোধন জানান” বোতাম আছে। সূত্রসহ জানালে ২৪ ঘণ্টার মধ্যে যাচাই করে ঠিক করা হয়।
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#10281f] text-[#cfdad3] border-t-[3px] border-transparent [border-image:linear-gradient(90deg,var(--color-brand),var(--color-logo),var(--color-brand))_1]">
        <div className="mx-auto max-w-[1200px] px-5 py-12 flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
            <div className="flex flex-col gap-4 max-w-[420px]">
              <Brand tone="light" />
              <p className="text-[14.5px] leading-relaxed text-[#a9b8b0]">
                বাংলাদেশের সংসদ সদস্য, আসন, কমিটি ও অধিবেশনের উন্মুক্ত তথ্যভান্ডার। প্রতিটি পাতায় তথ্যের
                সূত্র লেখা থাকে; কোনো তথ্য অনুমান করে বসানো হয় না।
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <a
                  href={SITE_FACEBOOK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[14px] font-semibold hover:bg-white/20 transition-colors"
                >
                  <BrandIcon name="facebook" size={17} color="#ffffff" />
                  ফেসবুক পেজ
                </a>
                <a
                  href={`mailto:${SITE_EMAIL}`}
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[14px] font-semibold hover:bg-white/20 transition-colors"
                >
                  <Icon name="mail" size={16} />
                  {SITE_EMAIL}
                </a>
              </div>
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
