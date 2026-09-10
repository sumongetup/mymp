import type { Metadata } from 'next';
import Shell from '@/components/Shell';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl('/')),
  title: { default: 'সংসদ · দুরবীন নিউজ', template: '%s · সংসদ · দুরবীন নিউজ' },
  description: 'ত্রয়োদশ জাতীয় সংসদের সদস্যদের যাচাই করা তথ্যভান্ডার। উৎস: বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।',
  alternates: { canonical: siteUrl('/'), languages: { bn: siteUrl('/'), en: siteUrl('/en'), 'x-default': siteUrl('/') } },
  openGraph: { type: 'website', locale: 'bn_BD', siteName: 'দুরবীন নিউজ · সংসদ' },
};

export default function BnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell locale="bn" path="/">
      {children}
    </Shell>
  );
}
