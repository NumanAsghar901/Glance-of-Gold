-- Glance of Gold: core schema (enums, tables, indexes, triggers).
-- Money columns are integer PKR (whole rupees).

create schema if not exists private;

-- Enums ---------------------------------------------------------------------
create type public.order_status as enum
  ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_method as enum ('cod', 'jazzcash', 'easypaisa', 'bank_transfer');
create type public.payment_status as enum
  ('unpaid', 'awaiting_verification', 'paid', 'failed', 'refunded');
create type public.discount_type as enum ('percent', 'fixed');

-- Helpers -------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin accounts ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- Catalogue -----------------------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image_url text,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  category_id bigint references public.categories (id) on delete set null,
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price is null or compare_at_price > price),
  material text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  -- Dummy data flag so admin can bulk-delete placeholder products later.
  is_sample boolean not null default false,
  search tsvector generated always as (
    to_tsvector('simple', name || ' ' || coalesce(description, '') || ' ' || coalesce(material, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort int not null default 0,
  blur_data_url text
);

-- Every product has at least one variant; stock lives on variants.
create table public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  sku text not null unique,
  name text not null default 'Standard',
  price_override int check (price_override is null or price_override >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort int not null default 0
);

-- Marketing -----------------------------------------------------------------
create table public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  discount_type public.discount_type not null,
  value int not null default 0,
  min_subtotal int not null default 0 check (min_subtotal >= 0),
  max_discount int check (max_discount is null or max_discount > 0),
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0 check (used_count >= 0),
  once_per_phone boolean not null default true,
  free_shipping boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (discount_type = 'percent' and value between 0 and 100)
    or (discount_type = 'fixed' and value >= 0)
  ),
  check (free_shipping or value > 0)
);

-- "Buy N, choose 1 free": the pool of free items is gift_offer_products.
create table public.gift_offers (
  id bigint generated always as identity primary key,
  name text not null,
  min_items int not null default 2 check (min_items >= 1),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.gift_offer_products (
  offer_id bigint not null references public.gift_offers (id) on delete cascade,
  variant_id bigint not null references public.product_variants (id) on delete cascade,
  primary key (offer_id, variant_id)
);

create table public.announcements (
  id bigint generated always as identity primary key,
  message text not null,
  link_url text,
  coupon_code text,
  sort int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.banners (
  id bigint generated always as identity primary key,
  image_url text not null,
  mobile_image_url text,
  heading text,
  subheading text,
  cta_label text,
  cta_url text,
  sort int not null default 0,
  is_active boolean not null default true
);

-- Orders --------------------------------------------------------------------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique default ('GG-' || nextval('public.order_number_seq')::text),
  -- Unguessable token for the confirmation page URL (order numbers are sequential).
  access_token uuid not null unique default gen_random_uuid(),
  customer_name text not null,
  phone text not null check (phone ~ '^03[0-9]{9}$'),
  email text,
  province text not null,
  city text not null,
  address text not null,
  landmark text,
  notes text,
  subtotal int not null check (subtotal >= 0),
  discount int not null default 0 check (discount >= 0),
  shipping_fee int not null default 0 check (shipping_fee >= 0),
  total int not null check (total >= 0),
  coupon_code text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  order_status public.order_status not null default 'pending',
  courier text,
  tracking_number text,
  whatsapp_confirmed_at timestamptz,
  cancel_reason text,
  stock_released boolean not null default false,
  -- Shared by the browser pixel and Conversions API for Purchase de-duplication.
  meta_event_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount + shipping_fee)
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  variant_id bigint references public.product_variants (id) on delete set null,
  -- Snapshot of what was sold, independent of later catalogue edits.
  name text not null,
  variant_name text,
  image_url text,
  unit_price int not null check (unit_price >= 0),
  qty int not null check (qty > 0),
  is_gift boolean not null default false
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.coupon_redemptions (
  id bigint generated always as identity primary key,
  coupon_id bigint not null references public.coupons (id) on delete restrict,
  order_id bigint not null unique references public.orders (id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.payment_accounts (
  id bigint generated always as identity primary key,
  method public.payment_method not null check (method <> 'cod'),
  account_title text,
  account_number text,
  iban text,
  bank_name text,
  instructions text,
  is_active boolean not null default false,
  sort int not null default 0
);

create table public.payment_proofs (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  transaction_id text,
  screenshot_path text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_log (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders (id) on delete set null,
  kind text not null,
  to_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Indexes (foreign keys and the columns the storefront filters / sorts on) ----
create index products_category_idx on public.products (category_id) where is_active;
create index products_featured_idx on public.products (created_at desc) where is_active and is_featured;
create index products_newest_idx on public.products (created_at desc) where is_active;
create index products_price_idx on public.products (price) where is_active;
create index products_search_idx on public.products using gin (search);
create index product_images_product_idx on public.product_images (product_id, sort);
create index product_variants_product_idx on public.product_variants (product_id, sort);
create index gift_offer_products_variant_idx on public.gift_offer_products (variant_id);
create index orders_created_idx on public.orders (created_at desc);
create index orders_phone_idx on public.orders (phone);
create index orders_status_idx on public.orders (order_status, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_events_order_idx on public.order_events (order_id, created_at);
create index coupon_redemptions_lookup_idx on public.coupon_redemptions (coupon_id, phone);
create index payment_proofs_order_idx on public.payment_proofs (order_id);
create index email_log_order_idx on public.email_log (order_id);
create index payment_proofs_verified_by_idx on public.payment_proofs (verified_by);

-- updated_at triggers ---------------------------------------------------------
create trigger products_set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();
create trigger settings_set_updated_at before update on public.settings
  for each row execute function private.set_updated_at();
