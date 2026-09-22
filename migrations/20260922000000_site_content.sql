-- Site content the admin owns: navigation, offices, contact, media.
--
-- These three things were hard-coded in the storefront — the menu tree in
-- js/site-nav.js, the atelier cards in offices/index.html, the phone numbers
-- in contact/index.html — so changing a phone number meant a developer and a
-- deploy. They move here and the storefront reads them at run time, falling
-- back to what it already ships if this database is unreachable.
--
-- Safe to re-run: every statement is guarded.

-- --------------------------------------------------------------- navigation
--
-- One self-referencing table rather than menus + items: the drawer is a tree
-- two deep (section, then the panel that slides over it), and a parent_id
-- models that without a second table to join. `location` keeps the primary
-- drawer, the secondary list under it and the footer columns in one place.

create table if not exists public.nav_items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.nav_items (id) on delete cascade,
  location text not null default 'primary'
    check (location in ('primary', 'secondary', 'footer')),
  label text not null,
  -- null href renders as plain text: the storefront uses that for sections
  -- that are planned but have no page yet, and for sub-headings inside a panel
  href text,
  -- a heading is a non-interactive label inside a child panel ("About")
  is_heading boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nav_items_tree_idx
  on public.nav_items (location, parent_id, sort_order);

drop trigger if exists nav_items_updated_at on public.nav_items;
create trigger nav_items_updated_at before update on public.nav_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ offices

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  -- the page shows two lists: our own ateliers, which carry a phone number,
  -- and the partner locations that stock us, which do not
  kind text not null default 'atelier' check (kind in ('atelier', 'store')),
  name text not null,
  region text,
  address text,
  phone text,          -- as displayed, spaced
  tel text,            -- as dialled, digits and +
  whatsapp text,       -- full number if the link should open WhatsApp
  email text,
  image text,          -- storefront-relative path or a full URL
  map_query text,      -- what to hand the maps link
  hours text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offices_order_idx on public.offices (kind, sort_order);

alter table public.offices
  add column if not exists kind text not null default 'atelier';

drop trigger if exists offices_updated_at on public.offices;
create trigger offices_updated_at before update on public.offices
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- media
--
-- A row per file in the `media` storage bucket, so the admin can list and
-- search uploads without paging the storage API, and so alt text has
-- somewhere to live.

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,        -- object path inside the bucket
  url text not null,                -- public URL as served
  alt text,
  width int,
  height int,
  bytes bigint,
  mime text,
  folder text default 'general',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists media_folder_idx on public.media (folder, created_at desc);

-- -------------------------------------------------- catalog: gallery + focal
--
-- The High Jewellery pages carry a per-piece shoot and a measured crop point
-- per photograph. These had no column, so an export from the admin rebuilt
-- data.js without them and every mobile gallery crop silently reverted.

alter table public.products
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists models jsonb not null default '[]'::jsonb;

-- focal is keyed by image path and spans the whole catalog, so it belongs in
-- settings rather than on any one product row
insert into public.site_settings (key, value)
values ('focal', '{}'::jsonb)
on conflict (key) do nothing;

insert into public.site_settings (key, value)
values ('contact', '{
  "lede": "",
  "email": "contact@gem-experience.com",
  "lines": [],
  "hours": "Monday to Saturday, 9am – 7pm"
}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------- RLS

alter table public.nav_items enable row level security;
alter table public.offices   enable row level security;
alter table public.media     enable row level security;

drop policy if exists "Public read published nav" on public.nav_items;
create policy "Public read published nav"
  on public.nav_items for select using (published = true or public.is_staff());

drop policy if exists "Staff manage nav" on public.nav_items;
create policy "Staff manage nav" on public.nav_items
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Public read published offices" on public.offices;
create policy "Public read published offices"
  on public.offices for select using (published = true or public.is_staff());

drop policy if exists "Staff manage offices" on public.offices;
create policy "Staff manage offices" on public.offices
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Public read media" on public.media;
create policy "Public read media" on public.media for select using (true);

drop policy if exists "Staff manage media" on public.media;
create policy "Staff manage media" on public.media
  for all using (public.is_staff()) with check (public.is_staff());

-- site_settings already allows public read; writes were never granted, so the
-- contact editor could read its own form and silently fail to save it.
drop policy if exists "Staff manage site settings" on public.site_settings;
create policy "Staff manage site settings" on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------------------- audit trail

create or replace function public.log_content_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    actor,
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id)::text,
    case when tg_op = 'DELETE'
         then jsonb_build_object('before', to_jsonb(old))
         else jsonb_build_object('after', to_jsonb(new)) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists nav_items_audit on public.nav_items;
create trigger nav_items_audit after insert or update or delete on public.nav_items
  for each row execute function public.log_content_change();

drop trigger if exists offices_audit on public.offices;
create trigger offices_audit after insert or update or delete on public.offices
  for each row execute function public.log_content_change();
