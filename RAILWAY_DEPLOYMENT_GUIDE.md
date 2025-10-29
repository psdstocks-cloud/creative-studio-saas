# Railway BFF Deployment Guide

## Status: ✅ Code Ready - Awaiting Manual Deployment

Your BFF server code is **ready to deploy** to Railway. The following changes have been pushed to GitHub:
- ✅ Added `start` script to `package.json`
- ✅ Added CORS middleware to `server.js`
- ✅ Committed and pushed to GitHub (commit `0830e94`)

---

## Step-by-Step Deployment Instructions

### Phase 1: Create Railway Account & Deploy

#### Step 1: Sign Up for Railway
1. Go to: **https://railway.app**
2. Click **"Login"** in the top right
3. Click **"Login with GitHub"**
4. Authorize Railway to access your GitHub repositories
5. You'll get **$5 in trial credits** (no credit card required)

#### Step 2: Create New Project
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`psdstocks-cloud/creative-studio-saas`**
4. Railway will auto-detect Node.js and start deploying

**What Railway Does Automatically**:
- Detects `package.json` and Node.js runtime
- Runs `npm install` to install dependencies
- Uses `npm start` to run `server.js`
- Assigns a port (usually 3000)

#### Step 3: Wait for Initial Build (2-3 minutes)
- Watch the deployment logs in Railway dashboard
- Look for: `Server listening on port...`
- If you see errors, check Phase 3 below

#### Step 4: Generate Public Domain
1. Click on your service in Railway dashboard
2. Go to **"Settings"** tab
3. Scroll down to **"Networking"** section
4. Click **"Generate Domain"**
5. Railway creates a URL like: `creative-studio-bff-production.up.railway.app`
6. **Copy this URL** - you'll need it for Cloudflare

---

### Phase 2: Configure Environment Variables

#### Step 1: Get Supabase Service Role Key
1. Go to: **https://app.supabase.com**
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Scroll to **"Project API keys"**
5. Find the **`service_role`** key (labeled "secret")
6. Click **"Reveal"** and copy the key
7. **⚠️ IMPORTANT**: This key bypasses all security - keep it secret!

#### Step 2: Add Environment Variables in Railway
1. In Railway dashboard, click on your service
2. Go to **"Variables"** tab
3. Click **"New Variable"** for each variable below

**Add These Variables**:

```plaintext
NODE_ENV=production
```

```plaintext
SUPABASE_URL=https://gvipnadjxnjznj... (copy from your Cloudflare VITE_SUPABASE_URL)
```

```plaintext
SUPABASE_SERVICE_ROLE_KEY=(paste the service_role key from Step 1)
```

```plaintext
STOCK_API_KEY=(copy from your Cloudflare STOCK_API_KEY variable)
```

```plaintext
STOCK_API_BASE_URL=https://nehtw.com/api
```

```plaintext
ALLOWED_ORIGINS=https://creative-studio-saas.pages.dev,http://localhost:5173
```

```plaintext
SESSION_COOKIE_NAME=css_bff_session
```

**After Adding All Variables**: Railway will automatically redeploy (takes 1-2 minutes)

---

### Phase 3: Connect Frontend to BFF

