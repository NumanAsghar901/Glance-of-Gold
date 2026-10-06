-- Product options: colours, a size or design label, and "select several at once".
-- Safe to run more than once. (supabase/setup.sql ends with this file.)
--
-- How it fits together:
--   * Each product_variants row is still one thing a customer can buy, with its own stock and price.
--   * product_variants.color is optional. The variant's name keeps the full label ("Gold, Size 6"),
--     so the cart, orders, emails and the admin order page show the colour without any other change.
--   * products.option_label says what the variants are called on the product page.
--   * products.allow_multiple lets a customer pick several variants at once (several ring sizes,
--     several designs). The price shown is the total of the ones they pick.

alter table public.products
  add column if not exists option_label text not null default 'Option',
  add column if not exists allow_multiple boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.products'::regclass and conname = 'products_option_label_check'
  ) then
    alter table public.products
      add constraint products_option_label_check check (option_label in ('Size', 'Design', 'Option'));
  end if;
end $$;

alter table public.product_variants
  add column if not exists color text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.product_variants'::regclass and conname = 'product_variants_color_check'
  ) then
    alter table public.product_variants
      add constraint product_variants_color_check check (color is null or char_length(color) between 1 and 30);
  end if;
end $$;

-- Rings are sold by size, and a customer may want several sizes in one order.
-- Only products that have not been set up yet are touched; the owner can change this in the admin.
update public.products p
   set option_label = 'Size', allow_multiple = true
  from public.categories c
 where p.category_id = c.id
   and c.slug in ('rings', 'nose-rings')
   and p.option_label = 'Option'
   and p.allow_multiple = false;
