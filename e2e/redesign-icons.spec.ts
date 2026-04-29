import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;

// rgb()-form values of the four allowed file-icon tones (must mirror src/styles.scss tokens):
// --freca-gold       #f2b544 → rgb(242, 181, 68)
// --freca-gold-soft  #e8c87a → rgb(232, 200, 122)
// --freca-cream      #f2ece4 → rgb(242, 236, 228)
// --freca-ash-strong #d8d0c5 → rgb(216, 208, 197)
const ALLOWED_ICON_RGB = new Set([
  'rgb(242, 181, 68)',
  'rgb(232, 200, 122)',
  'rgb(242, 236, 228)',
  'rgb(216, 208, 197)'
]);

test.describe('redesign icons — palette discipline', () => {
  test.describe('client file cards', () => {
    test.skip(!clientEmail || !clientPassword, 'E2E client credentials not set');

    test('every file-card icon resolves to one of the four palette tones', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(clientEmail!);
      await page.getByLabel('Contrasena').fill(clientPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await page.waitForURL('**/client/archivos');

      const cards = page.locator('.file-card .card-thumbnail mat-icon');
      const count = await cards.count();
      // Skip if there are no files seeded for this client
      test.skip(count === 0, 'no files seeded for client');

      for (let i = 0; i < count; i++) {
        const color = await cards.nth(i).evaluate((el) => getComputedStyle(el).color);
        expect.soft(ALLOWED_ICON_RGB.has(color), `Icon #${i} color "${color}" must be in the brand palette`).toBe(true);
      }
    });
  });

  test.describe('admin file actions', () => {
    test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');

    test('preview/download hover background is gold, not Material blue/green', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(adminEmail!);
      await page.getByLabel('Contrasena').fill(adminPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await page.waitForURL('**/admin/clientes');

      await page.goto('/admin/archivos');
      await expect(page.getByRole('columnheader', { name: 'Archivo' })).toBeVisible();

      const previewBtn = page.locator('.preview-btn').first();
      const downloadBtn = page.locator('.download-btn').first();

      // Skip if there are no files seeded
      test.skip((await previewBtn.count()) === 0, 'no admin files to hover');

      for (const btn of [previewBtn, downloadBtn]) {
        await btn.scrollIntoViewIfNeeded();
        await btn.hover();
        const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
        // Should NOT contain a blue (R<G<B) or green-dominant tone — gold is R≫G,B
        // Easier assertion: explicit allow-list of gold-ish tints
        expect.soft(/rgba\(242,\s*181,\s*68/.test(bg) || bg === 'rgba(0, 0, 0, 0)' || bg.startsWith('rgb(0, 0, 0'), `${bg} should be gold-tinted, not Material blue/green`).toBe(true);
      }
    });
  });
});
