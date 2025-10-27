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

