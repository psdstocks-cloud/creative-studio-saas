# 🔄 Fix: Clear All Caches

Your code is correct and deployed, but you're seeing cached files.

## Step 1: Check if obl.ee Has Rebuilt

1. Look at your obl.ee dashboard for deployment status
2. Check for a recent deployment (should show commit "Add Supabase credentials")
3. If no recent deployment, trigger a manual rebuild

## Step 2: Clear Browser Cache (AGGRESSIVE)

### Chrome/Edge:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or: Go to Settings → Privacy → Clear Browsing Data → Cached images and files → Clear

### Firefox:
1. Press Ctrl/Cmd + Shift + Delete
2. Check "Cached Web Content"
3. Time Range: "Everything"
4. Click "Clear Now"

### Safari:
1. Develop menu → Empty Caches
2. Or: Cmd + Option + E

## Step 3: Test in Incognito/Private Window

This bypasses all cache:
```
Chrome: Ctrl/Cmd + Shift + N
Firefox: Ctrl/Cmd + Shift + P
Safari: Cmd + Shift + N
```

Then go to https://creative-studio-saas.obl.ee/

## Step 4: Force obl.ee to Rebuild

If still seeing old code:

```bash
# Make a tiny change to force rebuild
echo "// Cache bust" >> src/config.ts
git add src/config.ts
git commit -m "Force rebuild - cache bust"
git push
```

Wait 2 minutes, then hard refresh.

## Step 5: Check Bundle Contents

In DevTools:
1. Go to Network tab
2. Filter by "bundle.js"
3. Click on bundle.js
4. Search (Ctrl+F) for "gvipnadjxnjznjzvxqvg"
5. Should find it (not "axjgrfrfhqyqjmksxxld")

If you find the old URL, the deployment hasn't completed yet.

## Step 6: Clear obl.ee CDN Cache

Check if obl.ee dashboard has:
- "Clear Cache" button
- "Purge CDN" option
- "Invalidate Cache" feature

Click it to force fresh files to be served.

## Verification

When working, you should see in console:
```
✅ POST https://gvipnadjxnjznjzvxqvg.supabase.co/auth/v1/signup
```

NOT:
```
❌ POST https://axjgrfrfhqyqjmksxxld.supabase.co/auth/v1/signup
```

## Quick Test Command

Run this locally to verify your build is correct:
```bash
npm run build
grep -r "axjgrfrfhqyqjmksxxld" dist/
```

Should return NOTHING. If it finds the old URL, something is wrong with the build process.
