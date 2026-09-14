-- Public form submissions: anon/authenticated may insert, staff may manage.
-- Fixes storefront appointment / contact / quotation failing with
-- "new row violates row-level security policy for table form_submissions"
-- (often caused by INSERT … RETURNING without a SELECT policy for anon).

alter table public.form_submissions enable row level security;

drop policy if exists "Anyone can submit forms" on public.form_submissions;
drop policy if exists "Public can submit forms" on public.form_submissions;

create policy "Anyone can submit forms"
  on public.form_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and form_type in ('appointment', 'contact', 'quotation', 'newsletter')
  );

grant usage on schema public to anon, authenticated;
grant insert on table public.form_submissions to anon, authenticated;
grant select, update, delete on table public.form_submissions to authenticated;
