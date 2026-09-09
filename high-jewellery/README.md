# High Jewellery — Gem Experience

Implementation of `High Jewellery.dc.html` from the Claude Design bundle in
`../gem-experience-product-pages/`.

Open `index.html` in a browser, or serve it:

```
python3 -m http.server 8000
```

## Files

| File | What it is |
| --- | --- |
| `index.html` | Shell — sticky header, view mount, footer |
| `styles.css` | All styling, ported from the prototype's inline styles |
| `app.js` | Product data and logic, ported from the prototype's `DCLogic` component |
| `img/` | Photography extracted from the design's `.image-slots.state.json` |

## What the site contains

One component with two views, driven by state:

- **Collection** — breadcrumb, title, sort menu, filter drawer (Category /
  Collection / Occasion), active-filter chips, empty state, a booking button
  under each piece, and an interlink banner after the 4th and 12th product.
- **Product** — breadcrumb, gallery, title and one-line description, metal and
  size variants, enquiry CTAs with an availability line, three accordions, a
  spec strip, a cross-sell rail, a full-bleed editorial band and copy block, an
  FAQ accordion, and a concierge band. On mobile the CTA pins to the bottom once
  it scrolls out of view.

  The gallery is one set of markup in two layouts: a swipe track with dot
  pagination on phones, and from 901px a two-column mosaic that scrolls against
  the pinned info column.

Clicking a piece opens its product page; the breadcrumb returns to the
collection.

## Enquiries

Every CTA — "Enquire now", "Book a private viewing", the mobile sticky bar, the
concierge band and the booking button on each collection card — opens a chooser
with the two WhatsApp lines:

| Line | Number |
| --- | --- |
| India | +91 73000 43093 |
| United Arab Emirates | +971 56 720 3896 |

Picking one opens `wa.me` in a new tab with the message pre-filled with the
piece's name and materials. Numbers live in `WHATSAPP` at the top of `app.js`;
`wa.me` needs digits only, no plus or spaces.

## No pricing

There is no price anywhere: no `price` field, no price filter, no price sort.
Pieces are quoted on enquiry, so sorting is alphabetical and the line under the
CTA reads "Price on enquiry · Made to order, 8–12 weeks".

## Ported exactly

Every colour, font size, letter-spacing, `clamp()`, gap and border in
`styles.css` comes from the prototype's inline styles. From the component logic:
the filter groups, the metal-swatch colour rules (`Yellow` → `#c9a227`,
`Rose` → `#d8a08c`, else `#c6c9cd`), the
size rules (rings get 52/54/56, everything else One size / Made to order), the
spec strip, and the related-product ordering (same collection first).

Displayed product names come from the prototype's `name1..name12` prop defaults,
which override the raw `products[].name` values via its `nm(p)` helper — so the
first piece reads "Wimbi", not "Serengeti Halo Ring".

## Decisions the design left open

- **PDP gallery images.** The six `hj-pdp-<id>-1..6` slots were never filled in
  the design. Each product leads with its own artwork, then fills the remaining
  tiles deterministically from the High Jewellery image pool.
- **Fourth editorial banner.** The "every third product" rule produces four
  banners but only three editorial images were assigned, so the three cycle.
- **Related-product images.** The `hj2-rel-<id>` slots were empty; these reuse
  each product's own grid image.
- **Grid images for three products.** `selous`, `ngorongoro` and `manyara` had no
  `hj2-` slot filled, so they use their `hj-` slot image instead.

## Additions

- Hash routing (`#/product/<id>`), so a product has a shareable URL and the
  browser back button works. Purely additive — no visual change.
- Accessibility: real `<button>`/`<a>` elements, `aria-pressed` / `aria-checked`
  on the swatches, sizes and filter options, Escape closes the drawer and sort
  menu, and a visible focus ring.

## Not used

`../gem-experience-product-pages/project/_ds/` (the "Modernist" design system —
Archivo, red accent) is a leftover from another project. This design does not
link it and does not follow it.

`assets/plate-*.png` and `assets/shot-*.png` in the bundle are blank studio
backdrops, not photography, so they are not used either.
