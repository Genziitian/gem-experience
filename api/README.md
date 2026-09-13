# API layer

No custom server yet — the **admin** and (future) **storefront** use the Supabase client and PostgREST.

Add here when you need:

- **Razorpay webhooks** (verify signature, update `payments` / `orders`)
- **Email triggers** on new `form_submissions`
- **Supabase Edge Functions** (`supabase functions new …`) if you adopt the CLI

Keep secrets in Supabase **Project Settings → Edge Function secrets**, not in git.
