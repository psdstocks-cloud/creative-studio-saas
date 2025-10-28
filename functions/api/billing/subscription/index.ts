import { handleOptions, errorResponse } from '../../../_lib/http';
import {
  requireBillingUser,
  fetchCurrentSubscription,
  ok,
  handleUnexpectedError,
} from '../_shared';
import type { BillingEnv } from '../_shared';

export const onRequest = async ({ request, env }: { request: Request; env: BillingEnv }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    const { supabase, user } = await requireBillingUser(request, env);
    const subscription = await fetchCurrentSubscription(supabase, user.id);
    return ok(request, { subscription });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to load subscription.');
  }
};
