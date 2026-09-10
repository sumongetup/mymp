import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import https from 'node:https';
import tls from 'node:tls';

export const dynamic = 'force-dynamic';

/**
 * Reachability probe for parliament.gov.bd, gated by the cron secret.
 *
 * It goes through the same node:https path the sync uses, because a plain
 * fetch() fails twice over on that host: the server omits the intermediate
 * certificate, and it resets connections that send no User-Agent. Returns only
 * status and timing, never data from the source.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const region = process.env.VERCEL_REGION ?? null;

  let extra: string[] = [];
  let caFile = 'loaded';
  try {
    const pem = await readFile(join(process.cwd(), 'certs', 'parliament-chain.pem'), 'utf8');
    extra = pem.split(/(?=-----BEGIN CERTIFICATE-----)/).filter((s) => s.includes('BEGIN CERTIFICATE'));
  } catch (e) {
    caFile = `missing: ${(e as Error).message}`;
  }

  const result = await new Promise<Record<string, unknown>>((resolve) => {
    const request = https.request(
      {
        host: 'www.parliament.gov.bd',
        path: '/api/members?parliamentNo=13&limit=1&page=1',
        method: 'GET',
        timeout: 25000,
        ca: [...tls.rootCertificates, ...extra],
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

  return NextResponse.json({ ...result, caFile, certs: extra.length, ms: Date.now() - started, region },
    { status: result.ok ? 200 : 502 });
}
