# 🚀 FINAL DEPLOYMENT - Force Cache Bust

## What Was Done

✅ Added cache control headers to `src/index.html`
✅ Created `.buildversion` file to force rebuild
✅ Your source files have NEW credentials
❌ Production is serving OLD cached bundle

## Deploy Steps

### Step 1: Commit and Push

```bash
cd /Users/ahmedabdelghany/Downloads/creative-studio-saas
git add src/index.html config.ts src/config.ts .buildversion
git commit -m "CRITICAL: Force rebuild with new Supabase credentials v3"
git push origin main
```

### Step 2: Wait for Deployment

- Check obl.ee dashboard for deployment status
- Wait until deployment shows "Success" or "Complete"
- Should take 1-2 minutes

### Step 3: Clear ALL Caches

**In your browser:**

1. Open https://creative-studio-saas.obl.ee/
2. Open DevTools (F12)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click "Clear site data" or "Clear storage"
5. Close DevTools

**Hard refresh:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Or use Incognito/Private window** (best option):
- Chrome: `Cmd/Ctrl + Shift + N`
- Firefox: `Cmd/Ctrl + Shift + P`

### Step 4: Verify New Bundle

1. Open: https://creative-studio-saas.obl.ee/
2. Open DevTools → Console
3. Look for Supabase config debug message:
   ```
   🔍 Supabase Config Debug:
   URL: https://gvipnadjxnjznjzvxqvg.supabase.co  ← Should be NEW URL
   ```
4. Try signing up - should work!

### Step 5: Double-Check Bundle

Open this URL directly:
```
https://creative-studio-saas.obl.ee/bundle.js
```

Search (Ctrl+F) for:
- ❌ `axjgrfrfhqyqjmksxxld` - Should NOT find this
- ✅ `gvipnadjxnjznjzvxqvg` - Should find this

## If Still Not Working

### Option A: Check obl.ee Dashboard

1. Go to obl.ee dashboard
2. Look for "Clear Cache" or "Purge CDN" button
3. Click it
4. Wait 1 minute
5. Try again

### Option B: Force Rebuild Locally & Upload

```bash
# Build locally
npm run build

# Check the built bundle
grep "axjgrfrfhqyqjmksxxld" dist/assets/*.js && echo "❌ OLD FOUND" || echo "✅ NEW ONLY"

# If clean, manually upload dist/ to obl.ee
```

### Option C: Add More Cache Busting

If still cached, update `vite.config.ts`:

```typescript
build: {
  outDir: path.resolve(__dirname, 'dist'),
  emptyOutDir: true,
  rollupOptions: {
    output: {
      entryFileNames: `assets/[name]-${Date.now()}.js`,
      chunkFileNames: `assets/[name]-${Date.now()}.js`,
      assetFileNames: `assets/[name]-${Date.now()}.[ext]`
    }
  }
}
```

Then rebuild and deploy.

## Expected Result

✅ Console shows: `URL: https://gvipnadjxnjznjzvxqvg.supabase.co`
✅ Sign Up works without errors
✅ Network tab shows requests to `gvipnadjxnjznjzvxqvg`
✅ No more `net::ERR_NAME_NOT_RESOLVED` errors

## Quick Verification Commands

```bash
# Verify local source has new credentials
grep "gvipnadjxnjznjzvxqvg" src/config.ts && echo "✅ Source is correct"

# Verify build would be correct
npm run build
grep "axjgrfrfhqyqjmksxxld" dist/assets/*.js && echo "❌ BUILD HAS OLD CREDS" || echo "✅ BUILD IS CLEAN"
```

Ready to deploy? Run the Step 1 commands above! 🚀
