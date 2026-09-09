import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Reachability probe: can THIS function's network reach parliament.gov.bd?
 * The build container could not, so this tells us whether a scheduled
 * function in the configured region can fetch the source instead.
 * Secret-gated like the cron route; returns no data from the source itself.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const target = 'https://www.parliament.gov.bd/api/members?parliamentNo=13&limit=1&page=1';
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(target, { headers: { accept: 'application/json' }, signal: ctrl.signal, cache: 'no-store' });
    const text = await res.text();
    let total: number | null = null;
    try { total = JSON.parse(text).total ?? null; } catch { /* not json */ }
    return NextResponse.json({
      ok: res.ok, status: res.status, bytes: text.length, total,
      ms: Date.now() - started, region: process.env.VERCEL_REGION ?? null,
    });
  } catch (err) {
    const e = err as Error & { cause?: { code?: string; message?: string } };
    return NextResponse.json({
      ok: false, error: e.message, cause: e.cause?.code ?? e.cause?.message ?? null,
      ms: Date.now() - started, region: process.env.VERCEL_REGION ?? null,
    }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
