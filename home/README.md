# Gem Experience — Home

The home page, built to the mobile design spec at 390px.

```
cd ..
python3 -m http.server 8000
```

Then open <http://localhost:8000/home/>. No build step and no dependencies.

## Contents

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Every colour, size, letter-spacing, padding and gap from the spec |
| `app.js` | Menu drawer, footer accordions, newsletter validation, film lightbox |
| `img/` | Photography |

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

The design's own photographs were not in the handoff, so each slot uses the
closest frame in `../high-jewellery/img/`. Six slots want real assets:

| File | Design calls for | Standing in |
| --- | --- | --- |
| `hero.webp` | Model in black, aqua suite, pale ground | `story-model2` |
| `fine-jewellery.webp` | Pink sapphire floral suite | `story-model3` |
| `high-jewellery.webp` | Tanzanite necklace, pale blue ground | `story-half` |
| `gifts.jpg` | Hands holding a navy gift box, sage ground | `editorial-4`, trimmed |
| `tanzania.webp` | Maasai elders at dusk | `story-model1` |
| `banner-high-jewellery.webp` | Rough crystal lit warm against black | `the-crown-macro` |

Three CSS treatments carry those substitutions, and each can go when the real
photograph lands:

- **Gifts** — the product is shot on near-white, so `mix-blend-mode: darken`
  drops the sage ground through everything lighter than it.
- **Banner** — the macro is lit on white, so it is inverted: the ground falls
  to black and the tanzanite reads amber. Its title is white rather than the
  spec's black, which the design can use because its own photograph is dark
  there.
- **Hero and cards** — a soft scrim at the foot of each frame, because these
  photographs run pale (hero) or dark (cards) exactly where the design's run
  the other way.

## The film

The play button opens a lightbox that tries `video/tanzania-universe.mp4`. No
film has been supplied, so it falls back to the still with a "coming soon"
caption. Drop the file in at that path and the fallback stops firing.

## Deployment

`vercel.json` still publishes `high-jewellery/` as the site root, so this page
is not deployed yet. Serving it at `/` means either pointing the output
directory at a folder holding both pages, or restructuring so the home page is
the root and High Jewellery sits under it.
