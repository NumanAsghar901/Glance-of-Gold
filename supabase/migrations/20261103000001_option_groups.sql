-- Variant groups replace variants.
--
-- Before: every size/colour mix was a "variant" with its own stock and price.
-- Now: a product has ONE stock number, and any number of variant groups. A group is a heading ("Nose Ring 1"),
-- a list of sizes (6mm, 8mm, 10mm) and a list of colours. A customer chooses sizes and colours from each group
-- and a quantity for each choice; every piece costs the product price.
--
-- Safe to run on the live database:
--   * products.stock starts as the total of the product's current variant stock, so nothing shows as sold out.
--   * product_variants and its rows are left in place, unused (past orders and the free-gift pool pointed at it).
--     Drop the table later, once everything has been checked.
--   * Existing products start with no groups (the owner chose to enter them again in the admin panel).
-- Run it once, and deploy the new site right after: orders placed by the previous version of the site stop working
-- until then, because they name variants.

-- 1. One stock number per product ------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'products' and column_name = 'stock'
  ) then
    alter table public.products add column stock int not null default 0 check (stock >= 0);
    update public.products p
       set stock = coalesce((
         select sum(greatest(v.stock, 0))::int
           from public.product_variants v
          where v.product_id = p.id and v.is_active
       ), 0);
  end if;
end
$$;

-- The offer-with-pieces columns of the previous step are replaced by groups.
alter table public.products drop column if exists bundle_size;
alter table public.products drop column if exists piece_name;

