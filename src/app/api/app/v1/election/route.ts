/** The 2026 election and the House it produced, for the app's নির্বাচন screen. */
import { NextResponse } from 'next/server';
import { election } from '@/lib/app/election';

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(election(), {
    headers: {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'access-control-allow-origin': '*',
    },
  });
}
