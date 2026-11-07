/* Postcards from the mines — the Collector's Bench.
 *
 * A stack of postcards from Tanzania: a photograph on the front, a note on
 * the back. Drag (or swipe) the top card away to send it to the bottom of
 * the stack, tap it to turn it over, and drag the loupe across a photograph
 * to look closer. Buttons and the arrow keys do the same for anyone not
 * using a pointer. Every line on the cards is the house's own, from the
 * Mining, Maasai Women and World of Preciousness pages.
 *
 *   <section data-postcards></section>   (filled by this file)
 */
(function (w, d) {
  "use strict";

  var CARDS = [
    { img: "/mining/img/gorge.webp", alt: "A mining gorge in northern Tanzania, from above.",
      place: "Northern Tanzania", note: "There is only one source of high-quality tanzanite in the world: a few square kilometres at the foot of Kilimanjaro." },
    { img: "/mining/img/hills.webp", alt: "The workings among green hills.",
      place: "At the mine", note: "Every stone begins in Tanzania, and we choose it there, where it comes out of the ground." },
    { img: "/wishlist/img/rough.webp", alt: "A piece of rough gemstone lit from within.",
      place: "Rough", note: "Rough, as it leaves the mine. It is sorted and graded by hand before it reaches the workshop." },
    { img: "/world-of-preciousness/img/sorting.webp", alt: "A gem sorter grading parcels of coloured stones at a light table.",
      place: "Sorting", note: "Sorted and graded by hand, parcel by parcel, at the light table." },
    { img: "/world-of-preciousness/img/parcel.webp", alt: "A parcel of pink spinel held open with tweezers.",
      place: "The parcel", note: "Chosen, stone by stone, for the pieces it will become, then cut in our own workshop." },
    { img: "/maasai-women/img/m2.webp", alt: "Maasai women making jewellery together.",
      place: "Rural Arusha", note: "The Maasai tell of a lightning bolt that struck the earth and lit the rocks a brilliant blue. That, they say, is how tanzanite was made." },
    { img: "/mining/img/camp.webp", alt: "The camp at the mine, from the air.",
      place: "Until next time", note: "From the ground to your Collector's Bench: every piece you keep here began like this." },
  ];

  var reduced = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function cardHtml(c, i) {
    return '<article class="pc-card" data-i="' + i + '" aria-roledescription="postcard">' +
      '<div class="pc-face pc-front">' +
        '<img src="' + c.img + '" alt="' + esc(c.alt) + '" draggable="false" loading="' + (i < 2 ? "eager" : "lazy") + '" decoding="async">' +
        '<span class="pc-caption">' + esc(c.place) + "</span>" +
      "</div>" +
      '<div class="pc-face pc-back" aria-hidden="true">' +
        '<div class="pc-note"><p>' + esc(c.note) + '</p><p class="pc-sign">Gem Experience</p></div>' +
        '<div class="pc-address">' +
          '<img class="pc-stamp" src="/craftsmanship/img/stamp.w640.webp" alt="" draggable="false">' +
          '<svg class="pc-postmark" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/><circle cx="60" cy="60" r="40"/>' +
            '<path id="pc-arc-' + i + '" d="M60 60m-47 0a47 47 0 1 1 94 0a47 47 0 1 1-94 0" fill="none" stroke="none"/>' +
            '<text><textPath href="#pc-arc-' + i + '">GEM EXPERIENCE · TANZANIA · GEM EXPERIENCE ·</textPath></text>' +
            '<text x="60" y="66" text-anchor="middle" class="pc-pm-n">' + String(i + 1).padStart(2, "0") + "</text></svg>" +
          '<span class="pc-line">To your</span><span class="pc-line">Collector’s Bench</span><span class="pc-line"></span>' +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function build(root) {
    root.classList.add("pc");
    root.innerHTML =
      '<h2 class="pg-section-title" id="pc-title">Postcards from the mines</h2>' +
      '<p class="pg-lede">Every piece you set aside began as rough in Tanzania. A few postcards from where it starts.</p>' +
      '<div class="pc-desk">' +
        '<div class="pc-stack" tabindex="0" aria-live="polite" aria-label="Postcards. Use the arrow keys to move through them and Enter to turn one over.">' +
          CARDS.map(cardHtml).join("") +
        "</div>" +
        '<div class="pc-loupe" aria-hidden="true"><div class="pc-lens"></div><span class="pc-handle"></span></div>' +
      "</div>" +
      '<div class="pc-bar">' +
        '<button type="button" class="pc-btn" data-prev aria-label="Previous postcard">‹</button>' +
        '<span class="pc-count" aria-hidden="true"></span>' +
        '<button type="button" class="pc-btn pc-btn--turn" data-turn>Turn over</button>' +
        '<button type="button" class="pc-btn" data-next aria-label="Next postcard">›</button>' +
      "</div>" +
      '<p class="pc-hint">Drag a postcard away for the next · tap to turn it over · drag the loupe to look closer</p>';

    var stack = root.querySelector(".pc-stack");
    var cards = [].slice.call(root.querySelectorAll(".pc-card"));
    var count = root.querySelector(".pc-count");
    var order = cards.map(function (_, i) { return i; });
    var flipped = false;

    function layout() {
      order.forEach(function (ci, depth) {
        var c = cards[ci];
        c.style.zIndex = String(cards.length - depth);
        // the cards below sit slightly askew, like a pile on a desk
        var tilt = depth === 0 ? 0 : ((ci * 37) % 9) - 4;
        c.style.setProperty("--tilt", tilt + "deg");
        c.style.setProperty("--lift", Math.min(depth, 3) * 6 + "px");
        c.classList.toggle("is-top", depth === 0);
        c.classList.toggle("is-hidden", depth > 3);
        c.classList.remove("is-flipped");
      });
      flipped = false;
      count.textContent = String(order[0] + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
      var top = cards[order[0]];
      top.querySelector(".pc-back").setAttribute("aria-hidden", "true");
      stack.setAttribute("aria-label", "Postcard " + (order[0] + 1) + " of " + cards.length + ": " + CARDS[order[0]].place + ".");
      loupeTarget();
    }

    function next(dir) {
      var top = cards[order[0]];
      if (dir > 0) {
        top.classList.add("is-leaving");
        setTimeout(function () { top.classList.remove("is-leaving"); order.push(order.shift()); layout(); }, reduced ? 0 : 260);
      } else {
        order.unshift(order.pop()); layout();
      }
    }

    function turn() {
      var top = cards[order[0]];
      flipped = !flipped;
      top.classList.toggle("is-flipped", flipped);
      top.querySelector(".pc-back").setAttribute("aria-hidden", String(!flipped));
      root.classList.toggle("is-back", flipped);
    }

    // drag the top card: a short drag is a tap (turn over), a long one sends it on
    var drag = null;
    stack.addEventListener("pointerdown", function (e) {
      var top = cards[order[0]];
      if (!top.contains(e.target)) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, card: top, moved: false };
      top.setPointerCapture(e.pointerId);
      top.classList.add("is-dragging");
    });
    stack.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      drag.card.style.setProperty("--dx", dx + "px");
      drag.card.style.setProperty("--dy", dy * 0.35 + "px");
      drag.card.style.setProperty("--rot", dx / 18 + "deg");
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, card = drag.card, moved = drag.moved;
      card.classList.remove("is-dragging");
      card.style.removeProperty("--dx"); card.style.removeProperty("--dy"); card.style.removeProperty("--rot");
      drag = null;
      if (Math.abs(dx) > 90) next(1);
      else if (!moved) turn();
    }
    stack.addEventListener("pointerup", end);
    stack.addEventListener("pointercancel", end);

    root.querySelector("[data-next]").addEventListener("click", function () { next(1); });
    root.querySelector("[data-prev]").addEventListener("click", function () { next(-1); });
    root.querySelector("[data-turn]").addEventListener("click", turn);
    stack.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); next(-1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); }
    });

    /* ------------------------------------------------------- the loupe
       A jeweller's loupe resting by the stack. Dragged over the top card's
       photograph, it shows that part of it at three times the size. */
    var loupe = root.querySelector(".pc-loupe"), lens = root.querySelector(".pc-lens"), desk = root.querySelector(".pc-desk");
    var ZOOM = 3, lp = null, src = "";
    function loupeTarget() {
      var img = cards[order[0]].querySelector(".pc-front img");
      src = img.currentSrc || img.src;
      lens.style.backgroundImage = 'url("' + src + '")';
      place();
    }
    function place() {
      var img = cards[order[0]].querySelector(".pc-front img");
      var ir = img.getBoundingClientRect(), lr = lens.getBoundingClientRect();
      var cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2;
      var inside = !flipped && cx > ir.left && cx < ir.right && cy > ir.top && cy < ir.bottom;
      loupe.classList.toggle("is-over", inside);
      if (!inside) return;
      // background-size covers the photo the way object-fit: cover does
      var nw = img.naturalWidth || ir.width, nh = img.naturalHeight || ir.height;
      var s = Math.max(ir.width / nw, ir.height / nh);
      var bw = nw * s * ZOOM, bh = nh * s * ZOOM;
      var ox = (ir.width - nw * s) / 2, oy = (ir.height - nh * s) / 2;
      var px = (cx - ir.left - ox) * ZOOM, py = (cy - ir.top - oy) * ZOOM;
      lens.style.backgroundSize = bw + "px " + bh + "px";
      lens.style.backgroundPosition = (lr.width / 2 - px) + "px " + (lr.height / 2 - py) + "px";
    }
    loupe.addEventListener("pointerdown", function (e) {
      var r = loupe.getBoundingClientRect();
      lp = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top };
      loupe.setPointerCapture(e.pointerId);
      loupe.classList.add("is-held");
      e.preventDefault();
    });
    loupe.addEventListener("pointermove", function (e) {
      if (!lp || e.pointerId !== lp.id) return;
      var dr = desk.getBoundingClientRect();
      loupe.style.left = (e.clientX - dr.left - lp.ox) + "px";
      loupe.style.top = (e.clientY - dr.top - lp.oy) + "px";
      loupe.style.right = "auto"; loupe.style.bottom = "auto";
      place();
    });
    function drop(e) { if (lp && e.pointerId === lp.id) { lp = null; loupe.classList.remove("is-held"); } }
    loupe.addEventListener("pointerup", drop);
    loupe.addEventListener("pointercancel", drop);
    w.addEventListener("resize", place);
    cards.forEach(function (c) { c.querySelector(".pc-front img").addEventListener("load", function () { if (c === cards[order[0]]) loupeTarget(); }); });

    layout();
  }

  function start() { d.querySelectorAll("[data-postcards]").forEach(build); }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start); else start();
})(window, document);
