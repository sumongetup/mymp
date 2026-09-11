import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // Each admin page names itself, so a row of admin tabs can be told apart.
  title: { default: 'অ্যাডমিন · আমার এমপি', template: '%s · অ্যাডমিন · আমার এমপি' },
  description: 'আমার এমপির সম্পাদকীয় প্যানেল: সংসদ সদস্য, আসন, দল, কমিটি, নির্বাচনের ফল ও সংবাদের তথ্য সম্পাদনা ও প্রকাশ।',
  robots: { index: false, follow: false },
  // Nothing here is meant to be shared; no link previews.
  openGraph: null,
  twitter: null,
};

/**
 * Everything under /admin is rendered per request and hidden from search
 * engines. The signed-in shell lives one level down in the (auth) group so the
 * login and setup screens can render without a session.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full flex flex-col bg-paper">{children}</div>;
}
