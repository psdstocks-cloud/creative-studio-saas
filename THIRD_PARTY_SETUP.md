# 🔧 Third-Party Services Setup Guide

Quick reference for setting up external services required by this application.

---

## 1. Supabase (Database & Authentication) ✅ REQUIRED

**What it does:** Provides PostgreSQL database, user authentication, and real-time subscriptions.

**Pricing:** Free tier includes 500MB database, 50,000 monthly active users, 2GB bandwidth.

### Setup Steps:

1. **Create Account & Project**
   - Go to: https://supabase.com/dashboard
   - Click "New Project"
   - Enter project details and choose region
   - Wait ~2 minutes for provisioning

2. **Get Credentials**
   - Navigate to: Settings → API
   - Copy `Project URL` → This is your `VITE_SUPABASE_URL`
   - Copy `anon public` key → This is your `VITE_SUPABASE_ANON_KEY`
   - Copy `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ KEEP SECRET!)

3. **Run Database Migrations**
   Option A - Using Supabase CLI (recommended):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
   
   Option B - Manual SQL execution:
   - Go to: SQL Editor in Supabase dashboard
   - Run each file in order:
     1. `database-setup.sql`
     2. `migrations/002_fix_balance_decimal.sql`
     3. `migrations/003_secure_balance_controls.sql`
     4. `migrations/004_secure_order_transaction.sql`
     5. `migrations/005_billing.sql`
     6. `migrations/006_adjust_billing_rls.sql`

4. **Configure Authentication**
   - Go to: Authentication → URL Configuration
   - Set "Site URL" to your frontend URL
   - Add redirect URLs for auth callbacks
   - Customize email templates (see `SUPABASE_EMAIL_TEMPLATES.md`)

5. **Create First Admin User**
   After deploying, run this SQL to grant admin role:
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{roles}',
     '["admin"]'::jsonb
   )
   WHERE email = 'your-email@example.com';
   ```

**Environment Variables:**
```bash
# Frontend (Cloudflare Pages)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Backend (Railway/Render)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Documentation:** https://supabase.com/docs

---

## 2. Stock API (nehtw.com) ✅ REQUIRED

**What it does:** Provides API access to download stock media from 40+ platforms including Adobe Stock, Shutterstock, Freepik, Envato, etc.

**Pricing:** Contact nehtw.com for pricing - typically pay-per-download or monthly subscription.

### Setup Steps:

1. **Request API Access**
   - Contact: nehtw.com
   - Provide your use case and expected monthly volume
   - They will issue you an API key

2. **Test API Key**
   - Test endpoint: `https://nehtw.com/api/stockinfo/shutterstock/STOCK_ID`
   - Include your API key in requests

3. **Configure Application**
   Add to your backend environment:
   ```bash
   STOCK_API_BASE_URL=https://nehtw.com/api
   STOCK_API_KEY=your-api-key-here
   ```

**Supported Stock Sites:**
- Adobe Stock
- Shutterstock
- iStockPhoto
- Freepik
- Envato Elements
- Creative Fabrica
- UI8
- Flaticon
- Motion Array
- Storyblocks
- And 30+ more!

**Full list:** See `src/services/stockService.ts` lines 137-188

**Note:** If this key is not configured, the stock download feature will return an error to users. The app will still function for AI generation and other features.

---

## 3. Google Gemini AI ⚙️ OPTIONAL

**What it does:** Powers AI image generation from text prompts.

**Pricing:** Free tier includes 60 requests per minute. Paid tiers available for higher volume.

### Setup Steps:

1. **Get API Key**
   - Go to: https://makersuite.google.com/app/apikey
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the generated key

2. **Configure Application**
   Add to your backend environment:
   ```bash
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

**If Not Configured:**
- AI Generator tab will still be visible
- Users will see error message when attempting to generate images
- All other features continue to work normally

**API Limits:**
- Free tier: 60 requests/minute
- Paid tier: Higher limits available

**Documentation:** https://ai.google.dev/docs

---

## 4. Sentry (Error Tracking) ⚙️ OPTIONAL BUT RECOMMENDED

**What it does:** Real-time error tracking and performance monitoring for production applications.

**Pricing:** Free tier includes 5,000 errors/month, 10,000 performance units/month.

### Setup Steps:

1. **Create Account & Project**
   - Go to: https://sentry.io
   - Sign up for free account
   - Create new project → Select "React"
   - Copy your DSN

2. **Install SDK**
   ```bash
   npm install @sentry/react
   ```

3. **Update Logger**
   Edit `src/lib/logger.ts` and uncomment Sentry integration:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   // In the error() method:
   if (isProduction) {
     Sentry.captureException(error, { extra: { message, ...context } });
   }
   
   // In the warn() method:
   if (isProduction) {
     Sentry.captureMessage(message, { level: 'warning', extra: context });
   }
   ```

