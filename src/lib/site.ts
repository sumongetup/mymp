/**
 * The canonical origin for this deployment.
 *
 * Set NEXT_PUBLIC_SITE_URL in the host's environment settings once the real
 * domain is attached. Until then it falls back to the URL Vercel assigns, so
 * canonical links and the sitemap point at the site people can actually open
 * rather than a domain that is not serving this build yet.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');
