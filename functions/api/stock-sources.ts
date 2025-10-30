import { errorResponse, handleOptions, jsonResponse } from '../_lib/http';
import { requireUser, type SupabaseEnv } from '../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    const { supabase } = await requireUser(request, env);

    // Fetch only active stock sources for public users
    const { data: sources, error } = await supabase
      .from('stock_sources')
      .select('key, name, cost, icon, icon_url, active')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch stock sources');
    }

    // Format the response to match the expected structure
    const sites = (sources || []).map((source: any) => ({
      key: source.key,
      name: source.name,
      cost: source.cost,
      icon: source.icon,
      iconUrl: source.icon_url || `https://nehtw.com/assets/icons/${source.key}.png`,
      active: source.active !== false,
    }));

    return jsonResponse(request, 200, { sites });
  } catch (error: any) {
    const message = error?.message || 'Unable to fetch stock sources';
    const status = /access token/i.test(message) ? 401 : 500;
    return errorResponse(request, status, message);
  }
};

