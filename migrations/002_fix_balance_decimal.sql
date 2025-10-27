-- Migration: Fix balance column to support decimal values
-- Date: 2025-10-27
-- Issue: Balance column was integer but stock costs are decimals (0.5, 0.65, etc.)
-- This caused "invalid input syntax for type integer: '98.85'" errors

-- Change balance column from integer to numeric(10, 2)
-- Allows up to 10 digits total, with 2 decimal places (e.g., 99999999.99)
ALTER TABLE profiles 
ALTER COLUMN balance TYPE numeric(10, 2);

-- Ensure existing balances are properly formatted with decimals
UPDATE profiles 
SET balance = balance::numeric(10, 2)
WHERE balance IS NOT NULL;

