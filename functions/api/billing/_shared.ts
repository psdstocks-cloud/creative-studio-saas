import { errorResponse, jsonResponse } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';
import type { ServiceSupabaseClient } from '../../_lib/supabase';

type BillingPlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  monthly_points: number | null;
  billing_interval: 'month' | 'one_time';
  active: boolean;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  last_invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  user_id: string;
  subscription_id: string;
  plan_snapshot: Record<string, unknown>;
  amount_cents: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  next_payment_attempt: string | null;
  created_at: string;
  updated_at: string;
};

export interface BillingEnv extends SupabaseEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export const isMissingTableError = (error: unknown, table: string) => {
  const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
  return /could not find the table/i.test(message) && message.includes(`public.${table}`);
};

const missingTableMessage = (table: string) =>
  `Billing setup is incomplete. Missing required "${table}" table.`;

export const PLAN_SELECT =
  'id,name,description,price_cents,currency,monthly_points,billing_interval,active';

export const SUBSCRIPTION_SELECT =
  'id,user_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end,trial_end,last_invoice_id,created_at,updated_at';

export const INVOICE_WITH_ITEMS_SELECT =
  'id,user_id,subscription_id,plan_snapshot,amount_cents,currency,status,period_start,period_end,next_payment_attempt,created_at,updated_at,invoice_items(id,description,amount_cents)';

export const mapPlan = (row: BillingPlanRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price_cents: Number(row.price_cents),
  currency: row.currency,
  monthly_points: row.monthly_points ? Number(row.monthly_points) : 0,
  billing_interval: row.billing_interval,
  active: row.active,
});

export const mapSubscription = (
  row: SubscriptionRow,
  plan?: BillingPlanRow | null
) => ({
  ...row,
  plan: plan ? mapPlan(plan) : undefined,
});

export const mapInvoice = (row: InvoiceRow & { invoice_items?: InvoiceItemRow[] }) => ({
  ...row,
  amount_cents: Number(row.amount_cents),
  plan_snapshot: row.plan_snapshot || {},
  invoice_items: (row.invoice_items || []).map((item) => ({
    ...item,
    amount_cents: Number(item.amount_cents),
  })),
});

type InvoiceItemRow = {
  id: string;
  description: string;
  amount_cents: number;
};

export const requireBillingUser = async (
  request: Request,
  env: BillingEnv
) => {
  try {
    return await requireUser(request, env);
  } catch (error: any) {
    const message = error?.message || 'Authentication required.';
    throw errorResponse(request, /access token/i.test(message) ? 401 : 401, message);
  }
};

export const loadPlanById = async (
  supabase: ServiceSupabaseClient,
  planId: string
): Promise<BillingPlanRow> => {
  const { data, error } = await supabase
    .from('plans')
    .select(PLAN_SELECT)
    .eq('id', planId)
    .eq('billing_interval', 'month')
    .eq('active', true)
    .maybeSingle<BillingPlanRow>();

  if (error) {
    if (isMissingTableError(error, 'plans')) {
      throw new Error(missingTableMessage('plans'));
    }
    throw new Error(error.message || 'Unable to load plan.');
  }
  if (!data) {
    throw new Error('Plan not found or unavailable.');
  }
  return data;
};

export const listMonthlyPlans = async (supabase: ServiceSupabaseClient) => {
  const { data, error } = await supabase
    .from('plans')
    .select(PLAN_SELECT)
    .eq('billing_interval', 'month')
    .eq('active', true)
    .order('price_cents', { ascending: true });

  if (error) {
    if (isMissingTableError(error, 'plans')) {
      return [];
    }
    throw new Error(error.message || 'Unable to load plans.');
  }

  return (data ?? []).map(mapPlan);
};

export const fetchCurrentSubscription = async (
  supabase: ServiceSupabaseClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `${SUBSCRIPTION_SELECT}, plan:plan_id(${PLAN_SELECT}), last_invoice:last_invoice_id(id, status, period_end)`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<any>();

  if (error) {
    if (isMissingTableError(error, 'subscriptions')) {
      return null;
    }
    throw new Error(error.message || 'Unable to load subscription.');
  }

  if (!data) {
    return null;
  }

  const { plan, ...rest } = data;
  return mapSubscription(rest, plan ?? undefined);
};

export const computePeriodRange = (start: Date) => {
  const periodStart = new Date(start);
  const periodEnd = new Date(start);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  return {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
};

export const buildPlanSnapshot = (plan: BillingPlanRow) => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  price_cents: Number(plan.price_cents),
  currency: plan.currency,
  monthly_points: plan.monthly_points ? Number(plan.monthly_points) : 0,
  billing_interval: plan.billing_interval,
});

export const handleUnexpectedError = (
  request: Request,
  error: unknown,
  fallback: string
) => {
  if (error instanceof Response) {
    return error;
  }

  const message = (error as any)?.message || fallback;
  return errorResponse(request, /authentication/i.test(message) ? 401 : 500, message);
};

export const ok = (request: Request, body: unknown, status = 200) =>
  jsonResponse(request, status, body);
