const buildCorsHeaders = (origin: string) => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return headers;
};

const buildJsonResponse = (origin: string, status: number, body: unknown) => {
  const headers = buildCorsHeaders(origin);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
};

export const onRequest = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    const headers = buildCorsHeaders(url.origin);
    headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'GET') {
    return buildJsonResponse(url.origin, 405, { message: 'Method Not Allowed' });
  }

  // At this stage the BFF does not maintain Supabase sessions server-side.
  // Returning a null user payload keeps the frontend boot sequence predictable
  // while avoiding upstream 404 responses that block rendering behind the loader.
  return buildJsonResponse(url.origin, 200, { user: null });
};
