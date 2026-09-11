'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseSession } from '@/lib/supabase/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin/auth';
import {
  EDITABLE, type EntityType, setOverride, clearOverride, setHidden,
  upsertNews, setNewsStatus, resolveCorrection, addAdmin, removeAdmin, audit,
  upsertResult, setResultStatus, socialOverrides, dropSocialSource, dropBioFromWiki,
} from '@/lib/admin/store';
import { SOCIAL_HOSTS, validSocialUrl, parseSocialLines } from '@/lib/admin/social-import';
import { allMembers } from '@/lib/data';

export interface ActionState { error?: string; ok?: string }

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};
const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

const validUrl = validSocialUrl;

/* ---------------- session ---------------- */

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, 'email').trim().toLowerCase();
  const password = str(fd, 'password');
  if (!email || !password) return { error: 'ইমেইল ও পাসওয়ার্ড দুটোই লাগবে।' };
  const sb = await supabaseSession();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: 'ইমেইল বা পাসওয়ার্ড মেলেনি।' };
  redirect('/admin');
}

export async function signOut() {
  const sb = await supabaseSession();
  await sb.auth.signOut();
  redirect('/admin/login');
}

/** Change the signed-in admin's own password. Runs against their session, not the service key. */
export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const password = str(fd, 'password');
  const confirm = str(fd, 'confirm');
  if (password.length < 10) return { error: 'পাসওয়ার্ড কমপক্ষে ১০ অক্ষরের হতে হবে।' };
  if (password !== confirm) return { error: 'দুই ঘরের পাসওয়ার্ড মেলেনি।' };
  const sb = await supabaseSession();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: `বদলানো যায়নি: ${error.message}` };
  await audit(me, { action: 'user.password', entity_type: 'admin_user', entity_id: me.id, field: null, old_value: null, new_value: null });
  return { ok: 'পাসওয়ার্ড বদলে গেছে। পরের বার থেকে নতুনটি দিয়ে লগইন করুন।' };
}

/* ---------------- overrides ---------------- */

/**
 * Saves every field on the form that differs from what the site currently
 * shows. Each changed field becomes its own override row and audit entry, so a
 * later revert can be done per field.
 */
export async function saveOverrides(fd: FormData) {
  const me = await requireAdmin();
  const type = str(fd, 'entity_type') as EntityType;
  const id = str(fd, 'entity_id');
  if (!EDITABLE[type] || !id) throw new Error('bad entity');

  let invalid: string | null = null;
  let socialSaved = false;
  const bioSaved: string[] = [];
  for (const f of EDITABLE[type]) {
    const next = orNull(str(fd, `field__${f.key}`));
    const current = orNull(str(fd, `current__${f.key}`));
    if (next === current) continue;
    if (type === 'member' && next && f.key in SOCIAL_HOSTS && !validUrl(next, SOCIAL_HOSTS[f.key as keyof typeof SOCIAL_HOSTS])) {
      invalid = f.key;
      continue;
    }
    await setOverride(me, type, id, f.key, next, current);
    if (f.key in SOCIAL_HOSTS) socialSaved = true;
    if (['educationBn', 'birthPlaceBn', 'professionBn'].includes(f.key)) bioSaved.push(f.key);
  }
  if (type === 'member' && bioSaved.length) await dropBioFromWiki(me, id, bioSaved);
  // The editor has now seen and saved this member's links on one form.
  if (type === 'member' && socialSaved) await dropSocialSource(me, id);
  if (invalid) redirect(`/admin/${type === 'member' ? 'members' : type + 's'}/${id}?invalid=${invalid}`);
  revalidatePath(`/admin/${type === 'member' ? 'members' : type + 's'}/${id}`);
  redirect(`/admin/${type === 'member' ? 'members' : type + 's'}/${id}?saved=1`);
}

export interface SocialImportState {
  error?: string;
  saved?: number;
  unchanged?: number;
  lines?: { line: number; raw: string; who?: string; ok: boolean; message: string }[];
}

/**
 * Many members' social links at once. Each changed link becomes its own
 * override and audit entry, exactly as if it had been typed on the member's
 * page; lines that cannot be read are reported and nothing is guessed.
 */
