-- Leads: every storefront form is a lead an adviser owns, works and closes.
--
-- form_submissions already had assigned_to and form_activity, but nothing used
-- either: notes were written without an author (admin_id was never set), status
-- changes were logged by whichever screen remembered to, and anyone on staff
-- could reassign anything. This makes the trail the database's job:
--
--   * who may assign — a super admin or a manager. Assigning decides who
--     answers a client, so an admin cannot hand work to someone else, or take
--     it, by editing the row.
--   * what is recorded — every assignment and status change lands in
--     form_activity with its author, written by a trigger, so a change made
--     from the Supabase dashboard is in the timeline too.
--   * who wrote a note — admin_id is set from the session; it cannot be
--     claimed for somebody else.
--
-- It also tells the VPS mail service (POST /api/notify) when a lead arrives
-- and when one is assigned, so the client gets a confirmation and the adviser
-- an alert. The call goes through pg_net, which queues it and returns at once:
-- a slow or broken mail server never delays or fails a client's submission.
-- The shared secret lives in Supabase Vault under the name `notify_secret`,
-- never in this file; until it is set, nothing is sent.
--
-- Safe to re-run.

create extension if not exists pg_net with schema extensions;

alter table public.form_submissions
  add column if not exists assigned_at timestamptz;

create index if not exists form_submissions_assigned_idx
  on public.form_submissions (assigned_to, status, created_at desc);

-- ------------------------------------------------------------ notes' author

create or replace function public.stamp_form_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- the session decides the author; a trigger-written row (auth.uid() is null
  -- from the dashboard) keeps whatever the trigger set
  if auth.uid() is not null then
    new.admin_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists form_activity_stamp on public.form_activity;
create trigger form_activity_stamp before insert on public.form_activity
  for each row execute function public.stamp_form_activity();

-- ------------------------------------------------------------ mail service

create or replace function public.notify_mail(p_body jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'notify_secret' limit 1;
  if v_secret is null then
    return;  -- mail not configured yet
  end if;

  perform net.http_post(
    url := 'https://gem-experience.com/api/notify',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Notify-Secret', v_secret),
    timeout_milliseconds := 10000
  );
exception when others then
  -- mail is a courtesy; it never blocks the write that caused it
  raise warning 'notify_mail failed: %', sqlerrm;
end;
$$;

revoke all on function public.notify_mail(jsonb) from public, anon, authenticated;

-- ------------------------------------------------------- new lead arrives

create or replace function public.lead_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_mail(jsonb_build_object(
    'event', 'submission',
    'id', new.id,
    'form_type', new.form_type,
    'payload', new.payload,
    'created_at', new.created_at
  ));
  return new;
end;
$$;

drop trigger if exists form_submissions_created on public.form_submissions;
create trigger form_submissions_created after insert on public.form_submissions
  for each row execute function public.lead_created();

-- -------------------------------------------- assignment and status changes

create or replace function public.lead_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  if new.assigned_to is distinct from old.assigned_to then
    select role into v_role from public.profiles where id = auth.uid();
    -- the dashboard (no session) may; otherwise only super admins and managers
    if auth.uid() is not null and v_role is distinct from 'super_admin' and v_role is distinct from 'ops' then
      raise exception 'Only a super admin or a manager can assign leads.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.assigned_to is not null and not exists (
      select 1 from public.profiles
      where id = new.assigned_to and role in ('super_admin', 'ops', 'catalog') and status = 'active'
    ) then
      raise exception 'Leads can only be assigned to active staff.' using errcode = '22023';
    end if;
    new.assigned_at := case when new.assigned_to is null then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists form_submissions_guard on public.form_submissions;
create trigger form_submissions_guard before update on public.form_submissions
  for each row execute function public.lead_guard();

create or replace function public.lead_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- plain text, not records: a record no row was selected into cannot be read
  v_to_email text;
  v_to_name text;
  v_by_email text;
  v_by_name text;
begin
  select email, full_name into v_by_email, v_by_name from public.profiles where id = auth.uid();

  if new.assigned_to is distinct from old.assigned_to then
    select email, full_name into v_to_email, v_to_name from public.profiles where id = new.assigned_to;
    insert into public.form_activity (submission_id, admin_id, action, note)
    values (new.id, auth.uid(), 'assigned',
            case when new.assigned_to is null then 'Unassigned'
                 else 'Assigned to ' || coalesce(nullif(v_to_name, ''), v_to_email, 'a colleague') end);

    -- the adviser hears about it, unless they assigned it to themselves
    if new.assigned_to is not null and new.assigned_to is distinct from auth.uid() then
      perform public.notify_mail(jsonb_build_object(
        'event', 'assigned',
        'id', new.id,
        'form_type', new.form_type,
        'payload', new.payload,
        'created_at', new.created_at,
        'assignee', jsonb_build_object('email', v_to_email, 'name', v_to_name),
        'by', jsonb_build_object('email', v_by_email, 'name', v_by_name)
      ));
    end if;
  end if;

  if new.status is distinct from old.status then
    insert into public.form_activity (submission_id, admin_id, action, note)
    values (new.id, auth.uid(), 'status',
            'Marked ' || replace(new.status::text, '_', ' '));
  end if;

  return new;
end;
$$;

drop trigger if exists form_submissions_changed on public.form_submissions;
create trigger form_submissions_changed after update on public.form_submissions
  for each row execute function public.lead_changed();
