# API layer

Vercel serverless functions. The **admin** talks to Supabase/PostgREST directly; the
**storefront** goes through here for anything that needs a server (geo lookup, secrets).

## `collect.js` — analytics collector

`POST /api/collect`, beaconed by `frontend/js/analytics.js` on every storefront pageview.
Resolves the visitor's country/city from Vercel's `x-vercel-ip-*` request headers (no
third-party IP lookup, no client-side geo call), applies the traffic rules from
`public.traffic_rules` (bot detection, block/allow lists, referrer → channel mapping),
and upserts `analytics_sessions` / `analytics_events` in Supabase.

Env vars (Vercel → Project Settings → Environment Variables):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — preferred, bypasses RLS for the upsert. Falls back to
  `SUPABASE_ANON_KEY` if unset, which also works since the anon-insert policies on
  `analytics_sessions`/`analytics_events` already allow it — just keep the service key
  out of any client bundle if you do set it.
- `ANALYTICS_IP_SALT` — any random string, salts the hashed IP stored on the session.

`api/package.json` sets `"type": "module"` scoped to this directory (the collector uses
ESM `import`), without changing module resolution for the rest of the repo.

Add here when you need:

- **Razorpay webhooks** (verify signature, update `payments` / `orders`)
- **Email triggers** on new `form_submissions`
- **Supabase Edge Functions** (`supabase functions new …`) if you adopt the CLI

Keep secrets in Vercel/Supabase env vars, not in git.
