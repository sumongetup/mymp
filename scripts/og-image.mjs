// Renders the social share images, public/og-image-v2.png (1200x630) and
// public/og-image-square-v2.png (1200x1200), in headless Chrome.
//
//   npm run og-image
//
// Chrome is used rather than canvas/satori because only a real browser shapes
// Bengali conjuncts (স্য, থ্য) correctly. The font is Noto Sans Bengali, the
// site's own face, embedded from the local @fontsource package as data URIs,
// so nothing is fetched and a missing font fails the run instead of silently
// falling back. Set CHROME_PATH if Chrome is not in the default place.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'node_modules/@fontsource-variable/noto-sans-bengali/files');

const CHROME =
  process.env.CHROME_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH');

// Site tokens (src/app/globals.css): brand #0f6a4b, branddark #0a4d36.
const BRAND = '#0f6a4b';
const EDGE = '#0b5139';

const face = (file, range) => `@font-face{font-family:'OG Bengali';font-weight:100 900;font-style:normal;
  src:url(data:font/woff2;base64,${readFileSync(join(fontDir, file)).toString('base64')}) format('woff2');unicode-range:${range};}`;
const fonts = [
  face('noto-sans-bengali-bengali-wght-normal.woff2', 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0-1CFF,U+200C-200D,U+20B9,U+25CC,U+A8F1'),
  face('noto-sans-bengali-latin-wght-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD'),
].join('\n');

// Everything sits inside the centre 630x630 square, so a square crop
// (WhatsApp's thumbnail) cuts nothing.
const html = (w, h) => `<!doctype html><html lang="bn"><head><meta charset="utf-8"><style>
${fonts}
html,body{margin:0}
.card{width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse ${w * 0.75}px ${h * 0.75}px at 50% 50%, ${BRAND} 0%, ${BRAND} 45%, ${EDGE} 100%);
  font-family:'OG Bengali';color:#fff;text-align:center}
.safe{width:630px;display:flex;flex-direction:column;align-items:center}
.l1{font-size:84px;font-weight:700;line-height:1.3}
.l2{font-size:32px;font-weight:500;line-height:1.45;opacity:.85;margin-top:14px}
.l3{font-size:22px;font-weight:500;letter-spacing:.5px;opacity:.6;margin-top:30px}
</style></head><body><div class="card"><div class="safe">
  <div class="l1">আমার এমপি</div>
  <div class="l2">বাংলাদেশের সংসদ সদস্যদের তথ্য</div>
  <div class="l3">mymp.bd</div>
</div></div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  for (const [file, w, h] of [
    ['og-image-v2.png', 1200, 630],
    ['og-image-square-v2.png', 1200, 1200],
  ]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html(w, h), { waitUntil: 'load' });
    const ok = await page.evaluate(async () => {
      await document.fonts.ready;
      return ['700 84px "OG Bengali"', '500 32px "OG Bengali"', '500 22px "OG Bengali"'].every((f) => document.fonts.check(f, 'সদস্য mymp'));
    });
    if (!ok) throw new Error('Noto Sans Bengali did not load; refusing to render with a fallback font');
    // The text block must stay inside the centre square.
    const box = await page.$eval('.safe', (el) => {
      // Measure the glyphs themselves, not the full-width block boxes.
      const r = [...el.children].map((c) => { const range = document.createRange(); range.selectNodeContents(c); return range.getBoundingClientRect(); });
      return { left: Math.min(...r.map((b) => b.left)), right: Math.max(...r.map((b) => b.right)), top: r[0].top, bottom: r[r.length - 1].bottom };
    });
    const sq = { left: (w - 630) / 2, right: (w + 630) / 2, top: (h - 630) / 2, bottom: (h + 630) / 2 };
    if (box.left < sq.left || box.right > sq.right || box.top < sq.top || box.bottom > sq.bottom) {
      throw new Error(`text leaves the centre square: ${JSON.stringify(box)}`);
    }
    writeFileSync(join(root, 'public', file), await page.screenshot({ type: 'png' }));
    console.log(`public/${file} ${w}x${h}, text box ${Math.round(box.right - box.left)}x${Math.round(box.bottom - box.top)}`);
  }
} finally {
  await browser.close();
}
