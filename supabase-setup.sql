-- ============================================
-- CREATIVE STUDIO SAAS - DATABASE SETUP
-- Run this in your NEW Supabase SQL Editor
-- Project: gvipnadjxnjznjzvxqvg
-- ============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    balance INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create stock_order table
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_order ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for profiles table

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- 6. Create RLS Policies for stock_order table

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
    ON public.stock_order
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
    ON public.stock_order
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update own orders"
    ON public.stock_order
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. Create trigger function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, balance)
    VALUES (NEW.id, NEW.email, 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_stock_order_updated_at
    BEFORE UPDATE ON public.stock_order
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- 11. Secure helpers for server-side balance and order handling
CREATE OR REPLACE FUNCTION public.secure_deduct_balance(p_user_id uuid, p_amount numeric)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile profiles;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount to deduct must be non-negative';
  END IF;

  UPDATE profiles
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
    p_user_id uuid,
    p_task_id text,
    p_amount numeric,
    p_file_info jsonb,
    p_status text DEFAULT 'processing'
)
RETURNS stock_order
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_order stock_order;
  normalized_status text := COALESCE(NULLIF(p_status, ''), 'processing');
BEGIN
  IF p_task_id IS NULL OR LENGTH(TRIM(p_task_id)) = 0 THEN
    RAISE EXCEPTION 'Task id is required';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be non-negative';
  END IF;

  IF EXISTS (SELECT 1 FROM stock_order WHERE task_id = p_task_id) THEN
    RAISE EXCEPTION 'Order with this task id already exists';
  END IF;

  IF p_amount > 0 THEN
    PERFORM secure_deduct_balance(p_user_id, p_amount);
  ELSE
    PERFORM 1 FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
  END IF;

  INSERT INTO stock_order (user_id, task_id, file_info, status)
  VALUES (p_user_id, p_task_id, p_file_info, normalized_status)
  RETURNING * INTO created_order;

  RETURN created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO authenticated;

-- Make sure the PostgREST schema cache picks up the newly created functions.
NOTIFY pgrst, 'reload schema';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database is now ready to use!
-- 
-- What was created:
-- ✅ profiles table (stores user data + balance)
-- ✅ stock_order table (stores file orders)
-- ✅ RLS policies (security rules)
-- ✅ Auto-create profile trigger (when users sign up)
-- ✅ Auto-update timestamp triggers
--
-- Next steps:
-- 1. Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/editor
-- 2. Click "SQL Editor" in left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file
-- 5. Click "Run" button
-- 6. You should see "Success. No rows returned"
-- ============================================

