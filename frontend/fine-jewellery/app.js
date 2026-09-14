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
    this.parentElement.classList.toggle("is-open");
    this.setAttribute("aria-expanded", this.parentElement.classList.contains("is-open"));
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
      if (col.meta) {
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

    var root = el("article", "fj-pdp");
    var media = el("div", "fj-pdp-media");
    media.appendChild(plate(p.tone, p.sku));
    root.appendChild(media);

    var copy = el("div", "fj-pdp-copy");
    copy.appendChild(el("a", "fj-back", {
      href: "#/" + (col && col.id),
      text: "← " + (p.collection || "Fine Jewellery")
    }));
    copy.appendChild(el("p", "fj-kicker", { text: p.sku }));
    copy.appendChild(el("h1", "fj-title", { text: p.name }));
    copy.appendChild(el("p", "fj-pdp-story", { text: p.story }));

    var specs = el("ul", "fj-specs");
    [
      ["Category", p.type],
      ["Collection", p.collection],
      ["Metal", p.metal],
      ["Stone", p.stone],
      ["Shape", p.shape],
      ["Stone weight", ct(p.stoneCt)],
      ["Diamond weight", ct(p.diamondCt)],
      ["Net weight", gm(p.netG)],
      ["Gross weight", gm(p.grossG)]
    ].forEach(function (row) {
      if (!row[1]) return;
      var li = el("li");
      li.appendChild(el("strong", null, { text: row[0] }));
      li.appendChild(el("span", null, { text: String(row[1]) }));
      specs.appendChild(li);
    });
    copy.appendChild(specs);

    var actions = el("div", "fj-pdp-actions");
    var q = el("a", "fj-btn", {
      href: "../quotation/?ref=" + encodeURIComponent(p.sku) +
        "&name=" + encodeURIComponent(p.name),
      text: "Request a quotation"
    });
    var bag = el("button", "fj-btn fj-btn--ghost", { type: "button", text: "Add to selection" });
    bag.addEventListener("click", function () {
      try {
        var raw = JSON.parse(localStorage.getItem("gem_cart_v1") || "[]");
        var found = raw.find(function (x) { return x.id === p.id; });
        if (found) found.qty = (found.qty || 1) + 1;
        else raw.push({
          id: p.id, slug: p.id, name: p.name,
          materials: p.stone + " · " + p.metal,
          image: "", priceOnEnquiry: true, priceCents: 0, qty: 1
        });
        localStorage.setItem("gem_cart_v1", JSON.stringify(raw));
        bag.textContent = "Added";
        setTimeout(function () { bag.textContent = "Add to selection"; }, 1600);
      } catch (e) {}
    });
    actions.appendChild(q);
    actions.appendChild(bag);
    copy.appendChild(actions);
    root.appendChild(copy);
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
