-- Migration: Secure order placement and balance deductions
-- Adds server-side helper functions that enforce balance checks when creating orders

create or replace function public.secure_deduct_balance(p_user_id uuid, p_amount numeric)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'Amount to deduct must be non-negative';
  end if;

  update public.profiles
    set balance = balance - p_amount,
        updated_at = now()
    where id = p_user_id
      and balance >= p_amount
    returning * into updated_profile;

  if not found then
    raise exception 'Insufficient balance or profile missing';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.secure_deduct_balance(uuid, numeric) from public;
grant execute on function public.secure_deduct_balance(uuid, numeric) to service_role;
grant execute on function public.secure_deduct_balance(uuid, numeric) to authenticated;

create or replace function public.secure_create_stock_order(
    p_user_id uuid,
    p_task_id text,
    p_amount numeric,
    p_file_info jsonb,
    p_status text default 'processing'
)
returns public.stock_order
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order public.stock_order;
  normalized_status text := coalesce(nullif(p_status, ''), 'processing');
begin
  if p_task_id is null or length(trim(p_task_id)) = 0 then
    raise exception 'Task id is required';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be non-negative';
  end if;

  if exists (select 1 from public.stock_order where task_id = p_task_id) then
    raise exception 'Order with this task id already exists';
  end if;

  if p_amount > 0 then
    perform public.secure_deduct_balance(p_user_id, p_amount);
  else
    perform 1 from public.profiles where id = p_user_id;
    if not found then
      raise exception 'Profile not found';
    end if;
  end if;

  insert into public.stock_order (user_id, task_id, file_info, status)
  values (p_user_id, p_task_id, p_file_info, normalized_status)
  returning * into created_order;

  return created_order;
end;
$$;

revoke all on function public.secure_create_stock_order(uuid, text, numeric, jsonb, text) from public;
grant execute on function public.secure_create_stock_order(uuid, text, numeric, jsonb, text) to service_role;
grant execute on function public.secure_create_stock_order(uuid, text, numeric, jsonb, text) to authenticated;

-- Ensure PostgREST becomes aware of the new function immediately. Without this the
-- schema cache can serve stale metadata and the RPC call fails with
-- "Could not find the function ... in the schema cache".
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
