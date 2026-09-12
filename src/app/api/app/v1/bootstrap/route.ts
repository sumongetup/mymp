/**
 * Everything the mobile app keeps offline: the member list, the parties, the
 * districts. One request on first run, then only when `version` changes.
 *
 * Built from the same snapshot the website's own pages are built from, so the
 * app can never show something the site does not.
 */
import { NextResponse } from 'next/server';
import { bootstrap } from '@/lib/app/payload';

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(bootstrap(), {
    headers: {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'access-control-allow-origin': '*',
    },
  });
}