export async function importSocialLinks(_prev: SocialImportState, fd: FormData): Promise<SocialImportState> {
  const me = await requireAdmin();
  const text = str(fd, 'lines');
  if (!text.trim()) return { error: 'কোনো লাইন দেওয়া হয়নি।' };
  const parsed = parseSocialLines(text, allMembers);
  const ids = [...new Set(parsed.filter((p) => !p.error && p.memberId).map((p) => p.memberId!))];
  const current = await socialOverrides(ids);
  const byId = new Map(allMembers.map((m) => [m.id, m]));
  let saved = 0;
  let unchanged = 0;
  const lines: NonNullable<SocialImportState['lines']> = [];
  const label: Record<string, string> = { facebook: 'Facebook', x: 'X', youtube: 'YouTube', instagram: 'Instagram', website: 'ওয়েবসাইট' };
  for (const p of parsed) {
    if (p.error || !p.memberId) {
      lines.push({ line: p.line, raw: p.raw, ok: false, message: p.error ?? 'পড়া যায়নি' });
      continue;
    }
    const shown = byId.get(p.memberId) as unknown as Record<string, string | null> | undefined;
    const changed: string[] = [];
    for (const l of p.links) {
      const own = current.get(p.memberId);
      const before = own && l.key in own ? (own[l.key] ?? null) : (shown?.[l.key] ?? null);
      if (before === l.url) {
        unchanged++;
        continue;
      }
      await setOverride(me, 'member', p.memberId, l.key, l.url, before);
      saved++;
      changed.push(label[l.key] ?? l.key);
    }
    lines.push({ line: p.line, raw: p.raw, who: p.memberName, ok: true, message: changed.length ? `সংরক্ষিত: ${changed.join(', ')}` : 'আগের মতোই আছে' });
  }
  revalidatePath('/admin/social');
  return { saved, unchanged, lines };
}

export async function revertOverride(fd: FormData) {
  const me = await requireAdmin();
  const type = str(fd, 'entity_type') as EntityType;
  const id = str(fd, 'entity_id');
  const field = str(fd, 'field');
  if (!EDITABLE[type]?.some((f) => f.key === field)) throw new Error('bad field');
  // The revert button submits the whole edit form, so the current value travels as current__<field>.
  await clearOverride(me, type, id, field, orNull(str(fd, `current__${field}`)));
  const seg = type === 'member' ? 'members' : type + 's';
  revalidatePath(`/admin/${seg}/${id}`);
  redirect(`/admin/${seg}/${id}?reverted=1`);
}

export async function toggleHidden(fd: FormData) {
  const me = await requireAdmin();
  const type = str(fd, 'entity_type') as 'member' | 'committee';
  const id = str(fd, 'entity_id');
  const hide = str(fd, 'hide') === '1';
  await setHidden(me, type, id, hide, orNull(str(fd, 'reason')));
  const seg = type === 'member' ? 'members' : 'committees';
  revalidatePath(`/admin/${seg}/${id}`);
  redirect(`/admin/${seg}/${id}?${hide ? 'hidden' : 'unhidden'}=1`);
}

/* ---------------- news ---------------- */

export async function saveNews(fd: FormData) {
  const me = await requireAdmin();
  const id = orNull(str(fd, 'id'));
  const input = {
    title_bn: str(fd, 'title_bn').trim(),
    source_name: str(fd, 'source_name').trim(),
    source_url: str(fd, 'source_url').trim(),
    published_on: str(fd, 'published_on').trim(),
    excerpt_bn: orNull(str(fd, 'excerpt_bn')),
    member_id: orNull(str(fd, 'member_id')),
    seat_slug: orNull(str(fd, 'seat_slug')),
  };
  if (!input.title_bn || !input.source_name || !input.source_url || !input.published_on) {
    throw new Error('শিরোনাম, সূত্র, লিংক ও তারিখ লাগবে।');
  }
  if (!/^https?:\/\//.test(input.source_url)) throw new Error('লিংক http:// বা https:// দিয়ে শুরু হতে হবে।');
  const savedId = await upsertNews(me, id, input);
  revalidatePath('/admin/news');
  redirect(`/admin/news/${savedId}?saved=1`);
}

export async function changeNewsStatus(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status') as 'draft' | 'published' | 'rejected';
  if (!['draft', 'published', 'rejected'].includes(status)) throw new Error('bad status');
  await setNewsStatus(me, id, status);
  revalidatePath('/admin/news');
  redirect(`/admin/news/${id}?status=${status}`);
}

/* ---------------- corrections ---------------- */

export async function decideCorrection(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status') as 'accepted' | 'rejected';
  if (!['accepted', 'rejected'].includes(status)) throw new Error('bad status');
  await resolveCorrection(me, id, status, orNull(str(fd, 'note')));
  revalidatePath('/admin/corrections');
  redirect('/admin/corrections');
}

/* ---------------- users ---------------- */

export async function createAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSuperAdmin();
  const email = str(fd, 'email').trim().toLowerCase();
  const role = str(fd, 'role') === 'super_admin' ? 'super_admin' : 'editor';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'ইমেইল ঠিকানাটি সঠিক নয়।' };
  try {
    const { tempPassword } = await addAdmin(me, email, role);
    revalidatePath('/admin/users');
    return {
      ok: tempPassword
        ? `${email} যোগ হয়েছে। সাময়িক পাসওয়ার্ড (একবারই দেখানো হবে): ${tempPassword}`
        : `${email} যোগ হয়েছে। আগের পাসওয়ার্ড দিয়েই লগইন করতে পারবেন।`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'যোগ করা যায়নি।' };
  }
}

