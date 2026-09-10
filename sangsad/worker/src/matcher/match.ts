/**
 * Which sitting members a news headline (and its feed summary) is about.
 *
 * A name alone is weak evidence: Bangladesh has many people called
 * "শফিকুর রহমান", and a wrong link puts a real person next to a story that is
 * not theirs. So a match needs the member's name as whole words AND context
 * that points at this member, and the score says how sure it is:
 *
 *   name, by how distinctive it is   4+ words 0.80 · 3 words 0.70 · 2 words 0.45
 *   (honorifics such as মো, ডা, ব্যারিস্টার do not count as words)
 *   the member's own unique office  +0.40  প্রধানমন্ত্রী, স্পিকার, বিরোধীদলীয় নেতা…
 *   MP words                        +0.20  এমপি, সংসদ সদস্য, সাংসদ, MP, lawmaker
 *   the member's own seat           +0.20  ঠাকুরগাঁও-১
 *   whip office                     +0.20  চিফ হুইপ, হুইপ (when the member holds it)
 *   a ministerial title             +0.15  any word ending in মন্ত্রী, minister
 *   the member's district           +0.10
 *   the word সংসদ / parliament      +0.05
 *   name only in the summary        −0.05
 *
 * A name shared by two sitting members is capped at 0.60 (review) unless
 * the member's own seat or district settles it. Scores ≥ 0.85 are published
 * automatically, 0.50–0.85 wait for an editor, anything lower is dropped.
 * Every decision carries a plain-language reason for the reviewer.
 */
import { normalise } from '@sangsad/shared';

export const AUTO_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.5;

export interface MatchMember {
  id: number;
  externalId: string;
  nameBn: string;
  nameEn: string | null;
  aliases: { alias: string; language: 'bn' | 'en' }[];
  seatBn: string | null;
  seatEn: string | null;
  districtBn: string | null;
  districtEn: string | null;
  /** Offices in the current parliament: Speaker, Prime Minister, Whip… */
  roles: string[];
}

export interface Match {
  memberId: number;
  externalId: string;
  confidence: number;
  status: 'auto' | 'pending';
  reason: string;
}

/** Honorifics and the "Md." family: part of how a name is written, not what makes it distinctive. */
const NON_DISTINCTIVE = new Set(
  ['মো', 'ডা', 'ডাক্তার', 'ড', 'ব্যারিস্টার', 'অ্যাডভোকেট', 'এডভোকেট', 'আলহাজ্ব', 'আলহাজ', 'প্রফেসর', 'অধ্যাপক', 'ইঞ্জিনিয়ার', 'বেগম', 'জনাব', 'মেজর', 'md', 'barrister', 'advocate', 'dr', 'prof', 'alhaj', 'begum', 'engineer', 'major']
    .map((w) => normalise(w))
    .filter(Boolean),
);

/** Bangla case endings a name takes in a sentence: আলমগীরের, রহমানকে, হকও… */
const SUFFIXES = new Set(['', 'র', 'ের', 'এর', 'কে', 'ে', 'দের', 'রা', 'ও', 'ই', 'যের', 'কেও', 'েরও', 'েই', 'ের ', 's'].map((s) => normalise(`ক${s}`).slice(1)));

const phrase = (s: string | null | undefined) => normalise(s).split(' ').filter(Boolean);

