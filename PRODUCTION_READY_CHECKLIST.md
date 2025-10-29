# 🚀 Production Ready Checklist

Complete guide to make your Creative Studio SaaS production-ready.

---

## ✅ Phase 1: Third-Party Services Setup

### 🔴 REQUIRED - Supabase (Database & Auth)

**Status:** ⚠️ YOU MUST SET THIS UP

**What it provides:**
- PostgreSQL database
- User authentication
- Row-level security
- Real-time subscriptions

**Setup Steps:**

1. **Create Supabase Project**
   ```
   → Go to: https://supabase.com/dashboard
   → Click "New Project"
   → Choose a name and region
   → Wait 2-3 minutes for provisioning
   ```

2. **Get Credentials**
   ```
   → Settings → API
   → Copy "Project URL" → VITE_SUPABASE_URL
   → Copy "anon public" key → VITE_SUPABASE_ANON_KEY
   → Copy "service_role" key → SUPABASE_SERVICE_ROLE_KEY (KEEP SECRET!)
   ```

3. **Run Database Migrations**
   
   **Option A - Using SQL Editor (Easier):**
   ```
   → Go to SQL Editor in Supabase dashboard
   → Run these files IN ORDER:
      1. database-setup.sql
      2. migrations/002_fix_balance_decimal.sql
      3. migrations/003_secure_balance_controls.sql
      4. migrations/004_secure_order_transaction.sql
      5. migrations/005_billing.sql
      6. migrations/006_adjust_billing_rls.sql
   ```
   
   **Option B - Using CLI (Advanced):**
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. **Configure Authentication**
   ```
   → Authentication → URL Configuration
   → Site URL: https://your-app.pages.dev
   → Redirect URLs: https://your-app.pages.dev/**
   → Email templates: See SUPABASE_EMAIL_TEMPLATES.md
   ```

5. **Create First Admin User**
   After deploying, run this SQL to make yourself admin:
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{roles}',
     '["admin"]'::jsonb
   )
   WHERE email = 'your-email@example.com';
   ```

**Cost:** Free tier (500MB DB, 50K users, 2GB bandwidth)

---

### 🔴 REQUIRED - Stock API (nehtw.com)

**Status:** ⚠️ YOU MUST CONTACT VENDOR

**What it provides:**
- Stock media downloads from 40+ platforms
- Adobe Stock, Shutterstock, Freepik, Envato, etc.

**Setup Steps:**

1. **Contact nehtw.com**
   ```
   → Email: contact@nehtw.com
   → Request: API access for stock downloads
   → Provide: Expected monthly volume
   ```

2. **Receive API Key**
   ```
   → They will provide: STOCK_API_KEY
   → Base URL: https://nehtw.com/api
   ```

3. **Test API**
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
        https://nehtw.com/api/stockinfo/shutterstock/123456
   ```

**Cost:** Contact vendor for pricing (typically pay-per-download or monthly subscription)

**Without this:** Stock download feature will not work. Users will see error messages.

---

### 🟡 OPTIONAL - Google Gemini AI

**Status:** ⚙️ OPTIONAL (AI enhancement feature)

**What it provides:**
- AI prompt enhancement for better image generation
- Text-to-image suggestions

**Setup Steps:**

1. **Get API Key**
   ```
   → Go to: https://makersuite.google.com/app/apikey
   → Sign in with Google
   → Click "Create API Key"
   → Copy key → GEMINI_API_KEY
   ```

**Cost:** Free (60 requests/min), Paid tiers available

**Without this:** AI Generator will work but without prompt enhancement feature.

---

### 🟢 RECOMMENDED - Sentry (Error Tracking)

**Status:** ⚙️ HIGHLY RECOMMENDED for production

**What it provides:**
- Real-time error tracking
- Performance monitoring
- User session replay
- Stack traces

**Setup Steps:**

1. **Create Account**
   ```
   → Go to: https://sentry.io
   → Create free account
   → New project → React
   → Copy DSN
   ```

2. **Install SDK**
   ```bash
   npm install @sentry/react
   ```

3. **Update `src/index.tsx`**
   Add after imports:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       environment: 'production',
       tracesSampleRate: 0.1,
       replaysSessionSampleRate: 0.1,
       replaysOnErrorSampleRate: 1.0,
       integrations: [
         new Sentry.BrowserTracing(),
         new Sentry.Replay(),
       ],
     });
   }
   ```

4. **Update `src/lib/logger.ts`**
   Uncomment Sentry integration (lines 38-41, 49-52):
   ```typescript
   import * as Sentry from '@sentry/react';
   
   // In warn() method:
   if (isProduction && typeof Sentry !== 'undefined') {
     Sentry.captureMessage(message, { level: 'warning', extra: context });
   }
   
   // In error() method:
   if (isProduction && typeof Sentry !== 'undefined') {
     Sentry.captureException(error, { extra: { message, ...context } });
   }
   ```

5. **Add Environment Variable**
   ```bash
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

