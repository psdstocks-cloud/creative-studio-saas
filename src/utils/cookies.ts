/**
 * Client-side cookie utilities
 */

/**
 * Get a cookie value by name
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
};

/**
 * Set a cookie value
 */
export const setCookie = (name: string, value: string, days?: number): void => {
  if (typeof document === 'undefined') {
    return;
  }

  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  document.cookie = `${name}=${value}${expires}; path=/`;
};

/**
 * Delete a cookie
 */
export const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

/**
 * Get CSRF token from cookies
 */
export const getCsrfToken = (): string | null => {
  return getCookie('XSRF-TOKEN');
};