export async function deleteAdmin(fd: FormData) {
  const me = await requireSuperAdmin();
  const userId = str(fd, 'user_id');
  if (userId === me.id) throw new Error('নিজেকে সরানো যাবে না।');
  await removeAdmin(me, userId);
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

/* ---------------- publish ---------------- */

/**
 * Rebuilds the public site. The build fetches parliament.gov.bd again, applies
 * every override and hidden flag, pulls the published news, and prerenders all
 * pages. Nothing an admin saves is visible to the public until this runs.
 */
export async function publishSite(): Promise<ActionState> {
  const me = await requireAdmin();
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return { error: 'VERCEL_DEPLOY_HOOK_URL সেট করা নেই। Vercel → Settings → Git → Deploy Hooks থেকে একটি তৈরি করে env-এ দিন।' };
  const res = await fetch(hook, { method: 'POST' });
  await audit(me, { action: 'site.publish', entity_type: null, entity_id: null, field: null, old_value: null, new_value: res.ok ? 'triggered' : `failed ${res.status}` });
  if (!res.ok) return { error: `Vercel ফিরিয়ে দিয়েছে: HTTP ${res.status}` };
  return { ok: 'সাইট নতুন করে তৈরি হচ্ছে। ২-৩ মিনিটের মধ্যে পরিবর্তন mymp.bd-তে দেখা যাবে।' };
}

/* ---------------- election results ---------------- */

const toLatinDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
const numOrNull = (s: string) => {
  const t = toLatinDigits(s).replace(/[^\d.]/g, '');
  return t === '' ? null : Number(t);
};

export async function saveResult(fd: FormData) {
  const me = await requireAdmin();
  const seatNo = Number(str(fd, 'seat_no'));
  const parliamentNo = Number(str(fd, 'parliament_no'));
  if (!(seatNo >= 1 && seatNo <= 300) || !(parliamentNo >= 1 && parliamentNo <= 20)) throw new Error('bad seat');
  const back = `/admin/results/${seatNo}?p=${parliamentNo}`;

  // One candidate per line: name | party | votes
  const candidates = str(fd, 'candidates')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name = '', party = '', votes = ''] = l.split('|').map((x) => x.trim());
      const v = toLatinDigits(votes).replace(/[^\d]/g, '');
      return { name, party: party || null, votes: v === '' ? NaN : Number(v) };
    });
  if (!candidates.length || candidates.some((c) => !c.name || !Number.isFinite(c.votes) || c.votes < 0)) redirect(`${back}&invalid=candidates`);

  const sourceUrl = str(fd, 'source_url').trim();
  if (!/^https:\/\/\S+$/.test(sourceUrl)) redirect(`${back}&invalid=source`);

  const status = str(fd, 'status') === 'published' ? 'published' : 'draft';
  await upsertResult(me, {
    seat_no: seatNo,
    parliament_no: parliamentNo,
    candidates: candidates.sort((a, b) => b.votes - a.votes),
    total_votes: numOrNull(str(fd, 'total_votes')),
    turnout: numOrNull(str(fd, 'turnout')),
    source_url: sourceUrl,
    source_note: orNull(str(fd, 'source_note')),
    status,
  });
  revalidatePath('/admin/results');
  redirect(`${back}&saved=1`);
}

export async function changeResultStatus(fd: FormData) {
  const me = await requireAdmin();
  const seatNo = Number(str(fd, 'seat_no'));
  const parliamentNo = Number(str(fd, 'parliament_no'));
  const status = str(fd, 'status') === 'published' ? 'published' : 'draft';
  await setResultStatus(me, seatNo, parliamentNo, status);
  revalidatePath('/admin/results');
  redirect(`/admin/results/${seatNo}?p=${parliamentNo}&status=${status}`);
}
