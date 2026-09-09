import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Nightly rebuild, called by Vercel Cron (see vercel.json). Rebuilding is what
 * refreshes the site from parliament.gov.bd and applies every admin edit, so
 * this is the "always current" guarantee.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return NextResponse.json({ ok: false, error: 'VERCEL_DEPLOY_HOOK_URL is not set' }, { status: 500 });
  }

  const res = await fetch(hook, { method: 'POST' });
  return NextResponse.json(
    { ok: res.ok, status: res.status, at: new Date().toISOString() },
    { status: res.ok ? 200 : 502 },
  );
}
