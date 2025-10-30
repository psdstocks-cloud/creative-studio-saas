import { errorResponse, handleOptions, jsonResponse } from '../../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    // Authenticate user
    const { supabase, user } = await requireUser(request, env);

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return errorResponse(request, 500, `Profile error: ${profileError.message}`);
    }

    if (!profile?.roles?.includes('admin')) {
      return errorResponse(request, 403, 'Admin access required');
    }

    // Fetch stock sources
    const { data: sources, error: sourcesError } = await supabase
      .from('stock_sources')
      .select('*')
      .order('cost', { ascending: true })
      .order('name', { ascending: true });

    if (sourcesError) {
      return errorResponse(request, 500, `Database error: ${sourcesError.message}`);
    }

    if (!sources) {
      return jsonResponse(request, 200, { sites: [] });
    }

    // Format response
    const sites = sources.map((source: any) => ({
      key: source.key,
      name: source.name,
      cost: source.cost,
      active: source.active,
      icon: source.icon,
      iconUrl: source.icon_url,
    }));

    return jsonResponse(request, 200, { sites });
    
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    const status = message.includes('token') ? 401 : 500;
    return errorResponse(request, status, message);
  }
};