/* Frequently asked questions, written in the admin (FAQs) and drawn here.
 *
 * Used twice: /faqs/ shows every category, and a collection page embeds only
 * its own ("fine-jewellery" on Fine Jewellery, "gifts" on Gifts) — the
 * questions somebody asks about a gift are not the ones they ask about a ring.
 *
 * Follows the rules of site-content.js: the questions below are drawn first
 * and remain if Supabase cannot be reached, the last good answer is cached,
 * and nothing here throws. The fallback is the same text the migration seeds,
 * so a visitor sees the same page whether or not the database answered.
 */
(function (w, d) {
  "use strict";

  var CACHE_KEY = "gem_faqs_v1";
  var CACHE_TTL = 10 * 60 * 1000;

  var FALLBACK = [
    {
      slug: "fine-jewellery",
      label: "Fine Jewellery",
      intro: "Pricing, stones, delivery and care for the Bloom, Safar, Tide and Swirl collections.",
      items: [
        { q: "How are Fine Jewellery pieces priced?",
          a: "Every piece is priced on the stone it is set with, so prices are given on request. Add a piece to your cart and place an enquiry, and an adviser will confirm the price before any payment is taken." },
        { q: "Which stones and metals do you use?",
          a: "The collections are set with coloured stones including tanzanite, pink spinel, mint garnet, aquamarine, rhodolite, spessartite, morganite and Malaya garnet, alongside diamonds, in white, rose or yellow gold. Each product page names the exact stones, carat weights and metal." },
        { q: "Is the stone in my piece the one described?",
          a: "Yes. Every coloured stone is sourced and graded before it is set, so the carat weight and shape on the product page match the stone actually in the piece." },
        { q: "How long does delivery take?",
          a: "In-stock pieces ship within 5–7 working days. Delivery is insured worldwide, and a signature is required on arrival." },
        { q: "Can I return a piece?",
          a: "Returns are accepted within 15 days on unworn, unaltered pieces in their original packaging. Resized or engraved pieces are final sale." },
        { q: "Can a ring be resized?",
          a: "Yes. Rings are resized, and necklaces and bracelets restrung, in our own workshop. Please allow two weeks." },
        { q: "How should I care for my jewellery?",
          a: "Store each piece separately in its fitted pouch, away from direct light and heat. Our workshop will clean and check any piece at any time, without charge." },
        { q: "Is there a guarantee?",
          a: "Every Fine Jewellery piece carries a lifetime guarantee against manufacturing defect." },
        { q: "Can I see a piece before I buy it?",
          a: "Yes. [Book a private viewing](/appointment/) and an adviser will take you through the pieces, or [find the atelier nearest you](/offices/)." }
      ]
    },
    {
      slug: "gifts",
      label: "Gifts",
      intro: "The handwritten card, the box, and choosing a piece for someone else.",
      items: [
        { q: "Can I include a personal message?",
          a: "Yes. Write it on the [Gifts page](/gifts/#personalise), or from your bag, cart or checkout. The message is written by hand on a card and set inside the box." },
        { q: "Is there a charge for gift wrapping or the card?",
          a: "No. Every gift leaves the workshop boxed and ribboned, and the handwritten card is included at no charge." },
        { q: "How long can the message be?",
          a: "Up to 140 characters. Because the card is written by hand, three short lines fit comfortably." },
        { q: "Can I change the message after placing my order?",
          a: "Yes. The message can be changed at any time before the piece ships. [Contact us](/contact/) with your order number." },
        { q: "I am not sure what to choose. Can you help?",
          a: "The Gifts page gathers the pieces most often given, from pendants and studs to slim bracelets. For something more particular, [speak to an adviser](/contact/) or [book a private viewing](/appointment/)." }
      ]
    }
  ];

  function readCache() {
    try {
      var box = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return box && Array.isArray(box.data) && (Date.now() - box.at) < CACHE_TTL ? box.data : null;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {}
  }

  function shape(cats, faqs) {
    if (!Array.isArray(cats) || !Array.isArray(faqs) || !cats.length) return null;
    return cats.map(function (c) {
      return {
        slug: c.slug, label: c.label, intro: c.intro || "",
        items: faqs.filter(function (f) { return f.category === c.slug; })
          .map(function (f) { return { q: f.question, a: f.answer }; })
      };
    }).filter(function (c) { return c.items.length; });
  }

  var pending = null;
  function fetchLive() {
    if (pending) return pending;
    var rest = w.GemContent && w.GemContent.rest;
    if (!rest) return (pending = Promise.resolve(null));
    pending = Promise.all([
      rest("faq_categories?select=slug,label,intro,sort_order&published=eq.true&order=sort_order.asc"),
      rest("faqs?select=category,question,answer,sort_order&published=eq.true&order=sort_order.asc")
    ]).then(function (res) {
      var data = shape(res[0], res[1]);
      if (data && data.length) writeCache(data);
      return data && data.length ? data : null;
    }).catch(function () { return null; });
    return pending;
  }

  /* Calls back with what to draw now, and again if the network brings
     something newer. Never with nothing. */
  function get(onData) {
    var first = readCache() || FALLBACK;
    try { onData(first, "initial"); } catch (e) {}
    fetchLive().then(function (live) {
      if (!live) return;
      if (JSON.stringify(live) === JSON.stringify(first)) return;
      try { onData(live, "network"); } catch (e) {}
    });
  }

  /* ------------------------------------------------------------- drawing */

  var md = function (s) { return w.GemMarkdown ? w.GemMarkdown.render(s) : "<p>" + String(s) + "</p>"; };
  var text = function (s) { return w.GemMarkdown ? w.GemMarkdown.toText(s) : String(s); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* <details> rather than a scripted accordion: it opens with the keyboard,
     is announced correctly, finds-in-page into closed answers, and needs no
     state to survive a re-render. */
  function listHtml(items) {
    return '<div class="faq-list">' + items.map(function (it) {
      return '<details class="faq-item">' +
        '<summary class="faq-q"><span>' + esc(it.q) + "</span>" +
          '<svg class="faq-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>' +
        "</summary>" +
        '<div class="faq-a">' + md(it.a) + "</div>" +
      "</details>";
    }).join("") + "</div>";
  }

  /* FAQPage structured data, which is what search and answer engines read a
     question list from. One block per page, replaced on every redraw. */
  function jsonLd(items, id) {
    var el = d.getElementById(id);
    if (!items.length) { if (el) el.remove(); return; }
    if (!el) {
      el = d.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      d.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map(function (it) {
        return { "@type": "Question", name: it.q,
                 acceptedAnswer: { "@type": "Answer", text: text(it.a) } };
      })
    });
  }

  /* One category's questions, embedded on the page it belongs to. */
  function mount(host, opts) {
    if (typeof host === "string") host = d.querySelector(host);
    if (!host) return;
    opts = opts || {};
    var prefix = opts.prefix || "/";

    get(function (cats) {
      var cat = cats.filter(function (c) { return c.slug === opts.category; })[0];
      if (!cat || !cat.items.length) { host.innerHTML = ""; jsonLd([], "faq-ld"); return; }
      host.innerHTML =
        '<section class="faq-embed" aria-labelledby="faq-embed-title">' +
          '<div class="faq-embed-head">' +
            '<span class="faq-kicker">Questions</span>' +
            '<h2 class="faq-embed-title" id="faq-embed-title">' + esc(opts.title || "Frequently asked") + "</h2>" +
            (cat.intro ? '<p class="faq-embed-lede">' + esc(cat.intro) + "</p>" : "") +
          "</div>" +
          listHtml(cat.items) +
          '<a class="faq-all" href="' + prefix + "faqs/#" + esc(cat.slug) + '">All questions</a>' +
        "</section>";
      jsonLd(cat.items, "faq-ld");
    });
  }

  w.GemFaqs = { get: get, mount: mount, listHtml: listHtml, jsonLd: jsonLd, FALLBACK: FALLBACK };
})(window, document);
