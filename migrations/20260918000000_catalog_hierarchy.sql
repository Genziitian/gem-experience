-- Catalog hierarchy + storefront spec fields.
--
-- Two gaps this closes:
--
--   1. A collection had no category, so there was no way to ask "which
--      collections belong to Fine Jewellery" — the admin needs that to browse
--      Category -> Collection -> Product rather than one flat product list.
--
--   2. The storefront's Fine Jewellery data carries per-piece specs (stone
--      shape, stone and diamond carat weights, net and gross gram weights)
--      that had no column anywhere, so importing the real catalog would have
--      silently dropped them and the export could not rebuild data.js.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------- collections

alter table public.collections
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists lede text,
  add column if not exists tone text,
  add column if not exists banner text,
  add column if not exists meta text,
  add column if not exists designer text,
  -- editorial model shots, as the storefront's relative paths
  add column if not exists models jsonb not null default '[]'::jsonb;

create index if not exists collections_category_idx
  on public.collections (category_id, sort_order);

-- ------------------------------------------------------------------ products

alter table public.products
  add column if not exists metal_code text,
  add column if not exists stone text,
  add column if not exists shape text,
  add column if not exists stone_pcs int,
  add column if not exists stone_ct numeric(10, 3),
  add column if not exists diamond_ct numeric(10, 3),
  add column if not exists net_g numeric(10, 3),
  add column if not exists gross_g numeric(10, 3),
  -- fallback swatch shown until a photograph loads
  add column if not exists tone text,
  -- Any storefront field without a column of its own (the gemstone detail
  -- block: cut, clarity, treatment, certification…). Kept verbatim so an
  -- import followed by an export returns the data file unchanged instead of
  -- quietly dropping whatever this schema had not anticipated.
  add column if not exists extras jsonb not null default '{}'::jsonb;

create index if not exists products_collection_idx
  on public.products (collection_id, featured_sort);
create index if not exists products_category_idx
  on public.products (category_id, featured_sort);

-- Backfill: every collection seeded before this migration is High Jewellery.
update public.collections c
   set category_id = (select id from public.categories where slug = 'high-jewellery')
 where c.category_id is null;
