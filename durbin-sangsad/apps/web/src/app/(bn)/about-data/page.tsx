import type { Metadata } from 'next';
import AboutData from '@/components/AboutData';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'তথ্যের উৎস',
  alternates: { canonical: siteUrl('/about-data'), languages: { bn: siteUrl('/about-data'), en: siteUrl('/en/about-data') } },
};

export default function AboutDataBn() {
  return <AboutData locale="bn" />;
}
