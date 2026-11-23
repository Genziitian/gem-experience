#!/usr/bin/env node
/* Search and answer-engine readiness for the whole storefront.
 *
 *   node tools/build-seo.mjs
 *
 * Run it after anything that changes pages or the catalog (data.js, stories,
 * FAQs or offices in the admin) and before deploying. It is idempotent: every
 * write lands between markers it owns, so a re-run replaces rather than stacks.
 *
 * What it does, and why:
 *
 *  1. Every public page gets one <!-- seo --> block in <head>: canonical URL,
 *     robots directive, Open Graph / Twitter cards and JSON-LD (the house as an
 *     Organization with its offices, the WebSite, a BreadcrumbList and a node
 *     for what the page actually is — Product, Article, FAQPage…).
 *
 *  2. The shop pages draw everything in JavaScript, and most AI crawlers
 *     (GPTBot, ClaudeBot, PerplexityBot…) do not run it, so to them High and
 *     Fine Jewellery were a seven-word page. The same content is now written
 *     into the HTML as well; the scripts replace it on load exactly as before.
 *
 *  3. Fine Jewellery products only had #/p/<id> addresses, and nothing after a
 *     # is ever sent to a server, so no product could be indexed. Each one now
 *     has a real page at /fine-jewellery/p/<id>/: the shop itself, opened on
 *     that product (window.FJ_ROUTE), with the product in the HTML for crawlers.
 *
 *  4. robots.txt (AI crawlers named and welcome), sitemap.xml and llms.txt.
 *
 * FAQs and offices are read from Supabase with the public anon key, since that
 * is where staff edit them. If Supabase cannot be reached the build stops
 * rather than ship pages with those sections silently missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "frontend");
const ORIGIN = "https://gem-experience.com";
const SITE = "Gem Experience";
const EMAIL = "contact@gem-experience.com";
const DEFAULT_IMAGE = "/img/home-hero-wide.webp";

const ORG_DESCRIPTION =
  "Gem Experience is a coloured-gemstone jewellery house. Tanzanite and other stones " +
  "of the East African belt are chosen at the source in Tanzania, cut in the house's " +
  "own workshop and finished by hand as Fine Jewellery and one-of-a-kind High Jewellery, " +
  "with ateliers in the UAE (Dubai), India (Jaipur) and Tanzania (Arusha).";
/* The house's own history, as the Timeline page tells it. */
const FOUNDED = "1998";
const LOGO = "/apple-touch-icon.png";

/* Pages search engines should not list. Still crawlable (so the noindex is
   seen); robots.txt keeps the purely private ones out altogether. */
const NOINDEX = new Set(["/account/", "/cart/", "/checkout/", "/login/", "/search/", "/404.html"]);
/* Not ours to annotate: the blog post template writes its own tags per post,
   the probe is a deploy check, the admin is a separate app. */
const SKIP = new Set(["/blog/post/", "/__probe.html", "/wishlist/"]);

const SECTION_NAMES = {
  "high-jewellery": "High Jewellery",
  "fine-jewellery": "Fine Jewellery",
  "world-of-preciousness": "The Collector’s Bench",
  "blog": "Journal",
  "stories": "Stories",
  "the-house": "The House",
  "lookbook": "Lookbook",
};

/* AI crawlers, named so the welcome is explicit rather than implied by `*`. */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "Amazonbot", "Meta-ExternalAgent",
  "MistralAI-User", "cohere-ai", "YouBot", "CCBot",
];

// ------------------------------------------------------------------ helpers

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const unesc = (s) => String(s ?? "")
  .replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ");
const abs = (p) => (/^https?:/.test(p) ? p : ORIGIN + (p.startsWith("/") ? p : "/" + p));
const clip = (s, n) => {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "") + "…";
};
/* JSON inside <script> must not be able to close the tag. */
const ldJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

function readAssigned(file, global) {
  const t = fs.readFileSync(file, "utf8");
  const start = t.indexOf("{", t.indexOf(`window.${global}`));
  return JSON.parse(t.slice(start, t.lastIndexOf("}") + 1));
}

function pagesUnder(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "admin" || e.name === "img" || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pagesUnder(full, base + e.name + "/"));
    else if (e.name.endsWith(".html")) out.push({ file: full, url: "/" + base + (e.name === "index.html" ? "" : e.name) });
  }
  return out;
}

/* Swap a marked region, or insert it the first time. */
function setBlock(html, name, body, insertBefore) {
  const begin = `<!-- ${name} -->`, end = `<!-- /${name} -->`;
  const block = `${begin}\n${body}\n${end}`;
  const i = html.indexOf(begin), j = html.indexOf(end);
  if (i !== -1 && j !== -1) return html.slice(0, i) + block + html.slice(j + end.length);
  const k = html.indexOf(insertBefore);
  if (k === -1) throw new Error(`no ${insertBefore} to insert ${name} before`);
  return html.slice(0, k) + block + "\n" + html.slice(k);
}

/* Fill an element that scripts redraw, e.g. <main id="view">, between markers. */
function setInner(html, openTag, closeTag, body) {
  const i = html.indexOf(openTag);
  if (i === -1) throw new Error(`no ${openTag}`);
  const from = i + openTag.length;
  /* After the first run the region is marked, and the markers win: pre-rendered
     markup may itself contain the closing tag (FAQ answers are full of </div>). */
  const endMark = "<!-- /seo:pre -->";
  const to = html.startsWith("<!-- seo:pre -->", from)
    ? html.indexOf(endMark, from) + endMark.length
    : html.indexOf(closeTag, from);
  return html.slice(0, from) + `<!-- seo:pre -->\n${body}\n<!-- /seo:pre -->` + html.slice(to);
}

