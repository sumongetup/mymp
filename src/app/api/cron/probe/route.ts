import { NextResponse } from 'next/server';
import https from 'node:https';
import tls from 'node:tls';
// Plain ESM, shared with scripts/sync.mjs, which cannot import TypeScript.
import { PARLIAMENT_CA } from '@/lib/parliament-ca.mjs';

export const dynamic = 'force-dynamic';

/**
 * Reachability probe for parliament.gov.bd, gated by the cron secret.
 *
 * It uses the same node:https path as the sync, because a plain fetch() fails
 * twice over on that host: it omits the intermediate certificate, and it resets
 * connections that send no User-Agent. Returns only status and timing, never
 * data from the source.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const ca = [...tls.rootCertificates, ...(PARLIAMENT_CA as string[])];

  const result = await new Promise<Record<string, unknown>>((resolve) => {
    const request = https.request(
      {
        host: 'www.parliament.gov.bd',
        path: '/api/members?parliamentNo=13&limit=1&page=1',
        method: 'GET',
        timeout: 25000,
        ca,
        headers: { accept: 'application/json', 'user-agent': 'mymp-sync/1.0 (+https://mymp.bd)' },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          let total: number | null = null;
          try { total = JSON.parse(body).total ?? null; } catch { /* not json */ }
          resolve({ ok: (res.statusCode ?? 0) < 400, status: res.statusCode, bytes: body.length, total });
        });
      },
    );
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', (e: NodeJS.ErrnoException) => resolve({ ok: false, error: e.code ?? e.message }));
    request.end();
  });

  return NextResponse.json(
    { ...result, certs: (PARLIAMENT_CA as string[]).length, ms: Date.now() - started, region: process.env.VERCEL_REGION ?? null },
    { status: result.ok ? 200 : 502 },
  );
}
