/* Gem Experience — Home
   Menu drawer, the mobile action bar, newsletter validation, the region
   picker and the film,
   which plays in its own section. No dependencies. */

(function (w) {
  'use strict';

  var body = document.body;

  function lock() { body.classList.add('is-locked'); }
  function unlock() {
    if (!navOpen()) body.classList.remove('is-locked');
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

  /* The film plays in place: pressing play swaps the section's still and
     title for the film, full width, and the film is fetched only then —
     nothing is requested while the page loads. Phones, data-saver and slow
     connections get the 720p cut (~9MB); everyone else 1080p (~19MB). Both
     are fast-start MP4s, so playback begins before the download ends.
     To move to Cloudinary later, point these at the Cloudinary URLs
     (with f_auto,q_auto) — nothing else changes. */
  var FILM = {
    hd: 'video/journey-1080.mp4',
    sd: 'video/journey-720.mp4',
    poster: 'video/journey-poster.webp'
  };

  function filmSrc() {
    var c = navigator.connection || {};
    var slow = c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '');
    // the film runs the full width of the page; 720p covers it up to 1280 device px
    var small = window.innerWidth * (window.devicePixelRatio || 1) <= 1280;
    return slow || small ? FILM.sd : FILM.hd;
  }

  var film = document.querySelector('.film');
  var screen = document.getElementById('film-screen');
  var playBtn = document.getElementById('play-btn');
  var filmClose = document.getElementById('film-close');

  function filmPlaying() { return film && film.classList.contains('is-playing'); }

  function playFilm() {
    var video = document.createElement('video');
    video.className = 'film-video';
    video.poster = FILM.poster;
    video.preload = 'auto';
    video.src = filmSrc();
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('controlsList', 'nodownload');
    video.setAttribute('aria-label', 'The Tanzania Universe film');
    // If the file cannot be loaded, go back to the still rather than a black box.
    video.addEventListener('error', stopFilm);
    video.addEventListener('ended', stopFilm);
    screen.insertBefore(video, filmClose);

    screen.hidden = false;
    film.classList.add('is-playing');
    // keep the whole frame in view once the section has changed height
    film.scrollIntoView({ behavior: 'smooth', block: 'center' });
    filmClose.focus({ preventScroll: true });
  }

  function stopFilm() {
    var video = screen.querySelector('video');
    if (video) { video.pause(); video.remove(); }
    screen.hidden = true;
    film.classList.remove('is-playing');
    if (playBtn) playBtn.focus({ preventScroll: true });
  }

  if (film && screen && playBtn) {
    playBtn.addEventListener('click', playFilm);
    filmClose.addEventListener('click', stopFilm);
  }

  /* ------------------------------------------------------- keyboard */

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // the drawer closes itself on Escape
    if (filmPlaying()) stopFilm();
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
