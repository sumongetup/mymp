import type { NewsPost } from './data';

/**
 * Many outlets carry the same story on the same day: "ব্রিকস সম্মেলনে যাচ্ছেন না
 * প্রধানমন্ত্রী" arrived from ten of them. This folds those headlines into one
 * story, so a list shows each story once with the other outlets beside it.
 *
 * Two headlines join when they are about the same member (or both about none),
 * were published at most a day apart, and share enough of their meaningful
 * words. Words are weighted by how rare they are across all headlines, so
 * "ব্রিকস" counts for a lot and "করবে" for nothing. The member's own name and
 * office words are left out, since every story about that member has them.
 * The threshold was set against the 93 real headlines of 2026-09-12: at 0.25
 * they fold into 56 stories with no wrong merge, and 0.22 gives the same
 * result. A missed pair only means two separate entries, while a wrong merge
 * would hide a story, so when in doubt it keeps headlines apart.
 */
export interface Story {
  lead: NewsPost;
  /** The same story from other outlets, one per outlet. */
  also: NewsPost[];
}

const JOIN_AT = 0.25;

const STOP = new Set(
  [
    'না', 'ও', 'এ', 'এর', 'এবং', 'করে', 'হবে', 'হয়', 'হলো', 'হল', 'থেকে', 'জন্য', 'নিয়ে', 'সঙ্গে', 'সাথে', 'বলে', 'বললেন',
    'বলেছেন', 'করা', 'করতে', 'করবে', 'করছে', 'করছেন', 'দিয়ে', 'হলে', 'তার', 'তাঁর', 'এই', 'সেই', 'কোনো', 'আর', 'বা', 'যে',
    'যা', 'একটি', 'এক', 'কি', 'কী', 'নেই', 'আছে', 'যেন', 'শুধু', 'আরও', 'হচ্ছে', 'দিলেন', 'দিচ্ছেন', 'জানালেন', 'জানান',
    'প্রধানমন্ত্রী', 'প্রধানমন্ত্রীর', 'স্পিকার', 'স্পিকারের', 'ডেপুটি', 'হুইপ', 'চিফ', 'মন্ত্রী', 'প্রতিমন্ত্রী', 'সংসদ',
    'সংসদে', 'এমপি', 'সংসদ', 'সদস্য', 'বিএনপি', 'সরকার', 'দেশ', 'দেশের', 'দেশকে',
    'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'is', 'are', 'be', 'with', 'says', 'said', 'pm', 'minister',
  ].map((w) => w.normalize('NFC')),
);

/** Case endings a Bangla noun takes; stripped so "সম্মেলনে" and "সম্মেলন" meet. */
const SUFFIXES = ['গুলোর', 'গুলো', 'দের', 'য়ের', 'েরা', 'ের', 'কে', 'তে', 'য়', 'র', 'ে', 'ও', 'ই', 'টি', 'টা'].map((s) => s.normalize('NFC'));

function stem(word: string): string {
  for (const s of SUFFIXES) {
    if (word.endsWith(s) && [...word].length - [...s].length >= 3) return word.slice(0, -s.length);
  }
  return word;
}

function words(title: string, skip: Set<string>): Set<string> {
  const out = new Set<string>();
  const text = title
    .normalize('NFC')
    // Joiners and the hasanta go: outlets write "বাক্‌স্বাধীনতা" and "বাকস্বাধীনতা" for the same word.
    .replace(/[\u200B-\u200D\uFEFF\u09CD]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ');
  for (const w of text.split(' ')) {
    if (!w || STOP.has(w) || skip.has(w)) continue;
    const s = stem(w);
    if ([...s].length < 2 || STOP.has(s) || skip.has(s)) continue;
    out.add(s);
  }
  return out;
}

const dayOf = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000);

/**
 * Fold same-story headlines. `nameWords` gives, per member id, the words of
 * that member's name, which are dropped before comparing. Order is kept: the
 * first headline of a story leads it, and stories come in the order of their
 * leads.
 */
export function groupStories(items: NewsPost[], nameWords: (memberId: string) => string[] = () => []): Story[] {
  const skipFor = new Map<string, Set<string>>();
  const skip = (id: string | null) => {
    if (!id) return new Set<string>();
    if (!skipFor.has(id)) skipFor.set(id, new Set(nameWords(id).flatMap((n) => [n.normalize('NFC'), stem(n.normalize('NFC'))])));
    return skipFor.get(id)!;
  };
  const docs = items.map((n) => ({ n, w: words(n.titleBn, skip(n.memberId)), day: dayOf(n.publishedOn) }));

  // Rarer words weigh more.
  const df = new Map<string, number>();
  for (const d of docs) for (const w of d.w) df.set(w, (df.get(w) ?? 0) + 1);
  const weight = (w: string) => Math.log((docs.length + 1) / (df.get(w) ?? 1));
  const similarity = (a: Set<string>, b: Set<string>) => {
    let shared = 0;
    let all = 0;
    for (const w of new Set([...a, ...b])) {
      const x = weight(w);
      all += x;
      if (a.has(w) && b.has(w)) shared += x;
    }
    return all ? shared / all : 0;
  };

  const groups: { lead: (typeof docs)[number]; members: (typeof docs)[number][] }[] = [];
  for (const d of docs) {
    let home: (typeof groups)[number] | undefined;
    let best = JOIN_AT;
    for (const g of groups) {
      if (g.lead.n.memberId !== d.n.memberId) continue;
      if (!g.members.some((m) => Math.abs(m.day - d.day) <= 1)) continue;
      const s = Math.max(...g.members.map((m) => similarity(m.w, d.w)));
      if (s >= best) { best = s; home = g; }
    }
    if (home) home.members.push(d);
    else groups.push({ lead: d, members: [d] });
  }

  return groups.map((g) => {
    const seen = new Set([g.lead.n.sourceName]);
    const also: NewsPost[] = [];
    for (const m of g.members.slice(1)) {
      if (seen.has(m.n.sourceName)) continue;
      seen.add(m.n.sourceName);
      also.push(m.n);
    }
    return { lead: g.lead.n, also };
  });
}
