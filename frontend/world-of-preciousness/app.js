/* World of Preciousness — the cut-stone sprite and the two switchers.

   The stones are drawn rather than photographed: the pages need a gem at a
   dozen sizes, in five colours, and a drawing scales and recolours where a
   cut-out would have to be re-shot. Each symbol is an outline plus its facet
   lines, so it reads as a cut stone at 44px and at 400px. */
(function (w, d) {
  "use strict";

  /* girdle outline, then the facet lines that sit on top of it */
  var CUTS = {
    cushion: {
      body: "M34 8h32a26 26 0 0 1 26 26v32a26 26 0 0 1-26 26H34A26 26 0 0 1 8 66V34A26 26 0 0 1 34 8Z",
      facets: "M30 30h40v40H30ZM34 8 30 30M66 8 70 30M8 34l22-4M8 66l22 4M92 34l-22-4M92 66l-22 4M34 92l-4-22M66 92l4-22"
    },
    oval: {
      body: "M50 5c19 0 33 20 33 45S69 95 50 95 17 75 17 50 31 5 50 5Z",
      facets: "M50 5 30 32l20 20 20-20ZM30 32 17 50l13 18 20-16Zm40 0 13 18-13 18-20-16ZM30 68l20 27 20-27-20-16Z"
    },
    trillion: {
      body: "M50 8 92 82a6 6 0 0 1-5 9H13a6 6 0 0 1-5-9Z",
      facets: "M50 8 28 55l22 14 22-14ZM28 55 8 91h30l12-22Zm44 0 20 36H62L50 69Z"
    },
    emerald: {
      body: "M32 6h36l18 18v52L68 94H32L14 76V24Z",
      facets: "M32 6 44 22h12L68 6M14 24l16 12v28L14 76M86 24 70 36v28l16 12M32 94l12-16h12l12 16M30 36h40v28H30Z"
    },
    marquise: {
      body: "M50 5c16 14 36 30 36 45S66 81 50 95C34 81 14 65 14 50S34 19 50 5Z",
      facets: "M50 5 32 34l18 18 18-18ZM32 34 14 50l18 16 18-14Zm36 0 18 16-18 16-18-14ZM32 66l18 29 18-29-18-14Z"
    },
    pear: {
      body: "M50 5c14 18 33 32 33 51 0 21-15 39-33 39S17 77 17 56C17 37 36 23 50 5Z",
      facets: "M50 5 32 38l18 16 18-16ZM32 38 17 56l15 18 18-20Zm36 0 15 18-15 18-18-20ZM32 74l18 21 18-21-18-20Z"
    },
    baguette: {
      body: "M12 28h76v44H12Z",
      facets: "M24 40h52v20H24ZM12 28l12 12M88 28 76 40M12 72l12-12M88 72 76 60M40 40v20M60 40v20"
    },
    heart: {
      body: "M50 92C26 74 10 60 10 41A23 23 0 0 1 50 26a23 23 0 0 1 40 15c0 19-16 33-40 51Z",
      facets: "M50 26 30 44l20 16 20-16ZM30 44 12 52l18 14 20-6Zm40 0 18 8-18 14-20-6ZM30 66l20 26 20-26-20-6Z"
    },
    round: {
      body: "M50 8a42 42 0 1 1 0 84 42 42 0 0 1 0-84Z",
      facets: "M50 22 30 36l6 24 14 18 14-18 6-24ZM50 8 50 22M79 29 64 36M92 50 70 60M79 71 64 78M50 92 50 78M21 71l15-7M8 50l22-10M21 29l15 7"
    },
    octagon: {
      body: "M34 8h32l24 24v32L66 92H34L10 64V32Z",
      facets: "M32 32h36v36H32ZM34 8 32 32M66 8l2 24M10 32l22 4M10 64l22-4M90 32l-22 4M90 64l-22-4M34 92l-2-24M66 92l2-24"
    }
  };

  /* Each stone gets a light face, a body colour and a shadowed pavilion, so
     the flat shapes still read as something with depth. */
  var STONES = {
    tanzanite: ["#8fa8ec", "#3b4fc4", "#141a53"],
    spinel:    ["#f2a0c0", "#d83f79", "#5d1030"],
    tsavorite: ["#8fe0a8", "#25a55c", "#0a3d22"],
    rhodolite: ["#e2a2c8", "#b03f74", "#4a112e"],
    malaya:    ["#f6c39a", "#d97a3c", "#5c2710"],
    diamond:   ["#ffffff", "#dfe6ee", "#8e9aa8"]
  };

  function gemSvg(cut, stone, cls) {
    var c = CUTS[cut] || CUTS.cushion;
    var s = STONES[stone] || STONES.tanzanite;
    var id = "g-" + cut + "-" + stone;
    return (
      '<svg class="' + (cls || "") + '" viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">' +
        "<defs>" +
          '<linearGradient id="' + id + '" x1="0" y1="0" x2="0.6" y2="1">' +
            '<stop offset="0%" stop-color="' + s[0] + '"/>' +
            '<stop offset="52%" stop-color="' + s[1] + '"/>' +
            '<stop offset="100%" stop-color="' + s[2] + '"/>' +
          "</linearGradient>" +
        "</defs>" +
        '<path d="' + c.body + '" fill="url(#' + id + ')"/>' +
        '<path d="' + c.facets + '" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.1" ' +
          'stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
        '<path d="' + c.body + '" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.4" ' +
          'vector-effect="non-scaling-stroke"/>' +
      "</svg>"
    );
  }

  /* Fills every <span data-gem="cut stone"> on the page. */
  function paintGems(root) {
    (root || d).querySelectorAll("[data-gem]").forEach(function (el) {
      if (el.dataset.painted) return;
      var parts = el.dataset.gem.split(/\s+/);
      el.innerHTML = gemSvg(parts[0], parts[1], el.dataset.gemClass || "");
      el.dataset.painted = "1";
    });
  }

  /* One switcher for trays and any leftover tab rails: buttons carrying
     data-target, panels carrying the matching id. */
  function wireSwitcher(scope) {
    var btns = Array.prototype.slice.call(scope.querySelectorAll("[data-target]"));
    if (!btns.length) return;

    function show(id) {
      btns.forEach(function (b) {
        var on = b.dataset.target === id;
        b.setAttribute("aria-selected", String(on));
      });
      scope.querySelectorAll("[data-panel]").forEach(function (p) {
        p.hidden = p.dataset.panel !== id;
      });
    }

    btns.forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.target); });
    });
    show(btns[0].dataset.target);
  }

  function wireFilm(figure) {
    var video = figure.querySelector("video");
    var play = figure.querySelector(".wop-film-play");
    if (!video || !play) return;

    function sync() {
      figure.classList.toggle("is-playing", !video.paused);
      play.setAttribute("aria-label", video.paused ? "Play film" : "Pause film");
    }

    play.addEventListener("click", function () {
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    });
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("ended", function () {
      video.currentTime = 0;
      sync();
    });
    sync();
  }

  function pauseFilms(root) {
    (root || d).querySelectorAll(".wop-film-media, .wop-screen-media").forEach(function (v) {
      if (!v.paused) v.pause();
    });
  }

  /* The pinned chapter stage. Height is one viewport per chapter plus one
     so the last scene can be read before the pin lets go. Scroll progress
     drives each chapter's translate: the current screen lifts out, the next
     rises in. Reduced motion keeps the ordinary stacked fallback. */
  function wireStage(stage) {
    var chapters = Array.prototype.slice.call(stage.querySelectorAll("[data-chapter]"));
    var ticks = Array.prototype.slice.call(stage.querySelectorAll("[data-tick]"));
    if (chapters.length < 2) return;

    var reduced = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    stage.classList.add("is-live");
    stage.style.height = (chapters.length + 1) * 100 + "svh";

    var current = -1;
    var HOLD = 0.28;

    function ease(t) {
      return t * t * (3 - 2 * t);
    }

    function setY(el, y) {
      el.style.transform = "translate3d(0," + y + "%,0)";
    }

    var queued = false;
    function measure() {
      queued = false;
      var box = stage.getBoundingClientRect();
      var travel = stage.offsetHeight - w.innerHeight;
      var p = travel <= 0 ? 0 : Math.min(Math.max(-box.top / travel, 0), 0.9999);
      var n = chapters.length;
      var raw = p * n;
      var i = Math.min(Math.floor(raw), n - 1);
      var t = raw - i;
      var wipe = i >= n - 1 ? 0 : (t <= HOLD ? 0 : Math.min(1, (t - HOLD) / (1 - HOLD)));
      var e = ease(wipe);
      var active = e >= 0.5 && i < n - 1 ? i + 1 : i;

      chapters.forEach(function (c, idx) {
        var y = 100;
        if (idx < i) y = -100;
        else if (idx === i) y = -e * 100;
        else if (idx === i + 1) y = (1 - e) * 100;
        setY(c, y);
        c.classList.toggle("is-on", idx === active);
        c.classList.toggle("is-past", idx < active);
        c.style.zIndex = String(idx === i ? 3 : idx === i + 1 ? 2 : 1);
        c.style.pointerEvents = idx === active ? "auto" : "none";
        c.style.visibility = (idx === i || idx === i + 1) ? "visible" : "hidden";
        c.setAttribute("aria-hidden", idx === active ? "false" : "true");
        if (idx === i || idx === i + 1) {
          c.querySelectorAll(".wop-screen-media").forEach(function (v) {
            if (v.paused) v.play().catch(function () {});
          });
        } else {
          pauseFilms(c);
        }
      });

      if (active !== current) {
        current = active;
        ticks.forEach(function (tick, n) { tick.classList.toggle("is-on", n === active); });
      }
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(measure);
    }

    w.addEventListener("scroll", onScroll, { passive: true });
    w.addEventListener("resize", onScroll);
    measure();
  }

  function wireSlider(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
    var dots = Array.prototype.slice.call(root.querySelectorAll("[data-go]"));
    var track = root.querySelector(".wop-cs-slider-track");
    var view = root.querySelector(".wop-cs-slider-view");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    if (!slides.length || !track) return;

    var i = 0;
    var n = slides.length;

    function go(to) {
      i = (to + n) % n;
      var w = (view && view.clientWidth) || track.parentNode.clientWidth;
      track.style.transform = "translate3d(" + (-i * w) + "px,0,0)";
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-on", k === i);
        d.setAttribute("aria-selected", String(k === i));
      });
    }

    if (prev) prev.addEventListener("click", function () { go(i - 1); });
    if (next) next.addEventListener("click", function () { go(i + 1); });
    dots.forEach(function (d) {
      d.addEventListener("click", function () { go(Number(d.dataset.go)); });
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowRight") go(i + 1);
    });

    if (view) {
      var startX = 0;
      view.addEventListener("pointerdown", function (e) { startX = e.clientX; });
      view.addEventListener("pointerup", function (e) {
        var dx = e.clientX - startX;
        if (dx > 50) go(i - 1);
        else if (dx < -50) go(i + 1);
      });
    }

    go(0);
    w.addEventListener("resize", function () { go(i); });
  }

  function init() {
    paintGems(d);
    d.querySelectorAll("[data-switcher]").forEach(wireSwitcher);
    d.querySelectorAll("[data-stage]").forEach(wireStage);
    d.querySelectorAll("[data-film]").forEach(wireFilm);
    d.querySelectorAll("[data-slider]").forEach(wireSlider);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();

  w.WOP = { gemSvg: gemSvg, paintGems: paintGems };
})(window, document);
