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

/** A phrase split once, at index time, so a match does not re-split it per item. */
function phraseTokens(phrase: string | null | undefined): string[] {
  if (!phrase) return [];
  return textTokens(phrase).filter((t) => !HONORIFICS.has(t) && !INITIALS.has(t));
}

/** Does this phrase (a seat, a party, an office) appear as whole words? */
function hasTokens(tokens: string[], p: string[]): boolean {
  if (!p.length) return false;
  if (p.length === 1) return tokens.some((t) => wordEq(t, p[0]!, true));
  return findRun(tokens, p) >= 0;
}

/** The words that mean a namesake, split once for the whole process. */
const NEGATIVE_TOKENS = NEGATIVE_CONTEXT.map((word) => ({ word, tokens: phraseTokens(word) }));

export interface FeedIndexEntry {
  mp: FeedMp;
  names: { tokens: string[]; weight: number; label: string }[];
  /** Seat, district, party and office, split once instead of once per headline. */
  phrases: {
    seat: string[][];
    district: string[][];
    party: string[][];
    posts: { word: string; tokens: string[] }[];
    ministries: { word: string; tokens: string[] }[];
  };
  /**
   * Every word that could give this member a point. A headline containing none
   * of them cannot score above zero, so the member is not examined at all —
   * which is what makes a run over five thousand sitemap headlines finish
   * inside a serverless minute.
   */
  triggers: Set<string>;
}

export interface FeedIndex {
  entries: FeedIndexEntry[];
  /** Which members a word could possibly name, for the prefilter above. */
  byTrigger: Map<string, FeedIndexEntry[]>;
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

    const some = (raw: string | null | undefined) => {
      const t = phraseTokens(raw);
      return t.length ? [t] : [];
    };
    const phrases = {
      seat: [...some(mp.seatBn), ...some(mp.seatEn)],
      district: [...some(mp.districtBn), ...some(mp.districtEn)],
      party: [...some(mp.partyBn), ...some(mp.partyAbbr)],
      posts: POST_WORDS.filter((w) => mp.posts.some((post) => w.matches(post, null)))
        .map((w) => ({ word: w.word, tokens: phraseTokens(w.word) })),
      ministries: mp.ministries
        .map((m) => ministryWord(m))
        .filter((w): w is string => Boolean(w))
        .map((w) => ({ word: w, tokens: phraseTokens(w) })),
    };
    const triggers = new Set<string>();
    for (const n of names) for (const t of n.tokens) triggers.add(t);
    for (const group of [phrases.seat, phrases.district, phrases.party]) for (const t of group.flat()) triggers.add(t);
    for (const w of [...phrases.posts, ...phrases.ministries]) for (const t of w.tokens) triggers.add(t);
    return { mp, names, phrases, triggers };
  });
  const nameWords = new Set<string>();
  for (const e of entries) for (const n of e.names) for (const t of n.tokens) if (!HONORIFICS.has(t) && !INITIALS.has(t)) nameWords.add(t);
  const byTrigger = new Map<string, FeedIndexEntry[]>();
  for (const e of entries) for (const t of e.triggers) byTrigger.set(t, [...(byTrigger.get(t) ?? []), e]);
  return { entries, nameWords, byTrigger };
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
  const negative = NEGATIVE_TOKENS.filter((w) => hasTokens(allTokens, w.tokens)).map((w) => w.word);

  // Only members whose name, seat, district, party or office actually appears
  // are examined. A case ending is allowed for on the way in, because
  // "রহমানকে" is how a headline writes রহমান.
  const candidates = new Set<FeedIndexEntry>();
  for (const t of allTokens) {
    for (const e of index.byTrigger.get(t) ?? []) candidates.add(e);
    for (const suffix of SUFFIXES) {
      if (t.length > suffix.length && t.endsWith(suffix)) {
        for (const e of index.byTrigger.get(t.slice(0, -suffix.length)) ?? []) candidates.add(e);
      }
    }
  }

  /** A name preceded by another name word is somebody else's longer name. */
  const standsAlone = (tokens: string[], at: number) => {
    if (at <= 0) return true;
    const prev = tokens[at - 1]!;
    return !index.nameWords.has(prev) || HONORIFICS.has(prev) || INITIALS.has(prev);
  };

  const found: MpMatch[] = [];
  for (const entry of candidates) {
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

    const { phrases } = entry;
    if (phrases.seat.some((p) => hasTokens(allTokens, p))) {
      score += POINTS.seat;
      signals.push({ signal: 'seat', points: POINTS.seat, detail: mp.seatBn ?? mp.seatEn ?? '' });
    } else if (phrases.district.some((p) => hasTokens(allTokens, p))) {
      score += POINTS.district;
      signals.push({ signal: 'district', points: POINTS.district, detail: mp.districtBn ?? '' });
    }

    if (phrases.party.some((p) => hasTokens(allTokens, p))) {
      score += POINTS.party;
      signals.push({ signal: 'party', points: POINTS.party, detail: mp.partyBn ?? mp.partyAbbr ?? '' });
    }

    const office = phrases.posts.find((w) => hasTokens(allTokens, w.tokens))
      ?? phrases.ministries.find((w) => hasTokens(allTokens, w.tokens));
    if (office) {
      score += POINTS.post;
      signals.push({ signal: 'post', points: POINTS.post, detail: office.word });
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
