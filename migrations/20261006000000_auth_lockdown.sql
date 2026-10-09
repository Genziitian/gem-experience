-- Admin authentication hardening, and the media bucket the admin uploads to.
--
-- 1. Signup could mint a super admin.
--
--    handle_new_user() copied `role` out of raw_user_meta_data, which is
--    whatever the browser passes as `options.data` to supabase.auth.signUp().
--    Signup is public (storefront customers register on /login/), so anyone
--    could open the console on the live site and run
--
--      sb.auth.signUp({ email, password, options: { data: { role: "super_admin" } } })
--
--    and, once they confirmed their own email, sign in to /admin with full
--    rights. guard_profile_privileges() never saw it: that trigger runs on
--    UPDATE, and this was the INSERT. Every new account is now a customer;
--    staff are promoted afterwards by a super admin, which the guard checks.
--
-- 2. The `media` bucket and who may write to it.
--
--    The Media page uploads to storage bucket `media`, but no migration made
--    the bucket or any storage.objects policy, so uploads failed with an RLS
--    error even once someone created the bucket by hand. Reads need no policy:
--    the bucket is public and the site uses its public URLs. Writes are staff
--    only.
--
-- Safe to re-run: every statement is guarded.

-- ------------------------------------------------------------ new accounts

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- role is never taken from the client; see the note at the top
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  return new;
end;
$$;

-- ------------------------------------------------------------- media bucket

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Staff upload media" on storage.objects;
create policy "Staff upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "Staff update media" on storage.objects;
create policy "Staff update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "Staff delete media" on storage.objects;
create policy "Staff delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
