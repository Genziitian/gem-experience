/* Shared Gem Experience side menu.
 *
 * One drawer for every page: a list of sections, where a section with children
 * slides a second panel over the first rather than expanding in place, so the
 * list never grows past the fold on a phone.
 *
 * Sections without an href are placeholders for pages that do not exist yet.
 * They render in the list but do not navigate, which keeps the structure
 * visible without shipping links that 404.
 *
 * The two arrays below are the fallback, not the source of truth: staff edit
 * the menu in the admin and it arrives through GemContent. The drawer draws
 * from these immediately so it is usable on first paint and stays usable if
 * the database cannot be reached, then redraws if an edited tree comes back.
 */
(function (w, d) {
  "use strict";

  /* Every page loads this file, so it also brings in the shared behaviour
     (hide-on-scroll header, one-open accordions, photo magnifier). */
  (function () {
    var me = d.currentScript && d.currentScript.src;
    if (!me || d.querySelector("script[data-ge-ux]")) return;
    var s = d.createElement("script");
    s.src = me.replace(/site-nav\.js(\?.*)?$/, "site-ux.js?v=1");
    s.defer = true;
    s.setAttribute("data-ge-ux", "");
    d.head.appendChild(s);
  })();

  var SECTIONS = [
    { label: "High Jewellery", href: "high-jewellery/" },
    {
      label: "Fine Jewellery",
      href: "fine-jewellery/",
      children: [
        { label: "Shop all", href: "fine-jewellery/#/shop" },
        { heading: "By piece" },
        { label: "Rings", href: "fine-jewellery/#/shop/rings" },
        { label: "Earrings", href: "fine-jewellery/#/shop/earrings" },
        { label: "Necklaces", href: "fine-jewellery/#/shop/necklaces" },
        { label: "Pendants", href: "fine-jewellery/#/shop/pendants" },
        { label: "Bracelets", href: "fine-jewellery/#/shop/bracelets" },
        { heading: "Collections" },
        { label: "Bloom", href: "fine-jewellery/#/bloom" },
        { label: "Safar", href: "fine-jewellery/#/safar" },
        { label: "Dazzle", href: "fine-jewellery/#/dazzle" },
        { label: "Entwine", href: "fine-jewellery/#/entwine" },
        { label: "Dome", href: "fine-jewellery/#/dome" },
        { label: "Tide", href: "fine-jewellery/#/tide" },
        { label: "Swirl", href: "fine-jewellery/#/swirl" },
        { label: "Spectrum", href: "fine-jewellery/#/spectrum" },
        { label: "Flare", href: "fine-jewellery/#/flare" },
        { label: "Royal Starling", href: "fine-jewellery/#/royal-starling" },
        { label: "Multi Colour", href: "fine-jewellery/#/multi-colour" }
      ]
    },
    {
      label: "The Collector’s Bench",
      href: "world-of-preciousness/",
      children: [
        { label: "Introduction", href: "world-of-preciousness/" },
        { label: "Tanzanite", href: "world-of-preciousness/tanzanite/" },
        { label: "Spinel", href: "world-of-preciousness/spinel/" },
        { label: "Tsavorite", href: "world-of-preciousness/tsavorite/" },
        { label: "Rhodolite", href: "world-of-preciousness/rhodolite/" },
        { label: "Malaya Garnet", href: "world-of-preciousness/malaya-garnet/" }
      ]
    },
    { label: "Events & Exhibitions", href: "events/" },
    {
      label: "The House",
      href: "the-house/",
      children: [
        { label: "About", href: "the-house/" },
        { label: "GE Icons", href: "icons/" },
        { label: "Craftsmanship", href: "craftsmanship/" },
        { label: "Mining", href: "mining/" },
        { label: "Sustainability", href: "sustainability/" },
        { label: "Maasai Women Project", href: "maasai-women/" },
        { label: "Timeline", href: "timeline/" },
        { label: "Lookbook", href: "lookbook/" },
        { label: "Events & Exhibitions", href: "events/" },
        { label: "Our ateliers", href: "offices/" },
        { label: "Investors", href: "investors/" },
        { label: "Careers", href: "careers/" }
      ]
    }
    /* Hidden from the menu for now (unpublished in the database too):
       Gemstones & Mining, Engagement & Bridal and Gifts (gifts/). */
  ];

  /* Sections kept off the menu whatever the database says. The admin can
     unpublish them too; this makes sure they stay hidden even when that has
     not been done on the live database yet. Remove a name to bring it back. */
  var HIDDEN = ["Gemstones & Mining", "Engagement & Bridal", "Gifts"];

  /* Entries inside a section kept off the menu the same way: collections
     with nothing photographed to show yet. (Tide and Swirl were here until
     their photography arrived.) */
  var HIDDEN_CHILDREN = {
    // Shamsa Fine moved into High Jewellery (2026-10-23)
    "Fine Jewellery": ["Shamsa Fine"],
    // stores withdrawn (2026-10-21); the ateliers stay, under "Our ateliers"
    "The House": ["Ateliers & stores"]
  };

  /* Pages added after the menu was seeded in the database. If the database
     section does not have them yet they are added at the end, so a new page
     is reachable before anyone edits the admin; an entry the admin already
     has (by label) is left as the admin has it. */
  var ADDED_CHILDREN = {
    "The House": ["GE Icons", "Craftsmanship", "Mining", "Sustainability", "Maasai Women Project",
                  "Timeline", "Our ateliers", "Investors", "Careers"]
  };

  /* The database menu is the source of truth, but rows seeded before a page
     existed carry no href and render as unclickable text. Where the database
     row has no link and this file has one for the same section and label,
     the link here fills the gap; a link set in the admin always wins. */
  function reconcile(primary) {
    var known = {};
    SECTIONS.forEach(function (sec) {
      known[sec.label] = sec;
    });
    return primary
      .filter(function (sec) { return HIDDEN.indexOf(sec.label) === -1; })
      .map(function (sec) {
        var ref = known[sec.label];
        if (!ref) return sec;
        var out = {};
        for (var k in sec) out[k] = sec[k];
        if (!out.href && ref.href) out.href = ref.href;
        var drop = HIDDEN_CHILDREN[sec.label];
        if (drop && out.children) {
          out.children = out.children.filter(function (kid) { return drop.indexOf(kid.label) === -1; });
        }
        var add = ADDED_CHILDREN[sec.label];
        if (add && out.children && ref.children) {
          var have = out.children.map(function (kid) { return kid.label; });
          ref.children.forEach(function (kid) {
            if (add.indexOf(kid.label) !== -1 && have.indexOf(kid.label) === -1) out.children = out.children.concat([kid]);
          });
        }
        if (out.children && ref.children) {
          out.children = out.children.map(function (kid) {
            if (kid.href || kid.heading) return kid;
            var match = ref.children.filter(function (r) { return r.label === kid.label; })[0];
            if (!match || !match.href) return kid;
            var copy = {};
            for (var m in kid) copy[m] = kid[m];
            copy.href = match.href;
            return copy;
          });
        }
        return out;
      });
  }

  var SECONDARY = [
    { label: "Our ateliers", href: "offices/" },
    { label: "Book an appointment", href: "appointment/" },
    { label: "Request a quotation", href: "quotation/" },
    { label: "My account", href: "account/" },
    { label: "Contact us", href: "contact/" },
    { label: "FAQs", href: "faqs/" },
    { label: "Journal", href: "blog/" },
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

  /* The gemstone guides read as a list of stone names alone, so each carries
     one line from its own page. Keyed by link so a label edited in the admin
     keeps its line; a link not listed here renders plain. */
  var NOTES = {
    "world-of-preciousness/": { label: "How a stone is read" },
    "world-of-preciousness/tanzanite/": { note: "Found at the foot of Kilimanjaro, and nowhere else" },
    "world-of-preciousness/spinel/": { note: "Six centuries in the Crown Jewels, under the wrong name" },
    "world-of-preciousness/tsavorite/": { note: "Four times rarer than emerald" },
    "world-of-preciousness/rhodolite/": { note: "The rose garnet of the Umba Valley" },
    "world-of-preciousness/malaya-garnet/": { note: "Once the miners' outcast" }
  };

  function row(item, prefix) {
    if (item.heading) return '<p class="site-nav-heading">' + esc(item.heading) + "</p>";
    if (!item.href) return '<span class="site-nav-link is-pending">' + esc(item.label) + "</span>";
    var extra = NOTES[item.href.replace(/^\//, "")] || {};
    var label = extra.label && /^introduction$/i.test(item.label) ? extra.label : item.label;
    return '<a class="site-nav-link' + (extra.note ? " has-note" : "") + '" href="' + prefix + item.href + '">' + esc(label) +
      (extra.note ? '<span class="site-nav-note">' + esc(extra.note) + "</span>" : "") + "</a>";
  }

  /* "All <section>" opens the section's own page; skipped when one of the
     section's links already goes there, so the page is never listed twice. */
  function allLink(s, prefix) {
    if (!s.href) return "";
    var same = s.children.some(function (c) { return c.href && c.href.replace(/^\//, "") === s.href.replace(/^\//, ""); });
    return same ? "" : '<a class="site-nav-link" href="' + prefix + s.href + '">All ' + esc(s.label) + "</a>";
  }

  function markup(prefix, sections, secondary) {
    var panels = sections.map(function (s, i) {
      if (!s.children) return "";
      return (
        '<div class="site-nav-sheet" data-sheet="' + i + '" hidden>' +
          '<button class="site-nav-back" type="button" data-back>' + BACK + " " + esc(s.label) + "</button>" +
          '<div class="site-nav-list">' +
            allLink(s, prefix) +
            s.children.map(function (c) { return row(c, prefix); }).join("") +
          "</div>" +
        "</div>"
      );
    }).join("");

    return '<div class="site-nav-scrim" data-close></div>' +
      '<nav class="site-nav-panel" aria-label="Main">' +
        '<div class="site-nav-head">' +
          '<span class="site-nav-brand">Gem Experience</span>' +
          '<button class="site-nav-close" type="button" data-close aria-label="Close menu">' + CLOSE + "</button>" +
        "</div>" +
        '<div class="site-nav-body">' +
          '<div class="site-nav-sheet is-root" data-sheet="root">' +
            '<div class="site-nav-list site-nav-list--major">' +
              sections.map(function (s, i) {
                if (s.children) {
                  return '<button class="site-nav-link site-nav-link--parent" type="button" data-open="' + i + '">' +
                    esc(s.label) + '<span class="site-nav-chev">' + CHEVRON + "</span></button>";
                }
                return row(s, prefix);
              }).join("") +
            "</div>" +
            '<div class="site-nav-list site-nav-list--minor">' +
              secondary.map(function (s) { return row(s, prefix); }).join("") +
            "</div>" +
          "</div>" +
          panels +
        "</div>" +
      "</nav>";
  }

  function build(prefix, sections, secondary) {
    var root = d.createElement("div");
    root.className = "site-nav";
    root.hidden = true;
    root.innerHTML = markup(prefix, sections, secondary);
    return root;
  }

  var api = {
    mount: function (target, opts) {
      opts = opts || {};
      var host = typeof target === "string" ? d.querySelector(target) : target;
      if (!host) return null;

      var prefix = opts.prefix || "";
      var root = build(prefix, SECTIONS, SECONDARY);
      host.appendChild(root);

      var body = d.body;

      /* Queried on each call rather than captured once: an edited menu
         replaces the panel's markup, which would leave a NodeList taken at
         mount time pointing at elements no longer in the document. */
      function show(name) {
        root.querySelectorAll(".site-nav-sheet").forEach(function (s) {
          s.hidden = s.getAttribute("data-sheet") !== String(name);
        });
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

      /* Redraw when an edited menu arrives. Click handling is delegated to
         `root`, so replacing the markup inside it keeps every listener; only
         the sheet lookup had to stop being cached, which it has.

         A redraw while the drawer is open would throw the reader back to the
         root panel mid-navigation, so it waits for the drawer to close. */
      var pending = null;
      function redraw(tree) {
        if (!tree) return;
        var sections = tree.primary && tree.primary.length ? reconcile(tree.primary) : SECTIONS;
        var secondary = tree.secondary && tree.secondary.length ? tree.secondary : SECONDARY;
        root.innerHTML = markup(prefix, sections, secondary);
        show("root");
      }

      if (w.GemContent) {
        w.GemContent.get(function (data) {
          if (!data || !data.nav) return;
          if (root.hidden) redraw(data.nav);
          else pending = data.nav;
        });
      }

      var closeInner = close;
      close = function () {
        closeInner();
        if (pending) {
          var t = pending;
          pending = null;
          /* after the slide-out finishes, so the list does not change under a
             drawer still animating away */
          w.setTimeout(function () { redraw(t); }, 360);
        }
      };
      instance.close = close;

      api.mounted = instance;
      return instance;
    },
    mounted: null
  };

  w.GemNav = api;
})(window, document);
