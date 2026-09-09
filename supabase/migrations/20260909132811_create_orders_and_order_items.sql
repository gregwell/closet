-- Orders and order_items: minimal schema + RLS (roadmap Foundation F-01)
-- No business logic here — order status computation is owned by slice S-02.

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store text not null,
  order_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  brand text not null,
  type text not null,
  price_cents integer not null,
  description text,
  category text,
  status text not null default 'in_transit'
    check (status in ('in_transit', 'awaiting_decision', 'kept', 'to_be_returned', 'return_shipped', 'return_received')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table order_items enable row level security;

-- orders: owner-only, one policy per operation
create policy "orders_select_own" on orders for select using (user_id = auth.uid());
create policy "orders_insert_own" on orders for insert with check (user_id = auth.uid());
create policy "orders_update_own" on orders for update using (user_id = auth.uid());
create policy "orders_delete_own" on orders for delete using (user_id = auth.uid());

-- order_items: ownership derived from the parent order (single source of truth: orders.user_id)
create policy "order_items_select_own" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_insert_own" on order_items for insert
  with check (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_update_own" on order_items for update
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_delete_own" on order_items for delete
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
