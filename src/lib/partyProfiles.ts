import type { Party } from './data';

/*
 * Who founded each party, when and how, what it has done since, and who leads
 * it now (owner, 2026-09-11). The parliament's data has none of this. Every
 * fact below is from the party's Bangla and English Wikipedia articles, read
 * on the `checked` date.
 *
 * - Where the two disagreed, the more specific one was taken (BJP: 5 August
 *   2001 in the English article's history, not the Bangla infobox's "2000").
 * - Where a fact was contradicted or stated by neither, it was left out: PSM
 *   names no founder; Khelafat Majlis's two addresses conflict; JAGPA's
 *   founding place differs (Baitul Mukarram / Ramna); JAGPA's symbol is named
 *   only in one infobox. "Won a seat for the first time in 2026" is dropped
 *   for BKM, KM and IMB, because the same articles record a 1991 seat won
 *   under the Islami Oikya Jote banner.
 * - The text covers founding, leadership, elections and government,
 *   registration, alliances and the current parliament. Wikipedia's ideology
 *   labels and every party's evaluative criticism are left out alike: the site
 *   describes, it does not rate. Documented history that is part of how a
 *   party came to be stays in (Jamaat's predecessor opposed independence in
 *   1971, which is why it re-formed in 1979).
 *
 * An editor can change any of these in the admin panel; that override wins.
 */
export type PartyProfile = {
  /** One or two sentences for the party list. */
  summaryBn?: string;
  /** The party's story for its own page; paragraphs split by a blank line. */
  originBn?: string;
  /** YYYY-MM-DD, or YYYY when only the year is known. */
  foundedOn?: string;
  /** Several founders are joined with " ও ". */
  founderBn?: string;
  /** NCP's founders are two organisations, not people. */
  founderKind?: 'person' | 'org';
  symbolBn?: string;
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
  'summaryBn', 'originBn', 'foundedOn', 'founderBn', 'symbolBn', 'leaderTitleBn', 'leaderNameBn',
  'secretaryTitleBn', 'secretaryNameBn', 'headquartersBn', 'website',
] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];

const wiki = (lang: 'bn' | 'en', title: string) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const CHECKED = '2026-09-11';

