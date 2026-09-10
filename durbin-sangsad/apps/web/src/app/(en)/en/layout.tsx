import type { Metadata } from 'next';
import Shell from '@/components/Shell';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl('/')),
  title: { default: 'Parliament · Durbin News', template: '%s · Parliament · Durbin News' },
  description: 'A verified directory of the members of the 13th Jatiya Sangsad. Sources: Bangladesh Parliament and the Election Commission.',
  alternates: { canonical: siteUrl('/en'), languages: { bn: siteUrl('/'), en: siteUrl('/en'), 'x-default': siteUrl('/') } },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'Durbin News · Parliament' },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell locale="en" path="/">
      {children}
    </Shell>
  );
}
