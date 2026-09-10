import type { Metadata } from 'next';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { siteUrl } from '@/lib/site';

/*
 * Noto Sans Bengali, as one variable file covering every weight. It is the
 * Bengali face of BBC Bangla, Google's own Bengali products and Android, so it
 * is what most readers already see as "normal" professional Bengali, and the
 * app will render the very same glyphs. Only the Bengali and Latin subsets are
 * requested; Bengali faces are large.
 */
const notoBn = Noto_Sans_Bengali({
  variable: '--font-bn',
  subsets: ['bengali', 'latin'],
  weight: 'variable',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'আমার এমপি — বাংলাদেশের সংসদ সদস্যদের তথ্য',
    template: '%s · আমার এমপি',
  },
  description:
    'ত্রয়োদশ জাতীয় সংসদের ৩৪৯ জন সদস্য, ৩০০ আসন, দল, সংসদীয় কমিটি ও অধিবেশনের তথ্য। সূত্র বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।',
  openGraph: { type: 'website', locale: 'bn_BD', siteName: 'আমার এমপি' },
  // The share image itself is src/app/opengraph-image.png (file convention, inherited by every page).
  twitter: { card: 'summary_large_image' },
};

/**
 * The root layout carries only fonts and global styles. The public site's
 * header and footer live in the (site) group, and the admin panel has its own
 * shell, so nothing here reads a session and every public page stays static.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="bn" className={`${notoBn.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
