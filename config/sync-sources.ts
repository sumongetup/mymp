/**
 * Where the posts sync (src/lib/posts/sync.ts) reads who holds which post.
 * When a source site changes, this is the file to update. Checked by hand
 * against the live sites on 2026-09-12.
 *
 * CABINET DIVISION (cabinet.gov.bd)
 * The lists are ordinary HTML pages on the Division's portal, not PDFs. Each
 * page holds a CKEditor table (<figure class="table"><table class="ck-table-
 * resized">) with the columns
 *   ক্রম | ছবি | নাম | পদবি | নিয়োগের তারিখ | মন্ত্রণালয়/বিভাগ | বণ্টনের তারিখ
 * (the adviser page says দায়িত্ব/মন্ত্রণালয়/বিভাগ). A person holding several
 * ministries spans rows with rowspan: the rows after theirs carry only the
 * ministry and its date. One-cell rows (colspan 7) are section headings such
 * as মন্ত্রিগণ. The adviser page has two tables, each after a heading that
 * names the rank (মন্ত্রীর / প্রতিমন্ত্রীর পদমর্যাদায় উপদেষ্টাগণ). Dates are
 * dd-mm-yyyy or dd.mm.yyyy in Bangla digits. The page also embeds a base64
 * copy of the same table in an attribute; the parser reads only the table.
 * If a page moves, the sync looks for a link on the home page whose address
 * matches `slug` before giving up.
 *
 * There is no deputy-minister (উপমন্ত্রী) page today. The parser accepts the
 * title on any of the pages, and the optional entry below is used as soon as
 * the home page links a page matching its slug.
 *
 * Not read: "special assistants with the status of a state minister"
 * (/pages/static-pages/special-assistants-with-the-status-of-a-state-minister-…),
 * which lists বিশেষ সহকারী, not members of the cabinet.
 *
 * PARLIAMENT (parliament.gov.bd)
 * The site's pages for the Speaker, Deputy Speaker, Leader of the House,
 * Leader of the Opposition, Chief Whip and Whips are drawn in the browser
 * from its own open API, /api/speakers, so that is what the sync reads:
 * JSON, paginated ({ data, total, totalPages }), one row per office holder
 * with role, nameBn, nameEn, location (the seat, e.g. "Bhola-3"),
 * tenureTextBn ("১২ মার্চ ২০২৬ -"), isCurrent and parliamentNo. The server
 * sends an incomplete certificate chain and resets requests without a
 * User-Agent; src/lib/parliament-ca.mjs and the sync's request handle both.
 */

export interface CabinetSource {
  kind: 'cabinet';
  key: string;
  label: string;
  url: string;
  /** Matched against links on the home page if `url` stops working. */
  slug: RegExp;
  /** A missing optional page is not an error. */
  optional?: boolean;
}

export interface ParliamentSource {
  kind: 'parliament';
  key: string;
  label: string;
  url: string;
  parliamentNo: number;
}

export type PostSource = CabinetSource | ParliamentSource;

export const CABINET_HOME = 'https://cabinet.gov.bd/';

export const POST_SOURCES: PostSource[] = [
  {
    kind: 'cabinet',
    key: 'cabinet_ministers',
    label: 'মন্ত্রিপরিষদ বিভাগ: প্রধানমন্ত্রী ও মন্ত্রীগণ',
    url: 'https://cabinet.gov.bd/pages/static-pages/মাননীয়-প্রধানমন্ত্রী-ও-মন্ত্রীগণ-027qky-69957f3d5bf6104b4cc91e7c',
    slug: /প্রধানমন্ত্রী-ও-মন্ত্রীগণ/,
  },
  {
    kind: 'cabinet',
    key: 'cabinet_state_ministers',
    label: 'মন্ত্রিপরিষদ বিভাগ: প্রতিমন্ত্রীগণ',
    url: 'https://cabinet.gov.bd/pages/static-pages/মাননীয়-প্রতিমন্ত্রীগণ-4fy3i5-6995891734f8c2d85c4314ad',
    slug: /মাননীয়-প্রতিমন্ত্রীগণ/,
  },
  {
    kind: 'cabinet',
    key: 'cabinet_deputy_ministers',
    label: 'মন্ত্রিপরিষদ বিভাগ: উপমন্ত্রীগণ',
    url: '',
    slug: /উপমন্ত্রীগণ/,
    optional: true,
  },
  {
    kind: 'cabinet',
    key: 'cabinet_advisers',
    label: 'মন্ত্রিপরিষদ বিভাগ: মন্ত্রী/প্রতিমন্ত্রী পদমর্যাদায় উপদেষ্টাগণ',
    url: 'https://cabinet.gov.bd/pages/static-pages/মন্ত্রীপ্রতিমন্ত্রী-পদমর্যাদায়-উপদেষ্টাগণ-u070iq-6996824c44b7c90f92230824',
    slug: /পদমর্যাদায়-উপদেষ্টাগণ/,
  },
  {
    kind: 'parliament',
    key: 'parliament_officers',
    label: 'বাংলাদেশ জাতীয় সংসদ: স্পিকার, ডেপুটি স্পিকার, সংসদ নেতা, বিরোধীদলীয় নেতা, চিফ হুইপ ও হুইপ',
    url: 'https://www.parliament.gov.bd/api/speakers',
    parliamentNo: 13,
  },
];

/** The Division's own page naming the whole cabinet, linked from /ministers. */
export const CABINET_PAGE_FOR_READERS = POST_SOURCES[0]!.url;
