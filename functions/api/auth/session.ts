import { extractAccessToken, type SupabaseEnv, type User } from '../../_lib/supabase';

interface SessionEnv extends SupabaseEnv {}

const ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getValidOrigin = (request: Request): string => {
  const requestOrigin = request.headers.get('origin') || request.headers.get('Origin');
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
};

const buildCorsHeaders = (origin: string) => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return headers;
};

const buildJsonResponse = (origin: string, status: number, body: unknown) => {
  const headers = buildCorsHeaders(origin);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
};

const normalizeRoleInput = (input: unknown): string[] => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((role) => (typeof role === 'string' ? role : String(role)))
      .map((role) => role.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [String(input)];
};

const extractRolesFromUser = (user: User): string[] => {
  const rawRoles = [
    ...normalizeRoleInput(user.app_metadata?.roles),
    ...normalizeRoleInput(user.app_metadata?.role),
    ...normalizeRoleInput(user.user_metadata?.roles),
    ...normalizeRoleInput(user.user_metadata?.role),
  ];

  const normalized = new Set<string>(rawRoles.map((role) => role.toLowerCase()));
  normalized.add('user'); // Default role

  return Array.from(normalized);
};

const buildAuthUserUrl = (supabaseUrl: string) => {
  const base = new URL(supabaseUrl);
  base.pathname = '/auth/v1/user';
  base.search = '';
  return base.toString();
};

const resolveSupabaseUrl = (env: SessionEnv) =>
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.PUBLIC_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;

const resolveSupabaseAnonKey = (env: SessionEnv) =>
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const resolveSupabaseServiceRoleKey = (env: SessionEnv) =>
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

export const onRequest = async ({
  request,
  env,
}: {
  request: Request;
  env: SessionEnv;
}) => {
  const url = new URL(request.url);

  const origin = getValidOrigin(request);

  if (request.method === 'OPTIONS') {
    const headers = buildCorsHeaders(origin);
    headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Request-ID');
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'GET') {
    return buildJsonResponse(origin, 405, { message: 'Method Not Allowed' });
  }

  // Try to validate Supabase session
  try {
    const accessToken = extractAccessToken(request);

    if (!accessToken) {
      return buildJsonResponse(origin, 200, { user: null });
    }

    // Validate the access token with Supabase
    const supabaseUrl = resolveSupabaseUrl(env);
    const serviceRoleKey = resolveSupabaseServiceRoleKey(env);
    const anonKey = resolveSupabaseAnonKey(env);

    if (!supabaseUrl) {
      console.error('Supabase URL is not configured');
      return buildJsonResponse(origin, 200, { user: null });
    }

    const authUserUrl = buildAuthUserUrl(supabaseUrl);
    const apiKey = serviceRoleKey || anonKey;

    if (!apiKey) {
      console.error('Supabase API key is not configured');
      return buildJsonResponse(origin, 200, { user: null });
    }

    const response = await fetch(authUserUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: apiKey,
      },
    });

    if (!response.ok) {
      // Invalid or expired token
      return buildJsonResponse(origin, 200, { user: null });
    }

    const userData = await response.json();
    const user = userData as User;

    if (!user || !user.id) {
      return buildJsonResponse(origin, 200, { user: null });
    }

    // Extract roles from user metadata
    const roles = extractRolesFromUser(user);

    // Return user session in the format expected by the frontend
    return buildJsonResponse(origin, 200, {
      user: {
        id: user.id,
        email: user.email || '',
        roles,
        metadata: user.user_metadata || null,
      },
    });
  } catch (error) {
    console.error('Session validation error:', error);
    // Return null user on any error to avoid blocking the frontend
    return buildJsonResponse(origin, 200, { user: null });
  }
};