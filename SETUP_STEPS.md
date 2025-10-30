# 🚀 Stock Sources Setup - Step by Step

## Current Problem
❌ Admin page shows "0 sources"
❌ Cannot edit stock prices
❌ External API not responding

## After This Setup
✅ 39 stock sources loaded
✅ Can edit prices for all users
✅ Full audit trail of changes
✅ Enable/disable sources with one click

---

## Step 1: Open Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

---

## Step 2: Copy the SQL Script
1. Open the file: `quick-setup-stock-sources.sql`
2. Select ALL the contents (Cmd+A / Ctrl+A)
3. Copy it (Cmd+C / Ctrl+C)

---

## Step 3: Run the Script
1. In Supabase SQL Editor, click **New Query**
2. Paste the SQL you copied (Cmd+V / Ctrl+V)
3. Click the green **Run** button (or press Cmd+Enter)
4. Wait for it to finish (should take 2-3 seconds)

**Expected Result:**
```
Stock Sources Setup Complete!
total_sources: 39
active_sources: 38
```

---

## Step 4: Restart Your Server

### If running locally:
```bash
# In your terminal, press Ctrl+C to stop the server
# Then restart it:
npm run dev
```

### If deployed (Railway/Vercel/etc):
- Just trigger a redeploy or wait for auto-restart

---

## Step 5: Test the Admin Page

1. **Open in browser:**
   ```
   https://creative-studio-saas.pages.dev/admin/stock-sources
   ```

2. **What you should see:**
   - Total Sources: 39
   - Active: 38
   - A table with all stock sources

3. **Try editing a price:**
   - Click the ✏️ (pencil) icon next to any source
   - Change the price (e.g., change 0.50 to 0.60)
   - Click the ✓ (checkmark) to save
   - The price should update immediately!

4. **Try toggling active status:**
   - Click the toggle switch next to any source
   - It should switch from active to inactive (or vice versa)

---

## Troubleshooting

### Still seeing "0 sources"?

**Check 1:** Did the SQL script run successfully?
- Go back to Supabase SQL Editor
- Run: `SELECT COUNT(*) FROM stock_sources;`
- Should return 39

**Check 2:** Did you restart the server?
- Make sure the backend restarted after the migration

**Check 3:** Check browser console
- Press F12 in your browser
- Look for any red errors
- Share them if you need help

### Can't edit prices?

**Check:** Are you logged in as an admin?
- Log out and log back in
- Make sure your user has admin role

---

## What's Next?

Once everything is working:

1. ✅ **Edit prices** - Click edit icon, change price, save
2. ✅ **View changes** - All edits are logged with your user ID
3. ✅ **Disable sources** - Toggle off any sources you don't want users to see
4. ✅ **Check audit log** - Run this in Supabase:
   ```sql
   SELECT * FROM stock_source_audit ORDER BY changed_at DESC LIMIT 10;
   ```

---

## Quick Reference

### All Stock Sources (39 total)

**Cheapest:**
- Freepik: $0.20
- Flaticon: $0.20
- Iconscout: $0.20

**Mid-range:**
- Adobe Stock: $0.40
- Shutterstock: $0.50
- Envato: $0.50

**Most expensive:**
- iStock Video HD: $25.00
- SS Video 4K: $17.00
- Alamy: $16.00

### Useful SQL Queries

**View all sources:**
```sql
SELECT key, name, cost, active 
FROM stock_sources 
ORDER BY cost DESC;
```

**View recent changes:**
```sql
SELECT stock_source_key, action, old_value, new_value, changed_at 
FROM stock_source_audit 
ORDER BY changed_at DESC 
LIMIT 20;
```

**Update a price manually (if needed):**
```sql
UPDATE stock_sources 
SET cost = 0.75 
WHERE key = 'freepik';
```

---

## Need Help?

- 📖 Quick Start: `FIX_STOCK_SOURCES.md`
- 📚 Detailed Guide: `STOCK_SOURCES_SETUP.md`
- 📝 Changelog: `CHANGELOG_STOCK_SOURCES.md`

---

## Summary

You're setting up a database table that stores all stock sources locally, so admins can:
- View all available sources
- Edit prices that apply to ALL users
- Enable/disable sources
- Track all changes

**Time to complete:** 5 minutes
**Difficulty:** Easy
**Risk:** Low (can run multiple times safely)

Let's go! 🚀

