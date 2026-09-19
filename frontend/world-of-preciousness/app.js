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

  /* One switcher for both the knowledge tabs and the facet rail: buttons
     carrying data-target, panels carrying the matching id. */
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

  function init() {
    paintGems(d);
    d.querySelectorAll("[data-switcher]").forEach(wireSwitcher);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();

  w.WOP = { gemSvg: gemSvg, paintGems: paintGems };
})(window, document);
