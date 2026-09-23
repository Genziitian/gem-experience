-- Activity: who did what, and when.
--
-- audit_logs already records data changes, written by triggers. What it cannot
-- record is everything that is not a row change — signing in, signing out,
-- which screen someone opened — because no row changes when those happen.
-- This adds a table the application writes for those, and a view that reads
-- the two together as one timeline so the admin has a single feed rather than
-- two half-pictures.
--
-- Safe to re-run: every statement is guarded.

create table if not exists public.activity_log (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  -- denormalised on purpose: an account can be deleted, and the log should
  -- still say who did the thing rather than turning into a blank row
  actor_email text,
  actor_role text,
  action text not null,              -- login | logout | view | export | import…
  area text,                         -- the screen or object it happened on
  detail jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- the feed is always newest-first, and is filtered by actor or by action
create index if not exists activity_log_time_idx on public.activity_log (created_at desc);
create index if not exists activity_log_actor_idx on public.activity_log (actor_id, created_at desc);
create index if not exists activity_log_action_idx on public.activity_log (action, created_at desc);
create index if not exists activity_log_role_idx on public.activity_log (actor_role, created_at desc);

alter table public.activity_log enable row level security;

-- Staff read the whole feed. Anyone signed in may append their own rows —
-- that is what lets a sign-in be recorded by the person signing in — but the
-- actor cannot be forged, and nothing can be edited or removed afterwards. An
-- activity log that its subject can rewrite is not one.
drop policy if exists "Staff read activity" on public.activity_log;
create policy "Staff read activity"
  on public.activity_log for select using (public.is_staff());

drop policy if exists "Signed in append own activity" on public.activity_log;
create policy "Signed in append own activity"
  on public.activity_log for insert
  with check (auth.uid() is not null and actor_id = auth.uid());

-- ------------------------------------------------------- change log coverage
--
-- The trigger existed only on nav_items and offices. Everything else the admin
-- edits was changing without leaving a trace.

drop trigger if exists products_audit on public.products;
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.log_content_change();

drop trigger if exists collections_audit on public.collections;
create trigger collections_audit after insert or update or delete on public.collections
  for each row execute function public.log_content_change();

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function public.log_content_change();

-- profiles needs its own: a role change is the single most sensitive edit in
-- the panel, and `id` is the primary key rather than a generated one
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- only when something worth recording actually moved
  if tg_op = 'UPDATE'
     and new.role is not distinct from old.role
     and new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'insert'
      when tg_op = 'DELETE' then 'delete'
      when new.role is distinct from old.role then 'role_change'
      else 'status_change'
    end,
    'profiles',
    coalesce(new.id, old.id)::text,
    jsonb_build_object(
      'email', coalesce(new.email, old.email),
      'before', case when tg_op = 'INSERT' then null
                     else jsonb_build_object('role', old.role, 'status', old.status) end,
      'after',  case when tg_op = 'DELETE' then null
                     else jsonb_build_object('role', new.role, 'status', new.status) end
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.log_profile_change();

-- --------------------------------------------------------------- the feed
--
-- One shape over both tables so the screen makes one query with one limit and
-- one order, instead of merging two paginated lists in the browser and hoping
-- the interleaving is right.

create or replace view public.activity_feed as
  select
    'activity:' || a.id::text as id,
    a.created_at,
    a.actor_id,
    a.actor_email,
    a.actor_role,
    a.action,
    a.area,
    a.detail,
    'session'::text as source
  from public.activity_log a
  union all
  select
    'audit:' || l.id::text,
    l.created_at,
    l.actor_id,
    p.email,
    p.role::text,
    l.action,
    l.entity_type,
    l.meta,
    'change'::text
  from public.audit_logs l
  left join public.profiles p on p.id = l.actor_id;

-- The view runs as its caller, so the underlying policies still decide what
-- comes back: staff see the feed, nobody else does.
alter view public.activity_feed set (security_invoker = on);

-- ------------------------------------------------- privilege escalation fix
--
-- The original policy was:
--
--   create policy "Staff update profiles" on public.profiles
--     for update using (public.is_staff() or id = auth.uid());
--
-- An UPDATE policy with no `with check` reuses its `using` expression for the
-- check, so that clause permitted any signed-in person to update their own
-- profile row — including the `role` column. A storefront customer could make
-- themselves a super admin with a single request. The admin's dropdowns were
-- never the protection; there was none.
--
-- Two parts. The policy still lets people edit their own name and phone, and
-- lets staff read everyone. A trigger then decides who may move `role` and
-- `status`, because that question needs to compare the old row with the new
-- one and a policy cannot.

drop policy if exists "Staff update profiles" on public.profiles;
create policy "Update own profile or staff update any"
  on public.profiles for update
  using (public.is_staff() or id = auth.uid())
  with check (public.is_staff() or id = auth.uid());

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
begin
  -- nothing sensitive moved
  if new.role is not distinct from old.role
     and new.status is not distinct from old.status then
    return new;
  end if;

  select role into actor_role from public.profiles where id = actor;

  -- Nobody promotes or unblocks themselves, super admin included. Losing that
  -- rule is how one compromised session becomes a permanent one.
  if actor is not null and new.id = actor then
    raise exception 'You cannot change your own role or status.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.role is distinct from old.role then
    if actor_role is distinct from 'super_admin' then
      raise exception 'Only a super admin can change a role.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.status is distinct from old.status then
    -- a manager may block a storefront account, but not another staff member
    if actor_role = 'super_admin' then
      null;
    elsif actor_role = 'ops' and old.role = 'customer' then
      null;
    else
      raise exception 'You do not have permission to change this account''s status.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- The last active super admin stays. Otherwise the panel can be locked out
  -- of its own role management with no way back in.
  if old.role = 'super_admin'
     and old.status = 'active'
     and (new.role is distinct from 'super_admin' or new.status is distinct from 'active')
     and (select count(*) from public.profiles
           where role = 'super_admin' and status = 'active') <= 1 then
    raise exception 'This is the last active super admin.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();
