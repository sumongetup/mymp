'use client';

import Link from 'next/link';

/**
 * The root layout itself failed, so nothing of the site's shell or fonts is
 * available: a bare Bangla page with the way back, in place of Next's
 * English "500: This page couldn't be loaded".
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bn">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f5f1', color: '#17201b' }}>
        <main style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#6c766f', margin: 0 }}>৫০০</p>
          <h1 style={{ fontSize: 28, margin: 0 }}>পাতাটি দেখানো যায়নি</h1>
          <p style={{ maxWidth: 440, lineHeight: 1.6, color: '#465049', margin: 0 }}>কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন, অথবা হোম পাতায় ফিরে যান।</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={reset} style={{ height: 44, padding: '0 20px', borderRadius: 8, border: 0, background: '#0f6a4b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              আবার চেষ্টা করুন
            </button>
            <Link href="/" style={{ height: 44, padding: '0 20px', borderRadius: 8, border: '1px solid #dfe3dd', display: 'inline-flex', alignItems: 'center', color: '#17201b', fontWeight: 600, textDecoration: 'none' }}>হোম</Link>
            <Link href="/mp" style={{ height: 44, padding: '0 20px', borderRadius: 8, border: '1px solid #dfe3dd', display: 'inline-flex', alignItems: 'center', color: '#17201b', fontWeight: 600, textDecoration: 'none' }}>সব সংসদ সদস্য</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
