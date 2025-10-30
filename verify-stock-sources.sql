-- ============================================
-- VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to check if tables exist
-- ============================================

-- Check if stock_sources table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_sources'
    ) THEN '✅ Table EXISTS'
    ELSE '❌ Table DOES NOT EXIST'
  END as table_status;

-- Check how many sources are in the table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_sources'
    ) THEN (
      SELECT COUNT(*)::text || ' sources found'
      FROM public.stock_sources
    )
    ELSE 'Table does not exist yet'
  END as row_count;

-- If table exists, show first 5 sources
SELECT key, name, cost, active 
FROM public.stock_sources 
LIMIT 5;

