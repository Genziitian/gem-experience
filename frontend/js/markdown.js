/* The Markdown that blog posts and FAQ answers are written in.
 *
 * One renderer, loaded by the storefront as a plain script and imported by the
 * admin for its preview, so what an editor sees before publishing is exactly
 * what the site draws after.
 *
 * Deliberately small: headings, paragraphs, **bold**, *italic*, [links](url),
 * ![images](url), lists, > quotes and --- rules. Everything is escaped before
 * any of it is interpreted, and a URL is only honoured if it is http(s),
 * mailto, tel, or relative — so a post can never carry a script onto the page,
 * whoever wrote it.
 */
(function (w) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* `url` has already been escaped along with the rest of the line, so it is
     only checked here, not escaped a second time. */
  function safeUrl(url) {
    var u = String(url || "").trim();
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "";    // javascript:, data:, …
    return u;                                            // relative, #anchor, /path
  }

  function slugify(s) {
    return String(s || "").toLowerCase()
      .replace(/&[a-z#0-9]+;/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }

  function inline(s) {
    var out = esc(s);
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      var u = safeUrl(url);
      return u ? '<img src="' + u + '" alt="' + alt + '" loading="lazy" decoding="async">' : "";
    });
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
      var u = safeUrl(url);
      if (!u) return text;
      var ext = /^https?:/i.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + text + "</a>";
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    return out;
  }

  /* Blocks are separated by blank lines; within a block, the first line
     decides what it is. A list keeps going while its lines keep their marker. */
  function render(src) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var para = [];
    var list = null;          // { tag, items }
    var quote = [];
    var seen = {};

    function flushPara() {
      if (para.length) html.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
    function flushList() {
      if (list) {
        html.push("<" + list.tag + ">" + list.items.map(function (i) {
          return "<li>" + inline(i) + "</li>";
        }).join("") + "</" + list.tag + ">");
      }
      list = null;
    }
    function flushQuote() {
      if (quote.length) html.push("<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>");
      quote = [];
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      var m;

      if (!line.trim()) { flushAll(); return; }

      if ((m = /^(#{2,4})\s+(.*)$/.exec(line)) || (m = /^(#)\s+(.*)$/.exec(line))) {
        flushAll();
        /* A post's title is the page's only h1, so a # in the body is an h2. */
        var level = Math.max(2, m[1].length);
        var base = slugify(toText(m[2])) || "section";
        var id = base, n = 2;
        while (seen[id]) id = base + "-" + (n++);
        seen[id] = true;
        html.push("<h" + level + ' id="' + id + '">' + inline(m[2]) + "</h" + level + ">");
        return;
      }

      if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushAll(); html.push("<hr>"); return; }

      if ((m = /^>\s?(.*)$/.exec(line))) { flushPara(); flushList(); quote.push(m[1]); return; }

      if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
        flushPara(); flushQuote();
        if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
        list.items.push(m[1]);
        return;
      }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
        flushPara(); flushQuote();
        if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; }
        list.items.push(m[1]);
        return;
      }

      /* A lone image line is a figure, not an inline image inside a paragraph. */
      if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line.trim()))) {
        flushAll();
        var u = safeUrl(esc(m[2]));
        if (u) {
          html.push('<figure><img src="' + u + '" alt="' + esc(m[1]) + '" loading="lazy" decoding="async">' +
            (m[1] ? "<figcaption>" + esc(m[1]) + "</figcaption>" : "") + "</figure>");
        }
        return;
      }

      if (list) flushList();
      if (quote.length) flushQuote();
      para.push(line.trim());
    });

    flushAll();
    return html.join("\n");
  }

  /* Plain text for excerpts, search and structured data. */
  function toText(src) {
    return String(src || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*(-{3,}|\*{3,})\s*$/gm, "")
      .replace(/^\s*([-*]|\d+[.)])\s+/gm, "")
      .replace(/\*\*|\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function headings(src) {
    var out = [], seen = {};
    String(src || "").split("\n").forEach(function (l) {
      var m = /^(#{1,4})\s+(.*)$/.exec(l.trim());
      if (!m) return;
      var base = slugify(toText(m[2])) || "section", id = base, n = 2;
      while (seen[id]) id = base + "-" + (n++);
      seen[id] = true;
      out.push({ level: Math.max(2, m[1].length), text: toText(m[2]), id: id });
    });
    return out;
  }

  w.GemMarkdown = { render: render, toText: toText, headings: headings, esc: esc, slugify: slugify };
})(typeof window !== "undefined" ? window : globalThis);
