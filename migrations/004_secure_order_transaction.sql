-- Migration: Secure order placement and balance deductions
-- Adds server-side helper functions that enforce balance checks when creating orders

SET search_path = public;

CREATE OR REPLACE FUNCTION public.secure_deduct_balance(p_user_id uuid, p_amount numeric)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount to deduct must be non-negative';
  END IF;

  UPDATE public.profiles
     SET balance = balance - p_amount,
         updated_at = NOW()
   WHERE id = p_user_id
     AND balance >= p_amount
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or profile missing';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.secure_deduct_balance(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_deduct_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_deduct_balance(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.secure_create_stock_order(
  p_user_id  uuid,
  p_task_id  text,
  p_amount   numeric,
  p_file_info jsonb,
  p_status   text DEFAULT 'processing'
)
RETURNS public.stock_order
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_order public.stock_order;
  normalized_status text := COALESCE(NULLIF(p_status, ''), 'processing');
BEGIN
  IF p_task_id IS NULL OR LENGTH(TRIM(p_task_id)) = 0 THEN
    RAISE EXCEPTION 'Task id is required';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be non-negative';
  END IF;

  IF EXISTS (SELECT 1 FROM public.stock_order WHERE task_id = p_task_id) THEN
    RAISE EXCEPTION 'Order with this task id already exists';
  END IF;

  IF p_amount > 0 THEN
    PERFORM public.secure_deduct_balance(p_user_id, p_amount);
  ELSE
    PERFORM 1 FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
  END IF;

  INSERT INTO public.stock_order (user_id, task_id, file_info, status)
  VALUES (p_user_id, p_task_id, p_file_info, normalized_status)
  RETURNING * INTO created_order;

  RETURN created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_create_stock_order(uuid, text, numeric, jsonb, text) TO authenticated;

-- Ensure PostgREST picks up the new/changed functions immediately
SELECT pg_notify('pgrst', 'reload schema');
