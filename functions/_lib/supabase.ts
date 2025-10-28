import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SERVICE_ROLE?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export type ServiceSupabaseClient = SupabaseClient<any, any, any>;

interface SupabaseConfig {
  url: string;
  serviceRoleKey?: string;
  anonKey?: string;
}

const resolveSupabaseUrl = (env: SupabaseEnv) =>
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.PUBLIC_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;

const resolveSupabaseAnonKey = (env: SupabaseEnv) =>
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const resolveSupabaseServiceRoleKey = (env: SupabaseEnv) =>
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

const resolveSupabaseConfig = (env: SupabaseEnv): SupabaseConfig => {
  const url = resolveSupabaseUrl(env);
  const serviceRoleKey = resolveSupabaseServiceRoleKey(env);
  const anonKey = resolveSupabaseAnonKey(env);

  if (!url) {
    throw new Error('Server configuration error: Supabase URL is missing.');
  }

  if (!serviceRoleKey && !anonKey) {
    throw new Error('Server configuration error: Supabase service role or anon key is missing.');
  }

  return { url, serviceRoleKey, anonKey };
};

const buildAuthUserUrl = (supabaseUrl: string) => {
  const base = new URL(supabaseUrl);
  base.pathname = '/auth/v1/user';
  base.search = '';
  return base.toString();
};

const parseSupabaseUser = (payload: any): User | null => {
  if (payload && typeof payload === 'object') {
    if (payload.user && typeof payload.user === 'object') {
      return payload.user as User;
    }
    if ('id' in payload) {
      return payload as User;
    }
  }
  return null;
};

export const getServiceSupabaseClient = (
  env: SupabaseEnv,
  accessToken?: string
): ServiceSupabaseClient => {
  const { url, serviceRoleKey, anonKey } = resolveSupabaseConfig(env);
  const apiKey = serviceRoleKey || anonKey!;

  const globalHeaders = accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

  return createClient(url, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: globalHeaders ? { headers: globalHeaders } : undefined,
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

  const { url, serviceRoleKey, anonKey } = resolveSupabaseConfig(env);
  const authUserUrl = buildAuthUserUrl(url);

  try {
    const response = await fetch(authUserUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: serviceRoleKey || anonKey!,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid or expired authentication token.');
    }

    const payload = await response.json();
    const user = parseSupabaseUser(payload);

    if (!user) {
      throw new Error('Invalid or expired authentication token.');
    }

    const supabase = getServiceSupabaseClient(env, accessToken);

    return { supabase, user, accessToken };
  } catch (error: any) {
    const message = error?.message || 'Invalid or expired authentication token.';
    throw new Error(message);
  }
};
