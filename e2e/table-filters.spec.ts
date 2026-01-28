import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');

test.describe('table filters', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');
  test.skip(!supabaseUrl || !serviceKey, 'Supabase service role not set');

  test('filters clients and files', async ({ page }) => {
    const supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const timestamp = Date.now();
    const clientEmail = `e2e-filter-${timestamp}@example.com`;
    const clientName = `E2E Filtro ${timestamp}`;
    const fileName = `E2E Archivo ${timestamp}.pdf`;
    const storagePath = `e2e/${timestamp}/archivo.pdf`;
    let clientId: string | null = null;
    let fileId: string | null = null;

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

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          name: fileName,
          file_url: 'https://example.com/test.pdf',
          storage_path: storagePath,
          created_by: clientId
        })
        .select('id')
        .single();

      if (fileError || !fileData?.id) {
        throw new Error(fileError?.message || 'Failed to create file');
      }

      fileId = fileData.id;

      const { error: linkError } = await supabase.from('file_clients').insert({
        file_id: fileId,
        client_user_id: clientId
      });

      if (linkError) {
        throw new Error(linkError.message);
      }

      await page.goto(`${baseUrl}/login`);
      await page.getByLabel('Email').fill(adminEmail!);
      await page.getByLabel('Contrasena').fill(adminPassword!);
      await page.getByRole('button', { name: 'Ingresar' }).click();

      await page.waitForURL('**/admin/clientes');
      await page.getByLabel('Nombre').fill(clientName);
      await page.getByLabel('Email').fill(clientEmail);
      await page.getByRole('button', { name: 'Buscar' }).click();

      await expect(page.getByRole('cell', { name: clientEmail })).toBeVisible();

      await page.getByRole('link', { name: 'Archivos' }).click();
      await page.waitForURL('**/admin/archivos');

      await page.getByLabel('Nombre').fill(fileName);
      const clientSearchResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/profiles') &&
          response.url().includes('or=') &&
          response.request().method() === 'GET'
      );
      await page.getByLabel('Buscar cliente').fill(clientEmail);
      await clientSearchResponse;
      await page.getByRole('combobox', { name: 'Cliente' }).click();

      const clientOption = page.getByRole('option', { name: new RegExp(clientEmail, 'i') });
      await expect(clientOption).toBeVisible();
      await clientOption.click();

      await page.getByRole('button', { name: 'Buscar' }).click();
      await expect(page.getByRole('cell', { name: fileName })).toBeVisible();
    } finally {
      if (fileId) {
        await supabase.from('file_clients').delete().eq('file_id', fileId);
        await supabase.from('files').delete().eq('id', fileId);
      }
      if (clientId) {
        await supabase.from('profiles').delete().eq('user_id', clientId);
        await supabase.auth.admin.deleteUser(clientId);
      }
    }
  });
});
