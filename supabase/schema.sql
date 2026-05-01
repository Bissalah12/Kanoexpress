-- ═══════════════════════════════════════════════════════
-- KanoExpress — Supabase Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";   -- for geo queries

-- ─── USERS (customers) ──────────────────────────────────
create table public.users (
  id            uuid primary key default uuid_generate_v4(),
  phone         text unique not null,           -- e.g. "+2348012345678"
  name          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── WALLETS ────────────────────────────────────────────
create table public.wallets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id) on delete cascade,
  balance       numeric(12,2) default 0,
  updated_at    timestamptz default now(),
  unique(user_id)
);

-- ─── WALLET TRANSACTIONS ────────────────────────────────
create table public.transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id),
  amount        numeric(12,2) not null,
  type          text check (type in ('credit','debit')),
  reason        text,                            -- 'order_payment','refund','topup'
  reference     text,                            -- Paystack ref
  created_at    timestamptz default now()
);

-- ─── SHOPS ──────────────────────────────────────────────
create table public.shops (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text,                            -- 'Food','Pharmacy','Groceries'
  rating        numeric(2,1) default 4.5,
  delivery_fee  integer default 200,
  eta_min       integer default 20,
  eta_max       integer default 35,
  img_emoji     text default '🏪',
  color         text default '#FF5C1A',
  lat           double precision,
  lng           double precision,
  is_open       boolean default true,
  created_at    timestamptz default now()
);

-- ─── PRODUCTS ───────────────────────────────────────────
create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  shop_id       uuid references public.shops(id) on delete cascade,
  name          text not null,
  price         integer not null,
  img_emoji     text default '🍽️',
  available     boolean default true,
  created_at    timestamptz default now()
);

-- ─── RIDERS ─────────────────────────────────────────────
create table public.riders (
  id            uuid primary key default uuid_generate_v4(),
  phone         text unique not null,
  name          text,
  vehicle_type  text check (vehicle_type in ('bike','motorcycle','car')),
  is_online     boolean default false,
  is_verified   boolean default false,
  lat           double precision,
  lng           double precision,
  location_updated_at timestamptz,
  rating        numeric(2,1) default 5.0,
  total_deliveries integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── ORDERS ─────────────────────────────────────────────
create type order_status as enum (
  'pending',
  'accepted',
  'rider_assigned',
  'rider_at_pickup',
  'on_the_way',
  'delivered',
  'cancelled'
);

create type order_type as enum ('shop_order','peer_delivery');

create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    text unique not null,         -- e.g. "ORD-2841"
  type            order_type default 'shop_order',
  customer_id     uuid references public.users(id),
  rider_id        uuid references public.riders(id),
  shop_id         uuid references public.shops(id),  -- null for peer delivery
  status          order_status default 'pending',
  payment_method  text check (payment_method in ('cash','bank_transfer','wallet')),
  payment_status  text check (payment_status in ('pending','paid','failed')) default 'pending',
  paystack_ref    text,
  subtotal        integer default 0,
  delivery_fee    integer default 200,
  total           integer not null,
  pickup_address  text,
  dropoff_address text,
  pickup_lat      double precision,
  pickup_lng      double precision,
  dropoff_lat     double precision,
  dropoff_lng     double precision,
  item_description text,                         -- for peer delivery
  customer_rating  integer,
  customer_review  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── ORDER ITEMS ────────────────────────────────────────
create table public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id),
  product_name text not null,
  price       integer not null,
  qty         integer not null
);

-- ─── RIDER EARNINGS ─────────────────────────────────────
create table public.rider_earnings (
  id          uuid primary key default uuid_generate_v4(),
  rider_id    uuid references public.riders(id),
  order_id    uuid references public.orders(id),
  amount      integer not null,
  created_at  timestamptz default now()
);

-- ─── ORDER NUMBER SEQUENCE ──────────────────────────────
create sequence order_number_seq start 2841;

-- Auto-generate order number
create or replace function set_order_number()
returns trigger as $$
begin
  new.order_number := 'ORD-' || nextval('order_number_seq');
  return new;
end;
$$ language plpgsql;

