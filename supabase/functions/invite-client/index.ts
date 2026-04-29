// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'http://localhost:4200',
  'http://localhost:4300',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4300'
]);

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
};

const resolveInviteRedirect = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const envRedirect = (Deno.env.get('INVITE_REDIRECT_URL') ?? '').trim();
  if (envRedirect) {
    return envRedirect;
  }
  if (allowedOrigins.has(origin)) {
    return origin;
  }
  return '';
};

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: userData } = await supabaseAuth.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'administrator' || !adminProfile.is_active) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { fullName, email } = await req.json();
    if (!fullName || !email) {
      return new Response(JSON.stringify({ error: 'Nombre y email son requeridos.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const redirectTo = resolveInviteRedirect(req);
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: 'client' },
      ...(redirectTo ? { redirectTo } : {})
    });

    if (inviteError || !inviteData?.user) {
      const { data: existingProfile, error: existingError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (!existingError && existingProfile?.user_id) {
        return new Response(JSON.stringify({ userId: existingProfile.user_id, reused: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: inviteError?.message || 'No se pudo invitar al usuario.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: inviteData.user.id,
      full_name: fullName,
      email,
      role: 'client',
      is_active: true
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ userId: inviteData.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
