import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Keeps the admin session alive. Supabase access tokens expire hourly; this
 * refreshes them on each /admin request and writes the new cookies back.
 * It matches ONLY /admin, so public pages are never touched and stay static.
 */
export default async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const c of list) request.cookies.set(c.name, c.value);
        response = NextResponse.next({ request });
        for (const c of list) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });

  // Touching the user is what triggers the refresh.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
