import { verifyCsrfToken } from './csrf';

const ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001', // Vite dev server default port
];

const getValidOrigin = (request: Request): string => {
  const requestOrigin = request.headers.get('origin') || request.headers.get('Origin');
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
};

export const buildCorsHeaders = (origin: string) => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return headers;
};

export const handleOptions = (request: Request) => {
  const origin = getValidOrigin(request);
  const headers = buildCorsHeaders(origin);
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Request-ID, X-CSRF-Token');
  return new Response(null, { status: 204, headers });
};

/**
 * Verify CSRF token for state-changing requests
 * Returns true if CSRF is valid or if request method doesn't need CSRF
 */
export const requireCsrf = (request: Request): true | Response => {
  if (!verifyCsrfToken(request)) {
    return errorResponse(request, 403, 'Invalid CSRF token');
  }
  return true;
};

export const jsonResponse = (request: Request, status: number, body: unknown, customHeaders?: Headers) => {
  const origin = getValidOrigin(request);
  const headers = buildCorsHeaders(origin);
  if (customHeaders) {
    customHeaders.forEach((value, key) => {
      // Set-Cookie headers must use append to allow multiple cookies
      if (key.toLowerCase() === 'set-cookie') {
        headers.append(key, value);
      } else {
        headers.set(key, value);
      }
    });
  }
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
};

export const errorResponse = (request: Request, status: number, message: string) =>
  jsonResponse(request, status, { message });
