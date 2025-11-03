# Cookie Diagnostic Steps

## Quick Diagnostic (Run in Browser Console)

After signing in, open the browser console and run:

```javascript
// Check what cookies JavaScript can see (non-HttpOnly only)
console.log('Visible cookies:', document.cookie);

// Check if cookies are set after sign-in
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('Session check:', data);
    if (data.user) {
      console.log('✅ User found:', data.user.email);
    } else {
      console.log('❌ User is null - cookies likely not being sent');
    }
  });

// Check Network tab manually:
// 1. Open DevTools → Network tab
// 2. Refresh page
// 3. Click on "session" request
// 4. Check "Request Headers" section
// 5. Look for "Cookie:" header
// 6. If missing, cookies aren't being sent!
```

## Common Issues

### Issue 1: Cookies Not Set During Sign-In
**Symptoms:** After sign-in, cookies don't appear in browser storage
**Check:**
1. Sign in to your app
2. Open DevTools → Application → Cookies → `https://creative-studio-saas.pages.dev`
3. Look for `sb-access-token` and `XSRF-TOKEN` cookies
4. If missing → cookies weren't set during sign-in

**Solution:** Check Cloudflare logs during sign-in for `[SIGNIN]` entries

### Issue 2: Cookies Set But Not Sent
**Symptoms:** Cookies exist in browser storage, but `Cookie:` header missing in Network tab
**Check:**
1. Application → Cookies → Check if cookies exist
2. Network → session request → Request Headers → Check if `Cookie:` header exists
3. If cookies exist but header missing → SameSite/Secure/Domain issue

**Solution:** 
- Check cookie attributes (SameSite, Secure, Domain, Path)
- For production (HTTPS): SameSite=None + Secure=true required
- For development (HTTP): SameSite=Lax + Secure=false

### Issue 3: Cookies Sent But Not Extracted
**Symptoms:** `Cookie:` header present, but session returns `user: null`
**Check:**
1. Network tab → session request → Request Headers → Cookie header
2. Verify it includes `sb-access-token=...`
3. Check Cloudflare logs for `[SESSION]` entries
4. Should see: `hasSbAccessToken: true` in logs

**Solution:** Check `extractAccessToken` function in `functions/_lib/supabase.ts`

## Step-by-Step Debugging

### Step 1: Verify Sign-In Sets Cookies
1. Open DevTools → Network tab
2. Sign in to your app
3. Find the `signin` POST request
4. Check Response Headers → Look for `Set-Cookie:` headers
5. Should see:
   ```
   Set-Cookie: sb-access-token=...; HttpOnly; Path=/; SameSite=None; Secure
   Set-Cookie: XSRF-TOKEN=...; Path=/; SameSite=None; Secure
   ```

### Step 2: Verify Cookies Are Stored
1. Application → Cookies → `https://creative-studio-saas.pages.dev`
2. Should see `sb-access-token` and `XSRF-TOKEN`
3. Check their attributes:
   - **Path:** Should be `/`
   - **SameSite:** `None` (production) or `Lax` (dev)
   - **Secure:** `true` (production) or unchecked (dev)
   - **HttpOnly:** `sb-access-token` should be HttpOnly, `XSRF-TOKEN` should NOT be

### Step 3: Verify Cookies Are Sent
1. Refresh the page
2. Network tab → Find `session` request
3. Click it → Headers tab
4. Request Headers → Look for `Cookie:` header
5. Should include: `Cookie: sb-access-token=...; XSRF-TOKEN=...`

### Step 4: Check Cloudflare Logs
1. Cloudflare Dashboard → Workers & Pages → Your site
2. Click "Logs"
3. Look for `[SESSION]` entries
4. Should show:
   ```
   [SESSION] Request received: {
     hasCookieHeader: true,
     cookieNames: ['sb-access-token', 'xsrf-token'],
     hasSbAccessToken: true
   }
   ```

## Most Likely Cause

Based on your logs showing `user: null`, the most likely issue is:

**Cookies are not being sent with the request** due to:
1. SameSite/Domain mismatch
2. Cookies expired or cleared
3. Browser blocking third-party cookies (shouldn't happen for same-origin)

**Next Steps:**
1. Check Network tab Request Headers for `Cookie:` header
2. Check Application → Cookies to see if cookies exist
3. Share findings so we can fix the root cause
