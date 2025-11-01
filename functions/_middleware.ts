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
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');
  const url = new URL(request.url);

  console.log('🚦 Middleware - Incoming Request:', {
    url: url.pathname,
    method: request.method,
    hasAuth: !!authHeader,
    hasCookie: !!cookieHeader,
  });

  const initialResponse = await next();

  const accept = request.headers.get('accept') || '';
  const isApi = url.pathname.startsWith('/api');
  const isAsset =
    url.pathname.startsWith('/assets') ||
    /\.(js|css|png|jpe?g|webp|svg|ico|map|txt|json|xml|webmanifest)$/i.test(url.pathname);

  let finalResponse = initialResponse;

  if (!isApi && !isAsset && initialResponse.status === 404 && accept.includes('text/html')) {
    const indexRequest = new Request(new URL('/index.html', url), request);
    const indexResponse = await fetch(indexRequest);
    finalResponse = new Response(indexResponse.body, {
      status: 200,
      headers: indexResponse.headers,
    });
  }

  const headers = new Headers(finalResponse.headers);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(finalResponse.body, {
    status: finalResponse.status,
    statusText: finalResponse.statusText,
    headers,
  });
};
