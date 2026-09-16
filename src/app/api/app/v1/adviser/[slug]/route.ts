/** An adviser from outside parliament, as the app's profile screen draws them. */
import { NextResponse } from 'next/server';
import { adviserDetail } from '@/lib/app/payload';
import { allAdvisers } from '@/lib/advisers';

export const revalidate = 3600;

export function generateStaticParams() {
  return allAdvisers().map((a) => ({ slug: a.slug }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const adviser = adviserDetail(slug);
  if (!adviser) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(adviser, {
    headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400', 'access-control-allow-origin': '*' },
  });
}
