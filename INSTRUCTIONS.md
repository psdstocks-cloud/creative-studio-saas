# Fix for 401 Unauthorized Error

## The Problem
Your Supabase API key is invalid or expired, causing the 401 error when trying to authenticate.

## The Solution

### Step 1: Get Valid Supabase Credentials

1. Go to your Supabase dashboard:
   - URL: https://supabase.com/dashboard/project/axjgrfrfhqyqjmksxxld/settings/api
   - Or if that doesn't work, go to https://supabase.com/dashboard and select your project

2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (found in the "Project API keys" section)

### Step 2: Update Your .env.local File

Edit `.env.local` and replace the placeholder with your actual credentials:

```bash
VITE_SUPABASE_URL=https://axjgrfrfhqyqjmksxxld.supabase.co
VITE_SUPABASE_ANON_KEY=<paste-your-actual-anon-key-here>
```

### Step 3: Restart Your Development Server

Stop your current server (Ctrl+C) and restart it:

```bash
npm run dev
```

The app will now use your valid Supabase credentials and the authentication should work!

## Alternative: Create a New Supabase Project

If you don't have access to the existing project:

1. Go to https://supabase.com
2. Create a new project
3. Wait for it to be fully provisioned (~2 minutes)
4. Go to Settings → API
5. Copy the URL and anon key
6. Update your `.env.local` file
7. Restart your dev server

## Files Modified

- ✅ `config.ts` - Now supports environment variables
- ✅ `.gitignore` - Now excludes .env files
- ✅ `.env.local` - Created for your local credentials
