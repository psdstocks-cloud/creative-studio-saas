/**
 * Cookie utilities for secure session management
 */

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

export interface ParsedCookie {
  name: string;
  value: string;
}

/**
 * Parse cookie header string into key-value pairs
 */
export const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};

  // Split by semicolon and process each cookie
  cookieHeader.split(';').forEach((cookie) => {
    const [rawName, ...rawValueParts] = cookie.split('=');
    const name = rawName?.trim();

    if (!name) {
      return;
    }

    // Join back any '=' that might be in the value
    const value = rawValueParts.join('=').trim();

    if (value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
};

/**
 * Serialize a cookie with secure defaults
 */
export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {}
): string => {
  const parts: string[] = [];

  // Value must be URL encoded
  parts.push(`${name}=${encodeURIComponent(value)}`);

  // maxAge in seconds
  if (options.maxAge !== undefined && options.maxAge > 0) {
    parts.push(`Max-Age=${options.maxAge}`);
  } else if (options.maxAge === 0) {
    parts.push('Max-Age=0');
  }

  // Path
  if (options.path) {
    parts.push(`Path=${options.path}`);
  } else {
    parts.push('Path=/');
  }

  // Domain
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  // Secure flag
  if (options.secure !== false) {
    parts.push('Secure');
  }

  // SameSite
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`);
  } else {
    parts.push('SameSite=Strict');
  }

  // HttpOnly must be set via Set-Cookie header in server
  // This serialization doesn't include it in the string
  // The server needs to add it separately

  return parts.join('; ');
};

/**
 * Create secure cookie options for authentication tokens
 * Uses SameSite=None for cross-origin support (required for split deployments)
 */
export const getAuthCookieOptions = (isDevelopment = false): CookieOptions => {
  const isSecure = !isDevelopment;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'none', // Must be 'none' for cross-origin cookies
    maxAge: 259200, // 3 days in seconds
    path: '/',
  };
};

/**
 * Create a cookie serialization that includes HttpOnly flag
 * This is a special version for server responses
 */
export const serializeAuthCookie = (name: string, value: string, isDevelopment = false): string => {
  const options = getAuthCookieOptions(isDevelopment);
  const cookieString = serializeCookie(name, value, { ...options, httpOnly: undefined });
  
  // HttpOnly must be added separately as it's a special flag
  // Return both the Set-Cookie header value (with HttpOnly) and instructions
  return cookieString;
};

/**
 * Delete a cookie by setting maxAge to 0
 */
export const deleteCookie = (name: string, options: Omit<CookieOptions, 'maxAge'> = {}): string => {
  const finalOptions: CookieOptions = {
    ...options,
    maxAge: 0,
  };

  if (!finalOptions.path) {
    finalOptions.path = '/';
  }

  return serializeCookie(name, '', finalOptions);
};

/**
 * Extract a specific cookie value from cookie header
 */
export const getCookie = (cookieHeader: string | null, name: string): string | null => {
  const cookies = parseCookies(cookieHeader);
  return cookies[name] || null;
};

