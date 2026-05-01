-- supabase/wallet_functions.sql
-- ─── Run this in Supabase SQL Editor AFTER schema.sql ─────
-- These are PL/pgSQL functions called via supabase.rpc()

-- ─── DEBIT WALLET ────────────────────────────────────────
-- Atomically deduct amount from wallet. Fails if balance < amount.
create or replace function debit_wallet(
  p_user_id  uuid,
  p_amount   numeric,
  p_reason   text,
  p_order_id uuid default null
)
returns numeric as $$
declare
  new_balance numeric;
begin
  update public.wallets
    set balance = balance - p_amount,
        updated_at = now()
  where user_id = p_user_id
    and balance >= p_amount
  returning balance into new_balance;

  if new_balance is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.transactions (user_id, amount, type, reason)
  values (p_user_id, p_amount, 'debit', p_reason);

  return new_balance;
end;
$$ language plpgsql security definer;

-- ─── CREDIT WALLET ───────────────────────────────────────
create or replace function credit_wallet(
  p_user_id   uuid,
  p_amount    numeric,
  p_reason    text,
  p_reference text default null
)
returns numeric as $$
declare
  new_balance numeric;
begin
  insert into public.wallets (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set
    balance = wallets.balance + p_amount,
    updated_at = now()
  returning balance into new_balance;

  insert into public.transactions (user_id, amount, type, reason, reference)
  values (p_user_id, p_amount, 'credit', p_reason, p_reference);

  return new_balance;
end;
$$ language plpgsql security definer;

-- ─── INCREMENT RIDER DELIVERIES ──────────────────────────
create or replace function increment_rider_deliveries(p_rider_id uuid)
returns void as $$
begin
  update public.riders
    set total_deliveries = total_deliveries + 1,
        updated_at = now()
  where id = p_rider_id;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users
grant execute on function debit_wallet  to authenticated;
grant execute on function credit_wallet to authenticated;
grant execute on function find_nearest_rider to authenticated;
grant execute on function increment_rider_deliveries to authenticated;
