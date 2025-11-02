import { errorResponse, handleOptions, jsonResponse, requireCsrf } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {}

type ProfileResponse = {
  id: string;
  balance: number;
};

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  // Verify CSRF token
  const csrfCheck = requireCsrf(request);
  if (csrfCheck !== true) {
    return csrfCheck;
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(request, 400, 'Request body must be valid JSON.');
  }

  const amount = Number(body?.amount);
  if (Number.isNaN(amount)) {
    return errorResponse(request, 400, 'Amount must be a number.');
  }
  if (amount < 0) {
    return errorResponse(request, 400, 'Amount must be non-negative.');
  }

  try {
    const { supabase, user } = await requireUser(request, env);

    if (amount === 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to load balance.');
      }

      return jsonResponse(request, 200, { balance: Number(data.balance) });
    }

    const { data, error } = await supabase.rpc<ProfileResponse>('secure_deduct_balance', {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (error) {
      const message = error.message || 'Failed to deduct balance.';
      if (/insufficient balance/i.test(message)) {
        return errorResponse(request, 402, 'Insufficient balance.');
      }
      throw new Error(message);
    }

    if (!data) {
      throw new Error('Balance deduction returned no result.');
    }

    return jsonResponse(request, 200, { balance: Number(data.balance) });
  } catch (error: any) {
    const message = error?.message || 'Unable to deduct balance.';
    const status = /access token/i.test(message) ? 401 : 500;
    return errorResponse(request, status, message);
  }
};
