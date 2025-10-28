import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export type ServiceSupabaseClient = SupabaseClient<any, any, any>;

export const getServiceSupabaseClient = (env: SupabaseEnv): ServiceSupabaseClient => {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase URL or service role key is missing.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const extractAccessToken = (request: Request): string | null => {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

export const requireUser = async (request: Request, env: SupabaseEnv) => {
  const accessToken = extractAccessToken(request);
  if (!accessToken) {
    throw new Error('Missing access token.');
  }

  const supabase = getServiceSupabaseClient(env);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new Error('Invalid or expired authentication token.');
  }

  return { supabase, user: data.user, accessToken };
};
