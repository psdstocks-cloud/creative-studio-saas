# Deploy to obl.ee with Correct Supabase Credentials

## Quick Steps

### 1. Update .env.production with Your Anon Key

Edit `.env.production` and replace the placeholder:

```bash
VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

Get key from: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/settings/api

### 2. Build Locally

```bash
npm run build
```

This creates a `dist` folder with the correct Supabase credentials baked in.

### 3. Deploy to obl.ee

```bash
# Commit other changes (not .env.production)
git add src/ config.ts vite.config.ts package.json
git commit -m "Update Supabase configuration"
git push

# The build will happen automatically on obl.ee
```

**Wait!** Since obl.ee builds automatically, we need to set environment variables there.

## Better Approach: Set Environment Variables in obl.ee

Check if obl.ee supports environment variables in their dashboard:

1. Log in to obl.ee dashboard
2. Go to your project settings
3. Look for "Environment Variables" or "Config" section
4. Add:
   ```
   VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
5. Trigger a rebuild

If obl.ee doesn't have environment variable support, use the manual upload method below.

## Alternative: Manual Dist Upload

If obl.ee allows manual file uploads:

### Step 1: Build locally
```bash
npm run build
```

### Step 2: Upload dist folder
Upload the contents of the `dist` folder to obl.ee manually through their file manager or FTP.

## For Now: Remove .env Files from Git Tracking

The `.env.production` is ignored (which is good). Commit your code changes:

```bash
# Commit only source code changes
git add src/ config.ts vite.config.ts tailwind.config.js postcss.config.js
git commit -m "Fix: Update to new Supabase project and add Tailwind"
git push
```

Then either:
- Set environment variables in obl.ee dashboard (recommended)
- Or build locally and upload dist folder manually

## What NOT to Do

❌ Don't force-add .env files:
```bash
git add -f .env.production  # DON'T DO THIS
```

This would commit your credentials to Git history (security risk).

## Verify Deployment

After deploying:
1. Visit https://creative-studio-saas.obl.ee/
2. Open DevTools (F12) → Network tab
3. Click "Sign Up"
4. Check the request URL - should be `gvipnadjxnjznjzvxqvg.supabase.co` ✅
