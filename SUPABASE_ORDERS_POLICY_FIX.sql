-- Chennai Express order dashboard save fix
-- Run this in Supabase SQL Editor if customer orders do not appear in Admin Orders.
-- This is the simple/static-site version. Replace with login-based policies later.

alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "prototype insert orders" on orders;
create policy "prototype insert orders"
on orders for insert
with check (true);

drop policy if exists "prototype read orders" on orders;
create policy "prototype read orders"
on orders for select
using (true);

drop policy if exists "prototype update orders" on orders;
create policy "prototype update orders"
on orders for update
using (true)
with check (true);

drop policy if exists "prototype insert order items" on order_items;
create policy "prototype insert order items"
on order_items for insert
with check (true);

drop policy if exists "prototype read order items" on order_items;
create policy "prototype read order items"
on order_items for select
using (true);

drop policy if exists "prototype update order items" on order_items;
create policy "prototype update order items"
on order_items for update
using (true)
with check (true);
