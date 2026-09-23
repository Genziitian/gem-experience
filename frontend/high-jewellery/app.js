/* High Jewellery — Gem Experience
   The collection listing follows the Claude Design prototype
   `High Jewellery.dc.html`. The product page follows the PDP blueprint:
   breadcrumb, gallery, title, variants, CTA, accordions, cross-sell,
   editorial, FAQ and concierge band, with a sticky CTA on mobile.

   There is no pricing anywhere — no price field, no price filter, no price
   sort. Pieces are quoted on enquiry, so sorting is alphabetical instead.

   The design never filled the PDP gallery slots, so each piece leads with its
   own artwork and the remaining frames come from the High Jewellery pool. */

(function () {
  "use strict";

  /* This page builds its own header rather than going through GemShell, so the
     bag drawer is started here. Without it "Add to selection" changes a number
     in the corner and nothing else. */
  if (window.GemMiniCart) window.GemMiniCart.init({ prefix: "../" });


  var IMG = "img/";

  var PRODUCT_PAGE_ENABLED = true;

  // ---------------------------------------------------------------- data

  /* Catalog lives in data.js so the admin can read and rewrite it. Order
     follows the client's list; banner slots fall after 4 and 12. */
  var products = (window.HJ_DATA && window.HJ_DATA.products) || [];

  /* Where the jewellery sits in each frame, as a percentage down the image,
     measured per photograph rather than guessed once for all of them. The
     phone crops every frame to a square, and a single fixed value cut the
     necklace off one shot while framing the next correctly — the pieces are
     worn at the ear, the throat and the wrist, and the shots range from a
     tight crop on a collarbone to a full-length figure. Only portrait frames
     have an entry; a square plate is not cropped and needs none. */
  var FOCAL = (window.HJ_DATA && window.HJ_DATA.focal) || {};

  var groupDefs = [
    { key: "type", label: "Category", opts: ["Gemstones", "Rings", "Necklaces", "Earrings", "Bracelets", "Tiaras"] },
    { key: "collection", label: "Collection", opts: ["Tanzania Universe", "Origin", "Nocturne", "Heritage"] },
    { key: "occasion", label: "Occasion", opts: ["Bridal", "Gala", "Collector", "Gifting"] }
  ];

  var sortLabels = { featured: "Featured", asc: "Name A \u2013 Z", desc: "Name Z \u2013 A" };

  /* The two supplied interlink images, one per banner slot. */
  var EDITORIAL = ["interlink-1", "interlink-2"];

  var BANNER_LABEL = "Discover High Jewellery";

  /* Two banners at fixed positions: four products, banner, eight products,
     banner, then the rest run uninterrupted. Both numbers divide evenly into
     the two-up mobile grid and the four-up desktop grid, so the rhythm holds
     at either breakpoint. */
  var BANNER_AFTER = [4, 12];
  var STAT_ICONS = {
    Stone: "M6 3h12l3 6-9 12L3 9l3-6ZM3 9h18M9 3 6 9l6 12M15 3l3 6-6 12",
    Origin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM12 12a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
    Metal: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
    Gemstone: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
    Jewellery: "M12 2L3 9l9 13 9-13-9-14ZM5.5 9h13M8 9l4 10 4-10",
    Reference: "M3 8h18v8H3V8ZM7 11v2M11 11v2M15 11v2M19 11v2",
    Category: "M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2ZM7.5 7.5v.01",
    Collection: "M12 3 3 7.5l9 4.5 9-4.5L12 3ZM3 12.5 12 17l9-4.5M3 17 12 21.5 21 17",
    Carat: "M12 2L4 8l8 14 8-14-8-6ZM4 8h16M9 8l3 14 3-14",
    Cut: "M12 2L3 9l9 13 9-13-9-14ZM5.5 9h13M8 9l4 10 4-10",
    Colour: "M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9Zm0 15a6 6 0 0 1 0-12v12Z"
  };

  // --------------------------------------------------------------- state

  var state = {
    view: "grid",
    pid: null,
    sortKey: "featured",
    sortOpen: false,
    drawerOpen: false,
    active: {},
    storyOpen: false,
    acc: null,
    faq: null,
    wished: {}
  };

  // ------------------------------------------------------------- helpers

  function sel(key) { return state.active[key] || []; }

  function matches(p) {
    return groupDefs.every(function (g) {
      var s = sel(g.key);
      if (!s.length) return true;
      return s.indexOf(p[g.key]) !== -1;
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

  /* Every piece now has its own shoot in img/pieces/<id>: p*.webp are the
     stills on white, m*.webp the model frames. The gallery takes the stills,
     all of them — the count varies by piece, and the carousel is built from
     the list rather than a fixed six. Anything not yet photographed falls
     back to the old artwork plus filler frames. */
  function galleryFor(p) {
    /* Only ever this piece's own frames. There used to be a shared pool of
       filler artwork topping every gallery up to four, which put another
       piece's necklace on the page under this piece's name — Celestine led
       with its own earrings and then showed a blue marquise collar that has
       nothing to do with it. A piece with one photograph shows one. */
    if (p.gallery && p.gallery.length) return p.gallery.slice();
    return [cardImg(p)];
  }

  /* The four editorial rows below the spec strip. They show this piece on the
     model and nothing else, so a piece without model frames gets no rows at
     all rather than someone else's photograph. */
  function modelsFor(p) {
    return (p.models || []).slice(0, 4);
  }

  /* Copy for the editorial rows, written from the piece's own fields so no two
     pages carry the same four paragraphs. Only as many rows are built as the
     piece has model frames, and each row is captioned for its position in the
     sequence: the piece, the stone, the making, the wearing. */
  function real(v) { return v && v !== "—" ? v : null; }

  /* "A earring" read as a typo on every earring page. */
  function article(w) { return /^[aeiou]/i.test(w) ? "An" : "A"; }

  function storyBlocksFor(p) {
    var shots = modelsFor(p);
    if (!shots.length) return [];

    /* Materials often name three stones and then the metal. Taking the first
       turned Celestine's "Diamond, Sapphire and Aquamarine" into a caption
       about diamond alone, so the whole list is used — minus the metal, which
       has its own row below, and minus the comma that stripping it leaves. */
    var stone = (real(p.gemstone) || real(p.materials) || "")
      .replace(/\s*(,|and)\s*(18k\s+\w+\s+Gold|Platinum(\s+\d+)?|Rose Gold|White Gold|Yellow Gold)\s*$/i, "")
      .replace(/[,\s]+$/, "")
      .trim()
      /* stripping the metal off "Rubellite, Diamond and 18k Yellow Gold"
         leaves a two-item list still punctuated as three. Only a list whose
         "and" went with the metal needs this; "Tanzanite, Aquamarine and
         Diamond" keeps its own. */
      .replace(/^([^,]+),\s*([^,]+)$/, function (m, a, b) {
        return / and /i.test(m) ? m : a + " and " + b;
      });
    var manyStones = /,| and /.test(stone);
    var carat = real(p.carat);
    var origin = real(p.origin);
    var metal = real(p.metal);
    var kind = (p.type || "piece").replace(/s$/, "").toLowerCase();

    var blocks = [
      { h: p.name,
        p: real(p.story) ||
           (article(kind) + " " + kind + " in " + (p.materials || "our house materials") +
            ", made in one run at the bench and finished as a single piece.") },
      { h: manyStones ? "The stones" : "The stone",
        p: stone + (carat ? ", " + carat : "") +
           (origin ? ", brought out of " + origin : ", chosen at the source") +
           ". Cut for colour before weight, so the tone holds from every angle." },
      { h: "At the bench",
        p: (metal ? metal + " raised, pierced and polished by one hand" :
                    "Raised, pierced and polished by one hand") +
           " from start to finish — then worn for a day before it is allowed to leave." },
      { h: "Worn",
        p: "Weight is balanced on the body before anything is set, so the " + kind +
           " sits where it should and stays there through an evening." }
    ];

    return shots.map(function (src, i) {
      return { img: src, h: blocks[i].h, p: blocks[i].p };
    });
  }

  function storyFor(p) {
    if (state.storyOpen || p.story.length <= 150) return p.story;
    return p.story.slice(0, 150).replace(/[ ,.]+$/, "") + "…";
  }

  function current() {
    for (var i = 0; i < products.length; i++) if (products[i].id === state.pid) return products[i];
    return products[0];
  }

  function visible() {
    var list = products.filter(matches);
    if (state.sortKey === "asc") list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (state.sortKey === "desc") list = list.slice().sort(function (a, b) { return b.name.localeCompare(a.name); });
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

  function openVisualiser(p) {
    if (!p || !p.visualiser || !window.GemVisualiser) return;
    var v = p.visualiser;
    window.GemVisualiser.open({
      name: p.name,
      materials: p.materials,
      carat: p.carat,
      color: v.color,
      accent: v.accent,
      ior: v.ior,
      cut: v.cut,
      cutLabel: v.cutLabel,
      attenuation: v.attenuation
    });
  }

  function productCard(p, opts) {
    opts = opts || {};
    var cls = opts.related ? "card card--related" : "card";
    /* When detail pages are off the card is a plain div, so there is nothing to
       click, focus, middle-click or open in a new tab — inert, not just blocked. */
    var a = PRODUCT_PAGE_ENABLED
      ? el("a", cls, { href: "#/product/" + p.id })
      : el("div", cls + " card--inert");
    var fr = frame(cardImg(p), p.name);
    if (p.visualiser) {
      var tag = el("span", "card-viz");
      tag.textContent = "360°";
      fr.appendChild(tag);
    }
    a.appendChild(fr);
    if (opts.related) {
      var n = el("span", "related-name"); n.textContent = p.name;
      var m = el("span", "related-materials", { title: p.materials }); m.textContent = p.materials;
      a.appendChild(n); a.appendChild(m);
    } else {
      var info = el("div", "card-info");
      var nm = el("span", "card-name"); nm.textContent = p.name;
      var mt = el("span", "card-materials", { title: p.materials }); mt.textContent = p.materials;
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
    b.addEventListener("click", function () { openEnquiry(p); });
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
      var slot = BANNER_AFTER.indexOf(i + 1);
      if (slot !== -1) {
        b++;
        var bc = el("div", "cell cell--banner");
        var ban = el("a", "banner", { href: "#/" });
        ban.appendChild(el("img", null, {
          src: IMG + EDITORIAL[slot % EDITORIAL.length] + ".webp",
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

  /* ---- product page -------------------------------------------------
     Component order follows the PDP blueprint: breadcrumb, gallery, title,
     variants, CTA, accordions, cross-sell, editorial, FAQ, concierge band,
     plus a sticky CTA on mobile once the in-panel button scrolls away.
     No pricing anywhere — enquiry only. */

  var stickyWatch = null;
  var galleryWatch = null;
  var DESKTOP = window.matchMedia("(min-width: 901px)");

  /* Enquiries go to WhatsApp. Two lines, so the CTA opens a chooser rather than
     guessing; wa.me wants digits only, no plus or spaces. */
  var WHATSAPP = [
    { label: "India", dial: "+91 73000 43093", wa: "917300043093" },
    { label: "United Arab Emirates", dial: "+971 56 720 3896", wa: "971567203896" }
  ];

  function waHref(num, p) {
    var msg = p
      ? "Hello Gem Experience \u2014 I would like to enquire about " + p.name + " (" + p.materials + ")."
      : "Hello Gem Experience \u2014 I would like to speak to an adviser.";
    return "https://wa.me/" + num.wa + "?text=" + encodeURIComponent(msg);
  }

  /* Built imperatively rather than through render(), so opening the chooser
     does not reset the gallery's scroll position. */
  function closeEnquiry() {
    var host = document.getElementById("modal-host");
    var m = host.firstChild;
    if (!m) return;
    m.classList.remove("is-on");
    document.body.style.overflow = "";
    setTimeout(function () { if (m.parentNode === host) host.removeChild(m); }, 240);
  }

  function openEnquiry(p) {
    var host = document.getElementById("modal-host");
    host.innerHTML = "";

    var wrap = el("div", "modal", { role: "dialog", "aria-modal": "true", "aria-label": "Enquire" });
    var scrim = el("div", "modal-scrim");
    scrim.addEventListener("click", closeEnquiry);
    wrap.appendChild(scrim);

    var card = el("div", "modal-card", { tabindex: "-1" });

    var x = el("button", "modal-close", { type: "button", "aria-label": "Close" });
    x.textContent = "\u00d7";
    x.addEventListener("click", closeEnquiry);
    card.appendChild(x);

    var k = el("span", "modal-kicker"); k.textContent = "Enquire";
    var t = el("h2", "modal-title"); t.textContent = p ? p.name : "Contact us";
    var sub = el("p", "modal-sub");
    sub.textContent = "Choose the line closest to you. We will pick up on WhatsApp.";
    card.appendChild(k); card.appendChild(t); card.appendChild(sub);

    var list = el("div", "modal-list");
    WHATSAPP.forEach(function (num) {
      var a = el("a", "modal-opt", {
        href: waHref(num, p), target: "_blank", rel: "noopener noreferrer"
      });
      var ic = el("span", "modal-opt-icon");
      ic.appendChild(svg(20, { fill: "currentColor" }, [
        "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.13c-.24.68-1.42 1.32-1.95 1.37-.5.05-.97.24-3.27-.68-2.75-1.08-4.5-3.87-4.64-4.05-.14-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.55-.34.73-.34.18 0 .37 0 .53.01.17.01.4-.6.62.48.24.57.8 1.96.87 2.1.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.7.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.46.2.53.32.07.11.07.64-.17 1.32Z"
      ]));
      var body = el("span", "modal-opt-body");
      var lb = el("span", "modal-opt-label"); lb.textContent = num.label;
      var dl = el("span", "modal-opt-dial"); dl.textContent = num.dial;
      body.appendChild(lb); body.appendChild(dl);
      var arrow = svg(16, { stroke: "currentColor", sw: 1.3 }, ["M4 12h14M12 6l6 6-6 6"]);
      arrow.setAttribute("class", "modal-opt-arrow");
      a.appendChild(ic); a.appendChild(body); a.appendChild(arrow);
      a.addEventListener("click", function () { setTimeout(closeEnquiry, 150); });
      list.appendChild(a);
    });
    card.appendChild(list);

    var foot = el("span", "modal-foot");
    foot.textContent = "Monday to Saturday, 9am \u2013 7pm";
    card.appendChild(foot);

    wrap.appendChild(card);
    host.appendChild(wrap);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { wrap.classList.add("is-on"); });
    card.focus();  // move focus into the dialog without ringing the close button
  }


  function accordion(cls, items, openIdx, onToggle) {
    var wrap = el("div", "acc " + cls);
    items.forEach(function (it, i) {
      var open = i === openIdx;
      var row = el("div", "acc-row");
      var btn = el("button", "acc-head", { type: "button", "aria-expanded": String(open) });
      var lbl = el("span", "acc-label"); lbl.textContent = it.label;
      var chev = svg(16, { stroke: "currentColor", sw: 1.3 }, ["M5 9l7 7 7-7"]);
      chev.setAttribute("class", "acc-chev");
      btn.appendChild(lbl); btn.appendChild(chev);
      btn.addEventListener("click", function () { onToggle(open ? null : i); });
      row.appendChild(btn);
      if (open) {
        var body = el("div", "acc-body");
        it.render(body);
        row.appendChild(body);
      }
      wrap.appendChild(row);
    });
    return wrap;
  }

  function specRows(host, pairs) {
    var dl = el("dl", "spec-list");
    pairs.forEach(function (pair) {
      if (pair[1] != null && pair[1] !== "" && pair[1] !== "\u2014") {
        var dt = el("dt"); dt.textContent = pair[0];
        var dd = el("dd"); dd.textContent = pair[1];
        dl.appendChild(dt); dl.appendChild(dd);
      }
    });
    host.appendChild(dl);
  }

  function bullets(host, lines) {
    var ul = el("ul", "acc-bullets");
    lines.forEach(function (t) { var li = el("li"); li.textContent = t; ul.appendChild(li); });
    host.appendChild(ul);
  }

  function buildGallery(p) {
    var shots = galleryFor(p);
    var gal = el("div", "gal");
    var track = el("div", "gal-track");
    shots.forEach(function (src, i) {
      var slide = el("div", "gal-slide");
      var img = el("img", null, {
        src: src, alt: p.name + " \u2014 view " + (i + 1),
        loading: i === 0 ? "eager" : "lazy", decoding: "async"
      });
      /* Handed to CSS as a custom property rather than set as object-position
         directly: the square crop only applies on a phone, and an inline
         object-position would follow the image onto the desktop mosaic where
         each frame keeps its own proportions. */
      if (FOCAL[src] != null) img.style.setProperty("--focal", FOCAL[src] + "%");
      slide.appendChild(img);
      track.appendChild(slide);
    });
    gal.appendChild(track);

    var dots = el("div", "gal-dots");
    shots.forEach(function (_, i) {
      var d = el("button", "gal-dot" + (i === 0 ? " is-on" : ""), {
        type: "button", "aria-label": "View " + (i + 1)
      });
      d.addEventListener("click", function () {
        track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
      });
      dots.appendChild(d);
    });
    gal.appendChild(dots);

    function mark(i) {
      Array.prototype.forEach.call(dots.children, function (d, j) {
        d.classList.toggle("is-on", j === i);
      });
    }

    /* Phones swipe the track sideways; desktop stacks the frames and scrolls
       the page, so each layout needs its own way of knowing which is showing. */
    track.addEventListener("scroll", function () {
      if (DESKTOP.matches) return;
      mark(Math.round(track.scrollLeft / track.clientWidth));
    }, { passive: true });

    if (window.IntersectionObserver) {
      if (galleryWatch) galleryWatch.disconnect();
      galleryWatch = new IntersectionObserver(function (entries) {
        if (!DESKTOP.matches) return;
        entries.forEach(function (e) {
          if (e.isIntersecting) mark(Array.prototype.indexOf.call(track.children, e.target));
        });
      }, { threshold: 0.55 });
      Array.prototype.forEach.call(track.children, function (n) { galleryWatch.observe(n); });
    }

    return gal;
  }

  function renderProduct(root) {
    var p = current();

    // breadcrumb
    var crumbs = el("nav", "crumbs crumbs--pdp", { "aria-label": "Breadcrumb" });
    var c1 = el("a", null, { href: "#/" }); c1.textContent = "Home";
    var c2 = el("a", null, { href: "#/" }); c2.textContent = "High Jewellery";
    var s1 = el("span"); s1.textContent = "/";
    var s2 = el("span"); s2.textContent = "/";
    var here = el("span", "crumbs-here", { "aria-current": "page" }); here.textContent = p.name;
    crumbs.appendChild(c1); crumbs.appendChild(s1); crumbs.appendChild(c2);
    crumbs.appendChild(s2); crumbs.appendChild(here);
    root.appendChild(crumbs);

    var pdp = el("section", "pdp");
    pdp.appendChild(buildGallery(p));

    var panel = el("div", "pdp-panel");

    var head = el("div", "pdp-head");
    var h1 = el("h1", "pdp-title"); h1.textContent = p.name;
    var wish = el("button", "pdp-wish", {
      type: "button", "aria-pressed": String(!!state.wished[p.id]), "aria-label": "Save " + p.name
    });
    wish.appendChild(svg(22, { stroke: "#201e1d", sw: 1 },
      ["M12 20s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5C19 15.6 12 20 12 20Z"]));
    wish.addEventListener("click", function () {
      state.wished[p.id] = !state.wished[p.id]; render();
    });
    head.appendChild(h1); head.appendChild(wish);
    panel.appendChild(head);

    var sub = el("p", "pdp-sub"); sub.textContent = p.materials;
    panel.appendChild(sub);

    if (p.isGemstone) {
      var badges = el("div", "gem-badges");
      var props = [
        { label: "Cut", val: p.cut },
        { label: "Colour", val: p.colour },
        { label: "Clarity", val: p.clarity },
        { label: "Treatment", val: p.treatment },
        { label: "Certification", val: p.certification }
      ];
      props.forEach(function (prop) {
        if (prop.val) {
          var badge = el("span", "gem-badge");
          badge.textContent = prop.label + ": " + prop.val;
          badges.appendChild(badge);
        }
      });
      panel.appendChild(badges);
    } else {
      /* Metal is stated, not chosen. These are single commissions and none of
         them is offered in a second finish, so the pair of swatches that used
         to sit here was invented: the second circle advertised a yellow gold
         version that does not exist, and clicking it changed nothing on the
         page. The fact stays, the control goes. */
      if (p.metal) {
        var metalBlock = el("div", "opt-block opt-block--metal");
        var metalLabel = el("span", "opt-label");
        metalLabel.textContent = "Metal: " + p.metal;
        metalBlock.appendChild(metalLabel);
        panel.appendChild(metalBlock);
      }

      // No size selector: every High Jewellery piece is a single commission,
      // so there is nothing to choose between. The guide stays for sizing.
      var guide = el("a", "size-guide", { href: "#/" }); guide.textContent = "Size guide";
      panel.appendChild(guide);
    }

    if (p.visualiser) {
      var vizBtn = el("button", "viz-launch", { type: "button" });
      vizBtn.appendChild(svg(16, { stroke: "currentColor", sw: 1.2, round: true }, [
        "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z",
        "M12 2c2.5 2.8 4 6.2 4 10s-1.5 7.2-4 10c-2.5-2.8-4-6.2-4-10S9.5 4.8 12 2Z",
        "M2 12h20"
      ]));
      var vizTxt = el("span"); vizTxt.textContent = "View stone in 360°";
      vizBtn.appendChild(vizTxt);
      vizBtn.addEventListener("click", function () { openVisualiser(p); });
      panel.appendChild(vizBtn);
    }

    // CTA + the one availability line beneath it
    var ctas = el("div", "ctas");
    var c1b = el("button", "cta cta--primary", { type: "button", id: "pdp-cta" });
    c1b.textContent = "Request quotation";
    c1b.addEventListener("click", function () {
      location.href = "../quotation/?ref=" + encodeURIComponent(p.ref || p.id) +
        "&name=" + encodeURIComponent(p.name);
    });
    var c2b = el("button", "cta cta--ghost", { type: "button" });
    c2b.textContent = "Book a private viewing";
    c2b.addEventListener("click", function () {
      location.href = "../appointment/";
    });
    ctas.appendChild(c1b); ctas.appendChild(c2b);

    var addSel = el("button", "cta cta--ghost", { type: "button" });
    addSel.textContent = "Add to selection";
    addSel.style.marginTop = "10px";
    addSel.addEventListener("click", function () {
      if (!window.Gem) {
        openEnquiry(p);
        return;
      }
      Gem.cart.add({
        id: p.id,
        slug: p.id,
        name: p.name,
        materials: p.materials,
        image: cardImg(p),
        priceOnEnquiry: true
      });
      addSel.textContent = "Added to selection";
    });
    ctas.appendChild(addSel);
    panel.appendChild(ctas);

    // three accordions, collapsed by default, one open at a time
    panel.appendChild(accordion("acc--pdp", [
      { label: "Description & details", render: function (b) {
          if (p.story) { var s0 = el("p", "acc-copy"); s0.textContent = p.story; b.appendChild(s0); }
          specRows(b, [["Stone", p.carat], ["Origin", p.origin], ["Gemstone", p.materials], ["Reference", p.ref]]);
        } },
      { label: "Care and services", render: function (b) {
          bullets(b, [
            "Cleaned and checked by our workshop at any time, without charge.",
            "Store flat in the fitted case, away from direct light and heat.",
            "Resizing and restringing handled in-house; allow four weeks.",
            "Every piece carries a lifetime guarantee against manufacturing defect."
          ]);
        } },
      { label: "Shipping and returns", render: function (b) {
          bullets(b, [
            "Insured delivery worldwide, hand-carried on request.",
            "Made to order in 8\u201312 weeks; we will confirm a date on enquiry.",
            "Returns accepted within 30 days on stock pieces, unworn and boxed.",
            "Commissioned and resized pieces are final sale."
          ]);
        } }
    ], state.acc, function (i) { state.acc = i; render(); }));

    pdp.appendChild(panel);
    root.appendChild(pdp);

    // spec strip — icon, label, value; hairline top and bottom
    /* carat / origin / reference are placeholders on newer pieces, so drop any
       em-dash and top up from attributes every piece actually has. */
    var specPairs = [["Stone", p.carat], ["Origin", p.origin], ["Gemstone", p.materials], ["Reference", p.ref]]
      .filter(function (x) { return x[1] && x[1] !== "\u2014"; });
    [["Category", p.type], ["Collection", p.collection], ["Jewellery", "High Jewellery"]].forEach(function (x) {
      if (specPairs.length < 4) specPairs.push(x);
    });

    var specs = el("div", "specs");
    specPairs
      .forEach(function (pair) {
        var cell = el("div", "spec");
        cell.appendChild(svg(24, { stroke: "#201e1d", sw: 1, round: true }, [STAT_ICONS[pair[0]]]));
        var k = el("span", "spec-k"); k.textContent = pair[0];
        var v = el("span", "spec-v"); v.textContent = pair[1];
        cell.appendChild(k); cell.appendChild(v);
        specs.appendChild(cell);
      });

    /* Alternating sequence: a half-width frame with its paragraph beside it,
       stepping left, right, left down the page. Every frame is this piece on
       the model — nothing generic, nothing borrowed from another shoot. */
    var storyBlocks = storyBlocksFor(p);
    if (storyBlocks.length) {
      var story = el("section", "story");
      storyBlocks.forEach(function (b, i) {
        var blk = el("div", "story-block" + (i % 2 ? " story-block--right" : ""));
        var f = el("div", "story-shot");
        f.appendChild(el("img", null, {
          src: b.img, alt: p.name + " worn", loading: "lazy", decoding: "async"
        }));
        var txt = el("div", "story-text");
        var h = el("h3", "story-h"); h.textContent = b.h;
        var t = el("p", "story-p"); t.textContent = b.p;
        txt.appendChild(h); txt.appendChild(t);
        blk.appendChild(f); blk.appendChild(txt);
        story.appendChild(blk);
      });
      root.appendChild(story);
    }

    /* The story runs before the spec strip, not after it. A column of icons
       reading Gemstone / Category / Collection / Jewellery is the most
       commercial thing on the page, and sitting it between the piece and its
       story broke the narrative in half on a phone, where it stacks to most
       of a screen. The piece is shown, then told, and the facts close it.
       This sits outside the story branch: a piece with no model frames has no
       story rows, and it still needs its specs. */
    root.appendChild(specs);

    // cross-sell — same collection first, then the rest
    var rel = products.filter(function (q) { return q.id !== p.id && q.collection === p.collection; })
      .concat(products.filter(function (q) { return q.id !== p.id && q.collection !== p.collection; }))
      .slice(0, 4);
    var relWrap = el("section", "related");
    var relHead = el("div", "related-head");
    var rt = el("span", "related-title"); rt.textContent = "You may also like";
    var ra = el("a", "related-all", { href: "#/" }); ra.textContent = "View all";
    relHead.appendChild(rt); relHead.appendChild(ra);
    var relGrid = el("div", "related-grid");
    rel.forEach(function (q) { relGrid.appendChild(productCard(q, { related: true })); });
    relWrap.appendChild(relHead); relWrap.appendChild(relGrid);
    root.appendChild(relWrap);


    // FAQ
    var faqWrap = el("section", "faq");
    var faqH = el("h2", "faq-title"); faqH.textContent = "Frequently asked";
    faqWrap.appendChild(faqH);
    faqWrap.appendChild(accordion("acc--faq", [
      { label: "Can a piece be commissioned or altered?", render: function (b) {
          var t = el("p", "acc-copy");
          t.textContent = "Yes. Most pieces can be re-cut to a different stone, length or metal. "
            + "Commissions begin with a private appointment and take three to six months.";
          b.appendChild(t);
        } },
      { label: "Is the stone certified?", render: function (b) {
          var t = el("p", "acc-copy");
          t.textContent = "Every stone above one carat ships with an independent laboratory report, "
            + "and every piece with our own certificate of origin naming the mine.";
          b.appendChild(t);
        } },
      { label: "How do private viewings work?", render: function (b) {
          var t = el("p", "acc-copy");
          t.textContent = "We bring the piece to you, or you visit the workshop. Either way an "
            + "adviser stays with you for the appointment; there is no obligation to buy.";
          b.appendChild(t);
        } },
      { label: "Why are prices not shown?", render: function (b) {
          var t = el("p", "acc-copy");
          t.textContent = "High jewellery is priced per stone, and no two are alike. We quote on "
            + "enquiry so the figure reflects the piece you are actually looking at.";
          b.appendChild(t);
        } }
    ], state.faq, function (i) { state.faq = i; render(); }));
    root.appendChild(faqWrap);

    // concierge band
    var band = el("section", "concierge");
    var bK = el("span", "concierge-kicker"); bK.textContent = "Client care";
    var bT = el("p", "concierge-copy");
    bT.textContent = "An adviser can answer anything about this piece \u2014 the stone, the setting, "
      + "or how it wears.";
    var bA = el("button", "concierge-cta", { type: "button" }); bA.textContent = "Contact us";
    bA.addEventListener("click", function () { openEnquiry(p); });
    var bH = el("span", "concierge-hours"); bH.textContent = "Monday to Saturday, 9am \u2013 7pm";
    band.appendChild(bK); band.appendChild(bT); band.appendChild(bA); band.appendChild(bH);
    root.appendChild(band);

    // sticky CTA — appears once the in-panel button leaves the viewport
    var sticky = el("div", "pdp-sticky");
    var sMenu = el("button", "pdp-sticky-icon", { type: "button", "aria-label": "Open menu" });
    sMenu.appendChild(svg(22, { stroke: "currentColor", sw: 1 }, ["M4 7h16M4 12h16M4 17h16"]));
    sMenu.addEventListener("click", openSiteNav);
    var sBag = el("button", "pdp-sticky-icon", { type: "button", "aria-label": "Shopping bag" });
    sBag.appendChild(svg(20, { stroke: "currentColor", sw: 1 },
      ["M5 8h14l-1.2 12H6.2L5 8Z", "M9 8V6a3 3 0 0 1 6 0v2"]));
    var sBtn = el("button", "pdp-sticky-btn", { type: "button" }); sBtn.textContent = "Enquire now";
    sBtn.addEventListener("click", function () { openEnquiry(p); });
    sticky.appendChild(sMenu); sticky.appendChild(sBag); sticky.appendChild(sBtn);
    root.appendChild(sticky);

    if (stickyWatch) { stickyWatch.disconnect(); stickyWatch = null; }
    if (window.IntersectionObserver) {
      stickyWatch = new IntersectionObserver(function (entries) {
        sticky.classList.toggle("is-on", !entries[0].isIntersecting);
      }, { rootMargin: "-70px 0px 0px 0px" });
      stickyWatch.observe(c1b);
    }
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
        oc.textContent = products.filter(function (p) { return p[g.key] === o; }).length;
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

  /* The hamburger opens the shared site menu; the filter drawer below is a
     separate thing, reached from the Filter button. */
  function openSiteNav() {
    if (window.GemNav && window.GemNav.mounted) window.GemNav.mounted.open();
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
      state.storyOpen = false; state.drawerOpen = false;
      state.acc = null; state.faq = null;
      if (window.GemVisualiser) window.GemVisualiser.close();
      window.scrollTo(0, 0);
    }
    render();
  }

  window.addEventListener("hashchange", onRoute);

  document.addEventListener("click", function () {
    if (state.sortOpen) { state.sortOpen = false; render(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (window.GemVisualiser && window.GemVisualiser.isOpen()) window.GemVisualiser.close();
    else if (document.getElementById("modal-host").firstChild) closeEnquiry();
    else if (state.drawerOpen) closeDrawer();
    else if (state.sortOpen) { state.sortOpen = false; render(); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("menu-btn").addEventListener("click", openSiteNav);
    onRoute();
  });
})();
