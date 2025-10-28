import { handleOptions, errorResponse } from '../../_lib/http';
import { requireBillingUser, listMonthlyPlans, ok, handleUnexpectedError } from './_shared';
import type { BillingEnv } from './_shared';

export const onRequest = async ({ request, env }: { request: Request; env: BillingEnv }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  try {
    const { supabase } = await requireBillingUser(request, env);
    const interval = new URL(request.url).searchParams.get('interval') || 'month';

    if (interval !== 'month') {
      return ok(request, { plans: [] });
    }

    const plans = await listMonthlyPlans(supabase);
    return ok(request, { plans });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to load plans.');
  }
};
