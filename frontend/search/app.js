/* Site search.
 *
 * Everything is searched in the browser. The catalogue is small enough to
 * hold in memory (a few hundred records), and the files it lives in are
 * already static — the same data.js files the collection pages load — so a
 * search server would add a moving part without making anything faster.
 *
 * Sources:
 *   High Jewellery pieces and their stories   high-jewellery/data.js, stories.js
 *   Fine Jewellery pieces and collections     fine-jewellery/data.js
 *   Journal posts                             Supabase, via GemBlog
 *   FAQs                                      Supabase, via GemFaqs (with fallback)
 *   Pages                                     the list below
 *
 * The query lives in ?q=, so a search can be linked, bookmarked and reached
 * from the header icon on every page.
 */
(function (w, d) {
  "use strict";

  GemShell.mount();

  var esc = GemMarkdown.esc;
  var toText = GemMarkdown.toText;

  var GROUPS = [
    { key: "hj", label: "High Jewellery" },
    { key: "fj", label: "Fine Jewellery" },
    { key: "story", label: "Stories" },
    { key: "journal", label: "Journal" },
    { key: "faq", label: "FAQs" },
    { key: "page", label: "Pages" }
  ];

  var SUGGEST = ["Tanzanite", "Spinel", "Earrings", "Necklaces", "Rings", "Bloom", "Safar", "Gifts", "Delivery"];

  /* The pages worth finding by name. `k` is the words somebody might type
     for a page whose title does not contain them. */
  var PAGES = [
    { t: "High Jewellery", u: "/high-jewellery/", s: "Singular pieces, each cut from a stone we followed out of the ground.", k: "collection necklaces earrings rings tiaras bracelets" },
    { t: "High Jewellery stories", u: "/high-jewellery/stories/", s: "How each High Jewellery piece came to be, in the house's own words.", k: "story making craftsmanship" },
    { t: "Fine Jewellery", u: "/fine-jewellery/", s: "Bloom, Safar, Tide and Swirl: coloured stones for every day.", k: "bloom safar tide swirl everyday" },
    { t: "Gifts", u: "/gifts/", s: "Pieces chosen to be given, with a card written by hand.", k: "gift present card message personalise wrapping" },
    { t: "World of Preciousness", u: "/world-of-preciousness/", s: "Colour, cut, clarity and character. How a coloured stone is read.", k: "gemstones education tsavorite rhodolite garnet 4cs" },
    { t: "Tanzanite", u: "/world-of-preciousness/tanzanite/", s: "A trichroic stone from a few square kilometres at the foot of Kilimanjaro.", k: "merelani trichroic blue violet gemstone" },
    { t: "Pink Spinel", u: "/world-of-preciousness/spinel/", s: "The stone that spent six centuries in the Crown Jewels under the wrong name.", k: "mahenge spinel gemstone pink red" },
    { t: "Book an appointment", u: "/appointment/", s: "A private viewing with an adviser, at an atelier or with you.", k: "private viewing visit consultation booking" },
    { t: "Request a quotation", u: "/quotation/", s: "Ask for the price of a piece or a commission.", k: "price quote cost commission bespoke" },
    { t: "Contact us", u: "/contact/", s: "Speak to an adviser by phone, WhatsApp or email.", k: "phone email whatsapp help support adviser" },
    { t: "Find our store", u: "/offices/", s: "Our ateliers and the stores that stock us.", k: "offices ateliers stores locations address dubai jaipur india tanzania zanzibar arusha map" },
    { t: "FAQs", u: "/faqs/", s: "Answers on pricing, delivery, returns, care and gifting.", k: "questions help delivery shipping returns care" },
    { t: "Journal", u: "/blog/", s: "Stones, the places they come from, and the hands that set them.", k: "blog articles news stories" },
    { t: "My account", u: "/account/", s: "Your enquiries and orders.", k: "login sign in orders profile" },
    { t: "Legal", u: "/legal/", s: "Privacy policy, cookie policy, and terms and conditions.", k: "privacy cookies terms conditions policy" },
    { t: "Cart", u: "/cart/", s: "The pieces you have set aside.", k: "bag basket checkout" }
  ];

  /* ------------------------------------------------------------ the index */

  function fold(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* Every string anywhere inside a value, for the story entries, whose
     fields are a mix of strings, arrays and small objects. */
  function flatten(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map(flatten).join(" ");
    if (typeof v === "object") return Object.keys(v).map(function (k) { return flatten(v[k]); }).join(" ");
    return String(v);
  }

  function real(v) { return v && v !== "—" ? v : ""; }

  function doc(group, title, url, opts) {
    opts = opts || {};
    return {
      group: group,
      title: title,
      url: url,
      kicker: opts.kicker || "",
      img: opts.img || "",
      snippet: opts.snippet || "",
      body: opts.body || "",
      /* folded once, here, rather than on every keystroke */
      _t: fold(title),
      _k: fold(opts.keys || ""),
      _b: fold(opts.body || opts.snippet || "")
    };
  }

  var index = [];

  function buildStatic() {
    var out = [];
    var hj = w.HJ_DATA || { products: [] };
    var stories = w.HJ_STORIES || {};
    var fj = w.FJ_DATA || { products: [], collections: [] };

    hj.products.forEach(function (p) {
      var story = stories[p.id];
      out.push(doc("hj", p.name, "/high-jewellery/#/product/" + encodeURIComponent(p.id), {
        kicker: "High Jewellery · " + p.type,
        img: p.gallery && p.gallery[0] ? "/high-jewellery/" + p.gallery[0] : "",
        snippet: real(p.materials),
        keys: [p.materials, p.type, p.collection, p.occasion, real(p.origin), real(p.metal), real(p.ref), "high jewellery"].join(" "),
        body: [p.story, story ? flatten(story) : ""].join(" ")
      }));
      if (story && p.storyUrl) {
        out.push(doc("story", p.name + ": the story", p.storyUrl, {
          kicker: "Story",
          img: p.gallery && p.gallery[1] ? "/high-jewellery/" + p.gallery[1] : "",
          snippet: story.lede || "",
          /* not the name again: it is already in the title, and counting it
             twice ranked a story above the piece it is about */
          keys: [p.materials, "story"].join(" "),
          body: flatten(story)
        }));
      }
    });

    fj.collections.forEach(function (c) {
      out.push(doc("fj", c.name, "/fine-jewellery/#/" + encodeURIComponent(c.id), {
        kicker: "Fine Jewellery · Collection",
        img: c.banner ? "/fine-jewellery/" + c.banner : "",
        snippet: c.lede || "",
        keys: [c.meta, c.designer, "collection fine jewellery"].join(" "),
        body: c.story || ""
      }));
    });

    fj.products.forEach(function (p) {
      out.push(doc("fj", p.name, "/fine-jewellery/#/p/" + encodeURIComponent(p.id), {
        kicker: "Fine Jewellery · " + p.collection,
        img: p.images && p.images[0] ? "/fine-jewellery/" + p.images[0] : "",
        snippet: [p.stone, p.metal].filter(Boolean).join(" · "),
        keys: [p.stone, p.metal, p.type, p.collection, p.shape, p.sku, "fine jewellery"].join(" "),
        body: p.story || ""
      }));
    });

    PAGES.forEach(function (pg) {
      out.push(doc("page", pg.t, pg.u, { kicker: "Page", snippet: pg.s, keys: pg.k, body: pg.s }));
    });

    return out;
  }

  var live = { faq: [], journal: [] };

  function faqDocs(cats) {
    var out = [];
    cats.forEach(function (c) {
      c.items.forEach(function (it) {
        out.push(doc("faq", it.q, "/faqs/#" + encodeURIComponent(c.slug), {
          kicker: "FAQ · " + c.label,
          snippet: toText(it.a),
          keys: c.label,
          body: toText(it.a)
        }));
      });
    });
    return out;
  }

  function journalDocs(posts) {
    return posts.map(function (p) {
      return doc("journal", p.title, GemBlog.postUrl(p.slug), {
        kicker: "Journal" + (p.published_at ? " · " + GemBlog.formatDate(p.published_at) : ""),
        img: p.cover_image || "",
        snippet: GemBlog.summary(p, 200),
        keys: (p.tags || []).join(" ") + " " + (p.author || ""),
        body: (p.excerpt || "") + " " + toText(p.body)
      });
    });
  }

  function rebuild() {
    index = buildStatic().concat(live.journal, live.faq);
  }

  /* ------------------------------------------------------------- matching */

  function tokens(q) {
    return fold(q).split(/[^a-z0-9]+/).filter(function (t) { return t.length > 0; });
  }

  /* "rings" should find "Ring", "necklaces" "Necklace". A light singular,
     not a stemmer: only a trailing s on words long enough to carry one. */
  function forms(t) {
    return t.length > 3 && /s$/.test(t) ? [t, t.replace(/(es|s)$/, ""), t.slice(0, -1)] : [t];
  }

  /* Words match from their start: "ring" finds "Rings" and "ring-shaped"
     but not "earrings", which a plain substring search would, and "tanz"
     finds "Tanzanite" as it is being typed. Tokens are [a-z0-9] only, so they
     are safe to put in a pattern as they are. */
  var patterns = {};
  function wordStart(f) {
    return patterns[f] || (patterns[f] = new RegExp("(^|[^a-z0-9])" + f));
  }

  function has(hay, t) {
    return forms(t).some(function (f) { return wordStart(f).test(hay); });
  }

  /* Every word of the query has to appear somewhere in the record; where it
     appears decides the order. A name match outranks a keyword, which
     outranks a mention in the body. */
  function score(r, toks, whole) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      var inT = has(r._t, t), inK = has(r._k, t), inB = has(r._b, t);
      if (!inT && !inK && !inB) return 0;
      if (inT) s += 24;
      if (inK) s += 8;
      if (inB) s += 2;
    }
    if (r._t === whole) s += 100;
    else if (r._t.indexOf(whole) === 0) s += 40;
    else if (r._t.indexOf(whole) !== -1) s += 20;
    if (r.group === "hj" || r.group === "fj") s += 6;     // pieces before prose
    return s;
  }

  function search(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    var whole = fold(q).trim();
    return index
      .map(function (r) { return { r: r, s: score(r, toks, whole) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.r.title.localeCompare(b.r.title); })
      .map(function (x) { return x.r; });
  }

  /* ------------------------------------------------------------- drawing */

  /* Marks every occurrence of the query's words. Works on the raw text and
     escapes each piece as it goes, so a <mark> can never split an entity. */
  function highlight(raw, toks) {
    raw = String(raw || "");
    var lower = fold(raw);
    var ranges = [];
    toks.forEach(function (t) {
      forms(t).forEach(function (f) {
        if (!f) return;
        var re = new RegExp("(^|[^a-z0-9])(" + f + ")", "g"), m;
        while ((m = re.exec(lower))) {
          var i = m.index + m[1].length;
          ranges.push([i, i + f.length]);
        }
      });
    });
    if (!ranges.length) return esc(raw);
    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [ranges[0]];
    ranges.slice(1).forEach(function (r) {
      var last = merged[merged.length - 1];
      if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push(r);
    });
    var out = "", pos = 0;
    merged.forEach(function (r) {
      out += esc(raw.slice(pos, r[0])) + "<mark>" + esc(raw.slice(r[0], r[1])) + "</mark>";
      pos = r[1];
    });
    return out + esc(raw.slice(pos));
  }

  /* The snippet shows where the match is: the summary when it contains a
     query word, otherwise a window of the body around the first hit. */
  function snippet(r, toks) {
    var base = r.snippet || "";
    var fb = fold(base);
    if (!base || toks.some(function (t) { return has(fb, t); })) return base;
    var body = r.body || "";
    var fbody = fold(body);
    var at = -1;
    toks.some(function (t) {
      return forms(t).some(function (f) {
        var m = wordStart(f).exec(fbody);
        at = m ? m.index + m[1].length : -1;
        return at !== -1;
      });
    });
    if (at === -1) return base;
    var start = Math.max(0, body.lastIndexOf(" ", Math.max(0, at - 70)));
    var end = body.indexOf(" ", Math.min(body.length, at + 110));
    var cut = body.slice(start, end === -1 ? body.length : end).trim();
    return (start > 0 ? "…" : "") + cut + (end !== -1 && end < body.length ? "…" : "");
  }

  var form = d.getElementById("srch-form");
  var input = d.getElementById("srch-q");
  var clear = d.getElementById("srch-clear");
  var status = d.getElementById("srch-status");
  var tabs = d.getElementById("srch-tabs");
  var results = d.getElementById("srch-results");
  var filter = "all";

  /* Some catalogue images are still to be shot (the Tide and Swirl banners,
     a few products); a missing one drops out and leaves the tinted plate. */
  function pieceCard(r, toks) {
    return '<a class="srch-piece" href="' + esc(r.url) + '">' +
      '<div class="srch-piece-media">' +
        (r.img ? '<img src="' + esc(r.img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : "") +
      "</div>" +
      '<span class="srch-kicker">' + esc(r.kicker) + "</span>" +
      '<h3 class="srch-piece-title">' + highlight(r.title, toks) + "</h3>" +
      (r.snippet ? '<p class="srch-piece-sub">' + highlight(r.snippet, toks) + "</p>" : "") +
    "</a>";
  }

  function rowHtml(r, toks) {
    var s = snippet(r, toks);
    return '<a class="srch-row" href="' + esc(r.url) + '">' +
      (r.img ? '<div class="srch-row-media"><img src="' + esc(r.img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()"></div>' : "") +
      '<div class="srch-row-body">' +
        '<span class="srch-kicker">' + esc(r.kicker) + "</span>" +
        '<h3 class="srch-row-title">' + highlight(r.title, toks) + "</h3>" +
        (s ? '<p class="srch-row-sub">' + highlight(s, toks) + "</p>" : "") +
      "</div>" +
    "</a>";
  }

  function section(g, list, toks, capped) {
    var isPiece = g.key === "hj" || g.key === "fj";
    var cap = capped ? (isPiece ? 8 : 4) : list.length;
    var shown = list.slice(0, cap);
    return '<section class="srch-group" aria-labelledby="srch-g-' + g.key + '">' +
      '<header class="srch-group-head">' +
        '<h2 class="srch-group-title" id="srch-g-' + g.key + '">' + esc(g.label) +
          ' <span class="srch-count">' + list.length + "</span></h2>" +
        (capped && list.length > cap
          ? '<button class="pg-link srch-more" type="button" data-group="' + g.key + '">See all ' + list.length + "</button>"
          : "") +
      "</header>" +
      (isPiece
        ? '<div class="srch-pieces">' + shown.map(function (r) { return pieceCard(r, toks); }).join("") + "</div>"
        : '<div class="srch-rows">' + shown.map(function (r) { return rowHtml(r, toks); }).join("") + "</div>") +
    "</section>";
  }

  function emptyHtml(q) {
    return '<div class="srch-empty">' +
      (q
        ? '<h2 class="pg-section-title">Nothing matches “' + esc(q) + "”</h2>" +
          '<p class="pg-note">Try a stone, a colour or a kind of piece, or ask an adviser, who can find what the catalogue cannot.</p>'
        : '<h2 class="pg-section-title">What are you looking for?</h2>' +
          '<p class="pg-note">Search by piece, stone, colour, collection, or a question.</p>') +
      '<div class="srch-suggest">' + SUGGEST.map(function (s) {
        return '<a class="pg-tab" href="?q=' + encodeURIComponent(s) + '" data-suggest="' + esc(s) + '">' + esc(s) + "</a>";
      }).join("") + "</div>" +
      (q ? '<div class="pg-actions srch-empty-actions"><a class="pg-btn" href="../contact/">Speak to an adviser</a></div>' : "") +
    "</div>";
  }

  function draw() {
    var q = input.value.trim();
    clear.hidden = !input.value;
    var toks = tokens(q);
    var hits = search(q);

    if (!q || !hits.length) {
      tabs.hidden = true;
      status.textContent = q ? "No results for “" + q + "”" : "";
      results.innerHTML = emptyHtml(q);
      return;
    }

    var by = {};
    GROUPS.forEach(function (g) { by[g.key] = []; });
    hits.forEach(function (r) { by[r.group].push(r); });
    /* Sections run in the order of their best result, so "Bloom" opens on
       the Fine Jewellery collection of that name rather than on a High
       Jewellery piece whose story mentions blooming. `hits` is already
       ranked, so a group's first appearance in it is its best. */
    var firstAt = {};
    hits.forEach(function (r, i) { if (!(r.group in firstAt)) firstAt[r.group] = i; });
    var present = GROUPS.filter(function (g) { return by[g.key].length; })
      .sort(function (a, b) { return firstAt[a.key] - firstAt[b.key]; });
    if (filter !== "all" && !by[filter].length) filter = "all";

    status.textContent = hits.length + (hits.length === 1 ? " result" : " results") + " for “" + q + "”";

    tabs.hidden = present.length < 2;
    tabs.innerHTML = [{ key: "all", label: "All" }].concat(present).map(function (g) {
      var n = g.key === "all" ? hits.length : by[g.key].length;
      return '<button class="pg-tab' + (g.key === filter ? " is-on" : "") + '" type="button" role="tab"' +
        ' aria-selected="' + (g.key === filter) + '" data-group="' + g.key + '">' +
        esc(g.label) + ' <span class="srch-tab-n">' + n + "</span></button>";
    }).join("");

    results.innerHTML = (filter === "all" ? present : present.filter(function (g) { return g.key === filter; }))
      .map(function (g) { return section(g, by[g.key], toks, filter === "all"); }).join("");
  }

  /* ---------------------------------------------------------------- wiring */

  var timer = null;
  function syncUrl() {
    var q = input.value.trim();
    history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname);
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { filter = "all"; draw(); syncUrl(); }, 120);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearTimeout(timer);
    draw();
    syncUrl();
    input.blur();       // closes the keyboard on a phone
  });

  clear.addEventListener("click", function () {
    input.value = "";
    filter = "all";
    draw();
    syncUrl();
    input.focus();
  });

  d.addEventListener("click", function (e) {
    var g = e.target.closest("[data-group]");
    if (g) {
      filter = g.getAttribute("data-group");
      draw();
      if (g.classList.contains("srch-more")) w.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    var s = e.target.closest("[data-suggest]");
    if (s) {
      e.preventDefault();
      input.value = s.getAttribute("data-suggest");
      filter = "all";
      draw();
      syncUrl();
    }
  });

  /* ------------------------------------------------------------------ boot */

  input.value = new URLSearchParams(location.search).get("q") || "";
  rebuild();
  draw();
  if (!input.value) input.focus();

  /* The live sources arrive after the first draw; each redraws when it lands
     so a journal post or an edited FAQ appears without a reload. */
  GemFaqs.get(function (cats) {
    live.faq = faqDocs(cats);
    rebuild();
    draw();
  });
  GemBlog.list().then(function (posts) {
    if (!posts || !posts.length) return;
    live.journal = journalDocs(posts);
    rebuild();
    draw();
  });
})(window, document);
