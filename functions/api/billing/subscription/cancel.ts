import { handleOptions, errorResponse } from '../../../_lib/http';
import {
  requireBillingUser,
  fetchCurrentSubscription,
  ok,
  handleUnexpectedError,
  SUBSCRIPTION_SELECT,
} from '../_shared';
import type { BillingEnv } from '../_shared';

export const onRequest = async ({ request, env }: { request: Request; env: BillingEnv }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(request, 400, 'Request body must be valid JSON.');
  }

  if (typeof payload?.cancel_at_period_end !== 'boolean') {
    return errorResponse(request, 400, 'cancel_at_period_end must be a boolean.');
  }

  const cancelAtPeriodEnd = payload.cancel_at_period_end as boolean;

  try {
    const { supabase, user } = await requireBillingUser(request, env);
    const current = await fetchCurrentSubscription(supabase, user.id);

    if (!current) {
      return errorResponse(request, 404, 'No active subscription to update.');
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: cancelAtPeriodEnd })
      .eq('id', current.id)
      .select(SUBSCRIPTION_SELECT)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Unable to update subscription.');
    }

    const subscription = await fetchCurrentSubscription(supabase, user.id);
    return ok(request, { subscription });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to update subscription.');
  }
};
