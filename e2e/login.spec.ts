import { test, expect } from '@playwright/test';

test('login page hides nav and user menu', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('.freca-nav')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'FRECA Files' })).toBeVisible();
});
