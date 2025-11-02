import { errorResponse, handleOptions, jsonResponse, requireCsrf } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

const ALLOWED_STATUSES = new Set(['processing', 'ready', 'failed', 'payment_failed']);

export const onRequest = async ({ request, env, params }: { request: Request; env: EnvBindings; params: { taskId: string } }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'PATCH') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  // Verify CSRF token
  const csrfCheck = requireCsrf(request);
  if (csrfCheck !== true) {
    return csrfCheck;
  }

  const taskId = params?.taskId;
  if (!taskId) {
    return errorResponse(request, 400, 'Task ID is required.');
  }

  let updates: any;
  try {
    updates = await request.json();
  } catch {
    return errorResponse(request, 400, 'Request body must be valid JSON.');
  }

  if (!updates || typeof updates !== 'object') {
    return errorResponse(request, 400, 'Request body must be an object.');
  }

  const allowedUpdates: Record<string, unknown> = {};

  if (typeof updates.status === 'string') {
    if (!ALLOWED_STATUSES.has(updates.status)) {
      return errorResponse(request, 400, 'Invalid order status.');
    }
    allowedUpdates.status = updates.status;
  }

  if (typeof updates.download_url === 'string' || updates.download_url === null) {
    allowedUpdates.download_url = updates.download_url;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return errorResponse(request, 400, 'No valid fields to update.');
  }

  try {
    const { supabase, user } = await requireUser(request, env);

    const { error } = await supabase
      .from('stock_order')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .eq('task_id', taskId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message || 'Failed to update order.');
    }

    return jsonResponse(request, 200, { success: true });
  } catch (error: any) {
    const message = error?.message || 'Unable to update order.';
    const status = /access token/i.test(message) ? 401 : 500;
    return errorResponse(request, status, message);
  }
};
