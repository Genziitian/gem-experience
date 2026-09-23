/* Gem Experience — storefront helpers (cart, forms, auth) */

(function (w) {
  "use strict";

  var CART_KEY = "gem_cart_v1";

  function cfg() {
    return w.GEM_CONFIG || {};
  }

  function getClient() {
    if (w.__gemSb) return w.__gemSb;
    if (!w.supabase || !cfg().supabaseUrl) return null;
    w.__gemSb = w.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey);
    return w.__gemSb;
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

  /* Google returns to the page we name here, so the visitor lands back in the
     account rather than on a bare callback URL. */
  async function signInWithGoogle(redirectTo) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var res = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo || new URL("../account/", location.href).href,
        queryParams: { prompt: "select_account" }
      }
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
  }

  async function getProfile() {
    var sb = getClient();
    var session = await getSession();
    if (!sb || !session) return null;
    var res = await sb.from("profiles").select("*").eq("id", session.user.id).single();
    return res.data || null;
  }

  async function createEnquiryOrder(items, guestEmail, notes) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase is not configured.");
    var session = await getSession();
    var orderNumber = "GE-" + Date.now().toString(36).toUpperCase();
    var order = {
      order_number: orderNumber,
      user_id: session ? session.user.id : null,
      guest_email: guestEmail || (session && session.user.email) || null,
      status: "enquiry",
      currency: "INR",
      subtotal_cents: 0,
      total_cents: 0,
      notes: notes || "Checkout enquiry from cart"
    };
    var oRes = await sb.from("orders").insert(order).select("*").single();
    if (oRes.error) throw new Error(oRes.error.message);

    var lines = (items || []).map(function (it) {
      return {
        order_id: oRes.data.id,
        product_id: null,
        product_snapshot: it,
        quantity: it.qty || 1,
        unit_price_cents: it.priceCents || 0
      };
    });
    if (lines.length) {
      var iRes = await sb.from("order_items").insert(lines);
      if (iRes.error) throw new Error(iRes.error.message);
    }
    return oRes.data;
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
    submitForm: submitForm,
    auth: {
      getSession: getSession,
      signIn: signIn,
      signUp: signUp,
      signInWithGoogle: signInWithGoogle,
      signOut: signOut,
      getProfile: getProfile
    },
    createEnquiryOrder: createEnquiryOrder
  };
})(window);