**Cost:** Free (5K errors/month), Team $26/month (50K errors)

---

### 🟢 RECOMMENDED - Uptime Monitoring

**Status:** ⚙️ RECOMMENDED for production alerts

**Recommended: UptimeRobot (Free)**

1. **Setup**
   ```
   → Go to: https://uptimerobot.com
   → Create free account
   → Add Monitor → HTTP(s)
   → URL: https://your-app.pages.dev
   → Interval: 5 minutes
   → Add another for backend: https://your-api.railway.app/health
   ```

2. **Configure Alerts**
   ```
   → Email notifications
   → SMS (optional, paid)
   → Slack/Discord webhooks
   ```

**Cost:** Free (50 monitors, 5-min checks)

**Alternatives:**
- Better Uptime (free, 10 monitors, 3-min checks)
- Pingdom (paid, advanced features)

---

## ✅ Phase 2: Environment Variables Configuration

### Frontend Variables (Cloudflare Pages)

Add these in Cloudflare Pages dashboard:

```bash
# REQUIRED
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# OPTIONAL
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Backend Variables (Railway/Render)

Add these in your backend hosting provider:

```bash
# REQUIRED
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ KEEP SECRET!
STOCK_API_KEY=your-stock-api-key
STOCK_API_BASE_URL=https://nehtw.com/api
NODE_ENV=production

# OPTIONAL (with sensible defaults)
GEMINI_API_KEY=your-gemini-key
SESSION_COOKIE_NAME=css_bff_session
SESSION_TTL_MS=28800000
RATE_LIMIT_MAX_REQUESTS=120
PORT=3000
```

**Reference:** See `env.example` for complete list

---

## ✅ Phase 3: Code Polishing (Already Done)

### ✅ Completed High Priority Items

- ✅ Installed proper dependencies (React Query, Axios, shadcn/ui)
- ✅ Added shadcn/ui components (Dialog, Form, Input, Toast, etc.)
- ✅ Replaced `window.prompt()` with proper modals
- ✅ Added detail pages for orders
- ✅ Implemented Error Boundaries
- ✅ Form validation with Zod + react-hook-form
- ✅ Skeleton loaders and empty states
- ✅ Toast notification system
- ✅ Table sorting functionality
- ✅ ESLint + Prettier setup

### ⚠️ Remaining Placeholders to Review

**Pricing Plans** (`src/pages/Billing.tsx`, `src/pages/Pricing.tsx`)

The app has fallback pricing plans hardcoded:
```typescript
FALLBACK_PLANS = [
  { id: 'starter_m', name: 'Starter', price_cents: 900 }, // $9/month
  { id: 'pro_m', name: 'Pro', price_cents: 1900 },       // $19/month
  { id: 'agency_m', name: 'Agency', price_cents: 4900 }, // $49/month
]
```

**Action Required:**
1. Review pricing in database (should be in `billing_plans` table)
2. Update prices if needed using Supabase SQL Editor:
   ```sql
   UPDATE billing_plans 
   SET price_cents = 1200  -- $12/month
   WHERE id = 'starter_m';
   ```
3. Or keep fallback plans as-is (they're reasonable defaults)

---

## ✅ Phase 4: Deployment

### Frontend Deployment (Cloudflare Pages)

**Estimated Time:** 10 minutes

1. **Create Cloudflare Pages Project**
   ```
   → https://dash.cloudflare.com
   → Workers & Pages → Create → Pages → Connect to Git
   → Select your repository
   → Framework preset: Vite
   → Build command: npm run build
   → Output directory: dist
   ```

2. **Add Environment Variables**
   ```
   → Settings → Environment variables
   → Add VITE_SUPABASE_URL
   → Add VITE_SUPABASE_ANON_KEY
   → Add VITE_SENTRY_DSN (optional)
   ```

3. **Deploy**
   ```
   → Click "Save and Deploy"
   → Wait 2-3 minutes
   → Copy your URL: https://your-app.pages.dev
   ```

4. **Configure Custom Domain (Optional)**
   ```
   → Custom domains → Add custom domain
   → Add your domain: app.yourdomain.com
   → Update DNS records as instructed
   ```

**Full Guide:** See `CLOUDFLARE_PAGES_SETUP.md`

---

### Backend Deployment (Railway - Recommended)

**Estimated Time:** 15 minutes

1. **Create Railway Project**
   ```
   → https://railway.app
   → New Project → Deploy from GitHub repo
   → Select your repository
   ```

2. **Configure Build**
   ```
   → Settings → Build Command: npm install
   → Start Command: node server.js
   → Healthcheck Path: /health (add this endpoint)
   ```

3. **Add Environment Variables**
   ```
   → Variables → Add all backend variables
   → SUPABASE_URL
   → SUPABASE_SERVICE_ROLE_KEY
   → STOCK_API_KEY
   → GEMINI_API_KEY (optional)
   → NODE_ENV=production
   ```

4. **Generate Domain**
   ```
   → Settings → Generate Domain
   → Copy: https://your-app.railway.app
   → Update VITE_DEV_API_TARGET if needed
   ```

**Alternative:** Render.com (free tier available)

---

## ✅ Phase 5: Post-Deployment Configuration

### Update Supabase Auth URLs

**CRITICAL:** Must do this or auth won't work!

```
→ Supabase → Authentication → URL Configuration
→ Site URL: https://your-app.pages.dev
→ Redirect URLs: https://your-app.pages.dev/**
→ Save
```

### Test Critical Paths

1. ✅ Sign up new user
2. ✅ Sign in
3. ✅ Password reset email
4. ✅ Order stock media (requires STOCK_API_KEY)
5. ✅ AI generation (requires GEMINI_API_KEY)
6. ✅ Admin panel (make yourself admin first)
7. ✅ Billing/subscription flow

---

## ✅ Phase 6: Production Optimizations

### Security Headers

Already configured in `public/_headers`:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Performance

Already optimized:
- ✅ Code splitting with lazy loading
- ✅ Tree shaking (Vite default)
- ✅ Minification (Vite production build)
- ✅ Gzip compression (Cloudflare auto)

### Monitoring

Set up:
- ✅ Sentry for errors (if configured)
- ✅ UptimeRobot for availability
- ✅ Supabase dashboard for DB metrics
- ✅ Cloudflare Analytics (free)

---

## 🎯 Final Checklist

### Before Going Live

- [ ] All third-party services configured
- [ ] Environment variables set in hosting providers
- [ ] Supabase migrations run
- [ ] First admin user created
- [ ] Pricing plans configured
- [ ] Auth URLs updated in Supabase
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring set up
- [ ] Custom domain configured (optional)
- [ ] SSL certificate valid (auto with Cloudflare)
- [ ] All critical paths tested

### Day 1 Production

- [ ] Monitor error rates in Sentry
- [ ] Check uptime monitoring alerts
- [ ] Review Supabase database metrics
- [ ] Test user registration flow
- [ ] Test payment flow (if billing enabled)

### Week 1

- [ ] Analyze user behavior
- [ ] Review error patterns
- [ ] Optimize slow queries (Supabase dashboard)
- [ ] Gather user feedback

---

## 🚨 Troubleshooting

### Common Issues

**1. "Missing Supabase credentials"**
- Check environment variables in hosting dashboard
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Rebuild and redeploy

**2. "Auth redirect not working"**
- Update Redirect URLs in Supabase
- Must include `https://your-app.pages.dev/**`

