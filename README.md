# Gem Experience

Monorepo for the public website, admin panel, database, and design assets.

## Project layout

| Folder | Role |
| --- | --- |
| [`frontend/`](frontend/) | **Public website** (deploy root). Home at `/`, High Jewellery at `/high-jewellery/` |
| [`admin/`](admin/) | **Staff admin** (React + Supabase). Local dev on port 5173 |
| [`backend/`](backend/) | Backend docs — Supabase setup, roles, next steps |
| [`migrations/`](migrations/) | **SQL schema + seed** — run in Supabase SQL Editor |
| [`api/`](api/) | Placeholder for webhooks / Edge Functions (Razorpay, forms) |
| [`assets/`](assets/) | **Non-deployed assets** — source photos, Claude Design handoff |

Legacy duplicate at repo root `/project/` is gitignored (old zip extract).

## Run locally

**Website** (from repo root):

```bash
cd frontend && python3 -m http.server 8000
```

→ http://localhost:8000 · http://localhost:8000/high-jewellery/

**Admin**:

```bash
cd admin && cp .env.example .env   # once: paste Supabase URL + anon key
npm install && npm run dev
```

→ http://localhost:5173

Or from root: `npm run dev:frontend` (run inside `frontend/`) and `npm run dev:admin`.

## Deploy

`vercel.json` publishes **`frontend/`** only. Admin can live on the same host at `/admin` later (build output) or a subdomain.

## Backend

Supabase Postgres + Auth. See [`backend/README.md`](backend/README.md).

## Design source

High Jewellery was built from [`assets/design/project/High Jewellery.dc.html`](assets/design/project/High%20Jewellery.dc.html).
