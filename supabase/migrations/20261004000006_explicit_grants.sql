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
