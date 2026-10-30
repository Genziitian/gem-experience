/* Behaviour every page shares, loaded by site-nav.js so no page needs its
 * own script tag:
 *
 *  - the header stays pinned, slides away while scrolling down and comes
 *    back as soon as the reader scrolls up;
 *  - FAQ and detail accordions open one section at a time;
 *  - product photographs can be magnified: a lens follows the pointer on a
 *    desktop, and a tap opens the photograph full screen to pinch and pan.
 */
(function (w, d) {
  "use strict";
  if (w.GemUX) return;

  /* ------------------------------------------------------------ header */
  var HEADERS = ".pg-hdr, header.hdr, .fj-hdr";

  function css() {
    var s = d.createElement("style");
    s.id = "ge-ux-css";
    s.textContent =
      ".ge-hdr-auto{transition:transform .32s cubic-bezier(.2,.6,.2,1)}" +
      ".ge-hdr-auto.ge-hdr-away{transform:translateY(-101%)}" +
      ".ge-zoom-lens{position:relative;overflow:hidden;cursor:zoom-in}" +
      ".ge-zoom-lens.is-zooming img{transform:scale(2.2);transition:transform .12s ease-out}" +
      ".ge-zoom-lens.is-zooming .fj-plate-hover{opacity:0!important}" +
      ".ge-zoom-box{position:fixed;inset:0;z-index:200;background:#fff;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom}" +
      ".ge-zoom-box img{display:block;width:200%;max-width:none;height:auto;margin:0 auto}" +
      "@media (min-width:901px){.ge-zoom-box img{width:auto;max-width:none;min-width:100%}}" +
      ".ge-zoom-close{position:fixed;top:14px;right:14px;z-index:201;width:44px;height:44px;border:0;border-radius:50%;" +
      "background:rgba(255,255,255,.92);box-shadow:0 1px 8px rgba(0,0,0,.18);font:300 26px/44px Jost,sans-serif;color:#17140f;cursor:pointer}" +
      ".ge-zoom-hint{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:201;padding:8px 14px;border-radius:999px;" +
      "background:rgba(23,20,15,.78);color:#fff;font:400 12px/1 Jost,sans-serif;letter-spacing:.06em}" +
      "@media (prefers-reduced-motion:reduce){.ge-hdr-auto{transition:none}}";
    d.head.appendChild(s);
  }

  function header() {
    var last = w.scrollY, ticking = false;
    function hdrs() { return d.querySelectorAll(HEADERS); }
    function update() {
      ticking = false;
      var y = w.scrollY;
      // a menu, drawer or dialog that is open keeps the header in place
      var locked = d.body.style.overflow === "hidden" || d.documentElement.classList.contains("nav-open");
      var away = !locked && y > last && y > 120;
      if (Math.abs(y - last) < 6 && y > 0) return;
      hdrs().forEach(function (h) {
        h.classList.add("ge-hdr-auto");
        h.classList.toggle("ge-hdr-away", away);
      });
      last = y;
    }
    w.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; w.requestAnimationFrame(update); }
    }, { passive: true });
    // reaching for the header with the keyboard brings it back
    d.addEventListener("focusin", function (e) {
      var h = e.target.closest && e.target.closest(HEADERS);
      if (h) h.classList.remove("ge-hdr-away");
    });
  }

  /* -------------------------------------------------------- accordions */
  /* Native <details> keep their own state; opening one closes the others in
     the same family on the page, so only one answer is open at a time. */
  var FAMILIES = ["faq-item", "fj-acc-item"];

  function accordions() {
    d.addEventListener("toggle", function (e) {
      var el = e.target;
      if (!el || el.tagName !== "DETAILS" || !el.open) return;
      var fam = FAMILIES.filter(function (c) { return el.classList.contains(c); })[0];
      if (!fam) return;
      d.querySelectorAll("details." + fam + "[open]").forEach(function (o) {
        if (o !== el) o.open = false;
      });
    }, true);
  }

  /* -------------------------------------------------------- magnifier */
  var ZOOMABLE = ".fj-pdp-media .fj-plate, .gal-slide";
  var fine = w.matchMedia("(hover: hover) and (pointer: fine)");

  function fullSrc(img) {
    // the largest file the srcset offers, else the src itself
    var set = (img.getAttribute("srcset") || "").split(",").map(function (s) { return s.trim().split(/\s+/); });
    var best = set.reduce(function (a, b) { return parseInt(b[1], 10) > parseInt(a[1] || 0, 10) ? b : a; }, [img.currentSrc || img.src, "0"]);
    return best[0] || img.src;
  }

  function openBox(img) {
    var box = d.createElement("div");
    box.className = "ge-zoom-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Photograph, enlarged");
    var big = d.createElement("img");
    big.src = fullSrc(img);
    big.alt = img.alt || "";
    box.appendChild(big);
    var close = d.createElement("button");
    close.className = "ge-zoom-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    var hint = d.createElement("span");
    hint.className = "ge-zoom-hint";
    hint.textContent = fine.matches ? "Scroll to look around" : "Pinch or drag to look around";
    var prev = d.body.style.overflow;
    d.body.style.overflow = "hidden";
    function shut() {
      box.remove(); close.remove(); hint.remove();
      d.body.style.overflow = prev;
      d.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") shut(); }
    close.addEventListener("click", shut);
    d.addEventListener("keydown", onKey);
    d.body.appendChild(box); d.body.appendChild(close); d.body.appendChild(hint);
    // open on the middle of the photograph
    big.addEventListener("load", function () {
      box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
      box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
    });
    close.focus();
    w.setTimeout(function () { hint.remove(); }, 2600);
  }

  function magnifier() {
    d.addEventListener("mousemove", function (e) {
      if (!fine.matches) return;
      var frame = e.target.closest && e.target.closest(ZOOMABLE);
      if (!frame) return;
      var img = frame.querySelector(".fj-plate-img, img");
      if (!img) return;
      frame.classList.add("ge-zoom-lens", "is-zooming");
      var r = frame.getBoundingClientRect();
      img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
    });
    d.addEventListener("mouseout", function (e) {
      var frame = e.target.closest && e.target.closest(ZOOMABLE);
      if (frame && !frame.contains(e.relatedTarget)) frame.classList.remove("is-zooming");
    });
    d.addEventListener("click", function (e) {
      var frame = e.target.closest && e.target.closest(ZOOMABLE);
      if (!frame || e.target.closest("a, button")) return;
      var img = frame.querySelector(".fj-plate-img, img");
      if (img) { e.preventDefault(); openBox(img); }
    });
  }

  function start() {
    css(); header(); accordions(); magnifier();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start); else start();
  w.GemUX = { version: 1 };
})(window, document);
