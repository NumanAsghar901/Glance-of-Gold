-- Rebuild the full name of every variant that has a colour, size or design, so the cart, orders and emails
-- say "Size 6, Design 2" instead of a bare "6, 2". Run after 20261006000003_variant_design_size.sql.
-- Safe to run more than once. Same rules as composeVariantName in src/lib/variant-name.ts:
--   order: colour, size, design. A size or design is labelled ("6" becomes "Size 6") unless it already says
--   "size" or "design". "Standard" means nothing. A variant with none of the three is named Standard.
--
-- Past orders keep the name they were placed with; only variants (and so future orders) change.

update public.product_variants v
   set name = coalesce(
         nullif(
           concat_ws(
             ', ',
             case when nullif(btrim(v.color), '') is null or lower(btrim(v.color)) = 'standard' then null else btrim(v.color) end,
             case
               when nullif(btrim(v.size), '') is null or lower(btrim(v.size)) = 'standard' then null
               when btrim(v.size) ~* '\msize\M' then btrim(v.size)
               else 'Size ' || btrim(v.size)
             end,
             case
               when nullif(btrim(v.design), '') is null or lower(btrim(v.design)) = 'standard' then null
               when btrim(v.design) ~* '\mdesign\M' then btrim(v.design)
               else 'Design ' || btrim(v.design)
             end
           ),
           ''
         ),
         'Standard'
       )
 where v.color is not null or v.design is not null or v.size is not null;
