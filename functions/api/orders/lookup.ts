import { errorResponse, handleOptions, jsonResponse } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  const url = new URL(request.url);
  const site = url.searchParams.get('site');
  const id = url.searchParams.get('id');

  if (!site || !id) {
    return errorResponse(request, 400, 'Both site and id query parameters are required.');
  }

  try {
    const { supabase, user } = await requireUser(request, env);

    const { data, error } = await supabase
      .from('stock_order')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_info->>site', site)
      .eq('file_info->>id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message || 'Failed to lookup order.');
    }

    return jsonResponse(request, 200, { existing: data && data.length > 0 ? data[0] : null });
  } catch (error: any) {
    const message = error?.message || 'Unable to lookup order.';
    const status = /access token/i.test(message) ? 401 : 500;
    return errorResponse(request, status, message);
  }
};
