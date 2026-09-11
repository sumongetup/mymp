/**
 * A member's link-preview image, 1200x630: their photo in a white ring on the
 * left, name, constituency and party on the right, on the site green, with
 * everything inside the centre 630x630 square so a square crop (WhatsApp)
 * keeps the photo and the name. The Bangla text is shaped by HarfBuzz
 * (src/lib/og/banglaText.ts) because ImageResponse alone breaks Bangla
 * conjuncts. Drawn on first request and cached for a day.
 */
import { ImageResponse } from 'next/og';
import { getMember } from '@/lib/data';
import { bnTextImage } from '@/lib/og/banglaText';
import { constituencyBn, isIndependent, partyBn } from '@/lib/seo/mpDescription';

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const BRAND = '#0f6a4b';
const SAFE = 630;
const PHOTO = 360;
const RING = 6;
const GAP = 28;
const TEXT_WIDTH = SAFE - (PHOTO + 2 * RING) - GAP;

async function photoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) return new Response('Not found', { status: 404 });

  const partyName = isIndependent(m) ? 'স্বতন্ত্র' : (partyBn(m.party)?.name ?? null);
  const [name, seat, party, photo] = await Promise.all([
    bnTextImage(m.nameBn ?? m.nameEn ?? '', { weight: 'bold', maxSize: 64, minSize: 34, maxWidth: TEXT_WIDTH, maxLines: 3, color: '#ffffff', leading: 1.25 }),
    bnTextImage(constituencyBn(m) ?? '', { weight: 'regular', maxSize: 32, minSize: 24, maxWidth: TEXT_WIDTH, maxLines: 2, color: '#ffffff', opacity: 0.85 }),
    partyName ? bnTextImage(partyName, { weight: 'regular', maxSize: 32, minSize: 24, maxWidth: TEXT_WIDTH, maxLines: 3, color: '#ffffff', opacity: 0.85 }) : null,
    photoData(m.photoUrl),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND }}>
        <div style={{ width: SAFE, height: SAFE, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div
            style={{
              width: PHOTO + 2 * RING,
              height: PHOTO + 2 * RING,
              borderRadius: 9999,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img src={photo} width={PHOTO} height={PHOTO} style={{ borderRadius: 9999, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: PHOTO, height: PHOTO, borderRadius: 9999, background: '#e8efe9' }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: GAP, gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={name.src} width={name.width} height={name.height} />
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            {seat.width > 1 && <img src={seat.src} width={seat.width} height={seat.height} />}
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            {party && <img src={party.src} width={party.width} height={party.height} />}
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
