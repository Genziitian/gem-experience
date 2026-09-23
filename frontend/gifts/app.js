/* Gifts.
 *
 * The grid is the Fine Jewellery catalogue read through two lenses, drawn with
 * the same card and plate as the collection pages so the two do not look like
 * different shops. Prices are not shown here for the same reason they are not
 * shown anywhere: every piece is quoted on the stone it is cut from.
 */
(function (w, d) {
  "use strict";

  GemShell.mount();

  var data = w.FJ_DATA || { products: [], collections: [] };

  /* ------------------------------------------------------------ the sets
   *
   * These two are editorial choices, not facts in the catalogue: nothing in
   * the data says which pieces are popular or who a piece suits. They are
   * expressed as rules rather than as a hand-typed list of SKUs so that a
   * piece added to the catalogue tomorrow falls into the right set without
   * anybody remembering to come back here — but they are a starting point to
   * be curated, not a claim about what actually sells.
   */
  var SETS = {
    all: {
      label: "All gifts",
      test: function () { return true; },
    },
    popular: {
      label: "Most popular",
      /* The smaller, everyday pieces: pendants, studs and slim bracelets are
         what a first gift tends to be. Carat weight is the proxy — under two
         carats reads as wearable rather than ceremonial. */
      test: function (p) {
        return (p.stoneCt == null || p.stoneCt <= 2.2) &&
               ["Pendants", "Earrings", "Bracelets", "Necklaces"].indexOf(p.type) !== -1;
      },
    },
    her: {
      label: "Gifts for her",
      /* Nothing in the catalogue records who a piece is for. What it does
         record is the design: the house's decorative motifs — bloom, petal,
         flora, rosette, garland, dew, swirl — are the pieces this set is
         built from, and they carry the collections' own vocabulary rather
         than a guess about the person receiving them. */
      test: function (p) {
        var name = (p.name || "").toLowerCase();
        return /bloom|petal|flora|rosette|garland|blossom|dew|swirl/.test(name);
      },
    },
  };

  var ORDER = ["all", "popular", "her"];

  // ------------------------------------------------------------- helpers

  function el(tag, cls, attrs) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    return n;
  }

  function ct(n) { return n == null ? "" : Number(n).toFixed(2) + " ct"; }

  /* Same plate as the collection grid, including the tone swatch that stands in
     until a photograph loads. */
  function plate(p) {
    var wrap = el("div", "fj-plate");
    wrap.style.setProperty("--tone", p.tone || "#9a958e");
    wrap.appendChild(el("div", "fj-plate-orb"));
    /* Same reveal as the collection grid: the model frame underneath, the
       packshot fading off it. */
    if (p.hover) {
      var hv = el("img", "fj-plate-hover", {
        src: "../fine-jewellery/" + p.hover, alt: "",
        loading: "lazy", decoding: "async", "aria-hidden": "true"
      });
      hv.addEventListener("error", function () { hv.remove(); wrap.classList.remove("has-hover"); });
      hv.addEventListener("load", function () { wrap.classList.add("has-hover"); });
      wrap.appendChild(hv);
    }
    var src = p.images && p.images.length ? p.images[0] : "";
    if (src) {
      var img = el("img", "fj-plate-img", {
        src: "../fine-jewellery/" + src, alt: p.name, loading: "lazy", decoding: "async"
      });
      img.addEventListener("error", function () { img.remove(); wrap.classList.remove("has-img"); });
      img.addEventListener("load", function () { wrap.classList.add("has-img"); });
      wrap.appendChild(img);
    }
    if (p.sku) wrap.appendChild(el("span", "fj-plate-sku", { text: p.sku }));
    return wrap;
  }

  function card(p) {
    var a = el("a", "fj-card", { href: "../fine-jewellery/#/p/" + p.id });
    a.appendChild(plate(p));
    var body = el("div", "fj-card-body");
    body.appendChild(el("span", "fj-card-type", { text: p.collection + " · " + p.type }));
    body.appendChild(el("h3", null, { text: p.name }));
    body.appendChild(el("p", null, {
      text: p.stone + (p.stoneCt != null ? " · " + ct(p.stoneCt) : "")
    }));
    a.appendChild(body);
    return a;
  }

  // -------------------------------------------------------------- render

  var current = "all";

  function paint() {
    var set = SETS[current] || SETS.all;
    var items = (data.products || []).filter(set.test);

    var rail = d.getElementById("gift-rail");
    rail.innerHTML = "";
    ORDER.forEach(function (key) {
      var a = el("a", current === key ? "is-on" : "", {
        href: "#" + key, text: SETS[key].label
      });
      a.addEventListener("click", function (e) {
        e.preventDefault();
        current = key;
        paint();
      });
      rail.appendChild(a);
    });

    var grid = d.getElementById("gift-grid");
    grid.innerHTML = "";
    if (!items.length) {
      grid.appendChild(el("p", "fj-empty", { text: "Nothing in this set yet." }));
    } else {
      items.forEach(function (p) { grid.appendChild(card(p)); });
    }

    d.getElementById("gift-count").textContent =
      items.length + (items.length === 1 ? " piece" : " pieces");
  }

  /* The tiles pick a set rather than navigating away, so the page does not
     reload to show a filtered version of what is already on screen. */
  Array.prototype.forEach.call(d.querySelectorAll("[data-set]"), function (t) {
    t.addEventListener("click", function (e) {
      e.preventDefault();
      current = t.getAttribute("data-set");
      paint();
      d.getElementById("gift-pieces").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  paint();

  // ------------------------------------------------- personalisation

  var KEY = "gem_gift_note_v1";

  var F = {
    to: d.getElementById("gift-to"),
    from: d.getElementById("gift-from"),
    occasion: d.getElementById("gift-occasion"),
    message: d.getElementById("gift-message"),
    letter: d.getElementById("gift-letter"),
  };

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }

  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ }
  }

  function values() {
    return {
      to: F.to.value.trim(),
      from: F.from.value.trim(),
      occasion: F.occasion.value,
      message: F.message.value.trim(),
      letter: !!F.letter.checked,
    };
  }

  /* The preview is the point of the whole panel: somebody writing a message
     they cannot see is guessing at how it will read on a card. */
  function preview() {
    var v = values();
    d.getElementById("pv-to").textContent = v.to ? "For " + v.to : "For —";
    d.getElementById("pv-msg").textContent = v.message || "Your message will appear here.";
    d.getElementById("pv-from").textContent = v.from ? "— " + v.from : "";
    d.getElementById("gift-left").textContent = String(140 - F.message.value.length);
  }

  Object.keys(F).forEach(function (k) {
    F[k].addEventListener("input", preview);
    F[k].addEventListener("change", preview);
  });

  // restore anything written earlier, so a message survives a look around the site
  var saved = read();
  if (saved && typeof saved === "object") {
    if (saved.to) F.to.value = saved.to;
    if (saved.from) F.from.value = saved.from;
    if (saved.occasion) F.occasion.value = saved.occasion;
    if (saved.message) F.message.value = saved.message;
    F.letter.checked = !!saved.letter;
  }
  preview();

  d.getElementById("gift-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = values();
    var toast = d.getElementById("gift-toast");
    if (!v.to && !v.message) {
      GemShell.toast(toast, "Add a name or a message first.", false);
      return;
    }
    write(v);
    GemShell.toast(toast, "Saved. It travels with your enquiry to checkout.", true);
  });

  d.getElementById("gift-clear").addEventListener("click", function () {
    Object.keys(F).forEach(function (k) {
      if (F[k].type === "checkbox") F[k].checked = false; else F[k].value = "";
    });
    write({});
    preview();
    GemShell.toast(d.getElementById("gift-toast"), "Cleared.", true);
  });
})(window, document);
