-- ═══════════════════════════════════════════════════════
-- KanoExpress — Row Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.users           enable row level security;
alter table public.wallets         enable row level security;
alter table public.transactions    enable row level security;
alter table public.shops           enable row level security;
alter table public.products        enable row level security;
alter table public.riders          enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.rider_earnings  enable row level security;

-- ─── SHOPS & PRODUCTS: public read ──────────────────────
create policy "anyone can read shops"
  on public.shops for select using (true);

create policy "anyone can read products"
  on public.products for select using (true);

-- ─── USERS: own row only ────────────────────────────────
create policy "users read own"
  on public.users for select
  using (id = auth.uid());

create policy "users update own"
  on public.users for update
  using (id = auth.uid());

create policy "users insert own"
  on public.users for insert
  with check (id = auth.uid());

-- ─── WALLETS ────────────────────────────────────────────
create policy "wallet owner read"
  on public.wallets for select
  using (user_id = auth.uid());

create policy "wallet owner update"
  on public.wallets for update
  using (user_id = auth.uid());

-- ─── TRANSACTIONS ────────────────────────────────────────
create policy "transactions own"
  on public.transactions for select
  using (user_id = auth.uid());

-- ─── ORDERS: customer or assigned rider ─────────────────
create policy "order customer read"
  on public.orders for select
  using (customer_id = auth.uid());

create policy "order rider read"
  on public.orders for select
  using (rider_id = auth.uid());

create policy "order customer insert"
  on public.orders for insert
  with check (customer_id = auth.uid());

create policy "order status update by rider"
  on public.orders for update
  using (rider_id = auth.uid());

create policy "order cancel by customer"
  on public.orders for update
  using (customer_id = auth.uid() and status = 'pending');

-- ─── ORDER ITEMS ─────────────────────────────────────────
create policy "order items read by owner"
  on public.order_items for select
  using (
    order_id in (
      select id from public.orders
      where customer_id = auth.uid() or rider_id = auth.uid()
    )
  );

-- ─── RIDERS ──────────────────────────────────────────────
create policy "rider read own"
  on public.riders for select
  using (id = auth.uid());

create policy "rider update own"
  on public.riders for update
  using (id = auth.uid());

-- Customers can see online riders (for dispatch display)
create policy "anyone can see online riders"
  on public.riders for select
  using (is_online = true);

-- ─── RIDER EARNINGS ──────────────────────────────────────
create policy "rider earnings own"
  on public.rider_earnings for select
  using (rider_id = auth.uid());

-- ─── SERVICE ROLE bypasses all RLS ───────────────────────
-- (Supabase service_role key automatically bypasses RLS)
-- Use service_role only in backend Edge Functions, never in client code
