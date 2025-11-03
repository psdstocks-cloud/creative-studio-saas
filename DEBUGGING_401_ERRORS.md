# 🔍 Debugging 401 Unauthorized Errors

## Current Errors

1. ⚠️ **"Authentication requested but no token available"** - This is EXPECTED (cookie-based auth)
2. ❌ **401 on `/api/orders`** - Real problem: authentication cookies not working
3. ⚠️ **`import.meta` error in console** - Console limitation, not a real issue

---

## Step 1: Check If You're Actually Signed In

### In Browser Console:

```javascript
// Check if user object exists
window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.currentOwner?.stateNode?.props?.user

// OR easier: Check Application/Storage tab
// DevTools → Application → Cookies → creative-studio-saas.pages.dev
// Look for: sb-access-token cookie
```

### What to Look For:
- ✅ Cookie `sb-access-token` exists
- ✅ Cookie has a value (long JWT token)
- ✅ Cookie domain matches Railway domain (or is set for both)

---

## Step 2: Check Cookies Are Being Sent

### In Browser Console (Network Tab):

1. Open DevTools → **Network** tab
2. Filter: `orders`
3. Click on the failed `/api/orders` request
4. Check **Headers** → **Request Headers**
5. Look for: `Cookie: sb-access-token=...`

**If Cookie header is MISSING:**
- Cookies aren't being sent
- Check `withCredentials: true` in axios config
- Check CORS allows credentials

**If Cookie header EXISTS:**
- Cookies are being sent ✅
- Problem is on Railway backend (cookie validation failing)

---

## Step 3: Check Railway Backend Logs

1. Go to: https://railway.app
2. Navigate to your project
3. Click on your service
4. Go to **Logs** tab
5. Look for errors when `/api/orders` is called

**What to look for:**
- "Missing access token" errors
- "Invalid or expired authentication token" errors
- CORS errors

---

## Step 4: Test Cookie Setting

### Sign Out and Sign In Again

1. Click **Sign Out** in the app
2. Clear all cookies for both domains:
   - `creative-studio-saas.pages.dev`
   - `creative-studio-saas-production.up.railway.app`
3. Sign in again
4. Check cookies are set:
   - DevTools → Application → Cookies
   - Should see `sb-access-token` cookie

---

## Step 5: Verify VITE_API_BASE_URL

The warning about `import.meta` in console is just because you can't use it directly in console.

### To Check VITE_API_BASE_URL:

**Option A: Check Cloudflare Dashboard**
1. Go to: https://dash.cloudflare.com
2. Workers & Pages → creative-studio-saas → Settings → Environment variables
3. Look for `VITE_API_BASE_URL`
4. Should be: `https://creative-studio-saas-production.up.railway.app`

**Option B: Check Network Tab**
1. Open DevTools → Network
2. Look at any `/api/orders` request
3. Check the **Request URL**
4. Should start with: `https://creative-studio-saas-production.up.railway.app/api/orders`

If it shows `creative-studio-saas.pages.dev` instead → `VITE_API_BASE_URL` not set!

---

## Step 6: Test Authentication Flow

### Manual Test:

```javascript
// In browser console, test the session endpoint
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Session:', data))
.catch(err => console.error('Error:', err));
```

**Expected Result:**
```json
{ "user": { "id": "...", "email": "...", ... } }
```

**If you get:**
```json
{ "user": null }
```
→ You're not authenticated! Sign in again.

---

## Common Issues & Fixes

### Issue 1: Cookies Not Set After Sign In

**Check:**
1. Sign in flow completes without errors
2. Network tab shows 200 response from `/api/auth/signin`
3. Response headers include `Set-Cookie: sb-access-token=...`

**Fix:**
- Check Railway backend CORS allows credentials
- Check `SameSite=None; Secure` is set (required for cross-origin)

### Issue 2: Cookies Not Being Sent

**Check:**
1. Cookies exist in Application tab
2. But Cookie header missing in Network tab

**Fix:**
- Verify `withCredentials: true` in axios config ✅ (already set)
- Check CORS `Access-Control-Allow-Credentials: true` on Railway ✅ (should be set)

### Issue 3: Railway Backend Rejecting Cookies

**Check:**
1. Cookies are being sent ✅
2. But Railway returns 401

**Possible Causes:**
- Cookie format wrong
- Token expired
- Railway backend not reading cookies correctly

**Fix:**
- Check Railway logs for specific error
- Verify cookie name matches: `sb-access-token`
- Check Railway backend code reads cookies correctly

---

## Quick Diagnostic Commands

### In Browser Console:

```javascript
// 1. Check cookies
document.cookie

// 2. Check specific cookie
document.cookie.split(';').find(c => c.includes('sb-access-token'))

// 3. Test session endpoint
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)

// 4. Check if VITE_API_BASE_URL is in build
// (Can't check import.meta in console, but check Network tab URL instead)
```

---

## Next Steps

Based on what you find:

1. **If cookies not set** → Sign in again, check signin response
2. **If cookies not sent** → Check CORS configuration
3. **If cookies sent but 401** → Check Railway backend logs
4. **If VITE_API_BASE_URL wrong** → Update in Cloudflare and redeploy

---

**Need more help?** Share:
1. Do you see `sb-access-token` cookie in Application tab?
2. Does Network tab show Cookie header in requests?
3. What do Railway logs show?

