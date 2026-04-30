import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');

test.describe.configure({ mode: 'serial' });

test.describe('admin edit file clients', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E admin credentials not set');
  test.skip(!supabaseUrl || !serviceKey, 'Supabase service role not set');

  const timestamp = Date.now();
  const clientAEmail = `e2e-edit-clients-a-${timestamp}@example.com`;
  const clientAName = `E2E ClientA ${timestamp}`;
  const clientBEmail = `e2e-edit-clients-b-${timestamp}@example.com`;
  const clientBName = `E2E ClientB ${timestamp}`;
  const fileName = `E2E EditClients ${timestamp}.pdf`;
  const storagePath = `e2e/${timestamp}/edit-clients.pdf`;

  let supabase: SupabaseClient;
  let clientAId: string | null = null;
  let clientBId: string | null = null;
  let fileId: string | null = null;
  let categoryId: string | null = null;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const createUser = async (email: string, fullName: string) => {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'Test12345!',
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'client' }
      });
      if (createError || !created?.user) {
        throw new Error(createError?.message || `Failed to create ${email}`);
      }
      const userId = created.user.id;
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: userId,
          full_name: fullName,
          email,
          role: 'client',
          is_active: true
        },
        { onConflict: 'user_id' }
      );
      if (profileError) {
        throw new Error(`Failed to create profile for ${email}: ${profileError.message}`);
      }
      return userId;
    };

    clientAId = await createUser(clientAEmail, clientAName);
    clientBId = await createUser(clientBEmail, clientBName);

    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'General')
      .maybeSingle();
    categoryId = cat?.id ?? null;

    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        name: fileName,
        file_url: 'https://example.com/edit-clients.pdf',
        storage_path: storagePath,
        created_by: clientAId,
        category_id: categoryId
      })
      .select('id')
      .single();
    if (fileError || !fileData?.id) {
      throw new Error(fileError?.message || 'Failed to create file');
    }
    fileId = fileData.id;

    const { error: linkError } = await supabase.from('file_clients').insert({
      file_id: fileId,
      client_user_id: clientAId
    });
    if (linkError) {
      throw new Error(linkError.message);
    }
  });

  test.afterAll(async () => {
    if (!supabase) return;
    if (fileId) {
      await supabase.from('file_clients').delete().eq('file_id', fileId);
      await supabase.from('files').delete().eq('id', fileId);
    }
    for (const id of [clientAId, clientBId]) {
      if (id) {
        await supabase.from('profiles').delete().eq('user_id', id);
        await supabase.auth.admin.deleteUser(id);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel('Email').fill(adminEmail!);
    await page.getByLabel('Contrasena').fill(adminPassword!);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('**/admin/clientes');

    await page.goto(`${baseUrl}/admin/archivos`);
    await expect(page.getByRole('heading', { name: 'Consultar archivos' })).toBeVisible();
    await page.getByLabel('Nombre').fill(fileName);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByRole('cell', { name: fileName })).toBeVisible();
  });

  test('1. opens dialog with current clients pre-populated', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: fileName });
    await row.locator('button.edit-clients-btn').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fileName);

    const chipA = dialog.locator('mat-chip-row').filter({ hasText: clientAName });
    await expect(chipA).toBeVisible();
    await expect(dialog.locator('mat-chip-row')).toHaveCount(1);

    const submit = dialog.getByRole('button', { name: 'Guardar' });
    await expect(submit).toBeEnabled();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('2. adds a new client and persists', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: fileName });
    await row.locator('button.edit-clients-btn').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('mat-chip-row').filter({ hasText: clientAName })).toBeVisible();

    const searchInput = dialog.getByPlaceholder('Escribe para buscar');
    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/profiles') &&
        response.url().includes('or=') &&
        response.request().method() === 'GET'
    );
    await searchInput.fill(clientBEmail);
    await searchResponsePromise;

    const optionB = page.getByRole('option', { name: new RegExp(clientBEmail, 'i') });
    await expect(optionB).toBeVisible({ timeout: 10000 });
    await optionB.click();

    await expect(dialog.locator('mat-chip-row').filter({ hasText: clientBName })).toBeVisible();

    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    const refreshedRow = page.getByRole('row').filter({ hasText: fileName });
    await expect(refreshedRow).toContainText(clientAName);
    await expect(refreshedRow).toContainText(clientBName);
  });

  test('3. removes a client and persists', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: fileName });
    await row.locator('button.edit-clients-btn').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const chipA = dialog.locator('mat-chip-row').filter({ hasText: clientAName });
    await expect(chipA).toBeVisible();

    await chipA.getByRole('button', { name: 'Remover cliente' }).click();
    await expect(chipA).not.toBeVisible();
    await expect(dialog.locator('mat-chip-row').filter({ hasText: clientBName })).toBeVisible();

    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    const refreshedRow = page.getByRole('row').filter({ hasText: fileName });
    await expect(refreshedRow).toContainText(clientBName);
    await expect(refreshedRow).not.toContainText(clientAName);
  });

  test('4. save is disabled when chip set is empty', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: fileName });
    await row.locator('button.edit-clients-btn').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const chipB = dialog.locator('mat-chip-row').filter({ hasText: clientBName });
    await expect(chipB).toBeVisible();
    await chipB.getByRole('button', { name: 'Remover cliente' }).click();
    await expect(dialog.locator('mat-chip-row')).toHaveCount(0);

    const submit = dialog.getByRole('button', { name: 'Guardar' });
    await expect(submit).toBeDisabled();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('5. shows inline submit spinner while saving', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: fileName });
    await row.locator('button.edit-clients-btn').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('mat-chip-row').filter({ hasText: clientBName })).toBeVisible();

    const searchInput = dialog.getByPlaceholder('Escribe para buscar');
    await searchInput.fill(clientAEmail);
    const optionA = page.getByRole('option', { name: new RegExp(clientAEmail, 'i') });
    await expect(optionA).toBeVisible({ timeout: 10000 });
    await optionA.click();
    await expect(dialog.locator('mat-chip-row').filter({ hasText: clientAName })).toBeVisible();

    // Stall the file_clients INSERT so we can observe the spinner.
    let releaseRoute: () => void = () => {};
    const releaseGate = new Promise<void>((resolve) => {
      releaseRoute = resolve;
    });
    await page.route('**/rest/v1/file_clients**', async (route) => {
      if (route.request().method() === 'POST') {
        await releaseGate;
        await route.abort();
      } else {
        await route.continue();
      }
    });

    const submit = dialog.getByRole('button', { name: 'Guardar' });
    await submit.click();

    await expect(dialog.getByRole('button', { name: 'Guardando...' })).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.btn-spinner')).toBeVisible({ timeout: 5000 });

    releaseRoute();
  });
});
