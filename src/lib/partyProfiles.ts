import type { Party } from './data';

/*
 * Who founded each party, when and how, and who leads it now (owner,
 * 2026-09-11). The parliament's data has none of this. Every fact below is
 * from the party's Bangla and English Wikipedia articles, read on the
 * `checked` date; where the two disagreed the more specific one was taken
 * (BJP: 5 August 2001 in the English article's history, not the Bangla
 * infobox's "2000") and a fact found in neither was left out (PSM names no
 * founder; Khelafat Majlis's two addresses conflict). Wikipedia's ideology
 * labels are left out on purpose: they are contested characterisations, and
 * the site describes, it does not rate.
 *
 * An editor can change any of these in the admin panel; that override wins.
 */
export type PartyProfile = {
  /** YYYY-MM-DD, or YYYY when only the year is known. */
  foundedOn?: string;
  founderBn?: string;
  /** The founders of NCP are two organisations, not a person. */
  founderKind?: 'person' | 'org';
  /** How the party came to be, in plain words. */
  originBn?: string;
  leaderTitleBn?: string;
  leaderNameBn?: string;
  /** Set when the leader sits in this parliament, to link their profile. */
  leaderMemberId?: string;
  secretaryTitleBn?: string;
  secretaryNameBn?: string;
  secretaryMemberId?: string;
  headquartersBn?: string;
  website?: string;
  sources: string[];
  checked: string;
};

/** The fields an editor can change, under the same names on the party object. */
export const PROFILE_KEYS = [
  'originBn', 'foundedOn', 'founderBn', 'leaderTitleBn', 'leaderNameBn',
  'secretaryTitleBn', 'secretaryNameBn', 'headquartersBn', 'website',
] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];

const wiki = (lang: 'bn' | 'en', title: string) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const CHECKED = '2026-09-11';

