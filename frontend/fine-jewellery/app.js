/* Fine Jewellery — landing, shop all, collection, subcategory, product */

(function () {
  "use strict";

  /* This page builds its own header rather than going through GemShell, so the
     bag drawer is started here. Without it "Add to selection" changes a number
     in the corner and nothing else. */
  if (window.GemMiniCart) window.GemMiniCart.init({ prefix: "../" });


  var data = window.FJ_DATA || { collections: [], products: [], types: [] };

  /* Only what can be shown well goes on the page. A product without a
     photograph is left out rather than drawn as a coloured ball, and a
     collection with no photographed piece (Tide and Swirl, for now) is left
     out rather than shown as a blank tile. Nothing is removed from the
     catalogue: add images to a product and it appears on its own, and its
     collection with it. */
  (function () {
    /* `hidden` marks a piece whose photograph contradicts its spec sheet,
       held back until the house confirms which is right. */
    var shown = (data.products || []).filter(function (p) {
      return p.images && p.images.length && !p.hidden;
    });
    var live = {};
    shown.forEach(function (p) { live[p.collection] = true; });
    data = {
      collections: (data.collections || []).filter(function (c) { return live[c.name]; }),
      products: shown,
      types: data.types || []
    };
  })();
  var view = document.getElementById("view");

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function typeFromSlug(slug) {
    if (!slug) return null;
    return data.types.find(function (t) { return slugify(t) === slug; }) || null;
  }

  function parseRoute() {
    /* /fine-jewellery/p/<id>/ is this same page with the product written in
       for crawlers (tools/build-seo.mjs); it names its route in FJ_ROUTE, and
       any hash the visitor then follows takes over as usual. */
    var hash = (location.hash || window.FJ_ROUTE || "#/").replace(/^#/, "") || "/";
    var parts = hash.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (!parts.length) return { page: "home" };
    if (parts[0] === "p" && parts[1]) return { page: "product", id: parts[1] };

    if (parts[0] === "shop") {
      var col = null;
      var type = null;
      if (parts[1]) {
        col = data.collections.find(function (c) { return c.id === parts[1]; }) || null;
        if (col) type = typeFromSlug(parts[2]);
        else type = typeFromSlug(parts[1]);
      }
      return { page: "shop", collection: col, type: type };
    }

    var found = data.collections.find(function (c) { return c.id === parts[0]; });
    if (found) {
      return {
        page: "collection",
        collection: found,
        type: typeFromSlug(parts[1]),
        typeSlug: parts[1] || null
      };
    }
    return { page: "home" };
  }

  function productsFor(collectionName, typeName) {
    return data.products.filter(function (p) {
      if (collectionName && p.collection !== collectionName) return false;
      if (typeName && p.type !== typeName) return false;
      return true;
    });
  }

  /* One design made in several stones (data.js "design": the id of the
     piece the grid shows for the group). Grids show the design once, with a
     dot per colour; the product page offers the other colours. */
  function variantsOf(p) {
    if (!p.design) return [p];
    return data.products.filter(function (q) { return q.design === p.design; });
  }
  function designs(items) {
    var seen = {};
    var out = [];
    items.forEach(function (p) {
      var key = p.design || p.id;
      if (seen[key]) return;
      seen[key] = true;
      out.push(p.design ? data.products.find(function (q) { return q.id === p.design; }) || p : p);
    });
    return out;
  }
  /* What tells one colour from another: the stone, then the metal when two
     share a stone, then the weight when they share that too. */
  function variantLabel(q, all) {
    var sameStone = all.filter(function (o) { return o.stone === q.stone; });
    if (sameStone.length < 2) return q.stone;
    var sameMetal = sameStone.filter(function (o) { return o.metal === q.metal; }).length > 1;
    // two in one stone and metal differ only by weight (GD26-183, GD26-207)
    return q.stone + ", " + (sameMetal && q.stoneCt != null ? ct(q.stoneCt) : q.metal);
  }
  function swatches(p, cls, linked) {
    var all = variantsOf(p);
    var row = el("div", cls);
    all.forEach(function (q) {
      var label = variantLabel(q, all);
      var dot = el(linked ? "a" : "span", "fj-swatch" + (q.id === p.id ? " is-on" : ""),
        linked ? { href: "#/p/" + q.id, title: label, "aria-label": label + (q.id === p.id ? " (shown)" : "") }
               : { title: label });
      dot.style.setProperty("--swatch", q.tone || "#9a958e");
      if (linked) {
        dot.className = "fj-variant" + (q.id === p.id ? " is-on" : "");
        var d = el("span", "fj-swatch"); d.style.setProperty("--swatch", q.tone || "#9a958e");
        dot.appendChild(d);
        dot.appendChild(el("span", null, { text: label }));
      }
      row.appendChild(dot);
    });
    return row;
  }

  function typesPresent(collectionName) {
    var set = {};
    productsFor(collectionName).forEach(function (p) { set[p.type] = true; });
    return data.types.filter(function (t) { return set[t]; });
  }

  function shopHref(collection, type) {
    var path = "#/shop";
    if (collection) path += "/" + collection.id;
    if (type) path += "/" + slugify(type);
    return path;
  }

  /* A compact filter bar: a labelled dropdown per field, changing the route
     on selection, and the piece count at the end of the line. */
  function filterBar(fields, count) {
    var bar = el("div", "fj-filterbar");
    fields.forEach(function (f) {
      var wrap = el("label", "fj-select");
      wrap.appendChild(el("span", "fj-select-label", { text: f.label }));
      var sel = el("select", null, { "aria-label": f.label });
      f.options.forEach(function (o) {
        var opt = el("option", null, { value: o.value, text: o.text });
        if (o.value === f.value) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () { location.hash = f.href(sel.value); });
      wrap.appendChild(sel);
      bar.appendChild(wrap);
    });
    if (count != null) bar.appendChild(el("p", "fj-filterbar-count", { text: count + (count === 1 ? " design" : " designs") }));
    return bar;
  }

  function ct(n) {
    if (n == null || n === "") return "";
    return Number(n).toFixed(String(n).indexOf(".") >= 0 ? 2 : 0).replace(/\.00$/, "") + " ct";
  }

  function gm(n) {
    if (n == null || n === "") return "";
    return Number(n).toFixed(2).replace(/\.00$/, "") + " g";
  }

  /* The headline is the piece's own name with the diamond clause taken out.
     Almost every name runs "<stone> and diamond <motif> <type>", and the
     diamonds are already stated as a carat weight in the pill strip directly
     below, so the phrase costs a line of headline and says nothing new.
     "Mint garnet and diamond bloom pendant" becomes "Mint garnet bloom
     pendant" and keeps the motif that tells it apart from the other Bloom
     pendants. A name that does not mention diamond is left exactly as it is. */
  function headline(p) {
    var n = (p.name || "").trim();
    if (!n) return p.name;
    return n
      /* "A, B and diamond C" would leave "A, B C" dangling, so the list is
         re-joined: "Tourmaline, rose quartz and diamond motif earring"
         becomes "Tourmaline and rose quartz motif earring". */
      .replace(/,\s*([^,]+?)\s+and\s+diamonds?\b/i, " and $1")
      .replace(/\s+and\s+diamonds?\b/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /* A collection intro runs two paragraphs and stops. What follows them is
     the gemstone symbolism and the "Stones used:" line, which read as a spec
     sheet in the middle of an essay and repeat what each product page already
     says in its own words. Those paragraphs, and the meta line under them,
     move to the product page's Description & details. */
  var INTRO_PARAS = 2;

  function storyParas(col) {
    return (col && col.story ? col.story.split("\n\n") : [])
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }

  function introParas(col) { return storyParas(col).slice(0, INTRO_PARAS); }

  /* The tail of the collection story, shown under a piece's details. It was
     shown whole on every piece, so every Bloom piece read the same symbolism
     for four stones and the same "Stones used:" list, whatever it was set
     with. Now the stone symbolism keeps only the sentences for this piece's
     own stones (and goes when none apply), and the collection-wide stone and
     metal lists are left out: the spec rows above already say what this
     piece is made of. Safar's meta repeats the designer byline, so it is
     skipped there exactly as it was in the intro. */
  function collectionNotes(col, p) {
    if (!col) return [];
    var stones = stoneList(p).map(function (s) { return s.toLowerCase(); });
    var out = [];
    storyParas(col).slice(INTRO_PARAS).forEach(function (para) {
      if (/^stones used:/i.test(para)) return;
      var sentences = para.match(/[^.]+\.(\s+|$)/g) || [para];
      var symbols = sentences.filter(function (t) { return /^\s*[A-Z][a-z]+(?: [a-z]+)? for /.test(t); });
      if (!symbols.length) { out.push(para); return; }
      var mine = symbols.filter(function (t) {
        var name = t.trim().split(" for ")[0].toLowerCase();
        return stones.some(function (s) { return s === name || s.indexOf(name) !== -1; });
      });
      if (!mine.length) return;
      out.push(sentences.filter(function (t) {
        return symbols.indexOf(t) === -1 || mine.indexOf(t) !== -1;
      }).join("").trim());
    });
    if (col.meta && col.meta !== "Designed with " + (col.designer || "") && !/gold/i.test(col.meta)) out.push(col.meta);
    return out;
  }

  /* The spec sheets abbreviate cuts ("Sq-Princess", "Prs", "Heart Cabs");
     the page spells them out. A value that is not a cut (one row has
     "Aquamarine") is left off. */
  var SHAPE_WORDS = { sq: "Square", prs: "Pear", pears: "Pear", rds: "Round", ovl: "Oval", rcb: "Round cabochon",
    cabs: "cabochon", cab: "cabochon", balls: "Ball", drops: "Drop", mix: "Mixed" };
  function shapeName(raw) {
    var s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s || /aquamarine/i.test(s)) return "";
    var out = s.split(/([\s&-]+)/).map(function (w) {
      var k = w.toLowerCase();
      return SHAPE_WORDS[k] ? SHAPE_WORDS[k] : w;
    }).join("").replace(/-/g, " ").replace(/\s+/g, " ");
    out = out.replace(/^cabochon$/i, "Cabochon");
    return out.charAt(0).toUpperCase() + out.slice(1).toLowerCase().replace(/ & (\w)/, function (m, c) { return " & " + c; });
  }

  function stoneList(p) {
    return String(p.stone || "").split(/\s*&\s*/).filter(Boolean);
  }

  function inr(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function formatPrice(p) {
    return p.priceINR ? inr(p.priceINR) : "Price on request";
  }

  /* Every Fine Jewellery frame degrades gracefully: it shows the stone-tone
     orb (same language as the catalog cards) until a real photo lands at
     the given path, then swaps over automatically — no code change needed
     when photography is ready. */
  function mediaFrame(src, alt, tone, cls) {
    var frame = el("div", "fj-frame" + (cls ? " " + cls : ""));
    frame.style.setProperty("--tone", tone || "#9a958e");
    frame.appendChild(el("div", "fj-frame-orb"));
    var img = el("img", "fj-frame-img", { src: src, alt: alt || "", loading: "lazy", decoding: "async" });
    img.addEventListener("error", function () { img.remove(); });
    img.addEventListener("load", function () { frame.classList.add("has-img"); });
    frame.appendChild(img);
    return frame;
  }

  /* One shared editorial sequence, reused on every Fine Jewellery product page.
     The photography comes from the piece's own collection (collection.models),
     so a Safar piece shows the Safar shoot and a Bloom piece the Bloom one.
     Collections still awaiting a shoot fall back to img/model/, which shows the
     stone-tone orb until those files are dropped in. */
  var MODEL_STORY = [
    { img: "img/model/model-1.jpg", h: "Made to be worn", p: "Every Fine Jewellery piece is fitted and finished by hand in our workshop, then tried on a real hand, wrist or ear before it ships, not just photographed on a mannequin." },
    { img: "img/model/model-2.jpg", h: "Everyday, not occasion-only", p: "Fine Jewellery is built for daily wear: secure clasps, snag-free settings, and metals chosen to hold their colour through years of ordinary use." },
    { img: "img/model/model-3.jpg", h: "Stones you can trace", p: "Every coloured stone in the collection is sourced and graded before it is set, so the carat weight and shape on this page match the stone actually in the piece." },
    { img: "img/model/model-4.jpg", h: "Finished in-house", p: "Polishing, stone-setting and quality control all happen under one roof, so a piece that leaves our workshop has been checked by the same hands that made it." }
  ];

  function modelShot(col, i) {
    return (col && col.models && col.models[i]) || MODEL_STORY[i].img;
  }

  /* ---------------------------------------------------------------- nav */

  /* The drawer is js/site-nav.js, shared with the rest of the site; this only
     points the header button at it. It is mounted by an inline script that runs
     after this file, so the lookup happens on click. */
  var menuBtn = document.getElementById("menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      if (window.GemNav && window.GemNav.mounted) window.GemNav.mounted.open();
    });
  }

  /* ------------------------------------------------------------- render */

  /* The tone orb stays the fallback: pieces still awaiting photography keep
     the catalog's existing look, and a broken file drops back to it rather
     than leaving a hole in the grid. */
  function plate(tone, sku, src, alt, hover, sizes) {
    var wrap = el("div", "fj-plate");
    wrap.style.setProperty("--tone", tone || "#9a958e");
    wrap.appendChild(el("div", "fj-plate-orb"));
    /* The second frame sits under the first and is revealed by fading the
       first out, so the piece never disappears mid-transition the way it does
       when one image fades in over nothing. Lazy, because most of these are
       never hovered — a grid of 98 would otherwise double its own weight. */
    if (hover) {
      var hv = el("img", "fj-plate-hover", withSrcset({
        src: hover, alt: "", loading: "lazy", decoding: "async", "aria-hidden": "true"
      }, sizes || "(max-width: 700px) 50vw, 420px"));
      hv.addEventListener("error", function () { hv.remove(); wrap.classList.remove("has-hover"); });
      hv.addEventListener("load", function () { wrap.classList.add("has-hover"); });
      wrap.appendChild(hv);
    }
    if (src) {
      var img = el("img", "fj-plate-img", withSrcset({
        src: src, alt: alt || "", loading: "lazy", decoding: "async"
      }, sizes || "(max-width: 700px) 50vw, 420px"));
      img.addEventListener("error", function () { img.remove(); wrap.classList.remove("has-img"); });
      img.addEventListener("load", function () { wrap.classList.add("has-img"); });
      wrap.appendChild(img);
    }
    if (sku) wrap.appendChild(el("span", "fj-plate-sku", { text: sku }));
    return wrap;
  }

  /* Every catalogue photograph also exists as a smaller copy beside it
     (<name>.w640.webp; the collection banners <name>.w900.webp), made by
     tools/build-responsive.sh. srcset lets a phone take the small one and a
     wide screen the original; a path outside those sets gets no srcset. */
  function srcsetFor(src) {
    if (/img\/products\/[^/]+\.webp$/.test(src) && !/\.w640\.webp$/.test(src)) {
      return src.replace(/\.webp$/, ".w640.webp") + " 640w, " + src + " 1400w";
    }
    if (/-banner\.webp$/.test(src)) return src.replace(/\.webp$/, ".w900.webp") + " 900w, " + src + " 1800w";
    return "";
  }
  function small(src) {
    return /img\/products\/[^/]+\.webp$/.test(src) ? src.replace(/\.webp$/, ".w640.webp") : src;
  }
  function withSrcset(attrs, sizes) {
    var set = srcsetFor(attrs.src);
    if (set) { attrs.srcset = set; attrs.sizes = sizes; }
    return attrs;
  }

  function mainImage(p) {
    return p.images && p.images.length ? p.images[0] : "";
  }

  /* What the wishlist keeps for a piece: enough to list it anywhere. */
  function wishItem(p) {
    return {
      key: "fj:" + p.id,
      name: p.name,
      detail: [p.subtitle, p.sku].filter(Boolean).join(" · "),
      image: mainImage(p) ? "/fine-jewellery/" + small(mainImage(p)) : "",
      href: "/fine-jewellery/p/" + p.id + "/"
    };
  }

  function card(p) {
    var a = el("a", "fj-card", { href: "#/p/" + p.id });
    var pl = plate(p.tone, p.sku, mainImage(p), p.name, p.hover || "");
    if (window.Gem && window.Gem.wishlist) pl.appendChild(window.Gem.wishlist.button(wishItem(p), "corner"));
    a.appendChild(pl);
    var body = el("div", "fj-card-body");
    body.appendChild(el("span", "fj-card-type", { text: p.collection }));
    body.appendChild(el("h3", null, { text: p.name }));
    body.appendChild(el("p", null, {
      text: [p.metal, p.stoneCt != null ? ct(p.stoneCt) : ""].filter(Boolean).join(" · ")
    }));
    if (variantsOf(p).length > 1) {
      var dots = swatches(p, "fj-card-swatches", false);
      dots.appendChild(el("span", "fj-card-swatch-n", { text: variantsOf(p).length + " colours" }));
      body.appendChild(dots);
    }
    a.appendChild(body);
    return a;
  }

  function renderHome() {
    var root = el("div", "fj-home");
    var hero = el("header", "fj-home-hero");
    hero.appendChild(el("p", "fj-kicker", { text: "Collections" }));
    hero.appendChild(el("h1", "fj-title", { text: "Fine Jewellery" }));
    hero.appendChild(el("p", "fj-lede", {
      text: "Several houses within Fine Jewellery, each built around an idea of its own. Choose a collection, then a piece."
    }));
    root.appendChild(hero);

    var cats = el("div", "fj-cats");
    data.collections.forEach(function (c, ci) {
      var a = el("a", "fj-cat", { href: "#/" + c.id });
      a.style.setProperty("--cat-tone", c.tone);

      /* The tone gradient sits underneath always, so a collection whose banner
         is missing or fails to load shows its colour rather than a broken
         image. Drop the file in at c.banner and it covers the placeholder. */
      var media = el("div", "fj-cat-media");
      media.appendChild(el("div", "fj-cat-placeholder"));
      if (c.banner) {
        /* The first row is the largest thing on the page: fetched at once and
           first, the rest only as they scroll into view. */
        var bnr = el("img", null, withSrcset(ci < 3
          ? { src: c.banner, alt: c.name, fetchpriority: "high", decoding: "async" }
          : { src: c.banner, alt: c.name, loading: "lazy", decoding: "async" }, "(max-width: 700px) 50vw, 33vw"));
        bnr.addEventListener("error", function () { bnr.remove(); });
        media.appendChild(bnr);
      }
      a.appendChild(media);

      var copy = el("div", "fj-cat-copy");
      copy.appendChild(el("h2", "fj-title", { text: c.name }));
      copy.appendChild(el("p", "fj-lede", { text: c.lede }));
      copy.appendChild(el("span", "fj-cat-cta", { text: "Enter " + c.name }));
      a.appendChild(copy);

      cats.appendChild(a);
    });
    root.appendChild(cats);

    var shop = el("div", "fj-shopall");
    shop.appendChild(el("p", null, {
      text: data.products.length + " pieces across " + data.collections.length + " collections."
    }));
    shop.appendChild(el("a", "fj-link", { href: "#/shop", text: "Shop all pieces" }));
    root.appendChild(shop);
    return root;
  }

  /* Points a photo banner at the collection's image. The portrait banners
     are framed from the upper third in the wide band, which is where the
     face and the piece sit; Shop all keeps its own photograph from the CSS. */
  function photoBanner(node, col) {
    if (!col || !col.banner) return;
    node.style.setProperty("--fj-banner", 'url("' + col.banner + '")');
    node.style.setProperty("--fj-banner-y", col.bannerY || "28%");
  }

  function renderShop(route) {
    var col = route.collection;
    var type = route.type;
    var items = designs(productsFor(col ? col.name : null, type));

    var root = el("div", "fj-shop");

    /* Shop all gets the house photograph; a collection gets its own banner,
       so choosing Bloom or Safar opens on Bloom or Safar rather than on a
       flat band of colour. The gradient underneath stays as the fallback. */
    var banner = el("header", "fj-shop-banner" + (!col || col.banner ? " fj-shop-banner--photo" : ""));
    photoBanner(banner, col);
    banner.appendChild(el("p", "fj-kicker", { text: "Fine Jewellery" }));
    banner.appendChild(el("h1", "fj-title", {
      text: type ? type : (col ? col.name : "Shop all")
    }));
    banner.appendChild(el("p", "fj-lede", {
      text: col
        ? col.lede
        : "Every Fine Jewellery piece, across " + data.collections.length +
          " collections. Filter by collection or category."
    }));
    root.appendChild(banner);

    /* Two dropdowns in one bar, rather than a row of chips for every
       collection and category spread across the page. */
    root.appendChild(filterBar([
      { label: "Collection", value: col ? col.id : "",
        options: [{ value: "", text: "All collections" }].concat(data.collections.map(function (c) {
          return { value: c.id, text: c.name };
        })),
        href: function (v) { return shopHref(v ? data.collections.find(function (c) { return c.id === v; }) : null, type); } },
      { label: "Category", value: type || "",
        options: [{ value: "", text: "All categories" }].concat(data.types.map(function (t) {
          return { value: t, text: t };
        })),
        href: function (v) { return shopHref(col, v || null); } }
    ], items.length));

    var body = el("div", "fj-shop-body");
    var grid = el("div", "fj-grid");
    if (!items.length) {
      grid.appendChild(el("p", "fj-empty", { text: "No pieces match these filters." }));
    } else {
      items.forEach(function (p) { grid.appendChild(card(p)); });
    }
    body.appendChild(grid);
    root.appendChild(body);
    return root;
  }

  function renderCollection(route) {
    var col = route.collection;
    var type = route.type;
    var items = designs(productsFor(col.name, type));
    var types = typesPresent(col.name);
    var root = el("div", "fj-col");

    if (!type) {
      var hero = el("section", "fj-hero");
      hero.style.setProperty("--cat-tone", col.tone || "#6a9e7a");

      var visual = el("div", "fj-hero-visual");
      if (col.banner) {
        visual.appendChild(el("img", null, withSrcset({
          src: col.banner,
          alt: col.name,
          fetchpriority: "high",
          decoding: "async"
        }, "(max-width: 900px) 100vw, 50vw")));
      } else {
        visual.appendChild(el("div", "fj-hero-fallback"));
      }
      hero.appendChild(visual);

      var panel = el("div", "fj-hero-panel");
      panel.appendChild(el("p", "fj-hero-mark", { text: "Fine Jewellery" }));
      panel.appendChild(el("h1", "fj-title", { text: col.name }));
      if (col.designer) {
        panel.appendChild(el("p", "fj-col-by", { text: "Designed with " + col.designer }));
      }
      panel.appendChild(el("p", "fj-lede", { text: col.lede }));

      var intro = introParas(col);
      if (intro.length) {
        var storyWrap = el("div", "fj-hero-scroll");
        intro.forEach(function (para) {
          storyWrap.appendChild(el("p", "fj-story", { text: para }));
        });
        panel.appendChild(storyWrap);
      }

      var explore = el("button", "fj-explore", {
        type: "button",
        text: "Explore " + col.name
      });
      explore.appendChild(el("span", "fj-explore-arrow", { "aria-hidden": "true", text: "↓" }));
      explore.addEventListener("click", function () {
        var target = document.getElementById("fj-pieces");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      panel.appendChild(explore);
      hero.appendChild(panel);
      root.appendChild(hero);
    } else {
      /* A category inside a collection (Bloom · Rings) keeps the collection's
         photograph across the top, so the page still reads as Bloom. */
      var subHead = el("header", col.banner ? "fj-shop-banner fj-shop-banner--photo fj-col-subhead--photo" : "fj-col-subhead");
      photoBanner(subHead, col);
      subHead.appendChild(el("a", "fj-back", {
        href: "#/" + col.id,
        text: "← " + col.name
      }));
      subHead.appendChild(el("h1", "fj-title", { text: type }));
      subHead.appendChild(el("p", "fj-col-count", {
        text: items.length + (items.length === 1 ? " design" : " designs")
      }));
      root.appendChild(subHead);
    }

    var pieces = el("section", "fj-pieces", { id: "fj-pieces" });
    if (!type) {
      pieces.appendChild(el("header", "fj-pieces-head", {
        html: "<h2 class=\"fj-pieces-title\">The collection</h2>" +
          "<p class=\"fj-col-count\">" +
          items.length + (items.length === 1 ? " design" : " designs") +
          "</p>"
      }));
    }

    var layout = el("div", "fj-layout");
    if (types.length > 1) {
      pieces.appendChild(filterBar([
        { label: "Category", value: type || "",
          options: [{ value: "", text: "All categories" }].concat(types.map(function (t) {
            return { value: t, text: t };
          })),
          href: function (v) { return "#/" + col.id + (v ? "/" + slugify(v) : ""); } }
      ], type ? items.length : null));
    }

    var grid = el("div", "fj-grid");
    if (!items.length) {
      grid.appendChild(el("p", "fj-empty", { text: "No pieces in this category yet." }));
    } else {
      items.forEach(function (p) { grid.appendChild(card(p)); });
    }
    layout.appendChild(grid);
    pieces.appendChild(layout);
    root.appendChild(pieces);
    return root;
  }

  function renderProduct(id) {
    var p = data.products.find(function (x) { return x.id === id; });
    if (!p) {
      location.hash = "#/";
      return renderHome();
    }
    var col = data.collections.find(function (c) { return c.name === p.collection; });
    var root = el("article", "fj-pdp-page");

    // breadcrumb
    var crumbs = el("nav", "fj-crumbs", { "aria-label": "Breadcrumb" });
    crumbs.appendChild(el("a", null, { href: "../", text: "Home" }));
    crumbs.appendChild(el("span", null, { text: "/" }));
    crumbs.appendChild(el("a", null, { href: "#/", text: "Fine Jewellery" }));
    crumbs.appendChild(el("span", null, { text: "/" }));
    if (col) {
      crumbs.appendChild(el("a", null, { href: "#/" + col.id, text: col.name }));
      crumbs.appendChild(el("span", null, { text: "/" }));
    }
    crumbs.appendChild(el("span", "fj-crumbs-here", { "aria-current": "page", text: headline(p) }));
    root.appendChild(crumbs);

    var pdp = el("section", "fj-pdp");
    var media = el("div", "fj-pdp-media");
    var shots = p.images || [];
    var hero = plate(p.tone, p.sku, shots[0], p.name, "", "(max-width: 900px) 100vw, 560px");
    media.appendChild(hero);
    if (shots.length > 1) {
      var thumbs = el("div", "fj-pdp-thumbs");
      shots.forEach(function (src, i) {
        var t = el("button", "fj-pdp-thumb" + (i === 0 ? " is-active" : ""), {
          type: "button", "aria-label": "View image " + (i + 1) + " of " + shots.length
        });
        t.appendChild(el("img", null, { src: small(src), alt: "", loading: "lazy", decoding: "async" }));
        t.addEventListener("click", function () {
          var full = hero.querySelector(".fj-plate-img");
          if (full) {
            var set = srcsetFor(src);
            if (set) full.srcset = set; else full.removeAttribute("srcset");
            full.src = src;
          }
          thumbs.querySelectorAll(".fj-pdp-thumb").forEach(function (o) { o.classList.remove("is-active"); });
          t.classList.add("is-active");
        });
        thumbs.appendChild(t);
      });
      media.appendChild(thumbs);
    }
    pdp.appendChild(media);

    var copy = el("div", "fj-pdp-copy");
    copy.appendChild(el("p", "fj-kicker", { text: p.sku }));
    copy.appendChild(el("h1", "fj-title", { text: headline(p) }));
    if (p.subtitle) copy.appendChild(el("p", "fj-subtitle", { text: p.subtitle }));
    if (variantsOf(p).length > 1) {
      var pick = el("div", "fj-variants");
      pick.appendChild(el("p", "fj-variants-label", { text: "This design in other stones" }));
      pick.appendChild(swatches(p, "fj-variants-row", true));
      copy.appendChild(pick);
    }

    var priceRow = el("div", "fj-pdp-price");
    priceRow.appendChild(el("span", "fj-pdp-price-val", { text: formatPrice(p) }));
    if (!p.priceINR) priceRow.appendChild(el("span", "fj-pdp-price-note", { text: "Final price confirmed on enquiry" }));
    copy.appendChild(priceRow);

    copy.appendChild(el("p", "fj-pdp-story", { text: p.story }));

    // stone strip — every stone in the piece, plus diamond, metal and weight
    var strip = el("div", "fj-stone-strip");
    stoneList(p).forEach(function (s) {
      strip.appendChild(el("span", "fj-stone-pill", { text: s }));
    });
    [
      [ct(p.stoneCt), "stone"],
      [ct(p.diamondCt), "diamond"],
      [p.metal, "metal"]
    ].forEach(function (row) {
      if (row[0]) strip.appendChild(el("span", "fj-stone-pill fj-stone-pill--" + row[1], { text: row[0] }));
    });
    copy.appendChild(strip);

    var opts = el("div", "fj-pdp-opts");
    opts.appendChild(el("p", "fj-pdp-metal", {
      text: "Also available in white, yellow and rose gold, made to order."
    }));
    if (p.type === "Rings" || p.type === "Bracelets") {
      opts.appendChild(el("a", "fj-size-link", {
        href: "/size-guide/#" + (p.type === "Rings" ? "rings" : "bracelets"),
        text: "Find your size"
      }));
    }
    copy.appendChild(opts);

    /* There is no checkout: a piece is saved to the Collector's Bench or
       enquired about, so those are the two actions. */
    var actions = el("div", "fj-pdp-actions");
    if (window.Gem && window.Gem.wishlist) {
      var saveBtn = window.Gem.wishlist.button(wishItem(p), "line");
      saveBtn.classList.add("fj-btn");
      actions.appendChild(saveBtn);
    }
    actions.appendChild(el("a", "fj-btn fj-btn--ghost", {
      href: "../quotation/?ref=" + encodeURIComponent(p.sku) + "&name=" + encodeURIComponent(p.name),
      text: "Enquire now"
    }));
    copy.appendChild(actions);

    // details, care & shipping — plain disclosure elements, no extra JS state
    var specRows = [
      ["Category", p.type], ["Collection", p.collection], ["Metal", p.metal],
      ["Stone", p.stone], ["Shape", shapeName(p.shape)],
      ["Stone weight", ct(p.stoneCt)], ["Diamond weight", ct(p.diamondCt)],
      ["Net weight", gm(p.netG)], ["Gross weight", gm(p.grossG)], ["Reference", p.sku]
    ].filter(function (r) { return r[1]; });

    var accWrap = el("div", "fj-acc");
    var d1 = el("details", "fj-acc-item", { open: "" });
    d1.appendChild(el("summary", null, { text: "Description & details" }));
    var d1body = el("div", "fj-acc-body");
    var specs = el("ul", "fj-specs");
    specRows.forEach(function (row) {
      var li = el("li");
      li.appendChild(el("strong", null, { text: row[0] }));
      li.appendChild(el("span", null, { text: String(row[1]) }));
      specs.appendChild(li);
    });
    d1body.appendChild(specs);
    /* The tail of the collection story, moved off the intro. It sits under the
       spec rows so the piece's own facts come first and the collection's
       symbolism reads as context rather than as the lead. */
    collectionNotes(col, p).forEach(function (para) {
      d1body.appendChild(el("p", "fj-acc-note", { text: para }));
    });
    d1.appendChild(d1body);
    accWrap.appendChild(d1);

    var d2 = el("details", "fj-acc-item");
    d2.appendChild(el("summary", null, { text: "Care and services" }));
    var d2body = el("div", "fj-acc-body");
    [
      "Cleaned and checked by our workshop at any time, without charge.",
      "Store separately in the fitted pouch, away from direct light and heat.",
      "Resizing (on rings) and restringing handled in-house; allow two weeks.",
      "Every piece carries a lifetime guarantee against manufacturing defect."
    ].forEach(function (b) { d2body.appendChild(el("p", "fj-acc-copy", { text: b })); });
    d2.appendChild(d2body);
    accWrap.appendChild(d2);

    var d3 = el("details", "fj-acc-item");
    d3.appendChild(el("summary", null, { text: "Shipping and returns" }));
    var d3body = el("div", "fj-acc-body");
    [
      "Insured delivery worldwide, with signature required on arrival.",
      "In-stock pieces ship within 5–7 working days.",
      "Returns accepted within 15 days on unworn, unaltered pieces in original packaging.",
      "Resized or engraved pieces are final sale."
    ].forEach(function (b) { d3body.appendChild(el("p", "fj-acc-copy", { text: b })); });
    d3.appendChild(d3body);
    accWrap.appendChild(d3);

    copy.appendChild(accWrap);
    pdp.appendChild(copy);
    root.appendChild(pdp);

    /* Closer look — detail crops of this specific piece, listed in the
       catalog as p.details (paths under img/products/<id>/). Only listed crops
       are requested, so a piece without them costs no failed requests. The
       section stays out of the DOM until at least one crop actually loads. */
    var closer = el("section", "fj-closer");
    closer.appendChild(el("h2", "fj-section-h", { text: "A closer look" }));
    var closerGrid = el("div", "fj-closer-grid");
    var closerShown = false;
    (p.details || []).forEach(function (n) {
      var src = /\//.test(n) ? n : "img/products/" + p.id + "/" + n;
      var probe = new Image();
      probe.addEventListener("load", function () {
        closerGrid.appendChild(mediaFrame(src, p.name + " — detail", p.tone, "fj-closer-tile"));
        if (!closerShown) { closerShown = true; root.insertBefore(closer, relWrap); }
      });
      probe.src = src;
    });
    closer.appendChild(closerGrid);

    // cross-sell — same collection first, then the rest
    var mine = (p.design || p.id);
    var rel = designs(data.products.filter(function (q) { return (q.design || q.id) !== mine && q.collection === p.collection; })
      .concat(data.products.filter(function (q) { return q.collection !== p.collection; })))
      .slice(0, 3);
    var relWrap = el("section", "fj-related");
    var relHead = el("div", "fj-related-head");
    relHead.appendChild(el("span", "fj-section-h", { text: "You may also like" }));
    relHead.appendChild(el("a", "fj-related-all", { href: "#/shop", text: "View all" }));
    relWrap.appendChild(relHead);
    var relGrid = el("div", "fj-grid");
    rel.forEach(function (q) { relGrid.appendChild(card(q)); });
    relWrap.appendChild(relGrid);
    root.appendChild(relWrap);

    // shared editorial sequence — same on every Fine Jewellery product page
    var story = el("section", "fj-model");
    MODEL_STORY.forEach(function (b, i) {
      var blk = el("div", "fj-model-block" + (i % 2 ? " fj-model-block--right" : ""));
      blk.appendChild(mediaFrame(modelShot(col, i), b.h, p.tone, "fj-model-frame"));
      var txt = el("div", "fj-model-text");
      txt.appendChild(el("h3", null, { text: b.h }));
      txt.appendChild(el("p", null, { text: b.p }));
      blk.appendChild(txt);
      story.appendChild(blk);
    });
    root.appendChild(story);

    return root;
  }

  function pageTitle(route) {
    if (route.page === "product") {
      var p = data.products.find(function (x) { return x.id === route.id; });
      return p ? p.name + " " + p.sku + " | Fine Jewellery | Gem Experience" : "Fine Jewellery | Gem Experience";
    }
    if (route.page === "shop") {
      var bits = ["Shop all"];
      if (route.collection) bits = [route.collection.name];
      if (route.type) bits.unshift(route.type);
      return bits.join(" · ") + " | Fine Jewellery | Gem Experience";
    }
    if (route.page === "collection") {
      return (route.type ? route.type + " · " : "") +
        route.collection.name + " | Fine Jewellery | Gem Experience";
    }
    return "Fine Jewellery | Gem Experience";
  }

  function render() {
    var route = parseRoute();
    view.innerHTML = "";
    var node;
    if (route.page === "product") node = renderProduct(route.id);
    else if (route.page === "shop") node = renderShop(route);
    else if (route.page === "collection") node = renderCollection(route);
    else node = renderHome();
    document.title = pageTitle(route);
    view.appendChild(node);
    /* A product opens at the top; a list returns to where the reader left
       it, so coming back from a piece does not start the list over. */
    var y = route.page === "product" || !restoreNext ? 0 : (scrollMemo()[location.hash || "#/"] || 0);
    restoreNext = true;
    window.scrollTo(0, y);
    if (y) setTimeout(function () { window.scrollTo(0, y); }, 120); // after images settle
  }

  /* Scroll position per list route, kept for the tab (sessionStorage), so it
     also survives leaving for another page and coming back with Back. */
  function scrollMemo() {
    try { return JSON.parse(sessionStorage.getItem("fj_scroll") || "{}"); } catch (e) { return {}; }
  }
  function rememberScroll(hash) {
    try {
      var m = scrollMemo();
      m[hash || "#/"] = window.scrollY;
      sessionStorage.setItem("fj_scroll", JSON.stringify(m));
    } catch (e) { /* private mode: nothing to keep */ }
  }
  /* The first render restores only when the reader came Back to this page;
     after that, every return to a list does. */
  var restoreNext = (function () {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    return nav ? nav.type === "back_forward" : false;
  })();
  var shownHash = location.hash;
  window.addEventListener("hashchange", function () {
    rememberScroll(shownHash);
    shownHash = location.hash;
    render();
  });
  window.addEventListener("pagehide", function () { rememberScroll(location.hash); });
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  render();
})();
