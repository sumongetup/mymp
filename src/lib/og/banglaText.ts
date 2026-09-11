/**
 * Bangla text for link-preview images, shaped by HarfBuzz and drawn as SVG
 * paths.
 *
 * next/og's ImageResponse (Satori) lays text out glyph by glyph without an
 * Indic shaper: pre-base vowel signs land after their consonant ("তারেক"
 * comes out "তারকে") and conjuncts fall apart with a visible hasanta. HarfBuzz,
 * the shaper Chrome and Android use, shapes the text correctly; each line is
 * turned into an SVG of glyph outlines that ImageResponse places as an image.
 *
 * Fonts: Noto Sans Bengali (OFL) from @expo-google-fonts/noto-sans-bengali,
 * static TTFs, which HarfBuzz reads directly. Server only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Font } from 'harfbuzzjs';

type Hb = typeof import('harfbuzzjs');
let hbModule: Promise<Hb> | null = null;
const harfbuzz = () => (hbModule ??= import('harfbuzzjs'));

export const OG_FONT_FILES = {
  bold: 'node_modules/@expo-google-fonts/noto-sans-bengali/700Bold/NotoSansBengali_700Bold.ttf',
  regular: 'node_modules/@expo-google-fonts/noto-sans-bengali/400Regular/NotoSansBengali_400Regular.ttf',
} as const;
export type Weight = keyof typeof OG_FONT_FILES;

interface LoadedFont {
  font: Font;
  upem: number;
  ascender: number;
  descender: number;
  paths: Map<number, string>;
}
const loaded = new Map<Weight, Promise<LoadedFont>>();

function loadFont(weight: Weight): Promise<LoadedFont> {
  let p = loaded.get(weight);
  if (!p) {
    p = (async () => {
      const hb = await harfbuzz();
      const data = new Uint8Array(readFileSync(join(process.cwd(), OG_FONT_FILES[weight])));
      const face = new hb.Face(new hb.Blob(data), 0);
      const font = new hb.Font(face);
      const { ascender, descender } = font.hExtents();
      return { font, upem: face.upem, ascender, descender, paths: new Map() };
    })();
    loaded.set(weight, p);
  }
  return p;
}

interface Run {
  glyphs: { id: number; x: number; y: number }[];
  advance: number;
}

/** One run of text shaped: glyph ids at positions in font units, and its advance. */
async function shape(f: LoadedFont, text: string): Promise<Run> {
  const hb = await harfbuzz();
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(f.font, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  let x = 0;
  const glyphs = infos.map((g, i) => {
    const p = pos[i]!;
    const glyph = { id: g.codepoint, x: x + p.xOffset, y: p.yOffset };
    x += p.xAdvance;
    return glyph;
  });
  return { glyphs, advance: x };
}

const pathOf = (f: LoadedFont, id: number) => {
  let d = f.paths.get(id);
  if (d === undefined) {
    d = f.font.glyphToPath(id);
    f.paths.set(id, d);
  }
  return d;
};

export interface TextImage {
  src: string;
  width: number;
  height: number;
  size: number;
  lines: number;
}

interface Options {
  weight: Weight;
  /** Largest and smallest font size in px; the largest that fits is used. */
  maxSize: number;
  minSize: number;
  maxWidth: number;
  maxLines: number;
  color: string;
  opacity?: number;
  /** Line spacing as a multiple of the font size. */
  leading?: number;
}

/**
 * The text as an SVG image, word-wrapped to maxWidth in at most maxLines lines,
 * at the largest size from maxSize down that fits. Words are never broken.
 */
export async function bnTextImage(text: string, o: Options): Promise<TextImage> {
  const f = await loadFont(o.weight);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const runs = await Promise.all(words.map((w) => shape(f, w)));
  const space = (await shape(f, ' ')).advance;

  const layout = (size: number) => {
    const s = size / f.upem;
    const lines: { runs: Run[]; width: number }[] = [];
    for (const run of runs) {
      const w = run.advance * s;
      const line = lines[lines.length - 1];
      if (line && line.width + space * s + w <= o.maxWidth) {
        line.runs.push(run);
        line.width += space * s + w;
      } else {
        lines.push({ runs: [run], width: w });
      }
    }
    const fits = lines.length <= o.maxLines && lines.every((l) => l.width <= o.maxWidth);
    return { s, lines, fits };
  };

  let size = o.maxSize;
  let lay = layout(size);
  while (!lay.fits && size > o.minSize) {
    size -= 2;
    lay = layout(size);
  }

  const { s, lines } = lay;
  const lineHeight = size * (o.leading ?? 1.3);
  const ascent = f.ascender * s;
  const height = Math.ceil((lines.length - 1) * lineHeight + (f.ascender - f.descender) * s);
  const width = Math.ceil(Math.max(...lines.map((l) => l.width), 1));
  const paths: string[] = [];
  lines.forEach((line, li) => {
    const baseline = ascent + li * lineHeight;
    let x = 0;
    for (const run of line.runs) {
      for (const g of run.glyphs) {
        const d = pathOf(f, g.id);
        if (d) paths.push(`<path d="${d}" transform="translate(${(x + g.x * s).toFixed(2)} ${(baseline - g.y * s).toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})"/>`);
      }
      x += (run.advance + space) * s;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="${o.color}"${o.opacity !== undefined ? ` fill-opacity="${o.opacity}"` : ''}>${paths.join('')}</g></svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width, height, size, lines: lines.length };
}
