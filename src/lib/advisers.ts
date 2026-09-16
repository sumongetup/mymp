/**
 * The Prime Minister's advisers who are not members of parliament.
 *
 * Everyone else on the cabinet list has a member record, and their biography
 * lives there. An adviser appointed from outside parliament has none, so the
 * profile is kept here, in data/advisers.json, written from the sources it
 * cites. The posts come from the cabinet list like everyone else's; the file
 * holds only who the person is.
 */
import advisersJson from '../../data/advisers.json';
import { currentPosts, type PostEntry } from './data';
import { normalizeName } from './posts/names';

export interface AdviserProfile {
  slug: string;
  /** The name exactly as the cabinet list writes it, which is how a post finds its profile. */
  postNameBn: string;
  nameBn: string;
  rankBn: string | null;
  bioBn: string;
  professionBn: string | null;
  educationBn: string | null;
  birthPlaceBn: string | null;
  partyRoleBn: string | null;
  sources: string[];
  checkedOn: string;
}

const profiles = (advisersJson as { advisers: AdviserProfile[] }).advisers;
const byName = new Map(profiles.map((a) => [normalizeName(a.postNameBn), a]));

export const allAdvisers = () => profiles;
export const getAdviser = (slug: string) => profiles.find((a) => a.slug === slug);

/** The profile for a post held by someone outside parliament, if there is one. */
export const adviserForPost = (p: Pick<PostEntry, 'memberId' | 'nameBn'>) =>
  p.memberId ? undefined : byName.get(normalizeName(p.nameBn));

/** An adviser's current posts, with a photograph where the cabinet list carries one. */
export function adviserPosts(a: AdviserProfile) {
  const key = normalizeName(a.postNameBn);
  const rows = currentPosts('government').filter((r) => !r.memberId && normalizeName(r.nameBn) === key);
  return {
    rows,
    photoUrl: rows.find((r) => r.photoUrl)?.photoUrl ?? null,
    sourceUrl: rows.find((r) => r.sourceUrl)?.sourceUrl ?? null,
  };
}
