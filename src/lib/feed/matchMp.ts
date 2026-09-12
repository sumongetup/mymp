/**
 * Which members a headline is about.
 *
 * The rule that matters: a shared surname is not a mention. রহমান, ইসলাম and
 * হক end dozens of the 349 names, so a name only counts when every word of a
 * stored variant appears together, in order, with at least two words in it.
 * That is the same first-token rule the cabinet matcher uses, applied to
 * running text instead of to a list entry.
 *
 * Everything else is context, and context alone is never enough to name a
 * person: a seat, a district, a party or an office title adds to a name, or
 * leaves the item below the floor.
 *
 *   name variant in the headline        60
 *   name variant in the summary only    35
 *   the member's own seat               25
 *   the member's own district           10
 *   the member's own party               5
 *   an office title the member holds    30
 *   a namesake's job or place          −30  (cricketer, actor, foreign PM…)
 *
 * 60 and over attaches. 40 to 59 attaches and waits for a reviewer. Below 40
 * is dropped. When one member is named and another only picked up context
 * points on the same item, the second is dropped: an article that says
 * "প্রধানমন্ত্রী" while naming somebody else is not about the Prime Minister.
 */
import { foldBangla, nameTokens, HONORIFICS, INITIALS } from '@/lib/matching/nameMatch';
import { SPELLING_FOLD, CASE_SUFFIXES, NEGATIVE_CONTEXT, POST_WORDS } from '../../../config/feed-matching';

export const AUTO_SCORE = 60;
export const REVIEW_SCORE = 40;

export const POINTS = {
  nameInTitle: 60,
  nameInSummary: 35,
  seat: 25,
  district: 10,
  party: 5,
  post: 30,
  negative: -30,
} as const;

export interface FeedMp {
  id: string;
  nameBn: string | null;
  nameEn: string | null;
  /** "ঠাকুরগাঁও-৩" */
  seatBn: string | null;
  seatEn: string | null;
  districtBn: string | null;
  districtEn: string | null;
  partyBn: string | null;
  partyAbbr: string | null;
  /** Office titles the member holds now: প্রধানমন্ত্রী, স্পিকার, চিফ হুইপ… */
  posts: string[];
  /** The ministries they hold, as the cabinet list writes them. */
  ministries: string[];
  /** Extra spellings from mp_name_variants; the official name is added here. */
  variants: { variant: string; weight: number }[];
}

export interface Signal { signal: string; points: number; detail?: string }

export interface MpMatch {
  mpId: string;
  score: number;
  lowConfidence: boolean;
  named: boolean;
  /** The spelling that matched, so two members with one name can be told apart. */
  nameLabel: string | null;
  signals: Signal[];
}

/** One comparable word: folded, and with surname spellings brought together. */
export function feedToken(raw: string): string {
  const t = foldBangla(raw);
  return SPELLING_FOLD[t] ?? t;
}

/** The words of a piece of running text, in order, ready to compare. */
export function textTokens(raw: string): string[] {
  return foldBangla(raw)
    // Marks are kept: Bangla vowel signs are part of the word. Everything else,
    // the hyphen of ঠাকুরগাঁও-৩ included, separates words.
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SPELLING_FOLD[t] ?? t);
}

/** The words of a name: honorifics, initials and gallantry titles are not part of it. */
export function variantTokens(raw: string): string[] {
  return nameTokens(raw).map((t) => SPELLING_FOLD[t] ?? t);
}

const SUFFIXES = new Set(CASE_SUFFIXES.map((s) => foldBangla(s)));

/** The last word of a name may carry a case ending: খানের, রহমানকে, আহমদও. */
function wordEq(inText: string, inName: string, last: boolean): boolean {
  if (inText === inName) return true;
  if (!last || !inText.startsWith(inName)) return false;
  const tail = inText.slice(inName.length);
  return SUFFIXES.has(tail);
}