const titleOf = (html) => unesc((html.match(/<title>([^<]*)<\/title>/) || [])[1] || SITE).trim();
const descOf = (html) => unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
const h1Of = (html) => {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return m ? unesc(m[1].replace(/<[^>]+>/g, "")).trim() : "";
};
/* "Rihla · High Jewellery · Gem Experience" → "Rihla · High Jewellery" */
const shortTitle = (t) => t.replace(/\s*[|·—–-]\s*Gem Experience\s*$/, "").replace(/^Gem Experience\s*[—–-]\s*/, "").trim() || SITE;

function firstImage(html, url) {
  const body = html.slice(html.indexOf("<body"));
  const m = body.match(/<img[^>]+src="([^"]+\.(?:webp|jpe?g|png))"/);
  if (!m) return DEFAULT_IMAGE;
  if (m[1].startsWith("/") || /^https?:/.test(m[1])) return m[1];
  const baseHref = (html.match(/<base href="([^"]+)"/) || [])[1];
  return new URL(m[1], ORIGIN + (baseHref || url)).pathname;
}

async function rest(q) {
  const cfg = fs.readFileSync(path.join(WEB, "js/config.js"), "utf8");
  const url = cfg.match(/supabaseUrl:\s*"([^"]+)"/)[1];
  const key = cfg.match(/supabaseAnonKey:\s*"([^"]+)"/)[1];
  const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase ${q.split("?")[0]}: ${res.status} ${await res.text()}`);
  return res.json();
}

// --------------------------------------------------------------------- data

const HJ = readAssigned(path.join(WEB, "high-jewellery/data.js"), "HJ_DATA");
const FJraw = readAssigned(path.join(WEB, "fine-jewellery/data.js"), "FJ_DATA");
/* Same rule as fine-jewellery/app.js: a product shows only once it has photos,
   and a collection only once it has a product. */
const fjProducts = FJraw.products.filter((p) => p.images && p.images.length && !p.hidden);
const fjLive = new Set(fjProducts.map((p) => p.collection));
const fjCollections = FJraw.collections.filter((c) => fjLive.has(c.name));

const hjHasPage = (id) => fs.existsSync(path.join(WEB, "high-jewellery", id, "index.html"));

const [faqCats, faqs, officeRows] = await Promise.all([
  rest("faq_categories?select=slug,label,intro,sort_order&order=sort_order.asc"),
  rest("faqs?select=category,question,answer,sort_order&published=eq.true&order=sort_order.asc"),
  rest("offices?select=*&published=eq.true&order=sort_order.asc"),
]);
/* The Tanzania stores were withdrawn from the site (2026-10-21); only the
   ateliers are listed, whatever the table still holds. */
const offices = officeRows.filter((o) => o.kind !== "store");
/* Events arrived later (migrations/20261013010000_events.sql); until that has
   run there is no table, and the page simply shows its WhatsApp invitation. */
const events = await rest("events?select=*&published=eq.true&order=starts_on.asc").catch((e) => {
  console.warn(`Events skipped: ${e.message.split("\n")[0]}`);
  return [];
});

// ------------------------------------------------------------- schema nodes

const ORG_ID = ORIGIN + "/#organization";
const SITE_ID = ORIGIN + "/#website";

function officeNode(o) {
  const node = {
    "@type": "JewelryStore",
    name: o.name,
    image: o.image ? abs(new URL(o.image, ORIGIN + "/offices/").pathname) : undefined,
    address: { "@type": "PostalAddress", streetAddress: o.address, addressCountry: o.region || "Tanzania" },
    telephone: o.tel || undefined,
    hasMap: o.map_query ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.map_query) : undefined,
  };
  return JSON.parse(JSON.stringify(node));
}

const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE,
  url: ORIGIN + "/",
  email: EMAIL,
  description: ORG_DESCRIPTION,
  image: abs(DEFAULT_IMAGE),
  logo: { "@type": "ImageObject", "@id": ORIGIN + "/#logo", url: abs(LOGO), width: 180, height: 180, caption: SITE },
  foundingDate: FOUNDED,
  slogan: "Nothing begins above ground",
  areaServed: ["United Arab Emirates", "India", "Tanzania", "Worldwide"],
  knowsAbout: ["Tanzanite", "Spinel", "Tsavorite", "Rhodolite garnet", "Malaya garnet",
    "Coloured gemstones", "Gemstone cutting", "Fine jewellery", "High jewellery"],
  // the house's own accounts, as linked from the footer
  sameAs: ["https://www.instagram.com/gemexperienceofficial/", "https://www.facebook.com/profile.php?id=100091311015543",
    "https://www.linkedin.com/company/gem-experience/", "https://www.youtube.com/@GemExperience-2024",
    "https://www.pinterest.com/Gem_Experience/", "https://x.com/gemexpofficial"],
  contactPoint: offices.filter((o) => o.tel).map((o) => ({
    "@type": "ContactPoint", contactType: "customer service",
    telephone: o.tel, areaServed: o.region || "TZ", email: EMAIL,
  })),
  location: offices.map(officeNode),
};

const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  url: ORIGIN + "/",
  name: SITE,
  publisher: { "@id": ORG_ID },
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: ORIGIN + "/search/?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};

function breadcrumbs(url, leaf) {
  const parts = url.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (!parts.length) return null;
  const items = [{ name: "Home", item: ORIGIN + "/" }];
  let acc = "/";
  parts.forEach((seg, i) => {
    acc += seg + "/";
    const last = i === parts.length - 1;
    if (seg === "p" && !last) return; // /fine-jewellery/p/ is not a page
    items.push({ name: last ? leaf : SECTION_NAMES[seg] || seg, item: ORIGIN + acc });
  });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, ...it })),
  };
}

function productNode({ url, name, description, images, sku, category, material, collection }) {
  return JSON.parse(JSON.stringify({
    "@type": "Product",
    "@id": ORIGIN + url + "#product",
    name, description,
    url: ORIGIN + url,
    image: images.map(abs),
    sku: sku || undefined,
    category,
    material: material || undefined,
    brand: { "@type": "Brand", name: SITE },
    manufacturer: { "@id": ORG_ID },
    additionalProperty: collection ? [{ "@type": "PropertyValue", name: "Collection", value: collection }] : undefined,
  }));
}

// ----------------------------------------------------------- head block

function headBlock({ url, html, ogType = "website", extra = [], image, title, description }) {
  title = title || shortTitle(titleOf(html));
  description = description || descOf(html) || ORG_DESCRIPTION;
  image = abs(image || firstImage(html, url));
  const noindex = NOINDEX.has(url);
  const pageType = extra.pageType || "WebPage";
  const nodes = [organization, website];
  const page = {
    "@type": pageType,
    "@id": ORIGIN + url + "#webpage",
    url: ORIGIN + url,
    name: title,
    description,
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    primaryImageOfPage: { "@type": "ImageObject", url: image },
    inLanguage: "en",
  };
  const crumbs = breadcrumbs(url, title.split(" · ")[0]);
  if (crumbs) { crumbs["@id"] = ORIGIN + url + "#breadcrumb"; page.breadcrumb = { "@id": crumbs["@id"] }; nodes.push(crumbs); }
  nodes.push(page);
  for (const n of extra.nodes || []) {
    if (n["@type"] === "Product" || n["@type"] === "Article") page.mainEntity = { "@id": n["@id"] };
    nodes.push(n);
  }

  return [
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    noindex ? "" : `<link rel="canonical" href="${ORIGIN + url}">`,
    `<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}">`,
    `<meta property="og:site_name" content="${SITE}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${ORIGIN + url}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<link rel="alternate" type="text/plain" title="LLM summary" href="${ORIGIN}/llms.txt">`,
    noindex ? "" : `<script type="application/ld+json">\n${ldJson({ "@context": "https://schema.org", "@graph": nodes })}\n</script>`,
  ].filter(Boolean).join("\n");
}

