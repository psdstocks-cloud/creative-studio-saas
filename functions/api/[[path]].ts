const DEFAULT_BASE_URL = 'https://nehtw.com/api';

type EnvBindings = {
  STOCK_API_KEY?: string;
  STOCK_API_BASE_URL?: string;
  STOCK_API?: string;
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

const requiresApiKey = (pathname: string) => {
  return /\/stockinfo\//i.test(pathname);
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

const ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getValidOrigin = (request: Request): string => {
  const requestOrigin = request.headers.get('origin') || request.headers.get('Origin');
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
};

const createCorsHeaders = (request: Request) => {
  const origin = getValidOrigin(request);
  const corsHeaders = new Headers();
  corsHeaders.set('Access-Control-Allow-Origin', origin);
  corsHeaders.set('Access-Control-Allow-Credentials', 'true');
  corsHeaders.set('Vary', 'Origin');
  return corsHeaders;
};

const createErrorResponse = (request: Request, status: number, message: string) => {
  const origin = getValidOrigin(request);
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    },
  });
};

export const onRequest = async (context: FunctionContext) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    const corsHeaders = createCorsHeaders(request);
    corsHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Request-ID');

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const apiKey = env.STOCK_API_KEY || env.STOCK_API;

  if (requiresApiKey(url.pathname) && !apiKey) {
    console.error('Missing STOCK_API_KEY for protected request', {
      path: url.pathname,
    });
    return createErrorResponse(
      request,
      500,
      'Server misconfiguration: STOCK_API_KEY is missing (STOCK_API is supported as a legacy alias).'
    );
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

  if (apiKey) {
    addApiKeyHeader(headers, apiKey);
  }

  let body: BodyInit | null | undefined = null;
  try {
    body = await cloneRequestBody(request);
  } catch (error) {
    console.error('Error cloning request body', error);
    return createErrorResponse(request, 500, 'Failed to process request body.');
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
    return createErrorResponse(request, 502, 'Upstream API request failed.');
  }

  const responseHeaders = createCorsHeaders(request);

  // Headers to exclude from the upstream response
  const excludedHeaders = new Set([
    'content-length',
    'content-encoding',
    'transfer-encoding',
  ]);

  upstreamResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (excludedHeaders.has(lower)) {
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
