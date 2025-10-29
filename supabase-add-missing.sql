-- ============================================
-- ADD MISSING COMPONENTS TO EXISTING DATABASE
-- Only adds what's missing, won't break existing setup
-- ============================================

-- 1. Add email column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Create stock_order table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stock_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id TEXT UNIQUE NOT NULL,
    file_info JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_order_user_id ON public.stock_order(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_task_id ON public.stock_order(task_id);
CREATE INDEX IF NOT EXISTS idx_stock_order_status ON public.stock_order(status);

-- 4. Enable Row Level Security if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_order ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for stock_order (if they don't exist)

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own orders" ON public.stock_order;
DROP POLICY IF EXISTS "Users can create own orders" ON public.stock_order;
DROP POLICY IF EXISTS "Users can update own orders" ON public.stock_order;

-- Create fresh policies
CREATE POLICY "Users can view own orders"
    ON public.stock_order
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
    ON public.stock_order
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
    ON public.stock_order
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. Create trigger function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, balance)
    VALUES (NEW.id, NEW.email, 100)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers to auto-update updated_at (if they don't exist)
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

-- 10. Billing tables and policies

-- Plans catalog
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    billing_interval TEXT NOT NULL DEFAULT 'month',
    currency TEXT NOT NULL DEFAULT 'usd',
    monthly_points INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plans
    ALTER COLUMN billing_interval SET DEFAULT 'month';

ALTER TABLE public.plans
    ALTER COLUMN currency SET DEFAULT 'usd';

ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS monthly_points INTEGER;

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

-- Subscriptions record the active customer plan
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    last_invoice_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Invoices mirror payments for subscriptions
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    plan_snapshot JSONB NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'open',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    next_payment_attempt TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Optional transactions ledger for auditing
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Enable RLS and policies for billing tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans are readable" ON public.plans;
CREATE POLICY "Plans are readable"
    ON public.plans
    FOR SELECT
    USING (active);

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create subscriptions" ON public.subscriptions;
CREATE POLICY "Users create subscriptions"
    ON public.subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update subscriptions" ON public.subscriptions;
CREATE POLICY "Users update subscriptions"
    ON public.subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
    ON public.invoices
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;
CREATE POLICY "Users create invoices"
    ON public.invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update invoices" ON public.invoices;
CREATE POLICY "Users update invoices"
    ON public.invoices
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own invoice items" ON public.invoice_items;
CREATE POLICY "Users view own invoice items"
    ON public.invoice_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.invoices inv
            WHERE inv.id = invoice_id
              AND inv.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users create invoice items" ON public.invoice_items;
CREATE POLICY "Users create invoice items"
    ON public.invoice_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.invoices inv
            WHERE inv.id = invoice_id
              AND inv.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Seed default monthly plans if they are missing
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
-- SETUP COMPLETE! 
-- ============================================
-- ✅ Added email column to profiles (if missing)
-- ✅ Created stock_order table (if missing)
-- ✅ Set up RLS policies
-- ✅ Created auto-create profile trigger
-- ✅ Created auto-update timestamp triggers
--
-- Safe to run multiple times!
-- ============================================

