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

