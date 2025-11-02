# 🚀 Production Deployment Steps - Cookie Auth Ready

Your cookie-based authentication system has been pushed to GitHub and is ready for production deployment!

## ✅ What Was Just Deployed

- Secure HttpOnly cookie authentication (XSS-safe)
- CSRF protection with XSRF-TOKEN
- Cross-origin cookie support (SameSite=None)
- 3-day session persistence with auto-refresh
- All legacy localStorage code removed

---

## 📋 Deployment Checklist

### 1️⃣ Frontend (Cloudflare Pages)

#### Current Status
GitHub pushed: ✅ **Complete**  
Auto-deploy: ✅ Should trigger automatically  
Build: ✅ Should complete in 2-3 minutes  

#### Verify Auto-Deployment
1. Go to: https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **Your Project**
3. Click **Deployments** tab
4. Look for the latest deployment from commit `b5eed89`
5. Check status should be **✅ Success**

If deployment failed or hasn't started:
- Go to project settings
- Verify **Production branch** is set to `main`
- Check build command is: `npm install && npm run build`
- Check output directory is: `dist`

#### Verify Environment Variables
Go to **Settings** → **Environment variables** and confirm these exist:

| Variable | Should Be Set To |
|----------|-----------------|
| `VITE_SUPABASE_URL` | `https://gvipnadjxnjznjzvxqvg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon key (starts with `eyJhbG...`) |
| `VITE_API_BASE_URL` | Your Railway backend URL (see below) |

#### Update Frontend URL (if needed)
Your frontend URL should be: `https://creative-studio-saas.pages.dev`

If different, you'll need to update the `ALLOWED_ORIGINS` in backend auth functions.

---

### 2️⃣ Backend (Railway)

#### Current Status
GitHub pushed: ✅ **Complete**  
Auto-deploy: ✅ Should trigger automatically  

#### Verify Environment Variables
Go to Railway dashboard → Your project → **Variables** tab

Required variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | ✅ Yes | Same as frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Backend admin key |
| `SUPABASE_ANON_KEY` | ⚠️ Maybe | If not using service key |
| `STOCK_API_KEY` | ⚠️ Maybe | For stock features |
| `GEMINI_API_KEY` | ❌ No | Optional for AI |
| `NODE_ENV` | ✅ Yes | Set to `production` |

#### Get Your Railway Domain
1. Go to Railway project settings
2. Click **Generate Domain** (if not done)
3. Copy the URL (e.g., `https://creative-studio-saas-production.up.railway.app`)

#### Update Frontend to Use Railway Backend
1. Go to Cloudflare Pages settings
2. Add/update environment variable:
   ```
   Name:  VITE_API_BASE_URL
   Value: https://your-railway-domain.up.railway.app
   ```
3. Redeploy frontend (or wait for auto-deploy)

---

### 3️⃣ Update CORS Origins (CRITICAL!)

The auth endpoints have hardcoded allowed origins. You **MUST** update these if your URLs don't match:

**Files to update:**
- `functions/api/auth/signin.ts` (line 7-11)
- `functions/api/auth/session.ts` (line 7-11)  
- `functions/api/auth/signout.ts` (line 7-11)

**Current hardcoded origins:**
```typescript
const ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',  // ← Update this!
  'http://localhost:5173',
  'http://localhost:3000',
];
```

**Action required:**
1. Update `'https://creative-studio-saas.pages.dev'` to your actual Cloudflare Pages URL
2. Commit and push the change
3. Wait for auto-deploy

---

### 4️⃣ Supabase Configuration

#### Update Auth Redirect URLs
Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/url-configuration

Add/update these URLs:

**Site URL:**
```
https://creative-studio-saas.pages.dev
```

**Redirect URLs (add all):**
```
https://creative-studio-saas.pages.dev/**
https://creative-studio-saas.pages.dev/auth/callback
https://creative-studio-saas.pages.dev/reset-password
http://localhost:5173/**
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
```

Click **Save** after updating.

---

## 🧪 Testing the Deployment

### Test 1: Sign In
1. Go to your production URL
2. Click "Sign In"
3. Enter test credentials
4. **Check**: Cookies should be set in DevTools → Application → Cookies
   - `sb-access-token` (should have HttpOnly, Secure, SameSite=None)
   - `XSRF-TOKEN` (should have Secure, SameSite=None)

