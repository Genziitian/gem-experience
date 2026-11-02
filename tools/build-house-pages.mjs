#!/usr/bin/env node
/* The House's information pages and the size guide, written from one file.
 *
 *   node tools/build-house-pages.mjs
 *
 * Every statement on these pages comes from the house's own material already
 * on the site (The House, the World of Preciousness guides, the High Jewellery
 * write-ups, the product care text) or from the client's corrections list.
 * Where the house has not yet supplied something (investor reports, founding
 * dates, the Maasai Women Project write-up) the
 * page says only what is known and leaves the rest out; nothing is invented.
 * Adding a section is adding an entry below and re-running this. Run
 * build:seo afterwards for the head tags and the sitemap.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "frontend");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// plain text with [label](href) links
const rich = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="pg-link" href="$2">$1</a>');

const HOURS = [
  ["3,700+", "hours", "Flamenco"], ["3,000+", "hours", "Ember"], ["2,600", "hours", "Samaah"],
  ["2,300", "hours", "Shamsa"], ["2,100", "hours", "Celestine"], ["1,900", "hours", "Rihla"],
];

/* GE Icons, from the house's sheet "GE Icons for website.xlsx": title, type,
   the description used earlier and the photographs it links to (model and
   product shots, downloaded to icons/img/<slug>-1/-2). The facts line only
   repeats what the description states; ref and spec come from the pieces'
   own sheet where there is one ("URNS & VASE - Sheet1.pdf"). Tangerine and
   Scarlet have model photographs only. */
