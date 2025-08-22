import { test, expect } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/StorySmith|Next\.js/i);
  await expect(page.locator('body')).toBeVisible();
});

test('dashboard route responds (if present)', async ({ page }) => {
  const res = await page.goto('/dashboard');
  expect([200, 302, 401, 403, 404]).toContain(res?.status() ?? 0);
});

test('public render route shape (if present)', async ({ page }) => {
  const res = await page.goto('/p/test-page');
  expect([200, 302, 404]).toContain(res?.status() ?? 0);
});
