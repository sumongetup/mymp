/** URL slug from an English name: "Cox'sBazar-1" → "coxsbazar-1", "Dhaka-17" → "dhaka-17". */
export function slugify(input: string | null | undefined): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
