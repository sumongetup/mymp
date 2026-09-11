// Renders the site's default share images, public/og-image-v3.png (1200x630)
// and public/og-image-square-v3.png (1200x1200): the mymp mark, as the owner
// asked (2026-09-11), centred on white. Pages about one member share that
// member's photo instead (src/lib/seo.ts).
//
//   npm run og-image
//
// The mark's paths are read from src/components/Brand.tsx, so the image is the
// same vector logo the site draws. Headless Chrome renders it; set CHROME_PATH
// if Chrome is not in the default place. The -v3 names make crawlers and
// messaging apps fetch the image afresh.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHROME =
  process.env.CHROME_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH');

// The mark as the site draws it: Brand.tsx's ICON paths, the ink colour and the logo green (globals.css).
const brand = readFileSync(join(root, 'src/components/Brand.tsx'), 'utf8');
const path = (name) => {
  const m = brand.match(new RegExp(`const ${name} = '([^']+)'`));
  if (!m) throw new Error(`${name} not found in Brand.tsx`);
  return m[1];
};
const size = brand.match(/const ICON = \{ w: ([\d.]+), h: ([\d.]+) \}/);
if (!size) throw new Error('ICON size not found in Brand.tsx');
const [iconW, iconH] = [Number(size[1]), Number(size[2])];
const INK = '#17201b';
const GREEN = '#17cf54';

const html = (w, h, markHeight) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0}
.card{width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:#fff}
</style></head><body><div class="card">
<svg width="${Math.round((markHeight * iconW) / iconH)}" height="${markHeight}" viewBox="0 0 ${iconW} ${iconH}">
  <path fill="${INK}" d="${path('ICON_INK')}"/>
  <path fill="${GREEN}" d="${path('ICON_DOT')}"/>
</svg>
</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  // The mark stays well inside the centre 630x630 square, so a square crop (WhatsApp) keeps all of it.
  for (const [file, w, h, markHeight] of [
    ['og-image-v3.png', 1200, 630, 300],
    ['og-image-square-v3.png', 1200, 1200, 520],
  ]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html(w, h, markHeight), { waitUntil: 'load' });
    const box = await page.$eval('svg', (el) => el.getBoundingClientRect().toJSON());
    if (h === 630 && (box.left < (w - 630) / 2 || box.right > (w + 630) / 2)) {
      throw new Error(`mark leaves the centre square: ${JSON.stringify(box)}`);
    }
    writeFileSync(join(root, 'public', file), await page.screenshot({ type: 'png' }));
    console.log(`public/${file} ${w}x${h}, mark ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
} finally {
  await browser.close();
}
