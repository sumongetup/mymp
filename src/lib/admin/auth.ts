import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseSession, supabaseConfigured } from '@/lib/supabase/server';
import { supabaseAdmin, serviceConfigured } from '@/lib/supabase/admin';

export type Role = 'super_admin' | 'editor';
export interface AdminIdentity {
  id: string;
  email: string;
  role: Role;
}

export const adminConfigured = () => supabaseConfigured() && serviceConfigured();

/** Who is signed in, or null. Does not check whether they are an admin. */
export async function currentUser(): Promise<{ id: string; email: string } | null> {
  if (!supabaseConfigured()) return null;
  const sb = await supabaseSession();
  const { data } = await sb.auth.getUser();
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}

/**
 * The signed-in user's admin row, or null if they are not an admin.
 *
 * Bootstrap: while admin_users is empty, the user whose email matches
 * ADMIN_BOOTSTRAP_EMAIL becomes the first super admin on their first sign-in.
 * After that, admins are only added from the Users screen.
 */
export async function adminIdentity(): Promise<AdminIdentity | null> {
  const user = await currentUser();
  if (!user) return null;
  const db = supabaseAdmin();

  const { data: row } = await db
    .from('admin_users')
    .select('user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (row) return { id: user.id, email: row.email, role: row.role as Role };

  const bootstrap = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? '').trim().toLowerCase();
  if (bootstrap && bootstrap === user.email.toLowerCase()) {
    const { count } = await db.from('admin_users').select('user_id', { count: 'exact', head: true });
    if (!count) {
      await db.from('admin_users').insert({ user_id: user.id, email: user.email, role: 'super_admin' });
      await db.from('audit_log').insert({
        actor: user.id, actor_email: user.email, action: 'user.bootstrap',
        entity_type: 'admin_user', entity_id: user.id, new_value: 'super_admin',
      });
      return { id: user.id, email: user.email, role: 'super_admin' };
    }
  }
  return null;
}

/** For pages and actions: redirect to the login screen unless an admin is signed in. */
export async function requireAdmin(): Promise<AdminIdentity> {
  if (!adminConfigured()) redirect('/admin/setup');
  const me = await adminIdentity();
  if (!me) redirect('/admin/login?denied=1');
  return me;
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const me = await requireAdmin();
  if (me.role !== 'super_admin') redirect('/admin?forbidden=1');
  return me;
}
