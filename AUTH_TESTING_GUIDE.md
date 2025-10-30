# Authentication Testing Guide

This guide explains how to test that the backend session validation is working correctly and there are no 401 authentication errors.

## Quick Start

### Option 1: Automated Script

```bash
# 1. Get your access token (see "Getting Your Access Token" below)
export ACCESS_TOKEN="your_supabase_access_token_here"

# 2. Run the test script
./test-auth.sh

# Or specify a different API URL
API_BASE_URL="https://your-app.pages.dev" ./test-auth.sh
```

### Option 2: Manual Testing

Follow the step-by-step guide below.

---

## Getting Your Access Token

### Method 1: From Browser Console (EASIEST)

**Open browser console (F12) after logging in and paste:**

```javascript
// This app uses custom storage key 'creative-studio-auth'
const authData = localStorage.getItem('creative-studio-auth')
if (authData) {
  const parsed = JSON.parse(authData)
  console.log('✅ Access Token:', parsed.access_token)
  console.log('Copy this token ↑')
} else {
  console.log('❌ Not logged in or session not found')
}
```

**Alternative methods if above doesn't work:**

```javascript
// Method 2: Find all auth-related localStorage keys
Object.keys(localStorage)
  .filter(key => key.includes('auth') || key.includes('sb-'))
  .forEach(key => console.log(key, localStorage.getItem(key)))

// Method 3: Get session from Supabase client directly
// First import the client, then run:
const { data: { session } } = await supabase.auth.getSession()
console.log('Access Token:', session?.access_token)
```

### Method 2: From Browser DevTools

1. **Login to your app** in a browser
2. **Open DevTools** (Press F12 or Right-click → Inspect)
3. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
4. **Look in Local Storage** under your domain:
   - Find key named `creative-studio-auth`
   - The value is JSON - look for `access_token` property
5. **Alternative: Check Cookies**:
   - Look for cookies like `sb-*-auth-token` or `sb-*-access-token`
   - Copy the value

### Method 3: From Network Tab (MOST RELIABLE)

1. **Login to your app**
2. **Open DevTools → Network tab**
3. **Navigate to any page** that makes API calls (like Orders or Profile)
4. **Click on any `/api/` request** in the list
5. **Go to Headers tab**
6. **Look for Request Headers:**
   - Find `Authorization: Bearer <token>` header
   - Copy everything after "Bearer " (that's your token)
   - OR find `Cookie:` header with `sb-*-auth-token=<token>`

This method is most reliable because it shows exactly what token your app is sending!

---

## Manual Testing Steps

### 1. Test Session Endpoint

This endpoint validates your session and returns user data.

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8788/api/auth/session
```

**Expected Success Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": ["user"],
    "metadata": {}
  }
}
```

**Expected Failure (401):**
```json
{
  "user": null
}
```
- If you get `{ user: null }` with a valid token, **authentication is not working**
- If you get user data, **authentication is working** ✅

### 2. Test Profile Endpoint

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount": 0}' \
  http://localhost:8788/api/profile/deduct
```

**Expected Success (200):**
```json
{
  "balance": 100
}
```

**Expected Failure (401):**
```json
{
  "message": "Missing access token."
}
```

### 3. Test Orders Endpoint

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8788/api/orders
```

**Success:** Returns array of orders (or empty array)
**Failure (401):** Returns authentication error

### 4. Test Stock Sources Endpoint

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8788/api/stock-sources
```

**Success:** Returns array of stock sources
**Failure (401):** Returns authentication error

---

## Testing in the Browser

### Using Browser DevTools

1. **Login to your app**
2. **Open DevTools** (F12)
3. **Go to Network tab**
4. **Use the app** (e.g., visit profile, orders page, etc.)
5. **Check API requests** in the Network tab:
   - Look for requests to `/api/`
   - Click on any request
   - Check the **Status code**:
     - ✅ **200-299**: Success
     - ❌ **401**: Authentication failed
     - ⚠️ **400, 404, 500**: Other errors (not auth related)

### Using Console

```javascript
// Test session endpoint
fetch('/api/auth/session', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => {
    if (data.user) {
      console.log('✅ Auth working!', data.user);
    } else {
      console.log('❌ Auth not working - user is null');
    }
  });

// Test profile endpoint
fetch('/api/profile/deduct', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 0 })
})
  .then(r => {
    console.log('Status:', r.status);
    if (r.status === 401) {
      console.log('❌ Got 401 - Auth not working');
    } else {
      console.log('✅ Auth working - got status', r.status);
    }
    return r.json();
  })
  .then(data => console.log('Response:', data));
```

---

## Common Issues

### Issue 1: Always Getting 401

**Possible Causes:**
1. Session validation not deployed
2. Access token not being sent
3. Supabase environment variables not configured

**Check:**
```bash
# Check if session endpoint is updated
curl http://localhost:8788/api/auth/session
# Should NOT always return { user: null } even with valid token
```

### Issue 2: Token Not Being Sent

**Check Request Headers:**
- Authorization header should be: `Bearer <token>`
- OR cookies should include: `sb-*-access-token=<token>`

**Fix:**
- Make sure your client is sending credentials
- For fetch: `credentials: 'include'`
- For axios: `withCredentials: true`

### Issue 3: Environment Variables Not Set

**Check Cloudflare Environment:**
- Go to Cloudflare Dashboard
- Select your Pages project
- Settings → Environment variables
- Ensure these are set:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

---

## Expected Behavior

### ✅ Working Authentication

- Session endpoint returns user data with valid token
- API endpoints return 200 (success) or 400/404/500 (other errors)
- No 401 errors for authenticated users
- Browser network tab shows no 401 responses

### ❌ Broken Authentication

- Session endpoint returns `{ user: null }` with valid token
- API endpoints return 401 for all authenticated requests
- Browser console shows authentication errors
- Network tab shows 401 responses

---

## Testing Checklist

- [ ] Session endpoint returns user data when logged in
- [ ] Profile/deduct endpoint works (returns balance)
- [ ] Orders endpoint works (returns orders or empty array)
- [ ] Stock sources endpoint works
- [ ] Billing endpoints work
- [ ] No 401 errors in browser Network tab
- [ ] No authentication errors in browser Console
- [ ] App functions normally after login

---

## Automated Testing

For CI/CD or automated testing, you can use the test script:

```bash
#!/bin/bash

# Get token from Supabase
TOKEN=$(curl -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  | jq -r '.access_token')

# Run tests
export ACCESS_TOKEN="$TOKEN"
./test-auth.sh
```

---

## Need Help?

If you're still getting 401 errors after:
1. ✅ Backend session validation is deployed
2. ✅ Environment variables are set
3. ✅ Access token is being sent

Then check:
- Supabase project is active
- User exists and is confirmed
- Token hasn't expired (Supabase tokens expire after ~1 hour by default)
- No CORS issues (check browser console)
