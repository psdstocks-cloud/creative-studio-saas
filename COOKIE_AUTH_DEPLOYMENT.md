# Cookie Authentication - Production Deployment Guide

## Pre-Deployment Checklist

### Environment Variables

#### Cloudflare Pages (Frontend)
No changes needed for cookie auth. Existing env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (Railway backend URL)

#### Railway/Backend (API)
Ensure these are set:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Private service role key (for admin operations)

### CORS Origins

Backend endpoints check `ALLOWED_ORIGINS` arrays. Ensure production domain is included:

In `functions/api/auth/signin.ts`:
```typescript
const ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev', // Production
  'http://localhost:5173',
  'http://localhost:3000',
];
```

Update `ALLOWED_ORIGINS` in:
- `functions/api/auth/signin.ts`
- `functions/api/auth/session.ts`
- `functions/api/auth/signout.ts`

Or use environment variables for dynamic origins.

## Deployment Steps

### 1. Deploy Backend First
Push to Railway or your backend platform:

```bash
git push railway main
```

Or deploy Functions to Cloudflare Pages:
```bash
npx wrangler pages deploy dist
```

### 2. Verify Backend Endpoints
Test the new auth endpoints:

```bash
# Test sign in
curl -X POST https://your-api.railway.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' \
  -i

# Should return:
# - Set-Cookie: sb-access-token=...; HttpOnly; Secure; SameSite=None; Max-Age=259200
# - Set-Cookie: XSRF-TOKEN=...
```

### 3. Deploy Frontend
Push to Cloudflare Pages:

```bash
git push origin main
```

Or manual deploy:
```bash
npm run build
npx wrangler pages deploy dist
```

### 4. Test Authentication Flow

1. **Sign In**
   - Open browser DevTools → Network tab
   - Sign in with test account
   - Verify cookies are set:
     - `sb-access-token` (HttpOnly, Secure, SameSite=None)
     - `XSRF-TOKEN` (Secure, SameSite=None)

2. **Session Persistence**
   - Refresh page
   - Verify you stay logged in
   - Check Network tab for `/api/auth/session` call
   - Verify cookies are refreshed (new expiration)

3. **Sign Out**
   - Click logout
   - Verify cookies are cleared
   - Verify redirected to login

4. **CSRF Protection**
   - Make a POST request without CSRF token
   - Should get 403 Forbidden
   - Make request with valid CSRF token
   - Should succeed

## Troubleshooting

### Cookies Not Being Set

**Symptom**: After sign in, cookies don't appear in DevTools

**Possible causes**:
1. Backend CORS not allowing credentials
   - Check `Access-Control-Allow-Credentials: true` in response headers
   - Check origin is in `ALLOWED_ORIGINS`

2. `SameSite=None` without `Secure`
   - Verify `secure` flag is set in production
   - Check cookie utility detects non-localhost

3. Different domains (cross-origin)
   - Ensure frontend and backend both use HTTPS
   - Check cookie `Domain` attribute isn't set incorrectly

**Fix**:
```bash
# Check backend logs for CORS errors
railway logs

# Verify cookie headers in response
curl -i https://your-api.railway.app/api/auth/signin ...
```

### CSRF Token Mismatch

**Symptom**: POST requests return 403 Forbidden

**Possible causes**:
1. CSRF token cookie not being read
   - Check cookie `XSRF-TOKEN` exists
   - Verify it's not HttpOnly

2. CSRF header missing
   - Check `X-CSRF-Token` header is sent
   - Verify API client includes CSRF token

**Fix**:
```javascript
// In browser console
document.cookie // Check XSRF-TOKEN exists

// Check network request headers
// Should include: X-CSRF-Token: <token>
```

### Session Expires Too Quickly

**Symptom**: User logged out after short time

**Possible causes**:
1. Session refresh not working
   - Check `useSessionRefresh` is called
   - Verify `/api/auth/session` is called periodically

2. Cookie expiration too short
   - Check `maxAge` in cookie utils
   - Verify it's 259200 (3 days)

**Fix**:
```bash
# Check session endpoint is called
# Should be called every 2 days for active users

# Check cookie expiration
# Should be 3 days from last activity
```

### Cross-Origin Issues

**Symptom**: Cookies not sent with requests

**Possible causes**:
1. CORS not configured
   - Verify `withCredentials: true` in Axios
   - Check `Access-Control-Allow-Origin` is specific (not `*`)
   - Ensure `Access-Control-Allow-Credentials: true`

2. SameSite conflict
   - Verify `SameSite=None` in production
   - Check `Secure` flag is set

**Fix**:
```typescript
// In functions/_lib/http.ts or similar
const headers = new Headers();
headers.set('Access-Control-Allow-Origin', specificOrigin);
headers.set('Access-Control-Allow-Credentials', 'true');
```

## Monitoring

### Key Metrics to Watch

1. **Authentication Failures**
   - Monitor 401 responses on `/api/auth/signin`
   - Should be low for legitimate users

2. **CSRF Rejections**
   - Monitor 403 responses
   - Should be near zero for legitimate users
   - High counts indicate attack or misconfiguration

3. **Session Validations**
   - Monitor `/api/auth/session` calls
   - Should correlate with page loads

4. **Cookie Setting Failures**
   - Check backend logs for cookie setting errors
   - Should be rare

### Logging

Backend logs should include:
- Cookie setting success/failure
- CSRF token validation
- Session validation results
- Balance fetch from profiles

Example log entry:
```
[Session] User authenticated: user@example.com, balance: 150, roles: [user]
[Cookie] Refreshed sb-access-token for user@example.com
```

## Rollback Plan

If issues occur, you can quickly rollback:

1. **Revert Git commits**:
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Redeploy previous version**:
   ```bash
   # Cloudflare Pages
   npx wrangler pages deployments list
   npx wrangler pages deployment rollback <deployment-id>
   
   # Railway
   railway rollback
   ```

3. **Environment toggle** (if implemented):
   ```bash
   # Disable cookie auth via feature flag
   ENABLE_COOKIE_AUTH=false
   ```

## Success Criteria

✅ Authentication works in production  
✅ Session persists across page refreshes  
✅ No increased 401/403 errors  
✅ No user complaints about re-login  
✅ No security incidents  

## Post-Deployment

1. **Monitor for 24 hours**
   - Watch error rates
   - Check user feedback
   - Verify session persistence

2. **Run security checks**
   - Test CSRF protection
   - Verify HttpOnly cookies
   - Check Secure flag in production

3. **Document any issues**
   - Update troubleshooting guide
   - Add to runbook

## Support

If issues persist:
1. Check logs for specific error messages
2. Test in DevTools Network tab
3. Verify environment variables
4. Check CORS configuration
5. Contact team lead or DevOps

---

**Remember**: Cookies provide better security than localStorage, but proper configuration is critical for cross-origin deployments. Always test thoroughly before production rollout!

