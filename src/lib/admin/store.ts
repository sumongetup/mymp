import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type EntityType = 'member' | 'seat' | 'party' | 'committee';

/** Which fields an admin may override, per entity. Keys are the JSON keys in data/. */
export const EDITABLE: Record<EntityType, { key: string; label: string; multiline?: boolean; url?: boolean; group?: string; hint?: string }[]> = {
  member: [
    { key: 'nameBn', label: 'নাম (বাংলা)' },
    { key: 'nameEn', label: 'নাম (English)' },
    { key: 'professionBn', label: 'পেশা' },
    { key: 'educationBn', label: 'শিক্ষা', multiline: true, hint: 'প্রতিষ্ঠান ও ডিগ্রি; একাধিক হলে সেমিকোলন (;) দিয়ে আলাদা করুন।' },
    { key: 'birthPlaceBn', label: 'জন্মস্থান' },
    { key: 'partyRoleBn', label: 'দলীয় পদ', hint: 'যেমন চেয়ারম্যান বা মহাসচিব; শুধু নির্ভরযোগ্য সূত্রে নিশ্চিত হলে। পাতার বিবরণে দেখায়।' },
    { key: 'ministryBn', label: 'মন্ত্রণালয়', hint: 'যেমন স্বরাষ্ট্র মন্ত্রণালয়; নিচে সরকারি পদও দিন।' },
    { key: 'govPost', label: 'সরকারি পদ', hint: 'মন্ত্রী, প্রতিমন্ত্রী অথবা উপমন্ত্রী।' },
    { key: 'email', label: 'দাপ্তরিক ইমেইল' },
    { key: 'presentAddressBn', label: 'বর্তমান ঠিকানা', multiline: true },
    { key: 'bioBn', label: 'জীবনী', multiline: true },
    { key: 'facebook', label: 'Facebook পেজ', url: true, group: 'অফিসিয়াল সোশ্যাল মিডিয়া', hint: 'শুধু সদস্যের নিজের বা তাঁর দপ্তরের নিশ্চিত পেজ। পুরো লিংক দিন, যেমন https://www.facebook.com/…' },
    { key: 'x', label: 'X (Twitter)', url: true },
    { key: 'youtube', label: 'YouTube চ্যানেল', url: true },
    { key: 'instagram', label: 'Instagram', url: true },
    { key: 'website', label: 'ব্যক্তিগত বা দাপ্তরিক ওয়েবসাইট', url: true },
  ],
  seat: [
    { key: 'nameBn', label: 'আসনের নাম (বাংলা)' },
    { key: 'nameEn', label: 'আসনের নাম (English)' },
    { key: 'boundaryBn', label: 'এলাকার বিবরণ', multiline: true },
  ],
  party: [
    { key: 'nameBn', label: 'দলের নাম (বাংলা)' },
    { key: 'nameEn', label: 'দলের নাম (English)' },
  ],
  committee: [
    { key: 'nameBn', label: 'কমিটির নাম (বাংলা)' },
    { key: 'nameEn', label: 'কমিটির নাম (English)' },
  ],
};

