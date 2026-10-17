-- Events and exhibitions: the dates the house shows its pieces in person.
--
-- Staff add them in the admin under Events; the storefront's /events/ page
-- lists what is coming up (by date) and offers a WhatsApp link per event, and
-- tools/build-seo.mjs writes them into the page and as schema.org Events.
--
-- Safe to re-run: every statement is guarded.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- shown as the small label over the title: Exhibition, Trunk show, Private viewing…
  kind text not null default 'Exhibition',
  starts_on date not null,
  ends_on date,                 -- null for a single day
  hours text,                   -- free text, "11am – 9pm daily"
  venue text,                   -- "Atlantis The Royal"
  city text,
  country text,
  address text,
  description text,
  image text,                   -- storefront-relative path or a full URL
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_ok check (ends_on is null or ends_on >= starts_on)
);
create index if not exists events_starts_idx on public.events (starts_on);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "Public read published events" on public.events;
create policy "Public read published events"
  on public.events for select using (published = true or public.is_staff());

drop policy if exists "Staff manage events" on public.events;
create policy "Staff manage events" on public.events
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists events_audit on public.events;
create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.log_content_change();

-- ------------------------------------------------------------------ menu

insert into public.nav_items (location, label, href, sort_order)
select 'primary', 'Events & Exhibitions', 'events/', 3
where not exists (
  select 1 from public.nav_items
  where location = 'primary' and parent_id is null and label = 'Events & Exhibitions'
);
