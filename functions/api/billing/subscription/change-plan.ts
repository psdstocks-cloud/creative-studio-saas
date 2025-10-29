import { handleOptions, errorResponse } from '../../../_lib/http';
import {
  requireBillingUser,
  fetchCurrentSubscription,
  loadPlanById,
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

  const newPlanId = typeof payload?.new_plan_id === 'string' ? payload.new_plan_id.trim() : '';

  if (!newPlanId) {
    return errorResponse(request, 400, 'new_plan_id is required.');
  }

  try {
    const { supabase, user } = await requireBillingUser(request, env);
    const plan = await loadPlanById(supabase, newPlanId);

    if (plan.billing_interval !== 'month') {
      return errorResponse(request, 400, 'Only monthly plans are supported.');
    }

    const current = await fetchCurrentSubscription(supabase, user.id);

    if (!current) {
      return errorResponse(request, 404, 'No active subscription to update.');
    }

    if (current.plan_id === plan.id) {
      const subscription = await fetchCurrentSubscription(supabase, user.id);
      return ok(request, { subscription });
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_id: plan.id })
      .eq('id', current.id)
      .select(SUBSCRIPTION_SELECT)
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to change plan.');
    }

    const subscription = await fetchCurrentSubscription(supabase, user.id);
    return ok(request, { subscription });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to change subscription plan.');
  }
};