export const PARTY_PROFILES: Record<string, PartyProfile> = {
  BNP: {
    foundedOn: '1978-09-01',
    founderBn: 'জিয়াউর রহমান',
    founderKind: 'person',
    originBn:
      'তৎকালীন রাষ্ট্রপতি জিয়াউর রহমান ১৯৭৮ সালের ১ সেপ্টেম্বর দলটি প্রতিষ্ঠা করেন; এর আগের সংগঠন ছিল জাতীয়তাবাদী গণতান্ত্রিক দল (জাগদল)। ১৯৮১ সালে জিয়াউর রহমান নিহত হওয়ার পর তাঁর স্ত্রী খালেদা জিয়া দলের নেতৃত্বে আসেন। ২০২৬ সালের নির্বাচনের পর থেকে দলটি সরকারে।',
    leaderTitleBn: 'চেয়ারম্যান',
    leaderNameBn: 'তারেক রহমান',
    leaderMemberId: '013019001',
    secretaryTitleBn: 'মহাসচিব (ভারপ্রাপ্ত)',
    secretaryNameBn: 'রুহুল কবির রিজভী',
    headquartersBn: '২৮/১ নয়াপল্টন, ঢাকা',
    website: 'https://www.bnpbd.org',
    sources: [wiki('bn', 'বাংলাদেশ জাতীয়তাবাদী দল'), wiki('en', 'Bangladesh Nationalist Party')],
    checked: CHECKED,
  },
  BJEI: {
    foundedOn: '1979-05-27',
    founderBn: 'আব্বাস আলী খান',
    founderKind: 'person',
    originBn:
      'দলটির উৎস ১৯৪১ সালে সৈয়দ আবুল আলা মওদুদীর প্রতিষ্ঠিত জামায়াতে ইসলামী। স্বাধীনতার পর ১৯৭২ থেকে ১৯৭৬ সাল পর্যন্ত ধর্মভিত্তিক দল নিষিদ্ধ থাকায় এর সদস্যরা অন্য কয়েকটি দলের সঙ্গে মিলে ইসলামিক ডেমোক্রেটিক লীগ গঠন করেন। ১৯৭৯ সালের ২৭ মে ঢাকার হোটেল ইডেনে বাংলাদেশ জামায়াতে ইসলামী নামে দলটি আত্মপ্রকাশ করে।',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'শফিকুর রহমান',
    leaderMemberId: '013018801',
    secretaryTitleBn: 'সেক্রেটারি জেনারেল',
    secretaryNameBn: 'মিয়া গোলাম পরওয়ার',
    headquartersBn: '৫০৫ এলিফ্যান্ট রোড, মগবাজার, ঢাকা',
    website: 'https://jamaat-e-islami.org',
    sources: [wiki('bn', 'বাংলাদেশ জামায়াতে ইসলামী'), wiki('en', 'Bangladesh Jamaat-e-Islami')],
    checked: CHECKED,
  },
  NCP: {
    foundedOn: '2025-02-28',
    founderBn: 'বৈষম্যবিরোধী ছাত্র আন্দোলন ও জাতীয় নাগরিক কমিটি',
    founderKind: 'org',
    originBn:
      '২০২৪ সালের ছাত্র-জনতার অভ্যুত্থানে আওয়ামী লীগ সরকারের পতনের পর বৈষম্যবিরোধী ছাত্র আন্দোলন ও জাতীয় নাগরিক কমিটি মিলে দলটি গঠন করে। ২০২৫ সালের ২৮ ফেব্রুয়ারি নাহিদ ইসলামকে আহ্বায়ক করে দলটির আত্মপ্রকাশ।',
    leaderTitleBn: 'আহ্বায়ক',
    leaderNameBn: 'নাহিদ ইসলাম',
    leaderMemberId: '013018401',
    secretaryTitleBn: 'সদস্য সচিব',
    secretaryNameBn: 'আখতার হোসেন',
    secretaryMemberId: '013002201',
    headquartersBn: 'রূপায়ণ ট্রেড সেন্টার, ১১৪ কাজী নজরুল ইসলাম এভিনিউ, বাংলামোটর, ঢাকা',
    sources: [wiki('bn', 'জাতীয় নাগরিক পার্টি'), wiki('en', 'National Citizen Party')],
    checked: CHECKED,
  },
  BKM: {
    foundedOn: '1989-12-08',
    founderBn: 'শায়খুল হাদিস আজিজুল হক',
    founderKind: 'person',
    originBn:
      'শায়খুল হাদিস আজিজুল হক ১৯৮৯ সালের ৮ ডিসেম্বর খেলাফত মজলিস প্রতিষ্ঠা করেন; বাংলাদেশ খেলাফত মজলিস ও খেলাফত মজলিস দুটি দলই সেই প্রতিষ্ঠাকে নিজেদের সূচনা বলে। বাংলাদেশ খেলাফত মজলিস নামে দলটি ২০০৮ সালে নির্বাচন কমিশনে নিবন্ধিত হয়। ২০২৬ সালের নির্বাচনে দলটি প্রথমবার সংসদীয় আসনে জেতে।',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'মামুনুল হক',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'জালালুদ্দীন আহমেদ',
    headquartersBn: '৫৯/৩/৩ পুরানা পল্টন, ঢাকা',
    sources: [wiki('bn', 'বাংলাদেশ খেলাফত মজলিস')],
    checked: CHECKED,
  },
  IMB: {
    foundedOn: '1987-03-13',
    founderBn: 'সৈয়দ ফজলুল করিম (চরমোনাই পীর)',
    founderKind: 'person',
    originBn:
      'সৈয়দ ফজলুল করিম ১৯৮৭ সালের ১৩ মার্চ ইসলামী শাসনতন্ত্র আন্দোলন নামে এটি প্রতিষ্ঠা করেন; ১৯৯১ সাল থেকে এটি রাজনৈতিক দল হিসেবে কাজ করছে। ২০০৮ সালে নির্বাচন কমিশনে নিবন্ধনের সময় নাম বদলে ইসলামী আন্দোলন বাংলাদেশ হয়। দলটি চরমোনাই পীরের দল নামেও পরিচিত।',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'সৈয়দ রেজাউল করিম',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'গাজী আতাউর রহমান',
    headquartersBn: '৫৫/বি নোয়াখালী টাওয়ার, পুরানা পল্টন, ঢাকা',
    sources: [wiki('bn', 'ইসলামী আন্দোলন বাংলাদেশ'), wiki('en', 'Islami Andolan Bangladesh')],
    checked: CHECKED,
  },
  GOP: {
    foundedOn: '2021-10-26',
    founderBn: 'নুরুল হক নুর',
    founderKind: 'person',
    originBn:
      'ঢাকা বিশ্ববিদ্যালয় কেন্দ্রীয় ছাত্র সংসদের (ডাকসু) সাবেক সহসভাপতি নুরুল হক নুর ২০২১ সালের ২৬ অক্টোবর দলটি প্রতিষ্ঠা করেন। ২০২৪ সালের ২ সেপ্টেম্বর দলটি নির্বাচন কমিশনের নিবন্ধন পায়।',
    leaderTitleBn: 'সভাপতি',
    leaderNameBn: 'নুরুল হক নুর',
    leaderMemberId: '013011301',
    secretaryTitleBn: 'সাধারণ সম্পাদক',
    secretaryNameBn: 'হাসান আল মামুন',
    headquartersBn: 'আল-রাজী কমপ্লেক্স, পুরানা পল্টন, ঢাকা',
    website: 'https://gonoodhikar.com',
    sources: [wiki('bn', 'গণঅধিকার পরিষদ'), wiki('en', 'Gono Odhikar Parishad')],
    checked: CHECKED,
  },
  BJP: {
    foundedOn: '2001-08-05',
    founderBn: 'নাজিউর রহমান মঞ্জুর',
    founderKind: 'person',
    originBn:
      'জাতীয় পার্টির মহাসচিব নাজিউর রহমান মঞ্জুর চেয়ারম্যান হুসেইন মুহম্মদ এরশাদের সঙ্গে নীতিগত মতভেদের পর ২০০১ সালের ৫ আগস্ট দলটি গঠন করেন; তাই এটি জাতীয় পার্টি (নাজিউর) নামেও পরিচিত।',
    leaderTitleBn: 'চেয়ারম্যান',
    leaderNameBn: 'আন্দালিব রহমান পার্থ',
    leaderMemberId: '013011501',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'আব্দুল মতিন সাউদ',
    headquartersBn: '৫০ ডি আই টি এক্সটেনশন রোড, নয়াপল্টন, ঢাকা',
    sources: [wiki('bn', 'বাংলাদেশ জাতীয় পার্টি'), wiki('en', 'Bangladesh Jatiya Party')],
    checked: CHECKED,
  },
  KM: {
    foundedOn: '1989-12-08',
    founderBn: 'শায়খুল হাদিস আজিজুল হক',
    founderKind: 'person',
    originBn:
      '১৯৮৯ সালের ৮ ডিসেম্বর ঢাকার আইইবি মিলনায়তনে এক জাতীয় সম্মেলনে দলটি প্রতিষ্ঠিত হয়; নেতৃত্বে ছিলেন শায়খুল হাদিস আজিজুল হক, সঙ্গে আহমদ আবদুল কাদের এবং ন্যাপ ও তমদ্দুন মজলিসের সাবেক নেতারা। বাংলাদেশ খেলাফত মজলিসও একই প্রতিষ্ঠাকে নিজেদের সূচনা বলে। ২০২৬ সালের নির্বাচনে দলটি প্রথমবার সংসদীয় আসনে জেতে।',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'আব্দুল বাছিত আজাদ',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'আহমদ আবদুল কাদের',
    sources: [wiki('bn', 'খেলাফত মজলিস'), wiki('en', 'Khelafat Majlis')],
    checked: CHECKED,
  },
  PSM: {
    foundedOn: '2002-08-29',
    originBn:
      '২০০২ সালের ২৯ আগস্ট ‘জনগণের নিজস্ব রাজনৈতিক শক্তি গড়ে তোলার আহ্বান’ নিয়ে সংগঠনটির যাত্রা শুরু। ২০১৬ সালের নভেম্বরে তৃতীয় জাতীয় প্রতিনিধি সম্মেলনে এটি আনুষ্ঠানিকভাবে রাজনৈতিক দল হিসেবে আত্মপ্রকাশ করে, প্রধান সমন্বয়কারী হন জোনায়েদ সাকি; পরে তিনি পদটি ছাড়েন। ২০২৪ সালের ১৭ সেপ্টেম্বর নির্বাচন কমিশন দলটিকে নিবন্ধন দেয়।',
    leaderTitleBn: 'প্রধান সমন্বয়কারী (ভারপ্রাপ্ত)',
    leaderNameBn: 'দেওয়ান আব্দুল রশিদ নিলু',
    secretaryTitleBn: 'নির্বাহী সমন্বয়কারী',
    secretaryNameBn: 'আবুল হাসান রুবেল',
    headquartersBn: '৩০৬-৩০৭ রোজ ভিউ প্লাজা, ১৮৫ বীর উত্তম সি আর দত্ত রোড, হাতিরপুল, ঢাকা',
    website: 'https://ganosamhati.com',
    sources: [wiki('bn', 'গণসংহতি আন্দোলন'), wiki('en', 'Ganosanhati Andolan')],
    checked: CHECKED,
  },
  JAGPA: {
    foundedOn: '1980-04-06',
    founderBn: 'শফিউল আলম প্রধান',
    founderKind: 'person',
    originBn:
      'শফিউল আলম প্রধান ১৯৮০ সালের ৬ এপ্রিল ঢাকার বায়তুল মোকাররমে এক সংবাদ সম্মেলনে দলটি গঠনের ঘোষণা দেন। ২০০৮ সালে নির্বাচন কমিশনের নিবন্ধন পেলেও ২০২১ সালে তা বাতিল হয়; ২০২৫ সালের ১৯ মার্চ হাইকোর্ট সেই বাতিলকে অবৈধ ঘোষণা করে।',
    leaderTitleBn: 'চেয়ারম্যান',
    leaderNameBn: 'তাসমিয়া প্রধান',
    leaderMemberId: '013034701',
    secretaryTitleBn: 'সাধারণ সম্পাদক',
    secretaryNameBn: 'ইকবাল হোসেন প্রধান',
    headquartersBn: 'আসাদ গেট, ঢাকা',
    website: 'https://www.jagpa.org',
    sources: [wiki('bn', 'জাতীয় গণতান্ত্রিক পার্টি'), wiki('en', 'Jatiya Ganotantrik Party')],
    checked: CHECKED,
  },
};