### Test 2: Session Persistence
1. Sign in successfully
2. Refresh the page
3. **Check**: Should remain logged in
4. **Check**: Cookies should have new expiration (refreshed)

### Test 3: CSRF Protection
1. Open DevTools → Console
2. Run this (should fail):
   ```javascript
   fetch('https://your-api.railway.app/api/profile/deduct', {
     method: 'POST',
     body: JSON.stringify({ amount: 10 })
   }).then(r => console.log(r.status))
   ```
3. **Check**: Should get `403 Forbidden`

### Test 4: Sign Out
1. Click "Sign Out"
2. **Check**: Cookies should be cleared
3. **Check**: Should be redirected to landing page
4. **Check**: Should not be able to access `/app`

---

## 🐛 Troubleshooting

### Cookies Not Being Set

**Symptoms:** After sign in, cookies missing in DevTools

**Check 1: Backend CORS**
```bash
# Check backend logs in Railway
# Look for CORS errors
```

**Check 2: Origin Mismatch**
```
# In browser DevTools → Network tab
# Look at the OPTIONS request to /api/auth/signin
# Check "Access-Control-Allow-Origin" header
# Should match your frontend URL exactly
```

**Fix:** Update `ALLOWED_ORIGINS` in auth endpoint files

### 403 CSRF Token Mismatch

**Symptoms:** POST requests return 403

**Check:** 
```javascript
// In browser console
console.log(document.cookie) // Should show XSRF-TOKEN
```

**Fix:** Make sure cookies are being set correctly on sign in

### Cross-Origin Cookie Issues

**Symptoms:** Cookies set but not sent with requests

**Check:** Network tab → Request headers → Should include `Cookie` header

**Fix:** 
1. Verify `withCredentials: true` in Axios config
2. Verify backend returns `Access-Control-Allow-Credentials: true`
3. Verify cookies have `SameSite=None; Secure`

### Session Expires Too Quickly

**Symptoms:** User logged out after short time

**Check:** Cookie expiration in DevTools (should be 3 days from last activity)

**Fix:** Session refresh should happen automatically. Check for errors in console.

---

## 📊 Monitoring

### Key Metrics to Watch

1. **Authentication Success Rate**
   - Monitor 200 vs 401 on `/api/auth/signin`
   - Should be >95% success for legitimate users

2. **CSRF Rejection Rate**
   - Monitor 403 responses
   - Should be near 0% for legitimate users

3. **Session Validation Calls**
   - Monitor `/api/auth/session` calls
   - Should correlate with page loads

4. **Cookie Setting Failures**
   - Check backend logs
   - Should be rare

---

## 🔐 Security Checklist

Before going live, verify:

- [ ] Cookies are HttpOnly in production
- [ ] Cookies have Secure flag in production
- [ ] Cookies have SameSite=None (for cross-origin)
- [ ] CSRF protection is working
- [ ] No tokens in localStorage
- [ ] No tokens in URLs or response bodies
- [ ] CORS is properly configured
- [ ] ALLOWED_ORIGINS is restrictive (not `*`)

---

## 📞 Support

If issues persist:

1. Check Railway logs: `railway logs`
2. Check Cloudflare build logs: Dashboard → Deployments
3. Check browser console for errors
4. Check Network tab for failed requests
5. Verify all environment variables are set
6. Re-run deployment steps above

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ Users can sign in
2. ✅ Cookies are set correctly
3. ✅ Session persists across refreshes
4. ✅ CSRF protection blocks unauthorized POSTs
5. ✅ Users can sign out
6. ✅ No 401/403 errors for legitimate users
7. ✅ No console errors
8. ✅ All features work as before

---

## 🎉 Next Steps

Once deployed successfully:

1. **Test thoroughly** in production
2. **Monitor** error rates for 24 hours
3. **Update** Supabase redirect URLs if needed
4. **Document** any issues in runbook
5. **Celebrate** 🎊

---

**Remember:** The cookie auth system is more secure than localStorage. Proper configuration is critical, but once set up correctly, it will provide seamless, secure authentication!

