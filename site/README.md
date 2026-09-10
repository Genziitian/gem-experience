# Gem Experience — Home

The home page, built to the mobile design spec at 390px. This folder is the
deployed site root, so the home page is served at `/`.

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>. No build step and no dependencies.

## Contents

| File | What it is |
| --- | --- |
| `index.html` | The home page |
| `styles.css` | Every colour, size, letter-spacing, padding and gap from the spec |
| `app.js` | Menu drawer, footer accordions, newsletter validation, film lightbox |
| `img/` | Photography |
| `high-jewellery/` | The High Jewellery page, served at `/high-jewellery/` |

## The page

Six blocks, top to bottom:

1. **Hero** — 780px tall, white 72px header over a full-bleed photograph,
   with "Nothing begins above ground" and "Discover Collections" set at the
   bottom left.
2. **The Gem Experience** — heading and lede on the cream ground, then three
   full-bleed cards (Fine Jewellery, High Jewellery, Gifts), each 390 × 582.16
   with a black label and a "View" underline at the bottom left.
3. **Tanzania Universe** — a 260.5px photographic band inside a 780px black
   section, with the serif display heading and an 80px play button.
4. **Newsletter** — "Join the Gem Experience Universe" over an underlined email
   field.
5. **Editorial banner** — 400px, 8px radius, linking to High Jewellery.
6. **Footer** — three accordion groups, region and socials, brand signature.

At 390px the page measures 4899px, against the spec's 4899.48.

## Widening

The spec is mobile only. Wider viewports scale the same layout rather than
re-composing it. Three things change:

- **900px and up** — the three cards move from a stack to a row.
- **700px and up** — the header becomes a three-column grid so the wordmark
  centres, and the hero takes the window height (capped at 980px).
- Section headings step up one size at 900px; the film heading goes to 56px.

## Photography

Every frame is the design's own photograph. Originals live in
`../source-assets/home/`, outside the deployed folder; `img/` holds the webp
exports.

| File | The frame |
| --- | --- |
| `hero.webp` | Model in black, hand at the neck, aquamarine suite |
| `hero-wide.webp` | The second model frame, used from 700px up |
| `fine-jewellery.webp` | Pink sapphire and diamond floral suite |
| `high-jewellery.webp` | Tanzanite and diamond necklace on pale blue |
| `gifts.webp` | Hands holding an open navy case |
| `tanzania.webp` | Maasai elders at dusk |
| `banner-high-jewellery.webp` | Rough crystal lit warm against the dark |

Each photograph carries its own contrast where the copy sits, so nothing is
scrimmed, tinted or blended at the design width. The one exception is the
hero above 700px: a landscape window crops a band out of a portrait frame, so
wide screens hold that band on the suite and carry the white type on a scrim.

To re-export after replacing an original:

```
cwebp -q 86 -m 6 source-assets/home/<file> -o site/img/<name>.webp
```

## The film

The play button opens a lightbox that tries `video/tanzania-universe.mp4`. No
film has been supplied, so it falls back to the still with a "coming soon"
caption. Drop the file in at that path and the fallback stops firing.

## Deployment

`vercel.json` sets `outputDirectory` to `site`, so this folder is published as
the site root: the home page at `/`, High Jewellery at `/high-jewellery/`.
Anything outside this folder — the design handoff bundle in particular — stays
out of the deployment.
