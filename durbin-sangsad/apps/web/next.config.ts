import type { NextConfig } from 'next';
import { resolve } from 'node:path';

/**
 * BASE_PATH lets the whole app live at durbinnews.com/sangsad or at the root
 * of a subdomain. Every internal link goes through next/link, which applies
 * it automatically; anything that builds an absolute URL uses siteUrl() from
 * src/lib/site.ts.
 */
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

const config: NextConfig = {
  basePath,
  transpilePackages: ['@durbin/db', '@durbin/shared'],
  serverExternalPackages: ['postgres'],
  outputFileTracingRoot: resolve(__dirname, '../../'),
  images: {
    // Photos come only from our own Supabase Storage (Phase 2); no third-party image hosts.
    remotePatterns: [],
  },
  poweredByHeader: false,
};

export default config;