-- 2. Variant groups -------------------------------------------------------------------------------------
create table if not exists public.product_option_groups (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  heading text not null check (length(btrim(heading)) between 1 and 60),
  sizes text[] not null default '{}' check (cardinality(sizes) <= 40),
  colours text[] not null default '{}' check (cardinality(colours) <= 40),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_option_groups_product_idx on public.product_option_groups (product_id, sort);

alter table public.product_option_groups enable row level security;

drop policy if exists "admin full access" on public.product_option_groups;
create policy "admin full access" on public.product_option_groups
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "public read option groups of active products" on public.product_option_groups;
create policy "public read option groups of active products" on public.product_option_groups
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

grant select on public.product_option_groups to anon;
grant select, insert, update, delete on public.product_option_groups to authenticated;

-- 3. The free-gift pool is made of products ---------------------------------------------------------------
alter table public.gift_offer_products add column if not exists product_id bigint references public.products (id) on delete cascade;
update public.gift_offer_products g
   set product_id = v.product_id
  from public.product_variants v
 where v.id = g.variant_id and g.product_id is null;
-- Several variants of one product in one pool become one entry.
delete from public.gift_offer_products a
 using public.gift_offer_products b
 where a.offer_id = b.offer_id and a.product_id = b.product_id and a.ctid > b.ctid;
delete from public.gift_offer_products where product_id is null;
alter table public.gift_offer_products drop constraint if exists gift_offer_products_pkey;
alter table public.gift_offer_products alter column variant_id drop not null;
alter table public.gift_offer_products alter column product_id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gift_offer_products_offer_product_key') then
    alter table public.gift_offer_products add constraint gift_offer_products_offer_product_key unique (offer_id, product_id);
  end if;
end
$$;
create index if not exists gift_offer_products_product_idx on public.gift_offer_products (product_id);

-- 4. Placing an order -----------------------------------------------------------------------------------
-- Items are { product_id, qty, group, size, colour }. Stock and price are the product's; the group, size and
-- colour are checked against the product's own groups and written as the name of the line. The gift is a product.
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
  v_gift_product bigint := nullif(payload ->> 'gift_product_id', '')::bigint;
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
  v_products jsonb := '{}'::jsonb;  -- what was read about each product, by id, for the lines below
  v_item record;
  v_group record;
  v_has_groups boolean;
  v_label text;
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

  -- Stock: one number per product ---------------------------------------------------------
  -- Lock each product (ordered by id to avoid deadlocks), check its stock for everything ordered of it, take it.
  for v_line in
    select (e ->> 'product_id')::bigint as product_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(payload -> 'items') e
    group by 1
    order by 1
  loop
    if v_line.product_id is null or v_line.qty is null or v_line.qty not between 1 and 200 then
      raise exception 'INVALID_INPUT:items';
    end if;

    select p.id as product_id, p.name as product_name, p.price, p.stock, p.is_active,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.products p
     where p.id = v_line.product_id
       for update of p;

    if not found or not v_row.is_active then
      raise exception 'ITEM_UNAVAILABLE:%', v_line.product_id;
    end if;
    if v_row.stock < v_line.qty then
      raise exception 'OUT_OF_STOCK:%', v_line.product_id;
    end if;

    update public.products set stock = stock - v_line.qty where id = v_line.product_id;

    v_subtotal := v_subtotal + v_row.price * v_line.qty;
    v_item_count := v_item_count + v_line.qty;
    v_products := v_products || jsonb_build_object(
      v_row.product_id::text,
      jsonb_build_object('name', v_row.product_name, 'price', v_row.price, 'image_url', v_row.image_url)
    );
  end loop;

  -- Lines: what was chosen from the product's variant groups --------------------------------
  -- Every line names a group of the product and a size and colour of that group (when the group has any).
  -- Each is checked against the product's own groups, never trusted from the browser, and written as the name
  -- of the line ("Nose Ring 1, Size 6mm, gold").
  for v_item in
    select (e ->> 'product_id')::bigint as product_id,
           (e ->> 'qty')::int as qty,
           nullif(btrim(coalesce(e ->> 'group', '')), '') as grp,
           nullif(btrim(coalesce(e ->> 'size', '')), '') as size,
           nullif(btrim(coalesce(e ->> 'colour', '')), '') as colour
      from jsonb_array_elements(payload -> 'items') e
  loop
    if v_item.qty is null or v_item.qty not between 1 and 100 then
      raise exception 'INVALID_INPUT:items';
    end if;

    select exists (select 1 from public.product_option_groups g where g.product_id = v_item.product_id)
      into v_has_groups;

    v_label := null;
    if v_item.grp is null then
      -- A product that has groups cannot be bought without choosing from them.
      if v_has_groups or v_item.size is not null or v_item.colour is not null then
        raise exception 'INVALID_OPTION:%', v_item.product_id;
      end if;
    else
      select g.* into v_group
        from public.product_option_groups g
       where g.product_id = v_item.product_id and g.heading = v_item.grp
       limit 1;
      if not found then raise exception 'INVALID_OPTION:%', v_item.product_id; end if;
      if cardinality(v_group.sizes) > 0 and (v_item.size is null or not (v_item.size = any (v_group.sizes))) then
        raise exception 'INVALID_OPTION:%', v_item.product_id;
      end if;
      if cardinality(v_group.sizes) = 0 and v_item.size is not null then
        raise exception 'INVALID_OPTION:%', v_item.product_id;
      end if;
      if cardinality(v_group.colours) > 0 and (v_item.colour is null or not (v_item.colour = any (v_group.colours))) then
        raise exception 'INVALID_OPTION:%', v_item.product_id;
      end if;
      if cardinality(v_group.colours) = 0 and v_item.colour is not null then
        raise exception 'INVALID_OPTION:%', v_item.product_id;
      end if;
      v_label := array_to_string(array_remove(array[
        v_group.heading,
        case when v_item.size is null then null
             when v_item.size ~* '\msize\M' then v_item.size
             else 'Size ' || v_item.size end,
        v_item.colour
      ], null), ', ');
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_item.product_id, 'variant_id', null,
      'name', v_products -> v_item.product_id::text ->> 'name',
      'variant_name', v_label,
      'image_url', v_products -> v_item.product_id::text ->> 'image_url',
      'unit_price', (v_products -> v_item.product_id::text ->> 'price')::int,
      'qty', v_item.qty, 'is_gift', false
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
  if v_gift_product is not null then
    select o.id into v_offer_id
      from public.gift_offers o
      join public.gift_offer_products gp on gp.offer_id = o.id
     where gp.product_id = v_gift_product
       and o.is_active
       and (o.starts_at is null or o.starts_at <= now())
       and (o.ends_at is null or o.ends_at > now())
       and o.min_items <= v_item_count
     order by o.min_items desc
     limit 1;
    if v_offer_id is null then raise exception 'GIFT_INVALID'; end if;

    select p.id as product_id, p.name as product_name, p.stock, p.is_active,
           (select pi.url from public.product_images pi
             where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image_url
      into v_row
      from public.products p
     where p.id = v_gift_product
       for update of p;

    if not found or not v_row.is_active or v_row.stock < 1 then
      raise exception 'GIFT_OUT_OF_STOCK';
    end if;

    update public.products set stock = stock - 1 where id = v_gift_product;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_row.product_id, 'variant_id', null,
      'name', v_row.product_name, 'variant_name', null,
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

-- 5. Cancelling an order gives the stock of every product back ------------------------------------------------
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
      -- Stock is one number per product, so every line (a free gift too) goes back to its product. Orders placed
      -- before variant groups existed took their stock from variants, but the product's stock was counted
      -- after those orders, so it is the product that gets the pieces back.
      update public.products p
         set stock = p.stock + i.qty
        from (
          select product_id, sum(qty)::int as qty
            from public.order_items
           where order_id = new.id and product_id is not null
           group by product_id
        ) i
       where p.id = i.product_id;

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
