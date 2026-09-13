# Gem Experience — Backend (Supabase)

We use **Supabase** (hosted Postgres + Auth + Storage + API), not phpMyAdmin.

phpMyAdmin only browses MySQL. Supabase gives you the database **and** login, security rules, and REST access the admin app already uses.

## What’s included

| Module | Tables / features |
| --- | --- |
| Catalog | `categories`, `collections`, `products`, images, variants |
| Users | `profiles` (roles), addresses, wishlists |
| Orders | `orders`, `order_items`, `payments` |
| Forms | `form_submissions`, `form_activity` |
| Traffic | `analytics_sessions`, `analytics_events` |
| SEO | product/category meta + `seo_globals` |
| Security | `audit_logs`, `login_attempts`, `blocked_ips`, RLS |

Admin UI lives in [`../admin`](../admin).

## One-time setup (≈10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL → New query**, paste and run:
   - [`migrations/20260913000000_init.sql`](migrations/20260913000000_init.sql)
   - then [`seed.sql`](seed.sql)
3. **Authentication → Users → Add user** (email + password).
4. **Table Editor → `profiles`**: set that user’s `role` to `super_admin`.
5. **Project Settings → API**: copy **Project URL** and **anon public** key.
6. In `admin/`:
   ```bash
   cp .env.example .env
   # paste URL + anon key into .env
   npm install
   npm run dev
   ```
7. Open http://localhost:5173 and sign in.

## Roles

- `super_admin` — full admin
- `ops` — orders, forms, users
- `catalog` — products
- `customer` — storefront only (blocked from admin)

## Next (storefront wiring)

Point the live site at Supabase for:

- `products` / `categories` instead of hardcoded `app.js` data  
- form posts → `form_submissions`  
- page beacon → `analytics_events`  
- checkout → `orders` + Razorpay webhooks  

Storage bucket (optional): create public bucket `product-media` for uploads.
