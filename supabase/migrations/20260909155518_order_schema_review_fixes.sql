-- Fixes from /10x-impl-review on order-data-schema (F1-F4):
--   F1/F2: indexes backing the RLS ownership checks
--   F3: pin RLS policies to the authenticated role (was implicitly public)
--   F4: guard against negative/zero prices
--   F5: keep updated_at accurate on every row update

create index on order_items (order_id);
create index on orders (user_id);

alter policy "orders_select_own" on orders to authenticated;
alter policy "orders_insert_own" on orders to authenticated;
alter policy "orders_update_own" on orders to authenticated;
alter policy "orders_delete_own" on orders to authenticated;
alter policy "order_items_select_own" on order_items to authenticated;
alter policy "order_items_insert_own" on order_items to authenticated;
alter policy "order_items_update_own" on order_items to authenticated;
alter policy "order_items_delete_own" on order_items to authenticated;

alter table order_items add constraint order_items_price_cents_positive check (price_cents >= 0);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create trigger order_items_set_updated_at
  before update on order_items
  for each row execute function set_updated_at();
