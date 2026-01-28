import { test, expect } from '@playwright/test';

const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;

test.describe('client flow', () => {
  test.skip(!clientEmail || !clientPassword, 'E2E client credentials not set');

  test('client sees only files screen', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(clientEmail!);
    await page.getByLabel('Contrasena').fill(clientPassword!);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await page.waitForURL('**/client/archivos');
    await expect(page.getByRole('link', { name: 'Mis archivos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clientes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Archivos' })).toHaveCount(0);
  });
});