export const PARTY_PROFILES: Record<string, PartyProfile> = {
  // The owner's own wording (2026-09-12), with "ছয়বার" made "পাঁচবার" to agree with its own list of wins.
  BNP: {
    summaryBn: 'জিয়াউর রহমানের প্রতিষ্ঠিত দল, পাঁচবার জাতীয় নির্বাচনে জয়ী এবং ২০২৬ সালের নির্বাচনের পর থেকে সরকারে।',
    originBn:
      'তৎকালীন রাষ্ট্রপতি জিয়াউর রহমান ১৯৭৮ সালের ১ সেপ্টেম্বর ঢাকার রমনা রেস্তোরাঁয় এক সংবাদ সম্মেলনে ঘোষণাপত্র পড়ে দলটির যাত্রা শুরু করেন। এর কয়েক দিন আগে তাঁর সমর্থনে গড়া জাতীয়তাবাদী গণতান্ত্রিক দল (জাগদল) বিলুপ্ত হয়ে নতুন দলে মিশে যায়। প্রথম মহাসচিব ছিলেন অধ্যাপক একিউএম বদরুদ্দোজা চৌধুরী।\n\n' +
      '১৯৮১ সালে জিয়াউর রহমান নিহত হওয়ার পর খালেদা জিয়া দলের হাল ধরেন এবং ১৯৮৩ সাল থেকে নেতৃত্ব দেন; তিনি বাংলাদেশের প্রথম নারী প্রধানমন্ত্রী। ২০১৮ থেকে ২০২৫ সাল পর্যন্ত তারেক রহমান ভারপ্রাপ্ত চেয়ারম্যান ছিলেন; ২০২৫ সালে খালেদা জিয়ার মৃত্যুর পর তিনি চেয়ারম্যান হন এবং ২০২৬ সালের নির্বাচনে ঢাকা-১৭ আসন থেকে জয়ী হয়ে প্রধানমন্ত্রী হয়েছেন।\n\n' +
      'দলটি ১৯৭৯, ১৯৯১, ১৯৯৬ (ফেব্রুয়ারি), ২০০১ ও ২০২৬ সালের জাতীয় নির্বাচনে জয়ী হয়। ১৯৯৬ সালের ফেব্রুয়ারির নির্বাচনের পর গঠিত সরকার অল্প কিছুদিন টিকেছিল। ২০০৮, ২০১৪, ২০১৮ ও ২০২৪ সালের নির্বাচনে দলটি হয় হেরেছে, নয় অংশ নেয়নি।',
    foundedOn: '1978-09-01',
    founderBn: 'জিয়াউর রহমান',
    founderKind: 'person',
    symbolBn: 'ধানের শীষ',
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
    summaryBn:
      'দেশের সবচেয়ে বড় ইসলামপন্থী রাজনৈতিক দল, বর্তমান রূপে ১৯৭৯ সালে গঠিত। ২০২৬ সালের নির্বাচনের পর থেকে জাতীয় সংসদে প্রধান বিরোধী দল।',
    originBn:
      'দলটির উৎস ১৯৪১ সালে সৈয়দ আবুল আলা মওদুদীর প্রতিষ্ঠিত জামায়াতে ইসলামী। ১৯৭১ সালে এর পূর্বসূরি জামায়াতে ইসলামী পাকিস্তান বাংলাদেশের স্বাধীনতার বিরোধিতা করে পাকিস্তানি বাহিনীর পক্ষ নেয়। স্বাধীনতার পর ধর্মভিত্তিক রাজনীতি নিষিদ্ধ হলে এর নেতাকর্মীরা কিছুদিন ইসলামিক ডেমোক্রেটিক লীগের সঙ্গে যুক্ত ছিলেন; ১৯৭৯ সালের ২৭ মে ঢাকার হোটেল ইডেনে বাংলাদেশ জামায়াতে ইসলামী নামে দলটি আত্মপ্রকাশ করে, ভারপ্রাপ্ত আমির হন আব্বাস আলী খান।\n\n' +
      '১৯৯০ সালের গণ-অভ্যুত্থান ও তত্ত্বাবধায়ক সরকারের দাবির আন্দোলনে দলটি অংশ নেয়; ২০০১ সালে বিএনপির নেতৃত্বে চারদলীয় জোট সরকারে এর দুজন নেতা মন্ত্রী হন। ২০০৯ সালের পর ১৯৭১ সালের যুদ্ধাপরাধের মামলায় দলের কয়েকজন শীর্ষ নেতার বিচার হয়, ২০১৩ সালে হাইকোর্টের রায়ে নিবন্ধন অবৈধ ঘোষিত হয় এবং ২০২৪ সালের ১ আগস্ট সরকার দলটিকে নিষিদ্ধ করে। জুলাই অভ্যুত্থানের পর ২৮ আগস্ট ২০২৪ সেই নিষেধাজ্ঞা উঠে যায়, আর ২০২৫ সালের ১ জুন আপিল বিভাগের রায়ের পর নিবন্ধন ও দাঁড়িপাল্লা প্রতীক ফিরে আসে।',
    foundedOn: '1979-05-27',
    founderBn: 'আব্বাস আলী খান',
    founderKind: 'person',
    symbolBn: 'দাঁড়িপাল্লা',
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
    summaryBn:
      '২০২৪ সালের জুলাই অভ্যুত্থানের নেতৃত্ব দেওয়া তরুণদের গড়া দল, ২০২৫ সালে প্রতিষ্ঠিত। ২০২৬ সালের নির্বাচনে জামায়াতের নেতৃত্বাধীন ১১ দলীয় জোটের শরিক হিসেবে অংশ নেয়।',
    originBn:
      '২০২৪ সালের ছাত্র-জনতার অভ্যুত্থানে আওয়ামী লীগ সরকারের পতনের পর বৈষম্যবিরোধী ছাত্র আন্দোলন একটি নতুন রাজনৈতিক বন্দোবস্তের কথা বলে। সে বছরের সেপ্টেম্বরে আখতার হোসেন ও নাসীরুদ্দীন পাটওয়ারীর নেতৃত্বে জাতীয় নাগরিক কমিটি গঠিত হয়, এরপর দেশজুড়ে থানা পর্যায়ে কমিটি গড়ার কাজ চলে।\n\n' +
      '২০২৫ সালের ২৮ ফেব্রুয়ারি এই দুই সংগঠনের উদ্যোগে জাতীয় নাগরিক পার্টি আত্মপ্রকাশ করে, আহ্বায়ক হন নাহিদ ইসলাম; এটিকে দেশের প্রথম ছাত্র-নেতৃত্বাধীন রাজনৈতিক দল বলা হয়। দলটি নির্বাচনী প্রতীক হিসেবে শাপলা কলি পায় এবং ২০২৫ সালের ২৮ ডিসেম্বর জামায়াতের নেতৃত্বাধীন ১১ দলীয় জোটে যোগ দিয়ে ২০২৬ সালের নির্বাচনে অংশ নেয়।',
    foundedOn: '2025-02-28',
    founderBn: 'বৈষম্যবিরোধী ছাত্র আন্দোলন ও জাতীয় নাগরিক কমিটি',
    founderKind: 'org',
    symbolBn: 'শাপলা কলি',
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
    summaryBn:
      '১৯৮৯ সালে প্রতিষ্ঠিত খেলাফত মজলিস ২০০৫ সালে দুই ভাগ হলে শায়খুল হাদিস আজিজুল হকের অংশটি এই নামে চলে। ২০২৬ সালের নির্বাচনে দুটি আসনে জেতে।',
    originBn:
      '১৯৮৯ সালের ৮ ডিসেম্বর ঢাকার ইঞ্জিনিয়ার্স ইনস্টিটিউশন মিলনায়তনে শায়খুল হাদিস আজিজুল হকের খেলাফত আন্দোলন, আহমদ আবদুল কাদেরের ইসলামী যুব শিবির, মাসউদ খানের নেতৃত্বে ন্যাপের একাংশ ও তমদ্দুন মজলিসের সংগঠকেরা মিলে খেলাফত মজলিস গঠন করেন। প্রথম আমির ছিলেন মাওলানা আবদুল গফফার, পরে আমির হন আজিজুল হক।\n\n' +
      '২০০৫ সালে বিএনপির নেতৃত্বাধীন চারদলীয় জোটে থাকা নিয়ে দলটি দুই ভাগ হয়: জোটে থাকা অংশটি খেলাফত মজলিস নামে, আর আজিজুল হকের নেতৃত্বে জোট ছেড়ে যাওয়া অংশটি বাংলাদেশ খেলাফত মজলিস নামে চলে। দলটি ২০০৮ সালে নির্বাচন কমিশনে নিবন্ধিত হয়। ২০২৬ সালের নির্বাচনে ১১ দলীয় নির্বাচনী ঐক্যের শরিক হিসেবে দলটি দুটি সংসদীয় আসনে জেতে এবং সংরক্ষিত নারী আসনে একজন সদস্য পায়।',
    foundedOn: '1989-12-08',
    founderBn: 'শায়খুল হাদিস আজিজুল হক',
    founderKind: 'person',
    symbolBn: 'রিকশা',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'মামুনুল হক',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'জালালুদ্দীন আহমেদ',
    headquartersBn: '৫৯/৩/৩ পুরানা পল্টন, ঢাকা',
    sources: [wiki('bn', 'বাংলাদেশ খেলাফত মজলিস'), wiki('en', 'Khelafat Majlis')],
    checked: CHECKED,
  },
  IMB: {
    summaryBn:
      'চরমোনাই পীর সৈয়দ ফজলুল করিমের ১৯৮৭ সালে শুরু করা ইসলামী শাসনতন্ত্র আন্দোলন থেকে আসা দল, চরমোনাই পীরের দল নামেও পরিচিত। ২০২৬ সালের নির্বাচনে একটি আসনে জেতে।',
    originBn:
      '১৯৮৭ সালের ১৩ মার্চ বাংলাদেশ মুজাহিদ কমিটির আমির সৈয়দ ফজলুল করিমের নেতৃত্বে কয়েকটি ইসলামি সংগঠন ও ব্যক্তিত্ব মিলে ইস্যুভিত্তিক আন্দোলন হিসেবে ইসলামী শাসনতন্ত্র আন্দোলন শুরু করেন। শরিকদের মধ্যে অনৈক্যের পর এটি চরমোনাই পীরের নেতৃত্বাধীন একক সংগঠনে পরিণত হয় এবং ১৯৯১ সাল থেকে পূর্ণাঙ্গ রাজনৈতিক দল হিসেবে কাজ করছে।\n\n' +
      '২০০৮ সালের ২০ নভেম্বর দলটি ইসলামী আন্দোলন বাংলাদেশ নামে নির্বাচন কমিশনে নিবন্ধিত হয়; নির্বাচনী প্রতীক হাতপাখা। ২০০৬ সাল থেকে দলের আমির সৈয়দ রেজাউল করিম। ২০২৬ সালের নির্বাচনে দলটির একজন প্রার্থী সংসদ সদস্য নির্বাচিত হন।',
    foundedOn: '1987-03-13',
    founderBn: 'সৈয়দ ফজলুল করিম (চরমোনাই পীর)',
    founderKind: 'person',
    symbolBn: 'হাতপাখা',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'সৈয়দ রেজাউল করিম',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'গাজী আতাউর রহমান',
    headquartersBn: '৫৫/বি নোয়াখালী টাওয়ার, পুরানা পল্টন, ঢাকা',
    sources: [wiki('bn', 'ইসলামী আন্দোলন বাংলাদেশ'), wiki('en', 'Islami Andolan Bangladesh')],
    checked: CHECKED,
  },
  GOP: {
    summaryBn:
      '২০১৮ সালের কোটা সংস্কার আন্দোলন থেকে উঠে আসা দল, ২০২১ সালে প্রতিষ্ঠিত। নেতৃত্বে ডাকসুর সাবেক সহসভাপতি নুরুল হক নুর।',
    originBn:
      '২০১৮ সালের ১৭ ফেব্রুয়ারি কোটা সংস্কার আন্দোলনের নেতারা বাংলাদেশ সাধারণ ছাত্র অধিকার সংরক্ষণ পরিষদ গড়ে তোলেন, পরে যার নাম হয় বাংলাদেশ ছাত্র অধিকার পরিষদ। ২০১৯ সালের ডাকসু নির্বাচনে এই আন্দোলনের নেতা নুরুল হক নুর সহসভাপতি (ভিপি) নির্বাচিত হন।\n\n' +
      '২০২১ সালের ২৬ অক্টোবর অর্থনীতিবিদ ড. রেজা কিবরিয়া ও নুরুল হক নুরের নেতৃত্বে গণঅধিকার পরিষদ রাজনৈতিক দল হিসেবে আত্মপ্রকাশ করে। ২০২৩ সালে নেতৃত্ব নিয়ে বিরোধে দলটি দুই ভাগ হলে নুরুল হক সভাপতি নির্বাচিত হন, আর বছরের শেষে রেজা কিবরিয়া দল ছাড়েন। ২০২৪ সালের ২ সেপ্টেম্বর ট্রাক প্রতীকসহ দলটি নির্বাচন কমিশনের নিবন্ধন পায়।',
    foundedOn: '2021-10-26',
    founderBn: 'নুরুল হক নুর ও রেজা কিবরিয়া',
    founderKind: 'person',
    symbolBn: 'ট্রাক',
    leaderTitleBn: 'সভাপতি',
    leaderNameBn: 'নুরুল হক নুর',
    leaderMemberId: '013011301',
    secretaryTitleBn: 'সাধারণ সম্পাদক',
    secretaryNameBn: 'হাসান আল মামুন',
    headquartersBn: 'আল-রাজী কমপ্লেক্স, বিজয়নগর, পুরানা পল্টন, ঢাকা',
    website: 'https://gonoodhikar.com',
    sources: [wiki('bn', 'গণঅধিকার পরিষদ'), wiki('en', 'Gono Odhikar Parishad')],
    checked: CHECKED,
  },
  BJP: {
    summaryBn:
      'জাতীয় পার্টি থেকে বেরিয়ে নাজিউর রহমান মঞ্জুর ২০০১ সালে দলটি গড়েন; এখন নেতৃত্বে তাঁর ছেলে ব্যারিস্টার আন্দালিব রহমান পার্থ।',
    originBn:
      'নাজিউর রহমান মঞ্জুর মুক্তিযুদ্ধে অংশ নেন, এরশাদ সরকারের মন্ত্রী ও ঢাকার মেয়র ছিলেন এবং ১৯৯৮ থেকে ২০০১ সাল পর্যন্ত জাতীয় পার্টির মহাসচিবের দায়িত্বে ছিলেন। চেয়ারম্যান হুসেইন মুহম্মদ এরশাদের সঙ্গে নীতিগত মতভেদের পর তিনি ২০০১ সালের ৫ আগস্ট বাংলাদেশ জাতীয় পার্টি গঠন করেন, তাই দলটি জাতীয় পার্টি (নাজিউর) নামেও পরিচিত।\n\n' +
      'দলটি বিএনপির নেতৃত্বাধীন চারদলীয় জোটের শরিক হিসেবে ২০০১ সালের নির্বাচনে চারটি আসন পায় এবং পরে ২০ দলীয় জোটে থাকে; ২০১৯ সালে সেই জোট ছাড়ে। ২০০৮ সালে দলের চেয়ারম্যান ব্যারিস্টার আন্দালিব রহমান পার্থ ভোলা থেকে সংসদ সদস্য নির্বাচিত হন।',
    foundedOn: '2001-08-05',
    founderBn: 'নাজিউর রহমান মঞ্জুর',
    founderKind: 'person',
    symbolBn: 'গরুর গাড়ি',
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
    summaryBn:
      '১৯৮৯ সালে প্রতিষ্ঠিত খেলাফত মজলিসের যে অংশ ২০০৫ সালে বিএনপির জোটে থেকে যায়, সেটিই আজকের খেলাফত মজলিস। ২০২৬ সালের নির্বাচনে একটি আসনে জেতে।',
    originBn:
      '১৯৮৯ সালের ৮ ডিসেম্বর ঢাকার আইইবি মিলনায়তনে এক জাতীয় সম্মেলনে খেলাফত মজলিসের আত্মপ্রকাশ; শায়খুল হাদিস আজিজুল হকের নেতৃত্বে আহমদ আবদুল কাদেরের ইসলামী যুব শিবির, ন্যাপের একাংশ ও তমদ্দুন মজলিসের নেতারা এতে যুক্ত হন। ১৯৯০ সালের এরশাদবিরোধী গণ-অভ্যুত্থানে দলটি অংশ নেয়।\n\n' +
      '২০০৫ সালে বিএনপির নেতৃত্বাধীন চারদলীয় জোটে থাকা নিয়ে দলটি দুই ভাগ হয়; জোটে থাকা অংশে আমির হন মুহাম্মদ ইসহাক ও মহাসচিব আহমদ আবদুল কাদের, আর এই অংশটিই খেলাফত মজলিস নামে চলছে। দলটি ২০০৮ সালে নির্বাচন কমিশনে নিবন্ধিত হয়, ২২ বছর বিএনপির জোটে থাকার পর ২০২১ সালে জোট ছাড়ে এবং ২০২৬ সালের নির্বাচনে ১১ দলীয় নির্বাচনী ঐক্যের শরিক হিসেবে একটি আসনে জেতে।',
    foundedOn: '1989-12-08',
    founderBn: 'শায়খুল হাদিস আজিজুল হক',
    founderKind: 'person',
    symbolBn: 'দেয়াল ঘড়ি',
    leaderTitleBn: 'আমির',
    leaderNameBn: 'আব্দুল বাছিত আজাদ',
    secretaryTitleBn: 'মহাসচিব',
    secretaryNameBn: 'আহমদ আবদুল কাদের',
    sources: [wiki('bn', 'খেলাফত মজলিস'), wiki('en', 'Khelafat Majlis')],
    checked: CHECKED,
  },
  PSM: {
    summaryBn:
      'ছাত্র, শ্রমিক, নারী ও কৃষক সংগঠনের যৌথ উদ্যোগে ২০০২ সালে যাত্রা শুরু, ২০১৬ সালে রাজনৈতিক দল। ২০২৬ সালে জোনায়েদ সাকি ব্রাহ্মণবাড়িয়া-৬ আসনে জেতেন।',
    originBn:
      '২০০২ সালের ২৯ আগস্ট বাংলাদেশ ছাত্র ফেডারেশন, নারী সংহতি, গার্মেন্টস শ্রমিক সংহতি, প্রতিবেশ আন্দোলন, কৃষক-মজুর সংহতিসহ কয়েকটি সংগঠন মিলে ‘জনগণের নিজস্ব রাজনৈতিক শক্তি গড়ে তোলার আহ্বান’ নিয়ে গণসংহতি আন্দোলন গড়ে তোলে। ২০১৬ সালের নভেম্বরে তৃতীয় জাতীয় প্রতিনিধি সম্মেলনে এটি আনুষ্ঠানিকভাবে রাজনৈতিক দল হয়, প্রধান সমন্বয়কারী হন জোনায়েদ সাকি।\n\n' +
      'দলটি ২০২৪ সালের জুলাই অভ্যুত্থানে অংশ নেয় এবং সে বছরের ১৭ সেপ্টেম্বর নির্বাচন কমিশনের নিবন্ধন পায়। ২০২৬ সালের নির্বাচনে বিএনপির সঙ্গে সমঝোতায় জোনায়েদ সাকি ব্রাহ্মণবাড়িয়া-৬ আসনে জেতেন; পরে তিনি প্রধান সমন্বয়কারীর পদ ছাড়েন।',
    foundedOn: '2002-08-29',
    symbolBn: 'মাথাল',
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
    summaryBn:
      'শফিউল আলম প্রধানের ১৯৮০ সালে গড়া দল; দীর্ঘ সময় বিএনপির নেতৃত্বাধীন জোটে ছিল, ২০২৫ সালে ১১ দলীয় নির্বাচনী ঐক্যে যোগ দেয়।',
    originBn:
      'শফিউল আলম প্রধান ১৯৮০ সালের ৬ এপ্রিল ঢাকায় এক সংবাদ সম্মেলনে জাতীয় গণতান্ত্রিক পার্টি (জাগপা) গঠনের ঘোষণা দেন। দলটি বিএনপির নেতৃত্বাধীন ২০ দলীয় জোটের শরিক ছিল; ২০২২ সালের ডিসেম্বরে সেই জোট বিলুপ্ত হলে ১২ দলীয় জোটে থাকে।\n\n' +
      '২০০৮ সালে নির্বাচন কমিশনের নিবন্ধন পেলেও ২০২১ সালের ৩১ জানুয়ারি তা বাতিল হয়; ২০২৫ সালের ১৯ মার্চ হাইকোর্ট সেই বাতিলকে অবৈধ ঘোষণা করে। একই বছর দলটি ১১ দলীয় নির্বাচনী ঐক্যে যোগ দেয়, আর ২০২৬ সালে দলের চেয়ারম্যান তাসমিয়া প্রধান সংরক্ষিত নারী আসনের সংসদ সদস্য হন।',
    foundedOn: '1980-04-06',
    founderBn: 'শফিউল আলম প্রধান',
    founderKind: 'person',
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

/** The story's paragraphs. */
export const paragraphs = (text: string | undefined) => (text ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
