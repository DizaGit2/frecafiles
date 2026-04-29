import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');

test.describe('redesign empty states', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');
  test.skip(!supabaseUrl || !serviceKey, 'Supabase service role not set');

  test('admin categories shows editorial empty state when filter has no matches', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Contrasena').fill(adminPassword!);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('**/admin/clientes');

    await page.goto(`${baseUrl}/admin/categorias`);
    await page.getByLabel('Nombre').fill(`__no-match-${Date.now()}__`);
    await page.getByRole('button', { name: 'Buscar' }).click();

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    const mark = emptyState.locator('.empty-state__mark');
    await expect(mark).toBeVisible();
    const fontFamily = await mark.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain('cinzel');

    const copy = emptyState.locator('.empty-state__copy');
    await expect(copy).toContainText(/Aun no hay categorias|Sin resultados/);
  });
});
