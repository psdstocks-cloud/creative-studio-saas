import { handleOptions, jsonResponse } from '../../_lib/http';
import { extractAccessToken, getServiceSupabaseClient, type SupabaseEnv } from '../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return jsonResponse(request, 405, { message: 'Method Not Allowed' });
  }

  try {
    const accessToken = extractAccessToken(request);

    if (!accessToken) {
      return jsonResponse(request, 200, { user: null });
    }

    // Verify the token with Supabase
    const supabase = getServiceSupabaseClient(env);
    const authUserUrl = `${env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!serviceRoleKey) {
      return jsonResponse(request, 500, { message: 'Server configuration error' });
    }

    const response = await fetch(authUserUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: serviceRoleKey,
      },
    });

    if (!response.ok) {
      return jsonResponse(request, 200, { user: null });
    }

    const payload = await response.json();
    const user = payload?.user;

    if (!user) {
      return jsonResponse(request, 200, { user: null });
    }

    // Fetch user balance from profiles
    let balance = 100;
    try {
      const supabaseAdmin = getServiceSupabaseClient(env, serviceRoleKey);
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        balance = Number(profile.balance) || 100;
      }
    } catch (error) {
      // Ignore balance fetch errors, use default
    }

    // Extract roles
    const roles = new Set<string>(['user']);
    if (user.app_metadata?.roles) {
      const roleArray = Array.isArray(user.app_metadata.roles) ? user.app_metadata.roles : [user.app_metadata.roles];
      roleArray.forEach((r: string) => roles.add(r.toLowerCase()));
    }
    if (user.user_metadata?.roles) {
      const roleArray = Array.isArray(user.user_metadata.roles) ? user.user_metadata.roles : [user.user_metadata.roles];
      roleArray.forEach((r: string) => roles.add(r.toLowerCase()));
    }

    return jsonResponse(request, 200, {
      user: {
        id: user.id,
        email: user.email || '',
        roles: Array.from(roles),
        metadata: user.user_metadata || null,
        balance,
      },
    });
  } catch (error: any) {
    console.error('Session error:', error);
    return jsonResponse(request, 200, { user: null });
  }
};