4. **Initialize in App**
   Edit `src/index.tsx`:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   if (import.meta.env.PROD) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       environment: 'production',
       tracesSampleRate: 0.1, // 10% of transactions
       replaysSessionSampleRate: 0.1,
       replaysOnErrorSampleRate: 1.0,
     });
   }
   ```

5. **Add Environment Variable**
   ```bash
   # Frontend (Cloudflare Pages)
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

**Features:**
- Real-time error alerts
- Stack traces with source maps
- User session replay
- Performance monitoring
- Release tracking
- Custom alerts and integrations

**Documentation:** https://docs.sentry.io/platforms/javascript/guides/react/

---

## 5. Uptime Monitoring ⚙️ OPTIONAL BUT RECOMMENDED

**What it does:** Monitors your application's availability and alerts you when it's down.

**Recommended Services:**

### UptimeRobot (Free)
- Free tier: 50 monitors, 5-minute checks
- URL: https://uptimerobot.com
- Setup: Add your frontend and backend URLs
- Configure alert emails/SMS

### Better Uptime (Free + Paid)
- Free tier: 10 monitors, 3-minute checks
- URL: https://betteruptime.com
- Better UI and status pages
- Incident management

### Pingdom (Paid)
- More advanced monitoring
- URL: https://www.pingdom.com
- Real user monitoring
- Transaction monitoring

**Setup:**
1. Create account on chosen service
2. Add monitors for:
   - Frontend: `https://yourapp.pages.dev`
   - Backend: `https://yourapi.railway.app/health`
   - API: `https://yourapi.railway.app/api/health` (if you add this endpoint)
3. Configure alerts (email, Slack, Discord, etc.)

---

## Quick Reference Table

| Service | Required | Free Tier | Purpose | Setup Time |
|---------|----------|-----------|---------|------------|
| **Supabase** | ✅ Yes | 500MB DB, 50K users | Database & Auth | 10 min |
| **Stock API** | ✅ Yes | ❌ Paid | Stock downloads | Contact vendor |
| **Gemini AI** | ⚙️ Optional | 60 req/min | AI generation | 2 min |
| **Sentry** | ⚙️ Recommended | 5K errors/mo | Error tracking | 5 min |
| **Uptime Monitor** | ⚙️ Recommended | 50 monitors | Availability | 5 min |

---

## Environment Variables Summary

**Frontend (Cloudflare Pages, Vercel, Netlify):**
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx  # Optional
```

**Backend (Railway, Render, Heroku):**
```bash
# Required
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # KEEP SECRET!
STOCK_API_KEY=your-stock-api-key
STOCK_API_BASE_URL=https://nehtw.com/api

# Optional
GEMINI_API_KEY=your-gemini-key
NODE_ENV=production
PORT=3000
```

**Complete reference:** See `env.example`

---

## Cost Estimate

**Minimum (Free Tier):**
- Supabase: Free
- Cloudflare Pages: Free
- Railway/Render: ~$5-10/month
- **Stock API: Pay per use (contact vendor)**
- Gemini AI: Free (60 req/min)
- Sentry: Free (5K errors)
- **Total: ~$5-10/month + stock API costs**

**Recommended (Small Business):**
- Supabase Pro: $25/month (8GB DB, 100K users)
- Cloudflare Pages: Free or Pro $20/month
- Railway: ~$10-20/month
- **Stock API: $50-500/month (depending on volume)**
- Gemini AI: Free or $0.002 per request
- Sentry Team: $26/month (50K errors)
- Better Uptime: Free or $18/month
- **Total: ~$60-600/month depending on usage**

---

## Next Steps

After setting up these services:

1. ✅ Copy credentials to `env.example` → `.env`
2. ✅ Deploy frontend to Cloudflare Pages
3. ✅ Deploy backend to Railway/Render
4. ✅ Update Supabase auth URLs
5. ✅ Test all features
6. ✅ Set up monitoring and alerts

**Full deployment guide:** See `PRODUCTION_SETUP.md`

