# 🚀 Production Setup Guide

This guide will help you deploy the Creative Studio SaaS application to production with all features fully configured.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Third-Party Services Setup](#third-party-services-setup)
3. [Environment Variables](#environment-variables)
4. [Frontend Deployment (Cloudflare Pages)](#frontend-deployment)
5. [Backend Deployment (BFF Server)](#backend-deployment)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Monitoring & Error Tracking](#monitoring--error-tracking)
8. [Security Checklist](#security-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] A Supabase account (free tier available)
- [ ] A Cloudflare account (free tier available)
- [ ] Access to a Node.js hosting platform (Railway, Render, Heroku, etc.)
- [ ] A Stock API key from nehtw.com
- [ ] (Optional) A Google Gemini API key for AI features

---

## Third-Party Services Setup

### 1. Supabase (Database & Authentication) ✅ REQUIRED

Supabase provides your PostgreSQL database and authentication system.

#### Steps:

1. **Create a Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose organization, name, database password, and region
   - Wait for project to provision (~2 minutes)

2. **Get Your Credentials**
   - Navigate to Project Settings → API
   - Copy `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - Copy `anon` / `public` key
   - Copy `service_role` key (⚠️ KEEP SECRET!)

3. **Run Database Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Run migrations
   supabase db push
   ```
   
   Or manually run SQL files in order:
   - `database-setup.sql`
   - `migrations/002_fix_balance_decimal.sql`
   - `migrations/003_secure_balance_controls.sql`
   - `migrations/004_secure_order_transaction.sql`
   - `migrations/005_billing.sql`
   - `migrations/006_adjust_billing_rls.sql`

4. **Configure Authentication**
   - Navigate to Authentication → URL Configuration
   - Add your frontend URL to "Site URL"
   - Add redirect URLs (e.g., `https://yourapp.pages.dev/auth/callback`)
   - Configure email templates (see `SUPABASE_EMAIL_TEMPLATES.md`)

---

### 2. Stock API (nehtw.com) ✅ REQUIRED FOR STOCK DOWNLOADS

This API provides access to stock media downloads from various platforms.

#### Steps:

1. **Obtain API Key**
   - Contact nehtw.com to request an API key
   - Provide your use case and expected volume
   - You will receive an API key and base URL

2. **Configure in Environment**
   ```bash
   STOCK_API_BASE_URL=https://nehtw.com/api
   STOCK_API_KEY=your-api-key-here
   ```

**Supported Stock Sites:**
- Adobe Stock, Shutterstock, iStock, Freepik
- Envato, Creative Fabrica, UI8, and 40+ more
- See full list in `src/services/stockService.ts`

---

### 3. Google Gemini AI 🔧 OPTIONAL (for AI image generation)

Gemini provides AI-powered image generation capabilities.

#### Steps:

1. **Get API Key**
   - Go to https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key

2. **Configure in Environment**
   ```bash
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

**Note:** AI features will be disabled if this key is not set. Users will see an error message when trying to use AI generation.

---

### 4. Error Tracking (Optional but Recommended)

For production error monitoring, we recommend Sentry.

#### Setup Sentry:

1. **Create Account**
   - Go to https://sentry.io
   - Create a new project for React
   - Copy your DSN

2. **Install Sentry**
   ```bash
   npm install @sentry/react
   ```

3. **Update Logger**
   Edit `src/lib/logger.ts` to uncomment Sentry integration:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   // In production error logging
   if (isProduction) {
     Sentry.captureException(error, { extra: { message, ...context } });
   }
   ```

4. **Initialize Sentry**
   Add to `src/index.tsx`:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   if (import.meta.env.PROD) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       environment: 'production',
       tracesSampleRate: 0.1,
     });
   }
   ```

---

## Environment Variables

### Frontend Variables (VITE_*)

These are embedded at build time and safe to expose publicly:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx  # Optional
```

### Backend Variables (BFF Server)

These should NEVER be exposed to the frontend:

```bash
# Required
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
STOCK_API_KEY=your-stock-api-key

# Optional (with defaults)
GEMINI_API_KEY=your-gemini-key
SESSION_COOKIE_NAME=css_bff_session
SESSION_TTL_MS=28800000
RATE_LIMIT_MAX_REQUESTS=120
ADMIN_DEFAULT_LIMIT=50
NODE_ENV=production
PORT=3000
```

**Complete reference:** See `env.example` file

---

## Frontend Deployment

### Cloudflare Pages (Recommended)

Cloudflare Pages offers free hosting with global CDN and automatic HTTPS.

#### Steps:

1. **Connect Repository**
   - Go to https://dash.cloudflare.com
   - Navigate to Workers & Pages → Create
   - Select "Pages" → "Connect to Git"
   - Authorize and select your repository

2. **Configure Build**
   ```
   Build command:     npm install && npm run build
   Build output dir:  dist
   Root directory:    /
   Framework preset:  Vite
   ```

3. **Set Environment Variables**
   - Go to Settings → Environment variables
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Add `VITE_SENTRY_DSN` (optional)

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Note your deployment URL (e.g., `yourapp.pages.dev`)

5. **Custom Domain (Optional)**
   - Go to Custom domains
   - Add your domain
   - Follow DNS configuration steps

**Headers & Redirects:**
- The `public/_headers` file configures security headers
- The `public/_redirects` file handles SPA routing

---

## Backend Deployment

The BFF (Backend For Frontend) server handles authenticated requests and proxies to third-party APIs.

### Railway (Recommended)

Railway offers simple deployment with automatic HTTPS and environment management.

#### Steps:

1. **Create Project**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Configure Build**
   - Railway auto-detects Node.js
   - Build command: `npm install`
   - Start command: `node server.js`

3. **Set Environment Variables**
   In Railway dashboard, add all backend variables from `env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STOCK_API_KEY`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
   - etc.

4. **Deploy**
   - Railway automatically deploys
   - Note your backend URL (e.g., `yourapp.up.railway.app`)

5. **Update Frontend**
   - In Cloudflare Pages environment variables
   - Add `VITE_API_BASE_URL=https://yourapp.up.railway.app`
   - Redeploy frontend

### Alternative Platforms

The backend can also be deployed to:
- **Render:** https://render.com (similar to Railway)
- **Heroku:** https://heroku.com (paid plans only)
- **Fly.io:** https://fly.io (Docker-based)
- **DigitalOcean App Platform:** https://www.digitalocean.com/products/app-platform

All use the same environment variables from `env.example`.

---

## Post-Deployment Configuration

### 1. Update Supabase Authentication URLs

After deploying frontend:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update:
   - **Site URL:** `https://yourapp.pages.dev`
   - **Redirect URLs:** Add `https://yourapp.pages.dev/auth/callback`
3. Save changes

### 2. Test User Flow

1. **Sign Up**
   - Go to your app
   - Create a new account
   - Verify email works

2. **Stock Download**
   - Copy a stock URL (e.g., from Shutterstock)
   - Paste in stock downloader
   - Verify preview loads
   - Test download

3. **AI Generation** (if enabled)
   - Navigate to AI Generator
   - Enter a prompt
   - Verify images generate

4. **Admin Panel**
   - Grant admin role in Supabase:
     ```sql
     UPDATE auth.users 
     SET raw_user_meta_data = jsonb_set(
       COALESCE(raw_user_meta_data, '{}'::jsonb),
       '{roles}',
       '["admin"]'::jsonb
     )
     WHERE email = 'your-admin-email@example.com';
     ```
   - Access `/admin` route
   - Verify all admin features work

### 3. Configure Rate Limits

Adjust rate limits based on your usage:

```bash
# For high-traffic apps
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_ADMIN_MAX_REQUESTS=200

# For low-traffic apps (more restrictive)
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_ADMIN_MAX_REQUESTS=30
```

---

## Monitoring & Error Tracking

### Application Logs

**Railway/Render:**
- View logs in dashboard
- Set up log drains to external service

**Cloudflare Pages:**
- View build logs in dashboard
- Functions logs available for Cloudflare Workers

### Error Monitoring

If you set up Sentry:

1. **Monitor Errors**
   - Go to https://sentry.io/issues
   - View real-time errors
   - Set up alerts for critical errors

2. **Performance Monitoring**
   - Enable Performance in Sentry
   - View transaction traces
   - Identify slow API calls

### Health Checks

Create a health check endpoint for uptime monitoring:

**Add to `server.js`:**
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**Monitor with:**
- Uptime Robot: https://uptimerobot.com
- Better Uptime: https://betteruptime.com
- Pingdom: https://www.pingdom.com

---

## Security Checklist

### Before Going Live:

- [ ] All `VITE_*` variables contain only public information
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never in frontend code
- [ ] `STOCK_API_KEY` is only on backend
- [ ] HTTPS is enabled on all domains
- [ ] Row Level Security (RLS) is enabled on all Supabase tables
- [ ] Rate limiting is configured appropriately
- [ ] CORS is configured to only allow your frontend domain
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging is enabled for admin actions
- [ ] Email verification is required for new accounts
- [ ] Password requirements are enforced (min 6 chars in Supabase)
- [ ] Session timeout is reasonable (8 hours default)

### Hardening Supabase:

1. **Enable RLS on all tables:**
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE stock_order ENABLE ROW LEVEL SECURITY;
   -- etc.
   ```

2. **Review RLS policies:**
   - Users can only read/update their own data
   - Admin role checks are in place
   - All migrations in `migrations/` folder apply RLS

3. **Configure email verification:**
   - Supabase → Authentication → Email Auth
   - Enable "Confirm email"
   - Customize email templates

### Cloudflare Security:

The `public/_headers` file already includes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` for privacy

---

## Summary

### What You Need to Set Up:

| Service | Purpose | Required | Cost |
|---------|---------|----------|------|
| **Supabase** | Database & Auth | ✅ Yes | Free tier: 500MB DB, 50K users |
| **Cloudflare Pages** | Frontend hosting | ✅ Yes | Free tier: Unlimited bandwidth |
| **Railway/Render** | Backend hosting | ✅ Yes | ~$5-10/month or free tier |
| **Stock API (nehtw.com)** | Stock downloads | ✅ Yes | Pay-per-use or subscription |
| **Gemini AI** | Image generation | ⚠️ Optional | Free tier: 60 requests/min |
| **Sentry** | Error tracking | ⚠️ Recommended | Free tier: 5K errors/month |

### Environment Variables by Service:

**Cloudflare Pages:**
```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

**Backend (Railway/Render):**
```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STOCK_API_KEY
GEMINI_API_KEY  # Optional
NODE_ENV=production
```

### Quick Deploy Checklist:

1. ✅ Set up Supabase project and run migrations
2. ✅ Deploy frontend to Cloudflare Pages
3. ✅ Deploy backend to Railway/Render
4. ✅ Configure environment variables on both
5. ✅ Update Supabase auth redirect URLs
6. ✅ Test user signup, stock download, and admin panel
7. ✅ Set up error monitoring (Sentry)
8. ✅ Configure custom domain (optional)
9. ✅ Set up uptime monitoring

---

## Need Help?

- **Supabase Docs:** https://supabase.com/docs
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages
- **Railway Docs:** https://docs.railway.app
- **Vite Docs:** https://vitejs.dev

For issues with the codebase, check existing documentation:
- `README.md` - Project overview
- `CURRENT_STATUS.md` - Implementation status
- `DEPLOY_CHECKLIST.md` - Quick deploy guide

