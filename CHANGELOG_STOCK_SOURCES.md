# Changelog: Stock Sources Database Migration

## Date: October 30, 2025

## Problem Identified
The admin page at `/admin/stock-sources` was displaying "0 sources" because:
1. The backend was calling an external API (`https://nehtw.com/api/stocksites`)
2. This API required a `STOCK_API_KEY` environment variable
3. The external API was unavailable or not responding
4. There was no local database table to store stock source configuration

## Solution Implemented

### 1. Database Schema Changes

**New Tables:**
- `stock_sources` - Stores all 39 available stock media sources
  - Fields: id, key, name, cost, icon, icon_url, active, created_at, updated_at
  - Indexes on: key (unique), active
  - RLS enabled with public read access

- `stock_source_audit` - Tracks all changes to stock sources
  - Fields: id, stock_source_key, action, old_value, new_value, changed_by, changed_at
  - Indexes on: stock_source_key, changed_at
  - RLS enabled for authenticated users

**Files Created:**
- `migrations/007_stock_sources.sql` - Full migration with all features
- `quick-setup-stock-sources.sql` - Simplified version for quick setup
- Updated `database-setup.sql` - Added stock sources to main setup

### 2. Backend Changes (`server.js`)

**New API Endpoints:**

**Public Endpoint:**
- `GET /api/stock-sources`
  - Returns only active stock sources
  - Used by all users when browsing available sources
  - No authentication required

**Admin Endpoints:**
- `GET /admin/stock-sources`
  - Returns all stock sources (active and inactive)
  - Admin-only access
  - Used by admin panel

- `PATCH /admin/stock-sources/:key/cost`
  - Updates the cost/price of a stock source
  - Validates: cost must be between 0.01 and 1000
  - Creates audit log entry
  - Admin-only access

- `PATCH /admin/stock-sources/:key/active`
  - Toggles active/inactive status of a stock source
  - Creates audit log entry
  - Admin-only access

- `GET /admin/stock-sources/audit`
  - Returns audit log of all changes
  - Optional filter by stock source key
  - Admin-only access

### 3. Frontend Changes
**No changes required!** The existing frontend code already supports these endpoints.

### 4. Default Stock Sources (39 total)

The migration seeds 39 stock sources with default pricing:

**Image Sources:**
- Adobe Stock ($0.40)
- Shutterstock ($0.50)
- Freepik ($0.20)
- iStock Photo ($0.80)
- Envato ($0.50)
- Depositphotos ($0.60)
- Dreamstime ($0.65)
- 123RF ($0.65)
- Vecteezy ($0.30)
- Rawpixel ($0.30)
- And 13 more...

**Video Sources:**
- SS Video 4K ($17.00)
- SS Video HD ($8.00)
- iStock Video HD ($25.00)
- Adobe Stock Video ($4.50)
- Freepik Video ($1.00)
- Storyblocks ($1.00)
- And 4 more...

**Music/Audio Sources:**
- SS Music ($1.00)
- Artlist Music/SFX ($0.40)
- Epidemicsound ($0.30)
- Soundstripe ($0.30)

**Design Resources:**
- UI8 ($3.00)
- Mockupcloud ($1.00)
- Craftwork ($2.00)
- And 7 more...

### 5. Features

**Admin Panel:**
- ✅ View all stock sources in a table
- ✅ See total sources, active count, average cost
- ✅ Search by name or key
- ✅ Filter by active/inactive status
- ✅ Edit prices inline with validation
- ✅ Toggle active status with one click
- ✅ All changes tracked in audit log
- ✅ Real-time updates

**Security:**
- ✅ Admin-only access to edit endpoints
- ✅ Input validation (min/max cost)
- ✅ Audit logging with user ID
- ✅ Row Level Security (RLS) policies
- ✅ Rate limiting on admin endpoints

**User Experience:**
- ✅ Public endpoint returns only active sources
- ✅ Users see updated prices immediately
- ✅ Fallback to hardcoded list if DB fails
- ✅ Optimistic UI updates in admin panel

## Migration Instructions

### Option 1: Quick Setup (Recommended)
1. Open Supabase SQL Editor
2. Copy contents of `quick-setup-stock-sources.sql`
3. Paste and run
4. Restart backend server
5. Done! ✅

### Option 2: Using Migration File
1. Open Supabase SQL Editor
2. Copy contents of `migrations/007_stock_sources.sql`
3. Paste and run
4. Restart backend server
5. Done! ✅

### Option 3: Fresh Database Setup
If setting up a new database, use `database-setup.sql` which now includes stock sources.

## Verification

After running the migration, verify with:

```sql
-- Check table exists
SELECT COUNT(*) FROM stock_sources;
-- Should return: 39

-- Check active sources
SELECT COUNT(*) FROM stock_sources WHERE active = true;
-- Should return: 38

-- View all sources
SELECT key, name, cost, active FROM stock_sources ORDER BY cost;
```

## Testing Checklist

- [x] Database migration runs without errors
- [x] Backend endpoints return data
- [x] Admin page displays all sources
- [x] Can edit prices successfully
- [x] Can toggle active status
- [x] Audit log records changes
- [x] Public endpoint shows only active sources
- [x] Validation works (min/max cost)
- [x] No linting errors

## Files Modified

**Backend:**
- `server.js` - Added 4 new endpoints, updated stock sources logic

**Database:**
- `migrations/007_stock_sources.sql` - New migration file
- `quick-setup-stock-sources.sql` - Quick setup script
- `database-setup.sql` - Updated with stock sources

**Documentation:**
- `FIX_STOCK_SOURCES.md` - Quick start guide
- `STOCK_SOURCES_SETUP.md` - Detailed setup guide
- `CHANGELOG_STOCK_SOURCES.md` - This file

## Breaking Changes
None! This is a backward-compatible addition.

## Performance Impact
- Minimal: Database queries are indexed
- Faster than calling external API
- Reduced dependency on external services

## Future Enhancements
Potential improvements for later:
- Bulk price updates
- Price history tracking
- Import/export stock sources
- Price change notifications
- API sync with external source
- Custom stock source icons upload

## Support

If you encounter issues:
1. Check `FIX_STOCK_SOURCES.md` for quick troubleshooting
2. See `STOCK_SOURCES_SETUP.md` for detailed guide
3. Verify Supabase connection is working
4. Check server logs for errors
5. Ensure you're logged in as an admin user

## Notes

- The migration is idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` to prevent conflicts
- Uses `ON CONFLICT DO NOTHING` for seed data
- All audit logs include user ID for accountability
- Prices are stored as DECIMAL(10, 2) for precision

---

**Status:** ✅ Complete and Ready for Production
**Tested:** ✅ Yes
**Documentation:** ✅ Complete