/* Brief, plain styling for the pre-rendered copy, which a visitor only sees
   for the moment before the page's script replaces it. */
const PRE_CSS = `<style>
.seo-pre{max-width:1100px;margin:0 auto;padding:48px 24px;font-family:Jost,system-ui,sans-serif;font-weight:300;color:#201e1d;line-height:1.6}
.seo-pre h1,.seo-pre h2{font-family:"EB Garamond",Georgia,serif;font-weight:400}
.seo-pre a{color:inherit}
.seo-pre img{max-width:100%;height:auto}
.seo-pre ul{padding-left:1.1em}
.seo-pre dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px}
.seo-pre dt{font-weight:500}
</style>`;

// ------------------------------------------------- pre-rendered page bodies

function fjProductUrl(p) { return `/fine-jewellery/p/${p.id}/`; }
function fjImg(src) { return /^https?:/.test(src) ? src : "/fine-jewellery/" + src.replace(/^\/+/, ""); }
function hjImg(src) { return /^https?:/.test(src) ? src : "/high-jewellery/" + src.replace(/^\/+/, ""); }

function fjSpecs(p) {
  const rows = [
    ["Collection", p.collection],
    ["Category", p.type],
    ["Metal", p.metal],
    ["Gemstone", p.stone && [p.stone, p.shape && p.shape.toLowerCase() + " cut"].filter(Boolean).join(", ")],
    ["Gemstone weight", p.stoneCt && `${p.stoneCt} ct${p.stonePcs > 1 ? ` (${p.stonePcs} stones)` : ""}`],
    ["Diamond weight", p.diamondCt && `${p.diamondCt} ct`],
    ["Gross weight", p.grossG && `${p.grossG} g`],
    ["Reference", p.sku],
  ].filter((r) => r[1]);
  return rows;
}

function fjDescription(p) {
  const col = fjCollections.find((c) => c.name === p.collection);
  return p.story || [p.name, col && col.lede].filter(Boolean).join(". ");
}

function fjProductPre(p) {
  const col = fjCollections.find((c) => c.name === p.collection);
  const specs = fjSpecs(p);
  return `<article class="seo-pre">
<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/fine-jewellery/">Fine Jewellery</a>${col ? ` / <a href="/fine-jewellery/#/${esc(col.id)}">${esc(col.name)}</a>` : ""}</nav>
<h1>${esc(p.name)}</h1>
${p.subtitle ? `<p>${esc(p.subtitle)}</p>\n` : ""}<p>${esc(fjDescription(p))}</p>
<img src="${esc(fjImg(p.images[0]))}" srcset="${esc(fjImg(p.images[0]).replace(/\.webp$/, ".w640.webp"))} 640w, ${esc(fjImg(p.images[0]))} 1400w" sizes="(max-width: 900px) 100vw, 560px" alt="${esc([p.name, p.subtitle].filter(Boolean).join(", "))}" width="800" height="800">
<dl>${specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
<p>Price on request. Made to order from Gem Experience.</p>
<p><a href="/quotation/?ref=${encodeURIComponent(p.sku || p.id)}&amp;name=${encodeURIComponent(p.name)}">Request a quotation</a> · <a href="/contact/">Contact an adviser</a></p>
${col ? `<h2>The ${esc(col.name)} collection</h2>\n<p>${esc(col.lede || "")}</p>` : ""}
</article>`;
}

