import Link from 'next/link';
import { publishedNews } from '@/lib/data';
import { NAV, NAV_MORE } from '@/lib/nav';
import SiteSearch from '@/components/SiteSearch';
import Brand from '@/components/Brand';
import MobileNav from '@/components/MobileNav';
import HeaderClock from '@/components/HeaderClock';
import Intro from '@/components/Intro';
import NewsTicker from '@/components/NewsTicker';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import { siteUrl, SITE_EMAIL, SITE_FACEBOOK } from '@/lib/site';

/** How the site works, in three lines, above the footer (owner, 2026-09-12). */
const HOW_IT_WORKS = [
  {
    icon: 'file',
    title: 'কোথা থেকে তথ্য আসে',
    body: 'বাংলাদেশ জাতীয় সংসদের ওয়েবসাইট ও সংসদ সচিবালয়ের প্রজ্ঞাপন, নির্বাচন কমিশনের প্রকাশিত তথ্য; ভোটের ফল ও দলের ইতিহাসের মতো বাকি তথ্যের সূত্র প্রতিটি পাতায় লেখা। কোনো তথ্য অনুমান করে বসানো হয় না।',
  },
  {
    icon: 'refresh',
    title: 'কত দিন পরপর হালনাগাদ',
    body: 'প্রতিদিন। সংসদের নতুন প্রজ্ঞাপন, বৈঠকের কার্যসূচি ও কমিটির পরিবর্তন প্রকাশের পরদিনের মধ্যে যুক্ত হয়; সংবাদ শিরোনাম আরও ঘন ঘন।',
  },
  {
    icon: 'flag',
    title: 'ভুল পেলে',
    body: 'প্রতিটি সদস্যের পাতায় “সংশোধন জানান” বোতাম আছে। সূত্রসহ জানালে ২৪ ঘণ্টার মধ্যে যাচাই করে ঠিক করা হয়।',
  },
];

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

      <section aria-label="তথ্যের সূত্র ও হালনাগাদ" className="mt-6 sm:mt-16 border-t border-brandring bg-brandsoft">
        <div className="mx-auto max-w-[1200px] px-5 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.title} className="flex gap-4">
              <span className="shrink-0 w-11 h-11 rounded-xl bg-surface text-brand grid place-items-center ring-1 ring-brandring">
                <Icon name={h.icon} size={21} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="display text-[19px] font-bold text-ink">{h.title}</h2>
                <p className="text-[16px] leading-relaxed text-inksoft">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
