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

## What the design contains

One component with two views, driven by state:

- **Listing** — breadcrumb, title, 12 designs, sort menu, filter drawer with four
  groups (Category / Price / Collection / Occasion), active-filter chips, empty
  state, and an editorial banner after every third product.
- **Product** — six-tile gallery, sticky detail panel (materials, story with
  read-more, metal swatches, sizes, two CTAs, four info links), a four-column
  spec strip, a film band, and four related products.

Clicking a product opens its detail view; "View all" returns to the listing.

## Ported exactly

Every colour, font size, letter-spacing, `clamp()`, gap and border in
`styles.css` comes from the prototype's inline styles. From the component logic:
the 12 products with all their attributes, the four filter groups, the price
banding, the three sort keys, the 150-character story truncation, the metal-swatch
colour rules (`Yellow` → `#c9a227`, `Rose` → `#d8a08c`, else `#c6c9cd`), the
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
