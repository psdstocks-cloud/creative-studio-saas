-- ============================================
-- Supabase Database Setup for Creative Studio SaaS
-- ============================================
-- Copy this entire file and run it in Supabase SQL Editor

SET search_path = public;

-- Step 1: Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  balance    INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock orders (needed by functions below)
CREATE TABLE IF NOT EXISTS public.stock_order (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     TEXT UNIQUE NOT NULL,
  file_info   JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'processing',
  download_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_stock_order_user_id ON public.stock_order(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_task_id ON public.stock_order(task_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_status  ON public.stock_order(status);

-- Step 2: Enable Row Level Security
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_order ENABLE ROW LEVEL SECURITY;

-- Step 3: Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile"  ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Step 4: Policies for stock_order
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

-- Step 4b: Ensure balances never become negative
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_balance_non_negative,
  ADD  CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);

-- Step 5: Client RPC for deducting points (defense-in-depth)
CREATE OR REPLACE FUNCTION public.deduct_points(amount_to_deduct numeric)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF amount_to_deduct IS NULL OR amount_to_deduct < 0 THEN
    RAISE EXCEPTION 'Amount to deduct must be non-negative';
  END IF;

  UPDATE public.profiles
     SET balance = balance - amount_to_deduct,
         updated_at = NOW()
   WHERE id = auth.uid()
     AND balance >= amount_to_deduct
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or profile missing';
  END IF;

  RETURN updated_profile;
END;
$$;

-- Step 6: Server-side helpers for order placement (used by backend only)
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

-- Step 6b: Refresh PostgREST schema cache so RPCs are visible immediately
SELECT pg_notify('pgrst', 'reload schema');

-- Step 7: Auto-create profile on user signup
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

-- Step 8: Billing tables, RLS, and seed data

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
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users create subscriptions" ON public.subscriptions;
CREATE POLICY "Users create subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users update subscriptions" ON public.subscriptions;
CREATE POLICY "Users update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;
CREATE POLICY "Users create invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users update invoices" ON public.invoices;
CREATE POLICY "Users update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users view own invoice items" ON public.invoice_items;
CREATE POLICY "Users view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_id
        AND inv.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create invoice items" ON public.invoice_items;
CREATE POLICY "Users create invoice items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'service_role' OR
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

-- ============================================
-- STOCK SOURCES (for admin panel management)
-- ============================================

-- Create stock_sources table
CREATE TABLE IF NOT EXISTS public.stock_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  cost          DECIMAL(10, 2),
  icon          TEXT,
  icon_url      TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_sources_key ON public.stock_sources(key);
CREATE INDEX IF NOT EXISTS idx_stock_sources_active ON public.stock_sources(active);

ALTER TABLE public.stock_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active stock sources" ON public.stock_sources;
CREATE POLICY "Anyone can view active stock sources"
  ON public.stock_sources FOR SELECT USING (true);

-- Create audit log table for stock source changes
CREATE TABLE IF NOT EXISTS public.stock_source_audit (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_source_key   TEXT NOT NULL,
  action             TEXT NOT NULL,
  old_value          TEXT,
  new_value          TEXT,
  changed_by         UUID REFERENCES auth.users(id),
  changed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_source_audit_key ON public.stock_source_audit(stock_source_key);
CREATE INDEX IF NOT EXISTS idx_stock_source_audit_changed_at ON public.stock_source_audit(changed_at DESC);

ALTER TABLE public.stock_source_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.stock_source_audit;
CREATE POLICY "Authenticated users can view audit logs"
  ON public.stock_source_audit FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed initial stock sources data
INSERT INTO public.stock_sources (key, name, cost, icon, icon_url, active) VALUES
  ('adobestock', 'adobestock', 0.40, 'adobestock.png', 'https://nehtw.com/assets/icons/adobestock.png', true),
  ('pixelbuddha', 'pixelbuddha', 0.60, 'pixelbuddha.png', 'https://nehtw.com/assets/icons/pixelbuddha.png', true),
  ('iconscout', 'iconscout', 0.20, 'iconscout.png', 'https://nehtw.com/assets/icons/iconscout.png', true),
  ('mockupcloud', 'mockupcloud', 1.00, 'mockupcloud.png', 'https://nehtw.com/assets/icons/mockupcloud.png', true),
  ('ui8', 'ui8', 3.00, 'ui8.png', 'https://nehtw.com/assets/icons/ui8.png', true),
  ('pixeden', 'pixeden', 0.60, 'pixeden.png', 'https://nehtw.com/assets/icons/pixeden.png', true),
  ('creativefabrica', 'creativefabrica', 0.50, 'creativefabrica.png', 'https://nehtw.com/assets/icons/creativefabrica.png', true),
  ('envato', 'envato', 0.50, 'envato.png', 'https://nehtw.com/assets/icons/envato.png', true),
  ('vectorstock', 'vectorstock', 1.00, 'vectorstock.png', 'https://nehtw.com/assets/icons/vectorstock.png', true),
  ('vshutter4k', 'SS video 4K', 17.00, 'vshutter4k.png', 'https://nehtw.com/assets/icons/vshutter4k.png', true),
  ('vshutter', 'SS video HD', 8.00, 'vshutter.png', 'https://nehtw.com/assets/icons/vshutter.png', true),
  ('dreamstime', 'dreamstime', 0.65, 'dreamstime.png', 'https://nehtw.com/assets/icons/dreamstime.png', true),
  ('istockphoto_video_fullhd', 'istock video hd', 25.00, 'istockphoto_video_fullhd.png', 'https://nehtw.com/assets/icons/istockphoto_video_fullhd.png', true),
  ('designi', 'designi', 0.80, 'designi.png', 'https://nehtw.com/assets/icons/designi.png', true),
  ('istockphoto', 'istockphoto', 0.80, 'istockphoto.png', 'https://nehtw.com/assets/icons/istockphoto.png', true),
  ('storyblocks', 'storyblocks', 1.00, 'storyblocks.png', 'https://nehtw.com/assets/icons/storyblocks.png', true),
  ('123rf', '123rf', 0.65, '123rf.png', 'https://nehtw.com/assets/icons/123rf.png', true),
  ('vecteezy', 'vecteezy', 0.30, 'vecteezy.png', 'https://nehtw.com/assets/icons/vecteezy.png', true),
  ('rawpixel', 'rawpixel', 0.30, 'rawpixel.png', 'https://nehtw.com/assets/icons/rawpixel.png', true),
  ('uihut', 'uihut', NULL, 'uihut.png', 'https://nehtw.com/assets/icons/uihut.png', false),
  ('vfreepik', 'Freepik video', 1.00, 'vfreepik.png', 'https://nehtw.com/assets/icons/vfreepik.png', true),
  ('mshutter', 'SS music', 1.00, 'mshutter.png', 'https://nehtw.com/assets/icons/mshutter.png', true),
  ('freepik', 'freepik', 0.20, 'freepik.png', 'https://nehtw.com/assets/icons/freepik.png', true),
  ('adobestock_v4k', 'Adobestock video', 4.50, 'adobestock_v4k.png', 'https://nehtw.com/assets/icons/adobestock_v4k.png', true),
  ('flaticon', 'flaticon', 0.20, 'flaticon.png', 'https://nehtw.com/assets/icons/flaticon.png', true),
  ('craftwork', 'craftwork', 2.00, 'craftwork.png', 'https://nehtw.com/assets/icons/craftwork.png', true),
  ('alamy', 'alamy', 16.00, 'alamy.png', 'https://nehtw.com/assets/icons/alamy.png', true),
  ('motionarray', 'motionarray', 0.25, 'motionarray.png', 'https://nehtw.com/assets/icons/motionarray.png', true),
  ('soundstripe', 'soundstripe', 0.30, 'soundstripe.png', 'https://nehtw.com/assets/icons/soundstripe.png', true),
  ('yellowimages', 'yellowimages', 12.00, 'yellowimages.png', 'https://nehtw.com/assets/icons/yellowimages.png', true),
  ('shutterstock', 'shutterstock', 0.50, 'shutterstock.png', 'https://nehtw.com/assets/icons/shutterstock.png', true),
  ('depositphotos', 'depositphotos', 0.60, 'depositphotos.png', 'https://nehtw.com/assets/icons/depositphotos.png', true),
  ('artlist_sound', 'artlist music/sfx', 0.40, 'artlist_sound.png', 'https://nehtw.com/assets/icons/artlist_sound.png', true),
  ('epidemicsound', 'epidemicsound', 0.30, 'epidemicsound.png', 'https://nehtw.com/assets/icons/epidemicsound.png', true),
  ('artgrid_hd', 'artgrid_HD', 0.80, 'artgrid_HD.png', 'https://nehtw.com/assets/icons/artgrid_HD.png', true),
  ('motionelements', 'motionelements', 0.50, 'motionelements.png', 'https://nehtw.com/assets/icons/motionelements.png', true),
  ('deeezy', 'deeezy', 0.50, 'deeezy.png', 'https://nehtw.com/assets/icons/deeezy.png', true),
  ('artlist_footage', 'artlist video/template', 1.00, 'artlist_footage.png', 'https://nehtw.com/assets/icons/artlist_footage.png', true),
  ('pixelsquid', 'pixelsquid', 0.80, 'pixelsquid.png', 'https://nehtw.com/assets/icons/pixelsquid.png', true),
  ('footagecrate', 'footagecrate', 1.00, 'footagecrate.png', 'https://nehtw.com/assets/icons/footagecrate.png', true)
ON CONFLICT (key) DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS stock_sources_updated_at_trigger ON public.stock_sources;
CREATE TRIGGER stock_sources_updated_at_trigger
  BEFORE UPDATE ON public.stock_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_sources_updated_at();

-- ============================================
-- Done! Your database is now set up.
-- ============================================