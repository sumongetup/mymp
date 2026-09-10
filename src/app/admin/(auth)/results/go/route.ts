import { NextResponse } from 'next/server';

/** The picker on /admin/results is a plain GET form; this turns it into the edit URL. */
export function GET(req: Request) {
  const u = new URL(req.url);
  const seat = Number(u.searchParams.get('seat'));
  const p = Number(u.searchParams.get('p') || 13);
  if (!(seat >= 1 && seat <= 300)) return NextResponse.redirect(new URL('/admin/results', u));
  return NextResponse.redirect(new URL(`/admin/results/${seat}?p=${p}`, u));
}
