/**
 * `og:cards`: a link-preview card (1200x630 JPEG) for every sitting member,
 * so a shared mymp.bd profile shows that member: photo, name, seat and party
 * on the site's green, with the site's name. Written to the public mirror
 * bucket as og/mp/<id>.jpg, with og/latest.json listing each card's version;
 * mymp.bd's sync reads that list and points the profile's og:image at it.
 *
 * Headless Chrome draws the cards because only a real browser shapes Bangla
 * conjuncts correctly (Satori and canvas do not). The font is Noto Sans
 * Bengali, embedded from the local @fontsource package, and a card is refused
 * rather than drawn in a fallback face. Everything sits inside the centre
 * 630x630 square, so a square crop (WhatsApp) loses nothing. A card is only
 * redrawn when what it shows changes.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { and, eq } from 'drizzle-orm';
import puppeteer from 'puppeteer-core';
import { schema } from '@sangsad/db';
import type { Db } from './parliament-core';
import { MIRROR_BUCKET, ensureBucket, uploadMirrorFile } from './mirror';

const { constituencies, memberTerms, members, parliaments, parties } = schema;

/** Bump to redraw every card after a design change. */
const DESIGN = 2;

// The site's tokens (src/app/globals.css).
const BRAND = '#0f6a4b';
const EDGE = '#0b5139';
const PARTY_COLOR: Record<string, string> = { BNP: '#1f7a4f', BJEI: '#8cbf2a', Ind: '#5b6fb5', NCP: '#e0641f' };
const OTHER_PARTY = '#9a5fc7';

export interface Card {
  id: string;
  name: string;
  seat: string;
  party: string | null;
  color: string;
  photo: string | null;
}

