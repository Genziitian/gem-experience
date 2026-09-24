/* The journal: posts written in the admin (Blog) and read here.
 *
 * Shared by the listing at /blog/, the article at /blog/<slug>/ and search.
 * Unlike the menu or the FAQs there is no shipped fallback — a post the house
 * has not written cannot be invented — so a failed read shows an honest empty
 * state rather than stale or made-up content.
 */
(function (w) {
  "use strict";

  var LIST_FIELDS = "slug,title,excerpt,cover_image,cover_alt,author,tags,published_at,body";

  function rest(path) {
    return w.GemContent && w.GemContent.rest ? w.GemContent.rest(path) : Promise.resolve(null);
  }

  /* Articles live at /blog/<slug>/ in production, which vercel.json rewrites
     onto the one template in /blog/post/. A plain static server has no
     rewrites, so locally the same template is reached with ?p=<slug>. */
  function isLocal() {
    return location.protocol === "file:" || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  }

  function postUrl(slug) {
    return isLocal()
      ? "/blog/post/?p=" + encodeURIComponent(slug)
      : "/blog/" + encodeURIComponent(slug) + "/";
  }

  /* The slug comes from ?p= when present, otherwise from the path. */
  function slugFromLocation() {
    var q = new URLSearchParams(location.search).get("p");
    if (q) return q;
    var m = /^\/blog\/([^/]+)\/?$/.exec(location.pathname);
    return m && m[1] !== "post" ? decodeURIComponent(m[1]) : "";
  }

  function list(limit) {
    return rest("blog_posts?select=" + LIST_FIELDS +
      "&published=eq.true&order=published_at.desc.nullslast,created_at.desc" +
      (limit ? "&limit=" + limit : ""))
      .then(function (rows) { return Array.isArray(rows) ? rows : null; });
  }

  function one(slug) {
    return rest("blog_posts?select=*&published=eq.true&slug=eq." + encodeURIComponent(slug) + "&limit=1")
      .then(function (rows) { return Array.isArray(rows) ? (rows[0] || false) : null; });
  }

  function formatDate(iso) {
    if (!iso) return "";
    var dt = new Date(iso);
    if (isNaN(dt)) return "";
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  /* Minutes at a steady 220 words a minute, never less than one. */
  function readingTime(body) {
    var text = w.GemMarkdown ? w.GemMarkdown.toText(body) : String(body || "");
    var words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 220));
  }

  /* The card's summary: the excerpt when one was written, otherwise the
     opening of the body cut at a word. */
  function summary(post, max) {
    max = max || 180;
    if (post.excerpt) return post.excerpt;
    var t = w.GemMarkdown ? w.GemMarkdown.toText(post.body) : "";
    if (t.length <= max) return t;
    return t.slice(0, t.lastIndexOf(" ", max)) + "…";
  }

  w.GemBlog = {
    list: list, one: one, postUrl: postUrl, slugFromLocation: slugFromLocation,
    formatDate: formatDate, readingTime: readingTime, summary: summary
  };
})(window);
