# Configure Supabase Redirect URLs for Production

## Your Production Domain
https://creative-studio-saas.obl.ee/

## Step-by-Step Instructions

### 1. Open Supabase Authentication Settings

Go to your Supabase dashboard:
https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/url-configuration

Or navigate manually:
1. Go to https://supabase.com/dashboard
2. Select your project: `gvipnadjxnjznjzvxqvg`
3. Click **Authentication** (shield icon in left sidebar)
4. Click **URL Configuration**

### 2. Update Site URL

In the **Site URL** field, enter:
```
https://creative-studio-saas.obl.ee
```

This is the main URL of your application.

### 3. Add Redirect URLs

In the **Redirect URLs** section, add these URLs (one per line):

```
https://creative-studio-saas.obl.ee/**
https://creative-studio-saas.obl.ee/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

**Why these URLs?**
- `https://creative-studio-saas.obl.ee/**` - Allows all paths on your production domain
- `/auth/callback` - Specific callback URL for password resets and email confirmations
- `localhost:3000/**` - Keeps local development working

### 4. Update Your Code (if needed)

Check your auth configuration files to ensure callbacks use the correct URL:

**src/contexts/AuthContext.tsx** should have:
```typescript
redirectTo: `${window.location.origin}/auth/callback`
```

This automatically uses the correct domain (production or local).

### 5. Save Changes

Click **Save** in the Supabase dashboard.

### 6. Test Authentication

**On Production (https://creative-studio-saas.obl.ee/):**
1. Go to your live site
2. Click "Sign Up"
3. Register with a real email
4. Check your email for confirmation link
5. Click the link - should redirect to your site
6. Try "Forgot Password" flow

**On Local (http://localhost:3000/):**
1. Should still work for development
2. Test sign up/sign in locally

## Common Issues & Solutions

### Issue: "Invalid redirect URL" error
**Solution:** Make sure you added the URLs exactly as shown above, including the `/**` wildcard.

### Issue: Email links redirect to wrong domain
**Solution:** 
1. Check the **Site URL** is set to your production domain
2. Clear browser cache and try again

### Issue: Password reset doesn't work
**Solution:** Ensure `/auth/callback` is in the redirect URLs list.

## Environment Variables

Your production environment should have these set:
```bash
VITE_SUPABASE_URL=https://gvipnadjxnjznjzvxqvg.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

## Wildcard Pattern Explanation

The `**` pattern means:
- `https://creative-studio-saas.obl.ee/**` → Allows ALL paths under your domain
  - ✅ `/auth/callback`
  - ✅ `/dashboard`
  - ✅ `/reset-password`
  - ✅ Any other path

## Security Note

Only add domains you control to prevent security issues. Never add:
- ❌ Wildcard domains like `*` or `*.com`
- ❌ Untrusted third-party domains
- ❌ HTTP domains in production (use HTTPS)

## Next Steps

After configuring:
1. ✅ Deploy your app to production
2. ✅ Test sign up on live site
3. ✅ Test password reset flow
4. ✅ Verify email confirmation works

Your authentication should now work seamlessly on both local and production! 🎉
