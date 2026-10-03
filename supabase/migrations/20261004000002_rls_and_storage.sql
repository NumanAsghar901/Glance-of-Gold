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
