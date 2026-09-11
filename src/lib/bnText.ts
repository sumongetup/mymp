const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Bangla digits inside Bangla text that a source wrote with Latin ones
 * ("124 বরিশাল-6" in a notice title). Text that is in English, or mixes
 * the two scripts, is left as written, so "10th China-South Asia" and an
 * English headline keep their digits. Reads no site data, so client
 * components can use it.
 */
export function bnText(s: string | null | undefined): string | null {
  if (!s) return null;
  if (!/[ঀ-৿]/.test(s) || /[A-Za-z]/.test(s)) return s;
  return s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
}
