/**
 * A small PostgREST client with the service key, for the posts sync. It runs
 * in the cron route and in scripts/sync-posts.ts under plain Node, where the
 * admin's server-only Supabase client cannot be imported.
 */
export class DbError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
  }
}

/** The posts tables do not exist yet: supabase/migrations/003_posts.sql has not been run. */
export const isMissingTable = (e: unknown) =>
  e instanceof DbError && (e.status === 404 || /PGRST205|42P01|does not exist|schema cache/i.test(e.body));

export interface Db {
  get<T>(path: string): Promise<T>;
  insert<T>(table: string, rows: object | object[]): Promise<T[]>;
  patch(path: string, body: object): Promise<void>;
}

export function restDb(): Db | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.text();
    if (!res.ok) throw new DbError(`Supabase ${init.method ?? 'GET'} ${path.split('?')[0]} -> ${res.status}`, res.status, body);
    return body ? JSON.parse(body) : null;
  };
  return {
    get: (path) => call(path),
    insert: (table, rows) => call(table, { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'return=representation' } }),
    patch: async (path, body) => { await call(path, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } }); },
  };
}