export type ResolvedProfile = PartyProfile & {
  /** True when an editor has changed at least one field, so the page does not claim Wikipedia for it. */
  edited: boolean;
};

/**
 * The profile as the site shows it: an editor's value where one was saved
 * (a cleared field stays cleared), the sourced value otherwise. A changed
 * name no longer links to the member the sourced one was matched to.
 */
export function partyProfile(p: Party): ResolvedProfile | null {
  const base = PARTY_PROFILES[p.abbr];
  const saved = p as Party & Partial<Record<ProfileKey, string | null>>;
  const touched = PROFILE_KEYS.filter((k) => k in saved);
  if (!base && !touched.some((k) => saved[k])) return null;

  const out: ResolvedProfile = base ? { ...base, edited: touched.length > 0 } : { sources: [], checked: '', edited: true };
  for (const k of touched) {
    const v = saved[k];
    if (v) out[k] = v;
    else delete out[k];
    if (k === 'leaderNameBn') delete out.leaderMemberId;
    if (k === 'secretaryNameBn') delete out.secretaryMemberId;
  }
  return out;
}

/** "1978" from "1978-09-01" or "1978". */
export const foundedYear = (profile: PartyProfile | null) => profile?.foundedOn?.match(/^\d{4}/)?.[0] ?? null;
