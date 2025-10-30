import { errorResponse, handleOptions, jsonResponse } from '../../../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    const { supabase, user } = await requireUser(request, env);

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!profile?.roles?.includes('admin')) {
      return errorResponse(request, 403, 'Forbidden: Admin access required');
    }

    // Parse query parameters
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    // Build query
    let query = supabase
      .from('stock_source_audit')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    // Filter by key if provided
    if (key) {
      query = query.eq('stock_source_key', key);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch audit logs');
    }

    return jsonResponse(request, 200, { logs: logs || [] });
  } catch (error: any) {
    const message = error?.message || 'Unable to fetch audit logs';
    const status = /access token/i.test(message) ? 401 : /Forbidden/i.test(message) ? 403 : 500;
    return errorResponse(request, status, message);
  }
};