-- ============================================
-- Supabase Database Setup for Creative Studio SaaS
-- ============================================
-- Copy this entire file and run it in Supabase SQL Editor

-- Step 1: Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  balance INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy to allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Step 4: Create policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Step 4b: Ensure balances never become negative
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_balance_non_negative,
  ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);

-- Step 5: Secure function for deducting points that enforces non-negative amounts
CREATE OR REPLACE FUNCTION public.deduct_points(amount_to_deduct numeric)
RETURNS profiles AS $$
DECLARE
  updated_profile profiles;
BEGIN
  IF amount_to_deduct IS NULL OR amount_to_deduct < 0 THEN
    RAISE EXCEPTION 'Amount to deduct must be non-negative';
  END IF;

  UPDATE profiles
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Server-side helpers for order placement (used by the backend only)
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
    p_user_id uuid,
    p_task_id text,
    p_amount numeric,
    p_file_info jsonb,
    p_status text DEFAULT 'processing'
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

-- Force a schema cache refresh so the RPC endpoint becomes available immediately.
SELECT pg_notify('pgrst', 'reload schema');

-- Step 6: Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, balance)
  VALUES (NEW.id, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Done! Your database is now set up.
-- ============================================