**3. "Stock API returns 401"**
- Verify `STOCK_API_KEY` is set in backend
- Contact nehtw.com if key is invalid

**4. "Admin panel not accessible"**
- Run SQL to grant admin role (see Phase 1)
- Sign out and sign in again
- Check browser console for errors

**5. "Payments not working"**
- Verify billing tables exist in database
- Run migration `005_billing.sql`
- Check Supabase logs for RLS errors

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Cloudflare Docs:** https://developers.cloudflare.com/pages
- **Railway Docs:** https://docs.railway.app
- **Sentry Docs:** https://docs.sentry.io
- **Stock API:** contact@nehtw.com
- **This Project:** See `THIRD_PARTY_SETUP.md`, `PRODUCTION_SETUP.md`

---

## 📊 Cost Summary

**Minimum (Free/Hobby Tier):**
- Supabase: Free
- Cloudflare Pages: Free
- Railway: ~$5/month
- Stock API: Pay per download
- **Total: ~$5/month + stock costs**

**Recommended (Small Business):**
- Supabase Pro: $25/month
- Cloudflare Pages: Free
- Railway: ~$10-20/month
- Stock API: ~$50-500/month (volume-based)
- Sentry: Free or $26/month
- **Total: ~$60-600/month**

---

## 🎉 You're Ready!

All code is production-ready. Complete the third-party setup above and deploy!

**Questions?** Review the documentation files:
- `THIRD_PARTY_SETUP.md` - Detailed service setup
- `PRODUCTION_SETUP.md` - Alternative deployment options
- `SUPABASE_EMAIL_TEMPLATES.md` - Email customization
- `env.example` - Complete environment variable reference

