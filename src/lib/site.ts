/**
 * The canonical origin for this deployment.
 *
 * Set NEXT_PUBLIC_SITE_URL in the host's environment settings once the real
 * domain is attached. Until then it falls back to the URL Vercel assigns, so
 * canonical links and the sitemap point at the site people can actually open
 * rather than a domain that is not serving this build yet.
 */
/** The site's own public channels, from the owner (2026-09-12). */
export const SITE_EMAIL = 'mymp.bangladesh@gmail.com';
export const SITE_FACEBOOK = 'https://www.facebook.com/mymp.bd';

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');
