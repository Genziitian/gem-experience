/* Shared header, menu drawer and footer for the utility pages.
   The header is the home page's header markup and metrics, so the wordmark,
   letter-spacing and icon set stay identical across the site. */

(function (w) {
  "use strict";

  function headerHtml(prefix, cartN) {
    return (
      '<header class="pg-hdr">' +
        '<button class="pg-icon pg-hdr-menu" type="button" id="pg-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="pg-nav">' +
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

      '<div class="pg-nav" id="pg-nav" hidden>' +
        '<div class="pg-nav-scrim" data-nav-close></div>' +
        '<nav class="pg-nav-panel" aria-label="Main">' +
          '<div class="pg-nav-head">' +
            '<span class="pg-nav-brand">Gem Experience</span>' +
            '<button class="pg-icon" type="button" id="pg-nav-close" aria-label="Close menu">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' +
                '<path d="M5 5l14 14M19 5 5 19"></path>' +
              "</svg>" +
            "</button>" +
          "</div>" +
          '<div class="pg-nav-links">' +
            '<a href="' + prefix + 'high-jewellery/">High Jewellery</a>' +
            '<div class="pg-nav-fly is-open">' +
              '<div class="pg-nav-fly-head">' +
                '<a class="pg-nav-fly-link" href="' + prefix + 'fine-jewellery/">Fine Jewellery</a>' +
                '<button class="pg-nav-fly-toggle" type="button" aria-expanded="true" aria-controls="pg-fly-fine" aria-label="Show Fine Jewellery collections">' +
                  '<span aria-hidden="true"></span>' +
                "</button>" +
              "</div>" +
              '<div class="pg-nav-fly-links" id="pg-fly-fine">' +
                '<a href="' + prefix + 'fine-jewellery/#/shop">Shop all</a>' +
                '<a href="' + prefix + 'fine-jewellery/#/bloom">Bloom</a>' +
                '<a href="' + prefix + 'fine-jewellery/#/safar">Safar</a>' +
              "</div>" +
            "</div>" +
            '<a href="' + prefix + 'offices/">Find Our Store</a>' +
            '<a href="' + prefix + 'appointment/">Book an Appointment</a>' +
            '<a href="' + prefix + 'quotation/">Request a Quotation</a>' +
          "</div>" +
          '<div class="pg-nav-sub">' +
            '<a href="' + prefix + 'cart/">Cart</a>' +
            '<a href="' + prefix + 'account/">My account</a>' +
            '<a href="' + prefix + 'contact/">Contact us</a>' +
            '<a href="' + prefix + 'legal/">Legal</a>' +
          "</div>" +
        "</nav>" +
      "</div>"
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

  function wireNav() {
    var panel = document.getElementById("pg-nav");
    var open = document.getElementById("pg-menu-btn");
    if (!panel || !open) return;

    function setOpen(on) {
      panel.hidden = !on;
      open.setAttribute("aria-expanded", String(on));
      document.body.classList.toggle("is-locked", on);
      if (on) requestAnimationFrame(function () { panel.classList.add("is-open"); });
      else panel.classList.remove("is-open");
    }

    open.addEventListener("click", function () { setOpen(true); });
    document.getElementById("pg-nav-close").addEventListener("click", function () { setOpen(false); });
    panel.querySelectorAll("[data-nav-close]").forEach(function (n) {
      n.addEventListener("click", function () { setOpen(false); });
    });
    panel.querySelectorAll(".pg-nav-fly-links a, .pg-nav-fly-link, .pg-nav-sub a, .pg-nav-links > a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    var fly = panel.querySelector(".pg-nav-fly-toggle");
    if (fly) {
      fly.addEventListener("click", function () {
        var g = fly.closest(".pg-nav-fly");
        g.classList.toggle("is-open");
        fly.setAttribute("aria-expanded", String(g.classList.contains("is-open")));
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) setOpen(false);
    });
  }

  function mount(opts) {
    opts = opts || {};
    var prefix = opts.prefix || "../";
    var top = document.getElementById("pg-header");
    var foot = document.getElementById("pg-footer");

    if (top) {
      top.innerHTML = headerHtml(prefix, (w.Gem && w.Gem.cart.count()) || 0);
      wireNav();
    }
    if (foot) {
      if (w.GemFooter) w.GemFooter.mount(foot, { prefix: prefix });
      else foot.innerHTML = footerHtml(prefix);
    }

    w.addEventListener("gem:cart", function () {
      if (!top) return;
      top.innerHTML = headerHtml(prefix, w.Gem.cart.count());
      wireNav();
    });
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
