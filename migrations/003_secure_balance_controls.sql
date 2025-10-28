-- Migration: Secure balance adjustments and prevent negative deductions
-- Date: 2024-12-19

-- Ensure balances cannot drop below zero
ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_balance_non_negative,
    ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);

-- Function to safely deduct points without allowing negative amounts
CREATE OR REPLACE FUNCTION public.deduct_points(amount_to_deduct numeric)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_profile public.profiles;
BEGIN
    IF amount_to_deduct IS NULL OR amount_to_deduct < 0 THEN
        RAISE EXCEPTION 'Amount to deduct must be non-negative';
    END IF;

    UPDATE public.profiles
        SET balance = balance - amount_to_deduct,
            updated_at = NOW()
        WHERE id = auth.uid()
          AND balance >= amount_to_deduct
        RETURNING * INTO updated_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance or profile missing';
    END IF;

    RETURN updated_profile;
END;
$$;
