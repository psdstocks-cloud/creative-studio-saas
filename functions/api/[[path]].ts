const DEFAULT_BASE_URL = 'https://nehtw.com/api';

type EnvBindings = {
  STOCK_API_KEY?: string;
  STOCK_API_BASE_URL?: string;
};

type FunctionContext = {
  request: Request;
  env: EnvBindings;
};

const sanitizePath = (pathname: string) => {
  const cleaned = pathname.replace(/^\/api/, '');
  if (!cleaned || cleaned === '/') {
    return '/';
  }
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
};

const buildUpstreamUrl = (requestUrl: URL, baseUrl: string) => {
  const upstream = new URL(baseUrl);
  const basePath = upstream.pathname.endsWith('/') && upstream.pathname !== '/' ? upstream.pathname.slice(0, -1) : upstream.pathname;
  const mergedPath = `${basePath}${sanitizePath(requestUrl.pathname)}` || '/';
  upstream.pathname = mergedPath;
  upstream.search = requestUrl.search;
  return upstream;
};

const addApiKeyHeader = (headers: Headers, apiKey: string) => {
  headers.set('X-Api-Key', apiKey);
};

const cloneRequestBody = async (request: Request) => {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await request.text();
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return await request.text();
  }

  if (contentType.includes('multipart/form-data')) {
    return await request.arrayBuffer();
  }

  return await request.text();
};

const createCorsHeaders = (requestUrl: URL) => {
  const corsHeaders = new Headers();
  corsHeaders.set('Access-Control-Allow-Origin', requestUrl.origin);
  corsHeaders.set('Access-Control-Allow-Credentials', 'true');
  corsHeaders.set('Vary', 'Origin');
  return corsHeaders;
};

const createErrorResponse = (url: URL, status: number, message: string) => {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': url.origin,
    },
  });
};

export const onRequest = async (context: FunctionContext) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    const corsHeaders = createCorsHeaders(url);
    corsHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const apiKey = env.STOCK_API_KEY;
  if (!apiKey) {
    return createErrorResponse(url, 500, 'Server configuration error: STOCK_API_KEY is not set.');
  }

  const upstreamBaseUrl = env.STOCK_API_BASE_URL || DEFAULT_BASE_URL;
  const upstreamUrl = buildUpstreamUrl(url, upstreamBaseUrl);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length') {
      return;
    }
    headers.set(key, value);
  });

  addApiKeyHeader(headers, apiKey);

  let body: BodyInit | null | undefined = null;
  try {
    body = await cloneRequestBody(request);
  } catch (error) {
    console.error('Error cloning request body', error);
    return createErrorResponse(url, 500, 'Failed to process request body.');
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body,
      redirect: 'follow',
    });
  } catch (error) {
    console.error('Error proxying request to upstream API', error);
    return createErrorResponse(url, 502, 'Upstream API request failed.');
  }

  const responseHeaders = createCorsHeaders(url);
  upstreamResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'content-length') {
      return;
    }
    responseHeaders.set(key, value);
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
};
