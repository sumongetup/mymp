import { describe, expect, it } from 'vitest';
import { fixturesEnabled, isProductionDeploy, loadFixture } from './fixtures';

const dev = { FIXTURES: '1' } as NodeJS.ProcessEnv;

describe('fixtures', () => {
  it('loads a TEST_ fixture in development', () => {
    const data = loadFixture<{ constituencies: { name_en: string }[] }>('TEST_constituencies.json', dev);
    expect(data.constituencies.length).toBeGreaterThan(0);
    expect(data.constituencies.every((c) => c.name_en.startsWith('TEST_'))).toBe(true);
  });

  it('refuses to load on a Vercel production deployment', () => {
    expect(() => loadFixture('TEST_constituencies.json', { ...dev, VERCEL_ENV: 'production' })).toThrow(/production/);
  });

  it('refuses to load when APP_ENV says production', () => {
    expect(() => loadFixture('TEST_constituencies.json', { ...dev, APP_ENV: 'production' })).toThrow(/production/);
  });

  it('refuses to load on the real domain, whatever the other flags say', () => {
    const env = { ...dev, NEXT_PUBLIC_SITE_URL: 'https://durbinnews.com' };
    expect(isProductionDeploy(env)).toBe(true);
    expect(fixturesEnabled(env)).toBe(false);
    expect(() => loadFixture('TEST_constituencies.json', env)).toThrow(/production/);
  });

  it('is off unless FIXTURES=1', () => {
    expect(fixturesEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(fixturesEnabled(dev)).toBe(true);
  });

  it('refuses files without the TEST_ prefix', () => {
    expect(() => loadFixture('constituencies.json', dev)).toThrow(/TEST_/);
  });
});
