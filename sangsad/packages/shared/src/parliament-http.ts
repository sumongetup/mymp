/**
 * HTTP client for parliament.gov.bd's JSON API.
 *
 * Two things about that host make a plain fetch() fail on a clean machine:
 *  1. It serves only its leaf certificate and omits the GoGetSSL intermediate
 *     that signs it. Browsers fetch the missing link themselves; Node does not
 *     and reports UNABLE_TO_VERIFY_LEAF_SIGNATURE. PARLIAMENT_CA supplies the
 *     intermediate and its root, added ALONGSIDE Node's bundled roots (a `ca`
 *     option replaces the bundled list rather than adding to it).
 *  2. Requests without a User-Agent get their connection reset.
 * Both were verified on 2026-09-10 and are covered by the smoke test.
 *
 * Politeness: one request per second, three tries with backoff.
 */
import https from 'node:https';
import tls from 'node:tls';
import { PARLIAMENT_CA } from './parliament-ca';

export const PARLIAMENT_BASE = 'https://www.parliament.gov.bd';
const HOST = 'www.parliament.gov.bd';
const UA = process.env.SCRAPER_USER_AGENT ?? 'MyMPBot/1.0 (+https://mymp.bd/somporke)';
const MIN_GAP_MS = 1000;

const agent = new https.Agent({ ca: [...tls.rootCertificates, ...PARLIAMENT_CA], keepAlive: true });
let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ParliamentPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function request<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: HOST,
        path,
        method: 'GET',
        agent,
        timeout: 30000,
        headers: { accept: 'application/json', 'user-agent': UA },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c: string) => {
          body += c;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`${status} ${res.statusMessage ?? ''} for ${path}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(new Error(`bad JSON from ${path}: ${(e as Error).message}`));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e: NodeJS.ErrnoException) => reject(new Error(e.code ?? e.message)));
    req.end();
  });
}

/** GET one JSON document, rate-limited and retried. */
export async function parliamentGet<T = unknown>(path: string, tries = 3): Promise<T> {
  for (let i = 1; i <= tries; i++) {
    const wait = MIN_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      return await request<T>(path);
    } catch (err) {
      if (i === tries) throw new Error(`GET ${path} failed after ${tries} tries: ${(err as Error).message}`);
      await sleep(1500 * i);
    }
  }
  throw new Error('unreachable');
}

/** Walk every page of a paginated endpoint. */
export async function parliamentGetAll<T = unknown>(
  path: string,
  limit = 100,
  onPage?: (page: number, totalPages: number, count: number) => void,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let total: number | null = null;
  while (total === null || rows.length < total) {
    const sep = path.includes('?') ? '&' : '?';
    const j = await parliamentGet<ParliamentPage<T>>(`${path}${sep}limit=${limit}&page=${page}`);
    total = j.total ?? 0;
    const batch = j.data ?? [];
    if (!batch.length) break;
    rows.push(...batch);
    onPage?.(page, j.totalPages ?? 0, rows.length);
    page++;
  }
  return rows;
}
