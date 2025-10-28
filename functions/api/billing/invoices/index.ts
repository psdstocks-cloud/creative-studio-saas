import { handleOptions, errorResponse } from '../../../_lib/http';
import {
  requireBillingUser,
  ok,
  handleUnexpectedError,
  INVOICE_WITH_ITEMS_SELECT,
  mapInvoice,
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
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_WITH_ITEMS_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load invoices.');
    }

    const invoices = (data ?? []).map(mapInvoice);
    return ok(request, { invoices });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to load invoices.');
  }
};
