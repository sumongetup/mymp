/**
 * The colours the share cards draw with, as literal values.
 *
 * The site's own partyColor() hands back a CSS variable, which a page can
 * resolve and an image cannot: Satori has no stylesheet, and a var() reaches it
 * as an unparseable word. Keep these in step with --color-p* in globals.css.
 */
export const OG_BRAND = '#0f6a4b';
export const OG_DARK = '#0a4e37';

const PARTY_COLOUR: Record<string, string> = {
  BNP: '#1f7a4f',
  BJEI: '#8cbf2a',
  Ind: '#5b6fb5',
  NCP: '#e0641f',
};
const OTHER_COLOUR = '#9a5fc7';

export const ogPartyColour = (abbr: string | null | undefined): string =>
  (abbr && PARTY_COLOUR[abbr]) || OTHER_COLOUR;
