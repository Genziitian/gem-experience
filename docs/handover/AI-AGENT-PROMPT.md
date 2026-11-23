# Gem Experience website: brief for an AI coding agent

Paste this at the start of a session, or save it as `CLAUDE.md` at the repo root so it loads automatically.

---

You are maintaining **gem-experience.com**, the website of Gem Experience, a coloured-gemstone jewellery house with ateliers in the UAE (Dubai), India (Jaipur) and Tanzania (Arusha). The site is live and used by the house's staff and clients. Treat every change as a change to production.

## How the site is built

- **Storefront:** static HTML, CSS and plain JavaScript in `frontend/`, with no framework or bundler. Pages are folders with an `index.html`.
- **Catalogue data:**
  - `frontend/fine-jewellery/data.js` (`window.FJ_DATA`, about 390 products): each product has `id`, `sku`, `images`, and optionally `design` (pieces of one design grouped on one card, the first id leading), `hidden` and `hiddenReason`.
  - `frontend/high-jewellery/data.js` (`window.HJ_DATA`).
  - The storefront renders only from these files.
- **Generated pages** (never hand-edit their generated parts):
  - `tools/build-stories.mjs` writes the High Jewellery piece pages, from `frontend/high-jewellery/stories.js`.
  - `tools/build-house-pages.mjs` writes GE Icons, Craftsmanship, Sustainability, Mining, Maasai Women, Timeline, Investors, Careers and Size guide. Edit the content inside that script.
  - `tools/build-seo.mjs` (run by `npm run build:seo`) writes:
    - the SEO block between `<!-- seo -->` markers on every page (canonical, Open Graph, JSON-LD);
    - the pre-rendered content between `<!-- seo:pre -->` markers;
    - one page per Fine Jewellery product at `frontend/fine-jewellery/p/<id>/`;
    - `sitemap.xml` (with images), `robots.txt`, `llms.txt` and `llms-full.txt`.

    It reads FAQs, offices, events and Journal posts from Supabase, so it needs network access.
- **Admin panel:** React and Vite in `admin/`, served at `/admin/`. It builds into `frontend/admin/`, which is **git-ignored**. Always run `npm run build:admin` before deploying.
  - Menu, Offices, Contact, FAQs, Events and Blog edits are live in Supabase straight away.
  - Product edits are **not live**. They go Catalog → Export data.js → replace the two `data.js` files → rebuild → deploy.
  - Catalog export includes only `status = published` products.
- **Backend:** Supabase project `lyoxxkgumdxoztjffkfe` (auth, Postgres and storage). Migrations live in `migrations/` and are run by hand in the SQL editor. Only the public anon key is in `frontend/js/config.js`.
- **Mail API:** `api/` (`server.js`, `email.js`, `notify.js`) runs on the server as the systemd service `gem-api` from `/opt/gem-api/`, behind nginx at `/api/notify` and `/api/collect`.
- **Sign-in emails:**
  - `tools/build-auth-emails.mjs` renders them into `supabase/auth-emails/`.
  - `tools/apply-auth-emails.mjs` uploads only the mailer fields. It needs `SUPABASE_ACCESS_TOKEN` from the user.
- **Hosting:** a Hostinger VPS (nginx, Ubuntu) at `root@187.126.117.222`, not Vercel. `vercel.json` is only a record.
  - Site config: `/etc/nginx/sites-available/gem-experience`.
  - Security headers: `snippets/gem-security-headers.conf`, included in each location.
  - Previous config backup: `/root/gem-experience.nginx.bak-20261123`.

## Build and deploy, in this order

```bash
node tools/build-stories.mjs        # if High Jewellery stories changed
node tools/build-house-pages.mjs    # if House pages or GE Icons changed
npm run build:seo                   # ALWAYS last: the builds above strip the SEO blocks
npm run build:admin                 # if anything in admin/ changed
rsync -az --delete --exclude .DS_Store frontend/ root@187.126.117.222:/var/www/gem-experience/
# API changes only:
scp api/email.js api/notify.js root@187.126.117.222:/opt/gem-api/ && ssh root@187.126.117.222 systemctl restart gem-api
node tools/indexnow.mjs             # after a deploy, to tell Bing the pages changed
```

Check a deploy by re-running the rsync with `-n --itemize-changes`: it should list nothing.

## Caching: what to bump

