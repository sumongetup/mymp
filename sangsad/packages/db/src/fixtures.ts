/**
 * Local-development fixtures.
 *
 * Every fixture file is prefixed TEST_ and every name inside it starts with
 * TEST_, so nothing here can be mistaken for a real MP, seat or article.
 *
 * The loader refuses to run on a production deployment. NODE_ENV cannot be
 * the test for that: Next sets it to "production" for every build, including
 * a CI build that runs on fixtures. A deployment is production when Vercel
 * says so (VERCEL_ENV), when APP_ENV says so, or when the site URL is the
 * real domain; any of the three blocks fixtures regardless of FIXTURES.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REAL_DOMAIN = 'mymp.bd';

function isRealDomain(siteUrl: string | undefined): boolean {
  if (!siteUrl) return false;
  try {
    const host = new URL(siteUrl).hostname.toLowerCase();
    return host === REAL_DOMAIN || host.endsWith(`.${REAL_DOMAIN}`);
  } catch {
    return siteUrl.toLowerCase().includes(REAL_DOMAIN);
  }
}

export function isProductionDeploy(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === 'production' || env.APP_ENV === 'production' || isRealDomain(env.NEXT_PUBLIC_SITE_URL);
}

export function fixturesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FIXTURES === '1' && !isProductionDeploy(env);
}

/**
 * The repo's fixtures/ folder, found from wherever the process runs (apps/web,
 * packages/db, worker, or the root). Bundlers do not provide import.meta.dirname
 * for workspace packages, so the lookup walks up from the working directory.
 */
export function fixturesDir(): string {
  if (process.env.FIXTURES_DIR) return process.env.FIXTURES_DIR;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'fixtures');
    if (existsSync(resolve(candidate, 'README.md'))) return candidate;
    dir = resolve(dir, '..');
  }
  throw new Error('fixtures/ directory not found above the working directory; set FIXTURES_DIR');
}

export function loadFixture<T>(fileName: string, env: NodeJS.ProcessEnv = process.env): T {
  if (isProductionDeploy(env)) {
    throw new Error('Fixtures are disabled on a production deployment');
  }
  if (!fileName.startsWith('TEST_') || !fileName.endsWith('.json')) {
    throw new Error(`Fixture files must be named TEST_*.json, got "${fileName}"`);
  }
  const raw = readFileSync(resolve(fixturesDir(), fileName), 'utf8');
  const data = JSON.parse(raw) as T;
  assertTestPrefixed(data, fileName);
  return data;
}

/** Walks the fixture and throws if any name-like string lacks the TEST_ prefix. */
function assertTestPrefixed(value: unknown, fileName: string, path = ''): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertTestPrefixed(v, fileName, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k;
      if (/^(name|title)(_bn|_en|Bn|En)?$/.test(k) && typeof v === 'string' && !v.startsWith('TEST_')) {
        throw new Error(`Fixture ${fileName}: ${p} = "${v}" must start with TEST_`);
      }
      assertTestPrefixed(v, fileName, p);
    }
  }
}
