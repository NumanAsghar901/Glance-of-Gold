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
