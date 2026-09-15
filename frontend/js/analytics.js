/* Gem Experience — storefront analytics beacon.
 *
 * Sends a pageview to /api/collect, which does the geo lookup and rule
 * matching server-side. Nothing here identifies a person: the session key is
 * a random id held for 30 idle minutes, and the IP never leaves the edge.
 */

(function (w, d) {
  "use strict";

  var ENDPOINT = "/api/collect";
  var KEY = "gem_an_v1";
  var IDLE_MS = 30 * 60 * 1000;
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  if (w.navigator.doNotTrack === "1" || w.doNotTrack === "1") return;

  function store(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode — the session simply won't outlive the page */
    }
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function newKey() {
    if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID();
    return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  /* UTM is first-touch: whatever brought them in stays on the session even
     after they navigate to a clean URL. */
  function currentUtm(prev) {
    var params = new URLSearchParams(w.location.search);
    var found = {};
    var any = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) {
        found[k] = v.slice(0, 200);
        any = true;
      }
    });
    if (any) return found;
    return (prev && prev.utm) || {};
  }

  function session() {
    var prev = load();
    var now = Date.now();
    var fresh = prev && prev.key && now - (prev.seen || 0) < IDLE_MS;
    var state = {
      key: fresh ? prev.key : newKey(),
      seen: now,
      utm: currentUtm(fresh ? prev : null)
    };
    store(state);
    return state;
  }

  function send(eventType, extra) {
    var s = session();
    var payload = JSON.stringify(Object.assign({
      sessionKey: s.key,
      path: w.location.pathname,
      title: d.title,
      referrer: d.referrer || "",
      utm: s.utm,
      eventType: eventType || "pageview"
    }, extra || {}));

    /* sendBeacon survives the page being closed mid-flight. */
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(function () {});
  }

  w.GemAnalytics = { track: send };

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", function () { send("pageview"); });
  } else {
    send("pageview");
  }
})(window, document);
