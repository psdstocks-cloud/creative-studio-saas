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
