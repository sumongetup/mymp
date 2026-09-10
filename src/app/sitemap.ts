import type { MetadataRoute } from 'next';
import { members, seats, parties, committees, meta, districtOf } from '@/lib/data';
import { siteUrl } from '@/lib/site';

/**
 * Every page on the site, so a crawler finds all 349 members and 349 seats
 * rather than only what happens to be linked from the home page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const synced = new Date(meta.syncedAt);
  const url = (path: string) => `${siteUrl}${path}`;

  const fixed: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: synced, changeFrequency: 'daily', priority: 1 },
    { url: url('/mp'), lastModified: synced, changeFrequency: 'daily', priority: 0.9 },
    { url: url('/nirbachon'), lastModified: synced, changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/odhibeshon'), lastModified: synced, changeFrequency: 'daily', priority: 0.8 },
    { url: url('/dol'), lastModified: synced, changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/committee'), lastModified: synced, changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/parisonkhan'), lastModified: synced, changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/songbad'), lastModified: synced, changeFrequency: 'daily', priority: 0.6 },
    { url: url('/somporke'), lastModified: synced, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/jogajog'), lastModified: synced, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/gopaniyota'), lastModified: synced, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const districtSlugs = [...new Set(seats.map((s) => districtOf(s)?.slug).filter((x): x is string => !!x))];

  return [
    ...fixed,
    ...members.map((m) => ({
      url: url(`/mp/${m.slug}`),
      lastModified: synced,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...seats.map((s) => ({
      url: url(`/ason/${s.slug}`),
      lastModified: synced,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...districtSlugs.map((d) => ({
      url: url(`/jela/${d}`),
      lastModified: synced,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...parties.map((p) => ({
      url: url(`/dol/${p.slug}`),
      lastModified: synced,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...committees.map((c) => ({
      url: url(`/committee/${c.slug}`),
      lastModified: synced,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
