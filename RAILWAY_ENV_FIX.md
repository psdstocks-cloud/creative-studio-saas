# 🔧 Fix: Add SUPABASE_ANON_KEY to Railway

## Problem

Sign-in returns 401 "Invalid credentials" because password authentication requires the **anon key**, not the service role key.

## Solution

Add `SUPABASE_ANON_KEY` environment variable to Railway.

### Quick Steps

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Open your project
   - Select your service

2. **Open Variables Tab**
   - Click "Variables" in the left sidebar

3. **Add New Variable**
   - Click "+ New Variable"
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Copy from your Cloudflare Pages environment variables
     - Go to: https://dash.cloudflare.com
     - Workers & Pages → creative-studio-saas → Settings → Environment variables
     - Find `VITE_SUPABASE_ANON_KEY`
     - Copy the value
   - Click "Add"

4. **Wait for Redeploy**
   - Railway automatically redeploys (1-2 minutes)

5. **Test**
   - Visit: https://creative-studio-saas.pages.dev
   - Sign in with your credentials
   - Should work now! ✅

## Alternative: Use Both Names

If you prefer to also set `SUPABASE_ANON_KEY` (without `VITE_` prefix):

- Add another variable: `SUPABASE_ANON_KEY` with the same value

The server checks both names, so either works.

## Verify

After redeploy, check the logs:
```
railway logs --tail
```

Look for:
- No "Server configuration error"
- Successful signin attempts
- Cookies being set

## Why This is Needed

- **Service role key**: Can read/write database, verify tokens
- **Anon key**: Can authenticate users, issue tokens
- **Password auth**: Requires anon key via Supabase client

Both keys are safe to use:
- ✅ Anon key: Limited by RLS policies
- ✅ Service role: Admin-only, but managed by Railway (server-side)

## Current Railway Variables

Make sure you have these set:

✅ `NODE_ENV=production`  
✅ `SUPABASE_URL=https://gvipnadjxnjznj...supabase.co`  
✅ `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`  
✅ `STOCK_API_KEY=...`  
✅ `STOCK_API_BASE_URL=https://nehtw.com/api`  
✅ `VITE_SUPABASE_ANON_KEY=eyJhbGc...` ← **ADD THIS NOW**

## Need Help?

Check Railway logs:
```bash
railway logs --tail
```

Look for errors mentioning "Server configuration error" or "401 Unauthorized".

---

**Status**: ⏳ Waiting for you to add the variable  
**ETA**: 2 minutes after adding variable

