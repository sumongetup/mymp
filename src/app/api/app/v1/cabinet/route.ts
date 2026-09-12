/** The cabinet, for the app's মন্ত্রিসভা screen. */
import { NextResponse } from 'next/server';
import { cabinet } from '@/lib/app/payload';

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(cabinet(), {
    headers: {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'access-control-allow-origin': '*',
    },
  });
}
