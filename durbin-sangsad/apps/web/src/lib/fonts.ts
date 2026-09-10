import { Inter, Noto_Sans_Bengali } from 'next/font/google';

/** Noto Sans Bengali for Bangla, Inter for English; both as variable fonts, subsetted. */
export const notoBengali = Noto_Sans_Bengali({
  variable: '--font-bn',
  subsets: ['bengali', 'latin'],
  weight: 'variable',
  display: 'swap',
});

export const inter = Inter({
  variable: '--font-en',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});
