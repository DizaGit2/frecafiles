/**
 * E2E Test Artifacts Cleanup Script
 *
 * This script removes test data created during E2E test runs from Supabase.
 * It cleans up:
 * - Test users matching specified email patterns
 * - Their associated profiles
 * - Their file assignments
 * - Optionally, test files uploaded during tests
 *
 * Usage:
 *   npx ts-node scripts/cleanup-e2e-artifacts.ts
 *
 * Required environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key with admin privileges
 *
 * Optional environment variables:
 *   E2E_TEST_EMAIL_PATTERN - Regex pattern for test emails (default: test|e2e|invit)
 *   DRY_RUN - Set to 'true' to preview without deleting
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmailPattern = process.env.E2E_TEST_EMAIL_PATTERN || 'test|e2e|invit';
const isDryRun = process.env.DRY_RUN === 'true';

// Known test emails from E2E tests
const knownTestEmails = [
  process.env.E2E_INVITE_EMAIL,
  process.env.E2E_CLIENT_EMAIL,
].filter(Boolean) as string[];

interface CleanupStats {
  usersFound: number;
  usersDeleted: number;
  profilesDeleted: number;
  fileAssignmentsDeleted: number;
  errors: string[];
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('FRECA Files - E2E Test Artifacts Cleanup');
  console.log('='.repeat(60));

  if (!supabaseUrl || !serviceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN MODE] No data will be deleted.\n');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const stats: CleanupStats = {
    usersFound: 0,
    usersDeleted: 0,
    profilesDeleted: 0,
    fileAssignmentsDeleted: 0,
    errors: []
  };

  try {
    // Step 1: List all users
    console.log('\nStep 1: Fetching users from Supabase Auth...');
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 500
    });

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const allUsers = listData?.users || [];
    console.log(`Found ${allUsers.length} total users in the system.`);

    // Step 2: Filter test users
    console.log('\nStep 2: Identifying test users...');
    const emailRegex = new RegExp(testEmailPattern, 'i');

    const testUsers = allUsers.filter((user) => {
      const email = user.email?.toLowerCase() || '';

      // Match by pattern
      if (emailRegex.test(email)) {
        return true;
      }

      // Match known test emails
      if (knownTestEmails.some((testEmail) => email === testEmail?.toLowerCase())) {
        return true;
      }

      return false;
    });

    stats.usersFound = testUsers.length;
    console.log(`Identified ${testUsers.length} test users for cleanup.`);

    if (testUsers.length === 0) {
      console.log('\nNo test users found. Nothing to clean up.');
      return;
    }

    // List users to be deleted
    console.log('\nUsers to be cleaned up:');
    testUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Step 3: Clean up each user
    console.log('\nStep 3: Cleaning up test data...');

    for (const user of testUsers) {
      console.log(`\n  Processing: ${user.email}`);

      try {
        // Delete file assignments
        if (!isDryRun) {
          const { error: fileClientError, count } = await supabase
            .from('file_clients')
            .delete({ count: 'exact' })
            .eq('client_user_id', user.id);

          if (fileClientError) {
            stats.errors.push(`file_clients for ${user.email}: ${fileClientError.message}`);
          } else {
            stats.fileAssignmentsDeleted += count || 0;
            console.log(`    - Deleted ${count || 0} file assignments`);
          }
        } else {
          console.log('    - Would delete file assignments');
        }

        // Delete profile
        if (!isDryRun) {
          const { error: profileError, count } = await supabase
            .from('profiles')
            .delete({ count: 'exact' })
            .eq('user_id', user.id);

          if (profileError) {
            stats.errors.push(`profile for ${user.email}: ${profileError.message}`);
          } else {
            stats.profilesDeleted += count || 0;
            console.log(`    - Deleted profile`);
          }
        } else {
          console.log('    - Would delete profile');
        }

        // Delete auth user
        if (!isDryRun) {
          const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

          if (authError) {
            stats.errors.push(`auth user ${user.email}: ${authError.message}`);
          } else {
            stats.usersDeleted++;
            console.log(`    - Deleted auth user`);
          }
        } else {
          console.log('    - Would delete auth user');
        }
      } catch (err: any) {
        stats.errors.push(`${user.email}: ${err.message}`);
        console.error(`    - Error: ${err.message}`);
      }
    }

    // Step 4: Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`Test users found:          ${stats.usersFound}`);
    console.log(`Auth users deleted:        ${isDryRun ? 'N/A (dry run)' : stats.usersDeleted}`);
    console.log(`Profiles deleted:          ${isDryRun ? 'N/A (dry run)' : stats.profilesDeleted}`);
    console.log(`File assignments deleted:  ${isDryRun ? 'N/A (dry run)' : stats.fileAssignmentsDeleted}`);

    if (stats.errors.length > 0) {
      console.log(`\nErrors (${stats.errors.length}):`);
      stats.errors.forEach((err) => console.log(`  - ${err}`));
    }

    console.log('\nCleanup complete.');
  } catch (err: any) {
    console.error(`\nFatal error: ${err.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
