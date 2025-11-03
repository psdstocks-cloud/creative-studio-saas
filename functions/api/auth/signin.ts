import { handleOptions, jsonResponse } from '../../_lib/http';
import { serializeCsrfCookie, generateCsrfToken } from '../../_lib/csrf';
import { serializeAuthCookie } from '../../_lib/cookie';

interface EnvBindings {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SERVICE_ROLE?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NODE_ENV?: string;
}

/**
 * Detect if we're in development mode
 * Uses NODE_ENV first, but falls back to checking request URL scheme
 * (HTTPS = production, HTTP = development)
 */
const isDevelopment = (env: EnvBindings, request: Request): boolean => {
  // First check NODE_ENV
  const nodeEnv = env.NODE_ENV;
  if (nodeEnv === 'production') return false;
  if (nodeEnv === 'development') return true;
  
  // Fallback: Check if request is HTTPS (production) or HTTP (development)
  const url = new URL(request.url);
  return url.protocol !== 'https:';
};

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, 405, { message: 'Method Not Allowed' });
  }

  // Note: No CSRF check here - signin is the entry point, we'll set CSRF cookie after auth

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, 400, { message: 'Request body must be valid JSON' });
    }

    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse(request, 400, { message: 'Email and password are required' });
    }

    const supabaseUrl =
      env.SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      env.PUBLIC_SUPABASE_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return jsonResponse(request, 500, { message: 'Server configuration error' });
    }

    const anonKey =
      env.SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      env.PUBLIC_SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SERVICE_ROLE;

    if (!anonKey) {
      return jsonResponse(request, 500, { message: 'Server configuration error' });
    }

    // Sign in with Supabase
    const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const signInData = await signInResponse.json();

    if (!signInResponse.ok) {
      return jsonResponse(
        request,
        401,
        { message: signInData.error_description || signInData.message || 'Invalid credentials' }
      );
    }

    const { access_token, user } = signInData;

    if (!access_token || !user) {
      return jsonResponse(request, 401, { message: 'Failed to authenticate' });
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

    // Fetch balance from profiles
    let balance = 100;
    try {
      const serviceRoleKey =
        env.SUPABASE_SERVICE_ROLE_KEY ||
        env.SUPABASE_SERVICE_ROLE ||
        env.SUPABASE_ANON_KEY ||
        env.VITE_SUPABASE_ANON_KEY;

      if (serviceRoleKey) {
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=balance`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );

        const profileData = await profileResponse.json();
        if (profileData && profileData[0]?.balance !== undefined) {
          balance = Number(profileData[0].balance) || 100;
        }
      }
    } catch (error) {
      // Ignore balance fetch errors
    }

    // Set cookies
    const devMode = isDevelopment(env, request);
    const csrfToken = generateCsrfToken();

    const headers = new Headers();
    headers.append('Set-Cookie', serializeAuthCookie('sb-access-token', access_token, devMode) + '; HttpOnly');
    headers.append('Set-Cookie', serializeCsrfCookie(csrfToken, devMode));

    return jsonResponse(
      request,
      200,
      {
        user: {
          id: user.id,
          email: user.email || '',
          roles: Array.from(roles),
          metadata: user.user_metadata || null,
          balance,
        },
      },
      headers
    );
  } catch (error: any) {
    console.error('Sign in error:', error);
    return jsonResponse(request, 500, { message: 'Authentication failed' });
  }
};