#### Step 1: Add BFF URL to Cloudflare
1. Go to: **https://dash.cloudflare.com**
2. Navigate to: **Workers & Pages** → **creative-studio-saas**
3. Click **"Settings"** → **"Environment variables"**
4. Click **"Add variable"**
5. Enter:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-service.up.railway.app` (your Railway URL from Phase 1, Step 4)
   - **Environment**: Check "Production"
6. Click **"Save"**

#### Step 2: Redeploy Frontend
**Option A - Quick Retry**:
1. Go to **"Deployments"** tab
2. Find latest deployment
3. Click **"..."** menu → **"Retry deployment"**

**Option B - New Commit** (if needed later):
```bash
git commit --allow-empty -m "trigger: Connect BFF server"
git push origin main
```

Wait 2-3 minutes for Cloudflare to rebuild.

---

### Phase 4: Testing & Verification

#### Test 1: Health Check
Open your browser and visit:
```
https://your-service.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T..."
}
```

✅ If you see this, BFF is deployed successfully!  
❌ If you get an error, check Railway logs (see Troubleshooting below)

#### Test 2: Clear Browser & Sign In
1. Go to: **https://creative-studio-saas.pages.dev**
2. Open DevTools (press `F12`)
3. Go to **Console** tab
4. Clear storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
5. Sign in with: **ahmedmoataz95@gmail.com**
6. Watch console - should NOT see "Auth initialization timed out"

#### Test 3: Access Admin Panel
1. After signing in, navigate to: **https://creative-studio-saas.pages.dev/admin**
2. Should load **immediately** (no 30-second timeout!)
3. You should see the admin dashboard with KPIs

**Success Indicators**:
- ✅ Page loads in 2-3 seconds
- ✅ No loading spinner for 30 seconds
- ✅ Admin dashboard displays properly
- ✅ No console errors about BFF

#### Test 4: Verify BFF Session (Optional)
In browser console after signing in:
```javascript
// Get session info
const session = JSON.parse(localStorage.getItem('supabase.auth.token'));
const token = session?.currentSession?.access_token;

