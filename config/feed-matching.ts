/**
 * What the feed matcher knows about language, kept out of the code so it can
 * be corrected without touching the scoring.
 */

/**
 * Surname spellings that are the same name. Applied to single tokens on both
 * sides, after the folding in lib/matching/nameMatch. Only surnames and
 * patronymics belong here: two given names that differ by a vowel are usually
 * two people (জাহেদ and জাহিদুর are not the same man).
 */
export const SPELLING_FOLD: Record<string, string> = {
  আহমেদ: 'আহমদ',
  আহমমেদ: 'আহমদ', // আহম্মেদ, after the hasanta is dropped
  আহমাদ: 'আহমদ',
  হোসাইন: 'হোসেন',
  হুসাইন: 'হোসেন',
  হুসেন: 'হোসেন',
  উদদিন: 'উদদিন', // উদ্দীন and উদ্দিন already fold together
  সিদদিকি: 'সিদদিকি',
  মিঞা: 'মিযা', // মিয়া, after the nukta is dropped
};

/**
 * Case endings a Bangla name takes in a sentence: মঈন খানের, সালাহউদ্দিন
 * আহমেদের, রহমানকে. Only the last word of a name carries one.
 */
export const CASE_SUFFIXES = ['', 'র', 'ের', 'এর', 'কে', 'ে', 'দের', 'রা', 'ও', 'ই', 'কেও', 'েরও', 'েই', 'য়ের', 'স'];

/**
 * Words that make a name in a headline somebody else: a cricketer, an actor, a
 * foreign politician, a police officer. A hit costs the match its name points,
 * which is what keeps a namesake off a member's page. Deliberately short: a
 * word here silences real stories too, so each one must be a job or a place a
 * sitting member cannot also be.
 */
export const NEGATIVE_CONTEXT = [
  'ক্রিকেটার', 'ক্রিকেট', 'ব্যাটসম্যান', 'বোলার', 'ফুটবলার', 'অধিনায়ক',
  'কবি', 'জাতীয় কবি', 'সাহিত্যিক', 'ঔপন্যাসিক', 'চিত্রশিল্পী',
  'অভিনেতা', 'অভিনেত্রী', 'নায়ক', 'নায়িকা', 'চিত্রনায়ক', 'গায়ক', 'গায়িকা', 'সংগীতশিল্পী', 'পরিচালক',
  'ভারতের প্রধানমন্ত্রী', 'পাকিস্তানের প্রধানমন্ত্রী', 'ভারতীয় অভিনেতা',
  'পুলিশ সুপার', 'ওসি', 'উপজেলা নির্বাহী', 'ইউএনও',
  'গ্রেপ্তারকৃত', 'ছাত্রদল নেতা', 'যুবদল নেতা', 'শ্রমিক নেতা',
];

/**
 * Office titles the press uses, mapped to the post title the posts sync
 * stores. A headline that says "পররাষ্ট্রমন্ত্রী" is about whoever holds that
 * ministry; the matcher only awards the points to the member who holds it.
 */
export const POST_WORDS: { word: string; matches: (post: string, ministry: string | null) => boolean }[] = [
  { word: 'প্রধানমন্ত্রী', matches: (p) => p === 'প্রধানমন্ত্রী' },
  { word: 'স্পিকার', matches: (p) => p === 'স্পিকার' },
  { word: 'ডেপুটি স্পিকার', matches: (p) => p === 'ডেপুটি স্পিকার' },
  { word: 'বিরোধীদলীয় নেতা', matches: (p) => p === 'বিরোধীদলীয় নেতা' },
  { word: 'সংসদ নেতা', matches: (p) => p === 'সংসদ নেতা' },
  { word: 'চিফ হুইপ', matches: (p) => p === 'চিফ হুইপ' },
  { word: 'হুইপ', matches: (p) => p === 'হুইপ' },
];

/**
 * YouTube channels whose uploads are news rather than commentary. A video from
 * one of these with the member's name in the title is worth more than the same
 * title from an unknown channel.
 */
export const TRUSTED_CHANNELS: { id: string; name: string }[] = [
  { id: 'UCOuh7lU8H5F6y-yjBHQ1rrw', name: 'Somoy TV' },
  { id: 'UCatMkolAfJcOnGC9-KA1qpg', name: 'Jamuna TV' },
  { id: 'UCqjIQKZBQXgqQz7QtV6y6qg', name: 'Channel 24' },
  { id: 'UCHLqIOMPk20w-6cFgkA90jw', name: 'DBC News' },
  { id: 'UC2P5Fd5g_OMxXmnLSSrEDXg', name: 'Independent Television' },
  { id: 'UCd5jpRpKSbALEQRs5aVBjzA', name: 'Prothom Alo' },
  { id: 'UC8yPmn9mqYFcYxNWzKlbEQg', name: 'BBC News Bangla' },
];
