import { normalizeName, normalizeNameEn } from './names';
import { rankMatches, SUGGEST_THRESHOLD } from '@/lib/matching/nameMatch';
import { NAME_IDF } from '@/lib/matching/nameIdf';
import type { ParsedPost } from './parse';

/**
 * Who a listed name is. In order: a name an editor resolved (post_aliases);
 * the member this exact source name was matched to before; the member list's
 * name exactly; the normalised Bangla name; the English name; and last a
 * token match that clears every gate in lib/matching/nameMatch (the first
 * word of both names, two matching words, and 0.92 of the rarity-weighted
 * score). A step only counts when it points at exactly one member. Anything
 * else is left unmatched, and the sync never guesses: before the token
 * matcher, a shared surname could carry a whole-string score to 0.89 and put
 * the wrong person's name in front of a tired editor.
 */

export interface MatchMember {
  id: string;
  nameBn: string | null;
  nameEn: string | null;
  /** "Bhola-3": lets the parliament list settle two members with one name. */
  seatEn: string | null;
}

export type Method = 'alias' | 'alias-not-mp' | 'previous' | 'exact' | 'normalized' | 'english' | 'fuzzy';

export interface Candidate { memberId: string; nameBn: string; score: number; strength: string }

export interface Resolution {
  memberId: string | null;
  method: Method | null;
  score: number | null;
  candidates: Candidate[];
}

export const FUZZY_THRESHOLD = SUGGEST_THRESHOLD;

export function buildMatcher(
  members: MatchMember[],
  /** normalizeName(name) → member id, or null for "not an MP". */
  aliases: Map<string, string | null>,
  /** The source's exact name → the member an earlier run matched it to. */
  previous: Map<string, string>,
) {
  const exact = new Map<string, string[]>();
  const norm = new Map<string, string[]>();
  const english = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, k: string, id: string) => { if (k) map.set(k, [...(map.get(k) ?? []), id]); };
  const keys = members.map((m) => ({ m, key: normalizeName(m.nameBn ?? '') }));
  for (const { m, key } of keys) {
    push(exact, (m.nameBn ?? '').normalize('NFC').trim(), m.id);
    push(norm, key, m.id);
    push(english, normalizeNameEn(m.nameEn ?? ''), m.id);
  }
  const byId = new Map(members.map((m) => [m.id, m]));
  const seatKey = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  /** Several members with one name: the parliament list's seat can settle it. */
  const one = (ids: string[] | undefined, seatEn: string | null) => {
    if (!ids?.length) return null;
    const unique = [...new Set(ids)];
    if (unique.length === 1) return unique[0]!;
    if (seatEn) {
      const bySeat = unique.filter((id) => seatKey(byId.get(id)?.seatEn) === seatKey(seatEn));
      if (bySeat.length === 1) return bySeat[0]!;
    }
    return null;
  };

  return function resolve(p: ParsedPost): Resolution {
    const key = normalizeName(p.nameBn);
    // Only matches that clear every gate are ever shown or taken; the list is
    // empty far more often than it used to be, which is the point.
    const candidates: Candidate[] = rankMatches(p.nameBn, members, NAME_IDF).map((c) => ({
      memberId: c.id, nameBn: c.nameBn, score: c.score, strength: c.strength,
    }));
    const done = (memberId: string | null, method: Method, score: number | null = 1): Resolution => ({ memberId, method, score, candidates });

    if (aliases.has(key)) {
      const id = aliases.get(key)!;
      return id ? done(id, 'alias') : done(null, 'alias-not-mp', null);
    }
    const prev = previous.get(p.nameBn.normalize('NFC').trim());
    if (prev && byId.has(prev)) return done(prev, 'previous');
    const e = one(exact.get(p.nameBn.normalize('NFC').trim()), p.seatEn);
    if (e) return done(e, 'exact');
    const n = one(norm.get(key), p.seatEn);
    if (n) return done(n, 'normalized');
    if (p.nameEn) {
      const en = one(english.get(normalizeNameEn(p.nameEn)), p.seatEn);
      if (en) return done(en, 'english');
    }
    // One clear candidate and nothing else close: the sync may take it. Two
    // candidates that both clear the gates are a question for an editor.
    const best = candidates[0];
    if (best && candidates.length === 1) return done(best.memberId, 'fuzzy', best.score);
    return { memberId: null, method: null, score: best?.score ?? null, candidates };
  };
}
