/**
 * A party's link-preview image, 1200x630, in the same frame as a member's
 * (src/app/api/og/mp/[slug]/route.tsx): the logo in a white circle on the
 * left; name, seats and leader on the right, on the site green, all inside the
 * centre 630x630 square so WhatsApp's square crop keeps them. Drawn on first
 * request and cached for a day.
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
const SAFE = 630;
const CIRCLE = 360;
const RING = 6;
const GAP = 28;
const TEXT_WIDTH = SAFE - (CIRCLE + 2 * RING) - GAP;

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

  const [name, seats, lead] = await Promise.all([
    bnTextImage(p.nameBn ?? p.abbr, { weight: 'bold', maxSize: 58, minSize: 32, maxWidth: TEXT_WIDTH, maxLines: 4, color: '#ffffff', leading: 1.25 }),
    bnTextImage(`সংসদে ${bn(p.seats)}টি আসন${year ? `, প্রতিষ্ঠা ${bn(year)}` : ''}`, { weight: 'regular', maxSize: 30, minSize: 22, maxWidth: TEXT_WIDTH, maxLines: 2, color: '#ffffff', opacity: 0.88 }),
    leader ? bnTextImage(leader, { weight: 'regular', maxSize: 28, minSize: 22, maxWidth: TEXT_WIDTH, maxLines: 3, color: '#ffffff', opacity: 0.8 }) : null,
  ]);

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND }}>
        <div style={{ width: SAFE, height: SAFE, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div
            style={{
              width: CIRCLE + 2 * RING,
              height: CIRCLE + 2 * RING,
              borderRadius: 9999,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={260} height={260} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: GAP, gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={name.src} width={name.width} height={name.height} />
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={seats.src} width={seats.width} height={seats.height} />
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            {lead && <img src={lead.src} width={lead.width} height={lead.height} />}
          </div>
          <div style={{ position: 'absolute', right: 0, bottom: 34, display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>
            mymp.bd
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
    },
  );
}