const ICONS = [
  { slug: "tangerine", title: "Tangerine", kind: "Set: necklace and earrings", facts: "122.6 ct morganite", model: [1, 2],
    p: ["Tangerine, is an iconic jewellery set that has graced the lobes and necks of queens and princesses throughout the ages. Crafted from the finest morganite stone, this set consists of earrings and a pendant with an impressive total weight of 122.6 carats.",
        "The subtle shade of orange that permeates the morganite stones exudes an opulence that has long been associated with royalty and nobility. The delicate hues of Tangerine perfectly complemented the opulent gowns of these regal women, accentuating their natural beauty and elegance."] },
  { slug: "scarlet", title: "Scarlet", kind: "Earrings", facts: "54.5 ct Malaya garnet", model: [1, 2],
    p: ["Let the ‘Scarlet’ set transport you to a bygone era of opulence and extravagance. Fit for royalty, this magnificent set features a total of 54.5-carat Malaya Garnet stones that will leave you spellbound.",
        "The pink-orange hue of the Malaya Garnet stones is reminiscent of the sun-kissed skies of a summer's day, adding an ethereal touch of beauty and grace to the Scarlet set. The attention to detail and exquisite craftsmanship that has gone into the creation of this set is truly remarkable, a testament to the skilled artisans who have brought this masterpiece to life."] },
  { slug: "urns-vase-i", title: "Urns and Vase Collection", kind: "Earrings", facts: "22.820 ct tanzanite · 2.366 ct diamonds", model: [2],
    ref: "SG-01", spec: "18k gold · 2 fancy-cut tanzanites · net 9.473 g · gross 14.51 g",
    p: ["The Urns and Vase collection is a true celebration of the art of floral arrangement. With influences from diverse cultures, this collection boasts an awe-inspiring range of vases that showcase slender flowers arranged in two dimensions, as well as extravagant bouquets that pay homage to European florilegia from centuries past. Infusing signature style with organic foliage shapes as basic geometry, the designer has created a modern and clean graphical setting that elevates the classic beauty of these compositions.",
        "Dripping with grandeur, these drop-dangle earrings are a masterpiece. Adorned with a stunning combination of 22.820 carats of enchanting Tanzanite precious stone and 2.366 carats of dazzling diamonds, these earrings are crafted in the brand's signature style, showcasing a modern and sleek graphical aesthetic."] },
  { slug: "urns-vase-ii", title: "Urns and Vase Collection", kind: "Earrings", facts: "25.050 ct tanzanite · 2.268 ct diamonds", model: [2],
    ref: "SG-02", spec: "18k gold · 2 fancy-cut tanzanites · net 13.536 g · gross 19.00 g",
    p: ["The visionary artist Shantanu Garg, with the assistance of Saloni Meratwal, has crafted each piece in this collection with a timeless elegance and unforgettable charm that is guaranteed to leave a lasting impression.",
        "Experience pure luxury with these earrings that are the epitome of elegance. Featuring a lavish combination of 25.050 carats of Mesmerising Tanzanite precious stone and 2.268 carats of scintillating diamonds, meticulously crafted in the brand's signature style."] },
  { slug: "bleu-bow", title: "Bleu Bow Ring", kind: "Ring", facts: "18k gold · round tanzanite · diamonds",
    p: ["A magnificent embodiment of sophistication and allure, behold the resplendent Bleu Bow Ring, crafted from 18k gold and crowned with a dazzling round-shaped tanzanite at its centre, while the exquisite bow sparkles with a captivating array of mixed-shaped diamonds."] },
  { slug: "le-fleur", title: "Le Fleur Ring", kind: "Ring", facts: "18k gold · octagon tanzanite · diamonds",
    p: ["Behold the majesty of the Le Fleur Ring - an 18k gold masterpiece that exudes timeless elegance and is a symbol of luxurious taste and grace. Its octagon-shaped Tanzanite stone, placed at the center, captures the eye with its stunning violet hues, while the intricate leaf-shaped design, adorned with a mix of diamonds of varying shapes, adds a touch of natural splendor."] },
  { slug: "jardin-de-tulips", title: "Jardin De Tulips", kind: "Bracelet", facts: "18k white gold · 6.19 ct rhodolite · diamonds",
    p: ["The Jardin de tulips bracelet features a seamless fusion of modern sophistication and timeless design. The links of 18K white gold form a delicate yet sturdy foundation, creating a luxurious and comfortable fit on the wrist. The addition of meticulously placed diamonds adds a touch of opulence and brilliance, illuminating the piece with captivating sparkle. At the heart of the bracelet lies the mesmerizing 6.19 carats rhodolite, its deep pinkish-red hue symbolizing passion and strength."] },
  { slug: "festoon", title: "Festoon Bracelet", kind: "Bracelet", facts: "9.24 ct rhodolite · diamonds",
    p: ["Festoon bracelet is a true statement piece, perfect for those seeking a touch of luxury and uniqueness. Indulge in the beauty of ancient architecture while embracing the allure of fine jewellery. Elevate your style and make a lasting impression with this exceptional piece that embodies the essence of luxury, craftsmanship, and the captivating charm of 9.24 carats rhodolite. The addition of meticulously placed diamonds adds a touch of opulence and brilliance, illuminating the piece with captivating sparkle."] },
  { slug: "pink-monarch", title: "The Pink Monarch", kind: "Bracelet", facts: "18k gold · 18.26 ct pink spinel · diamonds",
    p: ["The Pink Monarch bracelet boasts a timeless design that effortlessly captures attention. Its 18K gold links form an elegant and sturdy foundation, while the strategically placed diamonds add a touch of opulence and brilliance, captivating the eye with their scintillating sparkle.",
        "At the heart of this extraordinary bracelet lies the stunning 18.26 carats pink spinel. Each spinel is carefully selected for its exceptional color, radiating a captivating pink hue that exudes femininity and sophistication. Pink spinels are expertly set, allowing them to shine with their inherent beauty and natural allure."] },
  { slug: "blue-belle-diva", title: "Blue Belle Diva Ring", kind: "Ring", facts: "1.63 ct tanzanite",
    p: ["Blue Belle Diva Ring, a true masterpiece that combines the allure of Tanzanite with a unique and distinctive wedge shape. This exquisite ring showcases a stunning Tanzanite gemstone weighing 1.63 carats, meticulously cut and polished to enhance its natural beauty.",
        "What sets this ring apart is its remarkable wedge shape, which adds a touch of modernity and uniqueness to the design. The tapering silhouette creates a captivating visual effect and makes a bold statement on the finger."] },
];