export const cardVersion = (c: Card) => createHash('sha1').update(JSON.stringify([DESIGN, c.name, c.seat, c.party, c.color, c.photo])).digest('hex').slice(0, 12);

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function fontFaces(): string {
  const require = createRequire(import.meta.url);
  const dir = join(dirname(require.resolve('@fontsource-variable/noto-sans-bengali/package.json')), 'files');
  const face = (file: string, range: string) =>
    `@font-face{font-family:'Card Bengali';font-weight:100 900;font-style:normal;src:url(data:font/woff2;base64,${readFileSync(join(dir, file)).toString('base64')}) format('woff2');unicode-range:${range};}`;
  return [
    face('noto-sans-bengali-bengali-wght-normal.woff2', 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0-1CFF,U+200C-200D,U+20B9,U+25CC,U+A8F1'),
    face('noto-sans-bengali-latin-wght-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD'),
  ].join('\n');
}

/** The card's page. The name shrinks to fit two lines of the centre square. */
export function cardHtml(c: Card, fonts: string): string {
  const initial = escapeHtml([...c.name.replace(/^(মোঃ|মো\.|ডাঃ|ড\.|ব্যারিস্টার|ব্যারিষ্টার|অ্যাডভোকেট)\s*/, '')][0] ?? '');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><style>
${fonts}
html,body{margin:0}
.card{width:1200px;height:630px;display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:radial-gradient(ellipse 900px 480px at 50% 50%, ${BRAND} 0%, ${BRAND} 45%, ${EDGE} 100%);
  font-family:'Card Bengali';color:#fff;text-align:center}
.safe{width:600px;height:630px;box-sizing:border-box;padding:34px 0 30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.photo{width:196px;height:196px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 7px #fff,0 0 0 14px rgba(255,255,255,.22);background:#e8efe9;flex:none;
  display:flex;align-items:center;justify-content:center;color:${BRAND};font-size:96px;font-weight:700}
.photo img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.name{font-size:58px;font-weight:700;line-height:1.28;max-width:600px;margin-top:14px}
.seat{font-size:30px;font-weight:600;line-height:1.35;opacity:.92}
.party{display:inline-flex;align-items:center;gap:12px;font-size:23px;font-weight:600;line-height:1.3;padding:9px 22px;border-radius:999px;background:#fff;color:#123;max-width:560px}
.dot{width:16px;height:16px;border-radius:50%;background:${c.color};flex:none}
.brand{font-size:20px;font-weight:600;opacity:.7;letter-spacing:.3px;margin-top:4px}
</style></head><body><div class="card"><div class="safe">
  <div class="photo">${c.photo ? `<img src="${escapeHtml(c.photo)}" alt="">` : initial}</div>
  <div class="name">${escapeHtml(c.name)}</div>
  <div class="seat">${escapeHtml(c.seat)}</div>
  ${c.party ? `<div class="party"><span class="dot"></span><span>${escapeHtml(c.party)}</span></div>` : ''}
  <div class="brand">আমার এমপি · mymp.bd</div>
</div></div></body></html>`;
}

/**
 * Runs in the card's page (the worker has no DOM types): waits for the font,
 * shrinks the name to two lines, and reports whether font and photo loaded.
 */
const FIT_AND_CHECK = `(async () => {
  await document.fonts.ready;
  const name = document.querySelector('.name');
  let size = 58;
  while (size > 34 && name.getBoundingClientRect().height > size * 1.28 * 2 + 2) {
    size -= 2;
    name.style.fontSize = size + 'px';
  }
  const img = document.querySelector('.photo img');
  return { font: document.fonts.check('700 40px "Card Bengali"', 'সদস্য'), photo: !img || (img.complete && img.naturalWidth > 0) };
})()`;

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
];

/** Sitting members as their cards should read them. */
async function cardsFromDb(db: Db): Promise<Card[]> {
  const [parl] = await db.select({ id: parliaments.id }).from(parliaments).where(eq(parliaments.number, 13));
  if (!parl) throw new Error('parliament 13 not seeded');
  const rows = await db
    .select({
      id: members.sourceExternalId,
      nameBn: members.nameBn,
      nameEn: members.nameEn,
      photo: members.photoUrl,
      seatNo: constituencies.number,
      seatBn: constituencies.nameBn,
      partyBn: parties.nameBn,
      partyShort: parties.shortName,
      endDate: memberTerms.endDate,
    })
    .from(memberTerms)
    .innerJoin(members, eq(members.id, memberTerms.memberId))
    .leftJoin(constituencies, eq(constituencies.id, memberTerms.constituencyId))
    .leftJoin(parties, eq(parties.id, memberTerms.partyId))
    .where(and(eq(memberTerms.parliamentId, parl.id), eq(memberTerms.role, 'MP')));
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .filter((r) => r.id && (!r.endDate || String(r.endDate) >= today))
    .map((r) => ({
      id: r.id!,
      name: (r.nameBn ?? r.nameEn ?? '').trim(),
      seat: !r.seatBn ? 'ত্রয়োদশ জাতীয় সংসদ' : r.seatNo && r.seatNo > 300 ? `সংরক্ষিত ${r.seatBn}` : `${r.seatBn} আসন`,
      party: r.partyBn?.trim() || null,
      color: (r.partyShort && PARTY_COLOR[r.partyShort]) || OTHER_PARTY,
      photo: r.photo,
    }))
    .filter((c) => c.name);
}

export async function runOgCards(db: Db): Promise<{ itemsFound: number; itemsNew: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to store the cards');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await ensureBucket(supabase);

  const cards = await cardsFromDb(db);
  const { data: prevFile } = await supabase.storage.from(MIRROR_BUCKET).download('og/latest.json');
  const previous: Record<string, string> = prevFile ? ((JSON.parse(await prevFile.text()) as { cards?: Record<string, string> }).cards ?? {}) : {};
  const todo = cards.filter((c) => previous[c.id] !== cardVersion(c) || process.env.OG_CARDS_ALL === '1');
  process.stdout.write(`  cards: ${cards.length} members, ${todo.length} to draw\n`);

  const chrome = process.env.CHROME_PATH || CHROME_PATHS.find((p) => existsSync(p));
  if (todo.length && !chrome) throw new Error('Chrome not found; set CHROME_PATH');
  const done: Record<string, string> = {};
  for (const c of cards) if (!todo.includes(c) && previous[c.id]) done[c.id] = previous[c.id]!;

  if (todo.length) {
    const fonts = fontFaces();
    const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
      for (const c of todo) {
        // "load" waits for the photo too.
        await page.setContent(cardHtml(c, fonts), { waitUntil: 'load', timeout: 30000 });
        const ok = (await page.evaluate(FIT_AND_CHECK)) as { font: boolean; photo: boolean };
        if (!ok.font) throw new Error('Noto Sans Bengali did not load; refusing to draw in a fallback font');
        if (!ok.photo) {
          // A photo that will not load leaves the initial instead of a broken image.
          await page.setContent(cardHtml({ ...c, photo: null }, fonts), { waitUntil: 'load' });
          await page.evaluate(FIT_AND_CHECK);
        }
        const jpg = await page.screenshot({ type: 'jpeg', quality: 84 });
        const { error } = await supabase.storage
          .from(MIRROR_BUCKET)
          .upload(`og/mp/${c.id}.jpg`, Buffer.from(jpg), { contentType: 'image/jpeg', upsert: true, cacheControl: '86400' });
        if (error) throw new Error(`card upload ${c.id}: ${error.message}`);
        done[c.id] = cardVersion(c);
      }
    } finally {
      await browser.close();
    }
  }

  const day = new Date().toISOString().slice(0, 10);
  await uploadMirrorFile(supabase, 'og', { version: 1, design: DESIGN, generatedAt: new Date().toISOString(), cards: done }, day);
  process.stdout.write(`  og/latest.json: ${Object.keys(done).length} cards\n`);
  return { itemsFound: cards.length, itemsNew: todo.length };
}
