import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cookie-backed client for the signed-in admin's own session. Used only under
 * /admin: to sign in, sign out and find out who is calling. It is never
 * imported by a public page.
 */
export async function supabaseSession() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            for (const c of list) cookieStore.set(c.name, c.value, c.options);
          } catch {
            // Server components cannot set cookies; the proxy refreshes them instead.
          }
        },
      },
    },
  );
}