const PAGES = {
  icons: {
    title: "GE Icons", kicker: "The House",
    description: "GE Icons: statement pieces from Gem Experience outside the Fine and High Jewellery collections, from the Tangerine morganite set to the Pink Monarch spinel bracelet.",
    lede: "Statement pieces that sit outside the Fine and High Jewellery collections: sets, earrings, rings and bracelets made to be noticed.",
    blocks: [
      { type: "icons" },
      { type: "cta", h: "See an Icon in person", p: "Every piece is shown in private, at our ateliers or by appointment.",
        actions: [["Book a private viewing", "/appointment/"], ["Request a quotation", "/quotation/", true]] },
    ],
  },

  craftsmanship: {
    title: "Craftsmanship", kicker: "The House",
    description: "How Gem Experience cuts and sets coloured stones: cut in the house's own workshop, finished by hand, and counted in hours at the bench.",
    lede: "Every stone is cut in our own workshop, and every piece is finished by hand.",
    blocks: [
      { type: "split", img: "/world-of-preciousness/img/sorting.webp", alt: "A gem sorter grading parcels of coloured stones at a light table.",
        h: "Cut for the stone", p: [
          "We cut our stones ourselves rather than buying them finished, so each is cut for what it is. A stone that shows different colours from different angles, as tanzanite does, is turned until its full colour faces up.",
          "Some cuts are made for a single piece: the 156 disc-cut pink spinels of Ember were all cut to order, to build its dense, layered surface. Others are the house's own, like the Gem Experience Dew Cut, a soft drop that holds the light.",
        ] },
      { type: "figures", h: "Counted in hours", p: "High Jewellery is measured at the bench.", items: HOURS },
      { type: "split", flip: true, img: "/high-jewellery/img/pieces/rihla/m1.webp", alt: "Rihla, tanzanite and mother of pearl, worn.",
        h: "Set by hand", p: [
          "Pavé petals, portrait-cut diamonds laid like flowers, mother of pearl inlaid by hand into Rihla, ceramic set beside tanzanite in Hive: each technique is chosen for the piece, not the other way round.",
          "A setting is made precise enough to hold its shape and loose enough to move with the body.",
        ] },
      { type: "text", h: "Looked after for life", p: [
        "Our workshop will clean and check any piece at any time, without charge. Rings are resized, and necklaces and bracelets restrung, in-house, and every piece carries a lifetime guarantee against manufacturing defect.",
      ] },
      { type: "cta", h: "See the work up close", p: "Book a private viewing and an adviser will take you through the pieces and how they were made.",
        actions: [["Book a private viewing", "/appointment/"], ["Explore High Jewellery", "/high-jewellery/", true]] },
    ],
  },

  sustainability: {
    title: "Sustainability", kicker: "The House",
    description: "How Gem Experience sources and makes its jewellery: stones chosen at the source in Tanzania, treatments disclosed, and pieces made to last.",
    lede: "Fewer hands between the ground and the piece, and jewellery made to be kept.",
    blocks: [
      { type: "split", img: "/the-house/img/rough.webp", alt: "A rough gemstone lit from within, before it is cut.",
        h: "Chosen at the source", p: [
          "Our stones are chosen in Tanzania, where they come out of the ground, rather than bought further down the line. Each one is sorted and graded by hand before it reaches the workshop, so we know where it came from and what it is.",
        ] },
      { type: "text", h: "Stones as they are", p: [
        "Spinel needs no treatment or enhancement. Where any stone has been treated, the treatment is disclosed, and every stone above one carat comes with an independent laboratory report.",
      ] },
      { type: "text", h: "Made to last", p: [
        "High Jewellery is made to order. Every piece can be cleaned, checked, resized or restrung in our own workshop for as long as it is worn, and carries a lifetime guarantee against manufacturing defect.",
      ] },
      { type: "cta", h: "Ask us about a stone", p: "An adviser can tell you where any stone in our collections comes from.",
        actions: [["Contact us", "/contact/"], ["The World of Preciousness", "/world-of-preciousness/", true]] },
    ],
  },

  mining: {
    title: "Mining", kicker: "The House",
    description: "Where Gem Experience's stones come from: tanzanite from its single source at the foot of Kilimanjaro, and the spinel, tsavorite, rhodolite and Malaya garnet of the East African belt.",
    lede: "Every stone begins in Tanzania, and we choose it there.",
    blocks: [
      { type: "split", img: "/the-house/img/mine.webp", alt: "Miners at work underground in Tanzania.",
        h: "One place on earth", p: [
          "There is only one source of high-quality tanzanite in the world: a few square kilometres at the foot of Kilimanjaro, in northern Tanzania. As there is only one source, experts estimate that its supply may run out within a few decades, which is why it is called a one-generation stone.",
          "Our stones are chosen there, where they come out of the ground, rather than bought further down the line.",
        ] },
      { type: "text", h: "The East African belt", p: [
        "Around tanzanite lies the belt that also gives us [spinel](/world-of-preciousness/spinel/), from Mahenge; [tsavorite](/world-of-preciousness/tsavorite/), four times rarer than emerald; [rhodolite](/world-of-preciousness/rhodolite/); and [Malaya garnet](/world-of-preciousness/malaya-garnet/), found by local miners in the Umba River Valley in the 1990s.",
      ] },
      { type: "split", flip: true, img: "/world-of-preciousness/img/parcel.webp", alt: "A parcel of pink spinel held open with tweezers.",
        h: "From rough to the bench", p: [
          "Rough is sorted and graded by hand, then chosen stone by stone for the pieces it will become, before it is cut in our own workshop.",
        ] },
      { type: "cta", h: "Read about each stone", p: "The World of Preciousness tells the story of every stone we work with.",
        actions: [["The World of Preciousness", "/world-of-preciousness/"], ["Tanzanite", "/world-of-preciousness/tanzanite/", true]] },
    ],
  },

  "maasai-women": {
    title: "Maasai Women Project", kicker: "The House",
    description: "The Maasai Women Project: Gem Experience's social responsibility work with Maasai women in northern Tanzania, where its stones come from.",
    lede: "Our social responsibility work with Maasai women in northern Tanzania, the land our stones come from.",
    blocks: [
      { type: "split", img: "/the-house/img/maasai.webp", alt: "Maasai women gathered at dusk in northern Tanzania.",
        h: "The Maasai and tanzanite", p: [
          "The Maasai tell of a lightning bolt that struck the earth and lit the rocks a brilliant blue. That, they say, is how tanzanite was made.",
          "As a cherished heirloom it holds deep significance to the Maasai, who give it to women during childbirth. For them it stands for their bond with the earth and what lies hidden in it.",
        ] },
      { type: "cta", h: "Hear more about the project", p: "Write to us to learn about the project and how to take part.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"], ["Contact us", "/contact/", true]] },
    ],
  },

  investors: {
    title: "Investors", kicker: "The House",
    description: "Investor information for Gem Experience: annual return reports and other investor-related documents.",
    lede: "Annual return reports and other investor information.",
    blocks: [
      { type: "text", h: "Reports", p: [
        "Annual return reports and investor documents will be listed here as they are published.",
      ] },
      { type: "cta", h: "Investor enquiries", p: "For investor-related questions, write to us and the right person will reply.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"]] },
    ],
  },

  timeline: {
    title: "Timeline", kicker: "The House",
    description: "The journey of Gem Experience and the stones it works with, from the discovery of tanzanite to ateliers in Arusha, Dubai and Jaipur.",
    lede: "The house's journey, and the stones that shaped it.",
    blocks: [
      { type: "timeline", items: [
        ["Over thirty years ago", "Sourcing begins in East Africa", "The house starts choosing rare coloured stones directly at the source, in Tanzania."],
        ["1990s", "Malaya garnet is found", "Local miners find Malaya garnet in the Umba River Valley, straddling Tanzania and Kenya; it joins the stones we work with."],
        ["Today", "Ateliers in Arusha, Dubai and Jaipur", "Pieces are shown in private at our three ateliers, and the stones are cut in our own workshop."],
        ["Today", "High Jewellery, counted in hours", "One-of-a-kind pieces such as Flamenco, over 3,700 hours at the bench, alongside the Fine Jewellery collections."],
      ] },
      { type: "cta", h: "Visit the house", p: "See the pieces, and the stones they began as, in person.",
        actions: [["Our ateliers", "/offices/"], ["Book a private viewing", "/appointment/", true]] },
    ],
  },

  careers: {
    title: "Careers", kicker: "The House",
    description: "Careers at Gem Experience: cutting, setting, design and client care at a coloured-gemstone jewellery house with ateliers in Arusha, Dubai and Jaipur.",
    lede: "We are always glad to hear from people who want to work with coloured stones.",
    blocks: [
      { type: "split", img: "/world-of-preciousness/img/sorting.webp", alt: "A gem sorter grading parcels of coloured stones at a light table.",
        h: "Work with us", p: [
          "From sorting and cutting stones to setting, design and looking after our clients, the house's work runs from Tanzania to our ateliers in Arusha, Dubai and Jaipur.",
          "Send your CV and a few lines about the work you do, and where you would like to work, to [contact@gem-experience.com](mailto:contact@gem-experience.com).",
        ] },
      { type: "cta", h: "Apply", p: "Write to us with your CV.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"]] },
    ],
  },

  "size-guide": {
    title: "Size guide", kicker: "Client care",
    description: "Find your ring and bracelet size: how to measure at home, ring size conversions (UK, US, EU, India) and bangle sizes, from Gem Experience.",
    lede: "How to find your ring and bracelet size at home. If you are between sizes, an adviser will help you choose.",
    blocks: [
      { type: "steps", id: "rings", h: "Ring size", items: [
        ["Measure a ring you own", "Measure the inside diameter of a ring that fits the finger you want, in millimetres, and find it in the table."],
        ["Or measure your finger", "Wrap a strip of paper around the base of the finger, mark where it meets, and measure the length in millimetres. That is the circumference."],
        ["Measure at the end of the day", "Fingers are largest in the evening and when warm. If your knuckle is wider than the base of the finger, measure both and choose a size between them."],
      ] },
      { type: "table", head: ["Diameter (mm)", "Circumference (mm)", "UK", "US", "EU", "India"], rows: [
        ["14.9", "46.8", "H", "4", "47", "7"], ["15.3", "48.0", "I", "4½", "48", "8"], ["15.7", "49.3", "J½", "5", "49", "9"],
        ["16.1", "50.6", "K½", "5½", "51", "10"], ["16.5", "51.9", "L½", "6", "52", "12"], ["16.9", "53.1", "M½", "6½", "53", "13"],
        ["17.3", "54.4", "N½", "7", "54", "14"], ["17.7", "55.7", "O½", "7½", "56", "15"], ["18.1", "57.0", "P½", "8", "57", "16"],
        ["18.5", "58.3", "Q½", "8½", "58", "18"], ["19.0", "59.5", "R½", "9", "60", "19"], ["19.4", "60.8", "S½", "9½", "61", "20"],
        ["19.8", "62.1", "T½", "10", "62", "22"],
      ], note: "Conversions can differ slightly between countries. We confirm your size before a ring is made or altered." },
      { type: "steps", id: "bracelets", h: "Bracelet size", items: [
        ["Chain and tennis bracelets", "Measure around the wrist bone with a soft tape or a strip of paper. Add about 1.5 cm for a close fit, or 2 cm for a looser one."],
        ["Bangles", "Bring your thumb and little finger together and measure around the widest part of the hand, over the knuckles. A bangle has to pass over this."],
      ] },
      { type: "table", head: ["Bangle size", "Inside diameter (mm)", "Inside diameter (in)"], rows: [
        ["2.2", "54.0", "2 2⁄16"], ["2.4", "57.2", "2 4⁄16"], ["2.6", "60.3", "2 6⁄16"], ["2.8", "63.5", "2 8⁄16"], ["2.10", "66.7", "2 10⁄16"],
      ], note: "Indian bangle sizes give the inside diameter in sixteenths of an inch: 2.4 is 2 and 4⁄16 inches." },
      { type: "cta", h: "Not sure of your size?", p: "An adviser can help you find it, and High Jewellery is always made to measure.",
        actions: [["Speak to an adviser", "/contact/"], ["Book a private viewing", "/appointment/", true]] },
    ],
  },
};

