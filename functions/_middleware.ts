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
  const url = new URL(request.url);
  const accept = request.headers.get('accept') || '';
  
  // Identify request types
  const isApi = url.pathname.startsWith('/api');
  const isAsset =
    url.pathname.startsWith('/assets') ||
    /\.(js|css|png|jpe?g|webp|svg|ico|map|txt|json|xml|webmanifest)$/i.test(url.pathname);
  const isHtmlRequest = accept.includes('text/html');

  // Process the request
  const response = await next();

  // Apply security headers to all responses
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  // SPA Routing Fallback: If _redirects didn't catch it, serve index.html for 404 HTML requests
  // This is a backup in case Cloudflare Pages _redirects file isn't working
  if (!isApi && !isAsset && response.status === 404 && isHtmlRequest) {
    try {
      // Try to fetch index.html as a fallback
      const indexUrl = new URL('/index.html', url);
      const indexRequest = new Request(indexUrl.toString(), request);
      const indexResponse = await fetch(indexRequest);
      
      if (indexResponse.ok) {
        const indexHeaders = new Headers(indexResponse.headers);
        
        // Apply security headers to the index.html response
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          indexHeaders.set(key, value);
        }
        
        return new Response(indexResponse.body, {
          status: 200,
          statusText: 'OK',
          headers: indexHeaders,
        });
      }
    } catch (error) {
      // If fetching index.html fails, fall through to original 404 response
      console.error('Middleware: Failed to fetch index.html for SPA routing:', error);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
