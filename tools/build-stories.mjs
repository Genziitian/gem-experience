/* Builds the High Jewellery story pages.
 *
 * Content comes from frontend/high-jewellery/stories.js, which holds the
 * house's own writing; photography comes from the `gallery` and `models` lists
 * already on each piece in data.js. This script marries the two and writes a
 * static page per piece.
 *
 * Generated rather than hand-written because the pages are the same ten bands
 * in the same order, and nine copies of that HTML would drift apart the first
 * time one of them was edited. Adding a piece is an entry in stories.js and a
 * re-run.
 *
 *   node tools/build-stories.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HJ = path.join(ROOT, "frontend/high-jewellery");

function readAssigned(file, global) {
  const t = fs.readFileSync(file, "utf8");
  const start = t.indexOf("{", t.indexOf(`window.${global}`));
  return JSON.parse(t.slice(start, t.lastIndexOf("}") + 1));
}

const data = readAssigned(path.join(HJ, "data.js"), "HJ_DATA");

/* stories.js is JavaScript rather than JSON — it uses string concatenation so
   the copy stays readable at a sane line length — so it is evaluated rather
   than parsed. It is our own file, not input. */
const storiesSrc = fs.readFileSync(path.join(HJ, "stories.js"), "utf8");
const window = {};
new Function("window", storiesSrc)(window);
const STORIES = window.HJ_STORIES;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const byId = Object.fromEntries(data.products.map((p) => [p.id, p]));

/* Hands out photographs in the order the page wants them and never twice, so a
   piece with fewer frames simply loses its optional bands instead of repeating
   a picture two screens apart.

   draw() is all or nothing: it takes the frames only when the whole band can be
   filled. Taking them first and discarding them when the band came up one short
   is how the opening photograph went missing from every piece shot without a
   model. The frame was spent on a section that was then never written, and the
   page opened on its second picture with its first nowhere on the site.

   A kind that has run out falls back to the other, so a piece photographed only
   on the stand still gets its pairs rather than a column of single frames. */
function dealer(piece) {
  const models = (piece.models || []).slice();
  const stills = (piece.gallery || []).slice();
  return {
    draw(kinds) {
      if (models.length + stills.length < kinds.length) return null;
      return kinds.map((k) => {
        const first = k === "model" ? models : stills;
        const other = k === "model" ? stills : models;
        return (first.length ? first : other).shift();
      });
    },
    modelsLeft: () => models.length,
    stillsLeft: () => stills.length,
    still: (n = 1) => stills.splice(0, n),
  };
}

function figure(src, alt, cls = "") {
  return `<figure${cls ? ` class="${cls}"` : ""}><img src="/high-jewellery/${src}" ` +
    `alt="${esc(alt)}" loading="lazy" decoding="async"></figure>`;
}

