# Authentication Setup Guide

## Problem
The Supabase project `axjgrfrfhqyqjmksxxld` is no longer accessible (404 error). You need to create a new Supabase project.

## Solution: Create a New Supabase Project

### Step 1: Create Supabase Account & Project
1. Go to https://supabase.com
2. Sign up for a free account if you don't have one
3. Click "New Project"
4. Fill in:
   - **Name**: Creative Studio SaaS
   - **Database Password**: (choose a strong password, save it!)
   - **Region**: Choose closest to Egypt (probably Middle East or Europe)
5. Click "Create new project"
6. Wait ~2 minutes for provisioning

### Step 2: Get Your API Credentials
1. Once the project is ready, go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 3: Update Your .env.local File

Edit `.env.local` and replace the values:

```bash
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
```

### Step 4: Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Run this SQL to create the profiles table:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  balance INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. Click "Run" to execute

### Step 5: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C if running)
npm run dev
```

### Step 6: Test Login

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. You should see the dashboard!

## Why This Is Necessary

The old Supabase project (`axjgrfrfhqyqjmksxxld`) is no longer available. The 401 errors you're seeing are because:
- The project doesn't exist anymore (404 error)
- The API keys are invalid
- Authentication requests fail

Creating a new project will give you valid credentials and a working authentication system.

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify `.env.local` has the correct credentials
3. Make sure the Supabase project is fully provisioned (not in "Setting up" state)
4. Check the Supabase dashboard logs for any errors
