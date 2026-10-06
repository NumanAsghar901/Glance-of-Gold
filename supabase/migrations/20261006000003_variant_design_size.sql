-- Separate Design and Size on a variant, next to Colour, so a product can offer designs AND sizes
-- (and colours) together, each with its own picker on the product page.
-- Run after 20261006000002_product_options.sql. Safe to run more than once.
--
-- A variant is still one buyable thing with its own stock and price, for example
-- Gold, Design A, Size 6. Its `name` keeps the full label, so the bag, orders, emails and the admin
-- order page need no change. color, design and size are kept apart so the store can group them.

alter table public.product_variants
  add column if not exists design text,
  add column if not exists size text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.product_variants'::regclass and conname = 'product_variants_design_check') then
    alter table public.product_variants
      add constraint product_variants_design_check check (design is null or char_length(design) between 1 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.product_variants'::regclass and conname = 'product_variants_size_check') then
    alter table public.product_variants
      add constraint product_variants_size_check check (size is null or char_length(size) between 1 and 30);
  end if;
end $$;

-- Move what the old single label held into the right place, so existing products look the same.
-- Rules: a label that starts with "Size" is a size; otherwise a product labelled Design holds designs,
-- and anything else (Size, or the generic Option such as bangle sizes 2.4 / 2.6) holds sizes.
-- "Standard" means no attribute. Only variants that have not been sorted yet are touched.
with parsed as (
  select
    v.id,
    p.option_label,
    left(
      case
        when v.color is null then v.name
        when v.name = v.color then ''
        when v.name like v.color || ', %' then substr(v.name, char_length(v.color) + 3)
        else v.name
      end,
      30
    ) as label
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.design is null and v.size is null
)
update public.product_variants v
   set design = case
                  when pa.label <> '' and lower(pa.label) <> 'standard'
                   and pa.option_label = 'Design' and pa.label !~* '^size'
                  then pa.label
                end,
       size   = case
                  when pa.label <> '' and lower(pa.label) <> 'standard'
                   and (pa.option_label <> 'Design' or pa.label ~* '^size')
                  then pa.label
                end
  from parsed pa
 where pa.id = v.id;