const MP_WORDS = ['এমপি', 'সংসদ সদস্য', 'সংসদ সদস্যের', 'সাংসদ', 'mp', 'lawmaker', 'member of parliament', 'parliamentarian'].map(phrase);
const PARLIAMENT_WORDS = ['সংসদ', 'সংসদে', 'parliament', 'jatiya sangsad'].map(phrase);
const UNIQUE_ROLE_WORDS: Record<string, string[][]> = {
  'Prime Minister': ['প্রধানমন্ত্রী', 'প্রধানমন্ত্রীর', 'prime minister', 'pm'].map(phrase),
  Speaker: ['স্পিকার', 'স্পিকারের', 'speaker'].map(phrase),
  'Deputy Speaker': ['ডেপুটি স্পিকার', 'ডেপুটি স্পিকারের', 'deputy speaker'].map(phrase),
  'Leader of the Opposition': ['বিরোধীদলীয় নেতা', 'বিরোধী দলীয় নেতা', 'বিরোধী দলের নেতা', 'বিরোধীদলীয় নেতার', 'opposition leader', 'leader of the opposition'].map(phrase),
  'Leader of the House': ['সংসদ নেতা', 'leader of the house'].map(phrase),
};
const WHIP_WORDS: Record<string, string[][]> = {
  'Chief Whip': ['চিফ হুইপ', 'chief whip'].map(phrase),
  Whip: ['হুইপ', 'whip'].map(phrase),
};
/** Words that end a longer name: a match followed by one of these is someone else ("মনোয়ার হোসেন চৌধুরী" is not "মোঃ মনোয়ার হোসেন"). */
const SURNAME_TAILS = new Set(
  ['চৌধুরী', 'খান', 'আহমেদ', 'আহমদ', 'আহম্মেদ', 'মিয়া', 'মিঞা', 'সরকার', 'তালুকদার', 'ভূঁইয়া', 'ভূইয়া', 'মজুমদার', 'হক', 'উদ্দিন', 'উদ্দীন', 'হোসেন', 'হোসাইন', 'রহমান', 'ইসলাম', 'আলম', 'সিকদার', 'শিকদার', 'মোল্লা', 'শেখ', 'পাটোয়ারী', 'বিশ্বাস', 'প্রামাণিক', 'মন্ডল', 'মণ্ডল', 'বেপারী', 'খন্দকার', 'কাজী', 'সৈয়দ', 'chowdhury', 'khan', 'ahmed', 'ahmad', 'mia', 'miah', 'sarkar', 'talukder', 'bhuiyan', 'majumder', 'haque', 'uddin', 'hossain', 'rahman', 'islam', 'alam']
    .map((w) => normalise(w))
    .filter(Boolean),
);
/** "সাবেক এমপি", "former MP": the person named is not a sitting member. */
const FORMER = new Set(['সাবেক', 'former', 'ex'].map((w) => normalise(w)));
const MINISTER_TAIL = normalise('মন্ত্রী');
const MINISTER_EN = normalise('minister');
/** "Prime minister" names one office holder; it is not a ministerial title for anyone else in the headline. */
const PM_BN = normalise('প্রধানমন্ত্রী');
const PRIME_EN = normalise('prime');

function tokenEq(textTok: string, aliasTok: string, last: boolean): boolean {
  if (textTok === aliasTok) return true;
  return last && textTok.startsWith(aliasTok) && SUFFIXES.has(textTok.slice(aliasTok.length));
}

