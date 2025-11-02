import { type SupabaseEnv, getServiceSupabaseClient } from '../../_lib/supabase';
import { serializeAuthCookie, getAuthCookieOptions, deleteCookie } from '../../_lib/cookie';
import { serializeCsrfCookie, generateCsrfToken } from '../../_lib/csrf';

interface SignInEnv extends SupabaseEnv {}

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

const resolveSupabaseUrl = (env: SignInEnv) =>
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.PUBLIC_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;

const resolveSupabaseAnonKey = (env: SignInEnv) =>
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const buildAuthUserUrl = (supabaseUrl: string) => {
  const base = new URL(supabaseUrl);
  base.pathname = '/auth/v1/user';
  base.search = '';
  return base.toString();
};

const buildTokenUrl = (supabaseUrl: string) => {
  const base = new URL(supabaseUrl);
  base.pathname = '/auth/v1/token';
  base.search = '?grant_type=password';
  return base.toString();
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

const extractRolesFromUser = (user: any): string[] => {
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

const isDevelopment = (url: string): boolean => {
  return url.includes('localhost') || url.includes('127.0.0.1');
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: SignInEnv;
}) => {
  const url = new URL(request.url);
  const origin = getValidOrigin(request);

  if (request.method === 'OPTIONS') {
    const headers = buildCorsHeaders(origin);
    headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Request-ID, X-CSRF-Token');
    return new Response(null, { status: 204, headers });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      const headers = buildCorsHeaders(origin);
      headers.set('Content-Type', 'application/json');
      headers.set('Cache-Control', 'no-store');

      return new Response(
        JSON.stringify({ message: 'Email and password are required' }),
        {
          status: 400,
          headers,
        }
      );
    }

    // Get Supabase configuration
    const supabaseUrl = resolveSupabaseUrl(env);
    const anonKey = resolveSupabaseAnonKey(env);

    if (!supabaseUrl || !anonKey) {
      console.error('Supabase configuration is missing');
      const headers = buildCorsHeaders(origin);
      headers.set('Content-Type', 'application/json');
      headers.set('Cache-Control', 'no-store');

      return new Response(
        JSON.stringify({ message: 'Server configuration error' }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Authenticate with Supabase
    const tokenUrl = buildTokenUrl(supabaseUrl);
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: new URLSearchParams({
        email,
        password,
        grant_type: 'password',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      const headers = buildCorsHeaders(origin);
      headers.set('Content-Type', 'application/json');
      headers.set('Cache-Control', 'no-store');

      return new Response(
        JSON.stringify({ 
          message: errorData.error_description || errorData.message || 'Invalid credentials' 
        }),
        {
          status: tokenResponse.status === 400 ? 401 : tokenResponse.status,
          headers,
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user } = tokenData;

    if (!access_token || !user) {
      const headers = buildCorsHeaders(origin);
      headers.set('Content-Type', 'application/json');
      headers.set('Cache-Control', 'no-store');

      return new Response(
        JSON.stringify({ message: 'Failed to authenticate' }),
        {
          status: 401,
          headers,
        }
      );
    }

    // Extract roles from user
    const roles = extractRolesFromUser(user);

    // Fetch user balance from profiles table
    let balance = 100; // Default fallback
    try {
      const supabase = getServiceSupabaseClient(env, access_token);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        balance = Number(profile.balance) || 100;
      }
    } catch (balanceError) {
      console.warn('Failed to fetch user balance on sign in', balanceError);
      // Continue with default balance
    }

    // Build response headers with cookie
    const headers = buildCorsHeaders(origin);
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store');

    // Determine if we're in development mode
    const dev = isDevelopment(origin);

    // Set the auth cookie
    const cookieOptions = getAuthCookieOptions(dev);
    const cookieValue = serializeAuthCookie('sb-access-token', access_token, dev);
    
    // Add HttpOnly flag separately
    headers.append('Set-Cookie', `${cookieValue}; HttpOnly`);

    // Generate and set CSRF token cookie
    const csrfToken = generateCsrfToken();
    const csrfCookie = serializeCsrfCookie(csrfToken, dev);
    headers.append('Set-Cookie', csrfCookie);

    // Return user data without exposing the token
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email || '',
          roles,
          metadata: user.user_metadata || null,
          balance,
        },
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('Sign in error:', error);
    const headers = buildCorsHeaders(origin);
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store');

    return new Response(
      JSON.stringify({ message: 'Authentication failed' }),
      {
        status: 500,
        headers,
      }
    );
  }
};

// Export for both POST and OPTIONS
export const onRequest = async (context: { request: Request; env: SignInEnv }) => {
  if (context.request.method === 'OPTIONS') {
    return onRequestPost(context);
  }
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }

  const origin = getValidOrigin(context.request);
  const headers = buildCorsHeaders(origin);
  headers.set('Content-Type', 'application/json');

  return new Response(
    JSON.stringify({ message: 'Method Not Allowed' }),
    {
      status: 405,
      headers,
    }
  );
};

