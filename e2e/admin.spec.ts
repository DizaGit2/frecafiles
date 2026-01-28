import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const inviteEmail = process.env.E2E_INVITE_EMAIL || 'disatloz@hotmail.com';
const inviteName = process.env.E2E_INVITE_NAME || 'Cliente Invitado';

test.describe('admin flow', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');

  test('admin can login, navigate, and invite a client', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Contrasena').fill(adminPassword!);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await page.waitForURL('**/admin/clientes');
    await expect(page.getByRole('link', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Archivos' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();

    await page.getByRole('button', { name: 'Agregar cliente' }).click();
    const dialog = page.getByRole('dialog', { name: 'Agregar cliente' });
    await dialog.getByLabel('Nombre').fill(inviteName);
    await dialog.getByLabel('Email').fill(inviteEmail);

    const responsePromise = page
      .waitForResponse((response) => response.url().includes('/functions/v1/invite-client'))
      .then((response) => ({ type: 'response' as const, response }));

    const requestFailedPromise = page
      .waitForEvent('requestfailed', (request) => request.url().includes('/functions/v1/invite-client'))
      .then((request) => ({ type: 'failed' as const, errorText: request.failure()?.errorText || 'request failed' }));

    const toastPromise = page
      .locator('mat-snack-bar-container')
      .first()
      .waitFor({ timeout: 20000 })
      .then(() => ({ type: 'toast' as const }));

    await dialog.getByRole('button', { name: 'Guardar' }).click();

    const result = await Promise.race([responsePromise, requestFailedPromise, toastPromise]);

    if (result.type === 'failed') {
      throw new Error(`invite-client request failed: ${result.errorText}`);
    }

    if (result.type === 'response') {
      expect(result.response.status(), 'invite-client should respond 200').toBe(200);
    }

    if (result.type === 'toast') {
      const toastText = await page.locator('mat-snack-bar-container').first().innerText();
      if (!toastText.includes('Cliente guardado correctamente.')) {
        throw new Error(`invite-client toast error: ${toastText}`);
      }
    }

    await page.getByRole('link', { name: 'Archivos' }).click();
    await page.waitForURL('**/admin/archivos');
    await expect(page.getByRole('columnheader', { name: 'Archivo' })).toBeVisible();

    await page.goto('/login');
    await expect(page).not.toHaveURL('**/login');

    const headerErrors = errors.filter((err) => err.includes('headerCell'));
    expect(headerErrors, 'No table headerCell errors').toEqual([]);
  });
});
