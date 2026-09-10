import type { NextConfig } from 'next';
import { resolve } from 'node:path';

// The monorepo keeps one .env at its root; Next only reads env files in this
// folder, so load the root one here (values already in the environment win).
// On Vercel there is no file and the dashboard variables are used.
try {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
} catch {
  /* no root .env: fine on CI and Vercel */
}

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
  // Next 16 writes AGENTS.md and CLAUDE.md into the app on `next dev`; not wanted in the repo.
  agentRules: false,
};

export default config;
