import { type SupabaseEnv } from '../../_lib/supabase';
import { deleteCookie } from '../../_lib/cookie';
import { deleteCsrfCookie } from '../../_lib/csrf';
import { requireCsrf } from '../../_lib/http';

interface SignOutEnv extends SupabaseEnv {}

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

const isDevelopment = (url: string): boolean => {
  return url.includes('localhost') || url.includes('127.0.0.1');
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: SignOutEnv;
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
    // Verify CSRF token for POST requests
    const csrfCheck = requireCsrf(request);
    if (csrfCheck !== true) {
      return csrfCheck;
    }

    // Build response headers with cookie deletion
    const headers = buildCorsHeaders(origin);
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store');

    // Determine if we're in development mode
    const dev = isDevelopment(origin);

    // Delete the auth cookie by setting maxAge to 0
    const cookieOptions: any = {
      path: '/',
      secure: !dev,
      sameSite: 'none' as const, // Must match signin/session cookie settings
    };
    const deleteCookieString = deleteCookie('sb-access-token', cookieOptions);
    headers.append('Set-Cookie', `${deleteCookieString}; HttpOnly`);

    // Also delete any other potential cookie names
    const additionalCookieNames = [
      'sb-auth-token',
      'supabase-auth-token',
      'sb:token',
    ];

    for (const cookieName of additionalCookieNames) {
      const additionalDeleteCookie = deleteCookie(cookieName, cookieOptions);
      headers.append('Set-Cookie', `${additionalDeleteCookie}; HttpOnly`);
    }

    // Delete CSRF token cookie
    const csrfDeleteCookie = deleteCsrfCookie(dev);
    headers.append('Set-Cookie', csrfDeleteCookie);

    // Return success response
    return new Response(
      JSON.stringify({ message: 'Signed out successfully' }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('Sign out error:', error);
    const headers = buildCorsHeaders(origin);
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store');

    return new Response(
      JSON.stringify({ message: 'Sign out failed' }),
      {
        status: 500,
        headers,
      }
    );
  }
};

// Export for both POST and OPTIONS
export const onRequest = async (context: { request: Request; env: SignOutEnv }) => {
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

