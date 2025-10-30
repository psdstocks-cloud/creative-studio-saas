# ✅ Stock Sources Fix - Quick Start

## Problem
The admin page at `/admin/stock-sources` was showing **"0 sources"** because it was trying to fetch from an external API that wasn't available.

## Solution
I've created a database table to store stock sources locally. Now you can:
- ✅ View all 39 stock sources in the admin panel
- ✅ Edit prices that apply to ALL users
- ✅ Enable/disable stock sources
- ✅ Track all changes with an audit log

## 🚀 Quick Setup (5 minutes)

### Step 1: Run the SQL Script

1. **Open Supabase Dashboard**: Go to your project
2. **Click "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy & Paste**: Open `quick-setup-stock-sources.sql` and copy ALL contents
5. **Run**: Click the green "Run" button (or press Cmd+Enter)

You should see a success message showing 39 total sources!

### Step 2: Restart Your Backend

**If running locally:**
```bash
# Press Ctrl+C to stop the server, then:
npm run dev
```

**If deployed on Railway/Vercel:**
- Just redeploy or wait for automatic restart

### Step 3: Test It!

1. Open: https://creative-studio-saas.pages.dev/admin/stock-sources
2. You should now see 39 stock sources! 🎉
3. Try editing a price:
   - Click the ✏️ edit icon
   - Change the price
   - Click the ✓ save icon
   - Refresh the page - your change is saved!

## What's Changed

### Files Modified
- ✅ `server.js` - Added database endpoints for stock sources
- ✅ `migrations/007_stock_sources.sql` - New migration file
- ✅ `quick-setup-stock-sources.sql` - Quick setup script

### New Database Tables
- `stock_sources` - Stores all 39 stock sources with prices
- `stock_source_audit` - Tracks all price changes

### New API Endpoints
- `GET /api/stock-sources` - Public endpoint (all users)
- `GET /admin/stock-sources` - Admin list (with inactive sources)
- `PATCH /admin/stock-sources/:key/cost` - Update price
- `PATCH /admin/stock-sources/:key/active` - Enable/disable source
- `GET /admin/stock-sources/audit` - View change history

## Default Stock Sources (39 total)

The cheapest:
- Freepik: $0.20
- Flaticon: $0.20
- Iconscout: $0.20
- Motionarray: $0.25

The most expensive:
- iStock Video HD: $25.00
- SS Video 4K: $17.00
- Alamy: $16.00
- Yellowimages: $12.00

Most are between $0.30 - $1.00

## How Price Changes Work

When you update a price in the admin panel:
1. ✅ It's saved to the database immediately
2. ✅ All users see the new price instantly
3. ✅ The change is logged with your user ID and timestamp
4. ✅ You can view the audit log to see who changed what

## Troubleshooting

### Still seeing "0 sources"?
1. Make sure you ran the SQL script in Supabase
2. Check that your backend server restarted
3. Clear your browser cache and reload
4. Check browser console for errors (F12 → Console tab)

### Can't edit prices?
1. Make sure you're logged in as an admin
2. Check that Supabase connection is working
3. Look at server logs for errors

### Migration already run?
No problem! The script uses `IF NOT EXISTS` and `ON CONFLICT` to avoid errors if you run it multiple times.

## Verifying the Setup

Run this in Supabase SQL Editor to check everything:

```sql
-- Check sources
SELECT COUNT(*) as total FROM stock_sources;
SELECT COUNT(*) as active FROM stock_sources WHERE active = true;

-- See all sources
SELECT key, name, cost, active FROM stock_sources ORDER BY name;

-- Check audit log (after making changes)
SELECT * FROM stock_source_audit ORDER BY changed_at DESC LIMIT 10;
```

## Need More Help?

See the full guide: `STOCK_SOURCES_SETUP.md`

## What's Next?

Once this is working:
1. ✅ Admin panel shows all sources
2. ✅ Users see current prices when ordering
3. ✅ You can adjust prices anytime from admin panel
4. ✅ All changes are tracked in audit log

Enjoy managing your stock sources! 🎉

