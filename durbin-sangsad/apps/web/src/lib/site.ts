/** Absolute URLs need the site origin plus BASE_PATH; relative links get it from next/link. */
export const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
export const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const siteUrl = (path = '/') => `${siteOrigin}${basePath}${path === '/' ? '' : path}` || `${siteOrigin}/`;

export type Locale = 'bn' | 'en';

/** Path of the same page in the other language. */
export const localePath = (locale: Locale, path: string) => (locale === 'en' ? `/en${path === '/' ? '' : path}` : path);
