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
 * line. Every colour here is at least 4.5:1 on the green (#10281f): body text
 * #a9b8b0 is 7.5:1, headings #9db1a6 6.9:1, the quieter lines #8a9990 5.2:1,
 * links white. External links carry ↗; internal ones do not.
 */
const HEADING = 'text-[11px] font-bold tracking-[1.8px] text-[#9db1a6]';
const LINK = 'text-white hover:text-[#9fe0bf] transition-colors';
const PILL = 'h-10 px-4 inline-flex items-center gap-2 rounded-full bg-white/10 text-white text-[14px] font-semibold hover:bg-white/20 transition-colors';

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
          <div className="flex flex-col gap-4 max-w-[420px]">
            <Brand tone="light" />
            <p className="text-[14.5px] leading-relaxed text-[#a9b8b0]">
              বাংলাদেশ জাতীয় সংসদের সদস্য, আসন, কমিটি ও অধিবেশনের উন্মুক্ত তথ্যভান্ডার। প্রতিটি তথ্যের সূত্র জাতীয় সংসদ ও
              নির্বাচন কমিশন; কোনো তথ্য অনুমান করে বসানো হয় না।
            </p>
            <p className="text-[13px] leading-relaxed text-[#8a9990]">
              একটি স্বাধীন উদ্যোগ। এটি কোনো সরকারি সাইট নয়; কোনো দল বা সংসদ সদস্যের সঙ্গে সম্পর্ক নেই।
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
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

          <nav aria-label="বিভাগ" className="flex flex-col gap-3">
            <span className={HEADING}>বিভাগ</span>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2.5 text-[14.5px]">
              {FOOTER_SECTIONS.map((item) => (
                <FooterItem key={item.label} item={item} />
              ))}
            </div>
          </nav>

          <nav aria-label="আমার এমপি" className="flex flex-col gap-3">
            <span className={HEADING}>আমার এমপি</span>
            <div className="flex flex-col gap-2.5 text-[14.5px]">
              {FOOTER_ABOUT.map((item) => (
                <FooterItem key={item.label} item={item} />
              ))}
            </div>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row gap-2 justify-between text-[13px] text-[#8a9990]">
          <span>© ২০২৬ আমার এমপি, mymp.bd</span>
          {/* The date of the sync this build was made from (data/meta.json, written by every sync run). */}
          <span>সংসদের তথ্যভান্ডার থেকে হালনাগাদ {dateBn(meta.syncedAt)}</span>
        </div>
      </div>
    </footer>
  );
}
