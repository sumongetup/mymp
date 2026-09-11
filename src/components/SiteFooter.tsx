import Link from 'next/link';
import Brand from './Brand';
import Icon from './Icon';
import BrandIcon from './BrandIcon';
import { meta, dateBn } from '@/lib/data';
import { FOOTER_SECTIONS, FOOTER_ABOUT, type FooterLink } from '@/lib/nav';
import { SITE_EMAIL, SITE_FACEBOOK } from '@/lib/site';

/*
 * The footer on every public page (owner's spec, 2026-09-12): brand, বিভাগ and
 * আমার এমপি side by side, stacked in that order on a phone, then the bottom
 * line. Text is 15-16px in clear light tones, since the owner found the first
 * version small and grey. On the green (#10281f) the body text #dbe6df is
 * 13:1, the logo-green headings #6ee79a 9.8:1, the bottom line #b9c7bf 9.2:1,
 * links white. No letter spacing on headings: it pulls Bangla letters apart.
 * External links carry ↗; internal ones do not.
 */
const HEADING = 'text-[15px] font-bold text-[#6ee79a]';
const LINK = 'text-white hover:text-[#6ee79a] transition-colors';
const PILL = 'h-11 px-4 inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[15px] font-semibold hover:bg-white/20 transition-colors';

function FooterItem({ item }: { item: FooterLink }) {
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {item.label} ↗
    </a>
  ) : (
    <Link href={item.href} className={LINK}>
      {item.label}
    </Link>
  );
}

export default function SiteFooter() {
  return (
    <footer className="bg-[#10281f] text-[#cfdad3] border-t-[3px] border-transparent [border-image:linear-gradient(90deg,var(--color-brand),var(--color-logo),var(--color-brand))_1]">
      <div className="mx-auto max-w-[1200px] px-5 py-12 flex flex-col gap-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div className="flex flex-col gap-5 max-w-[440px]">
            <Brand tone="light" />
            <p className="text-[16px] leading-relaxed text-[#dbe6df]">
              বাংলাদেশ জাতীয় সংসদের সদস্য, আসন, কমিটি ও অধিবেশনের উন্মুক্ত তথ্যভান্ডার। প্রতিটি তথ্যের সূত্র জাতীয় সংসদ ও
              নির্বাচন কমিশন; কোনো তথ্য অনুমান করে বসানো হয় না।
            </p>
            {/* The owner asked for this line to stand out. */}
            <div className="flex gap-3 rounded-xl border border-[#17cf54]/40 bg-[#17cf54]/10 px-4 py-3.5">
              <Icon name="shield" size={24} className="text-[#6ee79a] mt-0.5" />
              <p className="text-[15px] leading-relaxed text-white">
                <strong className="block text-[17px] font-bold text-[#6ee79a]">একটি স্বাধীন উদ্যোগ।</strong>
                এটি কোনো সরকারি সাইট নয়; কোনো দল বা সংসদ সদস্যের সঙ্গে সম্পর্ক নেই।
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a href={SITE_FACEBOOK} target="_blank" rel="noopener noreferrer" className={PILL}>
                <BrandIcon name="facebook" size={17} color="#ffffff" />
                ফেসবুক পেজ ↗
              </a>
              <a href={`mailto:${SITE_EMAIL}`} title={SITE_EMAIL} aria-label={`ইমেইল: ${SITE_EMAIL}`} className={PILL}>
                <Icon name="mail" size={16} />
                ইমেইল
              </a>
            </div>
          </div>

          <nav aria-label="বিভাগ" className="flex flex-col gap-4">
            <span className={HEADING}>বিভাগ</span>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-3 text-[16px]">
              {FOOTER_SECTIONS.map((item) => (
                <FooterItem key={item.label} item={item} />
              ))}
            </div>
          </nav>

          <nav aria-label="আমার এমপি" className="flex flex-col gap-4">
            <span className={HEADING}>আমার এমপি</span>
            <div className="flex flex-col gap-3 text-[16px]">
              {FOOTER_ABOUT.map((item) => (
                <FooterItem key={item.label} item={item} />
              ))}
            </div>
          </nav>
        </div>

        <div className="border-t border-white/15 pt-5 flex flex-col sm:flex-row gap-2 justify-between text-[14px] text-[#b9c7bf]">
          <span>© ২০২৬ আমার এমপি, mymp.bd</span>
          {/* The date of the sync this build was made from (data/meta.json, written by every sync run). */}
          <span>সংসদের তথ্যভান্ডার থেকে হালনাগাদ {dateBn(meta.syncedAt)}</span>
        </div>
      </div>
    </footer>
  );
}
