/**
 * Bulk entry of members' official social links, one member per line:
 *
 *   ঢাকা-১৭ | https://facebook.com/… https://x.com/…
 *   tarique-rahman https://www.youtube.com/@…
 *   Tanvir Hasan  facebook.com/…
 *
 * The line starts with something that names one member: the seat (Bangla or
 * English), the member's name, their page slug or source id. Anything in
 * brackets is ignored, so a worklist line "ঢাকা-১৭ (নাম) |" works as written.
 * Every link is sorted to its network by its address; a link a network would
 * not serve (facebook.com under "x") cannot happen, and anything that is not
 * https is upgraded or refused. Lines that cannot be read are reported back,
 * never guessed.
 */
import type { Member } from '@/lib/data';

export const SOCIAL_KEYS = ['facebook', 'x', 'youtube', 'instagram', 'website'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** Social links must point at the network they claim to; anything else is refused, not stored. */
export const SOCIAL_HOSTS: Record<SocialKey, string[] | null> = {
  facebook: ['facebook.com', 'fb.com', 'fb.me'],
  x: ['x.com', 'twitter.com'],
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
  website: null,
};

const bareHost = (h: string) => h.toLowerCase().replace(/^(www|m|mobile|web)\./, '');

export function validSocialUrl(value: string, hosts: string[] | null): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return false;
    if (!hosts) return true;
    const h = bareHost(u.hostname);
    return hosts.some((x) => h === x || h.endsWith(`.${x}`));
  } catch {
    return false;
  }
}

/** Which network an address belongs to; everything unknown is the member's website. */
export function networkOf(url: string): SocialKey {
  const h = bareHost(new URL(url).hostname);
  for (const key of ['facebook', 'x', 'youtube', 'instagram'] as const) {
    if (SOCIAL_HOSTS[key]!.some((x) => h === x || h.endsWith(`.${x}`))) return key;
  }
  return 'website';
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Loose key for matching what an editor typed against names and seats. */
export const lookupKey = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[‌‍]/g, '')
    .toLowerCase()
    .replace(/[\s._,:;|'"’()\-–]+/g, '');

const URLISH = /^(https?:\/\/|www\.)|^[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|bd|me|io|tv|info|co)(\/|$)/i;

export interface ParsedLine {
  line: number;
  raw: string;
  memberId?: string;
  memberName?: string;
  links: { key: SocialKey; url: string }[];
  error?: string;
}

export function memberIndex(members: Member[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const add = (k: string | null | undefined, id: string) => {
    if (!k) return;
    const key = lookupKey(k);
    if (!key) return;
    index.set(key, (index.get(key) ?? new Set()).add(id));
  };
  for (const m of members) {
    add(m.id, m.id);
    add(m.slug, m.id);
    add(m.nameBn, m.id);
    add(m.nameEn, m.id);
    add(m.seat?.nameBn, m.id);
    add(m.seat?.nameEn, m.id);
    add(m.seat?.slug, m.id);
  }
  return index;
}

export function parseSocialLines(text: string, members: Member[]): ParsedLine[] {
  const index = memberIndex(members);
  const byId = new Map(members.map((m) => [m.id, m]));
  const out: ParsedLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parsed: ParsedLine = { line: i + 1, raw: line, links: [] };
    out.push(parsed);

    const tokens = line.split(/[\s|,]+/).filter(Boolean);
    const firstUrl = tokens.findIndex((t) => URLISH.test(t));
    if (firstUrl < 0) {
      parsed.error = 'কোনো লিংক নেই';
      return;
    }
    const who = line.slice(0, line.indexOf(tokens[firstUrl]!)).replace(/\(.*?\)/g, ' ').replace(/[|:,\s]+$/, '').trim();
    if (!who) {
      parsed.error = 'লাইনের শুরুতে আসন বা সদস্যের নাম নেই';
      return;
    }
    const ids = index.get(lookupKey(who));
    if (!ids || ids.size === 0) {
      parsed.error = `“${who}” নামে কোনো সদস্য বা আসন পাওয়া যায়নি`;
      return;
    }
    if (ids.size > 1) {
      parsed.error = `“${who}” একাধিক সদস্যের সঙ্গে মেলে; আসনের নাম দিন`;
      return;
    }
    const id = [...ids][0]!;
    parsed.memberId = id;
    parsed.memberName = byId.get(id)?.nameBn ?? byId.get(id)?.nameEn ?? id;

    for (const t of tokens.slice(firstUrl)) {
      if (!URLISH.test(t)) continue;
      let url = t.replace(/[).,;]+$/, '');
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      url = url.replace(/^http:\/\//i, 'https://');
      let key: SocialKey;
      try {
        key = networkOf(url);
      } catch {
        parsed.error = `লিংকটি পড়া গেল না: ${t}`;
        return;
      }
      if (!validSocialUrl(url, SOCIAL_HOSTS[key])) {
        parsed.error = `লিংকটি ঠিক নয়: ${t}`;
        return;
      }
      if (parsed.links.some((l) => l.key === key)) {
        parsed.error = `একই লাইনে দুটি ${key === 'website' ? 'ওয়েবসাইট' : key} লিংক`;
        return;
      }
      parsed.links.push({ key, url });
    }
  });
  return out;
}
