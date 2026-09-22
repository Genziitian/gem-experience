# Gem Experience Admin

Supabase-backed admin for catalog, users, orders, forms, traffic, SEO, and security.

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

Full backend setup: [`../backend/README.md`](../backend/README.md)

## Site content (menu, offices, contact, media)

The menu tree, the office cards and the contact details used to be hard-coded
in the storefront. They now live in Supabase and the storefront reads them at
run time, so staff can change a phone number without a developer or a deploy.

### Setting it up

1. **Run the migrations**, newest last, in the Supabase SQL editor:

   - `migrations/20260922000000_site_content.sql` — tables, RLS, audit triggers
   - `migrations/20260922000100_site_content_seed.sql` — the current site content

   The seed is generated from the storefront's own arrays, so after running it
   the database renders exactly what the site already shows. Both files are
   guarded and safe to re-run.

2. **Create the storage bucket** for uploads, once:

   - Storage → New bucket → name `media`, **public** ✓

   Without it the Media page loads and lists fine but every upload fails.

3. Reload the admin. Menu, Offices, Contact and Media appear under *Content*.

### How it reaches the site

`frontend/js/site-content.js` runs on every page. It draws whatever the page
already ships with first, then replaces it if Supabase answers — so a failed
request, a missing table or an empty admin leaves the site exactly as it was.
The last good response is cached in `localStorage` for ten minutes, so a
repeat visitor sees edits without waiting on a round trip.

That fallback is the reason the hard-coded arrays are still in `site-nav.js`,
`contact/index.html` and `offices/index.html`. They are not dead code; they
are what the site falls back to. Deleting them would make the menu depend on
a network request.

### Developing without a database

    npm run harness
    open http://localhost:5173/admin/src/__harness/harness.html?page=navigation

Opens the content pages against an in-memory stand-in for Supabase — no login,
no database. See `src/__harness/README.md`.

### The catalogue round trip

`Catalog → Import from site` reads the two `data.js` files into Supabase;
`Export` writes them back for committing. The round trip is lossless,
including the per-image crop points, which live in `site_settings.focal`
because they are keyed by image path rather than belonging to any one product.
