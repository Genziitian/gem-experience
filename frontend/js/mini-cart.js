/* The bag, as a drawer.
 *
 * Adding a piece used to change a number in the header and nothing else, so on
 * a wide screen there was no sign anything had happened unless you were
 * looking at the top right corner. The drawer slides in, shows what was just
 * added and what else is in the bag, and gets out of the way.
 *
 * It opens only on an addition. A removal and a quantity change fire the same
 * cart event, and neither should throw a panel over what somebody is reading.
 */
(function (w, d) {
  "use strict";

  var CLOSE =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.1" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>';

  var root = null;
  var prefix = "";
  var lastFocus = null;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function giftNote() {
    try {
      var g = JSON.parse(localStorage.getItem("gem_gift_note_v1") || "null");
      return g && (g.to || g.message) ? g : null;
    } catch (e) { return null; }
  }

  function body() {
    var items = (w.Gem && w.Gem.cart.read()) || [];
    if (!items.length) {
      return '<div class="mc-empty"><p>Your selection is empty.</p>' +
        '<a class="pg-btn" href="' + prefix + 'high-jewellery/">Explore High Jewellery</a></div>';
    }

    var g = giftNote();
    var count = items.reduce(function (n, i) { return n + (i.qty || 1); }, 0);

    return (
      '<div class="mc-list">' +
        items.map(function (it) {
          return (
            '<article class="mc-item">' +
              (it.image
                ? '<img src="' + esc(it.image) + '" alt="" loading="lazy">'
                : '<div class="mc-item-ph"></div>') +
              "<div class=\"mc-item-body\">" +
                "<h3>" + esc(it.name) + "</h3>" +
                "<p>" + esc(it.materials || "Price on enquiry") + "</p>" +
                '<p class="mc-item-qty">Qty ' + (it.qty || 1) + "</p>" +
              "</div>" +
            "</article>"
          );
        }).join("") +
      "</div>" +
      /* The gift message is written on another page entirely and is otherwise
         invisible until checkout. The bag is where somebody thinks about it. */
      '<a class="mc-gift" href="' + prefix + 'gifts/#personalise">' +
        "<span>" + (g ? "Gift card written" : "Add a gift message") + "</span>" +
        "<span class=\"mc-gift-sub\">" +
          (g ? esc(g.to ? "For " + g.to : "Ready to send") : "A card, written by hand, in the box") +
        "</span>" +
      "</a>" +
      '<div class="mc-foot">' +
        '<div class="mc-count"><span>Pieces</span><span>' + count + "</span></div>" +
        '<p class="mc-note">Quoted privately. Checkout opens an enquiry with an adviser.</p>' +
        '<a class="pg-btn" href="' + prefix + 'checkout/">Proceed to checkout</a>' +
        '<a class="pg-btn pg-btn--ghost" href="' + prefix + 'cart/">View the full bag</a>' +
      "</div>"
    );
  }

  function paint() {
    if (!root) return;
    root.querySelector(".mc-body").innerHTML = body();
    var n = (w.Gem && w.Gem.cart.count()) || 0;
    root.querySelector(".mc-title").textContent = "Your selection (" + n + ")";
  }

  function build() {
    root = d.createElement("div");
    root.className = "mc";
    root.hidden = true;
    root.innerHTML =
      '<div class="mc-scrim" data-close></div>' +
      '<aside class="mc-panel" role="dialog" aria-modal="true" aria-label="Your selection">' +
        '<div class="mc-head">' +
          '<h2 class="mc-title">Your selection</h2>' +
          '<button class="mc-close" type="button" data-close aria-label="Close">' + CLOSE + "</button>" +
        "</div>" +
        '<div class="mc-body"></div>' +
      "</aside>";

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) close();
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !root.hidden) close();
    });
    d.body.appendChild(root);
  }

  function open() {
    if (!root) build();
    paint();
    lastFocus = d.activeElement;
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add("is-open"); });
    d.body.classList.add("is-locked");
    var c = root.querySelector(".mc-close");
    if (c) c.focus();
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    d.body.classList.remove("is-locked");
    w.setTimeout(function () { root.hidden = true; }, 320);
    /* put focus back where it was, or the reader is left at the top of the
       document with no idea where the panel went */
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* Keep every bag button's count in step, wherever it was drawn.
   *
   * Three pages build their own header — High Jewellery, Fine Jewellery and
   * the GemShell pages — and only one of them was rendering a count, so on the
   * other two a piece went into the bag and the icon looked identical. Rather
   * than teach each header to do it, the badge is maintained here for anything
   * marked as a bag button. */
  function syncBadges() {
    var n = (w.Gem && w.Gem.cart.count()) || 0;
    Array.prototype.forEach.call(d.querySelectorAll(".pg-cart"), function (btn) {
      var tag = btn.querySelector(".pg-cart-n");
      if (!n) { if (tag) tag.remove(); return; }
      if (!tag) {
        tag = d.createElement("span");
        tag.className = "pg-cart-n";
        btn.appendChild(tag);
      }
      tag.textContent = String(n);
    });
  }

  function init(opts) {
    prefix = (opts && opts.prefix) || "";
    syncBadges();

    w.addEventListener("gem:cart", function (e) {
      var detail = e.detail || {};
      syncBadges();
      if (!root || root.hidden) {
        if (detail.reason === "add") open();
        return;
      }
      paint();   // already open: keep it in step with the bag
    });

    /* The bag icon in the header opens the drawer rather than navigating, on
       any page that is not itself the cart — going to /cart/ from /cart/ is a
       reload that looks like nothing happened. */
    d.addEventListener("click", function (e) {
      var a = e.target.closest(".pg-cart");
      if (!a) return;
      if (/\/cart\/?$/.test(location.pathname)) return;
      e.preventDefault();
      open();
    });
  }

  w.GemMiniCart = { init: init, open: open, close: close, syncBadges: syncBadges };
})(window, document);
