-- Glance of Gold: full database setup for a NEW Supabase project.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run. Run it ONCE on an empty project.
-- It is the six files in supabase/migrations/ joined in order.

-- ============================================================
-- 20261004000001_core_schema.sql
-- ============================================================
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

-- ============================================================
-- 20261004000002_rls_and_storage.sql
-- ============================================================
-- Row level security, grants and storage buckets.
-- Only admins have accounts. Customers never touch the database directly:
-- orders are created by server code using the service role (create_order RPC).

-- Admin check ------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

grant usage on schema private to authenticated;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Enable RLS everywhere --------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.coupons enable row level security;
alter table public.gift_offers enable row level security;
alter table public.gift_offer_products enable row level security;
alter table public.announcements enable row level security;
alter table public.banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.email_log enable row level security;
alter table public.settings enable row level security;

-- Defence in depth: anon gets only SELECT, and only on public catalogue tables.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on
  public.categories, public.products, public.product_images, public.product_variants,
  public.gift_offers, public.gift_offer_products, public.announcements, public.banners,
  public.payment_accounts, public.settings
to anon;

-- Admin: full access to every table ---------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_images', 'product_variants', 'coupons',
    'gift_offers', 'gift_offer_products', 'announcements', 'banners', 'orders',
    'order_items', 'order_events', 'coupon_redemptions', 'payment_accounts',
    'payment_proofs', 'email_log', 'settings'
  ] loop
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated
         using ((select private.is_admin())) with check ((select private.is_admin()))',
      t
    );
  end loop;
end
$$;

-- Profiles: a signed-in user can read only their own row.
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Public read policies ----------------------------------------------------------
create policy "public read active categories" on public.categories
  for select to anon, authenticated
  using (is_active);

create policy "public read active products" on public.products
  for select to anon, authenticated
  using (is_active);

create policy "public read images of active products" on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.is_active
  ));

create policy "public read variants of active products" on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.products p where p.id = product_id and p.is_active
  ));

create policy "public read live gift offers" on public.gift_offers
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "public read gift pool of live offers" on public.gift_offer_products
  for select to anon, authenticated
  using (exists (
    select 1 from public.gift_offers o
    where o.id = offer_id
      and o.is_active
      and (o.starts_at is null or o.starts_at <= now())
      and (o.ends_at is null or o.ends_at > now())
  ));

create policy "public read live announcements" on public.announcements
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "public read active banners" on public.banners
  for select to anon, authenticated
  using (is_active);

create policy "public read active payment accounts" on public.payment_accounts
  for select to anon, authenticated
  using (is_active);

create policy "public read settings" on public.settings
  for select to anon, authenticated
  using (true);

-- Storage -----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('payment-proofs', 'payment-proofs', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public bucket: anyone can read via the public URL; only admins can write.
create policy "admin manage product images" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()))
  with check (bucket_id = 'product-images' and (select private.is_admin()));

-- Private bucket: only admins can read. Customer uploads go through server
-- code with the service role, which bypasses RLS.
create policy "admin read payment proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (select private.is_admin()));

-- ============================================================
-- 20261004000003_functions.sql
-- ============================================================
-- Order creation, order status trigger and product search.

