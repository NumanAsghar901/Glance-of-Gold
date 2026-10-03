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