export interface Override {
  entity_type: EntityType;
  entity_id: string;
  field: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Hidden {
  entity_type: 'member' | 'committee';
  entity_id: string;
  reason: string | null;
  hidden_at: string;
}

export interface NewsRow {
  id: string;
  title_bn: string;
  source_name: string;
  source_url: string;
  published_on: string;
  excerpt_bn: string | null;
  member_id: string | null;
  seat_slug: string | null;
  status: 'draft' | 'published' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CorrectionRow {
  id: string;
  page_path: string;
  message: string;
  reporter_name: string | null;
  reporter_email: string | null;
  status: 'open' | 'accepted' | 'rejected';
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditRow {
  id: number;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SyncRunRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  members: number | null;
  committees: number | null;
  overrides_applied: number | null;
  message: string | null;
}

export interface AdminUserRow {
  user_id: string;
  email: string;
  role: 'super_admin' | 'editor';
  created_at: string;
}

interface Actor { id: string; email: string }

export async function audit(a: Actor, entry: Omit<AuditRow, 'id' | 'actor_email' | 'created_at'>) {
  await supabaseAdmin().from('audit_log').insert({ actor: a.id, actor_email: a.email, ...entry });
}

/* ---------------- overrides ---------------- */

export async function overridesFor(type: EntityType, id: string): Promise<Override[]> {
  const { data } = await supabaseAdmin()
    .from('overrides').select('*').eq('entity_type', type).eq('entity_id', id);
  return (data ?? []) as Override[];
}

export async function overrideCounts(): Promise<Record<EntityType, number>> {
  const out: Record<EntityType, number> = { member: 0, seat: 0, party: 0, committee: 0 };
  const { data } = await supabaseAdmin().from('overrides').select('entity_type');
  for (const r of data ?? []) out[r.entity_type as EntityType]++;
  return out;
}

/** Current social-link overrides for a set of members: id → field → value. */
export async function socialOverrides(ids: string[]): Promise<Map<string, Record<string, string | null>>> {
  const out = new Map<string, Record<string, string | null>>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabaseAdmin()
      .from('overrides')
      .select('entity_id,field,value')
      .eq('entity_type', 'member')
      .in('entity_id', ids.slice(i, i + 100))
      .in('field', ['facebook', 'x', 'youtube', 'instagram', 'website']);
    for (const r of data ?? []) out.set(r.entity_id, { ...(out.get(r.entity_id) ?? {}), [r.field]: r.value });
  }
  return out;
}

export async function setOverride(a: Actor, type: EntityType, id: string, field: string, value: string | null, oldValue: string | null) {
  if (!EDITABLE[type].some((f) => f.key === field) && !(type === 'member' && field === 'bioFromWiki')) throw new Error(`Field ${field} is not editable on ${type}.`);
  const db = supabaseAdmin();
  await db.from('overrides').upsert(
    { entity_type: type, entity_id: id, field, value, updated_by: a.id, updated_at: new Date().toISOString() },
    { onConflict: 'entity_type,entity_id,field' },
  );
  await audit(a, { action: 'override.set', entity_type: type, entity_id: id, field, old_value: oldValue, new_value: value });
}

/**
 * Once an editor saves a member's links, they are the editor's: the note that
 * the engine read them from Wikipedia is dropped (and the drop audited).
 */
export async function dropSocialSource(a: Actor, id: string) {
  const { data } = await supabaseAdmin()
    .from('overrides').select('value').match({ entity_type: 'member', entity_id: id, field: 'socialSource' }).maybeSingle();
  if (data) await clearOverride(a, 'member', id, 'socialSource', (data.value as string | null) ?? null);
}

/**
 * Once an editor saves education, birthplace or profession, that field is the
 * editor's: it leaves the list of fields shown as read from Wikipedia.
 */
export async function dropBioFromWiki(a: Actor, id: string, fields: string[]) {
  const { data } = await supabaseAdmin()
    .from('overrides').select('value').match({ entity_type: 'member', entity_id: id, field: 'bioFromWiki' }).maybeSingle();
  if (!data?.value) return;
  const before = String(data.value);
  const left = before.split(',').map((x) => x.trim()).filter((x) => x && !fields.includes(x));
  if (left.length) await setOverride(a, 'member', id, 'bioFromWiki', left.join(','), before);
  else await clearOverride(a, 'member', id, 'bioFromWiki', before);
}

export async function clearOverride(a: Actor, type: EntityType, id: string, field: string, oldValue: string | null) {
  await supabaseAdmin().from('overrides').delete().match({ entity_type: type, entity_id: id, field });
  await audit(a, { action: 'override.clear', entity_type: type, entity_id: id, field, old_value: oldValue, new_value: null });
}

/* ---------------- hidden ---------------- */

export async function hiddenList(): Promise<Hidden[]> {
  const { data } = await supabaseAdmin().from('hidden_entities').select('*');
  return (data ?? []) as Hidden[];
}

export async function isHidden(type: 'member' | 'committee', id: string): Promise<Hidden | null> {
  const { data } = await supabaseAdmin().from('hidden_entities').select('*').match({ entity_type: type, entity_id: id }).maybeSingle();
  return (data as Hidden | null) ?? null;
}

export async function setHidden(a: Actor, type: 'member' | 'committee', id: string, hidden: boolean, reason: string | null) {
  const db = supabaseAdmin();
  if (hidden) {
    await db.from('hidden_entities').upsert({ entity_type: type, entity_id: id, reason, hidden_by: a.id, hidden_at: new Date().toISOString() });
  } else {
    await db.from('hidden_entities').delete().match({ entity_type: type, entity_id: id });
  }
  await audit(a, { action: hidden ? 'entity.hide' : 'entity.unhide', entity_type: type, entity_id: id, field: null, old_value: null, new_value: reason });
}

/* ---------------- news ---------------- */

export async function listNews(status?: NewsRow['status']): Promise<NewsRow[]> {
  let q = supabaseAdmin().from('news_posts').select('*').order('published_on', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as NewsRow[];
}

export async function getNews(id: string): Promise<NewsRow | null> {
  const { data } = await supabaseAdmin().from('news_posts').select('*').eq('id', id).maybeSingle();
  return (data as NewsRow | null) ?? null;
}

export type NewsInput = Pick<NewsRow, 'title_bn' | 'source_name' | 'source_url' | 'published_on' | 'excerpt_bn' | 'member_id' | 'seat_slug'>;

export async function upsertNews(a: Actor, id: string | null, input: NewsInput): Promise<string> {
  const db = supabaseAdmin();
  if (id) {
    const before = await getNews(id);
    await db.from('news_posts').update({ ...input, updated_by: a.id, updated_at: new Date().toISOString() }).eq('id', id);
    await audit(a, { action: 'news.update', entity_type: 'news', entity_id: id, field: null, old_value: before?.title_bn ?? null, new_value: input.title_bn });
    return id;
  }
  const { data, error } = await db.from('news_posts').insert({ ...input, created_by: a.id, updated_by: a.id }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'insert failed');
  await audit(a, { action: 'news.create', entity_type: 'news', entity_id: data.id, field: null, old_value: null, new_value: input.title_bn });
  return data.id as string;
}

export async function setNewsStatus(a: Actor, id: string, status: NewsRow['status']) {
  const before = await getNews(id);
  await supabaseAdmin().from('news_posts').update({ status, updated_by: a.id, updated_at: new Date().toISOString() }).eq('id', id);
  await audit(a, { action: `news.${status}`, entity_type: 'news', entity_id: id, field: 'status', old_value: before?.status ?? null, new_value: status });
}

/* ---------------- corrections ---------------- */

export async function listCorrections(status?: CorrectionRow['status']): Promise<CorrectionRow[]> {
  let q = supabaseAdmin().from('corrections').select('*').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as CorrectionRow[];
}

export async function resolveCorrection(a: Actor, id: string, status: 'accepted' | 'rejected', note: string | null) {
  await supabaseAdmin().from('corrections').update({ status, resolution_note: note, resolved_by: a.id, resolved_at: new Date().toISOString() }).eq('id', id);
  await audit(a, { action: 'correction.resolve', entity_type: 'correction', entity_id: id, field: 'status', old_value: 'open', new_value: status });
}

/* ---------------- audit / sync / users ---------------- */

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const { data } = await supabaseAdmin().from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as AuditRow[];
}

export async function listSyncRuns(limit = 30): Promise<SyncRunRow[]> {
  const { data } = await supabaseAdmin().from('sync_runs').select('*').order('started_at', { ascending: false }).limit(limit);
  return (data ?? []) as SyncRunRow[];
}

export async function listAdmins(): Promise<AdminUserRow[]> {
  const { data } = await supabaseAdmin().from('admin_users').select('*').order('created_at');
  return (data ?? []) as AdminUserRow[];
}

/** Creates the auth user (if new) and the admin row. Returns the temporary password when a user was created. */
export async function addAdmin(a: Actor, email: string, role: AdminUserRow['role']): Promise<{ tempPassword: string | null }> {
  const db = supabaseAdmin();
  const clean = email.trim().toLowerCase();
  let userId: string | null = null;
  let tempPassword: string | null = null;

  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users.find((u) => (u.email ?? '').toLowerCase() === clean);
  if (found) {
    userId = found.id;
  } else {
    tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
    const { data: created, error } = await db.auth.admin.createUser({ email: clean, password: tempPassword, email_confirm: true });
    if (error || !created.user) throw new Error(error?.message ?? 'could not create user');
    userId = created.user.id;
  }

  await db.from('admin_users').upsert({ user_id: userId, email: clean, role });
  await audit(a, { action: 'user.add', entity_type: 'admin_user', entity_id: userId, field: 'role', old_value: null, new_value: role });
  return { tempPassword };
}

export async function removeAdmin(a: Actor, userId: string) {
  const { data: row } = await supabaseAdmin().from('admin_users').select('email, role').eq('user_id', userId).maybeSingle();
  await supabaseAdmin().from('admin_users').delete().eq('user_id', userId);
  await audit(a, { action: 'user.remove', entity_type: 'admin_user', entity_id: userId, field: null, old_value: row ? `${row.email} (${row.role})` : null, new_value: null });
}

export async function counts() {
  const db = supabaseAdmin();
  const c = async (table: string, filter?: [string, string]) => {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count } = await q;
    return count ?? 0;
  };
  return {
    overrides: await c('overrides'),
    hidden: await c('hidden_entities'),
    newsDraft: await c('news_posts', ['status', 'draft']),
    newsPublished: await c('news_posts', ['status', 'published']),
    correctionsOpen: await c('corrections', ['status', 'open']),
    admins: await c('admin_users'),
  };
}

/* ---------------- election results (entered from the EC gazette) ---------------- */

export interface ResultRow {
  id: string;
  seat_no: number;
  parliament_no: number;
  candidates: { name: string; party: string | null; votes: number }[];
  total_votes: number | null;
  turnout: number | null;
  source_url: string;
  source_note: string | null;
  status: 'draft' | 'published';
  updated_at: string;
}

export async function listResults(): Promise<ResultRow[]> {
  const { data, error } = await supabaseAdmin()
    .from('election_results')
    .select('id,seat_no,parliament_no,candidates,total_votes,turnout,source_url,source_note,status,updated_at')
    .order('seat_no')
    .order('parliament_no', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ResultRow[];
}

export async function getResult(seatNo: number, parliamentNo: number): Promise<ResultRow | null> {
  const { data, error } = await supabaseAdmin()
    .from('election_results')
    .select('id,seat_no,parliament_no,candidates,total_votes,turnout,source_url,source_note,status,updated_at')
    .eq('seat_no', seatNo)
    .eq('parliament_no', parliamentNo)
    .maybeSingle();
  if (error) throw error;
  return (data as ResultRow | null) ?? null;
}

export async function upsertResult(a: Actor, input: Omit<ResultRow, 'id' | 'updated_at'>) {
  const db = supabaseAdmin();
  const { error } = await db
    .from('election_results')
    .upsert({ ...input, updated_by: a.id, updated_at: new Date().toISOString() }, { onConflict: 'seat_no,parliament_no' });
  if (error) throw error;
  await audit(a, {
    action: 'result.save', entity_type: 'seat', entity_id: String(input.seat_no), field: `parliament ${input.parliament_no}`,
    old_value: null, new_value: `${input.candidates.length} candidates, ${input.status}`,
  });
}

export async function setResultStatus(a: Actor, seatNo: number, parliamentNo: number, status: ResultRow['status']) {
  const { error } = await supabaseAdmin()
    .from('election_results')
    .update({ status, updated_by: a.id, updated_at: new Date().toISOString() })
    .eq('seat_no', seatNo)
    .eq('parliament_no', parliamentNo);
  if (error) throw error;
  await audit(a, { action: `result.${status}`, entity_type: 'seat', entity_id: String(seatNo), field: `parliament ${parliamentNo}`, old_value: null, new_value: status });
}
