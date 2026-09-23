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

## Activity and roles

`migrations/20260923000000_activity_log.sql` adds the activity feed, extends
the change-log triggers, and closes a privilege escalation. Run it after the
site-content migrations.

### The escalation it closes

The original policy was:

    create policy "Staff update profiles" on public.profiles
      for update using (public.is_staff() or id = auth.uid());

An UPDATE policy with no `with check` reuses its `using` expression for the
check, and that clause permitted `id = auth.uid()`. Any signed-in storefront
customer could therefore update their own profile row — including `role` — and
make themselves a super admin in one request. The admin's dropdowns were never
the protection; there was none.

`guard_profile_privileges()` now decides who may move `role` and `status`:

| Viewer      | Change a role | Block an account            |
| ----------- | ------------- | --------------------------- |
| Super admin | anyone but themselves | anyone but themselves |
| Manager     | no            | storefront users only       |
| Admin       | no            | no                          |
| User        | no            | no                          |

Nobody changes their own role or status, super admin included, and the last
active super admin cannot be demoted or blocked — otherwise the panel can be
locked out of its own role management with no way back in.

### Roles

Four tiers, hierarchical. The stored values predate this screen and every
security policy is written against them, so they stay; the labels are in
`ROLES` in `src/lib/activity.js`.

| Label       | Stored value  |
| ----------- | ------------- |
| Super admin | `super_admin` |
| Manager     | `ops`         |
| Admin       | `catalog`     |
| User        | `customer`    |

If you would rather the stored values matched the labels, that is an enum
rename plus a rewrite of every policy naming `ops` or `catalog` — worth doing
deliberately, not as a side effect of this screen.

### What gets recorded

- **Sessions** — sign in, sign out, screens opened. Written by the app, since
  no row changes when somebody navigates. Page views are throttled to one per
  screen per minute so a screen left open does not bury the feed.
- **Changes** — creates, edits, deletes, role and status changes on products,
  collections, nav, offices, settings and profiles. Written by database
  triggers, so an edit made through the Supabase dashboard is recorded too.

`activity_feed` is a view that unions the two, so the screen makes one query
with one ordering rather than interleaving two paginated lists in the browser.

Staff read the feed; anyone signed in may append their own rows, which is what
lets a sign-in be recorded by the person signing in. The actor cannot be
forged and nothing can be edited or deleted afterwards.
