/* Gem Experience — storefront helpers (cart, forms, auth) */

(function (w, d) {
  "use strict";

  var CART_KEY = "gem_cart_v1";

  function cfg() {
    return w.GEM_CONFIG || {};
  }

  function getClient() {
    if (w.__gemSb) return w.__gemSb;
    if (!w.supabase || !cfg().supabaseUrl) return null;
    /* PKCE: Google sends the visitor back with a one-time ?code= that only
       this browser can redeem, rather than the session tokens themselves in
       the URL (#access_token=…), where they sit in the address bar, the
       history and any screenshot. */
    w.__gemSb = w.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    watchSignIns(w.__gemSb);
    return w.__gemSb;
  }

  /* --------------------------------------------------- return from Google */

  /* Supabase returns the visitor to the page we asked for only if it is on
     the project's Redirect URLs list; otherwise it falls back to the Site URL,
     the home page, which never touched auth and so left the callback sitting
     in the address bar. So: any page that loads gem.js finishes a sign-in it
     finds in its URL, wipes the URL, and goes on to where the visitor was
     headed. */
  var NEXT_KEY = "gem_auth_next_v1";

  function authReturnInUrl() {
    return /[?&](code|error_description)=/.test(location.search) ||
      /(^#|&)(access_token|refresh_token|error_description)=/.test(location.hash);
  }

  function wipeAuthFromUrl() {
    var u = new URL(location.href);
    ["code", "error", "error_code", "error_description"].forEach(function (k) {
      u.searchParams.delete(k);
    });
    if (/(access_token|refresh_token|error_description)=/.test(u.hash)) u.hash = "";
    history.replaceState(history.state, "", u.pathname + u.search + u.hash);
  }

  function finishAuthReturn() {
    var sb = getClient();
    if (!sb) return wipeAuthFromUrl();
    /* getSession() waits for the client to read and redeem the URL first. */
    sb.auth.getSession().then(function (res) {
      wipeAuthFromUrl();
      var next = null;
      try { next = sessionStorage.getItem(NEXT_KEY); sessionStorage.removeItem(NEXT_KEY); } catch (e) { /* ignore */ }
      if (res.data.session && next) {
        var target = new URL(next, location.href);
        if (target.origin === location.origin && target.pathname !== location.pathname) {
          location.replace(target.href);
        }
      }
    }, wipeAuthFromUrl);
  }

  /* ------------------------------------------------------------- activity */

  /* Sign-ins and sign-outs land in activity_log, which the admin dashboard
     reads. The policy there lets anyone signed in append rows about
     themselves and nothing else. Like the admin's own recorder, this never
     throws: a log write is not worth breaking a sign-in over. */
  var SIGNIN_KEY = "gem_signin_logged_v1";

  async function logActivity(action, detail) {
    var sb = getClient();
    if (!sb) return;
    try {
      var s = (await sb.auth.getSession()).data.session;
      if (!s) return;
      var p = await sb.from("profiles").select("role").eq("id", s.user.id).maybeSingle();
      await sb.from("activity_log").insert({
        actor_id: s.user.id,
        actor_email: s.user.email || null,
        actor_role: (p.data && p.data.role) || null,
        action: action,
        area: "storefront",
        detail: detail || {},
        user_agent: (navigator.userAgent || "").slice(0, 400)
      });
    } catch (e) { /* deliberately silent */ }
  }

  /* A Google sign-in finishes on the page Google returns to, not in
     signIn(), so this listens for the session instead of hooking the buttons.
     Supabase also fires SIGNED_IN on a tab regaining focus and replays the
     stored session on every page load, so only a sign-in that just happened
     counts (last_sign_in_at moves on a real sign-in, not on a token refresh),
     and each one is recorded once, whichever tab sees it first. */
  function watchSignIns(sb) {
    sb.auth.onAuthStateChange(function (event, session) {
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      var u = session && session.user;
      if (!u || !u.last_sign_in_at) return;
      if (Date.now() - Date.parse(u.last_sign_in_at) > 2 * 60 * 1000) return;
      var stamp = u.id + "|" + u.last_sign_in_at;
      try {
        if (localStorage.getItem(SIGNIN_KEY) === stamp) return;
        localStorage.setItem(SIGNIN_KEY, stamp);
      } catch (e) { /* storage blocked: record anyway */ }
      var provider = (u.app_metadata && u.app_metadata.provider) || "email";
      /* Supabase calls made inside this callback can deadlock its auth lock;
         run the write once the callback has returned. */
      setTimeout(function () { logActivity("login", { provider: provider }); wishSync(); }, 0);
    });
  }

  /* -------------------------------------------------------------- wishlist */

  /* Pieces saved with the heart. The list always lives on the device, so the
     heart works for anybody; once signed in it is also kept in
     public.wishlist_items and merged both ways, so it follows the client to
     any device and into My Account. Items carry what a list needs to draw
     them (name, a line of detail, image, link) so no catalogue is loaded. */
  var WISH_KEY = "gem_wishlist_v1";

  function readWish() {
    try {
      var v = JSON.parse(localStorage.getItem(WISH_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function writeWish(list) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    w.dispatchEvent(new CustomEvent("gem:wishlist", { detail: { count: list.length } }));
    return list;
  }

  function wishHas(key) {
    return readWish().some(function (x) { return x.key === key; });
  }

  function wishRow(userId, item) {
    return {
      user_id: userId, piece_key: item.key, name: item.name,
      detail: item.detail || null, image: item.image || null, href: item.href
    };
  }

  function wishRemote(fn) {
    var sb = getClient();
    if (!sb) return;
    sb.auth.getSession().then(function (res) {
      var s = res.data.session;
      if (s) fn(sb, s.user.id);
    });
  }

  function wishToggle(item) {
    var list = readWish();
    var at = list.findIndex(function (x) { return x.key === item.key; });
    var on = at === -1;
    if (on) list.unshift({ key: item.key, name: item.name, detail: item.detail || "", image: item.image || "", href: item.href, at: Date.now() });
    else list.splice(at, 1);
    writeWish(list);
    wishRemote(function (sb, uid) {
      if (on) sb.from("wishlist_items").upsert(wishRow(uid, item)).then(function () {});
      else sb.from("wishlist_items").delete().eq("user_id", uid).eq("piece_key", item.key).then(function () {});
    });
    return on;
  }

  function wishRemove(key) {
    var item = readWish().find(function (x) { return x.key === key; });
    if (item) wishToggle(item);
  }

  /* Signed in: what is in the account and what is on this device become one
     list, saved in both places. */
  function wishSync() {
    wishRemote(function (sb, uid) {
      sb.from("wishlist_items").select("piece_key,name,detail,image,href,created_at")
        .order("created_at", { ascending: false })
        .then(function (res) {
          if (res.error) return;
          var remote = (res.data || []).map(function (r) {
            return { key: r.piece_key, name: r.name, detail: r.detail || "", image: r.image || "", href: r.href, at: Date.parse(r.created_at) || 0 };
          });
          var have = {};
          remote.forEach(function (r) { have[r.key] = true; });
          var local = readWish().filter(function (x) { return !have[x.key]; });
          if (local.length) sb.from("wishlist_items").upsert(local.map(function (x) { return wishRow(uid, x); })).then(function () {});
          writeWish(local.concat(remote).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }));
        });
    });
  }

  var HEART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">' +
    '<path d="M12 20.3s-7.6-4.5-7.6-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.6 2.5c0 5.7-7.6 10.2-7.6 10.2Z"></path></svg>';

  function wishCss() {
    if (d.getElementById("ge-wish-css")) return;
    var css = d.createElement("style");
    css.id = "ge-wish-css";
    css.textContent =
      ".ge-heart{display:inline-grid;place-items:center;width:38px;height:38px;padding:0;border:0;border-radius:50%;" +
      "background:rgba(255,255,255,.88);color:#17140f;cursor:pointer;transition:transform .2s ease}" +
      ".ge-heart:hover{transform:scale(1.08)}.ge-heart svg{width:18px;height:18px}" +
      ".ge-heart[aria-pressed=true] path{fill:currentColor}" +
      ".ge-heart--corner{position:absolute;top:10px;right:10px;z-index:3}" +
      ".ge-heart--line{width:auto;height:auto;border-radius:0;background:none;gap:8px;display:inline-flex;align-items:center;" +
      "font:500 11px/1 Jost,-apple-system,sans-serif;letter-spacing:2.4px;text-transform:uppercase}" +
      ".ge-wish{position:relative}.ge-wish svg path{transition:fill .2s}.ge-wish.is-on svg path{fill:currentColor}" +
      ".ge-wish-n{position:absolute;top:-6px;right:-8px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;" +
      "background:#17140f;color:#fff;font:500 9px/16px Jost,-apple-system,sans-serif;text-align:center}" +
      /* four icons now share the phone header with the wordmark */
      "@media (max-width:430px){.pg-hdr-icons,.fj-hdr-end,.hdr-icons,.hdr-side--end{gap:12px!important}" +
      ".pg-hdr-brand,.fj-brand,.hdr-brand{letter-spacing:3.2px!important;font-size:13px!important}}" +
      "@media (max-width:360px){.pg-hdr-icons,.fj-hdr-end,.hdr-icons,.hdr-side--end{gap:8px!important}" +
      ".pg-hdr-brand,.fj-brand,.hdr-brand{letter-spacing:2.4px!important}}";
    d.head.appendChild(css);
  }

  /* A heart for one piece. `variant` is "corner" (over a photograph) or
     "line" (a labelled button beside the other actions). It never lets the
     click reach a surrounding card link. */
  function wishButton(item, variant) {
    wishCss();
    var b = d.createElement("button");
    b.type = "button";
    b.className = "ge-heart ge-heart--" + (variant || "corner");
    function paint() {
      var on = wishHas(item.key);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", (on ? "Remove " : "Save ") + item.name + (on ? " from" : " to") + " your wishlist");
      b.innerHTML = HEART + (variant === "line" ? "<span>" + (on ? "Saved" : "Save to wishlist") + "</span>" : "");
    }
    paint();
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      wishToggle(item);
    });
    w.addEventListener("gem:wishlist", paint);
    return b;
  }

  /* Every header draws its own icons; a heart goes in before the bag on each,
     linked to the wishlist page, with a count. */
  function mountWishIcons() {
    if (!d.querySelector) return;
    wishCss();
    function apply() {
      var n = readWish().length;
      d.querySelectorAll(".pg-cart").forEach(function (bag) {
        var prev = bag.previousElementSibling;
        var icon = prev && prev.classList.contains("ge-wish") ? prev : null;
        if (!icon) {
          icon = d.createElement("a");
          icon.className = (bag.className.replace(/\bpg-cart\b/, "").trim() + " ge-wish").trim();
          icon.href = "/wishlist/";
          bag.parentNode.insertBefore(icon, bag);
        }
        var want = HEART + (n ? '<span class="ge-wish-n">' + n + "</span>" : "");
        if (icon.innerHTML !== want) icon.innerHTML = want;
        icon.setAttribute("aria-label", n ? "Wishlist, " + n + (n === 1 ? " piece" : " pieces") : "Wishlist");
        icon.classList.toggle("is-on", n > 0);
      });
    }
    apply();
    w.addEventListener("gem:wishlist", apply);
    if (w.MutationObserver) new MutationObserver(function (m) {
      if (m.some(function (r) { return r.addedNodes.length; })) apply();
    }).observe(d.body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ cart */

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  /* Why the cart changed, set by whichever function is about to write it. A
     removal and an addition both fire the same event, and only one of them
     should open a drawer over what somebody is reading. */
  var lastReason = null, lastAdded = null;

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    w.dispatchEvent(new CustomEvent("gem:cart", {
      detail: { items: items, reason: lastReason, added: lastAdded }
    }));
    lastReason = null; lastAdded = null;
    return items;
  }

  function cartCount() {
    return readCart().reduce(function (n, i) { return n + (i.qty || 1); }, 0);
  }

  function addToCart(item) {
    var items = readCart();
    var found = items.find(function (x) { return x.id === item.id; });
    if (found) found.qty = (found.qty || 1) + (item.qty || 1);
    else items.push({
      id: item.id,
      slug: item.slug || item.id,
      name: item.name,
      materials: item.materials || "",
      image: item.image || "",
      priceOnEnquiry: item.priceOnEnquiry !== false,
      priceCents: item.priceCents || 0,
      qty: item.qty || 1
    });
    lastReason = "add";
    lastAdded = item.id;
    return writeCart(items);
  }

  function updateQty(id, qty) {
    var items = readCart().map(function (x) {
      if (x.id !== id) return x;
      return Object.assign({}, x, { qty: Math.max(1, qty) });
    });
    return writeCart(items);
  }

  function removeFromCart(id) {
    return writeCart(readCart().filter(function (x) { return x.id !== id; }));
  }

  function clearCart() {
    return writeCart([]);
  }

  /* -------------------------------------------------------------- whatsapp */

  /* A wa.me link to the Dubai line with the message already written, so the
     enquiry arrives in WhatsApp complete and the client only presses send.
     `lines` are joined one per line; null and false are dropped (so a field
     left empty can simply be null) while "" stays as a blank spacer line.
     WhatsApp renders *text* as bold. wa.me wants digits only. */
  function whatsappUrl(lines) {
    var num = String((cfg().whatsapp || {}).uae || "+971567203896").replace(/\D/g, "");
    var text = (lines || []).filter(function (l) { return l != null && l !== false; }).join("\n");
    return "https://wa.me/" + num + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  /* Where a cart piece can be seen, for the adviser reading the message. */
  function pieceUrl(item) {
    var origin = location.origin;
    if (/fine-jewellery\//.test(item.image || "")) return origin + "/fine-jewellery/p/" + item.id + "/";
    return origin + "/high-jewellery/#/product/" + item.id;
  }

  /* ----------------------------------------------------------------- forms */

  async function submitForm(formType, payload, productId) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var row = {
      form_type: formType,
      status: "new",
      payload: payload || {}
    };
    if (productId) row.product_id = productId;
    /* Insert only — do not .select() afterwards. Anon may write forms but
       cannot read the inbox; returning the row trips RLS and looks like
       the insert failed. */
    var res = await sb.from("form_submissions").insert(row);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  }

  /* ------------------------------------------------------------------ auth */

  async function getSession() {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb.auth.getSession();
    return res.data.session || null;
  }

  async function signIn(email, password) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async function signUp(email, password, fullName) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName || "" } }
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  /* Passwordless: a six-digit code by email. shouldCreateUser lets a first-time
     visitor in the same way, so the code works whether or not they had an
     account. The code is checked in this browser with verifyCode. */
  async function sendCode(email) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
    if (res.error) throw new Error(res.error.message);
    return true;
  }

  async function verifyCode(email, token) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.verifyOtp({ email: email, token: token, type: "email" });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  /* The reset link brings the visitor back to redirectTo signed in for
     recovery; setPassword then replaces the password. With PKCE the link has
     to be opened in the browser that asked for it. */
  async function sendReset(email, redirectTo) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
    if (res.error) throw new Error(res.error.message);
    return true;
  }

  async function setPassword(password) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.updateUser({ password: password });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  /* Google returns to the page we name here, so the visitor lands back in the
     account rather than on a bare callback URL. */
  async function signInWithGoogle(redirectTo) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var dest = redirectTo || new URL("../account/", location.href).href;
    try { sessionStorage.setItem(NEXT_KEY, dest); } catch (e) { /* ignore */ }
    var res = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: dest,
        queryParams: { prompt: "select_account" }
      }
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    /* Before, not after: once signed out there is no actor to write the row as. */
    await logActivity("logout", {});
    await sb.auth.signOut();
    /* the list belongs to the account now; a shared device should not keep it */
    writeWish([]);
  }

  async function getProfile() {
    var sb = getClient();
    var session = await getSession();
    if (!sb || !session) return null;
    var res = await sb.from("profiles").select("*").eq("id", session.user.id).single();
    return res.data || null;
  }

  /* One call, order and lines together. A guest may create an enquiry but not
     read one back, so a plain insert-then-select trips RLS; the function
     writes both and returns only the reference. It also sets user_id from the
     session, which the browser is not trusted to name. */
  async function createEnquiryOrder(items, guestEmail, notes) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.rpc("create_enquiry_order", {
      p_items: items || [],
      p_guest_email: guestEmail || null,
      p_notes: notes || null
    });
    if (res.error) throw new Error(res.error.message);
    return (res.data && res.data[0]) || {};
  }

  /* Everything the account page shows, in one round trip. The function
     matches by confirmed email as well as user_id, so enquiries made before
     the account existed are still the customer's. */
  async function myAccount() {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.rpc("my_account");
    /* Until migration 20261009010000_my_account.sql is run the function does
       not exist; show what RLS already allows (own orders) rather than an error. */
    if (res.error && res.error.code === "PGRST202") {
      var s = (await sb.auth.getSession()).data.session;
      var o = await sb.from("orders").select("id, order_number, status, created_at, updated_at, notes")
        .eq("user_id", s ? s.user.id : "").order("created_at", { ascending: false }).limit(50);
      return { orders: o.data || [], submissions: [] };
    }
    if (res.error) throw new Error(res.error.message);
    return res.data || { orders: [], submissions: [] };
  }

  /* ------------------------------------------------- signed-in header mark */

  function displayName(user, profile) {
    var m = (user && user.user_metadata) || {};
    return (profile && profile.full_name) || m.full_name || m.name ||
      ((user && user.email) || "").split("@")[0] || "Client";
  }

  function initialOf(name) {
    var ch = String(name || "").trim().charAt(0);
    return ch ? ch.toUpperCase() : "·";
  }

  /* The four headers (home, High Jewellery, Fine Jewellery, the shared one)
     each draw their own account icon, all labelled "Account". Once signed in,
     each becomes the person's initial and leads to the account rather than
     the sign-in form. The shared header re-renders on every cart change, so a
     watcher re-applies it to whatever icon appears next. */
  function showSignedInAvatar() {
    var sb = getClient();
    if (!sb || !d.querySelector) return;
    sb.auth.getSession().then(function (res) {
      var s = res.data.session;
      if (!s) return;
      var name = displayName(s.user);
      var mark = initialOf(name);

      if (!d.getElementById("ge-avatar-css")) {
        var css = d.createElement("style");
        css.id = "ge-avatar-css";
        css.textContent =
          ".ge-avatar{display:inline-grid;place-items:center;width:26px;height:26px;" +
          "border-radius:50%;background:#17140f;color:#fff;font:500 12px/1 Jost,-apple-system,sans-serif;" +
          "letter-spacing:0;text-transform:uppercase;user-select:none}";
        d.head.appendChild(css);
      }

      function apply() {
        d.querySelectorAll('[aria-label="Account"]').forEach(function (el) {
          el.setAttribute("aria-label", "My account, signed in as " + name);
          el.title = name;
          el.innerHTML = '<span class="ge-avatar" aria-hidden="true"></span>';
          el.firstChild.textContent = mark;
          var href = el.getAttribute("href");
          if (href) el.setAttribute("href", href.replace(/login\/?$/, "account/"));
          var click = el.getAttribute("onclick");
          if (click) el.setAttribute("onclick", click.replace("login/", "account/"));
        });
      }
      apply();
      /* the relabelled icons no longer match, so this only touches new ones */
      if (w.MutationObserver) new MutationObserver(apply).observe(d.body, { childList: true, subtree: true });
    }, function () { /* signed-out look stays */ });
  }

  w.Gem = {
    getClient: getClient,
    cart: {
      read: readCart,
      write: writeCart,
      count: cartCount,
      add: addToCart,
      updateQty: updateQty,
      remove: removeFromCart,
      clear: clearCart
    },
    wishlist: {
      list: readWish,
      has: wishHas,
      toggle: wishToggle,
      remove: wishRemove,
      sync: wishSync,
      button: wishButton
    },
    submitForm: submitForm,
    whatsappUrl: whatsappUrl,
    pieceUrl: pieceUrl,
    auth: {
      getSession: getSession,
      signIn: signIn,
      signUp: signUp,
      signInWithGoogle: signInWithGoogle,
      sendCode: sendCode,
      verifyCode: verifyCode,
      sendReset: sendReset,
      setPassword: setPassword,
      signOut: signOut,
      getProfile: getProfile
    },
    createEnquiryOrder: createEnquiryOrder,
    myAccount: myAccount,
    displayName: displayName,
    initialOf: initialOf
  };

  if (authReturnInUrl()) finishAuthReturn();
  showSignedInAvatar();
  mountWishIcons();
  wishSync();
})(window, document);
