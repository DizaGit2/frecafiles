import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('redesign shell — editorial structure', () => {
  test('login page renders editorial eyebrow + Cinzel display title', async ({ page }) => {
    await page.goto('/login');

    const eyebrow = page.locator('.login-editorial__eyebrow');
    await expect(eyebrow).toBeVisible();
    await expect(eyebrow).toHaveText(/Private Portal/);

    const title = page.locator('.login-editorial__title');
    await expect(title).toBeVisible();
    const fontFamily = await title.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain('cinzel');

    // Right column flat-paper card — no glass blur
    const card = page.locator('.login-card');
    await expect(card).toBeVisible();
    const cardBackdrop = await card.evaluate((el) => getComputedStyle(el).backdropFilter || (getComputedStyle(el) as any).webkitBackdropFilter || 'none');
    expect(cardBackdrop).toBe('none');
  });

  test.describe('admin shell', () => {
    test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');

    test('admin pages have a single freca-page__header with one bottom border + flat cards', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(adminEmail!);
      await page.getByLabel('Contrasena').fill(adminPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await page.waitForURL('**/admin/clientes');

      for (const path of ['/admin/clientes', '/admin/archivos', '/admin/categorias']) {
        await page.goto(path);

        const headers = page.locator('.freca-page__header');
        await expect(headers).toHaveCount(1);

        const eyebrow = page.locator('.freca-page__eyebrow').first();
        await expect(eyebrow).toBeVisible();
        const eyebrowFamily = await eyebrow.evaluate((el) => getComputedStyle(el).fontFamily);
        expect(eyebrowFamily.toLowerCase()).toContain('cinzel');

        // Header has exactly one 1px bottom border (no double-border / 40px stack)
        const header = headers.first();
        const borderWidth = await header.evaluate((el) => getComputedStyle(el).borderBottomWidth);
        expect(borderWidth).toBe('1px');
        const borderStyle = await header.evaluate((el) => getComputedStyle(el).borderBottomStyle);
        expect(borderStyle).toBe('solid');

        // Inline .freca-card has NO backdrop-filter (glass dialed back)
        const cards = page.locator('.freca-card');
        const cardCount = await cards.count();
        if (cardCount > 0) {
          const firstCard = cards.first();
          const blur = await firstCard.evaluate((el) => {
            const cs = getComputedStyle(el);
            return cs.backdropFilter || (cs as any).webkitBackdropFilter || 'none';
          });
          expect(blur).toBe('none');
        }
      }
    });

    test('dialog surface keeps glass blur (overlay-only glass)', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(adminEmail!);
      await page.getByLabel('Contrasena').fill(adminPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await page.waitForURL('**/admin/clientes');

      await page.goto('/admin/clientes');
      await page.getByRole('button', { name: 'Agregar cliente' }).click();
      const dialogSurface = page.locator('.mat-mdc-dialog-container .mdc-dialog__surface');
      await expect(dialogSurface).toBeVisible();
      const surfaceBackdrop = await dialogSurface.evaluate((el) => {
        const cs = getComputedStyle(el);
        return cs.backdropFilter || (cs as any).webkitBackdropFilter || 'none';
      });
      expect(surfaceBackdrop).toContain('blur');
    });
  });
});
