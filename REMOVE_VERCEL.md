# Remove Vercel from GitHub

## Step 1: Disconnect Vercel App from GitHub Repository

### Option A: From GitHub Repository Settings

1. Go to your GitHub repo: https://github.com/psdstocks-cloud/creative-studio-saas
2. Click **Settings** (gear icon)
3. In the left sidebar, click **Webhooks**
4. Look for any Vercel webhooks
5. Click on each one and click **Delete webhook**

Then:
6. In the left sidebar, click **Integrations** → **GitHub Apps**
7. Find **Vercel** in the list
8. Click **Configure**
9. Scroll down to "Repository access"
10. Remove this repository or uninstall the app

### Option B: From GitHub Apps Settings

1. Go to https://github.com/settings/installations
2. Find **Vercel** in the list
3. Click **Configure**
4. Either:
   - Remove `creative-studio-saas` from the repository list
   - Or completely uninstall Vercel if you don't need it

## Step 2: Remove Vercel Config Files (Optional)

Check if you have any Vercel-specific files:

```bash
cd /Users/ahmedabdelghany/Downloads/creative-studio-saas

# Check for Vercel files
ls -la | grep vercel

# If you find vercel.json, delete it
rm vercel.json  # (if it exists)
```

## Step 3: Keep Only obl.ee

Your obl.ee deployment is working! From the screenshot:
✅ **Oblien deployment** - Successful in 6s

## Step 4: Verify Only obl.ee Remains

After disconnecting Vercel:

1. Make a small change and push:
```bash
echo "# Vercel removed" >> .buildversion
git add .buildversion
git commit -m "Test: Verify only obl.ee deploys"
git push origin main
```

2. Check GitHub Actions/Checks
   - Should only see obl.ee deployment
   - No more Vercel checks

3. Test your site:
   - https://creative-studio-saas.obl.ee/
   - Should work with NEW Supabase credentials!

## What About Netlify?

Your `netlify.toml` is empty (1 line only). If you're not using Netlify:

```bash
# Remove Netlify config
rm netlify.toml
git add netlify.toml
git commit -m "Remove Netlify config"
git push origin main
```

## Final Result

After these steps:
✅ Only obl.ee will deploy
✅ No Vercel checks in GitHub
✅ Cleaner deployment process
✅ Your site works at https://creative-studio-saas.obl.ee/

## Current Status

From your screenshot:
- ❌ Vercel: Account is blocked (remove this)
- ✅ obl.ee: Working perfectly!

Keep obl.ee, remove Vercel! 🚀