function build(id) {
  const piece = byId[id];
  const story = STORIES[id];
  if (!piece || !story) return null;

  const d = dealer(piece);
  const name = piece.name;
  const bands = [];

  bands.push(`  <header class="st-open">
    <span class="st-kicker">${esc(story.kicker || "High Jewellery")}</span>
    <h1 class="st-title">${esc(name)}</h1>
    <p class="st-lede">${esc(story.lede)}</p>
  </header>`);

  // the piece itself beside the piece worn
  const pairA = d.draw(["still", "model"]);
  if (pairA) {
    bands.push(`  <section class="st-pair">
    ${figure(pairA[0], `${name}, the piece itself.`)}
    ${figure(pairA[1], `${name} worn.`)}
  </section>`);
  }

  bands.push(`  <blockquote class="st-quote">
    <p>&ldquo;${esc(story.quote)}&rdquo;</p>
    <cite>Gem Experience, on ${esc(name)}</cite>
  </blockquote>`);

  const full = (d.draw(["model"]) || [])[0];
  if (full) {
    bands.push(`  <section class="st-full">
    <img src="/high-jewellery/${full}" alt="${esc(name)} worn." loading="lazy" decoding="async">
  </section>`);
  }

  /* A copy band with no photograph left to pair with it. Dropping the section
     outright lost the carat weights on every piece with only two frames, which
     is the opposite of the right trade: the words are the point, the picture
     beside them is the luxury. */
  function textBand(block) {
    return `  <section class="st-text">
    <h2>${esc(block.h)}</h2>
    ${block.p.map((x) => `<p>${esc(x)}</p>`).join("\n    ")}
  </section>`;
  }

  // the making: two frames and the hours
  const craftImgs = d.draw(["model", "still"]);
  if (story.craft && craftImgs) {
    bands.push(`  <section class="st-craft">
    ${figure(craftImgs[0], `${name} worn.`, "st-craft-a")}
    ${figure(craftImgs[1], `${name}, in detail.`, "st-craft-b")}
    <div class="st-craft-copy">
      <h2>${esc(story.craft.h)}</h2>
      ${story.craft.p.map((x) => `<p>${esc(x)}</p>`).join("\n      ")}
    </div>
  </section>`);
  } else if (story.craft) {
    bands.push(textBand(story.craft));
  }

  // the stones: copy beside a still
  const stoneImg = (d.draw(["still"]) || [])[0];
  if (story.stones && stoneImg) {
    bands.push(`  <section class="st-split">
    <div class="st-split-copy">
      <h2>${esc(story.stones.h)}</h2>
      ${story.stones.p.map((x) => `<p>${esc(x)}</p>`).join("\n      ")}
    </div>
    ${figure(stoneImg, `${name}, showing the stones.`)}
  </section>`);
  } else if (story.stones) {
    bands.push(textBand(story.stones));
  }

  // the suite, only where there are three stills to spare for it
  if (story.suite && d.stillsLeft() >= 3) {
    const three = d.still(3);
    const labels = story.suite.labels || [];
    bands.push(`  <section class="st-suite">
    <h2>The suite</h2>
    <p class="st-suite-note">${esc(story.suite.note)}</p>
    <div class="st-suite-grid">
      ${three.map((src, i) => `<figure>
        <img src="/high-jewellery/${src}" alt="${esc(labels[i] || name)}" loading="lazy" decoding="async">
        <figcaption>${esc(labels[i] || "")}</figcaption>
      </figure>`).join("\n      ")}
    </div>
  </section>`);
  }

  // worn, at the scale the pieces are actually seen
  const pairB = d.draw(["model", "model"]);
  if (pairB) {
    bands.push(`  <section class="st-pair st-pair--tall">
    ${figure(pairB[0], `${name} worn.`)}
    ${figure(pairB[1], `${name} worn.`)}
  </section>`);
  }

  if (story.say) {
    bands.push(`  <section class="st-say">
    <h2>In the room</h2>
    <p>${esc(story.say)}</p>
    <div class="st-say-acts">
      <a class="pg-btn" href="/high-jewellery/#/product/${id}">See the piece</a>
      <a class="pg-btn pg-btn--ghost" href="/appointment/">Book a private viewing</a>
    </div>
  </section>`);
  }

  /* Four other pieces that also have a story page, so nothing links to a page
     that was never built. */
  const others = Object.keys(STORIES)
    .filter((k) => k !== id && byId[k] && !STORIES[k].draft)
    .slice(0, 4);
  bands.push(`  <section class="st-more">
    <h2>Explore High Jewellery</h2>
    <div class="st-more-grid">
      ${others.map((k) => {
        const o = byId[k];
        const img = (o.models || [])[0] || (o.gallery || [])[0];
        return `<a href="/high-jewellery/${k}/">
        <img src="/high-jewellery/${img}" alt="" loading="lazy" decoding="async">
        <span>${esc(o.name)}</span>
      </a>`;
      }).join("\n      ")}
    </div>
  </section>`);

  bands.push(`  <nav class="st-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>
    <a href="/high-jewellery/">High Jewellery</a><span>/</span>
    <span aria-current="page">${esc(name)}</span>
  </nav>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} &middot; High Jewellery &middot; Gem Experience</title>
<meta name="description" content="${esc(story.lede.slice(0, 155))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- Paths are absolute from the site root. This page sits two directories deep,
     so a relative one only resolves when the URL carries a trailing slash, and
     /high-jewellery/${id} is served without one. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="/css/pages.css">
<link rel="stylesheet" href="/css/site-nav.css">
<link rel="stylesheet" href="/css/mini-cart.css">
<link rel="stylesheet" href="/css/gift-note.css">
<link rel="stylesheet" href="/high-jewellery/story.css">
</head>
<body class="pg st-body">
<!-- Generated by tools/build-stories.mjs from high-jewellery/stories.js.
     Edit the content there and re-run; changes made here are overwritten. -->
<div class="pg-wrap">
  <div id="pg-header"></div>

${bands.join("\n\n")}

  <div id="pg-footer"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/js/config.js"></script>
<script src="/js/gem.js"></script>
<script src="/js/site-content.js"></script>
<script src="/js/site-footer.js"></script>
<script src="/js/mini-cart.js"></script>
<script src="/js/gift-note.js"></script>
<script src="/js/site-nav.js"></script>
<script src="/js/shell.js"></script>
<script>GemShell.mount({ prefix: "/" });</script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

/* An index of every story, so a piece with none of its own still has somewhere
   real to send a reader rather than a dead link or no link at all. */
function buildIndex(ids) {
  const cards = ids.map((id) => {
    const p = byId[id];
    const img = (p.models || [])[0] || (p.gallery || [])[0];
    const st = STORIES[id];
    return `      <a class="sx-card" href="/high-jewellery/${id}/">
        <img src="/high-jewellery/${img}" alt="" loading="lazy" decoding="async">
        <span class="sx-name">${esc(p.name)}</span>
        <span class="sx-line">${esc(st.quote)}</span>
      </a>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stories &middot; High Jewellery &middot; Gem Experience</title>
<meta name="description" content="How each High Jewellery piece came to be, in the house's own words.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="/css/pages.css">
<link rel="stylesheet" href="/css/site-nav.css">
<link rel="stylesheet" href="/css/mini-cart.css">
<link rel="stylesheet" href="/css/gift-note.css">
<link rel="stylesheet" href="/high-jewellery/story.css">
</head>
<body class="pg st-body">
<!-- Generated by tools/build-stories.mjs. -->
<div class="pg-wrap">
  <div id="pg-header"></div>

  <header class="st-open">
    <span class="st-kicker">High Jewellery</span>
    <h1 class="st-title">Stories</h1>
    <p class="st-lede">How each piece came to be: the stone it was built around, the
      hours it took, and what it is meant to say. In the house's own words.</p>
  </header>

  <section class="sx-grid">
${cards}
  </section>

  <nav class="st-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>
    <a href="/high-jewellery/">High Jewellery</a><span>/</span>
    <span aria-current="page">Stories</span>
  </nav>

  <div id="pg-footer"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/js/config.js"></script>
<script src="/js/gem.js"></script>
<script src="/js/site-content.js"></script>
<script src="/js/site-footer.js"></script>
<script src="/js/mini-cart.js"></script>
<script src="/js/gift-note.js"></script>
<script src="/js/site-nav.js"></script>
<script src="/js/shell.js"></script>
<script>GemShell.mount({ prefix: "/" });</script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

/* A draft is not published. Two pieces are still waiting on their copy, and a
   page of placeholder prose under the house's name is worse than saying it is
   coming. The grid says so instead, and the page is not written at all. */
const publish = Object.keys(STORIES).filter((id) => byId[id] && !STORIES[id].draft);
const drafts = Object.keys(STORIES).filter((id) => byId[id] && STORIES[id].draft);

let made = 0;
for (const id of publish) {
  const html = build(id);
  if (!html) { console.log(`skipped ${id}: no piece or no story`); continue; }
  const dir = path.join(HJ, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  const p = byId[id];
  console.log(`${id.padEnd(14)} ${String((p.gallery || []).length).padStart(2)} stills, ` +
              `${String((p.models || []).length).padStart(2)} models -> ` +
              `${(html.match(/<section|<header class="st-open"|<blockquote/g) || []).length} bands`);
  made++;
}
const built = publish;
fs.mkdirSync(path.join(HJ, "stories"), { recursive: true });
fs.writeFileSync(path.join(HJ, "stories/index.html"), buildIndex(built));

/* Remove a page that was published before its entry became a draft, so the
   directory never holds a story the site no longer links to. */
for (const id of drafts) {
  const stale = path.join(HJ, id, "index.html");
  if (fs.existsSync(stale)) { fs.rmSync(path.join(HJ, id), { recursive: true }); console.log(`removed stale page for ${id} (draft)`); }
}

/* The name as it goes on a button. A piece is known by its name, not by the
   noun after it, so the generic word is dropped: "Tsavorite necklace" is a
   necklace everywhere else on the page already. Names that are genuinely two
   words, like Jardin Bleu or Dew Fall, are left whole, because half of a name
   is not a shorter name, it is the wrong one. */
function shortName(name) {
  return name.replace(/\s+(necklace|bracelet|earrings|ring|suite|set)$/i, "");
}

/* The catalogue is written from here rather than by hand, so the link on a
   card and the page that exists cannot fall out of step. */
const dataPath = path.join(HJ, "data.js");
const raw = fs.readFileSync(dataPath, "utf8");
const head = raw.slice(0, raw.indexOf("{"));
const cat = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
for (const p of cat.products) {
  if (publish.includes(p.id)) {
    p.storyUrl = `/high-jewellery/${p.id}/`;
    p.storyLabel = `Explore ${shortName(p.name)}`;
  } else {
    delete p.storyUrl;
    delete p.storyLabel;
  }
}
fs.writeFileSync(dataPath, head + JSON.stringify(cat, null, 2) + ";\n");
console.log(`\n${made} story pages written, plus the index at /high-jewellery/stories/`);

/* Every piece points somewhere: its own story where there is one, the index
   where there is not, so no product page is left without the link. */
console.log(`${built.length} pieces link to a story; ${drafts.length} show "Story coming soon": ${drafts.join(", ")}`);
