# 🔍 Verify Cookies Are Actually Being Set

## Critical Test: Check Sign-In Response

The cookie header is missing from requests. Let's verify cookies are being **set** during sign-in.

### Step 1: Check Sign-In Network Request

1. **Open DevTools** → **Network** tab
2. **Clear network log** (trash icon)
3. **Sign in** with your credentials
4. **Find the `/api/auth/signin` request** (should be a POST request)
5. **Click on it** to see details
6. **Go to "Headers" tab**
7. **Look for "Response Headers"**
8. **Find `Set-Cookie` headers**

**What you should see:**
```
Set-Cookie: sb-access-token=...; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=259200
Set-Cookie: XSRF-TOKEN=...; Path=/; SameSite=None; Secure; Max-Age=259200
```

**If `Set-Cookie` headers are MISSING:**
- Railway backend isn't setting cookies
- Check Railway logs for errors

**If `Set-Cookie` headers EXIST:**
- Cookies are being set ✅
- But browser isn't storing them ❌
- Or browser isn't sending them ❌

---

## Step 2: Check If Cookies Are Stored

### After Sign-In, Immediately Check:

1. **DevTools** → **Application** tab (Chrome) or **Storage** tab (Firefox)
2. **Cookies** in left sidebar
3. **Click on:** `https://creative-studio-saas-production.up.railway.app`

**What to look for:**
- ✅ `sb-access-token` cookie with a value
- ✅ `XSRF-TOKEN` cookie with a value

**If cookies DON'T exist:**
- Browser rejected them during sign-in
- Check cookie attributes (SameSite, Secure)
- May be Chrome blocking third-party cookies

**If cookies EXIST:**
- Cookies are stored ✅
- But not being sent ❌
- Check `withCredentials: true` in axios config

---

## Step 3: Manual Cookie Test

### In Browser Console:

```javascript
// Check all cookies
document.cookie

// Check specific cookie (may not work if HttpOnly)
document.cookie.split(';').find(c => c.includes('sb-access-token'))

// Test if cookies work for Railway domain
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
})
.then(r => {
  console.log('Response headers:', [...r.headers.entries()]);
  return r.json();
})
.then(data => {
  console.log('Session data:', data);
  if (data.user) {
    console.log('✅ Cookies working!');
  } else {
    console.log('❌ Cookies not working');
  }
});
```

---

## Step 4: Check Sign-In Request Details

### In Network Tab, Find `/api/auth/signin` Request:

**Check Request:**
- **URL**: Should be `https://creative-studio-saas-production.up.railway.app/api/auth/signin`
- **Method**: `POST`
- **Request Headers**: Should have `Origin: https://creative-studio-saas.pages.dev`

**Check Response:**
- **Status**: Should be `200 OK`
- **Response Headers**: **MUST have `Set-Cookie` headers**
  - `Set-Cookie: sb-access-token=...`
  - `Set-Cookie: XSRF-TOKEN=...`

**Take a screenshot** of the Response Headers section showing Set-Cookie headers (if they exist).

---

## Common Issues

### Issue 1: Set-Cookie Headers Missing

**Symptoms:**
- Response doesn't show `Set-Cookie` headers
- Cookies not stored

**Possible Causes:**
- Railway CORS blocking Set-Cookie
- Express response not including headers
- Middleware issue

**Check Railway Logs:**
- Should show: `POST /api/auth/signin 200`
- No errors in logs

### Issue 2: Cookies Stored But Not Sent

**Symptoms:**
- Cookies exist in Application tab
- But Cookie header missing in requests

**Possible Causes:**
- `withCredentials: true` not working
- Browser blocking third-party cookies
- Cookie domain/path mismatch

**Fix:**
- Verify axios config has `withCredentials: true` ✅ (we checked, it's set)
- Check browser cookie settings
- Try different browser

### Issue 3: Browser Blocking Cookies

**Symptoms:**
- Set-Cookie headers present
- Cookies not stored
- Even in regular mode

**Possible Causes:**
- Chrome blocking third-party cookies (new default in Chrome 127+)
- Browser extension blocking cookies
- Privacy settings

**Fix:**
- Go to `chrome://settings/cookies`
- Enable: "Allow all cookies" or "Allow third-party cookies in regular browsing"
- Restart browser

---

## What I Need From You

Please provide:

1. **Screenshot of `/api/auth/signin` Response Headers**
   - Specifically showing if `Set-Cookie` headers exist

2. **Screenshot of Application → Cookies → Railway domain**
   - Showing if `sb-access-token` cookie exists

3. **Result of this test:**
```javascript
fetch('https://creative-studio-saas-production.up.railway.app/api/auth/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('User:', d.user ? d.user.email : 'null'));
```

4. **Chrome version:**
   - Go to: `chrome://version`
   - Share the version number (Chrome has been blocking third-party cookies by default in recent versions)

---

**Next Steps:**
Once we see where cookies are failing (not being set vs. not being sent), we can fix it!

