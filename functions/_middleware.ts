const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.railway.app https://nehtw.com https://generativelanguage.googleapis.com",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
};

export const onRequest = async ({ request, next }: { request: Request; next: () => Promise<Response> }) => {
  // Log incoming request details for debugging
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');
  console.log('🚦 Middleware - Incoming Request:', {
    url: new URL(request.url).pathname,
    method: request.method,
    hasAuth: !!authHeader,
    hasCookie: !!cookieHeader,
  });

  const response = await next();
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
