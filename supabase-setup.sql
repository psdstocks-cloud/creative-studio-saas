-- ============================================
-- CREATIVE STUDIO SAAS - DATABASE SETUP
-- Run this in your NEW Supabase SQL Editor
-- ============================================

SET search_path = public;

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  balance    INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create stock_order table
CREATE TABLE IF NOT EXISTS public.stock_order (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id      TEXT UNIQUE NOT NULL,
  file_info    JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'processing',
  download_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_stock_order_user_id ON public.stock_order(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_task_id ON public.stock_order(task_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_status  ON public.stock_order(status);

-- 4. Enable RLS
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_order ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile"  ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 6. RLS Policies for stock_order
DROP POLICY IF EXISTS "Users can view own orders"  ON public.stock_order;
CREATE POLICY "Users can view own orders"
  ON public.stock_order FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.stock_order;
CREATE POLICY "Users can create own orders"
  ON public.stock_order FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.stock_order;
CREATE POLICY "Users can update own orders"
  ON public.stock_order FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, balance)
  VALUES (NEW.id, NEW.email, 100);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. updated_at helper & triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_stock_order_updated_at ON public.stock_order;
CREATE TRIGGER update_stock_order_updated_at
  BEFORE UPDATE ON public.stock_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 11. Billing tables

CREATE TABLE IF NOT EXISTS public.plans (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  currency   TEXT NOT NULL DEFAULT 'usd',
  monthly_points INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

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

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount_cents integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

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

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans are readable" ON public.plans;
CREATE POLICY "Plans are readable"
  ON public.plans FOR SELECT
  USING (active);

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

INSERT INTO public.plans (id, name, description, price_cents, billing_interval, currency, monthly_points, active)
VALUES
  ('starter_m', 'Starter', 'Perfect for solo creators exploring the platform.', 900, 'month', 'usd', 9, TRUE),
  ('pro_m', 'Pro', 'Expanded limits for growing teams and freelancers.', 1900, 'month', 'usd', 20, TRUE),
  ('agency_m', 'Agency', 'Maximum scale for agencies managing many clients.', 4900, 'month', 'usd', 55, TRUE)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  currency = EXCLUDED.currency,
  monthly_points = EXCLUDED.monthly_points,
  active = TRUE;

-- 9. Secure helpers (server-only)
CREATE OR REPLACE FUNCTION public.secure_deduct_balance(p_user_id uuid, p_amount numeric)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount to deduct must be non-negative';
  END IF;

  UPDATE public.profiles
     SET balance = balance - p_amount,
         updated_at = NOW()
   WHERE id = p_user_id
     AND balance >= p_amount
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or profile missing';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.secure_deduct_balance(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_deduct_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_deduct_balance(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.secure_create_stock_order(
  p_user_id   uuid,
  p_task_id   text,
  p_amount    numeric,
  p_file_info jsonb,
  p_status    text DEFAULT 'processing'
)
RETURNS public.stock_order
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_order public.stock_order;
  normalized_status text := COALESCE(NULLIF(p_status, ''), 'processing');
BEGIN
  IF p_task_id IS NULL OR LENGTH(TRIM(p_task_id)) = 0 THEN
    RAISE EXCEPTION 'Task id is required';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be non-negative';
  END IF;

  IF EXISTS (SELECT 1 FROM public.stock_order WHERE task_id = p_task_id) THEN
    RAISE EXCEPTION 'Order with this task id already exists';
  END IF;

  IF p_amount > 0 THEN
    PERFORM public.secure_deduct_balance(p_user_id, p_amount);
  ELSE
    PERFORM 1 FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
  END IF;

  INSERT INTO public.stock_order (user_id, task_id, file_info, status)
  VALUES (p_user_id, p_task_id, p_file_info, normalized_status)
  RETURNING * INTO created_order;

  RETURN created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO authenticated;

-- 10. Ensure PostgREST picks up functions immediately
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- SETUP COMPLETE!
-- ============================================