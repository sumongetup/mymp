/** Public navigation. Lives outside the layout because Next allows no extra exports there. */
export const NAV = [
  { href: '/nirbachon', label: 'ত্রয়োদশ নির্বাচন' },
  { href: '/dol', label: 'দল' },
  { href: '/mp', label: 'সব এমপি' },
  { href: '/committee', label: 'কমিটি' },
  { href: '/odhibeshon', label: 'অধিবেশন' },
  { href: '/parisonkhan', label: 'পরিসংখ্যান' },
  { href: '/songbad', label: 'সংবাদ' },
];

export const NAV_MORE = [
  { href: '/somporke', label: 'সম্পর্কে' },
  { href: '/jogajog', label: 'যোগাযোগ' },
  { href: '/gopaniyota', label: 'গোপনীয়তা নীতি' },
];

export type FooterLink = { href: string; label: string; external?: boolean };

/*
 * The footer's own lists (owner's spec, 2026-09-12). The header keeps NAV and
 * NAV_MORE unchanged. The spec's English paths map to the site's routes:
 * /districts → /nirbachon#jela (its district list; there is no district index),
 * /parties → /dol, /committees → /committee, /sessions → /odhibeshon,
 * /stats → /parisonkhan, /election-2026 → /nirbachon (redirected), /news → /songbad,
 * /about → /somporke, /sources → /sutro (new; redirected), /contact → /jogajog,
 * /privacy → /gopaniyota.
 */
export const FOOTER_SECTIONS: FooterLink[] = [
  { href: '/mp', label: 'সব এমপি' },
  { href: '/nirbachon#jela', label: 'আসন ও জেলা' },
  { href: '/dol', label: 'দল' },
  { href: '/committee', label: 'কমিটি' },
  { href: '/odhibeshon', label: 'অধিবেশন' },
  { href: '/parisonkhan', label: 'পরিসংখ্যান' },
  { href: '/nirbachon', label: 'নির্বাচন ২০২৬' },
  { href: '/songbad', label: 'সংবাদ' },
];

export const FOOTER_ABOUT: FooterLink[] = [
  { href: '/somporke', label: 'সম্পর্কে' },
  { href: '/sutro', label: 'তথ্যসূত্র ও পদ্ধতি' },
  { href: '/jogajog', label: 'সংশোধন জানান' },
  { href: '/gopaniyota', label: 'গোপনীয়তা নীতি ও শর্ত' },
  { href: 'https://www.parliament.gov.bd', label: 'বাংলাদেশ জাতীয় সংসদ', external: true },
  { href: 'https://www.ecs.gov.bd', label: 'নির্বাচন কমিশন', external: true },
];
