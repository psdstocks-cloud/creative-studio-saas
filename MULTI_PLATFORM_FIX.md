# 🚨 Multi-Platform Deployment Issue

## The Problem

You're deploying to MULTIPLE platforms:
1. **obl.ee** - https://creative-studio-saas.obl.ee/
2. **Vercel** - (separate URL)
3. **Netlify** - (has netlify.toml config)

Each platform:
- ✅ Pulls from the SAME GitHub repo
- ❌ Has its OWN cached build
- ❌ May have OLD environment variables

**This is why you still see old credentials!**

## Solution: Choose ONE Platform or Update ALL

### Option 1: Use ONLY obl.ee (Recommended)

**Step 1: Remove other deployments**
- Delete the Vercel project
- Delete the Netlify site
- Or: Pause/disable them

**Step 2: Deploy to obl.ee only**
```bash
git add .
git commit -m "Update Supabase credentials for obl.ee"
git push origin main
```

Wait for obl.ee to rebuild, then test at https://creative-studio-saas.obl.ee/

### Option 2: Update ALL Platforms

If you want to keep all deployments:

#### For Vercel:
1. Go to Vercel dashboard
2. Find your project
3. Go to Settings → Environment Variables
4. Add/Update:
   ```
   VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...your-key...
   ```
5. Go to Deployments → Click "..." → Redeploy

#### For Netlify:
1. Go to Netlify dashboard
2. Find your site
3. Go to Site settings → Environment variables
4. Add/Update:
   ```
   VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...your-key...
   ```
5. Go to Deploys → Trigger deploy → Clear cache and deploy site

#### For obl.ee:
1. Check if obl.ee dashboard has environment variables
2. If yes, add the same variables
3. If no, your hardcoded fallback in config.ts will work
4. Trigger rebuild

### Option 3: Custom Domain Setup

If you have a custom domain pointing to multiple platforms:

**Check your DNS:**
```bash
nslookup creative-studio-saas.obl.ee
```

See which platform it actually points to. Only that platform needs to be updated.

## Current Situation

Looking at your setup:
- GitHub repo: `psdstocks-cloud/creative-studio-saas`
- Primary URL: https://creative-studio-saas.obl.ee/
- Has `netlify.toml` (so Netlify might be deployed)
- May have Vercel deployment

## Recommended Action

**Step 1: Check which platforms are active**

Visit each URL:
- https://creative-studio-saas.obl.ee/
- https://creative-studio-saas.netlify.app/ (or your Netlify URL)
- https://creative-studio-saas.vercel.app/ (or your Vercel URL)

**Step 2: Decide:**
- Using obl.ee only? → Delete Vercel/Netlify deployments
- Using all three? → Update environment variables on ALL

**Step 3: Clear caches everywhere:**
- Vercel: Redeploy with "Clear cache"
- Netlify: Trigger deploy with "Clear cache"
- obl.ee: Check dashboard for cache clear option

## Quick Fix for obl.ee Only

If you only care about obl.ee:

```bash
# Your current changes already have new credentials
git add src/index.html config.ts src/config.ts .buildversion
git commit -m "Force rebuild with new Supabase credentials"
git push origin main

# Just wait for obl.ee to rebuild
# Other platforms will be outdated but won't matter
```

Then test ONLY at https://creative-studio-saas.obl.ee/

## Why This Happened

When you committed the old credentials, ALL platforms built and cached that version. Each platform needs to:
1. Pull the NEW code (done when you push)
2. REBUILD with new code (may not happen automatically)
3. CLEAR cache (may need manual trigger)

That's why you're seeing stale builds!
