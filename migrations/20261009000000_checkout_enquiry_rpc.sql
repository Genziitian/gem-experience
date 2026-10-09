-- Checkout enquiries go through one function instead of two table inserts.
--
-- What broke: Gem.createEnquiryOrder() inserted into `orders` and asked for the
-- row back (`.insert(...).select()`), so it could read the new id for the order
-- lines. Returning a row needs a SELECT policy too, and a visitor has none —
-- "Users read own orders" matches user_id = auth.uid(), which a guest's NULL
-- never equals. PostgREST reports that as "new row violates row-level security
-- policy for table orders", so every guest checkout failed. The order_items
-- insert would have failed next for the same reason: its policy looks the
-- order up in `orders`, a table the guest cannot see.
--
-- The two "Anyone can…" policies also let a visitor write any user_id onto an
-- order, filing enquiries under somebody else's account. Both go. The function
-- below is the only way in for the storefront, and it decides user_id from the
-- session itself.
--
-- Safe to re-run.

drop policy if exists "Anyone can create enquiry orders" on public.orders;
drop policy if exists "Anyone can insert order items for new orders" on public.order_items;

create or replace function public.create_enquiry_order(
  p_items jsonb,
  p_guest_email text,
  p_notes text default null
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_email text := nullif(trim(coalesce(p_guest_email, '')), '');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your selection is empty.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many pieces in one enquiry.' using errcode = '22023';
  end if;
  if v_email is null and auth.uid() is null then
    raise exception 'An email address is needed for the enquiry.' using errcode = '22023';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'That email address does not look right.' using errcode = '22023';
  end if;

  insert into public.orders (order_number, user_id, guest_email, status, currency,
                             subtotal_cents, total_cents, notes)
  values (
    'GE-' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint)),
    auth.uid(),
    coalesce(v_email, (select email from public.profiles where profiles.id = auth.uid())),
    'enquiry',
    'INR',
    0,
    0,
    left(coalesce(nullif(trim(p_notes), ''), 'Checkout enquiry from cart'), 4000)
  )
  returning * into v_order;

  -- prices are confirmed by an advisor, so nothing the browser sends is trusted
  -- as one: the line keeps what was shown, at zero
  insert into public.order_items (order_id, product_id, product_snapshot, quantity, unit_price_cents)
  select v_order.id,
         null,
         item,
         case when item->>'qty' ~ '^[0-9]{1,2}$' then greatest(1, (item->>'qty')::int) else 1 end,
         0
  from jsonb_array_elements(p_items) as item;

  return query select v_order.id, v_order.order_number;
end;
$$;

revoke all on function public.create_enquiry_order(jsonb, text, text) from public;
grant execute on function public.create_enquiry_order(jsonb, text, text) to anon, authenticated;
