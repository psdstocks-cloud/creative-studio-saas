# 🚀 Supabase Database Setup Instructions

## Problem
Your NEW Supabase project (`gvipnadjxnjznjzvxqvg`) has **no database tables** yet! The app needs tables to store user profiles and file orders.

## Solution
Run the SQL setup script in your Supabase dashboard.

---

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
Go to: **https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/editor**

Or:
1. Go to https://supabase.com/dashboard
2. Click on your project: **`creative-studio-saas`** (gvipnadjxnjznjzvxqvg)
3. Click **"SQL Editor"** in the left sidebar

### 2. Create New Query
- Click the **"New query"** button (top right)

### 3. Paste the SQL Script
- Open the file: `supabase-setup.sql` (in your project root)
- Copy **ALL** the contents
- Paste into the SQL Editor

### 4. Run the Script
- Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
- Wait for it to complete (should take 1-2 seconds)

### 5. Verify Success
You should see: **"Success. No rows returned"**

---

## What This Creates

### Tables
- ✅ **`profiles`** - User data (email, balance/points)
- ✅ **`stock_order`** - File download orders

### Security
- ✅ **Row Level Security (RLS)** - Users can only see their own data
- ✅ **RLS Policies** - Secure access rules

### Automation
- ✅ **Auto-create profile** - New users get a profile automatically with 100 points
- ✅ **Auto-update timestamps** - Tracks when records change

---

## After Running the SQL

### Test It Works
1. Go to: https://creative-studio-saas.obl.ee/signup
2. Create a test account
3. Check if you can sign in
4. You should start with **100 points**

### Verify Tables Exist
In Supabase:
1. Click **"Table Editor"** in left sidebar
2. You should see:
   - `profiles`
   - `stock_order`

---

## Update Supabase Auth Settings

### Important: Add Redirect URLs
1. Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/url-configuration
2. Under **"Redirect URLs"**, add:
   ```
   https://creative-studio-saas.obl.ee/auth/callback
   http://localhost:3000/auth/callback
   ```
3. Click **"Save"**

### Enable Email Confirmation (Optional)
If you want users to confirm their email:
1. Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/templates
2. Configure email templates as needed

---

## Troubleshooting

### "Success. No rows returned"
✅ This is GOOD! It means the script ran successfully.

### "relation already exists"
✅ Also good! Means you already ran the script. Safe to ignore.

### "permission denied"
❌ Make sure you're logged into the correct Supabase project.

### Users can't sign up
1. Check if SQL script ran successfully
2. Check browser console for errors
3. Verify Supabase URL in your app is correct: `gvipnadjxnjznjzvxqvg.supabase.co`

---

## Need Help?
Check these logs:
1. **Browser console** - `F12` → Console tab
2. **Supabase logs** - https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/logs/explorer

