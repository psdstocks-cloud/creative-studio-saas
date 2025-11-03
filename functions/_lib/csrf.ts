/**
 * CSRF protection utilities for cookie-based authentication
 */

import { serializeCookie, parseCookies, deleteCookie } from './cookie';

/**
 * Generate a cryptographically secure random token
 */
export const generateCsrfToken = (): string => {
  // Use Web Crypto API available in Cloudflare Workers
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Create XSRF-TOKEN cookie options (non-HttpOnly so JavaScript can read it)
 * 
 * FIXED: Uses SameSite=Lax in development, SameSite=None in production
 * Same fix as auth cookies - SameSite=None requires HTTPS
 */
export const getCsrfCookieOptions = (isDevelopment = false): any => {
  return {
    httpOnly: false, // Must be readable by JavaScript
    secure: !isDevelopment,
    // FIX: Use 'lax' in development (works with HTTP), 'none' in production (for cross-origin)
    sameSite: isDevelopment ? 'lax' : 'none',
    maxAge: 259200, // 3 days - same as session
    path: '/',
  };
};

/**
 * Serialize CSRF token cookie
 */
export const serializeCsrfCookie = (token: string, isDevelopment = false): string => {
  const options = getCsrfCookieOptions(isDevelopment);
  return serializeCookie('XSRF-TOKEN', token, options);
};

/**
 * Extract CSRF token from cookie header
 */
export const getCsrfTokenFromCookie = (cookieHeader: string | null): string | null => {
  const cookies = parseCookies(cookieHeader);
  return cookies['XSRF-TOKEN'] || null;
};

/**
 * Verify CSRF token from header matches cookie
 */
export const verifyCsrfToken = (request: Request): boolean => {
  // Only verify CSRF for state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const cookieHeader = request.headers.get('cookie');
  const cookieToken = getCsrfTokenFromCookie(cookieHeader);
  
  const headerToken = request.headers.get('X-CSRF-Token') || 
                      request.headers.get('X-XSRF-TOKEN');
  
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeEqual(cookieToken, headerToken);
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

/**
 * Delete CSRF token cookie
 */
export const deleteCsrfCookie = (isDevelopment = false): string => {
  const options = getCsrfCookieOptions(isDevelopment);
  return deleteCookie('XSRF-TOKEN', options);
};

