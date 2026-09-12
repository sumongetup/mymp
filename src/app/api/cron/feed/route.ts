/**
 * The scheduled collection, called every 30 minutes by GitHub Actions and once
 * a day by Vercel's own cron as a backstop (the same pair the posts sync uses,
 * because Vercel's Hobby plan allows only a daily job).
 *
 * The work is time-boxed: whatever a run cannot store before the budget runs
 * out is picked up by the next one, which sees it as new. That keeps a
 * serverless function inside its limit without losing a headline.
 */
import { NextResponse } from 'next/server';
import { runRssCollector } from '@/lib/feed/collect';
import { runYoutubeCollector, runSearchCollector, runPressCollector } from '@/lib/feed/collectors';
import { learnFromFeedback } from '@/lib/feed/learn';
import { isMissingTable } from '@/lib/posts/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const trigger = url.searchParams.get('trigger') ?? 'cron';
  const collector = url.searchParams.get('collector') ?? 'rss';

  try {
    if (collector === 'learn') {
      const l = await learnFromFeedback();
      return NextResponse.json({ ok: true, collector, feedback: l.feedback, learned: l.learned.length, outlets: l.outlets.slice(0, 8) });
    }
    const r =
      collector === 'youtube' ? await runYoutubeCollector({ trigger })
      : collector === 'search' ? await runSearchCollector({ trigger })
      : collector === 'press' ? await runPressCollector({ trigger })
      : await runRssCollector({ trigger, budgetMs: 45_000 });
    // A collector with no key has not run rather than failed, so a schedule
    // that is waiting for a credential does not turn red every hour.
    const waiting = r.status === 'aborted' && r.errors.some((e) => /is not set|refused every call/.test(e.message));
    return NextResponse.json(
      {
        ok: r.status === 'ok' || waiting,
        waiting: waiting ? r.errors[0]!.message : undefined,
        collector,
        status: r.status,
        found: r.itemsFound,
        stored: r.itemsNew,
        attached: r.itemsAttached,
        lowConfidence: r.lowConfidence,
        unmatched: r.unmatched,
        errors: r.errors,
      },
      { status: r.status === 'ok' || waiting ? 200 : 500 },
    );
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ ok: false, error: 'the feed tables do not exist: run supabase/migrations/004_feed.sql' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
