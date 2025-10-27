# 🚀 Final Steps to Deploy with Working Supabase

## The Issue
The production build doesn't have environment variables, so it's still using the old URL.

## Quick Fix (3 steps)

### Step 1: Get Your Anon Key
Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/settings/api

Copy the **anon / public** key (the long string starting with `eyJ...`)

### Step 2: Update Config Files

Open **both** of these files:
- `src/config.ts`
- `config.ts`

In **BOTH** files, find this line:
```typescript
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_REPLACE_WITH_YOUR_ACTUAL_ANON_KEY';
```

Replace `PLACEHOLDER_REPLACE_WITH_YOUR_ACTUAL_ANON_KEY` with your actual anon key:
```typescript
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...your-actual-key-here...';
```

**Important:** Keep the quotes around the key!

### Step 3: Commit and Deploy

```bash
git add src/config.ts config.ts
git commit -m "Add Supabase credentials for production"
git push
```

obl.ee will automatically rebuild with the correct credentials.

### Step 4: Verify (after deployment completes)

1. Wait 1-2 minutes for obl.ee to rebuild
2. Go to https://creative-studio-saas.obl.ee/
3. Hard refresh: `Cmd/Ctrl + Shift + R` or open in incognito
4. Open DevTools (F12) → Console
5. Click "Sign Up"
6. Should see: `POST https://gvipnadjxnjznjzvxqvg.supabase.co/...` ✅

## Is This Safe?

✅ **YES** - The Supabase anon key is designed to be public. It's safe to commit to Git.

It's called "anon key" because it's meant to be exposed in your frontend code. Supabase uses Row Level Security (RLS) in your database to protect data.

## After It Works

Once production is working, you can improve security by:
1. Setting up environment variables in obl.ee (if supported)
2. Removing the hardcoded fallback
3. But for now, this will get your site working!

## What You Changed

Before (broken):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
```

After (working):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gvipnadjxnjznjzvxqvg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJ...your-key...';
```

Now when obl.ee builds your app, it will use these fallback values! 🎉
