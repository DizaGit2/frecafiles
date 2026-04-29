import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('redesign dialogs — submit spinner', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');

  test('category dialog shows spinner inside submit button while saving', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Contrasena').fill(adminPassword!);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('**/admin/clientes');

    await page.goto('/admin/categorias');
    await page.getByRole('button', { name: 'Agregar categoria' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const uniqueName = `Editorial Test ${Date.now()}`;
    await dialog.getByLabel('Nombre').fill(uniqueName);

    // Stall the categories POST so we can observe the spinner. Don't fulfill — abort
    // after the spinner check so the dialog stays open and the row never gets persisted.
    let releaseRoute: () => void = () => {};
    const releaseGate = new Promise<void>((resolve) => {
      releaseRoute = resolve;
    });
    await page.route('**/rest/v1/categories**', async (route) => {
      if (route.request().method() === 'POST') {
        await releaseGate;
        await route.abort();
      } else {
        await route.continue();
      }
    });

    const submit = dialog.getByRole('button', { name: 'Guardar' });
    await submit.click();

    // Loading state flips the label to Guardando... and renders the inline spinner
    await expect(dialog.getByRole('button', { name: 'Guardando...' })).toBeVisible({ timeout: 5000 });
    const spinner = dialog.locator('.btn-spinner');
    await expect(spinner).toBeVisible({ timeout: 5000 });

    // Release the gated request so the component can finish its error path
    releaseRoute();
  });
});
