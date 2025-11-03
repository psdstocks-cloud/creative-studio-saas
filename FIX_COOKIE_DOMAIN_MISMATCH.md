# 🔧 Fix: Cookie Domain Mismatch Issue

## The Problem

You signed in **before** we fixed `bffPost` to use `VITE_API_BASE_URL`. At that time:
- Sign-in went to: `creative-studio-saas.pages.dev/api/auth/signin` (Cloudflare Functions)
- Cookies were set on: `creative-studio-saas.pages.dev` domain

But now:
- Requests go to: `creative-studio-saas-production.up.railway.app/api/*` (Railway backend)
- Cookies from Cloudflare domain don't work for Railway domain

**Result**: Frontend shows you're signed in (from old session), but backend can't see your cookies (wrong domain).

---

## The Solution

You need to **sign in again** so cookies are set by Railway backend.

### Step 1: Sign Out

1. Click **Sign Out** button in the sidebar
2. This clears cookies from Cloudflare domain

### Step 2: Clear All Cookies (Recommended)

**In Chrome:**
1. Press `F12` → DevTools
2. Go to **Application** tab
3. Click **Cookies** in left sidebar
4. Select `https://creative-studio-saas.pages.dev`
5. Right-click → **Clear all**
6. Also clear cookies for `https://creative-studio-saas-production.up.railway.app` if visible

**In Firefox:**
1. Press `F12` → DevTools
2. Go to **Storage** tab
3. Click **Cookies** → `https://creative-studio-saas.pages.dev`
4. Delete all cookies

### Step 3: Sign In Again

1. Click **Sign In** 
2. Enter your credentials
3. Now sign-in goes to Railway (fixed with our `bffPost` update)
4. Cookies will be set by Railway backend

### Step 4: Verify It Works

**In Browser Console:**
```javascript
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Session:', data);
  if (data.user) {
    console.log('✅ SUCCESS! Cookies working correctly');
  } else {
    console.log('❌ Still not working - check cookies');
  }
});
```

**Check Cookies:**
1. DevTools → Application → Cookies
2. Look for `sb-access-token` cookie
3. **Important**: Check which domain it's on
   - ✅ Should be: `creative-studio-saas-production.up.railway.app` (or no domain = works for both)
   - ❌ If it's: `creative-studio-saas.pages.dev` → Wrong! Clear and sign in again

---

## Why This Happens

### Cross-Origin Cookie Behavior

When you set a cookie from `domain-a.com`, it's only sent to `domain-a.com` requests.

**Even with `SameSite=None`:**
- ✅ Allows cookies to be sent cross-origin (from Cloudflare → Railway)
- ❌ But cookie must be **set** by the domain you want to use it on

**Before Fix:**
```
Sign-in: creative-studio-saas.pages.dev/api/auth/signin
Cookie set on: creative-studio-saas.pages.dev domain
Requests to: creative-studio-saas-production.up.railway.app/api/orders
Result: Cookie not sent (wrong domain) ❌
```

**After Fix:**
```
Sign-in: creative-studio-saas-production.up.railway.app/api/auth/signin
Cookie set on: creative-studio-saas-production.up.railway.app domain
Requests to: creative-studio-saas-production.up.railway.app/api/orders
Result: Cookie sent automatically ✅
```

---

## Quick Test Commands

### 1. Check Current Cookies
```javascript
// In console
document.cookie.split(';').filter(c => c.includes('sb-access-token'))
```

### 2. Test Session (should work after re-signin)
```javascript
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log(d.user ? '✅ Authenticated' : '❌ Not authenticated'))
```

### 3. Check Cookie Domain
```javascript
// In Application tab, check Cookie details
// Domain should match Railway URL or be empty (empty = works for both)
```

---

## After Re-Signing In

Once you sign in again:
- ✅ Cookies set by Railway backend
- ✅ Cookies work for Railway requests
- ✅ `/api/orders` will return 200 (not 401)
- ✅ Session check will return your user object

---

## If It Still Doesn't Work

1. **Check VITE_API_BASE_URL is set:**
   - Cloudflare Dashboard → Environment variables
   - Should be: `https://creative-studio-saas-production.up.railway.app`

2. **Check Network Tab:**
   - When you sign in, check Request URL
   - Should be: `https://creative-studio-saas-production.up.railway.app/api/auth/signin`
   - If it's `creative-studio-saas.pages.dev` → `VITE_API_BASE_URL` not set!

3. **Check Response Headers:**
   - Sign-in response should have `Set-Cookie` headers
   - Cookie should have `SameSite=None; Secure`

4. **Check Railway Backend:**
   - Railway logs should show sign-in request
   - No CORS errors

---

**Bottom Line**: Sign out, clear cookies, sign in again. The new sign-in will use Railway and set cookies correctly! 🎯

