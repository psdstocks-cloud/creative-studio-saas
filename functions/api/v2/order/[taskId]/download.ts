import { handleOptions, jsonResponse, errorResponse } from '../../../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../../../_lib/supabase';
import type { StockEnv } from '../../../../_lib/stock';

interface EnvBindings extends SupabaseEnv, StockEnv {}

const DEFAULT_STOCK_API_BASE_URL = 'https://nehtw.com/api';

export const onRequest = async (
  { request, env, params }: { request: Request; env: EnvBindings; params: { taskId?: string } }
) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    // Require authentication
    const { user } = await requireUser(request, env);

    const taskId = params.taskId;

    if (!taskId) {
      return errorResponse(request, 400, 'Task ID is required');
    }

    const apiKey = env.STOCK_API_KEY || (env as any).NEHTW_API_KEY;
    if (!apiKey) {
      return errorResponse(request, 500, 'Server configuration error: STOCK_API_KEY is missing');
    }

    const baseUrl = env.STOCK_API_BASE_URL || DEFAULT_STOCK_API_BASE_URL;
    const upstreamUrl = new URL(baseUrl);
    
    // Build path: /v2/order/{taskId}/download
    const path = `/v2/order/${encodeURIComponent(taskId)}/download`;
    upstreamUrl.pathname = upstreamUrl.pathname.endsWith('/') 
      ? upstreamUrl.pathname.slice(0, -1) + path 
      : upstreamUrl.pathname + path;

    // Preserve query string from request
    const requestUrl = new URL(request.url);
    requestUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    // Build headers for upstream API
    const upstreamHeaders: Record<string, string> = {
      'X-Api-Key': apiKey,
    };

    // Add user info for audit trail
    if (user) {
      upstreamHeaders['X-Actor-Id'] = user.id;
      upstreamHeaders['X-Actor-Email'] = user.email || '';
      upstreamHeaders['X-Actor-Roles'] = (user.roles || []).join(',');
    }

    // Fetch from upstream stock API
    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: upstreamHeaders,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return errorResponse(
        request,
        response.status >= 400 && response.status < 600 ? response.status : 502,
        `Failed to generate download link: ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();

    // Return JSON response
    return jsonResponse(request, response.status, data);
  } catch (error: any) {
    const message = error?.message || 'Failed to generate download link';
    const status = /access token/i.test(message) ? 401 : 502;
    console.error('Download link proxy error:', error);
    return errorResponse(request, status, message);
  }
};

