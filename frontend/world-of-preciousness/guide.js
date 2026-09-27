/* Tanzanite — the colour chooser, the film tile, back-to-top and the
   scroll reveal. The shared drawn-gem sprite comes from ../app.js. */
(function (w, d) {
  "use strict";

  /* Three colours, three photographs: choosing one crossfades to the
     stone turned that way. */
  function wireTones(root) {
    var btns = Array.prototype.slice.call(root.querySelectorAll("[data-tone]"));
    var imgs = Array.prototype.slice.call(root.querySelectorAll("[data-tone-img]"));
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var tone = b.dataset.tone;
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        imgs.forEach(function (img) { img.classList.toggle("is-on", img.dataset.toneImg === tone); });
      });
    });
  }

  /* The "Watch the film" tile plays in place, with the native controls
     only once it is running. */
  function wireFilm(fig) {
    var video = fig.querySelector("video");
    var btn = fig.querySelector(".gd-film-btn");
    if (!video || !btn) return;
    btn.addEventListener("click", function () {
      video.muted = false;
      video.controls = true;
      video.play().catch(function () {
        video.muted = true;
        video.play().catch(function () {});
      });
    });
    video.addEventListener("play", function () { fig.classList.add("is-playing"); });
    video.addEventListener("ended", function () {
      fig.classList.remove("is-playing");
      video.controls = false;
      video.load();
    });
  }

  function wireTop(el) {
    var queued = false;
    function sync() {
      queued = false;
      el.classList.toggle("is-on", w.scrollY > w.innerHeight * 0.9);
    }
    w.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  }

  function wireReveal() {
    if (!("IntersectionObserver" in w)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    d.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
    d.body.classList.add("is-ready");
  }

  function init() {
    d.querySelectorAll("[data-gd-tones]").forEach(wireTones);
    d.querySelectorAll("[data-gd-film]").forEach(wireFilm);
    d.querySelectorAll("[data-gd-top]").forEach(wireTop);
    wireReveal();
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
