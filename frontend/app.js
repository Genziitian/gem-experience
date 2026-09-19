/* Gem Experience — Home
   Menu drawer, the mobile action bar, newsletter validation, the region
   picker and the film
   lightbox. No dependencies. */

(function (w) {
  'use strict';

  var body = document.body;

  function lock() { body.classList.add('is-locked'); }
  function unlock() {
    if (!navOpen() && !lightboxOpen()) body.classList.remove('is-locked');
  }

  /* ---------------------------------------------------------- menu */

  /* The drawer itself lives in js/site-nav.js so every page shows the same one;
     this only points the header and action-bar buttons at it. */
  var menuBtn = document.getElementById('menu-btn');
  var barMenu = document.getElementById('bar-menu');

  /* Looked up on each call: the drawer is mounted by an inline script that runs
     after this file. */
  function navOpen() {
    var n = w.GemNav && w.GemNav.mounted;
    return !!(n && n.el && !n.el.hidden);
  }

  [menuBtn, barMenu].forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (w.GemNav && w.GemNav.mounted) w.GemNav.mounted.open();
    });
  });

  /* ------------------------------------------------------ newsletter */

  var form = document.getElementById('signup-form');
  var note = document.getElementById('signup-note');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('signup-email');
      var value = (input.value || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        note.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }

      note.textContent = 'Thank you. Welcome to the Gem Experience universe.';
      input.value = '';
    });
  }

  /* -------------------------------------------------------- film */

  var FILM_SRC = 'video/tanzania-universe.mp4';
  var STILL_SRC = 'img/tanzania.webp';

  var lightbox = document.getElementById('lightbox');
  var stage = document.getElementById('lightbox-stage');
  var playBtn = document.getElementById('play-btn');
  var lightboxClose = document.getElementById('lightbox-close');

  function lightboxOpen() { return lightbox && !lightbox.hidden; }

  function showStill() {
    stage.innerHTML = '';
    var img = document.createElement('img');
    img.src = STILL_SRC;
    img.alt = 'Maasai elders gathered at dusk in northern Tanzania.';
    var cap = document.createElement('p');
    cap.className = 'lightbox-fallback';
    cap.textContent = 'The film is coming soon';
    stage.appendChild(img);
    stage.appendChild(cap);
  }

  function openLightbox() {
    lightbox.hidden = false;
    lock();

    stage.innerHTML = '';
    var video = document.createElement('video');
    video.src = FILM_SRC;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    // No film has been supplied yet — fall back to the still.
    video.addEventListener('error', showStill);
    stage.appendChild(video);

    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    stage.innerHTML = '';
    unlock();
    if (playBtn) playBtn.focus();
  }

  if (playBtn && lightbox) {
    playBtn.addEventListener('click', openLightbox);
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close-lightbox')) closeLightbox();
    });
  }

  /* ------------------------------------------------------- keyboard */

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // the drawer closes itself on Escape
    if (lightboxOpen()) closeLightbox();
  });

  /* --------------------------------------------------------- region */

  var regionBtn = document.getElementById('region-btn');
  var regionList = document.getElementById('region-list');
  var regionCurrent = document.getElementById('region-current');

  if (regionBtn && regionList) {
    regionBtn.addEventListener('click', function () {
      var open = regionBtn.getAttribute('aria-expanded') === 'true';
      regionBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      regionList.hidden = open;
    });

    regionList.addEventListener('click', function (e) {
      var choice = e.target.closest('[data-region]');
      if (!choice) return;
      regionCurrent.textContent = choice.getAttribute('data-region');
      regionBtn.setAttribute('aria-expanded', 'false');
      regionList.hidden = true;
      regionBtn.focus();
    });

    document.addEventListener('click', function (e) {
      if (regionList.hidden) return;
      if (e.target.closest('.region')) return;
      regionBtn.setAttribute('aria-expanded', 'false');
      regionList.hidden = true;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || regionList.hidden) return;
      regionBtn.setAttribute('aria-expanded', 'false');
      regionList.hidden = true;
      regionBtn.focus();
    });
  }
})(window);
