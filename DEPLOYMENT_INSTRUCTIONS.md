# 🚀 Deploy Your Stock Sources Fix

## ✅ What's Been Fixed

1. ✅ **Database**: Created `stock_sources` table with 41 sources (40 active)
2. ✅ **Admin API**: Updated to fetch from database instead of external API
3. ✅ **Public API**: Created new endpoint for regular users to fetch active sources
4. ✅ **Backend**: Updated Cloudflare Functions

## 🎯 You're Using Cloudflare Pages

Based on your URL (`creative-studio-saas.pages.dev`), you're deploying to **Cloudflare Pages**.

## 📦 How to Deploy

### Option 1: GitHub Auto-Deploy (Recommended)

If your code is connected to GitHub:

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Fix stock sources: Add database-backed management"
   git push
   ```

2. **Cloudflare will automatically deploy** from your GitHub repo

3. **Wait 2-3 minutes** for deployment to complete

4. **Refresh your admin page**

### Option 2: Manual Deploy (Using Wrangler)

If you have `wrangler` installed:

```bash
# Install wrangler if you don't have it
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy your site
wrangler pages deploy --project-name=creative-studio-saas
```

### Option 3: Cloudflare Dashboard Upload

1. Go to https://dash.cloudflare.com
2. Select your **Pages** project
3. Go to **Deployments**
4. Click **Retry deployment** or **Create deployment**
5. If needed, connect to GitHub to enable auto-deploy

---

## 🔍 Verify Deployment

### Step 1: Check Deployment Status

1. Go to **Cloudflare Dashboard** → **Pages** → Your Project
2. Check that the latest deployment succeeded (green ✅)

### Step 2: Test the Admin Page

1. Open: https://creative-studio-saas.pages.dev/admin/stock-sources
2. You should see **41 sources** (or 39-41 depending on what's in your database)
3. Try editing a price - it should work!

### Step 3: Check Browser Console

If still seeing "0 sources":

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for any red errors
4. Go to **Network** tab
5. Click **Refresh** on the admin page
6. Look for the request to `/api/admin/stock-sources`
7. Click on it and check the **Response** tab

**Expected response:**
```json
{
  "sites": [
    {
      "key": "adobestock",
      "name": "adobestock",
      "cost": 0.40,
      "icon": "adobestock.png",
      "iconUrl": "https://nehtw.com/assets/icons/adobestock.png",
      "active": true
    },
    ...
  ]
}
```

---

## 🐛 Troubleshooting

### Issue: Still showing "0 sources" after deployment

**Check 1: Database Connection**

Run this in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM stock_sources;
```

Should return 41 (or 39 if you only ran the migration once).

**Check 2: Environment Variables**

Make sure your Cloudflare Pages project has these environment variables set:

1. Go to **Cloudflare Dashboard** → **Pages** → Your Project → **Settings** → **Environment Variables**
2. Check for:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

**Check 3: Supabase RLS Policies**

Run this in Supabase SQL Editor to check policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'stock_sources';
```

You should see at least one policy allowing SELECT.

**Check 4: Function Logs**

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → Your Project
2. Check **Logs** for any errors

---

## 📁 Files Modified in This Fix

### Cloudflare Functions (Deployed automatically)
- ✅ `/functions/api/stock-sources.ts` - **NEW** Public endpoint
- ✅ `/functions/api/admin/stock-sources/index.ts` - **UPDATED** Admin list
- ✅ Already had audit and update endpoints working

### Database (You ran SQL in Supabase)
- ✅ Created `stock_sources` table
- ✅ Created `stock_source_audit` table
- ✅ Seeded 41 stock sources

### Documentation
- ✅ Multiple guide files created

---

## 🎉 Expected Result

After successful deployment:

### Admin Page (`/admin/stock-sources`)
- Shows **41 sources** (or 39-40 depending on your seed)
- TOTAL SOURCES: 41
- ACTIVE: 40
- INACTIVE: 1 (uihut)
- AVG COST: ~3.5 pts

### Can Edit Prices
- Click edit icon
- Change price
- Save
- Price updates for all users instantly

### Can Toggle Active Status
- Click toggle switch
- Source becomes active/inactive
- Users see changes immediately

---

## 🔄 Next Steps After Deployment

### 1. Test Everything

- [ ] Admin page shows all sources
- [ ] Can edit prices
- [ ] Can toggle active status
- [ ] Changes persist after refresh

### 2. Verify Audit Logs

Run in Supabase:
```sql
SELECT * FROM stock_source_audit ORDER BY changed_at DESC LIMIT 10;
```

Should show any changes you made in the admin panel.

### 3. Test Public Endpoint

The public endpoint should return only active sources. Test with:

```bash
curl https://creative-studio-saas.pages.dev/api/stock-sources
```

(You'll need to be authenticated to see the actual data)

---

## 📞 Need Help?

If deployment fails:

1. **Check Cloudflare Dashboard Logs** for errors
2. **Check Supabase** - Make sure tables exist
3. **Check Browser Console** - Look for JavaScript errors
4. **Verify Environment Variables** - Make sure they're set correctly

---

## ⚠️ Important Notes

1. **You MUST deploy the new code** - Just running the SQL isn't enough
2. **Environment variables** must be set in Cloudflare
3. **Database tables** must exist (already done ✅)
4. **Backend server** needs to restart (handled by deployment)

---

## ✅ Deployment Checklist

Before deploying, make sure:

- [x] SQL migration ran successfully in Supabase
- [x] Database has 41 stock sources
- [x] Code changes are committed
- [ ] Deployed to Cloudflare Pages
- [ ] Verified admin page shows all sources
- [ ] Tested editing prices
- [ ] Checked audit logs working

---

## 🚀 Ready to Deploy?

Run these commands:

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix stock sources: Add database-backed management with 41 sources"

# Push to trigger auto-deployment
git push
```

Then wait 2-3 minutes and refresh your admin page! 🎉

