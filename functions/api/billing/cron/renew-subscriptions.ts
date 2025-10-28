import { handleOptions, errorResponse } from '../../../_lib/http';
import { computePeriodRange, buildPlanSnapshot, PLAN_SELECT, ok, handleUnexpectedError } from '../_shared';
import { getServiceSupabaseClient } from '../../../_lib/supabase';
import type { BillingEnv } from '../_shared';

interface CronEnv extends BillingEnv {
  BILLING_CRON_SECRET?: string;
}

const ALLOWED_STATUSES = ['active', 'trialing', 'past_due'];

const authorizeCron = (request: Request, env: CronEnv) => {
  const secret = env.BILLING_CRON_SECRET;
  if (!secret) {
    return true;
  }

  const header = request.headers.get('x-cron-secret') || request.headers.get('authorization');
  if (!header) {
    return false;
  }

  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  return token === secret;
};

const describePeriod = (startIso: string, endIso: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${formatter.format(new Date(startIso))} - ${formatter.format(new Date(endIso))}`;
};

export const onRequest = async ({ request, env }: { request: Request; env: CronEnv }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  if (!authorizeCron(request, env)) {
    return errorResponse(request, 401, 'Cron authorization failed.');
  }

  try {
    const supabase = getServiceSupabaseClient(env);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        [
          'id',
          'user_id',
          'plan_id',
          'status',
          'current_period_start',
          'current_period_end',
          'cancel_at_period_end',
          'trial_end',
          'last_invoice_id',
          `plan:plan_id(${PLAN_SELECT})`,
        ].join(',')
      )
      .lte('current_period_end', nowIso)
      .eq('cancel_at_period_end', false)
      .in('status', ALLOWED_STATUSES);

    if (error) {
      throw new Error(error.message || 'Unable to query subscriptions.');
    }

    const processed: Array<{ subscription_id: string; invoice_id: string }> = [];
    const skipped: Array<{ subscription_id: string; reason: string }> = [];

    for (const row of data ?? []) {
      const plan = (row as any).plan;
      if (!plan) {
        skipped.push({ subscription_id: row.id, reason: 'Plan missing' });
        continue;
      }

      try {
        const periodAnchor = new Date(row.current_period_end);
        const { period_start, period_end } = computePeriodRange(periodAnchor);
        const amountCents = Number(plan.price_cents);
        const snapshot = buildPlanSnapshot(plan);

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([
            {
              user_id: row.user_id,
              subscription_id: row.id,
              plan_snapshot: snapshot,
              amount_cents: amountCents,
              currency: plan.currency,
              status: 'open',
              period_start,
              period_end,
            },
          ])
          .select('id')
          .single();

        if (invoiceError || !invoice) {
          throw new Error(invoiceError?.message || 'Unable to create invoice.');
        }

        const description = `${plan.name} subscription (${describePeriod(period_start, period_end)})`;

        const { error: itemError } = await supabase.from('invoice_items').insert([
          {
            invoice_id: invoice.id,
            description,
            amount_cents: amountCents,
          },
        ]);

        if (itemError) {
          throw new Error(itemError.message || 'Unable to create invoice item.');
        }

        const { error: applyError } = await supabase.rpc('apply_paid_invoice', {
          p_invoice_id: invoice.id,
        });

        if (applyError) {
          throw new Error(applyError.message || 'Unable to finalize invoice.');
        }

        processed.push({ subscription_id: row.id, invoice_id: invoice.id });
      } catch (loopError: any) {
        skipped.push({
          subscription_id: row.id,
          reason: loopError?.message || 'Unknown error',
        });
      }
    }

    return ok(request, { processed, skipped });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to renew subscriptions.');
  }
};
