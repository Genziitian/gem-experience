/* Shared header, menu drawer and footer for the utility pages.
   The header is the home page's header markup and metrics, so the wordmark,
   letter-spacing and icon set stay identical across the site. */

(function (w) {
  "use strict";

  function headerHtml(prefix, cartN) {
    return (
      '<header class="pg-hdr">' +
        '<button class="pg-icon pg-hdr-menu" type="button" id="pg-menu-btn" aria-label="Open menu" aria-expanded="false" aria-haspopup="dialog">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' +
            '<path d="M4 8h16M4 16h16"></path>' +
          "</svg>" +
        "</button>" +

        '<p class="pg-hdr-brand"><a href="' + prefix + '">Gem Experience</a></p>' +

        '<div class="pg-hdr-icons">' +
          '<a class="pg-icon" href="' + prefix + 'high-jewellery/" aria-label="Search">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="0.833" aria-hidden="true">' +
              '<circle cx="9.16" cy="9.16" r="5.83"></circle><path d="M13.33 13.33 16.67 16.67"></path>' +
            "</svg>" +
          "</a>" +
          '<a class="pg-icon" href="' + prefix + 'login/" aria-label="Account">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="0.833" aria-hidden="true">' +
              '<circle cx="10" cy="6.67" r="3.33"></circle><path d="M4.17 17.5c0-3.22 2.61-5.83 5.83-5.83s5.83 2.61 5.83 5.83"></path>' +
            "</svg>" +
          "</a>" +
          '<a class="pg-icon pg-cart" href="' + prefix + 'cart/" aria-label="Cart">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' +
              '<path d="M5 8h14l-1.2 12H6.2L5 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path>' +
            "</svg>" +
            (cartN ? '<span class="pg-cart-n">' + cartN + "</span>" : "") +
          "</a>" +
        "</div>" +
      "</header>" +

      ""
    );
  }

  function footerHtml(prefix) {
    return (
      '<footer class="pg-ftr">' +
        '<div class="pg-ftr-grid">' +
          '<div><span class="pg-ftr-title">Client care</span>' +
            '<a href="' + prefix + 'appointment/">Book an appointment</a>' +
            '<a href="' + prefix + 'quotation/">Request a quotation</a>' +
            '<a href="' + prefix + 'contact/">Contact us</a></div>' +
          '<div><span class="pg-ftr-title">Maison</span>' +
            '<a href="' + prefix + 'high-jewellery/">High Jewellery</a>' +
            '<a href="' + prefix + 'fine-jewellery/">Fine Jewellery</a>' +
            '<a href="' + prefix + 'offices/">Our Offices</a>' +
            '<a href="' + prefix + 'account/">My account</a></div>' +
          '<div><span class="pg-ftr-title">Gem Experience</span>' +
            '<p class="pg-ftr-copy">Singular pieces, each cut from a stone we followed out of the ground.</p></div>' +
        "</div>" +
        '<div class="pg-ftr-base">' +
          "<span>&copy; 2026 Gem Experience</span>" +
          '<nav><a href="' + prefix + 'legal/#privacy">Privacy</a>' +
            '<a href="' + prefix + 'legal/#terms">Terms</a>' +
            '<a href="' + prefix + 'legal/#cookies">Cookies</a></nav>' +
        "</div>" +
      "</footer>"
    );
  }

  /* The drawer is js/site-nav.js, shared with the home page and Fine Jewellery,
     so every page opens the same menu. Mounted once, then re-pointed whenever
     the header is re-rendered for a cart change. */
  function wireNav(prefix) {
    var open = document.getElementById("pg-menu-btn");
    if (!open) return;
    if (w.GemNav && !w.GemNav.mounted) {
      var host = document.createElement("div");
      document.body.appendChild(host);
      w.GemNav.mount(host, { prefix: prefix });
    }
    open.addEventListener("click", function () {
      if (w.GemNav && w.GemNav.mounted) w.GemNav.mounted.open();
    });
  }

  function mount(opts) {
    opts = opts || {};
    var prefix = opts.prefix || "../";
    var top = document.getElementById("pg-header");
    var foot = document.getElementById("pg-footer");

    if (top) {
      top.innerHTML = headerHtml(prefix, (w.Gem && w.Gem.cart.count()) || 0);
      wireNav(prefix);
    }
    if (foot) {
      if (w.GemFooter) w.GemFooter.mount(foot, { prefix: prefix });
      else foot.innerHTML = footerHtml(prefix);
    }

    w.addEventListener("gem:cart", function () {
      if (!top) return;
      top.innerHTML = headerHtml(prefix, w.Gem.cart.count());
      wireNav(prefix);
    });

    /* The drawer needs the same prefix the header does. It is optional: a page
       that does not load mini-cart.js keeps the plain link to /cart/. */
    if (w.GemMiniCart) w.GemMiniCart.init({ prefix: prefix });
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function showToast(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.className = "pg-toast " + (ok ? "is-ok" : "is-err");
    el.hidden = false;
  }

  w.GemShell = { mount: mount, qs: qs, toast: showToast };
})(window);
