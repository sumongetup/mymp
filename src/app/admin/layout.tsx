import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'অ্যাডমিন · আমার এমপি' },
  robots: { index: false, follow: false },
};

/**
 * Everything under /admin is rendered per request and hidden from search
 * engines. The signed-in shell lives one level down in the (auth) group so the
 * login and setup screens can render without a session.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full flex flex-col bg-paper">{children}</div>;
}