function fjIndexPre() {
  return `<div class="seo-pre">
<h1>Fine Jewellery</h1>
<p>Coloured gemstone Fine Jewellery from Gem Experience: tanzanite, spinel, garnet, aquamarine and more, set in gold with diamonds. ${fjProducts.length} pieces across ${fjCollections.length} collections, each made to order with prices given on request.</p>
${fjCollections.map((c) => {
  const items = fjProducts.filter((p) => p.collection === c.name);
  return `<section>
<h2>${esc(c.name)}</h2>
${c.lede ? `<p>${esc(c.lede)}</p>` : ""}
${c.story ? c.story.split(/\n\n+/).map((para) => `<p>${esc(para)}</p>`).join("\n") : ""}
<ul>
${items.map((p) => `<li><a href="${fjProductUrl(p)}">${esc(p.name)}</a>${p.subtitle ? `, ${esc(p.subtitle)}` : ""}${p.sku ? ` (${esc(p.sku)})` : ""}</li>`).join("\n")}
</ul>
</section>`;
}).join("\n")}
</div>`;
}

function hjIndexPre() {
  const byCol = HJ.collections.map((c) => ({ c, items: HJ.products.filter((p) => p.collection === c.name) }))
    .filter((g) => g.items.length);
  return `<div class="seo-pre">
<h1>High Jewellery</h1>
<p>One-of-a-kind High Jewellery from Gem Experience. Each piece begins with a single stone, most often tanzanite, followed from the mine in Tanzania to the bench where it is set. Pieces are quoted privately on request.</p>
${byCol.map(({ c, items }) => `<section>
<h2>${esc(c.name)}</h2>
<ul>
${items.map((p) => {
  const label = `${esc(p.name)}: ${esc(p.materials)}${p.type ? ` (${esc(p.type)})` : ""}`;
  return hjHasPage(p.id) ? `<li><a href="/high-jewellery/${p.id}/">${label}</a></li>` : `<li>${label}</li>`;
}).join("\n")}
</ul>
</section>`).join("\n")}
<p><a href="/high-jewellery/stories/">The stories behind each piece</a> · <a href="/quotation/">Request a quotation</a> · <a href="/appointment/">Book a private viewing</a></p>
</div>`;
}

const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n{2,}/g, "</p><p>");
const mdText = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function faqGroups() {
  return faqCats.map((c) => ({ ...c, items: faqs.filter((f) => f.category === c.slug) }))
    .filter((c) => c.items.length);
}

/* Mirrors the markup faqs/index.html draws, so the swap on load is invisible. */
function faqPre() {
  return faqGroups().map((c) => `<section class="faq-group" id="${esc(c.slug)}" aria-labelledby="faq-h-${esc(c.slug)}">
<div class="faq-group-head"><h2 class="pg-section-title" id="faq-h-${esc(c.slug)}">${esc(c.label)}</h2>${c.intro ? `<p class="faq-group-lede">${esc(c.intro)}</p>` : ""}</div>
<div class="faq-list">${c.items.map((f) => `<details class="faq-item"><summary class="faq-q"><span>${esc(f.question)}</span></summary><div class="faq-a"><p>${md(f.answer)}</p></div></details>`).join("")}</div>
</section>`).join("\n");
}

function faqLd() {
  return `<script type="application/ld+json" id="faq-ld">\n${ldJson({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: mdText(f.answer) } })),
  })}\n</script>`;
}

/* Same card as offices/index.html draws. */
function officeCard(o) {
  const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.map_query || o.name);
  return `<article class="off-card"><div class="off-shot">${o.image ? `<img src="${esc(o.image)}" alt="${esc(o.name)}" loading="lazy" decoding="async">` : ""}<span class="off-region">${esc(o.region || "Tanzania")}</span></div><div class="off-body"><h3>${esc(o.name)}</h3><p class="off-addr">${esc(o.address)}</p><div class="off-foot">${o.phone ? `<a class="off-phone" href="tel:${esc(o.tel)}">${esc(o.phone)}</a>` : ""}<a class="off-dir" href="${esc(maps)}" target="_blank" rel="noopener noreferrer" aria-label="Directions to ${esc(o.name)}"><span>Direction</span></a></div></div></article>`;
}