function findPhrase(tokens: string[], p: string[]): number {
  if (!p.length) return -1;
  for (let i = 0; i + p.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < p.length; j++) {
      if (!tokenEq(tokens[i + j]!, p[j]!, j === p.length - 1)) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}
const hasAny = (tokens: string[], phrases: string[][]) => phrases.some((p) => findPhrase(tokens, p) >= 0);

function occurrences(tokens: string[], p: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + p.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < p.length; j++) {
      if (!tokenEq(tokens[i + j]!, p[j]!, j === p.length - 1)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(i);
  }
  return out;
}

interface AliasEntry {
  member: MatchMember;
  tokens: string[];
  distinctive: number;
  key: string;
}

export interface MatcherIndex {
  entries: AliasEntry[];
  sharedKeys: Map<string, Set<number>>;
}

export function buildIndex(members: MatchMember[]): MatcherIndex {
  const entries: AliasEntry[] = [];
  const seen = new Set<string>();
  for (const m of members) {
    const names = [
      { alias: m.nameBn, language: 'bn' as const },
      ...(m.nameEn ? [{ alias: m.nameEn, language: 'en' as const }] : []),
      ...m.aliases,
    ];
    for (const a of names) {
      const tokens = phrase(a.alias.replace(/\([^)]*\)/g, ' '));
      const distinctive = tokens.filter((t) => !NON_DISTINCTIVE.has(t)).length;
      // One distinctive word ("নিজান", "Babor") is a nickname, never enough on its own.
      if (distinctive < 2) continue;
      const key = tokens.join(' ');
      const dedupe = `${m.id}|${key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      entries.push({ member: m, tokens, distinctive, key });
    }
  }
  const sharedKeys = new Map<string, Set<number>>();
  for (const e of entries) {
    // Two members "share" a name when one's alias is the other's too.
    const set = sharedKeys.get(e.key) ?? new Set<number>();
    set.add(e.member.id);
    sharedKeys.set(e.key, set);
  }
  return { entries, sharedKeys };
}

const base = (distinctive: number) => (distinctive >= 4 ? 0.8 : distinctive === 3 ? 0.7 : 0.45);

export function matchArticle(index: MatcherIndex, title: string, summary: string | null = null): Match[] {
  const titleTokens = phrase(title);
  const allTokens = [...titleTokens, ...phrase(summary)];
  const hasMinister =
    allTokens.some((t) => t.includes(MINISTER_TAIL) && !t.startsWith(PM_BN)) ||
    allTokens.some((t, i) => (t === MINISTER_EN || t === `${MINISTER_EN}s`) && allTokens[i - 1] !== PRIME_EN);
  // An MP word right after "সাবেক"/"former" describes a former member, which a sitting member is not.
  let formerMp = false;
  let mpWords = false;
  for (const p of MP_WORDS) {
    for (const at of occurrences(allTokens, p)) {
      if (at > 0 && FORMER.has(allTokens[at - 1]!)) formerMp = true;
      else mpWords = true;
    }
  }
  const parliamentWord = hasAny(allTokens, PARLIAMENT_WORDS);

  // Longest names claim their words first; a shorter name that only occurs
  // inside a longer one ("আব্দুল আজিজ" within "মো আব্দুল আজিজ খান") is not a
  // mention of its own. Members with the very same name share the span.
  const claimed = new Array<boolean>(allTokens.length).fill(false);
  const best = new Map<number, { entry: AliasEntry; inTitle: boolean }>();
  const groups = new Map<string, AliasEntry[]>();
  for (const e of index.entries) groups.set(e.key, [...(groups.get(e.key) ?? []), e]);
  const ordered = [...groups.values()].sort((x, y) => y[0]!.tokens.length - x[0]!.tokens.length);
  for (const group of ordered) {
    const tokens = group[0]!.tokens;
    const hits: number[] = [];
    for (const at of occurrences(allTokens, tokens)) {
      let free = true;
      for (let k = at; k < at + tokens.length; k++) if (claimed[k]) free = false;
      // A family name straight after the match means a longer name: a different person.
      const next = allTokens[at + tokens.length];
      if (next && at + tokens.length !== titleTokens.length && SURNAME_TAILS.has(next)) free = false;
      if (free) hits.push(at);
    }
    if (!hits.length) continue;
    for (const at of hits) for (let k = at; k < at + tokens.length; k++) claimed[k] = true;
    const inTitle = hits.some((at) => at < titleTokens.length);
    for (const e of group) if (!best.has(e.member.id)) best.set(e.member.id, { entry: e, inTitle });
  }

  const scored: (Match & { key: string; placeSettles: boolean })[] = [];
  for (const { entry, inTitle } of best.values()) {
    const m = entry.member;
    const reasons: string[] = [`name "${entry.tokens.join(' ')}" (${entry.distinctive} words)`];
    let score = base(entry.distinctive);
    if (!inTitle) {
      score -= 0.05;
      reasons.push('only in the summary');
    }
    const seatHit = hasAny(allTokens, [phrase(m.seatBn), phrase(m.seatEn)].filter((p) => p.length));
    const districtHit = !seatHit && hasAny(allTokens, [phrase(m.districtBn), phrase(m.districtEn)].filter((p) => p.length));
    for (const role of m.roles) {
      if (UNIQUE_ROLE_WORDS[role] && hasAny(allTokens, UNIQUE_ROLE_WORDS[role]!)) {
        score += 0.4;
        reasons.push(`own office (${role})`);
        break;
      }
    }
    for (const role of m.roles) {
      if (WHIP_WORDS[role] && hasAny(allTokens, WHIP_WORDS[role]!)) {
        score += 0.2;
        reasons.push(`own office (${role})`);
        break;
      }
    }
    if (mpWords) {
      score += 0.2;
      reasons.push('MP word');
    }
    if (seatHit) {
      score += 0.2;
      reasons.push('own seat');
    }
    if (hasMinister) {
      score += 0.15;
      reasons.push('ministerial title');
    }
    if (districtHit) {
      score += 0.1;
      reasons.push('own district');
    }
    if (formerMp && !mpWords) {
      score -= 0.1;
      reasons.push('a former MP is mentioned');
    }
    if (parliamentWord && !mpWords) {
      score += 0.05;
      reasons.push('parliament word');
    }
    const sharers = index.sharedKeys.get(entry.key);
    if (sharers && sharers.size > 1 && !seatHit && !districtHit) {
      if (score > 0.6) score = 0.6;
      reasons.push(`name shared by ${sharers.size} sitting members`);
    }
    score = Math.min(0.99, Math.round(score * 100) / 100);
    scored.push({
      key: entry.key,
      placeSettles: seatHit || districtHit,
      memberId: m.id,
      externalId: m.externalId,
      confidence: score,
      status: score >= AUTO_THRESHOLD ? 'auto' : 'pending',
      reason: reasons.join('; '),
    });
  }
  // When the seat or district settles a shared name for one member, the
  // others with that name are not mentioned at all.
  const settled = new Set(scored.filter((x) => x.placeSettles).map((x) => x.key));
  return scored
    .filter((x) => x.confidence >= REVIEW_THRESHOLD && (!settled.has(x.key) || x.placeSettles || (index.sharedKeys.get(x.key)?.size ?? 1) < 2))
    .map(({ key: _key, placeSettles: _p, ...m }) => m)
    .sort((a, b) => b.confidence - a.confidence);
}
