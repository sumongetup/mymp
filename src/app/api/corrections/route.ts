/**
 * A visitor's correction to a page, into the admin queue (/admin/corrections)
 * that already existed for it (owner, 2026-09-12: "সংশোধন জানান" on every
 * member's page). Anyone may post, so the route only ever inserts one row of
 * plain text, and turns away what looks automated:
 * - a hidden field people never see (bots fill it in),
 * - a form sent back faster than a person can type,
 * - more than a few reports from one address in ten minutes (per warm
 *   instance only; the other two carry the weight).
 * Anything turned away for looking automated still gets "ok", so a bot
 * learns nothing.
 */
export const dynamic = 'force-dynamic';

const LIMIT = { message: 1500, source: 500, name: 100, email: 200 };
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 5;
const recent = new Map<string, number[]>();

// Only pages of this site, in the shapes it has.
const PAGE = /^\/(?:(?:mp|ason|dol|committee|jela)\/[a-z0-9-]+|[a-z-]*)$/;

const bad = (field: string) => Response.json({ ok: false, field }, { status: 400 });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('body');
  }
  const text = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');

  // Automated-looking: accept silently, store nothing.
  const elapsed = typeof body.elapsed === 'number' ? body.elapsed : 0;
  if (text('website') || elapsed < 3000) return Response.json({ ok: true });

  const page = text('page');
  const message = text('message');
  const source = text('source');
  const name = text('name');
  const email = text('email');
  if (!PAGE.test(page)) return bad('page');
  if (message.length < 10 || message.length > LIMIT.message) return bad('message');
  if (source && (source.length > LIMIT.source || !/^https?:\/\/\S+$/.test(source))) return bad('source');
  if (name.length > LIMIT.name) return bad('name');
  if (email && (email.length > LIMIT.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return bad('email');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const mine = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (mine.length >= PER_WINDOW) return Response.json({ ok: false, field: 'rate' }, { status: 429 });
  recent.set(ip, [...mine, now]);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ ok: false, field: 'server' }, { status: 503 });

  const r = await fetch(`${url}/rest/v1/corrections`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      page_path: page,
      // The table has no source column; the link goes under the message, where the queue shows it.
      message: source ? `${message}\n\nসূত্র: ${source}` : message,
      reporter_name: name || null,
      reporter_email: email || null,
    }),
  });
  if (!r.ok) return Response.json({ ok: false, field: 'server' }, { status: 502 });
  return Response.json({ ok: true });
}
