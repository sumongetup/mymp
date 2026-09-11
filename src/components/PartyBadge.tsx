import { partyLogo } from '@/lib/partyLogos';

/**
 * A party's logo at a small size: the logo where one exists, a person glyph
 * for independents, otherwise a dot in the party's colour. Takes the colour
 * as a prop and reads no site data, so client components can use it too
 * (PartyDot in ui.tsx is this with the colour looked up).
 */
export default function PartyBadge({ abbr, color, size = 18 }: { abbr: string | null | undefined; color: string; size?: number }) {
  const logo = partyLogo(abbr);
  const box = { width: size, height: size };
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.src} alt="" width={size} height={size} loading="lazy" decoding="async" className="shrink-0 object-contain" style={box} />
    );
  }
  if (abbr === 'Ind') {
    return (
      <span aria-hidden="true" className="inline-grid place-items-center shrink-0 rounded-full text-white" style={{ ...box, background: color }}>
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z" />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="inline-grid place-items-center shrink-0" style={box}>
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}
