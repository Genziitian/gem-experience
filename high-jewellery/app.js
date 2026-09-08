/* High Jewellery — Gem Experience
   Logic ported from the `Component extends DCLogic` block in the Claude Design
   prototype `High Jewellery.dc.html`. Product data, filter groups, price bands,
   sort keys, story truncation, finish/size rules, spec strip and related-product
   ordering all follow the prototype exactly.

   Two things the prototype left to the design tool, resolved here:
   - Displayed names come from the prototype's `name1..name12` prop defaults
     (which override the raw `products[].name`), per `nm(p)`.
   - The PDP gallery image slots (`hj-pdp-<id>-1..6`) were never filled in the
     design, so each product leads with its own artwork and the remaining tiles
     are drawn deterministically from the High Jewellery image pool. */

(function () {
  "use strict";

  var IMG = "img/";

  /* Product detail pages are switched off for now: product cards render inert
     and `#/product/<id>` falls back to the listing. The detail view itself is
     untouched below — flip this to true to bring it back. */
  var PRODUCT_PAGE_ENABLED = false;

  // ---------------------------------------------------------------- data

  var products = [
    { id: "serengeti", name: "Wimbi", materials: "6.4ct Tanzanite, Diamond and Platinum", price: 48600, type: "Rings", collection: "Tanzania Universe", occasion: "Collector", carat: "6.42ct", origin: "Merelani, Tanzania", metal: "Platinum 950", ref: "HJ-1042", story: "One rough stone, followed from the Merelani hills to the bench, cut to hold a single line of blue at the centre and set in a halo that disappears when worn." },
    { id: "kilimanjaro", name: "Ocean Wave", materials: "Tanzanite, Diamond and 18k White Gold", price: 186000, type: "Necklaces", collection: "Tanzania Universe", occasion: "Gala", carat: "41.80ct total", origin: "Merelani, Tanzania", metal: "18k White Gold", ref: "HJ-1108", story: "Thirty-one graduated tanzanites, matched over four years, laid along a collar that sits flat against the skin." },
    { id: "rift", name: "Tsavorite necklace", materials: "9.1ct Tanzanite Pair and Diamond", price: 92400, type: "Earrings", collection: "Tanzania Universe", occasion: "Gala", carat: "9.14ct pair", origin: "Merelani, Tanzania", metal: "Platinum 950", ref: "HJ-1073", story: "A matched pair from one crystal, split at the mine and cut together so the two drops read as one colour under any light." },
    { id: "mahenge", name: "Samaah", materials: "Spinel, Diamond and Rose Gold", price: 64200, type: "Bracelets", collection: "Origin", occasion: "Collector", carat: "22.60ct total", origin: "Mahenge, Tanzania", metal: "18k Rose Gold", ref: "HJ-0994", story: "Mahenge spinel in the pink that made the deposit famous, held in rose gold links that take the colour warmer still." },
    { id: "usambara", name: "Flamenco", materials: "Tsavorite Garnet and 18k Yellow Gold", price: 58900, type: "Bracelets", collection: "Origin", occasion: "Collector", carat: "18.30ct total", origin: "Umba Valley, Tanzania", metal: "18k Yellow Gold", ref: "HJ-1011", story: "A single band of yellow gold, hand-raised, channelled with tsavorite the colour of the forest the stones came out of." },
    { id: "merelani", name: "Spinel Balls necklace", materials: "12.3ct Tanzanite and Platinum", price: 124000, type: "Necklaces", collection: "Tanzania Universe", occasion: "Bridal", carat: "12.31ct", origin: "Merelani, Tanzania", metal: "Platinum 950", ref: "HJ-1120", story: "The largest stone from the 2024 parcel, cut as a cushion and hung from a chain fine enough to leave it alone." },
    { id: "oldoinyo", name: "Mediterranea", materials: "Diamond and Platinum", price: 312000, type: "Tiaras", collection: "Heritage", occasion: "Bridal", carat: "28.40ct total", origin: "Various", metal: "Platinum 950", ref: "HJ-0921", story: "Built as a tiara, worn as a necklace: the frame separates into three, each part finished to be seen on its own." },
    { id: "zanzibar", name: "Zanzibar Sautoir", materials: "South Sea Pearl, Diamond and White Gold", price: 78500, type: "Necklaces", collection: "Heritage", occasion: "Gifting", carat: "11-14mm pearls", origin: "Indian Ocean", metal: "18k White Gold", ref: "HJ-1055", story: "Eighty-four pearls graded over two seasons, knotted by hand at a length that can be worn long, doubled or knotted." },
    { id: "ruvuma", name: "Wimbi", materials: "Emerald, Diamond and Platinum", price: 96000, type: "Rings", collection: "Origin", occasion: "Collector", carat: "7.80ct", origin: "Ruvuma, Tanzania", metal: "Platinum 950", ref: "HJ-1088", story: "An emerald left in its natural proportion rather than cut down for symmetry, set with a claw at each corner and nothing else." },
    { id: "selous", name: "Selous Cascade Earrings", materials: "Tanzanite, Diamond and White Gold", price: 142000, type: "Earrings", collection: "Nocturne", occasion: "Gala", carat: "26.90ct total", origin: "Merelani, Tanzania", metal: "18k White Gold", ref: "HJ-1131", story: "Seven stones falling in decreasing size, articulated at every joint so the whole line moves with the head." },
    { id: "ngorongoro", name: "Ngorongoro Choker", materials: "Sapphire, Diamond and 18k White Gold", price: 158000, type: "Necklaces", collection: "Nocturne", occasion: "Gala", carat: "33.10ct total", origin: "Tunduru, Tanzania", metal: "18k White Gold", ref: "HJ-1099", story: "Tunduru sapphires in six shades of blue, arranged dark to light so the choker reads as a single gradient at distance." },
    { id: "manyara", name: "Manyara Solitaire", materials: "4.8ct Tanzanite and Platinum", price: 38400, type: "Rings", collection: "Tanzania Universe", occasion: "Bridal", carat: "4.81ct", origin: "Merelani, Tanzania", metal: "Platinum 950", ref: "HJ-1026", story: "The plainest setting we make: four platinum claws, a knife-edge band, and a stone chosen for depth of colour over size." }
  ];

  var groupDefs = [
    { key: "type", label: "Category", opts: ["Rings", "Necklaces", "Earrings", "Bracelets", "Tiaras"] },
    { key: "price", label: "Price", opts: ["Under $50,000", "$50,000 – $100,000", "$100,000 – $200,000", "Above $200,000"] },
    { key: "collection", label: "Collection", opts: ["Tanzania Universe", "Origin", "Nocturne", "Heritage"] },
    { key: "occasion", label: "Occasion", opts: ["Bridal", "Gala", "Collector", "Gifting"] }
  ];

  var sortLabels = { featured: "Featured", asc: "Price low to high", desc: "Price high to low" };

  /* The design filled three editorial tiles; a fourth banner is produced by the
     "every third product" rule, so the three cycle. */
  var EDITORIAL = ["editorial-1", "editorial-2", "editorial-3"];

  var BANNER_LABEL = "Discover High Jewellery";

  /* Mobile lays the grid out two-up, so the banner falls after every fourth
     product (two full rows) and spans the width. Desktop keeps the design's
     four-column rhythm: three products then a banner. */
  var MOBILE = window.matchMedia("(max-width: 700px)");
  function perBanner() { return MOBILE.matches ? 4 : 3; }

  /* Only two banners run on the page — after the 4th and 8th product on mobile,
     the 3rd and 6th on desktop. Products run uninterrupted after that. */
  var MAX_BANNERS = 2;
  var FILLERS = [
    "alt-serengeti", "alt-collar", "alt-earrings", "alt-kilimanjaro", "alt-rift",
    "alt-mahenge", "alt-ring", "alt-merelani", "alt-oldoinyo"
  ];

  var LINKS = [
    { label: "Product details", d: "M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
    { label: "Contact us", d: "M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" },
    { label: "Care and services", d: "M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3ZM18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9L18 15Z" },
    { label: "Shipping and returns", d: "M14 17h-9V5h9v12ZM14 9h4l3 3v5h-7M7.5 20a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM17.5 20a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" }
  ];

  var STAT_ICONS = {
    Stone: "M6 3h12l3 6-9 12L3 9l3-6ZM3 9h18M9 3 6 9l6 12M15 3l3 6-6 12",
    Origin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM12 12a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
    Metal: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
    Reference: "M3 8h18v8H3V8ZM7 11v2M11 11v2M15 11v2M19 11v2"
  };

  // --------------------------------------------------------------- state

  var state = {
    view: "grid",
    pid: null,
    sortKey: "featured",
    sortOpen: false,
    drawerOpen: false,
    active: {},
    size: 0,
    finish: 0,
    storyOpen: false,
    wished: {}
  };

  // ------------------------------------------------------------- helpers

  function band(p) {
    if (p.price < 50000) return "Under $50,000";
    if (p.price < 100000) return "$50,000 – $100,000";
    if (p.price < 200000) return "$100,000 – $200,000";
    return "Above $200,000";
  }

  function sel(key) { return state.active[key] || []; }

  function matches(p) {
    return groupDefs.every(function (g) {
      var s = sel(g.key);
      if (!s.length) return true;
      return s.indexOf(g.key === "price" ? band(p) : p[g.key]) !== -1;
    });
  }

  function toggle(key, val) {
    var cur = (state.active[key] || []).slice();
    var i = cur.indexOf(val);
    if (i === -1) cur.push(val); else cur.splice(i, 1);
    state.active[key] = cur;
    render();
  }

  function indexOf(p) {
    for (var i = 0; i < products.length; i++) if (products[i].id === p.id) return i;
    return -1;
  }

  function cardImg(p) { return IMG + p.id + ".webp"; }

  /* The design never filled the six PDP slots, so build a deterministic set:
     the product's own artwork first, then filler frames offset by its index. */
  function galleryFor(p) {
    var base = indexOf(p);
    var out = [cardImg(p)];
    var alt = IMG + "alt-" + p.id + ".webp";
    var owned = ["serengeti", "kilimanjaro", "rift", "mahenge", "merelani", "oldoinyo"];
    if (owned.indexOf(p.id) !== -1) out.push(alt);
    for (var i = 0; out.length < 6; i++) {
      var f = IMG + FILLERS[(base * 3 + i) % FILLERS.length] + ".webp";
      if (out.indexOf(f) === -1) out.push(f);
    }
    return out.slice(0, 6);
  }

  function storyFor(p) {
    if (state.storyOpen || p.story.length <= 150) return p.story;
    return p.story.slice(0, 150).replace(/[ ,.]+$/, "") + "…";
  }

  function finishesFor(p) {
    return [p.metal, "18k Yellow Gold"].map(function (m, i) {
      return {
        label: m,
        hex: /Yellow/.test(m) ? "#c9a227" : /Rose/.test(m) ? "#d8a08c" : "#c6c9cd",
        ring: i === state.finish
          ? "0 0 0 2px #fff inset, 0 0 0 1px #201e1d"
          : "0 0 0 1px #e5e7eb"
      };
    });
  }

  function sizesFor(p) {
    return p.type === "Rings" ? ["52", "54", "56"] : ["One size", "Made to order"];
  }

  function current() {
    for (var i = 0; i < products.length; i++) if (products[i].id === state.pid) return products[i];
    return products[0];
  }

  function visible() {
    var list = products.filter(matches);
    if (state.sortKey === "asc") list = list.slice().sort(function (a, b) { return a.price - b.price; });
    if (state.sortKey === "desc") list = list.slice().sort(function (a, b) { return b.price - a.price; });
    return list;
  }

  function activeChips() {
    var out = [];
    groupDefs.forEach(function (g) {
      sel(g.key).forEach(function (v) { out.push({ key: g.key, label: v }); });
    });
    return out;
  }

  // -------------------------------------------------------------- render

  var el = function (tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  };

  function svg(size, opts, paths) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("width", size);
    s.setAttribute("height", size);
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", opts.fill || "none");
    s.setAttribute("aria-hidden", "true");
    if (opts.stroke) s.setAttribute("stroke", opts.stroke);
    if (opts.sw) s.setAttribute("stroke-width", opts.sw);
    if (opts.round) { s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); }
    paths.forEach(function (d) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      s.appendChild(p);
    });
    return s;
  }

  function circleSvg(size, opts, shapes) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("width", size); s.setAttribute("height", size);
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none");
    s.setAttribute("stroke", opts.stroke); s.setAttribute("stroke-width", opts.sw);
    s.setAttribute("aria-hidden", "true");
    shapes.forEach(function (sh) {
      var n = document.createElementNS(ns, sh.t);
      for (var k in sh) if (k !== "t") n.setAttribute(k, sh[k]);
      s.appendChild(n);
    });
    return s;
  }

  function frame(src, alt, cls) {
    var f = el("div", cls || "frame");
    var i = el("img", null, { src: src, alt: alt, loading: "lazy", decoding: "async" });
    f.appendChild(i);
    return f;
  }

  function productCard(p, opts) {
    opts = opts || {};
    var cls = opts.related ? "card card--related" : "card";
    /* When detail pages are off the card is a plain div, so there is nothing to
       click, focus, middle-click or open in a new tab — inert, not just blocked. */
    var a = PRODUCT_PAGE_ENABLED
      ? el("a", cls, { href: "#/product/" + p.id })
      : el("div", cls + " card--inert");
    a.appendChild(frame(cardImg(p), p.name));
    if (opts.related) {
      var n = el("span", "related-name"); n.textContent = p.name;
      var m = el("span", "related-materials"); m.textContent = p.materials;
      a.appendChild(n); a.appendChild(m);
    } else {
      var info = el("div", "card-info");
      var nm = el("span", "card-name"); nm.textContent = p.name;
      var mt = el("span", "card-materials"); mt.textContent = p.materials;
      info.appendChild(nm); info.appendChild(mt);
      a.appendChild(info);
    }
    return a;
  }

  /* Sits outside the card so it stays valid markup when the card is a link.
     No destination is wired up yet — point this at the booking flow. */
  function bookButton(p) {
    var b = el("button", "card-book", {
      type: "button", "aria-label": "Book an appointment for " + p.name
    });
    b.textContent = "Book an Appointment";
    return b;
  }

  function renderGrid(root) {
    var list = visible();
    var chips = activeChips();

    // intro
    var intro = el("section", "intro");
    var crumbs = el("nav", "crumbs", { "aria-label": "Breadcrumb" });
    var c1 = el("a", null, { href: "#/" }); c1.textContent = "Home";
    var c2 = el("a", null, { href: "#/" }); c2.textContent = "Jewellery";
    var sep1 = el("span"); sep1.textContent = "/";
    var sep2 = el("span"); sep2.textContent = "/";
    var here = el("span", "crumbs-here", { "aria-current": "page" }); here.textContent = "High Jewellery";
    crumbs.appendChild(c1); crumbs.appendChild(sep1); crumbs.appendChild(c2); crumbs.appendChild(sep2); crumbs.appendChild(here);
    var h1 = el("h1", "intro-title"); h1.textContent = "High Jewellery";
    var lede = el("p", "intro-lede");
    lede.textContent = "Singular pieces, each cut from a stone we followed out of the ground.";
    intro.appendChild(crumbs); intro.appendChild(h1); intro.appendChild(lede);
    root.appendChild(intro);

    // toolbar
    var bar = el("div", "toolbar");
    var count = el("div", "toolbar-count");
    count.textContent = list.length + (list.length === 1 ? " design" : " designs");
    bar.appendChild(count);

    var sortWrap = el("div", "toolbar-sort");
    var sortBtn = el("button", "toolbar-btn", {
      type: "button", "aria-haspopup": "true", "aria-expanded": String(state.sortOpen)
    });
    var sortTxt = el("span"); sortTxt.textContent = "Sort by";
    sortBtn.appendChild(sortTxt);
    sortBtn.appendChild(svg(12, { stroke: "currentColor", sw: 1.5 }, ["M5 9l7 7 7-7"]));
    sortBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      state.sortOpen = !state.sortOpen;
      render();
    });
    sortWrap.appendChild(sortBtn);

    if (state.sortOpen) {
      var menu = el("div", "sort-menu", { role: "menu" });
      Object.keys(sortLabels).forEach(function (k) {
        var o = el("button", "sort-opt", {
          type: "button", role: "menuitemradio", "aria-checked": String(k === state.sortKey)
        });
        o.textContent = sortLabels[k];
        o.addEventListener("click", function () {
          state.sortKey = k; state.sortOpen = false; render();
        });
        menu.appendChild(o);
      });
      sortWrap.appendChild(menu);
    }
    bar.appendChild(sortWrap);

    var filterBtn = el("button", "toolbar-btn toolbar-filter", { type: "button" });
    var fTxt = el("span"); fTxt.textContent = "Filter";
    filterBtn.appendChild(fTxt);
    if (chips.length) {
      var fCount = el("span", "toolbar-active");
      fCount.textContent = "(" + chips.length + ")";
      filterBtn.appendChild(fCount);
    }
    filterBtn.addEventListener("click", function () { openDrawer(); });
    bar.appendChild(filterBtn);
    root.appendChild(bar);

    // active chips
    if (chips.length) {
      var chipRow = el("div", "chips");
      chips.forEach(function (c) {
        var b = el("button", "chip", { type: "button" });
        var l = el("span"); l.textContent = c.label;
        var x = el("span"); x.textContent = "×";
        b.appendChild(l); b.appendChild(x);
        b.setAttribute("aria-label", "Remove filter " + c.label);
        b.addEventListener("click", function () { toggle(c.key, c.label); });
        chipRow.appendChild(b);
      });
      var clear = el("button", "chips-clear", { type: "button" });
      clear.textContent = "Clear all";
      clear.addEventListener("click", clearAll);
      chipRow.appendChild(clear);
      root.appendChild(chipRow);
    }

    // grid with an editorial banner after every third product
    var grid = el("section", "grid");
    var b = 0;
    list.forEach(function (p, i) {
      var cell = el("div", "cell");
      cell.appendChild(productCard(p));
      cell.appendChild(bookButton(p));
      grid.appendChild(cell);
      if ((i + 1) % perBanner() === 0 && b < MAX_BANNERS) {
        b++;
        var bc = el("div", "cell cell--banner");
        var ban = el("a", "banner", { href: "#/" });
        ban.appendChild(el("img", null, {
          src: IMG + EDITORIAL[(b - 1) % EDITORIAL.length] + ".webp",
          alt: "High Jewellery editorial", loading: "lazy", decoding: "async"
        }));
        var body = el("div", "banner-body");
        var lk = el("span", "banner-link");
        lk.textContent = BANNER_LABEL;
        body.appendChild(lk);
        ban.appendChild(body);
        bc.appendChild(ban);
        grid.appendChild(bc);
      }
    });
    root.appendChild(grid);

    if (!list.length) {
      var empty = el("div", "empty");
      var t = el("span", "empty-title");
      t.textContent = "Nothing matches those filters.";
      var eb = el("button", "empty-btn", { type: "button" });
      eb.textContent = "Clear filters";
      eb.addEventListener("click", clearAll);
      empty.appendChild(t); empty.appendChild(eb);
      root.appendChild(empty);
    }
  }

  function renderProduct(root) {
    var p = current();
    var pdp = el("section", "pdp");

    // gallery — first tile spans both columns at 4/5
    var gal = el("div", "pdp-gallery");
    galleryFor(p).forEach(function (src, i) {
      var shot = frame(src, p.name + " — view " + (i + 1), "shot" + (i === 0 ? " shot--lead" : ""));
      shot.querySelector("img").setAttribute("loading", i === 0 ? "eager" : "lazy");
      gal.appendChild(shot);
    });
    pdp.appendChild(gal);

    // panel
    var panel = el("div", "pdp-panel");

    var head = el("div", "pdp-head");
    var h1 = el("h1", "pdp-title"); h1.textContent = p.name;
    var wish = el("button", "pdp-wish", {
      type: "button", "aria-pressed": String(!!state.wished[p.id]), "aria-label": "Save " + p.name
    });
    wish.appendChild(svg(22, { stroke: "#201e1d", sw: 1 },
      ["M12 20s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5C19 15.6 12 20 12 20Z"]));
    wish.addEventListener("click", function () {
      state.wished[p.id] = !state.wished[p.id];
      render();
    });
    head.appendChild(h1); head.appendChild(wish);
    panel.appendChild(head);

    var mat = el("span", "pdp-materials"); mat.textContent = p.materials;
    var price = el("span", "pdp-price"); price.textContent = "Price on enquiry";
    panel.appendChild(mat); panel.appendChild(price);

    var story = el("p", "pdp-story"); story.textContent = storyFor(p);
    panel.appendChild(story);
    if (p.story.length > 150) {
      var more = el("button", "pdp-more", { type: "button" });
      more.textContent = state.storyOpen ? "Read less" : "Read more";
      more.addEventListener("click", function () { state.storyOpen = !state.storyOpen; render(); });
      panel.appendChild(more);
    }

    // metal
    var metalBlock = el("div", "opt-block opt-block--metal");
    var metalLabel = el("span", "opt-label"); metalLabel.textContent = "Metal: " + p.metal;
    var fRow = el("div", "finishes");
    finishesFor(p).forEach(function (fi, i) {
      var s = el("button", "finish", { type: "button", "aria-label": fi.label, "aria-pressed": String(i === state.finish) });
      s.style.background = fi.hex;
      s.style.boxShadow = fi.ring;
      s.addEventListener("click", function () { state.finish = i; render(); });
      fRow.appendChild(s);
    });
    metalBlock.appendChild(metalLabel); metalBlock.appendChild(fRow);
    panel.appendChild(metalBlock);

    // size
    var sizeBlock = el("div", "opt-block opt-block--size");
    var sizeLabel = el("span", "opt-label"); sizeLabel.textContent = "Size:";
    var sRow = el("div", "sizes");
    sizesFor(p).forEach(function (z, i) {
      var s = el("button", "size", { type: "button", "aria-pressed": String(i === state.size) });
      s.textContent = z;
      s.addEventListener("click", function () { state.size = i; render(); });
      sRow.appendChild(s);
    });
    sizeBlock.appendChild(sizeLabel); sizeBlock.appendChild(sRow);
    panel.appendChild(sizeBlock);

    var guide = el("a", "size-guide", { href: "#/" }); guide.textContent = "Size Guide";
    panel.appendChild(guide);

    var ctas = el("div", "ctas");
    var c1 = el("button", "cta cta--primary", { type: "button" }); c1.textContent = "Enquire now";
    var c2 = el("button", "cta cta--ghost", { type: "button" }); c2.textContent = "Book a private viewing";
    ctas.appendChild(c1); ctas.appendChild(c2);
    panel.appendChild(ctas);

    var links = el("div", "pdp-links");
    LINKS.forEach(function (l) {
      var a = el("a", "pdp-link", { href: "#/" });
      a.appendChild(svg(18, { stroke: "#201e1d", sw: 1.4, round: true }, [l.d]));
      var sp = el("span"); sp.textContent = l.label;
      a.appendChild(sp);
      links.appendChild(a);
    });
    panel.appendChild(links);
    pdp.appendChild(panel);
    root.appendChild(pdp);

    // spec strip
    var specs = el("div", "specs");
    [["Stone", p.carat], ["Origin", p.origin], ["Metal", p.metal], ["Reference", p.ref]].forEach(function (pair) {
      var s = el("div", "spec");
      s.appendChild(svg(26, { stroke: "#201e1d", sw: 1.2, round: true }, [STAT_ICONS[pair[0]]]));
      var k = el("span", "spec-k"); k.textContent = pair[0];
      var v = el("span", "spec-v"); v.textContent = pair[1];
      s.appendChild(k); s.appendChild(v);
      specs.appendChild(s);
    });
    root.appendChild(specs);

    // film band
    var film = el("div", "film");
    film.appendChild(el("img", null, {
      src: IMG + "editorial-2.webp", alt: "", loading: "lazy", decoding: "async"
    }));
    var fBody = el("div", "film-body");
    var play = el("button", "film-play", { type: "button", "aria-label": "Play film" });
    play.appendChild(svg(20, { fill: "#fff" }, ["M8 5.5v13l11-6.5z"]));
    var fLabel = el("span", "film-label");
    fLabel.textContent = "The making of " + p.collection;
    fBody.appendChild(play); fBody.appendChild(fLabel);
    film.appendChild(fBody);
    root.appendChild(film);

    // related — same collection first, then the rest
    var rel = products.filter(function (q) { return q.id !== p.id && q.collection === p.collection; })
      .concat(products.filter(function (q) { return q.id !== p.id && q.collection !== p.collection; }))
      .slice(0, 4);

    var relWrap = el("section", "related");
    var relHead = el("div", "related-head");
    var rt = el("span", "related-title"); rt.textContent = "You may also like";
    var ra = el("button", "related-all", { type: "button" }); ra.textContent = "View all";
    ra.addEventListener("click", function () { location.hash = "#/"; });
    relHead.appendChild(rt); relHead.appendChild(ra);
    var relGrid = el("div", "related-grid");
    rel.forEach(function (q) { relGrid.appendChild(productCard(q, { related: true })); });
    relWrap.appendChild(relHead); relWrap.appendChild(relGrid);
    root.appendChild(relWrap);
  }

  function renderDrawer() {
    var host = document.getElementById("drawer-host");
    host.innerHTML = "";
    if (!state.drawerOpen) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";

    var list = visible();
    var d = el("div", "drawer", { role: "dialog", "aria-modal": "true", "aria-label": "Filter" });
    var scrim = el("div", "drawer-scrim");
    scrim.addEventListener("click", closeDrawer);
    d.appendChild(scrim);

    var panel = el("div", "drawer-panel");
    var head = el("div", "drawer-head");
    var t = el("span", "drawer-title"); t.textContent = "Filter";
    var x = el("button", "drawer-close", { type: "button", "aria-label": "Close filters" });
    x.textContent = "×";
    x.addEventListener("click", closeDrawer);
    head.appendChild(t); head.appendChild(x);
    panel.appendChild(head);

    var body = el("div", "drawer-body");
    groupDefs.forEach(function (g) {
      var grp = el("div", "fgroup");
      var gl = el("span", "fgroup-label"); gl.textContent = g.label;
      grp.appendChild(gl);
      g.opts.forEach(function (o) {
        var checked = sel(g.key).indexOf(o) !== -1;
        var row = el("button", "fopt", {
          type: "button", role: "checkbox", "aria-checked": String(checked)
        });
        row.appendChild(el("span", "fopt-box"));
        var ol = el("span", "fopt-label"); ol.textContent = o;
        var oc = el("span", "fopt-count");
        oc.textContent = products.filter(function (p) {
          return (g.key === "price" ? band(p) : p[g.key]) === o;
        }).length;
        row.appendChild(ol); row.appendChild(oc);
        row.addEventListener("click", function () { toggle(g.key, o); });
        grp.appendChild(row);
      });
      body.appendChild(grp);
    });
    panel.appendChild(body);

    var foot = el("div", "drawer-foot");
    var apply = el("button", "drawer-apply", { type: "button" });
    apply.textContent = "Show " + list.length + (list.length === 1 ? " design" : " designs");
    apply.addEventListener("click", closeDrawer);
    var clear = el("button", "drawer-clear", { type: "button" });
    clear.textContent = "Clear";
    clear.addEventListener("click", clearAll);
    foot.appendChild(apply); foot.appendChild(clear);
    panel.appendChild(foot);

    d.appendChild(panel);
    host.appendChild(d);
    x.focus();
  }

  function openDrawer() { state.drawerOpen = true; state.sortOpen = false; render(); }
  function closeDrawer() { state.drawerOpen = false; render(); }
  function clearAll() { state.active = {}; render(); }

  function render() {
    var root = document.getElementById("view");
    root.innerHTML = "";
    if (state.view === "product") {
      renderProduct(root);
      document.title = current().name + " — High Jewellery | Gem Experience";
    } else {
      renderGrid(root);
      document.title = "High Jewellery — Gem Experience";
    }
    renderDrawer();
  }

  // -------------------------------------------------------------- routing

  function readHash() {
    var m = PRODUCT_PAGE_ENABLED ? /^#\/product\/([\w-]+)$/.exec(location.hash) : null;
    if (m) {
      for (var i = 0; i < products.length; i++) {
        if (products[i].id === m[1]) {
          state.view = "product";
          state.pid = m[1];
          return;
        }
      }
    }
    state.view = "grid";
    state.pid = null;
  }

  function onRoute() {
    var was = state.view + ":" + state.pid;
    readHash();
    if (was !== state.view + ":" + state.pid) {
      state.size = 0; state.finish = 0; state.storyOpen = false; state.drawerOpen = false;
      window.scrollTo(0, 0);
    }
    render();
  }

  window.addEventListener("hashchange", onRoute);

  /* Banner cadence differs either side of the breakpoint, so redraw on cross.
     addListener is the fallback for older WebKit. */
  if (MOBILE.addEventListener) MOBILE.addEventListener("change", render);
  else if (MOBILE.addListener) MOBILE.addListener(render);

  document.addEventListener("click", function () {
    if (state.sortOpen) { state.sortOpen = false; render(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (state.drawerOpen) closeDrawer();
    else if (state.sortOpen) { state.sortOpen = false; render(); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("menu-btn").addEventListener("click", openDrawer);
    onRoute();
  });
})();
