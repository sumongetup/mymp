/**
 * The spellings a headline might use for a member.
 *
 * parliament.gov.bd writes "ড, আবদুল মঈন খান"; a headline writes "মঈন খান",
 * "ড. মঈন খান" or "মইন খানের". The matcher folds honorifics, initials and
 * case endings away by itself, so what is seeded here is the part that folding
 * cannot reach: the short form the press actually uses, and the র/ল ending
 * that Bangla names take either way (শফিকুর and শফিকুল).
 *
 * A short form is only seeded when it belongs to exactly one member. Two
 * members whose names both end "ইসলাম খান" get no short form, because it would
 * put one's news on the other's page.
 */
import { variantTokens } from './matchMp';

export interface VariantSeed {
  mpId: string;
  /** The folded words, space-joined: what the matcher looks for. */
  variant: string;
  source: 'official' | 'manual' | 'learned';
  weight: number;
}

export interface SeedMember {
  id: string;
  nameBn: string | null;
  nameEn: string | null;
}

/**
 * সফিকুর and সফিকুল, হাবিবুর and হাবিবুল: one man, two spellings. Only these
 * endings swap. আবদুল is not আবদুর, so a general ুর/ুল swap would invent
 * names that belong to other people.
 */
const RL_ENDINGS: [string, string][] = [['কুর', 'কুল'], ['বুর', 'বুল'], ['িউর', 'িউল']];

function rlSwap(tokens: string[]): string[] | null {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    for (const [a, b] of RL_ENDINGS) {
      if (t.endsWith(a)) return tokens.map((x, j) => (j === i ? x.slice(0, -a.length) + b : x));
      if (t.endsWith(b)) return tokens.map((x, j) => (j === i ? x.slice(0, -b.length) + a : x));
    }
  }
  return null;
}

/**
 * Every seed for every member, with the short forms that would be ambiguous
 * left out.
 */
export function seedVariants(members: SeedMember[]): VariantSeed[] {
  const full = members.map((m) => ({ m, tokens: variantTokens(m.nameBn ?? '') })).filter((x) => x.tokens.length >= 2);

  // How many members a trailing form would belong to.
  const tailCount = new Map<string, Set<string>>();
  for (const { m, tokens } of full) {
    for (let take = 2; take < tokens.length; take++) {
      const key = tokens.slice(-take).join(' ');
      const set = tailCount.get(key) ?? new Set<string>();
      set.add(m.id);
      tailCount.set(key, set);
    }
  }

  const out: VariantSeed[] = [];
  const seen = new Set<string>();
  const push = (mpId: string, tokens: string[], weight: number) => {
    if (tokens.length < 2) return;
    const variant = tokens.join(' ');
    const key = `${mpId}|${variant}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ mpId, variant, source: 'official', weight });
  };

  for (const { m, tokens } of full) {
    push(m.id, tokens, 1);
    const swapped = rlSwap(tokens);
    if (swapped) push(m.id, swapped, 0.95);

    // "আবদুল মঈন খান" is also written "মঈন খান", but only if no one else ends that way.
    for (let take = 2; take < tokens.length; take++) {
      const short = tokens.slice(-take);
      const owners = tailCount.get(short.join(' '));
      // Unique by construction, so a hit names this member as surely as the full form.
      if (owners && owners.size === 1) push(m.id, short, 1);
    }

    const en = variantTokens(m.nameEn ?? '');
    if (en.length >= 2) push(m.id, en, 1);
  }
  return out;
}
