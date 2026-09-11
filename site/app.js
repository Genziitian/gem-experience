/* Gem Experience — Home
   Menu drawer, newsletter validation, the region picker and the film
   lightbox. No dependencies. */

(function () {
  'use strict';

  var body = document.body;

  function lock() { body.classList.add('is-locked'); }
  function unlock() {
    if (!navOpen() && !lightboxOpen()) body.classList.remove('is-locked');
  }

  /* ---------------------------------------------------------- menu */

  var nav = document.getElementById('nav-panel');
  var menuBtn = document.getElementById('menu-btn');
  var navClose = document.getElementById('nav-close');

  function navOpen() { return nav && !nav.hidden; }

  function openNav() {
    nav.hidden = false;
    // let the browser paint the hidden state before transitioning in
    requestAnimationFrame(function () { nav.classList.add('is-open'); });
    menuBtn.setAttribute('aria-expanded', 'true');
    lock();
    navClose.focus();
  }

  function closeNav() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () {
      nav.hidden = true;
      unlock();
    }, 380);
    menuBtn.focus();
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', openNav);
    navClose.addEventListener('click', closeNav);
    nav.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close-nav')) closeNav();
      if (e.target.closest('.nav-links a, .nav-sub a')) closeNav();
    });
  }

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
    if (lightboxOpen()) closeLightbox();
    else if (navOpen()) closeNav();
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
})();
