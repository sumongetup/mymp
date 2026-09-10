import type { Metadata } from 'next';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { siteUrl } from '@/lib/site';
import { BASE_OPEN_GRAPH, BASE_TWITTER, SITE_DESCRIPTION, SITE_TITLE } from '@/lib/seo';

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
    default: SITE_TITLE,
    template: '%s · আমার এমপি',
  },
  description: SITE_DESCRIPTION,
  openGraph: BASE_OPEN_GRAPH,
  twitter: BASE_TWITTER,
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