/* Same card and wording as events/index.html draws. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const ymd = (d) => { const [y, m, day] = d.split("-").map(Number); return { y, m: m - 1, d: day }; };
function eventWhen(e) {
  const a = ymd(e.starts_on);
  if (!e.ends_on || e.ends_on === e.starts_on) return `${a.d} ${MONTHS[a.m]} ${a.y}`;
  const b = ymd(e.ends_on);
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
  return `${a.d} ${MONTHS[a.m]} ${a.y} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
}
const eventWhere = (e) => [e.venue, e.city, e.country].filter(Boolean).join(", ");
const WA_NUMBER = fs.readFileSync(path.join(WEB, "js/config.js"), "utf8").match(/uae:\s*"([^"]+)"/)[1].replace(/\D/g, "");
const eventWa = (e) => `https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(
  [`Hello Gem Experience, I would like details about *${e.title}*.`,
    eventWhen(e) + (eventWhere(e) ? `, ${eventWhere(e)}` : ""), "", `Sent from ${ORIGIN}/events/`].join("\n"));
const TODAY = new Date().toISOString().slice(0, 10);
const upcomingEvents = events.filter((e) => (e.ends_on || e.starts_on) >= TODAY);

function eventCard(e) {
  return `<article class="ev-card">${e.image ? `<div class="ev-shot"><img src="${esc(e.image)}" alt="${esc(e.title)}" loading="lazy" decoding="async"></div>` : ""}<div class="ev-body"><span class="ev-kind">${esc(e.kind || "Exhibition")}</span><h3 class="ev-title">${esc(e.title)}</h3><p class="ev-when"><time datetime="${esc(e.starts_on)}">${esc(eventWhen(e))}</time>${e.hours ? `<span class="ev-hours">${esc(e.hours)}</span>` : ""}</p>${eventWhere(e) ? `<p class="ev-where">${esc(eventWhere(e))}</p>` : ""}${e.address ? `<p class="ev-addr">${esc(e.address)}</p>` : ""}${(e.description || "").split(/\n{2,}/).filter(Boolean).map((p) => `<p class="ev-desc">${esc(p)}</p>`).join("")}<div class="ev-actions"><a class="pg-btn pg-btn--wa" href="${esc(eventWa(e))}" target="_blank" rel="noopener noreferrer"><span>WhatsApp for details</span></a></div></div></article>`;
}

function eventNode(e) {
  return JSON.parse(JSON.stringify({
    "@type": "ExhibitionEvent",
    "@id": `${ORIGIN}/events/#${e.id}`,
    name: e.title,
    description: e.description || `${e.kind || "Exhibition"} of Gem Experience jewellery.`,
    startDate: e.starts_on,
    endDate: e.ends_on || e.starts_on,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: e.image ? [abs(new URL(e.image, ORIGIN + "/events/").href.replace(ORIGIN, ""))] : [abs(DEFAULT_IMAGE)],
    location: {
      "@type": "Place",
      name: e.venue || e.city || "To be announced",
      address: { "@type": "PostalAddress", streetAddress: e.address || undefined, addressLocality: e.city || undefined, addressCountry: e.country || undefined },
    },
    organizer: { "@id": ORG_ID },
    url: ORIGIN + "/events/",
  }));
}

/* Text of an HTML fragment, tags and entities gone. */
const textOf = (h) => unesc(String(h).replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/* The gemstone guides are written as questions ("What is Tanzanite?"); each
   heading that asks one, with the copy under it, is the answer an assistant
   or a search snippet can quote. "Did you know?" is a heading, not a question. */
function questionsOf(html) {
  const body = html.slice(html.indexOf("<body"));
  const heads = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  const out = [];
  heads.forEach((m, i) => {
    const q = textOf(m[1]);
    if (!q.endsWith("?") || /^did you know/i.test(q)) return;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.indexOf("</main>") > 0 ? body.indexOf("</main>") : body.length;
    /* the paragraphs only: diagrams, captions and buttons in the section are
       labels ("LIGHT IN LIGHT OUT", "Watch the film"), not sentences */
    const paras = [...body.slice(m.index + m[0].length, end).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
      .map((p) => textOf(p[1])).filter((t) => t.length >= 50 && /[.!?…]$/.test(t));
    const a = clip(paras.join(" "), 600);
    if (a.length > 40) out.push([q, a]);
  });
  return out;
}

/* GE Icons, read from the page build-house-pages.mjs writes. */
function iconsOf(html) {
  return [...html.matchAll(/<article class="hp-gi" id="([^"]+)">([\s\S]*?)<\/article>/g)].map(([, id, a]) => {
    const pick = (cls) => textOf((a.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)</(?:p|h2|dl)>`)) || [])[1] || "");
    const copy = a.slice(a.indexOf('class="hp-gi-copy"'));
    const paras = [...copy.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    const ref = (a.match(/<dt>Ref[^<]*<\/dt>\s*<dd>([^<]+)<\/dd>/) || [])[1];
    return {
      id, name: pick("hp-gi-title"), kind: pick("hp-gi-kind") || "Jewellery", facts: pick("hp-gi-facts"),
      description: clip(paras.join(" ") || pick("hp-gi-facts"), 500), ref: ref ? unesc(ref).trim() : null,
      images: [...a.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]),
    };
  }).filter((x) => x.name);
}

// ------------------------------------------------------------------- build

const written = [];
/* Up to ten photographs a page shows, for the image sitemap: jewellery is
   searched for by picture as much as by name. */
function pageImages(html, url) {
  const body = html.slice(html.indexOf("<body"));
  const baseHref = (html.match(/<base href="([^"]+)"/) || [])[1];
  const seen = new Set();
  for (const m of body.matchAll(/<img\b[^>]*\bsrc="([^"]+\.(?:webp|jpe?g|png))"/g)) {
    const src = /^https?:/.test(m[1]) ? m[1] : new URL(m[1], ORIGIN + (baseHref || url)).pathname;
    if (!/\.w\d+\./.test(src)) seen.add(src);
    if (seen.size >= 10) break;
  }
  return [...seen];
}
const sitemap = [];
const lastmod = (file) => fs.statSync(file).mtime.toISOString().slice(0, 10);

function write(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (before !== html) { fs.writeFileSync(file, html); written.push(path.relative(ROOT, file)); }
}

/* Per-page extras: what the page is, plus any content to pre-render. */
function extrasFor(url, html) {
  const seg = url.split("/").filter(Boolean);

  if (url === "/high-jewellery/") {
    return {
      pageType: "CollectionPage",
      nodes: [{
        "@type": "ItemList", "@id": ORIGIN + url + "#items", name: "High Jewellery",
        itemListElement: HJ.products.filter((p) => hjHasPage(p.id)).map((p, i) => ({
          "@type": "ListItem", position: i + 1, url: ORIGIN + `/high-jewellery/${p.id}/`, name: p.name })),
      }],
      pre: ["<main id=\"view\">", "</main>", hjIndexPre()],
      image: hjImg(HJ.products[0].gallery[0]),
    };
  }

  if (seg[0] === "high-jewellery" && seg.length === 2 && seg[1] !== "stories") {
    const p = HJ.products.find((x) => x.id === seg[1]);
    if (!p) return {};
    const images = [...(p.gallery || []), ...(p.models || [])].map(hjImg);
    const desc = descOf(html);
    return {
      pageType: "ItemPage", ogType: "product", image: images[0],
      nodes: [productNode({
        url, name: p.name, description: `${p.name}: ${p.materials}. ${desc}`.trim(),
        images, sku: p.ref && p.ref !== "—" ? p.ref : null, category: `High Jewellery > ${p.type}`,
        material: p.materials, collection: p.collection,
      })],
    };
  }

  if (url === "/fine-jewellery/") {
    return {
      pageType: "CollectionPage",
      nodes: [{
        "@type": "ItemList", "@id": ORIGIN + url + "#items", name: "Fine Jewellery",
        numberOfItems: fjProducts.length,
        itemListElement: fjProducts.map((p, i) => ({
          "@type": "ListItem", position: i + 1, url: ORIGIN + fjProductUrl(p), name: p.name })),
      }],
      pre: ["<main id=\"view\">", "</main>", fjIndexPre()],
      image: fjImg(fjProducts[0].images[0]),
      /* The first collection's banner is the largest thing on the page, but the
         browser only learns of it once app.js has drawn the grid. */
      preload: fjCollections[0] && fjCollections[0].banner ? (() => {
        const b = fjImg(fjCollections[0].banner);
        return `<link rel="preload" as="image" href="${b.replace(/\.webp$/, ".w900.webp")}" imagesrcset="${b.replace(/\.webp$/, ".w900.webp")} 900w, ${b} 1800w" imagesizes="(max-width: 700px) 50vw, 33vw" fetchpriority="high">`;
      })() : "",
    };
  }

  if (seg[0] === "world-of-preciousness" && seg.length === 2) {
    const head = h1Of(html) || shortTitle(titleOf(html));
    const qa = questionsOf(html);
    return {
      pageType: "WebPage",
      nodes: [...(qa.length ? [{
        "@type": "FAQPage", "@id": ORIGIN + url + "#faq",
        mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      }] : []), {
        "@type": "Article", "@id": ORIGIN + url + "#article",
        headline: head, description: descOf(html),
        image: abs(firstImage(html, url)),
        author: { "@id": ORG_ID }, publisher: { "@id": ORG_ID },
        mainEntityOfPage: ORIGIN + url, about: { "@type": "Thing", name: head },
        dateModified: lastmod(path.join(WEB, url, "index.html")),
      }],
    };
  }

  if (url === "/icons/") {
    const items = iconsOf(html);
    return {
      pageType: "CollectionPage",
      nodes: [{
        "@type": "ItemList", "@id": ORIGIN + url + "#items", name: "GE Icons", numberOfItems: items.length,
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1,
          item: productNode({ url: url + "#" + it.id, name: it.name, description: it.description,
            images: it.images, sku: it.ref, category: `GE Icons > ${it.kind}`, material: it.facts }) })),
      }],
    };
  }

  if (url === "/faqs/") return { faq: true, pre: ['<div id="faq-groups">', "</div>", faqPre()] };
  if (url === "/events/") {
    return {
      pageType: "CollectionPage",
      nodes: upcomingEvents.map(eventNode),
      /* Always written, even empty, so an event taken down does not linger in
         the HTML; an empty list makes the page show its WhatsApp invitation. */
      pre: ['<div class="ev-list" id="events-upcoming">', "</div>\n", upcomingEvents.map(eventCard).join("")],
    };
  }
  if (url === "/contact/") return { pageType: "ContactPage" };
  if (url === "/offices/") return { pageType: "AboutPage", offices: true };
  if (["/world-of-preciousness/", "/high-jewellery/stories/", "/gifts/", "/blog/"].includes(url)) return { pageType: "CollectionPage" };
  return {};
}

const pages = pagesUnder(WEB).filter((p) => !SKIP.has(p.url) && !p.url.startsWith("/fine-jewellery/p/"));

for (const { file, url } of pages) {
  let html = fs.readFileSync(file, "utf8");
  const x = extrasFor(url, html);
  if (x.pre) html = setInner(html, x.pre[0], x.pre[1], x.pre[2]);
  if (x.offices) {
    html = setInner(html, '<div class="off-grid" id="atelier-grid">', "</div>\n", offices.filter((o) => o.kind === "atelier").map(officeCard).join(""));
  }
  const head = (x.preload ? x.preload + "\n" : "") + headBlock({ url, html, ogType: x.ogType, image: x.image, extra: x }) +
    (x.faq ? "\n" + faqLd() : "") + (x.pre ? "\n" + PRE_CSS : "");
  html = setBlock(html, "seo", head, "</head>");
  write(file, html);
  if (!NOINDEX.has(url)) sitemap.push({ loc: ORIGIN + url, lastmod: lastmod(file), images: pageImages(html, url) });
}

/* Fine Jewellery product pages: the shop's own page, opened on the product. */
const fjShell = fs.readFileSync(path.join(WEB, "fine-jewellery/index.html"), "utf8");
const fjDataDate = lastmod(path.join(WEB, "fine-jewellery/data.js"));
const fjIds = new Set();
for (const p of fjProducts) {
  const url = fjProductUrl(p);
  fjIds.add(p.id);
  const title = `${p.name} ${p.sku} | ${SITE}`;
  const description = clip(`${fjDescription(p)}. ${p.collection} collection by Gem Experience. Price on request.`.replace(/\.\./g, "."), 160);
  let html = fjShell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`);
  html = setInner(html, '<main id="view">', "</main>", fjProductPre(p));
  html = html.replace(/<script src="\/?(?:fine-jewellery\/)?app\.js[^"]*"><\/script>/,
    (s) => `<script>window.FJ_ROUTE = "#/p/${p.id}";</script>\n${s}`);
  if (!html.includes("window.FJ_ROUTE")) throw new Error("could not find the app.js tag in fine-jewellery/index.html");
  const images = p.images.map(fjImg);
  const head = headBlock({
    url, html, ogType: "product", title: `${p.name} ${p.sku}`, description, image: images[0],
    extra: { pageType: "ItemPage", nodes: [productNode({
      url, name: [p.name, p.subtitle].filter(Boolean).join(", "), description: fjDescription(p), images, sku: p.sku,
      category: `Fine Jewellery > ${p.type}`, material: [p.metal, p.stone, p.diamondCt && "Diamond"].filter(Boolean).join(", "),
      collection: p.collection,
    })] },
  }) + "\n" + PRE_CSS;
  html = setBlock(html, "seo", head, "</head>");
  write(path.join(WEB, url, "index.html"), html);
  sitemap.push({ loc: ORIGIN + url, lastmod: fjDataDate, images: images.slice(0, 6) });
}

/* Journal posts are drawn from Supabase by one template, so they have no file
   of their own; they are listed here so they can be found. */
const posts = await rest("blog_posts?select=slug,updated_at,published_at,cover_image&published=eq.true&order=published_at.desc").catch((e) => {
  console.warn(`Journal posts skipped: ${e.message.split("\n")[0]}`);
  return [];
});
for (const p of posts) {
  sitemap.push({ loc: `${ORIGIN}/blog/${encodeURIComponent(p.slug)}/`, lastmod: (p.updated_at || p.published_at || TODAY).slice(0, 10),
    images: p.cover_image ? [new URL(p.cover_image, ORIGIN + "/blog/").href.replace(ORIGIN, "")] : [] });
}

/* A product taken off the catalog loses its page too. */
const pDir = path.join(WEB, "fine-jewellery/p");
for (const id of fs.readdirSync(pDir)) {
  if (!fjIds.has(id)) { fs.rmSync(path.join(pDir, id), { recursive: true }); written.push(`removed fine-jewellery/p/${id}`); }
}

// ---------------------------------------------------------- crawler files

const robots = `# Gem Experience. Search engines and AI assistants are welcome to read and
# cite this site. Generated by tools/build-seo.mjs.

${["*", ...AI_BOTS].map((b) => `User-agent: ${b}`).join("\n")}
Allow: /
Disallow: /admin/
Disallow: /account/
Disallow: /cart/
Disallow: /wishlist/
Disallow: /checkout/
Disallow: /api/

Sitemap: ${ORIGIN}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemap.sort((a, b) => a.loc.localeCompare(b.loc)).map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod>${(u.images || []).map((i) => `<image:image><image:loc>${esc(abs(i))}</image:loc></image:image>`).join("")}</url>`).join("\n")}
</urlset>
`;

const stones = pages.filter((p) => /^\/world-of-preciousness\/[^/]+\/$/.test(p.url))
  .map((p) => { const h = fs.readFileSync(p.file, "utf8"); return `- [${h1Of(h)}](${ORIGIN + p.url}): ${descOf(h)}`; });

const llms = `# ${SITE}