- HTML, CSS and JS are revalidated on every load.
- Images are cached for **30 days**. A changed photograph must get a **new file name** (for example `-set-2.webp`), never overwrite the old one.
- Scripts and styles use `?v=` query strings:
  - Fine Jewellery: currently `app.js?v=13`, `data.js?v=10`, `styles.css?v=9`.
  - High Jewellery: `202611071800`.
  - House pages: `house.css?v=4`.
- Bump the version of any script or style you change, in every file that references it.

## Rules

1. **Ask before you commit, push or deploy**, unless the user has asked for it in this session. When you commit, the message explains why, not just what.
2. **Never read credentials**: no keychain, no `.env` contents, no token stores. If a task needs a secret, write the tool so it reads the secret from an environment variable, and ask the user to run it with `! VAR=... command`.
3. **Client source material stays out of git**:
   - the shoot folders, `.xlsx` sheets, `.zip` files, `.docx` files and the client and reply PDFs in the repo root;
   - only web-sized WebP derivatives ship;
   - in product spreadsheets, only **Sheet1** is publishable. Other sheets hold client names, stock and prices and must never reach the site.
4. **No prices anywhere.** Every piece is price on enquiry.
5. **House style:**
   - British spelling (jewellery, colour, centre).
   - Offices are always listed **UAE · India · Tanzania**.
   - Metals are written as "18k White Gold".
   - Weights are plain numbers in data, and "2.35 carats" in prose.
   - Short, factual sentences: no exclamation marks, no "stunning".
6. **Never invent product facts** (stones, weights, metals, collections, history). If the sheet or the client did not say it, leave it empty and list it as an open question.
7. **New Fine Jewellery products** come in as a Sheet1 row plus a photo folder (`<Type>/<SKU>/SKU.jpg, SKU_1.jpg…`).
   - Import them with `tools/fj-import-sheet.py` (`plan`, then `build`), which runs the image pipeline (`tools/fj-import.py`: common ground, sparkle grade, WebP plus `.w640` copies).
   - Add same-design groups to its `DESIGNS` list.
8. **Verify before you say it is done.**
   - `node --check` every edited JS file, and parse every JSON-LD block.
   - Screenshot changed pages with headless Chrome. Lazy images need forcing eager and waiting for them to load.
   - For speed work, run mobile Lighthouse on the live URL.
   - Report what you could not verify.
9. **Client feedback** arrives as PDFs ("website changes x.y"). Work through it point by point. When asked, produce a reply PDF covering each point with what was done, a screenshot, and the open questions at the end.
   - The source goes in `docs/handover/`.
   - Print it with `node tools/html-to-pdf.mjs <html> <pdf> "<footer>"`.

## Handover documents

- `docs/handover/admin-sop.html` is the source of "Gem Experience - Admin Panel SOP.pdf", for staff. Update it when the admin changes. Its screenshots in `docs/handover/img/` come from the admin harness (`npm run harness --prefix admin`).
- `docs/handover/seo-report.html` is the source of "Gem Experience - SEO GEO AEO Report.pdf".

## Open items (as of 23 November 2026)

- **Sign-in email templates:** not yet uploaded. The user runs `tools/apply-auth-emails.mjs` with their token. Then test "Forgot password?" in the admin with a real staff account.
- **Admin catalogue:** until 23 November 2026, "Import from site" always failed: mixed Fine/High rows sent NULL into NOT NULL columns. That is fixed (`uniform()` in `admin/src/lib/catalogSync.js`). A Super admin must run **Import from site** once, so the admin holds all products; before that it showed only 7 High Jewellery pieces.
- **Admin photo and Unpublish fixes:** tested only in the harness. Confirm with one real product edit.
- **Supabase migrations:** all 24 in `migrations/` are applied (every table, column and function they create exists in the live database, checked 23 November 2026).
- **Waiting on the client:**
  - the Arusha phone number (`+255 76760099` looks one digit short);
  - whether 1998 (Color Clarity Ltd.) is the founding year to state;
  - GD26-497's stone;
  - collections for about 50 unassigned pieces;
  - Grossular write-ups, the Jardin de Tulips metal, and specs for Tangerine and Scarlet;
  - renders and write-ups for the HJ 2025 pieces;
  - four hidden products;
  - the Buyer's guide PDF.
- **SEO actions for the client:** Search Console and Bing verification, Google Business Profiles for the three ateliers, reviews, Journal articles (there are none yet), a factual first sentence on each gemstone guide, and homepage text.
- **Next performance step:** a CDN. The server takes about 0.65 s to respond, and shop pages show their main image in 3.1–3.4 s against Google's 2.5 s target.
- **Admin SEO screen:** saves to Supabase, but nothing on the site reads it yet.
