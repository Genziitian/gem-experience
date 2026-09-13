# Backend (Supabase)

Hosted **Postgres + Auth + Storage + auto REST API**. The admin app talks to Supabase directly; custom server code (if any) lives under [`../api/`](../api/).

## Database migrations

Run in Supabase **SQL → New query**, in order:

1. [`../migrations/20260913000000_init.sql`](../migrations/20260913000000_init.sql)
2. [`../migrations/seed.sql`](../migrations/seed.sql)

## Modules

| Module | Tables |
| --- | --- |
| Catalog | `products`, `categories`, `collections`, images, variants |
| Users | `profiles`, addresses, wishlists |
| Orders | `orders`, `order_items`, `payments` |
| Forms | `form_submissions`, `form_activity` |
| Traffic | `analytics_sessions`, `analytics_events` |
| SEO | product meta + `seo_globals` |
| Security | `audit_logs`, `login_attempts`, `blocked_ips`, RLS |

## Admin access

1. Create a user in Supabase **Authentication**.
2. Set `profiles.role` to `super_admin` for that user.
3. Configure [`../admin/.env`](../admin/.env) with project URL + anon key.
4. `npm run dev` in `admin/`.

Roles: `super_admin`, `ops`, `catalog`, `customer`.

## Storefront (next)

Wire `frontend/` to Supabase for products, forms, and analytics beacons.
