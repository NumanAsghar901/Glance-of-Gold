-- Abandoned checkouts: details a customer typed at checkout (with a valid phone number) but never turned into
-- an order, so the owner can contact them. One live row per phone number; the row is marked "recovered"
-- when an order is placed with that number. Written by server code only (service role); only admins can read.
create table if not exists public.abandoned_checkouts (
  id bigint generated always as identity primary key,
  phone text not null check (phone ~ '^03[0-9]{9}$'),
  customer_name text,
  email text,
  province text,
  city text,
  address text,
  landmark text,
  payment_method text,
  -- What was in the bag: [{ "name", "variantName", "qty", "price" }]. Shown to the admin as the customer's bag.
  items jsonb not null default '[]'::jsonb,
  subtotal int not null default 0 check (subtotal >= 0),
  status text not null default 'open' check (status in ('open', 'contacted', 'recovered', 'dismissed')),
  contacted_at timestamptz,
  order_id bigint references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists abandoned_checkouts_live_phone_idx
  on public.abandoned_checkouts (phone) where status in ('open', 'contacted');
create index if not exists abandoned_checkouts_list_idx
  on public.abandoned_checkouts (status, updated_at desc);

alter table public.abandoned_checkouts enable row level security;

create policy "admin full access" on public.abandoned_checkouts
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

grant select, update, delete on public.abandoned_checkouts to authenticated;