> ${ORG_DESCRIPTION}

Prices are not published: Fine Jewellery and High Jewellery are quoted on request, and every piece is made to order. Enquiries are answered by an adviser, usually within two working days.

## Shop

- [High Jewellery](${ORIGIN}/high-jewellery/): one-of-a-kind pieces, each built around a single stone, quoted privately.
- [Fine Jewellery](${ORIGIN}/fine-jewellery/): ${fjProducts.length} pieces in ${fjCollections.length} collections (${fjCollections.map((c) => c.name).join(", ")}).
- [Gifts](${ORIGIN}/gifts/): pieces chosen to be given, with a handwritten card.
- [Request a quotation](${ORIGIN}/quotation/) · [Book a private viewing](${ORIGIN}/appointment/)

## The house

- [The House](${ORIGIN}/the-house/): stones chosen at the source in Tanzania, cut in the house's own workshop, ateliers in the UAE (Dubai), India (Jaipur) and Tanzania (Arusha).
- [Timeline](${ORIGIN}/timeline/): the house's roots go back to Color Clarity Ltd. (${FOUNDED}), a Tanzanian mining and gemstone business; its operations later discovered tsavorite and spinel (2007), launched The Tanzanite Experience (2015) and opened in Dubai (2018).
- [GE Icons](${ORIGIN}/icons/): statement sets, earrings, rings and bracelets outside the main collections.
- [Craftsmanship](${ORIGIN}/craftsmanship/) · [Sustainability](${ORIGIN}/sustainability/) · [Mining](${ORIGIN}/mining/) · [Maasai Women](${ORIGIN}/maasai-women/)
- [Lookbook](${ORIGIN}/lookbook/): High Jewellery and Fine Jewellery photographed as worn.

