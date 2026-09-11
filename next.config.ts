import type { NextConfig } from 'next';

/**
 * Every public page is prerendered, so the site can also be emitted as plain
 * files for a static host. That path is opt-in through STATIC_EXPORT so the
 * normal build keeps the door open for the admin panel and its API routes.
 */
const staticExport = process.env.STATIC_EXPORT === '1';

/**
 * Paths from the previous mymp.bd site. Anyone holding an old bookmark or a
 * search result lands on the matching section here instead of a 404. The old
 * per-member ids do not map onto the new slugs, so those fall back to the list.
 */
const legacyRedirects = [
  { source: '/mps', destination: '/mp', permanent: true },
  { source: '/mps/:id', destination: '/mp', permanent: true },
  { source: '/parties', destination: '/dol', permanent: true },
  { source: '/parties/:slug', destination: '/dol', permanent: true },
  { source: '/about', destination: '/somporke', permanent: true },
  { source: '/contact', destination: '/jogajog', permanent: true },
  { source: '/privacy', destination: '/gopaniyota', permanent: true },
  { source: '/terms', destination: '/gopaniyota', permanent: true },
  // The old Laravel admin lived at /admin/login too; that path is now the real
  // admin panel, so there is deliberately no redirect for /admin here.
];

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: 'export', images: { unoptimized: true }, basePath: process.env.BASE_PATH || '' }
    : { async redirects() { return legacyRedirects; } }),
  trailingSlash: staticExport,
  // The member preview image shapes Bangla with HarfBuzz (WASM) and reads the font files at run time;
  // both are loaded from node_modules, so the function must ship them.
  serverExternalPackages: ['harfbuzzjs'],
  outputFileTracingIncludes: {
    '/api/og/mp/[slug]': [
      './node_modules/harfbuzzjs/dist/**/*',
      './node_modules/@expo-google-fonts/noto-sans-bengali/700Bold/*.ttf',
      './node_modules/@expo-google-fonts/noto-sans-bengali/400Regular/*.ttf',
    ],
  },
};

export default nextConfig;
