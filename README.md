# Gem Experience

Monorepo for the public website, admin panel, database, and design assets.

## Project layout

| Folder | Role |
| --- | --- |
| [`frontend/`](frontend/) | **Public website** (deploy root). Home at `/`, High Jewellery at `/high-jewellery/` |
| [`admin/`](admin/) | **Staff admin** (React + Supabase). Local dev on port 5173 |
| [`backend/`](backend/) | Backend docs — Supabase setup, roles, next steps |
| [`migrations/`](migrations/) | **SQL schema + seed** — run in Supabase SQL Editor |
| [`api/`](api/) | Analytics collector and lead mail, run on the VPS as the `gem-api` service |
| [`deploy/`](deploy/) | Server config and the database backup script |
| [`assets/`](assets/) | **Non-deployed assets** — source photos, Claude Design handoff |

Legacy duplicate at repo root `/project/` is gitignored (old zip extract).

## Run locally

**Website** (from repo root):

```bash
cd frontend && python3 -m http.server 8000
```

→ http://localhost:8000 · http://localhost:8000/high-jewellery/

Also live under `frontend/`:

| Path | Page |
| --- | --- |
| `/appointment/` | Book an appointment |
| `/quotation/` | Request quotation |
| `/contact/` | Contact us |
| `/cart/` · `/checkout/` | Selection + concierge checkout |
| `/login/` · `/account/` | Auth + my account |
| `/legal/` | Privacy / Terms / Cookies |
| `/offices/` | Ateliers and Tanzania stores |
| `/the-house/` | The House (brand page) |
| `/lookbook/` | Lookbook, generated from the catalog |
| `/events/` | Events & Exhibitions |
| `/404.html` | Branded error page |

Forms and checkout enquiries write to Supabase (`form_submissions`, `orders`). Admin → **Quotations** shows active quotes.

**Admin**:

```bash
cd admin && cp .env.example .env   # once: paste Supabase URL + anon key
npm install && npm run dev
```

→ http://localhost:5173

Or from root: `npm run dev:frontend` (run inside `frontend/`) and `npm run dev:admin`.

## Deploy

The site is served from a Hostinger VPS (nginx, Ubuntu 24.04) since 2026-10-06; `vercel.json` is kept only as a record of the routing nginx reproduces.

```bash
npm run build:admin     # admin → frontend/admin/
npm run build:seo       # lookbook, SEO tags, structured data, FJ product pages, sitemap.xml, robots.txt, llms.txt
rsync -az --delete --exclude .DS_Store frontend/ root@187.126.117.222:/var/www/gem-experience/
```

`build:seo` reads the catalog, FAQs and offices, so run it after every catalog change. Story pages are rebuilt with `node tools/build-stories.mjs` after editing `frontend/high-jewellery/stories.js`.

**Catalog edits in the admin are not live on their own.** The storefront renders from `frontend/*/data.js`; after editing products in the admin, use Catalog → Export, replace the two `data.js` files, rebuild and deploy. Everything else in the admin (menu, contact details, offices, events, FAQs, journal) is live as soon as it is saved.

Server-side pieces live in [`deploy/`](deploy/): nginx caching/HTTP2/security headers to add, and the nightly database backup.

## Backend

Supabase Postgres + Auth. See [`backend/README.md`](backend/README.md).

## Design source

High Jewellery was built from [`assets/design/project/High Jewellery.dc.html`](assets/design/project/High%20Jewellery.dc.html).
