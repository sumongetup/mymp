import type { Locale } from './site';

/**
 * UI strings. Bangla is the product's first language; English mirrors it.
 * Data (names, places) is bilingual in the database and is not translated here.
 */
const bn = {
    brand: 'দুরবীন নিউজ',
    section: 'সংসদ',
    tagline: 'ত্রয়োদশ জাতীয় সংসদের সদস্যদের যাচাই করা তথ্যভান্ডার',
    otherLanguage: 'English',
    listingTitle: 'ত্রয়োদশ জাতীয় সংসদের আসন',
    listingLede: 'বাংলাদেশ জাতীয় সংসদের তথ্যভান্ডার অনুযায়ী প্রতিটি নির্বাচনী এলাকা, বিভাগ ও জেলা ধরে সাজানো।',
    seats: 'আসন',
    territorial: 'নির্বাচনী এলাকা',
    reserved: 'সংরক্ষিত নারী আসন',
    divisions: 'বিভাগ',
    districts: 'জেলা',
    reservedHeading: 'সংরক্ষিত নারী আসন',
    reservedNote: 'সংরক্ষিত আসন কোনো জেলার অন্তর্গত নয়; নির্বাচনের ফলের অনুপাতে দলগুলোর মধ্যে বণ্টিত হয়।',
    noData: 'তথ্য পাওয়া যায়নি',
    boundary: 'এলাকা',
    aboutData: 'তথ্যের উৎস',
    aboutDataLede: 'প্রতিটি তথ্য কোথা থেকে এসেছে, কীভাবে যাচাই হয়েছে, আর ভুল পেলে কী করবেন।',
    disclaimer:
      'সংবাদ শিরোনামের স্বত্ব সংশ্লিষ্ট প্রকাশকের; দুরবীন নিউজ শুধু মূল সংবাদের লিংক দেয়। সদস্যদের তথ্যের উৎস বাংলাদেশ জাতীয় সংসদ ও নির্বাচন কমিশন।',
    sourceLine: 'তথ্যসূত্র: বাংলাদেশ জাতীয় সংসদ',
    reportError: 'ভুল জানান',
    fixtureBanner: 'স্থানীয় ডেভেলপমেন্ট: এগুলো TEST_ ফিক্সচার, আসল তথ্য নয়।',
};

/** Every locale carries exactly the keys Bangla does. */
export type Strings = { [K in keyof typeof bn]: string };

const en: Strings = {
    brand: 'Durbin News',
    section: 'Parliament',
    tagline: 'A verified directory of the members of the 13th Jatiya Sangsad',
    otherLanguage: 'বাংলা',
    listingTitle: 'Seats of the 13th Jatiya Sangsad',
    listingLede: 'Every constituency as recorded by the Bangladesh Parliament, arranged by division and district.',
    seats: 'seats',
    territorial: 'constituencies',
    reserved: 'reserved women’s seats',
    divisions: 'divisions',
    districts: 'districts',
    reservedHeading: 'Reserved women’s seats',
    reservedNote: 'Reserved seats belong to no district; they are allocated among parties in proportion to the election result.',
    noData: 'No data available',
    boundary: 'Area',
    aboutData: 'About the data',
    aboutDataLede: 'Where every figure comes from, how it was verified, and what to do if you spot an error.',
    disclaimer:
      'News headlines belong to their respective publishers; Durbin News links to the original. Member data comes from the Bangladesh Parliament and the Election Commission.',
    sourceLine: 'Source: Bangladesh Parliament',
    reportError: 'Report an error',
    fixtureBanner: 'Local development: these are TEST_ fixtures, not real data.',
};

const STRINGS: Record<Locale, Strings> = { bn, en };
export const t = (locale: Locale): Strings => STRINGS[locale];

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
/** Numbers in the reader's script: ৩৫০ in Bangla, 350 in English. */
export const num = (locale: Locale, n: number | string) =>
  locale === 'bn' ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d) : String(n);
