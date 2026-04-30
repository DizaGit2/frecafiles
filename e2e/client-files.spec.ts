import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');

test.describe('client files screen', () => {
  test.skip(!supabaseUrl || !serviceKey, 'Supabase service role not set');

  test('client signs in and sees their assigned files without 500 errors', async ({ page }) => {
    const supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const timestamp = Date.now();
    const clientEmail = `e2e-cli-files-${timestamp}@example.com`;
    const clientPassword = 'Test12345!';
    const clientName = `E2E Cliente Files ${timestamp}`;
    const fileName = `E2E Archivo Cliente ${timestamp}.pdf`;
    let clientId: string | null = null;
    let fileId: string | null = null;

    try {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: clientPassword,
        email_confirm: true,
        user_metadata: { full_name: clientName, role: 'client' }
      });
      if (createError || !created?.user) throw new Error(createError?.message || 'create user failed');
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
      if (profileError) throw new Error(profileError.message);

      const { data: file, error: fileError } = await supabase
        .from('files')
        .insert({
          name: fileName,
          file_url: 'https://example.com/cliente.pdf',
          storage_path: `e2e/${timestamp}/cliente.pdf`,
          created_by: clientId
        })
        .select('id')
        .single();
      if (fileError || !file?.id) throw new Error(fileError?.message || 'create file failed');
      fileId = file.id;

      const { error: linkError } = await supabase.from('file_clients').insert({
        file_id: fileId,
        client_user_id: clientId
      });
      if (linkError) throw new Error(linkError.message);

      const failedFileResponses: { url: string; status: number; body: string }[] = [];
      page.on('response', async (response) => {
        if (response.url().includes('/rest/v1/files') && response.status() >= 500) {
          let body = '';
          try {
            body = await response.text();
          } catch {
            // ignore
          }
          failedFileResponses.push({ url: response.url(), status: response.status(), body });
        }
      });

      await page.goto(`${baseUrl}/login`);
      await page.getByLabel('Email').fill(clientEmail);
      await page.getByLabel('Contrasena').fill(clientPassword);
      await page.getByRole('button', { name: 'Ingresar' }).click();

      await page.waitForURL('**/client/archivos');

      await expect(page.getByRole('heading', { name: 'Mis archivos' })).toBeVisible();

      const fileCard = page.locator('.file-card', { hasText: fileName });
      await expect(fileCard).toBeVisible({ timeout: 15000 });

      expect(
        failedFileResponses,
        `Expected no 5xx from /rest/v1/files but got: ${JSON.stringify(failedFileResponses)}`
      ).toEqual([]);
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
