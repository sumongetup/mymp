/**
 * A party's link-preview image, 1200x630, on the site green. The middle
 * 630x630 square holds nothing but the party's logo on a white disc, because
 * WhatsApp shows a link as a small square cut from the middle and the owner
 * wants the logo there (2026-09-12). The wide card that Facebook and X show
 * adds the name and founding year on the left and the seats and head on the
 * right, both outside that square. Bangla is shaped by HarfBuzz
 * (src/lib/og/banglaText.ts). Drawn on first request and cached for a day.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getParty, bn } from '@/lib/data';
import { bnTextImage } from '@/lib/og/banglaText';
import { partyProfile, foundedYear } from '@/lib/partyProfiles';

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const BRAND = '#0f6a4b';
const W = 1200;
const H = 630;
const SQUARE = 630;
const SIDE = (W - SQUARE) / 2; // 285px either side of the square
// The logo file is a white square, so it must sit wholly inside the disc: side ≤ DISC / √2.
const DISC = 560;
const LOGO_SIZE = 390;
const EDGE = 40;
const INNER = 24;
const SIDE_TEXT = SIDE - EDGE - INNER;

// One literal path per logo, so the build bundles exactly these files with the function.
const LOGO: Record<string, () => Buffer> = {
  BNP: () => readFileSync(join(process.cwd(), 'public/party/og/bnp.jpg')),
  BJEI: () => readFileSync(join(process.cwd(), 'public/party/og/bjei.jpg')),
  NCP: () => readFileSync(join(process.cwd(), 'public/party/og/ncp.jpg')),
  BKM: () => readFileSync(join(process.cwd(), 'public/party/og/bkm.jpg')),
  IMB: () => readFileSync(join(process.cwd(), 'public/party/og/imb.jpg')),
  GOP: () => readFileSync(join(process.cwd(), 'public/party/og/gop.jpg')),
  BJP: () => readFileSync(join(process.cwd(), 'public/party/og/bjp.jpg')),
  KM: () => readFileSync(join(process.cwd(), 'public/party/og/km.jpg')),
  PSM: () => readFileSync(join(process.cwd(), 'public/party/og/psm.jpg')),
  JAGPA: () => readFileSync(join(process.cwd(), 'public/party/og/jagpa.jpg')),
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getParty(slug);
  const read = p ? LOGO[p.abbr] : undefined;
  if (!p || !read) return new Response('Not found', { status: 404 });

  const profile = partyProfile(p);
  const year = foundedYear(profile);
  const leader = profile?.leaderNameBn ? `${profile.leaderTitleBn ?? 'প্রধান'} ${profile.leaderNameBn}` : null;
  const logo = `data:image/jpeg;base64,${read().toString('base64')}`;

  const white = { color: '#ffffff' };
  const [name, founded, seats, seatsLabel, lead] = await Promise.all([
    bnTextImage(p.nameBn ?? p.abbr, { ...white, weight: 'bold', maxSize: 44, minSize: 26, maxWidth: SIDE_TEXT, maxLines: 4, leading: 1.22 }),
    year ? bnTextImage(`প্রতিষ্ঠা ${bn(year)}`, { ...white, weight: 'regular', maxSize: 26, minSize: 20, maxWidth: SIDE_TEXT, maxLines: 1, opacity: 0.85 }) : null,
    bnTextImage(bn(p.seats), { ...white, weight: 'bold', maxSize: 104, minSize: 60, maxWidth: SIDE_TEXT, maxLines: 1 }),
    bnTextImage('সংসদে আসন', { ...white, weight: 'regular', maxSize: 28, minSize: 20, maxWidth: SIDE_TEXT, maxLines: 1, opacity: 0.85 }),
    leader ? bnTextImage(leader, { ...white, weight: 'regular', maxSize: 25, minSize: 18, maxWidth: SIDE_TEXT, maxLines: 3, opacity: 0.8 }) : null,
  ]);

  /* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', alignItems: 'center', background: BRAND, position: 'relative' }}>
        <div style={{ width: SIDE, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: EDGE, paddingRight: INNER, gap: 16 }}>
          <img src={name.src} width={name.width} height={name.height} />
          {founded && <img src={founded.src} width={founded.width} height={founded.height} />}
        </div>

        <div style={{ width: SQUARE, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: DISC, height: DISC, borderRadius: 9999, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo} width={LOGO_SIZE} height={LOGO_SIZE} style={{ objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{ width: SIDE, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: INNER, paddingRight: EDGE, gap: 10 }}>
          <img src={seats.src} width={seats.width} height={seats.height} />
          <img src={seatsLabel.src} width={seatsLabel.width} height={seatsLabel.height} />
          {lead && <div style={{ display: 'flex', marginTop: 18 }}><img src={lead.src} width={lead.width} height={lead.height} /></div>}
        </div>

        <div style={{ position: 'absolute', right: EDGE, bottom: 30, display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>
          mymp.bd
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
    },
  );
  /* eslint-enable @next/next/no-img-element, jsx-a11y/alt-text */
}
