-- Gem Experience — Supabase schema
-- Modules: catalog, users, orders/payments, forms, analytics, SEO, security

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Roles / profiles (extends auth.users)
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('super_admin', 'ops', 'catalog', 'customer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  country text not null default 'IN',
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'high' check (kind in ('high', 'fine', 'gifts', 'gemstones')),
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  seo_title text,
  seo_description text,
  og_image text,
  indexable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  ref_code text,
  materials text,
  metal text,
  product_type text,
  occasion text,
  carat text,
  origin text,
  story text,
  collection_id uuid references public.collections (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  price_cents int,
  currency text not null default 'INR',
  price_on_enquiry boolean not null default true,
  is_gemstone boolean not null default false,
  has_visualiser boolean not null default false,
  visualiser jsonb default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured_sort int not null default 0,
  seo_title text,
  seo_description text,
  og_image text,
  indexable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind text not null check (kind in ('metal', 'size')),
  label text not null,
  hex text,
  sort_order int not null default 0
);

create table public.wishlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Orders / payments
-- ---------------------------------------------------------------------------

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'enquiry',
  'fulfilled',
  'cancelled',
  'failed'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  guest_email text,
  status public.order_status not null default 'pending_payment',
  currency text not null default 'INR',
  subtotal_cents int not null default 0,
  total_cents int not null default 0,
  notes text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_snapshot jsonb not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price_cents int not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  amount_cents int not null,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Forms inbox
-- ---------------------------------------------------------------------------

create type public.form_type as enum ('appointment', 'contact', 'quotation', 'newsletter');
create type public.form_status as enum ('new', 'in_progress', 'closed');

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type public.form_type not null,
  status public.form_status not null default 'new',
  payload jsonb not null default '{}'::jsonb,
  product_id uuid references public.products (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_activity (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Analytics (traffic / visitors)
-- ---------------------------------------------------------------------------

create table public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text,
  device text,
  referrer text,
  country text
);

create table public.analytics_events (
  id bigserial primary key,
  session_id uuid references public.analytics_sessions (id) on delete set null,
  path text not null,
  referrer text,
  utm jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index analytics_events_path_idx on public.analytics_events (path);

-- ---------------------------------------------------------------------------
-- SEO globals + security
-- ---------------------------------------------------------------------------

create table public.seo_globals (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Gem Experience',
  title_template text not null default '%s | Gem Experience',
  default_description text,
  robots_txt text not null default E'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n',
  updated_at timestamptz not null default now()
);

insert into public.seo_globals (id) values (1) on conflict do nothing;

create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.login_attempts (
  id bigserial primary key,
  email text,
  ip text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.blocked_ips (
  id uuid primary key default gen_random_uuid(),
  ip text not null unique,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('whatsapp', '{"india":"+917300043093","uae":"+971567203896"}'::jsonb),
  ('nav', '{"links":[]}'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger form_submissions_updated_at before update on public.form_submissions
  for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'ops', 'catalog')
      and p.status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_activity enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.seo_globals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.blocked_ips enable row level security;
alter table public.site_settings enable row level security;

-- Public catalog reads
create policy "Public read published categories"
  on public.categories for select using (published = true or public.is_staff());
create policy "Public read published collections"
  on public.collections for select using (published = true or public.is_staff());
create policy "Public read published products"
  on public.products for select using (status = 'published' or public.is_staff());
create policy "Public read product images"
  on public.product_images for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'published' or public.is_staff())
    )
  );
create policy "Public read product variants"
  on public.product_variants for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'published' or public.is_staff())
    )
  );
create policy "Public read seo globals"
  on public.seo_globals for select using (true);
create policy "Public read site settings"
  on public.site_settings for select using (true);

-- Staff write / manage
create policy "Staff manage categories" on public.categories
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage collections" on public.collections
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage products" on public.products
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage product images" on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage product variants" on public.product_variants
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage forms" on public.form_submissions
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage form activity" on public.form_activity
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage orders" on public.orders
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage order items" on public.order_items
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage payments" on public.payments
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff read profiles" on public.profiles
  for select using (public.is_staff() or id = auth.uid());
create policy "Staff update profiles" on public.profiles
  for update using (public.is_staff() or id = auth.uid());
create policy "Staff manage seo" on public.seo_globals
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage settings" on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff read audit" on public.audit_logs
  for select using (public.is_staff());
create policy "Staff insert audit" on public.audit_logs
  for insert with check (public.is_staff());
create policy "Staff manage blocked ips" on public.blocked_ips
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff read login attempts" on public.login_attempts
  for select using (public.is_staff());
create policy "Staff read analytics sessions" on public.analytics_sessions
  for select using (public.is_staff());
create policy "Staff read analytics events" on public.analytics_events
  for select using (public.is_staff());

-- Customers
create policy "Users manage own addresses" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own wishlist" on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read own orders" on public.orders
  for select using (user_id = auth.uid() or public.is_staff());
create policy "Users read own order items" on public.order_items
  for select using (
    public.is_staff() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- Public form + analytics inserts (anon)
create policy "Anyone can submit forms" on public.form_submissions
  for insert with check (true);
create policy "Anyone can create analytics session" on public.analytics_sessions
  for insert with check (true);
create policy "Anyone can update own analytics session" on public.analytics_sessions
  for update using (true) with check (true);
create policy "Anyone can insert analytics events" on public.analytics_events
  for insert with check (true);

-- Storage bucket for product media (run in dashboard if needed)
-- insert into storage.buckets (id, name, public) values ('product-media', 'product-media', true);