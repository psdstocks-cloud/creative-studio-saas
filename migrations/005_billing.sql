-- Migration: Introduce subscription billing tables and helpers
SET search_path = public;

-- Ensure plans table exists
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add new billing-related columns to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'one_time';

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_points integer;

-- Ensure billing interval constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plans_billing_interval_check'
      AND conrelid = 'public.plans'::regclass
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_billing_interval_check CHECK (billing_interval IN ('month', 'one_time'));
  END IF;
END;
$$;

-- Update timestamp trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach updated_at trigger to plans
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_end timestamptz,
  last_invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  plan_snapshot jsonb NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'open',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  next_payment_attempt timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_last_invoice_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_last_invoice_id_fkey
      FOREIGN KEY (last_invoice_id)
      REFERENCES public.invoices(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount_cents integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Optional transactions ledger
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Maintain updated_at on subscriptions and invoices
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS and policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users can view their own subscription
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Invoices: users can view own invoices
DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Invoice items: users can view items for their invoices
DROP POLICY IF EXISTS "Users view own invoice items" ON public.invoice_items;
CREATE POLICY "Users view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_id
        AND inv.user_id = auth.uid()
    )
  );

-- Transactions: users can view their own ledger
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- apply_paid_invoice helper
CREATE OR REPLACE FUNCTION public.apply_paid_invoice(p_invoice_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice public.invoices;
  v_subscription public.subscriptions;
  v_plan_points integer := 0;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_plan_snapshot jsonb;
BEGIN
  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  IF v_invoice.status = 'paid' THEN
    RETURN v_invoice;
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscriptions
  WHERE id = v_invoice.subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription % not found for invoice %', v_invoice.subscription_id, p_invoice_id;
  END IF;

  v_plan_snapshot := v_invoice.plan_snapshot;
  v_plan_points := COALESCE((v_plan_snapshot->>'monthly_points')::integer, 0);

  IF v_plan_points IS NULL OR v_plan_points = 0 THEN
    SELECT COALESCE(monthly_points, 0)
    INTO v_plan_points
    FROM public.plans
    WHERE id = v_subscription.plan_id;
  END IF;

  v_period_start := v_invoice.period_start;
  v_period_end := v_invoice.period_end;

  UPDATE public.invoices
     SET status = 'paid',
         next_payment_attempt = NULL,
         updated_at = now()
   WHERE id = v_invoice.id
   RETURNING * INTO v_invoice;

  IF v_plan_points > 0 THEN
    UPDATE public.profiles
       SET balance = balance + v_plan_points,
           updated_at = now()
     WHERE id = v_invoice.user_id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.user_id = v_invoice.user_id
        AND t.type = 'subscription_grant'
        AND t.metadata->>'invoice_id' = v_invoice.id::text
    ) THEN
      INSERT INTO public.transactions (user_id, amount, type, metadata)
      VALUES (
        v_invoice.user_id,
        v_plan_points,
        'subscription_grant',
        jsonb_build_object('invoice_id', v_invoice.id, 'subscription_id', v_subscription.id)
      );
    END IF;
  END IF;

  UPDATE public.subscriptions
     SET current_period_start = v_period_start,
         current_period_end = v_period_end,
         status = 'active',
         last_invoice_id = v_invoice.id,
         updated_at = now()
   WHERE id = v_subscription.id;

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_paid_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_paid_invoice(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_paid_invoice(uuid) TO authenticated;

-- Seed default monthly plans
INSERT INTO public.plans (id, name, description, price_cents, billing_interval, currency, monthly_points)
VALUES
  ('starter_m', 'Starter', 'Perfect for solo creators exploring the platform.', 900, 'month', 'usd', 9),
  ('pro_m', 'Pro', 'Expanded limits for growing teams and freelancers.', 1900, 'month', 'usd', 20),
  ('agency_m', 'Agency', 'Maximum scale for agencies managing many clients.', 4900, 'month', 'usd', 55)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  currency = EXCLUDED.currency,
  monthly_points = EXCLUDED.monthly_points,
  updated_at = now();

-- Ensure plans are marked active when seeded
UPDATE public.plans
SET active = true
WHERE id IN ('starter_m', 'pro_m', 'agency_m');

-- Refresh PostgREST cache
SELECT pg_notify('pgrst', 'reload schema');
