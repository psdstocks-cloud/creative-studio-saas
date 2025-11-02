# 🚨 URGENT: Authentication Not Working - Quick Fix Required

## The Problem

Your authentication is broken because:
1. Frontend expects `/api/auth/signin` and `/api/auth/signout` endpoints
2. New cookie auth code was created in `functions/api/auth/*` (Cloudflare Functions)
3. But your backend runs on Railway which uses `server.js` (Express)
4. Railway's Express server doesn't have these endpoints → 404 errors

## The Solution: Two Options

### Option A: Add Endpoints to Railway Express (Recommended - 15 minutes)

Convert the Cloudflare Functions auth endpoints to Railway Express routes.

**Why:** Your architecture is Railway for backend, Cloudflare for frontend. Functions won't work.

### Option B: Full Cloudflare Functions Migration (Complex - 1 hour+)

Move ALL backend logic from Railway to Cloudflare Functions.

**Why Not:** Requires major refactoring, moving orders/stock/downloads endpoints too.

---

## Quick Fix: Add Express Routes (Option A)

### Step 1: Add Cookie/CSRF Utilities to Railway

Copy these files to `src/server/lib/`:
- `functions/_lib/cookie.ts` → `src/server/lib/cookie.js`
- `functions/_lib/csrf.ts` → `src/server/lib/csrf.js`

Convert TypeScript → JavaScript and adjust imports.

### Step 2: Add Sign-In Endpoint to server.js

Add after line 698 (after DELETE /api/auth/session):

```javascript
app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Authenticate with Supabase
    const tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': supabaseAdminClient.key,
        'Authorization': `Bearer ${supabaseAdminClient.key}`,
      },
      body: new URLSearchParams({ email, password, grant_type: 'password' }),
    });

    if (!tokenResponse.ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { access_token, user } = await tokenResponse.json();

    // Extract roles
    const roles = normalizeRoles(user.app_metadata?.roles || user.user_metadata?.roles);

    // Fetch balance
    let balance = 100;
    try {
      const { data: profile } = await supabaseAdminClient
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      if (profile) balance = Number(profile.balance) || 100;
    } catch {}

    // Set cookies
    const cookieOptions = buildAuthCookieOptions(IS_PROD);
    const cookieValue = serializeCookie('sb-access-token', access_token, cookieOptions);
    res.append('Set-Cookie', `${cookieValue}; HttpOnly`);

    // Set CSRF token
    const csrfToken = generateCsrfToken();
    res.append('Set-Cookie', serializeCsrfCookie(csrfToken, IS_PROD));

    // Return user
    return res.json({
      user: {
        id: user.id,
        email: user.email || '',
        roles,
        metadata: user.user_metadata || null,
        balance,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
});
```

### Step 3: Update Sign-Out Endpoint

Replace line 677 with POST instead of DELETE:

```javascript
app.post('/api/auth/signout', requireAuth, (req, res) => {
  if (req.session) {
    destroySession(req.session.id);
  }

  res.append('Set-Cookie', buildSessionCookie('', { isDeletion: true }));
  res.append('Set-Cookie', deleteCsrfCookie(IS_PROD));

  return res.status(200).json({ message: 'Signed out successfully' });
});
```

### Step 4: Update Session Endpoint

Modify line 665 to read from cookies AND refresh them:

```javascript
app.get('/api/auth/session', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  
  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies['sb-access-token'];

  if (!accessToken) {
    return res.json({ user: null });
  }

  try {
    const verifiedUser = await verifySupabaseAccessToken(accessToken);
    
    if (!verifiedUser) {
      return res.json({ user: null });
    }

    // Fetch balance
    let balance = 100;
    try {
      const { data: profile } = await supabaseAdminClient
        .from('profiles')
        .select('balance')
        .eq('id', verifiedUser.id)
        .single();
      if (profile) balance = Number(profile.balance) || 100;
    } catch {}

    // Refresh cookie
    const cookieOptions = buildAuthCookieOptions(IS_PROD);
    const cookieValue = serializeCookie('sb-access-token', accessToken, cookieOptions);
    res.append('Set-Cookie', `${cookieValue}; HttpOnly`);

    return res.json({
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        roles: verifiedUser.roles,
        metadata: verifiedUser.metadata,
        balance,
      },
    });
  } catch (error) {
    return res.json({ user: null });
  }
});
```

### Step 5: Update attachSession Middleware

Modify line 482 to check for `sb-access-token` cookie:

```javascript
const attachSession = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    
    // Check for new cookie auth first
    const accessToken = cookies['sb-access-token'];
    if (accessToken) {
      const verifiedUser = await verifySupabaseAccessToken(accessToken);
      if (verifiedUser) {
        req.user = verifiedUser;
        // Refresh cookie
        const cookieOptions = buildAuthCookieOptions(IS_PROD);
        const cookieValue = serializeCookie('sb-access-token', accessToken, cookieOptions);
        res.append('Set-Cookie', `${cookieValue}; HttpOnly`);
        return next();
      }
    }

    // Fallback to session-based auth
    const sessionId = cookies[SESSION_COOKIE_NAME];
    if (sessionId && sessionStore.has(sessionId)) {
      const session = sessionStore.get(sessionId);
      if (session.expiresAt <= Date.now()) {
        destroySession(sessionId);
      } else {
        req.session = session;
        req.user = session.user;
        if (refreshSession(session)) {
          res.append('Set-Cookie', buildSessionCookie(session.id, { expiresAt: session.expiresAt }));
        }
        return next();
      }
    }

    // Try Authorization header
    const authHeader = req.headers['authorization'];
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (bearerToken) {
      const verifiedUser = await verifySupabaseAccessToken(bearerToken);
      if (verifiedUser) {
        const session = createSession(verifiedUser);
        req.session = session;
        req.user = session.user;
        res.append('Set-Cookie', buildSessionCookie(session.id, { expiresAt: session.expiresAt }));
        writeAuditEntry({
          requestId: req.requestId,
          action: 'auth.session.created',
          actor: { id: verifiedUser.id, email: verifiedUser.email, roles: verifiedUser.roles },
          method: req.method,
          path: req.originalUrl,
          status: 200,
          metadata: { authType: 'bearer' },
        });
        return next();
      }
    }

    next();
  } catch (error) {
    console.error('attachSession error:', error);
    next();
  }
};
```

---

## Alternative: Revert to Working Version (Option B - 5 minutes)

**Fastest way to get back online:**

```bash
# Revert AuthContext changes
git checkout 92724cb -- src/contexts/AuthContext.tsx
git checkout 92724cb -- src/services/bffSession.ts
git checkout 92724cb -- src/services/api.ts
git checkout 92724cb -- src/services/supabaseClient.ts
git checkout 92724cb -- src/App.tsx

# Remove new files
rm -rf src/hooks/useSessionRefresh.ts
rm -rf src/utils/cookies.ts

# Commit and push
git add -A
git commit -m "fix: Revert to working Supabase auth"
git push origin main
```

This reverts to localStorage-based auth which was working before.

---

## My Recommendation

**For now:** Revert (Option B) to get production working immediately  
**Later:** Implement proper cookie auth on Railway (Option A)

Cookie auth is better, but it requires proper implementation on your actual backend (Railway Express).

---

## Next Steps After Revert

1. Test sign in - should work immediately
2. Then properly implement cookie auth on Express
3. Or migrate fully to Cloudflare Functions if you want

**Let me know which option you want and I'll implement it!**

