# How to Assign Admin Role to Your User

## Problem
When accessing https://creative-studio-saas.pages.dev/admin, you keep loading and getting redirected back to the home page with "unauthorized" even though you're logged in.

## Root Cause
Your user account doesn't have the required admin role. The admin panel requires one of these roles:
- `admin`
- `ops`
- `support`
- `finance`
- `superadmin`

---

## ✅ Solution: Add Admin Role in Supabase

### Method 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run This SQL Command**:
   ```sql
   -- Replace 'your-email@example.com' with your actual email
   UPDATE auth.users
   SET raw_app_metadata = jsonb_set(
     COALESCE(raw_app_metadata, '{}'::jsonb),
     '{roles}',
     '["admin"]'::jsonb
   )
   WHERE email = 'your-email@example.com';
   ```

4. **Click "Run"** to execute the query

5. **Sign Out and Sign Back In**:
   - Go to https://creative-studio-saas.pages.dev
   - Sign out completely
   - Sign back in
   - Now try accessing https://creative-studio-saas.pages.dev/admin

### Method 2: Via Supabase Auth UI

1. **Go to Supabase Dashboard**:
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Authentication**:
   - Click on "Authentication" in the left sidebar
   - Click on "Users"

3. **Find Your User**:
   - Search for your email address
   - Click on your user row

4. **Edit User Metadata**:
   - Scroll down to "Raw App Meta Data"
   - Click "Edit" (pencil icon)
   - Add this JSON:
   ```json
   {
     "roles": ["admin"]
   }
   ```
   - Click "Save"

5. **Sign Out and Sign Back In**:
   - Sign out from the application
   - Sign back in
   - Access https://creative-studio-saas.pages.dev/admin

---

## 🔐 Role Options

You can assign one or multiple roles:

### Single Role
```json
{
  "roles": ["admin"]
}
```

### Multiple Roles
```json
{
  "roles": ["admin", "superadmin", "ops"]
}
```

### Available Roles
- **`superadmin`**: Full access to everything (recommended for yourself)
- **`admin`**: Full operational access
- **`ops`**: Operations team access
- **`support`**: Customer support access
- **`finance`**: Financial operations access

---

## 🧪 Verify Role Assignment

### Option 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Sign in to the app
4. Type: `localStorage.getItem('supabase.auth.token')`
5. Copy the token and decode it at https://jwt.io
6. Look for `app_metadata.roles` in the decoded token

### Option 2: Check Via SQL

Run this query in Supabase SQL Editor:
```sql
SELECT 
  email,
  raw_app_metadata->>'roles' as roles,
  raw_user_metadata
FROM auth.users
WHERE email = 'your-email@example.com';
```

---

## 📝 How Role Checking Works

The application checks roles in this order:

1. **Supabase `app_metadata.roles`** (Primary source)
2. **Supabase `app_metadata.role`** (Singular)
3. **Supabase `user_metadata.roles`** (User-level)
4. **Supabase `user_metadata.role`** (Singular)
5. **BFF Session roles** (If using BFF server)

**Recommended**: Always use `app_metadata.roles` as it's server-controlled and secure.

**Code Reference**: `src/contexts/AuthContext.tsx` lines 77-90

---

## 🚨 Troubleshooting

### Still Getting "Unauthorized" After Adding Role?

1. **Clear Browser Cache**:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Clear cookies and cached data
   - Close and reopen browser

2. **Check Session**:
   - Open DevTools Console (F12)
   - Type: `localStorage.clear()`
   - Refresh page
   - Sign in again

3. **Verify Role in Console**:
   ```javascript
   // In browser console after signing in:
   console.log('User roles:', window.__auth_user_roles__);
   ```

4. **Check Network Tab**:
   - Open DevTools → Network tab
   - Sign in
   - Look for `session` or `user` requests
   - Check the response for roles

### Common Issues

**Issue**: SQL query returns 0 rows updated
- **Solution**: Check that the email is exactly correct (case-sensitive)

**Issue**: Role not showing up after update
- **Solution**: You MUST sign out and sign back in to refresh the token

**Issue**: Still redirected after adding role
- **Solution**: Clear browser storage and cookies, then sign in fresh

---

## 🔄 Quick Fix Script

Run this in Supabase SQL Editor to assign yourself as superadmin:

```sql
-- Find your user ID first
SELECT id, email, raw_app_metadata 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Then assign superadmin role
UPDATE auth.users
SET raw_app_metadata = jsonb_set(
  COALESCE(raw_app_metadata, '{}'::jsonb),
  '{roles}',
  '["superadmin", "admin"]'::jsonb
)
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT email, raw_app_metadata->>'roles' as roles
FROM auth.users
WHERE email = 'your-email@example.com';
```

---

## 📚 Related Documentation

- **Admin Pages List**: `ADMIN_PAGES_FULL_URLS.md`
- **Third-Party Setup**: `THIRD_PARTY_SETUP.md`
- **Production Status**: `README_PRODUCTION_STATUS.md`

---

## ✅ Success Checklist

- [ ] Accessed Supabase Dashboard
- [ ] Ran SQL query to add admin role OR edited user metadata
- [ ] Verified role was added (check SQL or decoded JWT)
- [ ] Signed out of the application
- [ ] Cleared browser cache/cookies
- [ ] Signed back in
- [ ] Successfully accessed https://creative-studio-saas.pages.dev/admin
- [ ] Can see admin dashboard with KPIs

---

**Need Help?**

If you're still having issues after following these steps:
1. Check browser console for error messages
2. Verify your Supabase project is the correct one
3. Ensure you're using the exact email you signed up with
4. Check that Supabase RLS policies allow the auth schema access

---

**Last Updated**: October 29, 2025

