import https from 'node:https';
import tls from 'node:tls';
import { createHash } from 'node:crypto';
import { PARLIAMENT_CA } from '@/lib/parliament-ca.mjs';
import { CABINET_HOME, type CabinetSource, type ParliamentSource } from '../../../config/sync-sources';
import type { OfficerRow } from './parse';

/** Says who is asking; parliament.gov.bd resets requests that carry no User-Agent. */
const UA = 'mymp-posts-sync/1.0 (+https://mymp.bd)';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Node's roots plus the intermediates the government hosts leave out. */
const agent = new https.Agent({ ca: [...tls.rootCertificates, ...PARLIAMENT_CA], keepAlive: true });

/**
 * One HTML page over node:https with the shared CA bundle. cabinet.gov.bd,
 * like parliament.gov.bd, omits its intermediate certificate, so a plain
 * fetch() fails on Vercel (Linux Node trusts only its bundled roots; Node on
 * Windows and macOS also reads the system store, which hid this locally).
 * Follows up to three redirects.
 */
async function getText(url: string, hops = 0): Promise<{ status: number; text: string }> {
  const u = new URL(url);
  const page = await new Promise<{ status: number; text: string; location?: string }>((resolve, reject) => {
    const req = https.request(
      { host: u.host, path: u.pathname + u.search, method: 'GET', agent, timeout: 30_000, headers: { accept: 'text/html', 'user-agent': UA } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text: body, location: res.headers.location }));
      },
    );
    req.on('timeout', () => req.destroy(new Error(`${u.href} timed out`)));
    req.on('error', (e: NodeJS.ErrnoException) => reject(new Error(`${u.href}: ${e.code ?? e.message}`)));
    req.end();
  });
  if (page.location && [301, 302, 303, 307, 308].includes(page.status) && hops < 3) return getText(new URL(page.location, u).href, hops + 1);
  return { status: page.status, text: page.text };
}

/**
 * One cabinet list page. If the configured address no longer answers, the
 * home page is searched for a link matching the source's slug, so a page the
 * Division re-publishes under a new id is still found. Null only for an
 * optional source that is not there.
 */
export async function loadCabinet(src: CabinetSource): Promise<{ url: string; html: string } | null> {
  if (src.url) {
    const page = await getText(src.url);
    if (page.status === 200 && page.text.includes('<table')) return { url: src.url, html: page.text };
  }
  const home = await getText(CABINET_HOME);
  if (home.status !== 200) throw new Error(`${CABINET_HOME} answered HTTP ${home.status}`);
  const link = [...home.text.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1]!)
    .find((h) => {
      try {
        return src.slug.test(decodeURIComponent(h).normalize('NFC'));
      } catch {
        return false;
      }
    });
  if (!link) {
    if (src.optional) return null;
    throw new Error(`the list is gone: ${src.url || '(no address)'} failed and the home page links no page matching ${src.slug}`);
  }
  const url = new URL(link, CABINET_HOME).href;
  await sleep(500);
  const page = await getText(url);
  if (page.status !== 200) throw new Error(`${decodeURIComponent(url)} answered HTTP ${page.status}`);
  return { url: decodeURIComponent(url), html: page.text };
}

function getJson(url: URL): Promise<{ data?: OfficerRow[]; total?: number; totalPages?: number }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: url.host, path: url.pathname + url.search, method: 'GET', agent, timeout: 30_000, headers: { accept: 'application/json', 'user-agent': UA } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`${url.href} answered HTTP ${res.statusCode}`));
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`${url.href} sent bad JSON: ${(e as Error).message}`)); }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`${url.href} timed out`)));
    req.on('error', (e: NodeJS.ErrnoException) => reject(new Error(`${url.href}: ${e.code ?? e.message}`)));
    req.end();
  });
}

/** Every row of parliament.gov.bd's /api/speakers, all pages. */
export async function loadOfficers(src: ParliamentSource): Promise<OfficerRow[]> {
  const rows: OfficerRow[] = [];
  for (let page = 1; page < 20; page++) {
    const url = new URL(src.url);
    url.searchParams.set('limit', '100');
    url.searchParams.set('page', String(page));
    const j = await getJson(url);
    const batch = j.data ?? [];
    rows.push(...batch);
    if (!batch.length || rows.length >= (j.total ?? 0)) break;
    await sleep(500);
  }
  return rows;
}
