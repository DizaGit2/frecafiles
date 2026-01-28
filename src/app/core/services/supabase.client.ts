import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Avoid Navigator LockManager issues in some browsers during auth flows.
    lock: async (_key, _timeout, fn) => await fn()
  }
});
