import { jsonResponse, errorResponse, handleOptions } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';
import { fetchStockMetadata, normalizeStockInfo, parseAndValidateSourceUrl, type StockEnv } from '../../_lib/stock';

interface EnvBindings extends SupabaseEnv, StockEnv {}

type RpcOrderResponse = {
  id: string;
  user_id: string;
  task_id: string;
  file_info: Record<string, unknown>;
  status: string;
  download_url: string | null;
  created_at: string;
  updated_at?: string;
};

const httpError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
};

const handleFailure = (request: Request, error: any, fallbackMessage: string) => {
  const message = error?.message || fallbackMessage;
  const status = typeof error?.status === 'number' ? error.status : (/access token/i.test(message) ? 401 : 500);
  return errorResponse(request, status, message);
};

const handleGet = async (request: Request, env: EnvBindings) => {
  try {
    const { supabase, user } = await requireUser(request, env);

    const { data, error } = await supabase
      .from('stock_order')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw httpError(500, error.message || 'Failed to load orders.');
    }

    return jsonResponse(request, 200, { orders: data ?? [] });
  } catch (error: any) {
    return handleFailure(request, error, 'Unable to load orders.');
  }
};

const handlePost = async (request: Request, env: EnvBindings) => {
  try {
    const { supabase, user } = await requireUser(request, env);

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      throw httpError(400, 'Request body must be valid JSON.');
    }

    const { taskId, site, stockId, sourceUrl } = payload ?? {};

    if (!taskId || typeof taskId !== 'string') {
      throw httpError(400, 'taskId is required.');
    }
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      throw httpError(400, 'sourceUrl is required.');
    }

    const parsed = parseAndValidateSourceUrl(sourceUrl);
    const resolvedSite = typeof site === 'string' ? site : parsed.site;
    const resolvedId = typeof stockId === 'string' ? stockId : parsed.id;

    if (parsed.site !== resolvedSite || parsed.id !== resolvedId) {
      throw httpError(400, 'The provided site/id does not match the source URL.');
    }

    const existingOrder = await supabase
      .from('stock_order')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('file_info->>site', resolvedSite)
      .eq('file_info->>id', resolvedId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrder.error) {
      throw httpError(500, existingOrder.error.message || 'Failed to check previous orders.');
    }

    const metadata = await fetchStockMetadata(env, resolvedSite, resolvedId);
    const normalized = normalizeStockInfo(metadata, resolvedSite, resolvedId, parsed.normalizedUrl);

    const isReDownload = existingOrder.data?.status === 'ready';
    const amountToDeduct = isReDownload ? 0 : normalized.cost;

    if (amountToDeduct < 0) {
      throw httpError(400, 'Calculated price was negative.');
    }

    const { data: orderData, error: orderError } = await supabase.rpc<RpcOrderResponse>('secure_create_stock_order', {
      p_user_id: user.id,
      p_task_id: taskId,
      p_amount: amountToDeduct,
      p_file_info: normalized,
      p_status: 'processing',
    });

    if (orderError) {
      const message = orderError.message || 'Failed to create order.';
      if (/insufficient balance/i.test(message)) {
        throw httpError(402, 'Insufficient balance to complete this purchase.');
      }
      throw httpError(500, message);
    }

    if (!orderData) {
      throw httpError(500, 'Order creation returned an empty result.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw httpError(500, profileError?.message || 'Could not load updated balance.');
    }

    return jsonResponse(request, 200, {
      order: orderData,
      balance: Number(profile.balance),
      reDownload: isReDownload,
    });
  } catch (error: any) {
    return handleFailure(request, error, 'Unable to create order.');
  }
};

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method === 'GET') {
    return handleGet(request, env);
  }

  if (request.method === 'POST') {
    return handlePost(request, env);
  }

  return errorResponse(request, 405, 'Method Not Allowed');
};