-- create_order ------------------------------------------------------------------
-- Called only by server code (service role). In ONE transaction it re-prices every
-- line from the database, locks and decrements stock, validates the coupon and the
-- free-gift offer, computes shipping and inserts the order. Nothing about money is
-- ever taken from the client. Errors are raised as 'CODE:detail' for the app to map.
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(payload #>> '{customer,name}', ''));
  v_phone text := regexp_replace(coalesce(payload #>> '{customer,phone}', ''), '[\s-]', '', 'g');
  v_email text := nullif(btrim(coalesce(payload #>> '{customer,email}', '')), '');
  v_province text := btrim(coalesce(payload #>> '{address,province}', ''));
  v_city text := btrim(coalesce(payload #>> '{address,city}', ''));
  v_address text := btrim(coalesce(payload #>> '{address,line}', ''));
  v_landmark text := nullif(btrim(coalesce(payload #>> '{address,landmark}', '')), '');
  v_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  v_method public.payment_method;
  v_coupon_code text := nullif(upper(btrim(coalesce(payload ->> 'coupon_code', ''))), '');
  v_gift_variant bigint := nullif(payload ->> 'gift_variant_id', '')::bigint;
  v_event_id uuid := coalesce(nullif(payload ->> 'meta_event_id', '')::uuid, gen_random_uuid());

  v_line record;
  v_row record;
  v_coupon record;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal int := 0;
  v_item_count int := 0;
  v_discount int := 0;
  v_free_ship_coupon boolean := false;
  v_has_coupon boolean := false;
  v_offer_id bigint;
  v_flat int;
  v_threshold int;
  v_shipping int;
  v_total int;
  v_order public.orders;
begin
  -- Validate input ----------------------------------------------------------------
  if length(v_name) < 2 then raise exception 'INVALID_INPUT:name'; end if;
  if v_phone like '+92%' then v_phone := '0' || substr(v_phone, 4);
  elsif v_phone ~ '^92[0-9]{10}$' then v_phone := '0' || substr(v_phone, 3);
  end if;
  if v_phone !~ '^03[0-9]{9}$' then raise exception 'INVALID_INPUT:phone'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_INPUT:email';
  end if;
  if length(v_province) < 2 or length(v_city) < 2 then raise exception 'INVALID_INPUT:city'; end if;
  if length(v_address) < 5 then raise exception 'INVALID_INPUT:address'; end if;

  begin
    v_method := (payload ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'INVALID_INPUT:payment_method';
  end;
  if v_method is null then raise exception 'INVALID_INPUT:payment_method'; end if;

  if jsonb_typeof(payload -> 'items') is distinct from 'array' then
    raise exception 'INVALID_INPUT:items';
  end if;
  if jsonb_array_length(payload -> 'items') not between 1 and 50 then
    raise exception 'INVALID_INPUT:items';
  end if;

  -- Lock variants (ordered by id to avoid deadlocks), check stock, price lines -----
  for v_line in
    select (e ->> 'variant_id')::bigint as variant_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(payload -> 'items') e
    group by 1
    order by 1
  loop
    if v_line.variant_id is null or v_line.qty is null or v_line.qty not between 1 and 20 then
      raise exception 'INVALID_INPUT:items';
    end if;

    select v.id as variant_id, v.stock, v.name as variant_name, v.is_active as v_active,
           p.id as product_id, p.name as product_name, p.is_active as p_active,
           coalesce(v.price_override, p.price) as unit_price,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_line.variant_id
       for update of v;

    if not found or not v_row.v_active or not v_row.p_active then
      raise exception 'ITEM_UNAVAILABLE:%', v_line.variant_id;
    end if;
    if v_row.stock < v_line.qty then
      raise exception 'OUT_OF_STOCK:%', v_line.variant_id;
    end if;

    update public.product_variants set stock = stock - v_line.qty where id = v_line.variant_id;

    v_subtotal := v_subtotal + v_row.unit_price * v_line.qty;
    v_item_count := v_item_count + v_line.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_row.product_id, 'variant_id', v_row.variant_id,
      'name', v_row.product_name, 'variant_name', v_row.variant_name,
      'image_url', v_row.image_url, 'unit_price', v_row.unit_price,
      'qty', v_line.qty, 'is_gift', false
    );
  end loop;

  -- Coupon -------------------------------------------------------------------------
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons where code = v_coupon_code for update;
    if not found
       or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
      raise exception 'COUPON_INVALID';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'COUPON_EXHAUSTED';
    end if;
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'COUPON_MIN_SUBTOTAL:%', v_coupon.min_subtotal;
    end if;
    if v_coupon.once_per_phone and exists (
      select 1 from public.coupon_redemptions r
      where r.coupon_id = v_coupon.id and r.phone = v_phone
    ) then
      raise exception 'COUPON_ALREADY_USED';
    end if;

    v_has_coupon := true;
    v_free_ship_coupon := v_coupon.free_shipping;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.value / 100.0)::int;
    else
      v_discount := v_coupon.value;
    end if;
    if v_coupon.max_discount is not null then
      v_discount := least(v_discount, v_coupon.max_discount);
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  -- Free gift ("buy N, choose 1 free") ---------------------------------------------
  if v_gift_variant is not null then
    select o.id into v_offer_id
      from public.gift_offers o
      join public.gift_offer_products gp on gp.offer_id = o.id
     where gp.variant_id = v_gift_variant
       and o.is_active
       and (o.starts_at is null or o.starts_at <= now())
       and (o.ends_at is null or o.ends_at > now())
       and o.min_items <= v_item_count
     order by o.min_items desc
     limit 1;
    if v_offer_id is null then raise exception 'GIFT_INVALID'; end if;

    select v.id as variant_id, v.stock, v.name as variant_name, v.is_active as v_active,
           p.id as product_id, p.name as product_name, p.is_active as p_active,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_gift_variant
       for update of v;

    if not found or not v_row.v_active or not v_row.p_active or v_row.stock < 1 then
      raise exception 'GIFT_OUT_OF_STOCK';
    end if;

    update public.product_variants set stock = stock - 1 where id = v_gift_variant;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_row.product_id, 'variant_id', v_row.variant_id,
      'name', v_row.product_name, 'variant_name', v_row.variant_name,
      'image_url', v_row.image_url, 'unit_price', 0, 'qty', 1, 'is_gift', true
    );
  end if;

  -- Shipping (values come from the settings table) ----------------------------------
  v_flat := coalesce((select (value #>> '{}')::int from public.settings where key = 'shipping_flat'), 100);
  v_threshold := coalesce(
    (select (value #>> '{}')::int from public.settings where key = 'free_shipping_threshold'), 2000);
  -- Free-shipping threshold uses the subtotal before any coupon discount.
  v_shipping := case when v_subtotal >= v_threshold or v_free_ship_coupon then 0 else v_flat end;
  v_total := v_subtotal - v_discount + v_shipping;

  -- Persist --------------------------------------------------------------------------
  insert into public.orders (
    customer_name, phone, email, province, city, address, landmark, notes,
    subtotal, discount, shipping_fee, total, coupon_code, payment_method,
    courier, meta_event_id
  ) values (
    v_name, v_phone, v_email, v_province, v_city, v_address, v_landmark, v_notes,
    v_subtotal, v_discount, v_shipping, v_total,
    case when v_has_coupon then v_coupon_code end, v_method,
    coalesce((select value #>> '{}' from public.settings where key = 'courier'), 'Leopards'),
    v_event_id
  ) returning * into v_order;

  insert into public.order_items
    (order_id, product_id, variant_id, name, variant_name, image_url, unit_price, qty, is_gift)
  select v_order.id, (l ->> 'product_id')::bigint, (l ->> 'variant_id')::bigint,
         l ->> 'name', l ->> 'variant_name', l ->> 'image_url',
         (l ->> 'unit_price')::int, (l ->> 'qty')::int, (l ->> 'is_gift')::boolean
    from jsonb_array_elements(v_lines) l;

  insert into public.order_events (order_id, status, note)
  values (v_order.id, 'pending', 'Order placed');

  if v_has_coupon then
    insert into public.coupon_redemptions (coupon_id, order_id, phone)
    values (v_coupon.id, v_order.id, v_phone);
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'meta_event_id', v_order.meta_event_id,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'shipping_fee', v_order.shipping_fee,
    'total', v_order.total
  );
end;
$$;

revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- Order status trigger -----------------------------------------------------------------
-- Whatever sets an order to 'cancelled' (admin panel or SQL), stock and the coupon
-- use are given back exactly once, and every status change is written to order_events.
create or replace function private.handle_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_status is distinct from old.order_status then
    if old.order_status = 'cancelled' then
      raise exception 'Cancelled orders cannot be reopened';
    end if;

    if new.order_status = 'cancelled' and not old.stock_released then
      update public.product_variants v
         set stock = v.stock + i.qty
        from (
          select variant_id, sum(qty)::int as qty
            from public.order_items
           where order_id = new.id and variant_id is not null
           group by variant_id
        ) i
       where v.id = i.variant_id;

      with released as (
        delete from public.coupon_redemptions where order_id = new.id returning coupon_id
      )
      update public.coupons c
         set used_count = greatest(c.used_count - 1, 0)
        from released
       where c.id = released.coupon_id;

      new.stock_released := true;
    end if;

    insert into public.order_events (order_id, status, note)
    values (
      new.id,
      new.order_status::text,
      case when new.order_status = 'cancelled' then new.cancel_reason end
    );
  end if;
  return new;
end;
$$;

revoke execute on function private.handle_order_status() from public, anon, authenticated;

create trigger orders_status_change
  before update on public.orders
  for each row execute function private.handle_order_status();

-- Product search -------------------------------------------------------------------------
-- Prefix-aware full-text search ("neck" finds "necklace"). Security invoker, so RLS
-- applies and only active products are returned to the public.
create or replace function public.search_products(q text, lim int default 24)
returns setof public.products
language sql
stable
set search_path = ''
as $$
  select p.*
    from public.products p
   cross join lateral (
     select nullif(btrim(regexp_replace(coalesce(q, ''), '[^[:alnum:] ]', ' ', 'g')), '') as s
   ) clean
   cross join lateral (
     select to_tsquery('simple', regexp_replace(clean.s, '\s+', ':* & ', 'g') || ':*') as tq
   ) query
   where clean.s is not null
     and p.is_active
     and p.search @@ query.tq
   order by ts_rank(p.search, query.tq) desc, p.created_at desc
   limit least(greatest(coalesce(lim, 24), 1), 48);
$$;

-- ============================================================
-- 20261004000004_seed_sample_data.sql
-- ============================================================
-- Seed: settings, categories, payment account slots, sample products, offers.
-- All products here are placeholders (is_sample = true). Admin can delete them in
-- one click once real products are added. Images point at /public/placeholders.

insert into public.settings (key, value) values
  ('shipping_flat', '100'),
  ('free_shipping_threshold', '2000'),
  ('courier', '"Leopards"'),
  ('whatsapp_number', '"923166568142"'),
  ('helpline', '"0316 6568142"'),
  ('contact_email', '"Glanceofgold@gmail.com"')
on conflict (key) do nothing;

-- Real account details are entered by the owner in admin; inactive until then.
insert into public.payment_accounts (method, account_title, instructions, is_active, sort) values
  ('jazzcash', null, 'Account details will be added by the store.', false, 1),
  ('easypaisa', null, 'Account details will be added by the store.', false, 2),
  ('bank_transfer', null, 'Account details will be added by the store.', false, 3);

insert into public.categories (slug, name, description, sort) values
  ('necklaces', 'Necklaces', 'Layered chains, pendants and chokers.', 1),
  ('earrings', 'Earrings', 'Studs, hoops, drops and jhumkas.', 2),
  ('rings', 'Rings', 'Solitaires, signets and stacking bands.', 3),
  ('bangles-bracelets', 'Bangles & Bracelets', 'Kadas, bangle pairs and delicate chains.', 4),
  ('sets', 'Sets', 'Matching sets for weddings and occasions.', 5);

insert into public.products
  (slug, name, description, category_id, price, compare_at_price, material, tags, is_featured, is_sample)
select v.slug, v.name, v.description, c.id, v.price, v.compare_at, 'Gold tone', v.tags, v.featured, true
from (values
  ('aurelia-layered-necklace', 'Aurelia Layered Necklace', 'Two fine chains at different lengths for an easy layered look. Sample product.', 'necklaces', 2450, 2950, '{layered,everyday}'::text[], true),
  ('lumiere-pendant-chain', 'Lumiere Pendant Chain', 'A single polished pendant on a slim chain. Sample product.', 'necklaces', 1850, null, '{pendant,everyday}', false),
  ('serene-pearl-choker', 'Serene Pearl Choker', 'A close-fitting choker with a soft pearl finish. Sample product.', 'necklaces', 2150, null, '{choker,pearl}', true),
  ('celeste-drop-earrings', 'Celeste Drop Earrings', 'Lightweight drops that catch the light as you move. Sample product.', 'earrings', 1250, null, '{drop,party}', true),
  ('orbit-hoop-earrings', 'Orbit Hoop Earrings', 'Slim hoops sized for everyday wear. Sample product.', 'earrings', 950, null, '{hoop,everyday}', false),
  ('dahlia-stud-set', 'Dahlia Stud Set', 'Three pairs of small studs to mix and match. Sample product.', 'earrings', 750, null, '{stud,gift}', false),
  ('kiran-jhumka-earrings', 'Kiran Jhumka Earrings', 'A modern take on the classic jhumka. Sample product.', 'earrings', 1650, 1950, '{jhumka,festive}', true),
  ('solitaire-glow-ring', 'Solitaire Glow Ring', 'A single stone ring with a clean, simple band. Sample product.', 'rings', 1350, null, '{solitaire}', false),
  ('twine-stacking-set', 'Twine Stacking Set', 'Three slim bands designed to be worn together. Sample product.', 'rings', 1150, null, '{stacking,everyday}', false),
  ('regal-signet-ring', 'Regal Signet Ring', 'A flat-top signet with a smooth polished face. Sample product.', 'rings', 1450, null, '{signet}', true),
  ('heirloom-kada-bangle', 'Heirloom Kada Bangle', 'A statement kada with a hand-finished edge. Sample product.', 'bangles-bracelets', 2850, null, '{kada,festive}', true),
  ('delicate-chain-bracelet', 'Delicate Chain Bracelet', 'A fine chain bracelet with an adjustable clasp. Sample product.', 'bangles-bracelets', 1450, null, '{chain,everyday}', false),
  ('mehr-bangle-pair', 'Mehr Bangle Pair', 'A matched pair of slim bangles. Sample product.', 'bangles-bracelets', 2250, null, '{bangle,pair}', false),
  ('noor-bridal-set', 'Noor Bridal Set', 'Necklace, earrings and tikka in one coordinated set. Sample product.', 'sets', 6500, 7500, '{bridal,set}', true),
  ('zarina-party-set', 'Zarina Party Set', 'A necklace and earring set for evenings and events. Sample product.', 'sets', 3950, null, '{party,set}', false)
) as v(slug, name, description, cat, price, compare_at, tags, featured)
join public.categories c on c.slug = v.cat;

-- Two images per product (second one is used for the hover crossfade).
insert into public.product_images (product_id, url, alt, sort)
select p.id, '/placeholders/' || c.slug || '-' || s.k || '.svg', p.name || ' (sample image)', s.ord
from public.products p
join public.categories c on c.id = p.category_id
cross join (values ('a', 0), ('b', 1)) as s(k, ord)
where p.is_sample;

-- Variants: ring sizes, bangle sizes, otherwise a single "Standard" variant.
insert into public.product_variants (product_id, sku, name, stock, sort)
select p.id,
       'GG-' || p.id || '-' || regexp_replace(upper(o.name), '[^A-Z0-9]', '', 'g'),
       o.name, o.stock, o.ord
from public.products p
join public.categories c on c.id = p.category_id
join (values
  ('rings', 'Size 6', 8, 0), ('rings', 'Size 7', 10, 1),
  ('rings', 'Size 8', 10, 2), ('rings', 'Size 9', 6, 3),
  ('bangles-bracelets', '2.4', 8, 0), ('bangles-bracelets', '2.6', 10, 1),
  ('bangles-bracelets', '2.8', 8, 2),
  ('necklaces', 'Standard', 20, 0), ('earrings', 'Standard', 30, 0),
  ('sets', 'Standard', 12, 0)
) as o(cat, name, stock, ord) on o.cat = c.slug
where p.is_sample;

-- "Buy 2, choose 1 free": the gift pool is two low-priced sample earrings.
with offer as (
  insert into public.gift_offers (name, min_items, is_active)
  values ('Buy 2, choose 1 free gift', 2, true)
  returning id
)
insert into public.gift_offer_products (offer_id, variant_id)
select offer.id, v.id
from offer
cross join public.product_variants v
join public.products p on p.id = v.product_id
where p.slug in ('dahlia-stud-set', 'orbit-hoop-earrings');

insert into public.announcements (message, sort) values
  ('Free delivery on orders over Rs. 2,000', 1),
  ('Buy 2, choose 1 free gift', 2);

-- ============================================================
-- 20261004000005_order_items_product_index.sql
-- ============================================================
-- Covers the order_items.product_id foreign key (flagged by the performance advisor).
create index order_items_product_idx on public.order_items (product_id);

-- ============================================================
-- 20261004000006_explicit_grants.sql
-- ============================================================
-- Supabase no longer auto-grants data privileges on new public tables, so grant them
-- explicitly. RLS still decides which rows each role can see or change.
--   service_role  : server code (orders, uploads, lookups). Bypasses RLS.
--   authenticated : admins only (the sole accounts). RLS admin policies gate every table.
--   anon          : unchanged. SELECT on public catalogue tables only (migration 2).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- profiles is read-only for signed-in users (own row); created by the admin script.
grant select, insert, update, delete on
  public.categories, public.products, public.product_images, public.product_variants,
  public.coupons, public.gift_offers, public.gift_offer_products, public.announcements,
  public.banners, public.orders, public.order_items, public.order_events,
  public.coupon_redemptions, public.payment_accounts, public.payment_proofs,
  public.email_log, public.settings
to authenticated;
grant select on public.profiles to authenticated;

-- Future tables created by migrations get service_role access automatically.
-- authenticated/anon access is always granted explicitly per table.
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

-- ============================================================
-- 20261005000001_reviews_and_sold_counts.sql
-- ============================================================
-- Reviews, ratings and sold counts.
-- Safe to run once on the existing database. (supabase/setup.sql already ends with this file.)

alter table public.products
  add column if not exists sold_count int not null default 0 check (sold_count >= 0),
  add column if not exists rating_avg numeric(3, 2) not null default 0,
  add column if not exists rating_count int not null default 0;

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 60),
  city text,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 800),
  -- Sample reviews are placeholder content that the admin can delete in one click.
  is_sample boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc) where is_visible;
create index if not exists reviews_home_idx on public.reviews (created_at desc) where is_visible and rating >= 4;

alter table public.reviews enable row level security;

create policy "public read visible reviews" on public.reviews
  for select to anon, authenticated
  using (is_visible);

create policy "admin full access" on public.reviews
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;

-- Keep each product's rating summary in step with its visible reviews.
create or replace function private.refresh_product_rating(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
     set rating_avg = coalesce(r.avg, 0), rating_count = coalesce(r.cnt, 0)
    from (
      select round(avg(rating)::numeric, 2) as avg, count(*)::int as cnt
        from public.reviews
       where product_id = p_id and is_visible
    ) r
   where p.id = p_id;
$$;

create or replace function private.reviews_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_product_rating(old.product_id);
    return old;
  end if;

  perform private.refresh_product_rating(new.product_id);
  if tg_op = 'UPDATE' and new.product_id <> old.product_id then
    perform private.refresh_product_rating(old.product_id);
  end if;

  -- A new customer review counts as one more sale. Sample reviews are seeded with their own sold count.
  if tg_op = 'INSERT' and not new.is_sample then
    update public.products set sold_count = sold_count + 1 where id = new.product_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.refresh_product_rating(bigint) from public, anon, authenticated;
revoke execute on function private.reviews_changed() from public, anon, authenticated;

drop trigger if exists reviews_after_change on public.reviews;
create trigger reviews_after_change
  after insert or update or delete on public.reviews
  for each row execute function private.reviews_changed();

-- Orders now bump sold counts (and cancelling an order takes them back).
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(payload #>> '{customer,name}', ''));
  v_phone text := regexp_replace(coalesce(payload #>> '{customer,phone}', ''), '[\s-]', '', 'g');
  v_email text := nullif(btrim(coalesce(payload #>> '{customer,email}', '')), '');
  v_province text := btrim(coalesce(payload #>> '{address,province}', ''));
  v_city text := btrim(coalesce(payload #>> '{address,city}', ''));
  v_address text := btrim(coalesce(payload #>> '{address,line}', ''));
  v_landmark text := nullif(btrim(coalesce(payload #>> '{address,landmark}', '')), '');
  v_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  v_method public.payment_method;
  v_coupon_code text := nullif(upper(btrim(coalesce(payload ->> 'coupon_code', ''))), '');
  v_gift_variant bigint := nullif(payload ->> 'gift_variant_id', '')::bigint;
  v_event_id uuid := coalesce(nullif(payload ->> 'meta_event_id', '')::uuid, gen_random_uuid());

  v_line record;
  v_row record;
  v_coupon record;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal int := 0;
  v_item_count int := 0;
  v_discount int := 0;
  v_free_ship_coupon boolean := false;
  v_has_coupon boolean := false;
  v_offer_id bigint;
  v_flat int;
  v_threshold int;
  v_shipping int;
  v_total int;
  v_order public.orders;
begin
  -- Validate input ----------------------------------------------------------------
  if length(v_name) < 2 then raise exception 'INVALID_INPUT:name'; end if;
  if v_phone like '+92%' then v_phone := '0' || substr(v_phone, 4);
  elsif v_phone ~ '^92[0-9]{10}$' then v_phone := '0' || substr(v_phone, 3);
  end if;
  if v_phone !~ '^03[0-9]{9}$' then raise exception 'INVALID_INPUT:phone'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_INPUT:email';
  end if;
  if length(v_province) < 2 or length(v_city) < 2 then raise exception 'INVALID_INPUT:city'; end if;
  if length(v_address) < 5 then raise exception 'INVALID_INPUT:address'; end if;

  begin
    v_method := (payload ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'INVALID_INPUT:payment_method';
  end;
  if v_method is null then raise exception 'INVALID_INPUT:payment_method'; end if;

  if jsonb_typeof(payload -> 'items') is distinct from 'array' then
    raise exception 'INVALID_INPUT:items';
  end if;
  if jsonb_array_length(payload -> 'items') not between 1 and 50 then
    raise exception 'INVALID_INPUT:items';
  end if;

  -- Lock variants (ordered by id to avoid deadlocks), check stock, price lines -----
  for v_line in
    select (e ->> 'variant_id')::bigint as variant_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(payload -> 'items') e
    group by 1
    order by 1
  loop
    if v_line.variant_id is null or v_line.qty is null or v_line.qty not between 1 and 20 then
      raise exception 'INVALID_INPUT:items';
    end if;

    select v.id as variant_id, v.stock, v.name as variant_name, v.is_active as v_active,
           p.id as product_id, p.name as product_name, p.is_active as p_active,
           coalesce(v.price_override, p.price) as unit_price,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_line.variant_id
       for update of v;

    if not found or not v_row.v_active or not v_row.p_active then
      raise exception 'ITEM_UNAVAILABLE:%', v_line.variant_id;
    end if;
    if v_row.stock < v_line.qty then
      raise exception 'OUT_OF_STOCK:%', v_line.variant_id;
    end if;

    update public.product_variants set stock = stock - v_line.qty where id = v_line.variant_id;

    v_subtotal := v_subtotal + v_row.unit_price * v_line.qty;
    v_item_count := v_item_count + v_line.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_row.product_id, 'variant_id', v_row.variant_id,
      'name', v_row.product_name, 'variant_name', v_row.variant_name,
      'image_url', v_row.image_url, 'unit_price', v_row.unit_price,
      'qty', v_line.qty, 'is_gift', false
    );
  end loop;

  -- Coupon -------------------------------------------------------------------------
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons where code = v_coupon_code for update;
    if not found
       or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
      raise exception 'COUPON_INVALID';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'COUPON_EXHAUSTED';
    end if;
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'COUPON_MIN_SUBTOTAL:%', v_coupon.min_subtotal;
    end if;
    if v_coupon.once_per_phone and exists (
      select 1 from public.coupon_redemptions r
      where r.coupon_id = v_coupon.id and r.phone = v_phone
    ) then
      raise exception 'COUPON_ALREADY_USED';
    end if;

    v_has_coupon := true;
    v_free_ship_coupon := v_coupon.free_shipping;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.value / 100.0)::int;
    else
      v_discount := v_coupon.value;
    end if;
    if v_coupon.max_discount is not null then
      v_discount := least(v_discount, v_coupon.max_discount);
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  -- Free gift ("buy N, choose 1 free") ---------------------------------------------
  if v_gift_variant is not null then
    select o.id into v_offer_id
      from public.gift_offers o
      join public.gift_offer_products gp on gp.offer_id = o.id
     where gp.variant_id = v_gift_variant
       and o.is_active
       and (o.starts_at is null or o.starts_at <= now())
       and (o.ends_at is null or o.ends_at > now())
       and o.min_items <= v_item_count
     order by o.min_items desc
     limit 1;
    if v_offer_id is null then raise exception 'GIFT_INVALID'; end if;

    select v.id as variant_id, v.stock, v.name as variant_name, v.is_active as v_active,
           p.id as product_id, p.name as product_name, p.is_active as p_active,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_gift_variant
       for update of v;

    if not found or not v_row.v_active or not v_row.p_active or v_row.stock < 1 then
      raise exception 'GIFT_OUT_OF_STOCK';
    end if;

    update public.product_variants set stock = stock - 1 where id = v_gift_variant;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_row.product_id, 'variant_id', v_row.variant_id,
      'name', v_row.product_name, 'variant_name', v_row.variant_name,
      'image_url', v_row.image_url, 'unit_price', 0, 'qty', 1, 'is_gift', true
    );
  end if;

  -- Shipping (values come from the settings table) ----------------------------------
  v_flat := coalesce((select (value #>> '{}')::int from public.settings where key = 'shipping_flat'), 100);
  v_threshold := coalesce(
    (select (value #>> '{}')::int from public.settings where key = 'free_shipping_threshold'), 2000);
  -- Free-shipping threshold uses the subtotal before any coupon discount.
  v_shipping := case when v_subtotal >= v_threshold or v_free_ship_coupon then 0 else v_flat end;
  v_total := v_subtotal - v_discount + v_shipping;

  -- Persist --------------------------------------------------------------------------
  insert into public.orders (
    customer_name, phone, email, province, city, address, landmark, notes,
    subtotal, discount, shipping_fee, total, coupon_code, payment_method,
    courier, meta_event_id
  ) values (
    v_name, v_phone, v_email, v_province, v_city, v_address, v_landmark, v_notes,
    v_subtotal, v_discount, v_shipping, v_total,
    case when v_has_coupon then v_coupon_code end, v_method,
    coalesce((select value #>> '{}' from public.settings where key = 'courier'), 'Leopards'),
    v_event_id
  ) returning * into v_order;

  insert into public.order_items
    (order_id, product_id, variant_id, name, variant_name, image_url, unit_price, qty, is_gift)
  select v_order.id, (l ->> 'product_id')::bigint, (l ->> 'variant_id')::bigint,
         l ->> 'name', l ->> 'variant_name', l ->> 'image_url',
         (l ->> 'unit_price')::int, (l ->> 'qty')::int, (l ->> 'is_gift')::boolean
    from jsonb_array_elements(v_lines) l;

  -- Sold counts: paid items only (free gifts do not count).
  update public.products p
     set sold_count = p.sold_count + s.qty
    from (
      select (l ->> 'product_id')::bigint as pid, sum((l ->> 'qty')::int)::int as qty
        from jsonb_array_elements(v_lines) l
       where not (l ->> 'is_gift')::boolean
       group by 1
    ) s
   where p.id = s.pid;

  insert into public.order_events (order_id, status, note)
  values (v_order.id, 'pending', 'Order placed');

  if v_has_coupon then
    insert into public.coupon_redemptions (coupon_id, order_id, phone)
    values (v_coupon.id, v_order.id, v_phone);
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'meta_event_id', v_order.meta_event_id,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'shipping_fee', v_order.shipping_fee,
    'total', v_order.total
  );
end;
$$;

create or replace function private.handle_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_status is distinct from old.order_status then
    if old.order_status = 'cancelled' then
      raise exception 'Cancelled orders cannot be reopened';
    end if;

    if new.order_status = 'cancelled' and not old.stock_released then
      update public.product_variants v
         set stock = v.stock + i.qty
        from (
          select variant_id, sum(qty)::int as qty
            from public.order_items
           where order_id = new.id and variant_id is not null
           group by variant_id
        ) i
       where v.id = i.variant_id;

      with released as (
        delete from public.coupon_redemptions where order_id = new.id returning coupon_id
      )
      update public.coupons c
         set used_count = greatest(c.used_count - 1, 0)
        from released
       where c.id = released.coupon_id;

      -- A cancelled order is not a sale any more.
      update public.products p
         set sold_count = greatest(p.sold_count - s.qty, 0)
        from (
          select product_id, sum(qty)::int as qty
            from public.order_items
           where order_id = new.id and not is_gift and product_id is not null
           group by product_id
        ) s
       where p.id = s.product_id;

      new.stock_released := true;
    end if;

    insert into public.order_events (order_id, status, note)
    values (
      new.id,
      new.order_status::text,
      case when new.order_status = 'cancelled' then new.cancel_reason end
    );
  end if;
  return new;
end;
$$;
