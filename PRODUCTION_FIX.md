# 🔴 FIX: Production Deployment Error

## The Problem
Your production site is trying to connect to the OLD Supabase project:
❌ `axjgrfrfhqyqjmksxxld.supabase.co` (doesn't exist)

Instead of the NEW project:
✅ `gvipnadjxnjznjzvxqvg.supabase.co`

This happened because the build was created before updating the credentials.

## Quick Fix (5 minutes)

### Step 1: Get Your Anon Key

1. Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/settings/api
2. Copy the **anon / public** key (starts with `eyJ...`)

### Step 2: Update .env.production

I've created `.env.production` file. Open it and replace `PASTE_YOUR_ANON_KEY_HERE` with your actual key:

```bash
VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-actual-key-here...
```

### Step 3: Rebuild Your App

Run this command to create a new production build:

```bash
npm run build
```

This will create a new `dist` folder with the correct Supabase URL.

### Step 4: Redeploy to obl.ee

Depending on how you're deploying to https://creative-studio-saas.obl.ee/, you need to:

**If using obl.ee CLI:**
```bash
# Upload the new dist folder
obl deploy
```

**If using Git/GitHub deployment:**
```bash
git add .env.production
git commit -m "Fix: Update to new Supabase project"
git push
```

**If manually uploading:**
1. Delete old files on server
2. Upload new `dist` folder contents
3. Clear CDN cache if applicable

### Step 5: Verify

1. Clear browser cache or open incognito
2. Go to https://creative-studio-saas.obl.ee/
3. Open DevTools (F12) → Console tab
4. Click "Sign Up"
5. Should see requests to `gvipnadjxnjznjzvxqvg.supabase.co` ✅

## Alternative: Environment Variables in Deployment Platform

If your hosting platform (like Vercel, Netlify, Railway) supports environment variables:

### Option A: Set in Platform Dashboard

1. Go to your deployment platform settings
2. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
3. Trigger a rebuild/redeploy

### Option B: Use Platform's CLI

**Vercel:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

**Netlify:**
```bash
netlify env:set VITE_SUPABASE_URL "https://gvipnadjxnjznjzvxqvg.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
netlify deploy --prod
```

## Important Notes

### Security
- ✅ `.env.local` is already in `.gitignore` (safe)
- ✅ `.env.production` is already in `.gitignore` (safe)
- ⚠️ Never commit actual keys to public repos
- ✅ The anon key is safe to expose (it's public by design)

### Build Script

Your `package.json` has:
```json
"build": "vite build"
```

This automatically:
1. Reads `.env.production` (or environment variables)
2. Replaces `import.meta.env.VITE_*` with actual values
3. Creates optimized production bundle in `dist/`

### Checking the Build

After building, you can verify locally:
```bash
npm run build
npm run preview
```

Then open http://localhost:4173 to test the production build locally.

## Troubleshooting

### Still seeing old URL after rebuild?
1. Clear browser cache completely
2. Open in incognito/private window
3. Check Network tab in DevTools
4. Verify the request goes to `gvipnadjxnjznjzvxqvg`

### "Missing environment variables" error?
Make sure `.env.production` is in the root directory (same level as `package.json`).

### Build succeeds but deployment fails?
Check if your deployment platform needs a specific folder structure or build command.

## Summary

1. ✅ Get anon key from Supabase dashboard
2. ✅ Update `.env.production`
3. ✅ Run `npm run build`
4. ✅ Redeploy the `dist` folder
5. ✅ Clear cache and test

After this, authentication should work on production! 🚀
