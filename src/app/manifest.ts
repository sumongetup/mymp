import type { MetadataRoute } from 'next';

/** Home-screen name and icons. The icons are rendered from the logo paths in src/components/Brand.tsx. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'আমার এমপি — বাংলাদেশের সংসদ সদস্যদের তথ্য',
    short_name: 'আমার এমপি',
    description: 'বাংলাদেশের সংসদ সদস্য, আসন, দল, কমিটি ও অধিবেশনের তথ্য।',
    lang: 'bn',
    start_url: '/',
    display: 'browser',
    background_color: '#f4f5f1',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
