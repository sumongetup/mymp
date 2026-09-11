/**
 * Turns the sources in config/sync-sources.ts into one flat list of posts.
 * Pure functions over the fetched text, so the tests can feed them a saved
 * page. The layout each parser expects is described in that config file.
 */

export type PostType = 'government' | 'parliament';

export interface ParsedPost {
  sourceKey: string;
  type: PostType;
  /** প্রধানমন্ত্রী, মন্ত্রী, প্রতিমন্ত্রী, উপমন্ত্রী, উপদেষ্টা, স্পিকার… */
  title: string;
  /** An adviser's rank as the list gives it, e.g. মন্ত্রীর পদমর্যাদা. */
  rankNote: string | null;
  ministryBn: string | null;
  nameBn: string;
  nameEn: string | null;
  /** The seat the parliament list names, e.g. "Bhola-3". */
  seatEn: string | null;
  photoUrl: string | null;
  appointedOn: string | null;
  /** When this post (this ministry) began: the list's বণ্টনের তারিখ or tenure start. */
  fromDate: string | null;
  /** Order in the source list. */
  order: number;
  sourceUrl: string;
}

export const GOVERNMENT_TITLES = ['প্রধানমন্ত্রী', 'মন্ত্রী', 'প্রতিমন্ত্রী', 'উপমন্ত্রী', 'উপদেষ্টা'] as const;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const latinDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const cellText = (html: string) =>
  decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

/** "১৭-০২-২০২৬", "০৬.০৬.২০২৬", "২১/০৮/২০২৬" → "2026-02-17"; anything else → null. */
export function parseBnDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = latinDigits(raw).match(/(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'].map((m) => m.normalize('NFC'));

/** "১২ মার্চ ২০২৬ -" → "2026-03-12". */
export function parseBnLongDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = latinDigits(raw.normalize('NFC'));
  const m = s.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  const month = BN_MONTHS.findIndex((x) => m[2]!.startsWith(x)) + 1;
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

/** "১. মন্ত্রিপরিষদ বিভাগ" → "মন্ত্রিপরিষদ বিভাগ". */
const cleanMinistry = (s: string) => s.replace(/^[০-৯\d]+\s*[.)]\s*/, '').trim() || null;

function canonicalTitle(raw: string): string {
  const t = raw.normalize('NFC').trim();
  if (t.includes('প্রধানমন্ত্রী')) return 'প্রধানমন্ত্রী';
  if (t.includes('প্রতিমন্ত্রী')) return 'প্রতিমন্ত্রী';
  if (t.includes('উপমন্ত্রী')) return 'উপমন্ত্রী';
  if (t.includes('উপদেষ্টা')) return 'উপদেষ্টা';
  if (t.includes('মন্ত্রী')) return 'মন্ত্রী';
  return t;
}

/** The visible tables of a portal page, each with the text just before it. */
function tablesOf(html: string): { html: string; before: string }[] {
  const out: { html: string; before: string }[] = [];
  const re = /<table[\s\S]*?<\/table>/g;
  let last = 0;
  for (const m of html.matchAll(re)) {
    const before = cellText(html.slice(Math.max(last, m.index! - 2000), m.index!).replace(/\s[\w-]+="[^"]*"/g, ''));
    out.push({ html: m[0], before: before.slice(-200) });
    last = m.index! + m[0].length;
  }
  return out;
}

/** The part of a page the parser reads; hashed so an unchanged list gives an unchanged hash. */
export function cabinetListMarkup(html: string): string {
  return tablesOf(html).map((t) => t.html).join('\n');
}

/** One cabinet list page → one post per person per ministry. */
export function parseCabinetPage(html: string, source: { key: string; url: string }): ParsedPost[] {
  const posts: ParsedPost[] = [];
  let order = 0;
  for (const table of tablesOf(html)) {
    const rank = table.before.match(/(মন্ত্রীর|প্রতিমন্ত্রীর|উপমন্ত্রীর)\s*পদমর্যাদায়/);
    const rankNote = rank ? `${rank[1]} পদমর্যাদা` : null;
    // Column positions from the header row; the fixed order is the fallback.
    let col = { photo: 1, name: 2, title: 3, appointed: 4, ministry: 5, assigned: 6 };
    let current: ParsedPost | null = null;
    for (const row of table.html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1]!);
      const texts = cells.map(cellText);
      if (texts.includes('ক্রম') || texts.some((t) => t === 'নাম' || t.startsWith('নাম'))) {
        const at = (re: RegExp) => texts.findIndex((t) => re.test(t));
        const found = {
          photo: at(/^ছবি/), name: at(/^নাম/), title: at(/^পদবি/), appointed: at(/নিয়োগ/),
          ministry: at(/মন্ত্রণালয়|দায়িত্ব/), assigned: at(/বণ্টন|বন্টন/),
        };
        if (found.name >= 0 && found.title >= 0 && found.ministry >= 0) col = { ...col, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v >= 0)) };
        continue;
      }
      if (cells.length === 1) continue; // a section heading such as মন্ত্রিগণ
      if (cells.length >= 6 && texts[col.name]) {
        const img = cells[col.photo]?.match(/<img[^>]*\ssrc="([^"]+)"/);
        const title = canonicalTitle(texts[col.title] ?? '');
        current = {
          sourceKey: source.key,
          type: 'government',
          title,
          rankNote: title === 'উপদেষ্টা' ? rankNote : null,
          ministryBn: cleanMinistry(texts[col.ministry] ?? ''),
          nameBn: texts[col.name]!,
          nameEn: null,
          seatEn: null,
          photoUrl: img ? decode(img[1]!) : null,
          appointedOn: parseBnDate(texts[col.appointed]),
          fromDate: parseBnDate(texts[col.assigned]) ?? parseBnDate(texts[col.appointed]),
          order: ++order,
          sourceUrl: source.url,
        };
        posts.push(current);
        continue;
      }
      // A person's further ministries: the first cells span rows, so only ministry and date remain.
      if (current && cells.length >= 1 && cells.length <= 3 && texts[0]) {
        posts.push({
          ...current,
          ministryBn: cleanMinistry(texts[0]),
          fromDate: parseBnDate(texts[1]) ?? current.appointedOn,
          order: ++order,
        });
      }
    }
  }
  return posts;
}

