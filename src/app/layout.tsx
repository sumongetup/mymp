import type { Metadata } from 'next';
import { Anek_Bangla, Noto_Serif_Bengali } from 'next/font/google';
import './globals.css';
import { siteUrl } from '@/lib/site';

/*
 * Anek Bangla is a Bengali-first family from Ek Type: weights 100-800 and
 * noticeably better-resolved conjuncts than a Latin family extended to Bengali,
 * which is what the site used before. Noto Serif Bengali stays for headings
 * because it is the only Bengali serif with a full weight range, and headings
 * here run from 15px to 58px.
 *
 * Bengali faces are large, so only the weights actually used are requested.
 */
const anek = Anek_Bangla({
  variable: '--font-anek',
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
  title: {
    default: 'আমার এমপি — বাংলাদেশের সংসদ সদস্যদের তথ্য',
    template: '%s · আমার এমপি',
  },
  description:
    'ত্রয়োদশ জাতীয় সংসদের ৩৪৯ জন সদস্য, ৩০০ আসন, দল ও সংসদীয় কমিটির তথ্য। সূত্র বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।',
  openGraph: { type: 'website', locale: 'bn_BD', siteName: 'আমার এমপি' },
};

/**
 * The root layout carries only fonts and global styles. The public site's
 * header and footer live in the (site) group, and the admin panel has its own
 * shell, so nothing here reads a session and every public page stays static.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="bn" className={`${anek.variable} ${notoBn.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
