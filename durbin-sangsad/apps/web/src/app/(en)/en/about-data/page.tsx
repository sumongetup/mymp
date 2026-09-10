import type { Metadata } from 'next';
import AboutData from '@/components/AboutData';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About the data',
  alternates: { canonical: siteUrl('/en/about-data'), languages: { bn: siteUrl('/about-data'), en: siteUrl('/en/about-data') } },
};

export default function AboutDataEn() {
  return <AboutData locale="en" />;
}