const OFFICE_TITLES: Record<string, string> = {
  SPEAKER: 'স্পিকার',
  DEPUTY_SPEAKER: 'ডেপুটি স্পিকার',
  LEADER_OF_HOUSE: 'সংসদ নেতা',
  OPPOSITION_LEADER: 'বিরোধীদলীয় নেতা',
  DEPUTY_OPPOSITION_LEADER: 'বিরোধীদলীয় উপনেতা',
  CHIEF_WHIP: 'চিফ হুইপ',
  WHIP: 'হুইপ',
};

export interface OfficerRow {
  role: string;
  nameBn?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  parliamentNo?: number | null;
  tenureStartDate?: string | null;
  tenureTextBn?: string | null;
  location?: string | null;
  isCurrent?: boolean | null;
  sortOrder?: number | null;
}

/** parliament.gov.bd's /api/speakers rows → the current House offices. */
export function parseOfficers(rows: OfficerRow[], source: { key: string; url: string; parliamentNo: number }): ParsedPost[] {
  return rows
    .filter((r) => r.isCurrent && r.parliamentNo === source.parliamentNo && r.nameBn)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((r, i) => ({
      sourceKey: source.key,
      type: 'parliament' as const,
      title: OFFICE_TITLES[r.role] ?? r.role,
      rankNote: null,
      ministryBn: null,
      nameBn: r.nameBn!.normalize('NFC').trim(),
      nameEn: r.nameEn?.trim() || null,
      seatEn: r.location?.trim() || null,
      photoUrl: r.imageUrl ?? null,
      appointedOn: null,
      fromDate: (r.tenureStartDate ? r.tenureStartDate.slice(0, 10) : null) ?? parseBnLongDate(r.tenureTextBn),
      order: i + 1,
      sourceUrl: source.url,
    }));
}
