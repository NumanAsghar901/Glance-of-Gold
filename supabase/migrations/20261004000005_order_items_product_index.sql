-- Covers the order_items.product_id foreign key (flagged by the performance advisor).
create index order_items_product_idx on public.order_items (product_id);
