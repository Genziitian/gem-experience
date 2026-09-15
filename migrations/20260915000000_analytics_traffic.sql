-- Gem Experience — analytics enrichment + traffic rules
-- Adds geo/channel/device columns to the analytics tables, the rule and alert
-- tables behind the Traffic page, and the aggregation RPCs the admin reads.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- Session enrichment
-- ---------------------------------------------------------------------------

alter table public.analytics_sessions
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists channel text,
  add column if not exists source text,
  add column if not exists medium text,
  add column if not exists campaign text,
  add column if not exists utm jsonb default '{}'::jsonb,
  add column if not exists landing_path text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists ip_hash text,
  add column if not exists is_bot boolean not null default false,
  add column if not exists blocked boolean not null default false,
  add column if not exists pageviews int not null default 0;

create index if not exists analytics_sessions_last_seen_idx
  on public.analytics_sessions (last_seen desc);
create index if not exists analytics_sessions_country_idx
  on public.analytics_sessions (country);
create index if not exists analytics_sessions_channel_idx
  on public.analytics_sessions (channel);
create index if not exists analytics_sessions_human_idx
  on public.analytics_sessions (last_seen desc) where is_bot = false and blocked = false;

alter table public.analytics_events
  add column if not exists event_type text not null default 'pageview',
  add column if not exists title text,
  add column if not exists meta jsonb default '{}'::jsonb;

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id);
create index if not exists analytics_events_type_idx
  on public.analytics_events (event_type);

-- ---------------------------------------------------------------------------
-- Traffic rules — bot filtering, channel classification, block/allow lists
-- ---------------------------------------------------------------------------

