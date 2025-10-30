# Stock Sources Database Setup Guide

## Problem Fixed
The stock sources admin page was showing "0 sources" because it was trying to fetch from an external API (`https://nehtw.com/api/stocksites`) which requires an API key and may not always be available.

## Solution
We've created a database table to store stock sources locally, allowing you to:
- ✅ View all stock sources in the admin panel
- ✅ Edit prices for all users from one place
- ✅ Enable/disable stock sources
- ✅ Track changes with an audit log

## Setup Instructions

### Step 1: Run the Database Migration

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `migrations/007_stock_sources.sql`
5. Paste it into the SQL Editor
6. Click **Run** or press `Ctrl/Cmd + Enter`

The migration will:
- Create the `stock_sources` table
- Create the `stock_source_audit` table for tracking changes
- Seed the table with 39 default stock sources
- Set up Row Level Security (RLS) policies
- Create indexes for better performance

### Step 2: Verify the Migration

Run this query in your Supabase SQL Editor to verify:

```sql
SELECT COUNT(*) as total_sources FROM stock_sources;
SELECT COUNT(*) as active_sources FROM stock_sources WHERE active = true;
```

You should see:
- Total sources: 39
- Active sources: 38 (one is disabled by default: `uihut`)

### Step 3: Restart Your Server

If you're running the backend locally:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

If you're running on Railway or another hosting platform:
- The server should automatically restart after you deploy

### Step 4: Test the Admin Page

1. Navigate to: `https://creative-studio-saas.pages.dev/admin/stock-sources`
2. You should now see all 39 stock sources listed
3. Try editing a price:
   - Click the edit icon next to any source
   - Change the price
   - Click the save icon
   - The change should be saved and visible to all users

## What Changed

### Database
- **New Table**: `stock_sources` - Stores all available stock sources
- **New Table**: `stock_source_audit` - Tracks all changes made to stock sources

### Backend (`server.js`)
- **New Endpoint**: `GET /api/stock-sources` - Public endpoint for fetching active sources
- **New Endpoint**: `GET /admin/stock-sources` - Admin endpoint for fetching all sources
- **New Endpoint**: `PATCH /admin/stock-sources/:key/cost` - Update source price
- **New Endpoint**: `PATCH /admin/stock-sources/:key/active` - Toggle source active status
- **New Endpoint**: `GET /admin/stock-sources/audit` - View audit log

### Frontend
No changes needed! The frontend already calls these endpoints.

## How It Works

1. **Public Users**: When users browse available stock sources, they see only active sources from the database
2. **Admins**: Can view all sources (active and inactive) in the admin panel
3. **Price Updates**: When you update a price, it immediately affects all users
4. **Audit Trail**: All changes are logged with who made the change and when

## Default Stock Sources

The migration seeds 39 stock sources including:
- Adobe Stock ($0.40)
- Shutterstock ($0.50)
- Freepik ($0.20)
- Envato ($0.50)
- And 35 more...

You can edit these prices anytime from the admin panel.

## Troubleshooting

### Issue: Still seeing "0 sources"

**Solution**: Make sure you've run the migration and restarted your server. Check the browser console for any error messages.

### Issue: Can't update prices

**Solution**: Make sure you're logged in as an admin user. Check that your Supabase connection is working.

### Issue: Migration fails with "already exists" error

**Solution**: If you've already run this migration, you can safely ignore this error. The migration uses `IF NOT EXISTS` to prevent conflicts.

## Checking Audit Logs

To view all changes made to stock sources:

```sql
SELECT 
  stock_source_key,
  action,
  old_value,
  new_value,
  changed_at
FROM stock_source_audit
ORDER BY changed_at DESC
LIMIT 20;
```

## Need Help?

If you encounter any issues:
1. Check the server logs for error messages
2. Verify your Supabase connection is working
3. Make sure you have the latest code from this repository
4. Check that you're logged in as an admin user