function block(b) {
  switch (b.type) {
    case "split":
      return `    <section class="hp-split${b.flip ? " hp-split--flip" : ""}">
      <figure class="hp-split-img"><img src="${b.img}" alt="${esc(b.alt)}" loading="lazy" decoding="async"></figure>
      <div class="hp-split-copy">
        <h2 class="pg-section-title">${esc(b.h)}</h2>
        ${b.p.map((x) => `<p>${rich(x)}</p>`).join("\n        ")}
      </div>
    </section>`;
    case "text":
      return `    <section class="hp-text">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      ${b.p.map((x) => `<p>${rich(x)}</p>`).join("\n      ")}
    </section>`;
    case "figures":
      return `    <section class="hp-figures">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <p class="pg-lede">${esc(b.p)}</p>
      <ul>
        ${b.items.map(([n, u, name]) => `<li><span class="hp-fig-n">${esc(n)}</span><span class="hp-fig-u">${esc(u)}</span><span class="hp-fig-name">${esc(name)}</span></li>`).join("\n        ")}
      </ul>
    </section>`;
    case "steps":
      return `    <section class="hp-steps" id="${b.id}">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <ol>
        ${b.items.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${rich(p)}</p></li>`).join("\n        ")}
      </ol>
    </section>`;
    case "table":
      return `    <section class="hp-table">
      <div class="hp-table-scroll"><table>
        <thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n          ")}
        </tbody>
      </table></div>
      ${b.note ? `<p class="pg-note">${esc(b.note)}</p>` : ""}
    </section>`;
    case "timeline":
      return `    <section class="hp-timeline">
      <ol>
        ${b.items.map(([when, h, p]) => `<li><span class="hp-when">${esc(when)}</span><h2>${esc(h)}</h2><p>${rich(p)}</p></li>`).join("\n        ")}
      </ol>
    </section>`;
    case "icons": {
      // each piece: two photographs and its description, sides alternating
      const shot = (i, n) => {
        const model = (i.model || []).includes(n);
        const src = `/icons/img/${i.slug}-${n}`;
        return `<figure class="hp-gi-shot${model ? " hp-gi-shot--model" : ""}">
            <img src="${src}.webp" srcset="${src}.w640.webp 640w, ${src}.webp 1200w" sizes="(min-width: 900px) 25vw, 50vw" alt="${esc(i.title)}${model ? ", worn" : ""}." loading="lazy" decoding="async">
          </figure>`;
      };
      const piece = (i) => {
        const enquire = `/quotation/?${i.ref ? `ref=${encodeURIComponent(i.ref)}&amp;` : ""}name=${encodeURIComponent("GE Icons · " + i.title + " (" + i.facts + ")")}`;
        return `<article class="hp-gi" id="${i.slug}">
        <div class="hp-gi-media">
          ${shot(i, 1)}
          ${shot(i, 2)}
        </div>
        <div class="hp-gi-copy">
          <p class="hp-gi-kind">${esc(i.kind)}</p>
          <h2 class="hp-gi-title">${esc(i.title)}</h2>
          <p class="hp-gi-facts">${esc(i.facts)}</p>
          ${i.spec ? `<p class="hp-gi-spec">${i.ref ? `${esc(i.ref)} · ` : ""}${esc(i.spec)}</p>` : ""}
          ${i.p.map((t) => `<p>${esc(t)}</p>`).join("\n          ")}
          <div class="pg-actions">
            <a class="pg-btn" href="${enquire}">Request a quotation</a>
            <a class="pg-btn pg-btn--ghost" href="/appointment/">Book a private viewing</a>
          </div>
        </div>
      </article>`;
      };
      return `    <section class="hp-gis">
      ${ICONS.map(piece).join("\n      ")}
    </section>`;
    }
    case "cta":
      return `    <section class="hp-cta">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <p class="pg-note">${esc(b.p)}</p>
      <div class="pg-actions">
        ${b.actions.map(([l, h, ghost]) => `<a class="pg-btn${ghost ? " pg-btn--ghost" : ""}" href="${h}">${esc(l)}</a>`).join("\n        ")}
      </div>
    </section>`;
    default:
      throw new Error("unknown block " + b.type);
  }
}

function page(slug, p) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} — Gem Experience</title>
<meta name="description" content="${esc(p.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap"></noscript>
<link rel="stylesheet" href="/css/pages.css">
<link rel="stylesheet" href="/css/site-nav.css">
<link rel="stylesheet" href="/css/mini-cart.css">
<link rel="stylesheet" href="/css/gift-note.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/css/house.css?v=2">
</head>
<body class="pg">
<!-- Written by tools/build-house-pages.mjs; edit the content there, not here. -->
<div class="pg-wrap">
  <div id="pg-header"></div>
  <header class="pg-hero">
    <span class="pg-kicker">${esc(p.kicker)}</span>
    <h1 class="pg-title">${esc(p.title)}</h1>
    <p class="pg-lede">${esc(p.lede)}</p>
  </header>
  <main class="pg-main hp">
${p.blocks.map(block).join("\n\n")}
  </main>
  <div id="pg-footer"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"></script>
<script src="/js/config.js"></script>
<script src="/js/gem.js"></script>
<script src="/js/site-footer.js"></script>
<script src="/js/site-content.js"></script>
<script src="/js/site-nav.js"></script>
<script src="/js/mini-cart.js"></script>
<script src="/js/gift-note.js"></script>
<script src="/js/shell.js"></script>
<script>GemShell.mount({ prefix: "/" });</script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

for (const [slug, p] of Object.entries(PAGES)) {
  const file = path.join(WEB, slug, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // keep the head tags build-seo.mjs added on an earlier run
  let html = page(slug, p);
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, "utf8");
    const m = old.match(/<!-- seo -->[\s\S]*?<!-- \/seo -->\n/);
    if (m) html = html.replace("</head>", m[0] + "</head>");
  }
  fs.writeFileSync(file, html);
}
console.log(Object.keys(PAGES).length + " pages written: " + Object.keys(PAGES).map((s) => "/" + s + "/").join(" "));
