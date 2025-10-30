import { errorResponse, handleOptions, jsonResponse } from '../../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

export const onRequest = async ({ request, env, params }: { request: Request; env: EnvBindings; params: any }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'PATCH') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  const key = params.key;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!key) {
    return errorResponse(request, 400, 'Stock source key is required');
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(request, 400, 'Request body must be valid JSON');
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

    // Determine if this is a cost or active update based on URL
    if (pathname.endsWith('/cost')) {
      // Update cost
      const cost = Number(body?.cost);
      if (Number.isNaN(cost) || cost < 0) {
        return errorResponse(request, 400, 'Cost must be a non-negative number');
      }

      // Get old value for audit log
      const { data: oldData } = await supabase
        .from('stock_sources')
        .select('cost')
        .eq('key', key)
        .single();

      // Update the cost
      const { error: updateError } = await supabase
        .from('stock_sources')
        .update({ cost, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update cost');
      }

      // Log the change in audit table
      if (oldData) {
        await supabase.from('stock_source_audit').insert({
          stock_source_key: key,
          action: 'cost_update',
          old_value: String(oldData.cost),
          new_value: String(cost),
          changed_by: user.id,
          changed_at: new Date().toISOString(),
        });
      }

      return jsonResponse(request, 200, { success: true, message: 'Cost updated successfully' });
    } else if (pathname.endsWith('/active')) {
      // Update active status
      const active = body?.active;
      if (typeof active !== 'boolean') {
        return errorResponse(request, 400, 'Active must be a boolean value');
      }

      // Get old value for audit log
      const { data: oldData } = await supabase
        .from('stock_sources')
        .select('active')
        .eq('key', key)
        .single();

      // Update the active status
      const { error: updateError } = await supabase
        .from('stock_sources')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update active status');
      }

      // Log the change in audit table
      if (oldData !== null) {
        await supabase.from('stock_source_audit').insert({
          stock_source_key: key,
          action: 'status_update',
          old_value: String(oldData.active),
          new_value: String(active),
          changed_by: user.id,
          changed_at: new Date().toISOString(),
        });
      }

      return jsonResponse(request, 200, { success: true, message: 'Status updated successfully' });
    } else {
      return errorResponse(request, 404, 'Not Found');
    }
  } catch (error: any) {
    const message = error?.message || 'Unable to update stock source';
    const status = /access token/i.test(message) ? 401 : /Forbidden/i.test(message) ? 403 : 500;
    return errorResponse(request, status, message);
  }
};
