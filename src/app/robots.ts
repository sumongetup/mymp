import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Link-preview crawlers (X, LinkedIn, Slack) obey robots.txt, so the member preview images under /api/og stay open.
    rules: { userAgent: '*', allow: ['/', '/api/og/'], disallow: ['/admin', '/api/'] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
