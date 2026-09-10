import { expect, test } from '@playwright/test';

const fixtures = process.env.FIXTURES === '1';
const expected = fixtures ? { total: 5, territorial: 4, reserved: 1 } : { total: 350, territorial: 300, reserved: 50 };

// page.goto('/') would resolve to the server root and skip BASE_PATH, so paths are built explicitly.
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const p = (path: string) => `${basePath}${path === '/' ? '' : path}` || '/';

test.describe('constituency listing', () => {
  test('renders every seat in Bangla', async ({ page }) => {
    await page.goto(p('/'));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ত্রয়োদশ জাতীয় সংসদ');
    await expect(page.getByTestId('constituency')).toHaveCount(expected.total);
    await expect(page.getByTestId('reserved')).toBeVisible();
    // Bangla pages show Bangla digits.
    await expect(page.getByTestId('counts')).toContainText(fixtures ? '৫' : '৩৫০');
  });

  test('renders the same seats in English', async ({ page }) => {
    await page.goto(p('/en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('13th Jatiya Sangsad');
    await expect(page.getByTestId('constituency')).toHaveCount(expected.total);
  });

  test('language toggle links the two versions', async ({ page }) => {
    await page.goto(p('/'));
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.getByRole('link', { name: 'বাংলা' }).click();
    await expect(page).not.toHaveURL(/\/en/);
  });

  test('fixtures are labelled, real data is not', async ({ page }) => {
    await page.goto(p('/'));
    const banner = page.getByTestId('fixture-banner');
    if (fixtures) {
      await expect(banner).toBeVisible();
      await expect(page.getByTestId('constituency').first()).toContainText('TEST_');
    } else {
      await expect(banner).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('TEST_');
    }
  });

  test('has no horizontal overflow on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone only');
    await page.goto(p('/'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