create trigger trg_order_number
  before insert on public.orders
  for each row execute function set_order_number();

-- ─── UPDATE TIMESTAMPS ──────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_updated
  before update on public.orders
  for each row execute function update_updated_at();

create trigger trg_riders_updated
  before update on public.riders
  for each row execute function update_updated_at();

-- ─── RIDER DISPATCH FUNCTION ────────────────────────────
-- Finds the nearest online rider to a given coordinate
create or replace function find_nearest_rider(
  order_lat double precision,
  order_lng double precision
)
returns uuid as $$
declare
  rider_id uuid;
begin
  select r.id into rider_id
  from public.riders r
  where r.is_online = true
    and r.lat is not null
    and r.lng is not null
    and not exists (
      select 1 from public.orders o
      where o.rider_id = r.id
        and o.status in ('rider_assigned','rider_at_pickup','on_the_way')
    )
  order by
    (r.lat - order_lat)^2 + (r.lng - order_lng)^2 asc
  limit 1;

  return rider_id;
end;
$$ language plpgsql;

-- ─── SEED: SHOPS ────────────────────────────────────────
insert into public.shops (name, category, delivery_fee, eta_min, eta_max, img_emoji, color, lat, lng) values
  ('Mama Kano Kitchen',  'Food',      200, 20, 30, '🍲', '#FF5C1A', 12.0022, 8.5920),
  ('Dawaki Pharmacy',    'Pharmacy',  150, 15, 25, '💊', '#22C55E', 12.0155, 8.5284),
  ('BUK Market Groceries','Groceries',250, 25, 40, '🛒', '#3B82F6', 12.0083, 8.5437),
  ('Gidan Burgers',      'Food',      180, 15, 25, '🍔', '#FBBF24', 11.9907, 8.5274);

-- ─── SEED: PRODUCTS (Mama Kano Kitchen) ─────────────────
insert into public.products (shop_id, name, price, img_emoji) 
select id, 'Tuwo Shinkafa + Miyan Kuka', 1200, '🍲' from public.shops where name='Mama Kano Kitchen' union all
select id, 'Suya (Half Kg)',             2500, '🥩' from public.shops where name='Mama Kano Kitchen' union all
select id, 'Jollof Rice + Chicken',      1800, '🍛' from public.shops where name='Mama Kano Kitchen' union all
select id, 'Shawarma (Beef)',            1500, '🌯' from public.shops where name='Mama Kano Kitchen' union all
select id, 'Kilishi (200g)',              800, '🥓' from public.shops where name='Mama Kano Kitchen';

insert into public.products (shop_id, name, price, img_emoji)
select id, 'Paracetamol (12 tabs)',  300, '💊' from public.shops where name='Dawaki Pharmacy' union all
select id, 'Amoxicillin 500mg',     1200, '💉' from public.shops where name='Dawaki Pharmacy' union all
select id, 'ORS Sachets (x5)',       500, '🧴' from public.shops where name='Dawaki Pharmacy' union all
select id, 'Vitamin C 1000mg',       800, '🍊' from public.shops where name='Dawaki Pharmacy';

insert into public.products (shop_id, name, price, img_emoji)
select id, 'Rice (1kg)',             900, '🌾' from public.shops where name='BUK Market Groceries' union all
select id, 'Tomatoes (basket)',      600, '🍅' from public.shops where name='BUK Market Groceries' union all
select id, 'Onions (3pcs)',          400, '🧅' from public.shops where name='BUK Market Groceries' union all
select id, 'Groundnut Oil (1L)',    2200, '🫙' from public.shops where name='BUK Market Groceries' union all
select id, 'Eggs (crate)',          3200, '🥚' from public.shops where name='BUK Market Groceries';

insert into public.products (shop_id, name, price, img_emoji)
select id, 'Beef Burger + Fries', 3500, '🍔' from public.shops where name='Gidan Burgers' union all
select id, 'Chicken Burger',      2800, '🍗' from public.shops where name='Gidan Burgers' union all
select id, 'Milkshake',           1200, '🥤' from public.shops where name='Gidan Burgers';
