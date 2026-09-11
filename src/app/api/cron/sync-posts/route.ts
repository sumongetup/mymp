import { NextResponse } from 'next/server';
import { members } from '@/lib/data';
import { runPostsSync } from '@/lib/posts/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The posts sync (src/lib/posts/sync.ts). Called every six hours by the
 * GitHub Actions workflow .github/workflows/sync-posts.yml, and once a day by
 * Vercel Cron as a backstop (vercel.json; the Hobby plan allows only daily
 * crons). Both send `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. `?dry=1` reads and compares without writing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry') === '1';
  const trigger = url.searchParams.get('trigger') === 'github' ? 'github' : 'cron';
  try {
    const r = await runPostsSync({
      dryRun,
      trigger,
      members: members.map((m) => ({ id: m.id, nameBn: m.nameBn, nameEn: m.nameEn, seatEn: m.seat?.nameEn ?? null })),
    });
    return NextResponse.json(
      {
        ok: r.status !== 'failed',
        status: r.status,
        dryRun,
        run: r.runId,
        parsed: r.parsed.length,
        added: r.add.length,
        closed: r.close.length,
        unchanged: r.unchanged,
        unmatched: r.unmatched.length,
        errors: r.errors,
        mail: r.mail,
        deploy: r.deploy,
      },
      { status: r.status === 'failed' ? 500 : 200 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