## Events and exhibitions

- [Events & Exhibitions](${ORIGIN}/events/): where to see the pieces in person; WhatsApp +971 56 720 3896 for details.
${upcomingEvents.map((e) => `  - ${e.title}: ${eventWhen(e)}${eventWhere(e) ? `, ${eventWhere(e)}` : ""}.`).join("\n")}

## High Jewellery pieces

${HJ.products.filter((p) => hjHasPage(p.id)).map((p) => `- [${p.name}](${ORIGIN}/high-jewellery/${p.id}/): ${p.materials}, ${p.type.toLowerCase().replace(/s$/, "")}, ${p.collection} collection.`).join("\n")}

## Fine Jewellery collections

${fjCollections.map((c) => `- ${c.name}: ${c.lede || ""} ${c.meta ? `(${c.meta})` : ""}`.trim()).join("\n")}

## Gemstones

- [The Collector’s Bench](${ORIGIN}/world-of-preciousness/): how a coloured stone is judged, and the gemstones of the East African belt.
${stones.join("\n")}

## Client care

- [Frequently asked questions](${ORIGIN}/faqs/)
${faqs.map((f) => `  - ${f.question} ${clip(mdText(f.answer), 220)}`).join("\n")}
- [Contact](${ORIGIN}/contact/): ${EMAIL}
- [Offices](${ORIGIN}/offices/)
${offices.filter((o) => o.kind === "atelier").map((o) => `  - ${o.name}: ${o.address}${o.phone ? `. Tel/WhatsApp ${o.phone}` : ""}`).join("\n")}

