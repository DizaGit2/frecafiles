import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');

test.describe('add file modal', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');
  test.skip(!supabaseUrl || !serviceKey, 'Supabase service role not set');

  test('client select loads async results', async ({ page }) => {
    const supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const timestamp = Date.now();
    const clientEmail = `e2e-client-${timestamp}@example.com`;
    const clientName = `E2E Client ${timestamp}`;

    let clientId: string | null = null;
    try {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: 'Test12345!',
        email_confirm: true,
        user_metadata: { full_name: clientName, role: 'client' }
      });

      if (createError || !created?.user) {
        throw new Error(createError?.message || 'Failed to create client user');
      }

      clientId = created.user.id;

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: clientId,
          full_name: clientName,
          email: clientEmail,
          role: 'client',
          is_active: true
        },
        { onConflict: 'user_id' }
      );

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      await page.goto(`${baseUrl}/login`);
      await page.getByLabel('Email').fill(adminEmail!);
      await page.getByLabel('Contrasena').fill(adminPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();

      await page.waitForURL('**/admin/clientes');
      await page.goto(`${baseUrl}/admin/archivos`);
      await page.getByRole('button', { name: 'Agregar archivo' }).click();

      const dialog = page.getByRole('dialog', { name: 'Agregar archivo' });
      await expect(dialog).toBeVisible();

      const searchInput = dialog.getByPlaceholder('Escribe para buscar');
      await expect(searchInput).toBeVisible();
      const searchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/profiles') &&
          response.url().includes('or=') &&
          response.request().method() === 'GET'
      );
      await searchInput.fill(clientEmail);
      await searchResponsePromise;

      const option = page.getByRole('option', { name: new RegExp(clientEmail, 'i') });
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();

      await expect(dialog).toContainText(clientEmail);
    } finally {
      if (clientId) {
        await supabase.from('profiles').delete().eq('user_id', clientId);
        await supabase.auth.admin.deleteUser(clientId);
      }
    }
  });
});
