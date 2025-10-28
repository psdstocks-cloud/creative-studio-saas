export const buildCorsHeaders = (origin: string) => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');
  return headers;
};

export const handleOptions = (request: Request) => {
  const origin = new URL(request.url).origin;
  const headers = buildCorsHeaders(origin);
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PATCH,OPTIONS');
  headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');
  return new Response(null, { status: 204, headers });
};

export const jsonResponse = (request: Request, status: number, body: unknown) => {
  const origin = new URL(request.url).origin;
  const headers = buildCorsHeaders(origin);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
};

export const errorResponse = (request: Request, status: number, message: string) =>
  jsonResponse(request, status, { message });
