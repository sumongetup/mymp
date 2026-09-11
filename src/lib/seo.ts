import type { Metadata } from 'next';

/*
 * Site-wide SEO and share metadata. Every page inherits BASE_OPEN_GRAPH and
 * BASE_TWITTER from the root layout. They deliberately carry no title or
 * description: Next fills og:title, og:description and the twitter pair from
 * each page's own title and description, so an MP page shares as that MP. The
 * home page adds the explicit title, description and og:url on top.
 */
export const SITE_NAME = 'আমার এমপি';
export const SITE_TITLE = 'আমার এমপি | বাংলাদেশের সংসদ সদস্যদের তথ্য';
export const SITE_DESCRIPTION =
  'ত্রয়োদশ জাতীয় সংসদের সব সংসদ সদস্যের তথ্য এক জায়গায়। আসন, দল, সংরক্ষিত আসন, সংসদীয় কমিটি ও অধিবেশনের তথ্য। সূত্র: বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।';

/** public/og-image-v2.png, rendered by `npm run og-image`; the -v2 name makes crawlers fetch it afresh. */
export const SHARE_IMAGE = {
  url: '/og-image-v2.png',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'আমার এমপি: বাংলাদেশের সংসদ সদস্যদের তথ্য',
};

export const BASE_OPEN_GRAPH: NonNullable<Metadata['openGraph']> = {
  type: 'website',
  siteName: SITE_NAME,
  locale: 'bn_BD',
  images: [SHARE_IMAGE],
};

export const BASE_TWITTER: NonNullable<Metadata['twitter']> = {
  card: 'summary_large_image',
  images: [SHARE_IMAGE],
};

/**
 * The share tags for one page: the site's Open Graph defaults plus the page's
 * own address (og:url), and a page image where it has one. Next fills
 * og:title and og:description from the page's title and description.
 */
export function shareGraph(
  path: string,
  image?: { url: string; width: number; height: number; alt?: string } | null,
): NonNullable<Metadata['openGraph']> {
  return { ...BASE_OPEN_GRAPH, url: path, ...(image ? { images: [image] } : {}) };
}
