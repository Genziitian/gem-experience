-- Wishlist: the pieces a signed-in client has saved with the heart.
--
-- The storefront's catalogue lives in data.js, not in public.products (which
-- holds a handful of seed rows), so the older public.wishlists table, keyed to
-- products.id, cannot hold these. Each row here keeps the piece's own key
-- ("fj:gd26-148", "hj:weaver") and a snapshot of what the account page needs to
-- show it: name, a line of detail, the image and the link. A visitor who is
-- not signed in keeps the list on the device; it is merged in here when they
-- sign in.
--
-- Safe to re-run.

create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  piece_key text not null check (piece_key ~ '^(fj|hj):[a-z0-9-]+$'),
  name text not null,
  detail text,
  image text,
  href text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, piece_key)
);

create index if not exists wishlist_items_user_idx
  on public.wishlist_items (user_id, created_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists "Clients manage their own wishlist" on public.wishlist_items;
create policy "Clients manage their own wishlist" on public.wishlist_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Staff read wishlists" on public.wishlist_items;
create policy "Staff read wishlists" on public.wishlist_items
  for select to authenticated
  using (public.is_staff());

grant select, insert, update, delete on public.wishlist_items to authenticated;
