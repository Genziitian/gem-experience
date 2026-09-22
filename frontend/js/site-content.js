/* Site content that staff edit in the admin: the menu tree, the contact
 * details and the office cards.
 *
 * These used to be hard-coded in three places — the arrays at the top of
 * site-nav.js, the list in contact/index.html, the two arrays in
 * offices/index.html — so changing a phone number needed a developer and a
 * deploy. They live in Supabase now and are read here at run time.
 *
 * Three rules this file keeps, because a menu that fails to load is a site
 * nobody can navigate:
 *
 *   1. Every caller passes the values the page already ships with. Those are
 *      rendered first and are what remains on screen if the network, the
 *      database or the parse fails. The site never waits on Supabase to draw
 *      itself and never ends up with an empty drawer.
 *
 *   2. The last good response is cached in localStorage and served
 *      immediately on the next page, so a repeat visitor sees edited content
 *      without waiting for a round trip. The network result replaces it when
 *      it arrives.
 *
 *   3. Nothing here throws. A caller gets content or it gets its own
 *      fallback; it never gets an exception to handle.
 */
(function (w) {
  "use strict";

  var CACHE_KEY = "gem_site_content_v1";
  var CACHE_TTL = 10 * 60 * 1000;          // 10 minutes
  var TIMEOUT = 6000;

  function cfg() { return w.GEM_CONFIG || {}; }

  /* localStorage is unavailable in private windows and can throw on read as
     well as write, so every access is guarded and a failure is simply a miss. */
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || typeof box !== "object") return null;
      return box;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) { /* full, blocked, or private mode — the cache is optional */ }
  }

  function fresh(box) {
    return !!box && typeof box.at === "number" && (Date.now() - box.at) < CACHE_TTL;
  }

  /* REST rather than the supabase-js client: this runs on every page, the
     three reads are plain selects against public rows, and loading a client
     library to make them would cost more than the requests do. */
  function get(path) {
    var c = cfg();
    if (!c.supabaseUrl || !c.supabaseAnonKey) return Promise.resolve(null);

    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT);

    return fetch(c.supabaseUrl + "/rest/v1/" + path, {
      headers: { apikey: c.supabaseAnonKey, Authorization: "Bearer " + c.supabaseAnonKey },
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (v) { if (timer) clearTimeout(timer); return v; });
  }

  /* The menu is stored flat with a parent_id; the drawer wants a section and
     its children. Rows arrive ordered, so one pass is enough. */
  function treeify(rows) {
    if (!rows || !rows.length) return null;
    var byId = {}, roots = [];
    rows.forEach(function (r) { byId[r.id] = r; r.__kids = []; });
    rows.forEach(function (r) {
      if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].__kids.push(r);
      else if (!r.parent_id) roots.push(r);
    });

    function shape(r) {
      var out = {};
      /* A heading is a label inside a panel with nothing to click; the drawer
         reads `heading` rather than `label` to decide that, so the shape has
         to match what it already expects. */
      if (r.is_heading) { out.heading = r.label; return out; }
      out.label = r.label;
      if (r.href) out.href = r.href;
      if (r.__kids.length) out.children = r.__kids.map(shape);
      return out;
    }

    var primary = roots.filter(function (r) { return r.location === "primary"; }).map(shape);
    var secondary = roots.filter(function (r) { return r.location === "secondary"; }).map(shape);
    if (!primary.length && !secondary.length) return null;
    return { primary: primary, secondary: secondary };
  }

  function load() {
    if (w.__gemContent) return w.__gemContent;

    w.__gemContent = Promise.all([
      get("nav_items?select=id,parent_id,location,label,href,is_heading,sort_order"
        + "&published=eq.true&order=location.asc,sort_order.asc"),
      get("offices?select=*&published=eq.true&order=sort_order.asc"),
      get("site_settings?select=value&key=eq.contact")
    ]).then(function (res) {
      var nav = treeify(res[0]);
      var offices = Array.isArray(res[1]) && res[1].length ? res[1] : null;
      var contact = Array.isArray(res[2]) && res[2][0] ? res[2][0].value : null;
      var data = { nav: nav, offices: offices, contact: contact };
      /* Only cache a response that actually carried something. Caching an
         empty result would serve emptiness for the next ten minutes. */
      if (nav || offices || contact) writeCache(data);
      return data;
    }).catch(function () { return { nav: null, offices: null, contact: null }; });

    return w.__gemContent;
  }

  /* Hand the caller the cache straight away when it is warm, then the network
     result when it lands. `onUpdate` may therefore run twice, or never — it is
     only ever an improvement on what the page already drew. */
  function content(onUpdate) {
    var box = readCache();
    if (box && box.data && fresh(box)) {
      try { onUpdate(box.data, "cache"); } catch (e) {}
    }
    load().then(function (data) {
      if (!data || (!data.nav && !data.offices && !data.contact)) return;
      try { onUpdate(data, "network"); } catch (e) {}
    });
  }

  w.GemContent = { get: content, load: load, treeify: treeify, CACHE_KEY: CACHE_KEY };
})(window);
