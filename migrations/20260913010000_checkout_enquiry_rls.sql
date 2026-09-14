-- Allow storefront checkout to create enquiry orders (no payment yet).

create policy "Anyone can create enquiry orders"
  on public.orders
  for insert
  with check (status = 'enquiry');

create policy "Anyone can insert order items for new orders"
  on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.status = 'enquiry'
    )
  );