/** Where a name's words appear together, in order. */
function findRun(tokens: string[], name: string[]): number {
  if (name.length < 2) return -1; // one word is never a mention
  for (let i = 0; i + name.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < name.length; j++) {
      if (!wordEq(tokens[i + j]!, name[j]!, j === name.length - 1)) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

/** Does this phrase (a seat, a party, an office) appear as whole words? */
function hasPhrase(tokens: string[], phrase: string | null | undefined): boolean {
  if (!phrase) return false;
  const p = textTokens(phrase).filter((t) => !HONORIFICS.has(t) && !INITIALS.has(t));
  if (!p.length) return false;
  if (p.length === 1) return tokens.some((t) => wordEq(t, p[0]!, true));
  return findRun(tokens, p) >= 0;
}

export interface FeedIndexEntry {
  mp: FeedMp;
  names: { tokens: string[]; weight: number; label: string }[];
}

export interface FeedIndex {
  entries: FeedIndexEntry[];
  /**
   * Every word that appears in some member's name. A match with one of these
   * immediately in front of it is part of a longer name, so
   * "মনোয়ার হোসেন চৌধুরী" is not a mention of "আলতাফ হোসেন চৌধুরী".
   */
  nameWords: Set<string>;
}

export function buildFeedIndex(mps: FeedMp[]): FeedIndex {
  const entries = mps.map((mp) => {
    const seen = new Set<string>();
    const names: FeedIndexEntry['names'] = [];
    const add = (raw: string | null | undefined, weight: number) => {
      if (!raw) return;
      const tokens = variantTokens(raw);
      if (tokens.length < 2) return; // a single word names nobody
      const key = tokens.join(' ');
      if (seen.has(key)) return;
      seen.add(key);
      names.push({ tokens, weight, label: key });
    };
    add(mp.nameBn, 1);
    add(mp.nameEn, 1);
    for (const v of mp.variants) add(v.variant, v.weight);
    return { mp, names };
  });
  const nameWords = new Set<string>();
  for (const e of entries) for (const n of e.names) for (const t of n.tokens) if (!HONORIFICS.has(t) && !INITIALS.has(t)) nameWords.add(t);
  return { entries, nameWords };
}

export interface FeedItemText {
  title: string;
  summary?: string | null;
}

/**
 * Every member an item is about. Items nobody is named in come back empty:
 * a political story that names a party and no person belongs to nobody.
 */
export function matchItem(index: FeedIndex, item: FeedItemText): MpMatch[] {
  const titleTokens = textTokens(item.title);
  const summaryTokens = item.summary ? textTokens(item.summary) : [];
  const allTokens = [...titleTokens, ...summaryTokens];
  const negative = NEGATIVE_CONTEXT.filter((w) => hasPhrase(allTokens, w));

  /** A name preceded by another name word is somebody else's longer name. */
  const standsAlone = (tokens: string[], at: number) => {
    if (at <= 0) return true;
    const prev = tokens[at - 1]!;
    return !index.nameWords.has(prev) || HONORIFICS.has(prev) || INITIALS.has(prev);
  };

  const found: MpMatch[] = [];
  for (const entry of index.entries) {
    const { mp } = entry;
    const signals: Signal[] = [];
    let score = 0;
    let named = false;

    let best: { weight: number; label: string; inTitle: boolean } | null = null;
    for (const n of entry.names) {
      const atTitle = findRun(titleTokens, n.tokens);
      const atSummary = findRun(summaryTokens, n.tokens);
      const inTitle = atTitle >= 0 && standsAlone(titleTokens, atTitle);
      const inSummary = !inTitle && atSummary >= 0 && standsAlone(summaryTokens, atSummary);
      if (!inTitle && !inSummary) continue;
      if (!best || (inTitle && !best.inTitle) || (inTitle === best.inTitle && n.weight > best.weight)) {
        best = { weight: n.weight, label: n.label, inTitle };
      }
    }
    if (best) {
      named = true;
      const points = Math.round((best.inTitle ? POINTS.nameInTitle : POINTS.nameInSummary) * best.weight);
      score += points;
      signals.push({ signal: best.inTitle ? 'name-in-title' : 'name-in-summary', points, detail: best.label });
    }

    const seatHit = hasPhrase(allTokens, mp.seatBn) || hasPhrase(allTokens, mp.seatEn);
    if (seatHit) {
      score += POINTS.seat;
      signals.push({ signal: 'seat', points: POINTS.seat, detail: mp.seatBn ?? mp.seatEn ?? '' });
    } else if (hasPhrase(allTokens, mp.districtBn) || hasPhrase(allTokens, mp.districtEn)) {
      score += POINTS.district;
      signals.push({ signal: 'district', points: POINTS.district, detail: mp.districtBn ?? '' });
    }

    if (hasPhrase(allTokens, mp.partyBn) || (mp.partyAbbr && hasPhrase(allTokens, mp.partyAbbr))) {
      score += POINTS.party;
      signals.push({ signal: 'party', points: POINTS.party, detail: mp.partyBn ?? mp.partyAbbr ?? '' });
    }

    const post = POST_WORDS.find(
      (w) => hasPhrase(allTokens, w.word) && mp.posts.some((p) => w.matches(p, null)),
    );
    const ministry = mp.ministries.find((m) => ministryWord(m) && hasPhrase(allTokens, ministryWord(m)!));
    if (post || ministry) {
      score += POINTS.post;
      signals.push({ signal: 'post', points: POINTS.post, detail: post?.word ?? ministryWord(ministry!) ?? '' });
    }

    if (named && negative.length) {
      score += POINTS.negative;
      signals.push({ signal: 'namesake-context', points: POINTS.negative, detail: negative.join(', ') });
    }

    if (score >= REVIEW_SCORE) {
      found.push({ mpId: mp.id, score, lowConfidence: score < AUTO_SCORE, named, nameLabel: best?.label ?? null, signals });
    }
  }

  // An item that names one member is not about another member the same words
  // happen to describe. Context-only matches drop out as soon as anyone is named.
  const anyNamed = found.some((f) => f.named);
  let kept = anyNamed ? found.filter((f) => f.named) : found;

  // Two sitting members are called শফিকুর রহমান. When a headline writes that
  // name and nothing else separates them, the higher score wins; a tie goes to
  // a reviewer rather than onto both pages.
  const byName = new Map<string, MpMatch[]>();
  for (const f of kept) if (f.nameLabel) byName.set(f.nameLabel, [...(byName.get(f.nameLabel) ?? []), f]);
  const dropped = new Set<MpMatch>();
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const top = Math.max(...group.map((g) => g.score));
    const leaders = group.filter((g) => g.score === top);
    for (const g of group) if (g.score < top) dropped.add(g);
    if (leaders.length > 1) for (const g of leaders) g.lowConfidence = true;
  }
  kept = kept.filter((f) => !dropped.has(f));
  return kept.sort((a, b) => b.score - a.score);
}

/**
 * The word a ministry is called in a headline: "পররাষ্ট্র মন্ত্রণালয়" is
 * written "পররাষ্ট্রমন্ত্রী" when it is the person speaking.
 */
export function ministryWord(ministryBn: string | null | undefined): string | null {
  if (!ministryBn) return null;
  const head = ministryBn.replace(/\s*(মন্ত্রণালয়|বিভাগ).*$/, '').trim();
  if (!head || head.includes(' ')) return null; // "স্থানীয় সরকার, পল্লী উন্নয়ন…" has no one-word title
  return `${head}মন্ত্রী`;
}
