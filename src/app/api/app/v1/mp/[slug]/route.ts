/**
 * One member, as the app's profile screen draws it: the same facts the
 * member's page on mymp.bd shows, and no others. The news and videos come
 * separately, from /api/feed/[slug], which the app reads too.
 */
import { NextResponse } from 'next/server';
import { memberDetail } from '@/lib/app/payload';
import { members } from '@/lib/data';

export const revalidate = 3600;

export function generateStaticParams() {
  return members.map((m) => ({ slug: m.slug }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const member = memberDetail(slug);
  if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(member, {
    headers: {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'access-control-allow-origin': '*',
    },
  });
}
