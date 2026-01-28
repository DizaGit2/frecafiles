import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const inviteEmail = process.env.E2E_INVITE_EMAIL || '';
const inviteName = process.env.E2E_INVITE_NAME || 'Cliente Invitado';
const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:4300').replace(/\/$/, '');
const invitePassword = process.env.E2E_INVITE_PASSWORD || 'Test12345!';

test.describe('invite flow', () => {
  test.skip(!supabaseUrl || !serviceKey || !inviteEmail, 'Invite env vars not set');

  test('client can accept invite and set password', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('browser error:', msg.text());
      }
    });

    const supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listData?.users?.find((user) => user.email?.toLowerCase() === inviteEmail.toLowerCase());

    if (existing?.id) {
      await supabase.from('file_clients').delete().eq('client_user_id', existing.id);
      await supabase.from('profiles').delete().eq('user_id', existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: inviteEmail,
      options: {
        redirectTo: `${baseUrl}/login`,
        data: { full_name: inviteName, role: 'client' }
      }
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Failed to generate invite link');
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: data.user.id,
        full_name: inviteName,
        email: inviteEmail,
        role: 'client',
        is_active: true
      },
      { onConflict: 'user_id' }
    );

    if (profileError) {
      throw new Error(`Failed to upsert profile: ${profileError.message}`);
    }

    const inviteLink = data.properties?.action_link;
    if (!inviteLink) {
      throw new Error('Invite link not returned');
    }

    await page.goto(inviteLink);
    await page.waitForURL('**/login**');
    await page.getByLabel('Nueva contrasena').fill(invitePassword);
    await page.getByLabel('Confirmar contrasena').fill(invitePassword);

    const userUpdateResponse = page.waitForResponse(
      (response) => response.url().includes('/auth/v1/user') && response.request().method() === 'PUT',
      { timeout: 20000 }
    );
    await page.getByRole('button', { name: /Crear cuenta/i }).click();

    const response = await userUpdateResponse;
    expect(response.status(), 'auth update user response').toBeGreaterThanOrEqual(200);
    expect(response.status(), 'auth update user response').toBeLessThan(500);

    await page.waitForURL('**/client/archivos', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Mis archivos' })).toBeVisible();
  });
});
