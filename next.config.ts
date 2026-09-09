import type { NextConfig } from 'next';

/**
 * Every public page is prerendered, so the site can also be emitted as plain
 * files for a static host. That path is opt-in through STATIC_EXPORT so the
 * normal build keeps the door open for the admin panel and its API routes.
 */
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: 'export', images: { unoptimized: true }, basePath: process.env.BASE_PATH || '' }
    : {}),
  trailingSlash: staticExport,
};

export default nextConfig;