create table if not exists public.traffic_rules (
  id uuid primary key default gen_random_uuid(),
  -- what the rule does when it matches
  kind text not null check (kind in ('block', 'allow', 'bot', 'channel')),
  -- what it looks at
  match_type text not null check (match_type in ('ip', 'country', 'referrer', 'user_agent', 'path', 'utm_source')),
  -- substring / prefix match, case-insensitive
  pattern text not null,
  -- for kind = 'channel' only: the channel to assign
  channel text,
  enabled boolean not null default true,
  priority int not null default 100,
  note text,
  hits int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists traffic_rules_lookup_idx
  on public.traffic_rules (enabled, kind, priority);

-- ---------------------------------------------------------------------------
-- Alerts — thresholds evaluated against a rolling window
-- ---------------------------------------------------------------------------

create table if not exists public.traffic_alerts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  metric text not null check (metric in ('sessions', 'pageviews', 'country', 'referrer', 'channel')),
  -- optional filter, e.g. metric = 'country' with dimension = 'IN'
  dimension text,
  comparator text not null check (comparator in ('gt', 'lt')),
  threshold numeric not null,
  window_minutes int not null default 60,
  enabled boolean not null default true,
  last_fired_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.traffic_alert_events (
  id bigserial primary key,
  alert_id uuid references public.traffic_alerts (id) on delete cascade,
  observed numeric not null,
  threshold numeric not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists traffic_alert_events_created_idx
  on public.traffic_alert_events (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.traffic_rules enable row level security;
alter table public.traffic_alerts enable row level security;
alter table public.traffic_alert_events enable row level security;

drop policy if exists "Staff manage traffic rules" on public.traffic_rules;
create policy "Staff manage traffic rules" on public.traffic_rules
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage traffic alerts" on public.traffic_alerts;
create policy "Staff manage traffic alerts" on public.traffic_alerts
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff read alert events" on public.traffic_alert_events;
create policy "Staff read alert events" on public.traffic_alert_events
  for select using (public.is_staff());
drop policy if exists "Staff update alert events" on public.traffic_alert_events;
create policy "Staff update alert events" on public.traffic_alert_events
  for update using (public.is_staff()) with check (public.is_staff());

-- The collector needs to read enabled rules to classify a hit. Rules are
-- operational config, not customer data, so exposing them read-only is safe
-- and saves the collector a service-role round trip.
drop policy if exists "Anyone can read enabled traffic rules" on public.traffic_rules;
create policy "Anyone can read enabled traffic rules" on public.traffic_rules
  for select using (enabled = true);

-- ---------------------------------------------------------------------------
-- Aggregation RPCs — the Traffic page reads these instead of pulling raw rows
-- ---------------------------------------------------------------------------

-- Sessions in a window, excluding bots and blocked traffic unless asked.
create or replace function public.analytics_overview(
  since timestamptz,
  until timestamptz default now(),
  include_bots boolean default false
)
returns table (
  sessions bigint,
  pageviews bigint,
  countries bigint,
  live bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from analytics_sessions s
       where s.first_seen >= since and s.first_seen <= until
         and (include_bots or (s.is_bot = false and s.blocked = false))),
    (select count(*) from analytics_events e
       join analytics_sessions s on s.id = e.session_id
       where e.created_at >= since and e.created_at <= until
         and e.event_type = 'pageview'
         and (include_bots or (s.is_bot = false and s.blocked = false))),
    (select count(distinct s.country) from analytics_sessions s
       where s.first_seen >= since and s.first_seen <= until
         and s.country is not null
         and (include_bots or (s.is_bot = false and s.blocked = false))),
    (select count(*) from analytics_sessions s
       where s.last_seen >= now() - interval '5 minutes'
         and (include_bots or (s.is_bot = false and s.blocked = false)))
  where public.is_staff();
$$;

-- Group sessions by any single dimension (country, channel, source, device…).
create or replace function public.analytics_breakdown(
  dimension text,
  since timestamptz,
  until timestamptz default now(),
  max_rows int default 20,
  include_bots boolean default false
)
returns table (label text, sessions bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorised';
  end if;

  if dimension not in ('country', 'channel', 'source', 'medium', 'campaign', 'device', 'browser', 'os', 'referrer', 'city') then
    raise exception 'unsupported dimension: %', dimension;
  end if;

  return query execute format(
    'select coalesce(nullif(%I::text, %L), %L) as label, count(*)::bigint
       from analytics_sessions
      where first_seen >= $1 and first_seen <= $2
        and ($3 or (is_bot = false and blocked = false))
      group by 1
      order by 2 desc
      limit $4',
    dimension, '', 'Unknown'
  ) using since, until, include_bots, max_rows;
end;
$$;

-- Most-viewed paths in a window.
create or replace function public.analytics_top_paths(
  since timestamptz,
  until timestamptz default now(),
  max_rows int default 20,
  include_bots boolean default false
)
returns table (path text, views bigint, visitors bigint)
language sql
security definer
set search_path = public
as $$
  select e.path,
         count(*)::bigint as views,
         count(distinct e.session_id)::bigint as visitors
    from analytics_events e
    join analytics_sessions s on s.id = e.session_id
   where e.created_at >= since and e.created_at <= until
     and e.event_type = 'pageview'
     and (include_bots or (s.is_bot = false and s.blocked = false))
     and public.is_staff()
   group by e.path
   order by views desc
   limit max_rows;
$$;

-- Pageviews bucketed over time, for the dashboard chart.
create or replace function public.analytics_timeseries(
  since timestamptz,
  until timestamptz default now(),
  bucket_minutes int default 60,
  include_bots boolean default false
)
returns table (bucket timestamptz, sessions bigint, pageviews bigint)
language sql
security definer
set search_path = public
as $$
  with buckets as (
    select generate_series(
      date_trunc('minute', since),
      date_trunc('minute', until),
      make_interval(mins => bucket_minutes)
    ) as bucket
  )
  select b.bucket,
         (select count(distinct s.id) from analytics_sessions s
            where s.first_seen >= b.bucket
              and s.first_seen < b.bucket + make_interval(mins => bucket_minutes)
              and (include_bots or (s.is_bot = false and s.blocked = false)))::bigint,
         (select count(*) from analytics_events e
            join analytics_sessions s2 on s2.id = e.session_id
            where e.created_at >= b.bucket
              and e.created_at < b.bucket + make_interval(mins => bucket_minutes)
              and e.event_type = 'pageview'
              and (include_bots or (s2.is_bot = false and s2.blocked = false)))::bigint
    from buckets b
   where public.is_staff()
   order by b.bucket;
$$;

-- Evaluate every enabled alert against its own window. Returns whatever
-- breached, and records the breach so the admin can show a feed.
create or replace function public.evaluate_traffic_alerts()
returns table (alert_id uuid, name text, observed numeric, threshold numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  obs numeric;
  win timestamptz;
begin
  if not public.is_staff() then
    raise exception 'not authorised';
  end if;

  for r in select * from traffic_alerts where enabled loop
    win := now() - make_interval(mins => r.window_minutes);

    if r.metric = 'sessions' then
      select count(*) into obs from analytics_sessions
        where first_seen >= win and is_bot = false and blocked = false;
    elsif r.metric = 'pageviews' then
      select count(*) into obs from analytics_events e
        join analytics_sessions s on s.id = e.session_id
        where e.created_at >= win and e.event_type = 'pageview'
          and s.is_bot = false and s.blocked = false;
    elsif r.metric = 'country' then
      select count(*) into obs from analytics_sessions
        where first_seen >= win and country = r.dimension
          and is_bot = false and blocked = false;
    elsif r.metric = 'channel' then
      select count(*) into obs from analytics_sessions
        where first_seen >= win and channel = r.dimension
          and is_bot = false and blocked = false;
    elsif r.metric = 'referrer' then
      select count(*) into obs from analytics_sessions
        where first_seen >= win and referrer ilike '%' || r.dimension || '%'
          and is_bot = false and blocked = false;
    else
      continue;
    end if;

    if (r.comparator = 'gt' and obs > r.threshold)
       or (r.comparator = 'lt' and obs < r.threshold) then
      -- one breach per window, so a standing breach doesn't spam the feed
      if r.last_fired_at is null or r.last_fired_at < win then
        insert into traffic_alert_events (alert_id, observed, threshold)
          values (r.id, obs, r.threshold);
        update traffic_alerts set last_fired_at = now() where id = r.id;

        alert_id := r.id; name := r.name; observed := obs; threshold := r.threshold;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.analytics_overview(timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.analytics_breakdown(text, timestamptz, timestamptz, int, boolean) to authenticated;
grant execute on function public.analytics_top_paths(timestamptz, timestamptz, int, boolean) to authenticated;
grant execute on function public.analytics_timeseries(timestamptz, timestamptz, int, boolean) to authenticated;
grant execute on function public.evaluate_traffic_alerts() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the channel rules most sites want on day one
-- ---------------------------------------------------------------------------

insert into public.traffic_rules (kind, match_type, pattern, channel, priority, note)
select * from (values
  ('channel', 'referrer', 'google.',      'Organic',  10, 'Google search'),
  ('channel', 'referrer', 'bing.',        'Organic',  10, 'Bing search'),
  ('channel', 'referrer', 'duckduckgo.',  'Organic',  10, 'DuckDuckGo'),
  ('channel', 'referrer', 'instagram.',   'Social',   20, 'Instagram'),
  ('channel', 'referrer', 'facebook.',    'Social',   20, 'Facebook'),
  ('channel', 'referrer', 'pinterest.',   'Social',   20, 'Pinterest'),
  ('channel', 'referrer', 'linkedin.',    'Social',   20, 'LinkedIn'),
  ('channel', 'referrer', 't.co',         'Social',   20, 'X / Twitter'),
  ('channel', 'referrer', 'youtube.',     'Social',   20, 'YouTube'),
  ('bot',     'user_agent', 'bot',        null,       10, 'Generic crawler'),
  ('bot',     'user_agent', 'crawler',    null,       10, 'Generic crawler'),
  ('bot',     'user_agent', 'spider',     null,       10, 'Generic crawler'),
  ('bot',     'user_agent', 'headless',   null,       10, 'Headless browser'),
  ('bot',     'user_agent', 'lighthouse', null,       10, 'Lighthouse audit'),
  ('bot',     'user_agent', 'pingdom',    null,       10, 'Uptime monitor'),
  ('bot',     'user_agent', 'gtmetrix',   null,       10, 'Speed test')
) as seed(kind, match_type, pattern, channel, priority, note)
where not exists (select 1 from public.traffic_rules);
