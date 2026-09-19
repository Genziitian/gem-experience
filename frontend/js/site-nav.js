/* Shared Gem Experience side menu.
 *
 * One drawer for every page: a list of sections, where a section with children
 * slides a second panel over the first rather than expanding in place, so the
 * list never grows past the fold on a phone.
 *
 * Sections without an href are placeholders for pages that do not exist yet.
 * They render in the list but do not navigate, which keeps the structure
 * visible without shipping links that 404.
 */
(function (w, d) {
  "use strict";

  var SECTIONS = [
    { label: "High Jewellery", href: "high-jewellery/" },
    {
      label: "Fine Jewellery",
      href: "fine-jewellery/",
      children: [
        { label: "Shop all", href: "fine-jewellery/#/shop" },
        { label: "Bloom", href: "fine-jewellery/#/bloom" },
        { label: "Safar", href: "fine-jewellery/#/safar" },
        { label: "Tide", href: "fine-jewellery/#/tide" },
        { label: "Swirl", href: "fine-jewellery/#/swirl" }
      ]
    },
    {
      label: "World of Preciousness",
      href: "world-of-preciousness/",
      children: [
        { label: "Introduction", href: "world-of-preciousness/" },
        { label: "Tanzanite", href: "world-of-preciousness/tanzanite/" },
        { label: "Spinel" },
        { label: "Tsavorite" },
        { label: "Rhodolite" },
        { label: "Malaya Garnet" }
      ]
    },
    { label: "Gemstones & Mining" },
    { label: "Engagement & Bridal" },
    { label: "Gifts" },
    {
      label: "The House",
      children: [
        { heading: "About" },
        { label: "Our History" },
        { label: "Timeline" },
        { label: "Craftsmanship" },
        { label: "Sustainability" },
        { label: "Maasai Women Project" },
        { label: "Our Museum" },
        { heading: "Services" },
        { label: "Upgrade Your Jewellery" },
        { label: "Preserve Your Jewellery" }
      ]
    }
  ];

  var SECONDARY = [
    { label: "Find our store", href: "offices/" },
    { label: "Book an appointment", href: "appointment/" },
    { label: "Request a quotation", href: "quotation/" },
    { label: "My account", href: "account/" },
    { label: "Contact us", href: "contact/" },
    { label: "Legal", href: "legal/" }
  ];

  var CHEVRON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  var BACK =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.2" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
  var CLOSE =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>';

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function row(item, prefix) {
    if (item.heading) return '<p class="site-nav-heading">' + esc(item.heading) + "</p>";
    if (!item.href) return '<span class="site-nav-link is-pending">' + esc(item.label) + "</span>";
    return '<a class="site-nav-link" href="' + prefix + item.href + '">' + esc(item.label) + "</a>";
  }

  function build(prefix) {
    var root = d.createElement("div");
    root.className = "site-nav";
    root.hidden = true;

    var panels = SECTIONS.map(function (s, i) {
      if (!s.children) return "";
      return (
        '<div class="site-nav-sheet" data-sheet="' + i + '" hidden>' +
          '<button class="site-nav-back" type="button" data-back>' + BACK + " " + esc(s.label) + "</button>" +
          '<div class="site-nav-list">' +
            (s.href ? '<a class="site-nav-link" href="' + prefix + s.href + '">All ' + esc(s.label) + "</a>" : "") +
            s.children.map(function (c) { return row(c, prefix); }).join("") +
          "</div>" +
        "</div>"
      );
    }).join("");

    root.innerHTML =
      '<div class="site-nav-scrim" data-close></div>' +
      '<nav class="site-nav-panel" aria-label="Main">' +
        '<div class="site-nav-head">' +
          '<span class="site-nav-brand">Gem Experience</span>' +
          '<button class="site-nav-close" type="button" data-close aria-label="Close menu">' + CLOSE + "</button>" +
        "</div>" +
        '<div class="site-nav-body">' +
          '<div class="site-nav-sheet is-root" data-sheet="root">' +
            '<div class="site-nav-list site-nav-list--major">' +
              SECTIONS.map(function (s, i) {
                if (s.children) {
                  return '<button class="site-nav-link site-nav-link--parent" type="button" data-open="' + i + '">' +
                    esc(s.label) + '<span class="site-nav-chev">' + CHEVRON + "</span></button>";
                }
                return row(s, prefix);
              }).join("") +
            "</div>" +
            '<div class="site-nav-list site-nav-list--minor">' +
              SECONDARY.map(function (s) { return row(s, prefix); }).join("") +
            "</div>" +
          "</div>" +
          panels +
        "</div>" +
      "</nav>";
    return root;
  }

  var api = {
    mount: function (target, opts) {
      opts = opts || {};
      var host = typeof target === "string" ? d.querySelector(target) : target;
      if (!host) return null;

      var root = build(opts.prefix || "");
      host.appendChild(root);

      var body = d.body;
      var sheets = root.querySelectorAll(".site-nav-sheet");

      function show(name) {
        sheets.forEach(function (s) { s.hidden = s.getAttribute("data-sheet") !== String(name); });
      }

      function open() {
        show("root");
        root.hidden = false;
        requestAnimationFrame(function () { root.classList.add("is-open"); });
        body.classList.add("is-locked");
        var c = root.querySelector(".site-nav-close");
        if (c) c.focus();
      }

      function close() {
        root.classList.remove("is-open");
        body.classList.remove("is-locked");
        w.setTimeout(function () { root.hidden = true; }, 340);
      }

      root.addEventListener("click", function (e) {
        if (e.target.closest("[data-close]") || e.target.hasAttribute("data-close")) return close();
        var opener = e.target.closest("[data-open]");
        if (opener) return show(opener.getAttribute("data-open"));
        if (e.target.closest("[data-back]")) return show("root");
        if (e.target.closest("a.site-nav-link")) close();
      });

      d.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !root.hidden) close();
      });

      var instance = { open: open, close: close, el: root };
      api.mounted = instance;
      return instance;
    },
    mounted: null
  };

  w.GemNav = api;
})(window, document);
