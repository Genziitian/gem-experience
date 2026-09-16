/* Fine Jewellery — landing, shop all, collection, subcategory, product */

(function () {
  "use strict";

  var data = window.FJ_DATA || { collections: [], products: [], types: [] };
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
    var hash = (location.hash || "#/").replace(/^#/, "") || "/";
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

  function ct(n) {
    if (n == null || n === "") return "";
    return Number(n).toFixed(String(n).indexOf(".") >= 0 ? 2 : 0).replace(/\.00$/, "") + " ct";
  }

  function gm(n) {
    if (n == null || n === "") return "";
    return Number(n).toFixed(2).replace(/\.00$/, "") + " g";
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

  function addToCart(p, btn) {
    try {
      var raw = JSON.parse(localStorage.getItem("gem_cart_v1") || "[]");
      var found = raw.find(function (x) { return x.id === p.id; });
      if (found) found.qty = (found.qty || 1) + 1;
      else raw.push({
        id: p.id, slug: p.id, name: p.name,
        materials: p.stone + " · " + p.metal,
        image: "", priceOnEnquiry: !p.priceINR, priceCents: p.priceINR ? p.priceINR * 100 : 0, qty: 1
      });
      localStorage.setItem("gem_cart_v1", JSON.stringify(raw));
      if (btn) {
        var was = btn.textContent;
        btn.textContent = "Added to cart";
        setTimeout(function () { btn.textContent = was; }, 1600);
      }
    } catch (e) {}
  }

  /* One shared editorial sequence, reused on every Fine Jewellery product
     page. Drop the four photographs in img/model/ using these exact names
     and they will appear automatically — no further code change needed. */
  var MODEL_STORY = [
    { img: "img/model/model-1.jpg", h: "Made to be worn", p: "Every Fine Jewellery piece is fitted and finished by hand in our workshop, then tried on a real hand, wrist or ear before it ships — not just photographed on a mannequin." },
    { img: "img/model/model-2.jpg", h: "Everyday, not occasion-only", p: "Fine Jewellery is built for daily wear: secure clasps, snag-free settings, and metals chosen to hold their colour through years of ordinary use." },
    { img: "img/model/model-3.jpg", h: "Stones you can trace", p: "Every coloured stone in the collection is sourced and graded before it is set, so the carat weight and shape on this page match the stone actually in the piece." },
    { img: "img/model/model-4.jpg", h: "Finished in-house", p: "Polishing, stone-setting and quality control all happen under one roof, so a piece that leaves our workshop has been checked by the same hands that made it." }
  ];

  /* ---------------------------------------------------------------- nav */

  var nav = document.getElementById("fj-nav");
  var menuBtn = document.getElementById("menu-btn");

  function setNav(open) {
    nav.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) requestAnimationFrame(function () { nav.classList.add("is-open"); });
    else nav.classList.remove("is-open");
  }

  menuBtn.addEventListener("click", function () { setNav(true); });
  document.getElementById("nav-close").addEventListener("click", function () { setNav(false); });
  nav.querySelectorAll("[data-close]").forEach(function (n) {
    n.addEventListener("click", function () { setNav(false); });
  });
  document.querySelector(".fj-nav-toggle").addEventListener("click", function () {
    var group = this.closest(".fj-nav-group");
    group.classList.toggle("is-open");
    this.setAttribute("aria-expanded", group.classList.contains("is-open"));
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setNav(false); });
  });

  /* ------------------------------------------------------------- render */

  function plate(tone, sku) {
    var wrap = el("div", "fj-plate");
    wrap.style.setProperty("--tone", tone || "#9a958e");
    wrap.appendChild(el("div", "fj-plate-orb"));
    if (sku) wrap.appendChild(el("span", "fj-plate-sku", { text: sku }));
    return wrap;
  }

  function card(p) {
    var a = el("a", "fj-card", { href: "#/p/" + p.id });
    a.appendChild(plate(p.tone, p.sku));
    var body = el("div", "fj-card-body");
    body.appendChild(el("span", "fj-card-type", { text: p.collection + " · " + p.type }));
    body.appendChild(el("h3", null, { text: p.name }));
    body.appendChild(el("p", null, {
      text: p.stone + (p.stoneCt != null ? " · " + ct(p.stoneCt) : "")
    }));
    a.appendChild(body);
    return a;
  }

  function renderHome() {
    var root = el("div", "fj-home");
    var hero = el("header", "fj-home-hero");
    hero.appendChild(el("p", "fj-kicker", { text: "Collections" }));
    hero.appendChild(el("h1", "fj-title", { text: "Fine Jewellery" }));
    hero.appendChild(el("p", "fj-lede", {
      text: "Two houses within Fine Jewellery. Bloom for flora, Safar for the journey. Choose a collection, then a piece."
    }));
    root.appendChild(hero);

    var cats = el("div", "fj-cats");
    data.collections.forEach(function (c) {
      var a = el("a", "fj-cat", { href: "#/" + c.id });
      a.style.setProperty("--cat-tone", c.tone);

      var media = el("div", "fj-cat-media");
      if (c.banner) {
        media.appendChild(el("img", null, {
          src: c.banner,
          alt: c.name,
          loading: "lazy"
        }));
      } else {
        media.appendChild(el("div", "fj-cat-placeholder"));
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
      text: data.products.length + " pieces across Bloom and Safar."
    }));
    shop.appendChild(el("a", "fj-link", { href: "#/shop", text: "Shop all pieces" }));
    root.appendChild(shop);
    return root;
  }

  function renderShop(route) {
    var col = route.collection;
    var type = route.type;
    var items = productsFor(col ? col.name : null, type);

    var root = el("div", "fj-shop");

    var banner = el("header", "fj-shop-banner");
    banner.appendChild(el("p", "fj-kicker", { text: "Fine Jewellery" }));
    banner.appendChild(el("h1", "fj-title", {
      text: type ? type : (col ? col.name : "Shop all")
    }));
    banner.appendChild(el("p", "fj-lede", {
      text: col
        ? col.lede
        : "Every Fine Jewellery piece from Bloom and Safar. Filter by collection or category."
    }));
    root.appendChild(banner);

    var filters = el("div", "fj-filters");

    var colRow = el("div", "fj-filter-row");
    colRow.appendChild(el("span", "fj-filter-label", { text: "Collection" }));
    colRow.appendChild(el("a", "fj-chip" + (!col ? " is-on" : ""), {
      href: shopHref(null, type),
      text: "All"
    }));
    data.collections.forEach(function (c) {
      colRow.appendChild(el("a", "fj-chip" + (col && col.id === c.id ? " is-on" : ""), {
        href: shopHref(c, type),
        text: c.name
      }));
    });
    filters.appendChild(colRow);

    var typeRow = el("div", "fj-filter-row");
    typeRow.appendChild(el("span", "fj-filter-label", { text: "Category" }));
    typeRow.appendChild(el("a", "fj-chip" + (!type ? " is-on" : ""), {
      href: shopHref(col, null),
      text: "All"
    }));
    data.types.forEach(function (t) {
      typeRow.appendChild(el("a", "fj-chip" + (type === t ? " is-on" : ""), {
        href: shopHref(col, t),
        text: t
      }));
    });
    filters.appendChild(typeRow);
    root.appendChild(filters);

    var body = el("div", "fj-shop-body");
    body.appendChild(el("p", "fj-shop-meta", {
      text: items.length + (items.length === 1 ? " piece" : " pieces")
    }));
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
    var items = productsFor(col.name, type);
    var types = typesPresent(col.name);
    var root = el("div", "fj-col");

    if (!type) {
      var hero = el("section", "fj-hero");
      hero.style.setProperty("--cat-tone", col.tone || "#6a9e7a");

      var visual = el("div", "fj-hero-visual");
      if (col.banner) {
        visual.appendChild(el("img", null, {
          src: col.banner,
          alt: col.name,
          decoding: "async"
        }));
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

      if (col.story) {
        var storyWrap = el("div", "fj-hero-scroll");
        col.story.split("\n\n").forEach(function (para) {
          storyWrap.appendChild(el("p", "fj-story", { text: para }));
        });
        panel.appendChild(storyWrap);
      }
      // Safar's meta line is word-for-word the designer byline above it —
      // skip it rather than say "Designed with Shantanu Garg" twice.
      if (col.meta && col.meta !== "Designed with " + (col.designer || "")) {
        panel.appendChild(el("p", "fj-col-meta", { text: col.meta }));
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
      var subHead = el("header", "fj-col-subhead");
      subHead.appendChild(el("a", "fj-back", {
        href: "#/" + col.id,
        text: "← " + col.name
      }));
      subHead.appendChild(el("h1", "fj-title", { text: type }));
      subHead.appendChild(el("p", "fj-col-count", {
        text: items.length + (items.length === 1 ? " piece" : " pieces")
      }));
      root.appendChild(subHead);
    }

    var pieces = el("section", "fj-pieces", { id: "fj-pieces" });
    if (!type) {
      pieces.appendChild(el("header", "fj-pieces-head", {
        html: "<h2 class=\"fj-pieces-title\">The collection</h2>" +
          "<p class=\"fj-col-count\">" +
          items.length + (items.length === 1 ? " piece" : " pieces") +
          "</p>"
      }));
    }

    var layout = el("div", "fj-layout");
    var rail = el("nav", "fj-rail", { "aria-label": "Categories" });
    rail.appendChild(el("a", type ? "" : "is-on", { href: "#/" + col.id, text: "All" }));
    types.forEach(function (t) {
      rail.appendChild(el("a", type === t ? "is-on" : "", {
        href: "#/" + col.id + "/" + slugify(t),
        text: t
      }));
    });
    layout.appendChild(rail);

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
    crumbs.appendChild(el("span", "fj-crumbs-here", { "aria-current": "page", text: p.name }));
    root.appendChild(crumbs);

    var pdp = el("section", "fj-pdp");
    var media = el("div", "fj-pdp-media");
    media.appendChild(plate(p.tone, p.sku));
    pdp.appendChild(media);

    var copy = el("div", "fj-pdp-copy");
    copy.appendChild(el("p", "fj-kicker", { text: p.sku }));
    copy.appendChild(el("h1", "fj-title", { text: p.name }));

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

    var actions = el("div", "fj-pdp-actions");
    var addBtn = el("button", "fj-btn", { type: "button", text: "Add to cart" });
    addBtn.addEventListener("click", function () { addToCart(p, addBtn); });
    var enquireBtn = el("a", "fj-btn fj-btn--ghost", {
      href: "../quotation/?ref=" + encodeURIComponent(p.sku) + "&name=" + encodeURIComponent(p.name),
      text: "Enquire now"
    });
    actions.appendChild(addBtn);
    actions.appendChild(enquireBtn);
    copy.appendChild(actions);

    // details, care & shipping — plain disclosure elements, no extra JS state
    var specRows = [
      ["Category", p.type], ["Collection", p.collection], ["Metal", p.metal],
      ["Stone", p.stone], ["Shape", p.shape],
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

    // closer look — detail crops of this specific piece, added per SKU later
    var closer = el("section", "fj-closer");
    closer.appendChild(el("h2", "fj-section-h", { text: "A closer look" }));
    var closerGrid = el("div", "fj-closer-grid");
    ["detail-1", "detail-2", "detail-3"].forEach(function (n) {
      closerGrid.appendChild(mediaFrame(
        "img/products/" + p.id + "/" + n + ".jpg",
        p.name + " — detail",
        p.tone,
        "fj-closer-tile"
      ));
    });
    closer.appendChild(closerGrid);
    root.appendChild(closer);

    // cross-sell — same collection first, then the rest
    var rel = data.products.filter(function (q) { return q.id !== p.id && q.collection === p.collection; })
      .concat(data.products.filter(function (q) { return q.id !== p.id && q.collection !== p.collection; }))
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
      blk.appendChild(mediaFrame(b.img, b.h, p.tone, "fj-model-frame"));
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
      return p ? p.name + " | Fine Jewellery | Gem Experience" : "Fine Jewellery | Gem Experience";
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
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);
  render();
})();
