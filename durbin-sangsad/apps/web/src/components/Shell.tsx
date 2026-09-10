import Link from 'next/link';
import { notoBengali, inter } from '@/lib/fonts';
import { t } from '@/lib/i18n';
import { localePath, type Locale } from '@/lib/site';
import { usingFixtures } from '@/lib/data';
import '@/app/globals.css';

/**
 * The document shell for one locale. Bangla and English are separate root
 * layouts so the <html lang> is right for screen readers and search engines.
 */
export default function Shell({ locale, path, children }: { locale: Locale; path: string; children: React.ReactNode }) {
  const s = t(locale);
  const other: Locale = locale === 'bn' ? 'en' : 'bn';
  return (
    <html lang={locale} className={`${notoBengali.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {usingFixtures() && (
          <div className="bg-warnsoft text-warn text-[13px] font-semibold text-center px-4 py-1.5" data-testid="fixture-banner">
            {s.fixtureBanner}
          </div>
        )}
        <header className="sticky top-0 z-40 bg-surface border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-5 h-[60px] flex items-center gap-4">
            <Link href="/" className="flex items-baseline gap-2 shrink-0" aria-label={`${s.brand} ${s.section}`}>
              <span className="display text-[20px] text-accent">{s.brand}</span>
              <span className="text-[13px] font-semibold text-muted">· {s.section}</span>
            </Link>
            <nav className="ms-auto flex items-center gap-4 text-[14px] font-semibold">
              <Link href="/about-data" className="text-inksoft hover:text-accent">{s.aboutData}</Link>
              <Link
                href={localePath(other, path)}
                hrefLang={other}
                lang={other}
                className="px-3 py-1.5 rounded-lg border border-rule bg-surface hover:border-accent"
              >
                {s.otherLanguage}
              </Link>
            </nav>
          </div>
        </header>
        <main className="grow">{children}</main>
        <footer className="mt-16 bg-ink text-[#cfd3cf]">
          <div className="mx-auto max-w-[1200px] px-5 py-10 flex flex-col gap-4 text-[13.5px] leading-relaxed">
            <p className="max-w-[720px]">{s.disclaimer}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-white">
              <Link href="/about-data" className="hover:underline">{s.aboutData}</Link>
              <a href="mailto:info@durbinnews.com" className="hover:underline">info@durbinnews.com</a>
            </div>
            <p className="text-[#8f958f]">© {new Date().getFullYear()} {s.brand}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