// Test BFF endpoint
fetch('https://your-railway-url.up.railway.app/api/auth/session', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(d => console.log('✅ BFF Response:', d))
.catch(e => console.error('❌ BFF Error:', e));
```

Should return your user object with roles.

---

### Phase 5: Monitor & Maintain

#### View Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. Click **"Deployments"** tab
4. Click on latest deployment
5. Click **"View Logs"**

Look for:
- ✅ `Server listening on port 3000`
- ✅ No errors about missing environment variables
- ✅ Successful API requests

#### Monitor Usage & Credits
1. In Railway dashboard, click **"Usage"** in left sidebar
2. See remaining trial credits (starts at $5.00)
3. Track estimated monthly cost

**Typical Usage**:
- Idle service: ~$0.50/month
- Low traffic: ~$2-3/month
- Active development: ~$5/month

**When Credits Run Out**:
- Add payment method to continue
- Railway will charge ~$5-7/month for small projects
- Or switch to Render free tier (has cold starts)

---

## Troubleshooting Guide

### Issue 1: "Application failed to start"
**Symptoms**: Railway shows red error in logs

**Check**:
1. View logs in Railway dashboard
2. Look for specific error message

**Common Causes**:
- Missing `SUPABASE_SERVICE_ROLE_KEY`
- Wrong Supabase URL
- Missing `start` script in `package.json`

**Solution**: Verify all environment variables are set correctly

### Issue 2: CORS Errors in Browser
**Error**: `Access to fetch has been blocked by CORS policy`

**Check**:
- Browser console shows CORS error
- Network tab shows OPTIONS request failing

**Solution**:
1. Verify `ALLOWED_ORIGINS` includes: `https://creative-studio-saas.pages.dev`
2. No trailing slash in the URL
3. Redeploy Railway after changing variable

### Issue 3: BFF Returns 401 Unauthorized
**Symptoms**: Admin panel still doesn't load, 401 errors in Network tab

**Check**:
1. Open Network tab in DevTools
2. Look for `/api/auth/session` request
3. Check response status

**Possible Causes**:
- Wrong `SUPABASE_SERVICE_ROLE_KEY`
- Token not being sent from frontend
- Supabase URL mismatch

**Solution**: Double-check service role key from Supabase Dashboard

### Issue 4: Admin Panel Still Times Out
**Symptoms**: Still see 30-second loading, then redirect

**Check**:
1. Is `VITE_API_BASE_URL` set in Cloudflare?
2. Did frontend redeploy after adding the variable?
3. Is Railway service running?

**Solution**:
1. Verify Cloudflare environment variable
2. Trigger manual redeploy in Cloudflare
3. Check Railway health endpoint

### Issue 5: Health Endpoint Returns 404
**Symptoms**: `https://your-service.up.railway.app/health` shows "Not Found"

**Possible Causes**:
- Railway deployment failed
- Wrong URL
- Service not running

**Solution**:
1. Check Railway logs for errors
2. Verify domain in Railway Settings → Networking
3. Ensure deployment succeeded

### Issue 6: Running Out of Credits
**Symptoms**: Railway shows "Service paused due to insufficient credits"

**Options**:
1. Add payment method to Railway
2. Switch to Render free tier:
   - Deploy same code to Render
   - Update `VITE_API_BASE_URL` in Cloudflare
   - Accept cold starts (30s delay after idle)

---

## Environment Variables Reference

| Variable | Required | Example | Source |
|----------|----------|---------|--------|
| `NODE_ENV` | Yes | `production` | Set manually |
| `SUPABASE_URL` | Yes | `https://gvip...` | Cloudflare `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGc...` | Supabase Dashboard → API |
| `STOCK_API_KEY` | Yes | (encrypted) | Cloudflare `STOCK_API_KEY` |
| `STOCK_API_BASE_URL` | No | `https://nehtw.com/api` | Set manually |
| `ALLOWED_ORIGINS` | No | `https://creative-studio-saas.pages.dev` | Set manually |
| `SESSION_COOKIE_NAME` | No | `css_bff_session` | Set manually |

**⚠️ Security Note**: Never commit `SUPABASE_SERVICE_ROLE_KEY` to Git!

---

## Expected Results After Deployment

✅ **Admin Access Works**:
- No 30-second timeout
- Loads in 2-3 seconds
- Full admin dashboard functionality

✅ **Enhanced Features**:
- BFF session management
- Server-side role verification
- Audit logging (in Railway logs)
- Rate limiting protection
- Stock API proxy

✅ **Performance**:
- Always-on (no cold starts on Railway)
- Fast response times
- Reliable authentication

---

## Cost Summary

**Trial Credits**: $5.00 (provided by Railway)

**After Trial**:
- **Small project**: ~$2-3/month
- **Active use**: ~$5/month
- **High traffic**: $7-10/month

**To Reduce Costs**:
- Pause service when not actively developing
- Switch to Render free tier (has cold starts)
- Only run BFF in production, not for local dev

---

## Next Steps After Deployment

1. ✅ **Test All Admin Features**:
   - Users management
   - Orders tracking
   - AI jobs monitoring
   - Audit trail

2. ✅ **Verify Stock Downloads**:
   - Try downloading a stock image
   - Should proxy through BFF
   - Check Railway logs for proxy requests

3. ✅ **Monitor Performance**:
   - Watch Railway metrics
   - Check response times
   - Review error logs

4. ✅ **Document Your Setup**:
   - Save Railway URL
   - Note environment variables
   - Keep service role key secure

5. 🎯 **Optional Enhancements**:
   - Add custom domain to Railway
   - Set up monitoring alerts
   - Configure log retention

---

## Support & Resources

**Railway Documentation**: https://docs.railway.app  
**Your Railway Dashboard**: https://railway.app/dashboard  
**Cloudflare Dashboard**: https://dash.cloudflare.com  
**Supabase Dashboard**: https://app.supabase.com

**Need Help?**
- Check Railway logs first
- Review troubleshooting section above
- Verify all environment variables
- Test health endpoint

---

## Quick Reference Commands

**Test Health Endpoint**:
```bash
curl https://your-service.up.railway.app/health
```

**Check Railway Logs** (if Railway CLI installed):
```bash
railway logs
```

**Trigger Frontend Redeploy**:
```bash
git commit --allow-empty -m "redeploy"
git push
```

---

**Deployment Date**: October 29, 2025  
**Code Commit**: `0830e94`  
**Status**: ✅ Ready to Deploy  
**Estimated Setup Time**: 15-20 minutes