## Optional

- [Stories behind the High Jewellery](${ORIGIN}/high-jewellery/stories/)
- [Journal](${ORIGIN}/blog/)
- [Legal](${ORIGIN}/legal/)
- [Sitemap](${ORIGIN}/sitemap.xml)
- [Full catalogue for AI assistants](${ORIGIN}/llms-full.txt): every piece with its stones, weights, metal and link.
`;

/* llms-full.txt: the whole catalogue in plain text, so an assistant asked
   "does Gem Experience make a tanzanite ring?" can answer from the source. */
const fjLine = (p) => `- ${p.name}${p.subtitle ? ` (${p.subtitle})` : ""}. Ref ${p.sku}. ${[p.collection && p.collection + " collection", p.type,
  p.metal, p.stone && `${p.stone}${p.stoneCt ? ` ${p.stoneCt} ct` : ""}`, p.diamondCt && `diamonds ${p.diamondCt} ct`].filter(Boolean).join("; ")}. ${ORIGIN}${fjProductUrl(p)}`;
const iconsHtml = fs.existsSync(path.join(WEB, "icons/index.html")) ? fs.readFileSync(path.join(WEB, "icons/index.html"), "utf8") : "";
const llmsFull = `${llms}
# Full catalogue

Prices are given on request for every piece below. To enquire: ${ORIGIN}/quotation/ or ${EMAIL}.

## High Jewellery (one of a kind)

${HJ.products.filter((p) => hjHasPage(p.id)).map((p) => `- ${p.name}. ${[p.collection && p.collection + " collection", p.type, p.materials, p.carat && p.carat !== "—" && p.carat, p.ref && p.ref !== "—" && "Ref " + p.ref].filter(Boolean).join("; ")}. ${ORIGIN}/high-jewellery/${p.id}/${p.story ? `\n  ${clip(p.story, 400)}` : ""}`).join("\n")}

## GE Icons

${iconsOf(iconsHtml).map((it) => `- ${it.name}. ${[it.kind, it.facts, it.ref && "Ref " + it.ref].filter(Boolean).join("; ")}. ${ORIGIN}/icons/#${it.id}\n  ${it.description}`).join("\n")}

## Fine Jewellery (${fjProducts.length} pieces)

${fjCollections.map((c) => `### ${c.name}\n\n${c.lede ? c.lede + "\n\n" : ""}${fjProducts.filter((p) => p.collection === c.name).map(fjLine).join("\n")}`).join("\n\n")}
${fjProducts.some((p) => !fjLive.has(p.collection) || !p.collection) ? `\n### Other pieces\n\n${fjProducts.filter((p) => !p.collection).map(fjLine).join("\n")}` : ""}
`;

write(path.join(WEB, "robots.txt"), robots);
write(path.join(WEB, "sitemap.xml"), sitemapXml);
write(path.join(WEB, "llms.txt"), llms);
write(path.join(WEB, "llms-full.txt"), llmsFull);

console.log(`${pages.length} pages annotated, ${fjProducts.length} Fine Jewellery product pages, ${sitemap.length} URLs in the sitemap.`);
console.log(written.length ? `${written.length} files changed${written.length <= 10 ? ": " + written.join(", ") : "."}` : "Nothing changed.");
