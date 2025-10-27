# 🔴 CRITICAL: Update Your Supabase Anon Key

## The Problem
Your `.env.local` has:
- ✅ Correct URL: `https://gvipnadjxnjznjzvxqvg.supabase.co`
- ❌ Wrong anon key: from the OLD project (axjgrfrfhqyqjmksxxld)

## Quick Fix (2 minutes)

### Step 1: Get Your Anon Key
1. Open: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/settings/api
2. Find "Project API keys" section
3. Copy the **anon** / **public** key (the long string starting with `eyJ...`)

### Step 2: Update .env.local
Open `.env.local` and replace `PASTE_YOUR_ANON_KEY_HERE` with your actual key:

```bash
VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-actual-key-here...
```

### Step 3: Restart Dev Server
```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

### Step 4: Set Up Database (if not done yet)
1. Go to SQL Editor in Supabase dashboard
2. Copy and paste contents of `database-setup.sql`
3. Click RUN

### Step 5: Test
1. Open http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. You should see the dashboard! ✅

## Why This Matters
The URL and anon key MUST be from the SAME Supabase project. Right now they're mismatched, which is why login isn't working.

## Need Help?
If you see errors, check:
- Browser console (F12)
- Supabase dashboard logs
- Make sure the project is fully provisioned (not "Setting up")
