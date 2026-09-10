# Gem Experience

Two pages for Gem Experience: the **Home** page, and **High Jewellery** built
from a [Claude Design](https://claude.ai/design) prototype.

## Contents

| Path | What it is |
| --- | --- |
| [`home/`](home/) | The home page — serve the repository and open `/home/` |
| [`high-jewellery/`](high-jewellery/) | The High Jewellery page — open `index.html`, or serve the folder |
| [`gem-experience-product-pages/`](gem-experience-product-pages/) | The Claude Design handoff bundle the High Jewellery build came from |

## The home page

Hero, a three-card collections row, the Tanzania Universe film band, and a
footer with the newsletter, an editorial banner, accordion link groups, region
and socials. Built to a mobile design spec at 390px, widening from there.

`vercel.json` still publishes `high-jewellery/` as the site root, so the home
page is not deployed yet. See [`home/README.md`](home/README.md).

## The High Jewellery page

One design with two views:

- **Listing** — breadcrumb, title, 12 designs, sort menu, a filter drawer with four
  groups (Category / Price / Collection / Occasion), active-filter chips, empty
  state, and an editorial banner after every third product.
- **Product** — six-tile gallery, sticky detail panel (materials, story with
  read-more, metal swatches, sizes, two CTAs, four info links), a spec strip, a
  film band, and four related products.

Clicking a product opens its detail view at `#/product/<id>`; "View all" returns
to the listing.

## Running it

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/home/> or <http://localhost:8000/high-jewellery/>.
No build step and no dependencies — plain HTML, CSS and JavaScript.

## How it was built

`gem-experience-product-pages/project/High Jewellery.dc.html` is the design
source: a prototype in Claude Design's canvas format, with the layout in inline
styles and the behaviour in a `DCLogic` component.

Every colour, font size, letter-spacing, `clamp()`, gap and border in
`high-jewellery/styles.css` is taken from that file. The product data, filter
groups, price banding, sort keys, story truncation, swatch and size rules, spec
strip and related-product ordering in `high-jewellery/app.js` are ported from its
component logic.

The photography was embedded as base64 in the design's
`.image-slots.state.json` and was extracted into `high-jewellery/img/`.

See [`high-jewellery/README.md`](high-jewellery/README.md) for the detail,
including the four places where the design left image slots empty and a call had
to be made.
