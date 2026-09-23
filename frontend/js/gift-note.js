/* The gift card: one form, two places to put it.
 *
 * It began as a section on the Gifts page, and every other entry point linked
 * to that anchor — so clicking "Add a gift message" in the bag drawer closed
 * the drawer, navigated to another page and scrolled. This module owns the
 * form, the preview and the storage once, and renders it either inline (on the
 * Gifts page, where it is the page's own content) or as a dialog over whatever
 * somebody is already doing.
 *
 * Both share the same state, so a message typed in the dialog is the message
 * the Gifts page shows, and neither can drift from the other.
 */
(function (w, d) {
  "use strict";

  var KEY = "gem_gift_note_v1";
  var LIMIT = 140;

  var OCCASIONS = ["Birthday", "Anniversary", "Wedding", "Engagement",
                   "Congratulations", "Thank you", "Just because"];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function read() {
    try {
      var g = JSON.parse(localStorage.getItem(KEY) || "null");
      return g && typeof g === "object" ? g : {};
    } catch (e) { return {}; }
  }

  function write(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ }
    /* Anything showing the note — the drawer, the cart, the checkout summary —
       repaints from this rather than polling storage. */
    w.dispatchEvent(new CustomEvent("gem:gift", { detail: v }));
  }

  function has(g) { return !!(g && (g.to || g.message)); }

  function formHtml(idp) {
    return (
      '<form class="gn-form" id="' + idp + 'form">' +
        '<p class="gn-toast" id="' + idp + 'toast" hidden></p>' +
        '<div class="gn-row2">' +
          '<label class="gn-field">Who is it for' +
            '<input id="' + idp + 'to" maxlength="40" placeholder="Their name" autocomplete="off">' +
          "</label>" +
          '<label class="gn-field">From' +
            '<input id="' + idp + 'from" maxlength="40" placeholder="Your name" autocomplete="name">' +
          "</label>" +
        "</div>" +
        '<label class="gn-field">Occasion' +
          '<select id="' + idp + 'occasion"><option value="">Not saying</option>' +
          OCCASIONS.map(function (o) { return "<option>" + o + "</option>"; }).join("") +
          "</select>" +
        "</label>" +
        '<label class="gn-field">Message on the card' +
          '<textarea id="' + idp + 'message" rows="3" maxlength="' + LIMIT + '" ' +
            'placeholder="A line or two. It is written by hand, so keep it short."></textarea>' +
          '<small><span id="' + idp + 'left">' + LIMIT + "</span> characters left · three lines fit comfortably</small>" +
        "</label>" +
        '<label class="gn-check">' +
          '<input type="checkbox" id="' + idp + 'letter">' +
          "<span>Include a letter from the workshop describing the stone and where it was cut.</span>" +
        "</label>" +
        '<div class="gn-actions">' +
          '<button class="gn-btn" type="submit">Save this message</button>' +
          '<button class="gn-btn gn-btn--ghost" type="button" id="' + idp + 'clear">Clear</button>' +
        "</div>" +
      "</form>"
    );
  }

  function cardHtml(idp) {
    return (
      '<aside class="gn-card" aria-label="Preview of your card">' +
        '<div class="gn-card-inner">' +
          '<span class="gn-card-mark">Gem Experience</span>' +
          '<p class="gn-card-to" id="' + idp + 'pv-to"></p>' +
          '<p class="gn-card-msg" id="' + idp + 'pv-msg"></p>' +
          '<p class="gn-card-from" id="' + idp + 'pv-from"></p>' +
        "</div>" +
        '<p class="gn-card-cap">Card, actual size approximate</p>' +
      "</aside>"
    );
  }

  /* Wires a rendered form to storage. Used by both the inline copy and the
     dialog, which is what keeps them identical. */
  function bind(idp, host, onSaved) {
    var F = {
      to: d.getElementById(idp + "to"),
      from: d.getElementById(idp + "from"),
      occasion: d.getElementById(idp + "occasion"),
      message: d.getElementById(idp + "message"),
      letter: d.getElementById(idp + "letter"),
    };

    function values() {
      return {
        to: F.to.value.trim(),
        from: F.from.value.trim(),
        occasion: F.occasion.value,
        message: F.message.value.trim(),
        letter: !!F.letter.checked,
      };
    }

    /* The preview is the point: somebody writing a message they cannot see is
       guessing at how it will read on a card. */
    function preview() {
      var v = values();
      d.getElementById(idp + "pv-to").textContent = v.to ? "For " + v.to : "For —";
      d.getElementById(idp + "pv-msg").textContent = v.message || "Your message will appear here.";
      d.getElementById(idp + "pv-from").textContent = v.from ? "— " + v.from : "";
      d.getElementById(idp + "left").textContent = String(LIMIT - F.message.value.length);
    }

    var saved = read();
    if (saved.to) F.to.value = saved.to;
    if (saved.from) F.from.value = saved.from;
    if (saved.occasion) F.occasion.value = saved.occasion;
    if (saved.message) F.message.value = saved.message;
    F.letter.checked = !!saved.letter;
    preview();

    Object.keys(F).forEach(function (k) {
      F[k].addEventListener("input", preview);
      F[k].addEventListener("change", preview);
    });

    function toast(msg, ok) {
      var t = d.getElementById(idp + "toast");
      if (!t) return;
      t.textContent = msg;
      t.hidden = false;
      t.className = "gn-toast" + (ok ? " is-ok" : " is-bad");
      w.setTimeout(function () { t.hidden = true; }, 3200);
    }

    d.getElementById(idp + "form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = values();
      if (!v.to && !v.message) { toast("Add a name or a message first.", false); return; }
      write(v);
      toast("Saved. It travels with your enquiry to checkout.", true);
      if (onSaved) onSaved(v);
    });

    d.getElementById(idp + "clear").addEventListener("click", function () {
      Object.keys(F).forEach(function (k) {
        if (F[k].type === "checkbox") F[k].checked = false; else F[k].value = "";
      });
      write({});
      preview();
      toast("Cleared.", true);
    });
  }

  /* ------------------------------------------------------------- inline */

  function mount(host) {
    if (!host) return;
    var idp = "gn-i-";
    host.innerHTML = formHtml(idp) + cardHtml(idp);
    bind(idp, host);
  }

  /* -------------------------------------------------------------- dialog */

  var modal = null, lastFocus = null;

  function buildModal() {
    modal = d.createElement("div");
    modal.className = "gn-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="gn-scrim" data-gn-close></div>' +
      '<div class="gn-dialog" role="dialog" aria-modal="true" aria-labelledby="gn-m-title">' +
        '<div class="gn-dialog-head">' +
          '<div><span class="gn-kicker">Personalisation</span>' +
          '<h2 id="gn-m-title">A card, in your words</h2></div>' +
          '<button class="gn-close" type="button" data-gn-close aria-label="Close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.1" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>' +
          "</button>" +
        "</div>" +
        '<p class="gn-dialog-note">Every gift leaves the workshop boxed and ribboned. The card is ' +
          "written by hand and set inside. There is no charge, and it can be changed any time " +
          "before the piece ships.</p>" +
        '<div class="gn-dialog-body"></div>' +
      "</div>";

    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-gn-close]")) closeModal();
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.hidden) closeModal();
    });
    d.body.appendChild(modal);
  }

  function openModal() {
    if (!modal) buildModal();
    var idp = "gn-m-";
    var body = modal.querySelector(".gn-dialog-body");
    body.innerHTML = formHtml(idp) + cardHtml(idp);
    bind(idp, body);

    lastFocus = d.activeElement;
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
    d.body.classList.add("is-locked");
    var first = modal.querySelector("#gn-m-to");
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    d.body.classList.remove("is-locked");
    w.setTimeout(function () { modal.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* Any link pointing at the personalisation anchor opens the dialog instead
     of navigating — except on the Gifts page itself, where that anchor is a
     real section and scrolling to it is the right behaviour. */
  function init() {
    d.addEventListener("click", function (e) {
      var a = e.target.closest('a[href*="#personalise"], [data-gift-open]');
      if (!a) return;
      if (/\/gifts\/?$/.test(location.pathname) && a.tagName === "A" &&
          !a.hasAttribute("data-gift-open")) return;
      e.preventDefault();
      openModal();
    });
  }

  w.GemGiftNote = {
    read: read, write: write, has: has,
    mount: mount, open: openModal, close: closeModal, init: init, esc: esc,
  };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
