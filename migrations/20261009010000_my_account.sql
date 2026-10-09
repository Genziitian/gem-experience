-- What a signed-in customer may see of their own history, for /account/.
--
-- Orders were already readable by their owner ("Users read own orders"), but
-- only by user_id, so an enquiry placed as a guest and the account made
-- afterwards never met. Form submissions — quotations, appointments, contact
-- messages, gift cards sent with a checkout — have no owner column at all and
-- are staff-only, so a customer could not see a single one.
--
-- my_account() answers both by the account's email, and only once that email
-- is confirmed: anyone can type any address into a form, and an unconfirmed
-- signup with somebody else's address must not read their appointments. Google
-- accounts arrive confirmed; email signups are confirmed by their link.
--
-- It returns what the customer wrote and the status staff set. Staff notes
-- (form_activity) and assignment stay out.
--
-- Safe to re-run.

create or replace function public.my_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'Sign in to see your account.' using errcode = '28000';
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;

  return jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(t order by t.created_at desc)
      from (
        select o.id, o.order_number, o.status, o.created_at, o.updated_at, o.notes,
               coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'name', i.product_snapshot->>'name',
                          'materials', i.product_snapshot->>'materials',
                          'image', i.product_snapshot->>'image',
                          'qty', i.quantity))
                 from public.order_items i
                 where i.order_id = o.id
               ), '[]'::jsonb) as items
        from public.orders o
        where o.user_id = v_uid
           or (v_email is not null and lower(o.guest_email) = v_email)
        order by o.created_at desc
        limit 50
      ) t
    ), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(t order by t.created_at desc)
      from (
        select f.id, f.form_type, f.status, f.created_at, f.updated_at, f.payload
        from public.form_submissions f
        where v_email is not null
          and lower(f.payload->>'email') = v_email
        order by f.created_at desc
        limit 100
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_account() from public;
grant execute on function public.my_account() to authenticated;
