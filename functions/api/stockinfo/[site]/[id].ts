import { handleOptions, jsonResponse, errorResponse } from '../../../_lib/http';
import type { StockEnv } from '../../../_lib/stock';

interface EnvBindings extends StockEnv {}

const DEFAULT_STOCK_API_BASE_URL = 'https://nehtw.com/api';

export const onRequest = async (
  { request, env, params }: { request: Request; env: EnvBindings; params: { site?: string; id?: string } }
) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    const site = params.site;
    const id = params.id;

    if (!site || !id) {
      return errorResponse(request, 400, 'Site and ID are required');
    }

    const apiKey = env.STOCK_API_KEY || (env as any).NEHTW_API_KEY;
    if (!apiKey) {
      return errorResponse(request, 500, 'Server configuration error: STOCK_API_KEY is missing');
    }

    const baseUrl = env.STOCK_API_BASE_URL || DEFAULT_STOCK_API_BASE_URL;
    const upstreamUrl = new URL(baseUrl);
    
    // Build path: /stockinfo/{site}/{id}
    const path = `/stockinfo/${encodeURIComponent(site)}/${encodeURIComponent(id)}`;
    upstreamUrl.pathname = upstreamUrl.pathname.endsWith('/') 
      ? upstreamUrl.pathname.slice(0, -1) + path 
      : upstreamUrl.pathname + path;

    // Preserve query string from request
    const requestUrl = new URL(request.url);
    requestUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    // Fetch from upstream stock API
    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return errorResponse(
        request,
        response.status >= 400 && response.status < 600 ? response.status : 502,
        `Failed to retrieve stock info: ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();

    // Copy response headers (excluding CORS which we handle)
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !['content-length', 'content-encoding', 'transfer-encoding'].includes(lowerKey) &&
        !lowerKey.startsWith('access-control-')
      ) {
        headers.set(key, value);
      }
    });

    return jsonResponse(request, response.status, data);
  } catch (error: any) {
    console.error('Stockinfo proxy error:', error);
    return errorResponse(request, 502, error?.message || 'Failed to proxy stock info request');
  }
};

