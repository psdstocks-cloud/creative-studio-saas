import { handleOptions, errorResponse } from '../../_lib/http';
import {
  requireBillingUser,
  loadPlanById,
  computePeriodRange,
  buildPlanSnapshot,
  ok,
  handleUnexpectedError,
  fetchCurrentSubscription,
  SUBSCRIPTION_SELECT,
  INVOICE_WITH_ITEMS_SELECT,
} from './_shared';
import type { BillingEnv } from './_shared';

const buildInvoiceDescription = (planName: string, startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${planName} subscription (${formatter.format(start)} - ${formatter.format(end)})`;
};

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

  const planId = typeof payload?.plan_id === 'string' ? payload.plan_id.trim() : '';

  if (!planId) {
    return errorResponse(request, 400, 'plan_id is required.');
  }

  try {
    const { supabase, user } = await requireBillingUser(request, env);

    const plan = await loadPlanById(supabase, planId);
    if (plan.billing_interval !== 'month') {
      return errorResponse(request, 400, 'Only monthly plans are supported.');
    }

    const now = new Date();
    const { period_start, period_end } = computePeriodRange(now);
    const snapshot = buildPlanSnapshot(plan);

    const existing = await fetchCurrentSubscription(supabase, user.id);

    const subscriptionMutation = existing
      ? supabase
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: period_start,
            current_period_end: period_end,
            trial_end: null,
          })
          .eq('id', existing.id)
          .select(SUBSCRIPTION_SELECT)
          .single()
      : supabase
          .from('subscriptions')
          .insert([
            {
              user_id: user.id,
              plan_id: plan.id,
              status: 'active',
              cancel_at_period_end: false,
              current_period_start: period_start,
              current_period_end: period_end,
              trial_end: null,
            },
          ])
          .select(SUBSCRIPTION_SELECT)
          .single();

    const { data: subscriptionRow, error: subscriptionError } = await subscriptionMutation;
    if (subscriptionError || !subscriptionRow) {
      throw new Error(subscriptionError?.message || 'Unable to create subscription.');
    }

    const { data: invoiceRow, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: user.id,
          subscription_id: subscriptionRow.id,
          plan_snapshot: snapshot,
          amount_cents: plan.price_cents,
          currency: plan.currency,
          status: 'open',
          period_start,
          period_end,
        },
      ])
      .select(INVOICE_WITH_ITEMS_SELECT)
      .single();

    if (invoiceError || !invoiceRow) {
      throw new Error(invoiceError?.message || 'Unable to create invoice.');
    }

    const description = buildInvoiceDescription(plan.name, period_start, period_end);

    const { error: itemError } = await supabase.from('invoice_items').insert([
      {
        invoice_id: invoiceRow.id,
        description,
        amount_cents: plan.price_cents,
      },
    ]);

    if (itemError) {
      throw new Error(itemError.message || 'Unable to create invoice item.');
    }

    const { error: applyError } = await supabase.rpc('apply_paid_invoice', {
      p_invoice_id: invoiceRow.id,
    });

    if (applyError) {
      throw new Error(applyError.message || 'Unable to finalize invoice.');
    }

    const { data: finalInvoice, error: refreshError } = await supabase
      .from('invoices')
      .select(INVOICE_WITH_ITEMS_SELECT)
      .eq('id', invoiceRow.id)
      .maybeSingle();

    if (refreshError) {
      throw new Error(refreshError.message || 'Unable to load invoice.');
    }

    const subscription = await fetchCurrentSubscription(supabase, user.id);

    return ok(request, {
      subscription,
      invoice: finalInvoice ?? invoiceRow,
    });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to start subscription.');
  }
};
