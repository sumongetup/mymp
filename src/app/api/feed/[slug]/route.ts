/**
 * A member's news and video feed, read by the section on their profile.
 *
 * The profile page itself is prerendered, so the feed is fetched from here at
 * view time. One request brings the pinned items, the current month and the
 * month list; `?m=2026-08` brings one earlier month when a reader opens it.
 *
 * Cached at the edge for five minutes: a headline that lands during a coffee
 * break is soon enough, and the site keeps its "no function on the read path
 * to speak of" shape.
 */
import { NextResponse } from 'next/server';
import { getMember } from '@/lib/data';
import { monthCounts, monthItems, pinnedItems, feedSettings, type FeedType } from '@/lib/feed/store';
import { isMissingTable } from '@/lib/posts/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CACHE = 'public, s-maxage=300, stale-while-revalidate=1800';

/** The current month in Dhaka, where the feed's days are counted. */
const dhakaMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const member = getMember(slug);
  if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const url = new URL(req.url);
  const month = url.searchParams.get('m');
  const type = url.searchParams.get('type');
  const typeFilter: FeedType | undefined = type === 'news' || type === 'video' ? type : undefined;

  try {
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'bad month' }, { status: 400 });
      const items = await monthItems(member.id, month, typeFilter);
      return NextResponse.json({ month, items }, { headers: { 'cache-control': CACHE } });
    }

    const current = dhakaMonth();
    const [pinned, items, counts, settings] = await Promise.all([
      pinnedItems(member.id),
      monthItems(member.id, current, typeFilter),
      monthCounts(member.id),
      feedSettings(),
    ]);
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const setting = settings.get(member.id);
    return NextResponse.json(
      {
        month: current,
        pinned,
        items: items.filter((i) => !pinnedIds.has(i.id)),
        months: counts.months,
        total: counts.total,
        news: counts.news,
        video: counts.video,
        outlets: counts.outlets,
        startsAt: setting?.feedStartAt ?? null,
      },
      { headers: { 'cache-control': CACHE } },
    );
  } catch (e) {
    // Before the migration is run there is no feed; the section says so rather than breaking.
    if (isMissingTable(e)) return NextResponse.json({ month: dhakaMonth(), pinned: [], items: [], months: [], total: 0, news: 0, video: 0, outlets: [], startsAt: null, unavailable: true });
    throw e;
  }
}
