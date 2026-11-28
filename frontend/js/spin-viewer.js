/* Gem Experience — a piece turned through 360°, from its own photographs.
 *
 * The house photographs each piece from the front and from the side (a ring
 * through its band and edge-on; an earring face-on and in profile). Those two
 * views are the piece at 0° and 90°; mirrored, they are 180° and 270°. In
 * between, the photograph narrows with the cosine of the angle — exactly how a
 * ring band or an earring foreshortens as it turns — and hands over to the
 * next view, so dragging reads as turning the piece in the hand.
 *
 * On top of that, what makes it look like a gemstone rather than a picture:
 *   - the coloured stones are found in each photograph, and their facets catch
 *     the light (a short star flash) as the piece turns past them;
 *   - a band of light sweeps across the metal, opposite to the turn;
 *   - a soft contact shadow follows the piece's width.
 *
 *   import("/js/spin-viewer.js").then((m) => m.open({
 *     title: "Celestine", base: "/high-jewellery/",
 *     views: [{ label: "Earring", front: "img/…/p1.webp", frontCrop: "left",
 *               side: "img/…/p2.webp", sideCrop: "right" }],
 *   }));
 *
 * frontCrop / sideCrop take one half of a photograph of a pair ("left" or
 * "right"); the background is read from the photograph's corner and cut away.
 * No libraries; one <canvas>.
 */

const BG = "#f2f2f2";
let active = null;

function css() {
  if (document.getElementById("spv-css")) return;
  const s = document.createElement("style");
  s.id = "spv-css";
  s.textContent = `
.spv{position:fixed;inset:0;z-index:300;background:radial-gradient(120% 90% at 50% 42%,#f6f6f5 0%,${BG} 55%,#e6e3de 100%);font-family:Jost,system-ui,sans-serif;color:#17140f;user-select:none;-webkit-user-select:none}
.spv canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none}
.spv canvas:active{cursor:grabbing}
.spv-top{position:absolute;left:24px;right:80px;top:22px;display:flex;align-items:baseline;gap:14px;pointer-events:none}
.spv-kicker{font:500 10.5px/1 Jost,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#8a8279}
.spv-title{font:400 24px/1.1 "EB Garamond",Georgia,serif;margin:0}
.spv-close{position:absolute;top:16px;right:16px;width:46px;height:46px;border:0;border-radius:50%;background:#fff;box-shadow:0 1px 8px rgba(0,0,0,.14);font:300 28px/46px Jost,sans-serif;color:#17140f;cursor:pointer}
.spv-bar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px;background:rgba(255,255,255,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;box-shadow:0 2px 14px rgba(0,0,0,.08)}
.spv-bar button{border:0;background:transparent;font:400 12px/1 Jost,sans-serif;letter-spacing:.08em;color:#4a443c;padding:9px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}
.spv-bar button[aria-pressed="true"]{background:#17140f;color:#fff}
.spv-bar .spv-sep{width:1px;height:18px;background:#d9d2c7}
.spv-dial{width:34px;height:34px;flex:none}
.spv-hint{position:absolute;left:0;right:0;bottom:84px;margin:0;text-align:center;font:400 11px/1 Jost,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8a8279;transition:opacity .6s}
.spv-status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;font:300 13px/1.4 Jost,sans-serif;letter-spacing:.08em;color:#6f675d}
@media (max-width:600px){.spv-title{font-size:20px}.spv-top{left:18px;flex-direction:column;gap:6px}.spv-hint{bottom:78px}}
`;
  document.head.appendChild(s);
}

/* --------------------------------------------------------- photographs */

function load(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Could not load " + src));
    im.src = src;
  });
}

/* Cut the piece out of its photograph: the background is the corner colour,
   and anything clearly different from it is the piece. Returns the cut-out
   (transparent background, soft edge) and where its stones are. */
function cutOut(img, crop) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const x0 = crop === "right" ? Math.floor(W / 2) : 0;
  const w = crop ? Math.floor(W / 2) : W;
  const c = document.createElement("canvas");
  c.width = w; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, x0, 0, w, H, 0, 0, w, H);
  const id = g.getImageData(0, 0, w, H), d = id.data;
  // the background, averaged from the four corners
  let br = 0, bg = 0, bb = 0;
  for (const [cx, cy] of [[2, 2], [w - 3, 2], [2, H - 3], [w - 3, H - 3]]) {
    const k = (cy * w + cx) * 4; br += d[k]; bg += d[k + 1]; bb += d[k + 2];
  }
  br /= 4; bg /= 4; bb /= 4;
  // pass 1: how much of the piece is in each column
  const col = new Float32Array(w);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const diff = Math.max(Math.abs(d[k] - br), Math.abs(d[k + 1] - bg), Math.abs(d[k + 2] - bb));
      // soft edge: pale metal close to the background stays half-there
      const a = Math.max(0, Math.min(1, (diff - 5) / 16));
      d[k + 3] = Math.round(255 * a);
      col[x] += a;
    }
  }
  /* Half of a photograph of a pair can hold the tip of the other piece (long
     earrings cross the middle). Keep the largest unbroken run of columns,
     gaps of up to 2% allowed, and let the rest go. */
  const gap = Math.max(4, Math.round(w * 0.02));
  let best = [0, w - 1], bestSum = -1, start = -1, sum = 0, quiet = 0;
  for (let x = 0; x <= w; x++) {
    const on = x < w && col[x] > 1.5;
    if (on) { if (start < 0) start = x; sum += col[x]; quiet = 0; }
    else if (start >= 0 && (++quiet > gap || x === w)) {
      if (sum > bestSum) { bestSum = sum; best = [start, x - quiet]; }
      start = -1; sum = 0; quiet = 0;
    }
  }
  let minX = w, minY = H, maxX = 0, maxY = 0;
  const gems = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (x < best[0] || x > best[1]) { d[k + 3] = 0; continue; }
      const r = d[k], gg = d[k + 1], b = d[k + 2];
      const a = d[k + 3] / 255;
      if (a > 0.5) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        // a stone: saturated colour, not too dark (white gold and diamonds are grey)
        if ((x & 3) === 0 && (y & 3) === 0) {
          const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          const sat = mx ? (mx - mn) / mx : 0;
          if (sat > 0.42 && mx > 70) gems.push([x, y, sat * mx]);
        }
      }
    }
  }
  if (maxX <= minX) { minX = 0; minY = 0; maxX = w - 1; maxY = H - 1; }
  g.putImageData(id, 0, 0);
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d").drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);

  /* The brightest points of colour, spread out: one sparkle per facet-sized
     patch rather than a cluster on the biggest stone. */
  gems.sort((a, b) => b[2] - a[2]);
  const picked = [], cell = Math.max(cw, ch) / 18;
  for (const [x, y] of gems) {
    if (picked.length >= 34) break;
    const px = x - minX, py = y - minY;
    if (picked.every(([qx, qy]) => Math.hypot(qx - px, qy - py) > cell)) picked.push([px, py]);
  }
  return {
    canvas: out, w: cw, h: ch,
    sparkles: picked.map(([x, y], i) => ({ x, y, phase: (i * 2.399) % (Math.PI * 2), rate: 3 + (i % 5) }))
  };
}

/* ---------------------------------------------------------------- open */

export function open(opts) {
  if (active) active.close();
  css();
  const base = opts.base || "/";
  const url = (p) => (/^(https?:)?\//.test(p) ? p : base + p);
  const views = opts.views || [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const box = document.createElement("div");
  box.className = "spv";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", (opts.title ? opts.title + ", " : "") + "360° view");
  box.innerHTML =
    '<canvas aria-label="The piece. Drag, or use the arrow keys, to turn it." tabindex="0"></canvas>' +
    '<div class="spv-top"><span class="spv-kicker">360° view</span><h2 class="spv-title"></h2></div>' +
    '<p class="spv-status" aria-live="polite">Preparing the 360° view…</p>' +
    '<p class="spv-hint">Drag to turn · Scroll or pinch to zoom</p>' +
    '<div class="spv-bar" hidden></div>' +
    '<button class="spv-close" type="button" aria-label="Close the 360° view">×</button>';
  box.querySelector(".spv-title").textContent = opts.title || "";
  document.body.appendChild(box);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const canvas = box.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const status = box.querySelector(".spv-status");
  const hint = box.querySelector(".spv-hint");
  const bar = box.querySelector(".spv-bar");
  const buf = document.createElement("canvas"), bctx = buf.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  size();

  /* state */
  let frames = null;            // [{front, side}] per view, cut out
  let viewIdx = 0;
  let angle = 0, vel = 0, zoom = 1;
  let playing = !reduced, lastTouch = 0;
  let closed = false, raf = 0, last = performance.now();

  Promise.all(views.map(async (v) => {
    const [f, s] = await Promise.all([load(url(v.front)), v.side ? load(url(v.side)) : null]);
    return { label: v.label, front: cutOut(f, v.frontCrop), side: s ? cutOut(s, v.sideCrop) : null };
  })).then((list) => {
    if (closed) return;
    frames = list;
    status.hidden = true;
    buildBar();
    raf = requestAnimationFrame(tick);
  }, () => { status.textContent = "The 360° view could not be loaded."; });

  /* ------------------------------------------------------------ controls */

  const dial = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  function buildBar() {
    bar.innerHTML = "";
    dial.setAttribute("viewBox", "0 0 34 34");
    dial.setAttribute("class", "spv-dial");
    dial.setAttribute("aria-hidden", "true");
    dial.innerHTML = '<circle cx="17" cy="17" r="13" fill="none" stroke="#d9d2c7" stroke-width="1.5"/>' +
      '<circle cx="17" cy="4" r="3" fill="#17140f"/>';
    bar.appendChild(dial);
    const play = document.createElement("button");
    play.type = "button";
    // a plain toggle, not styled as a selected option like the finishes beside it
    const setPlay = () => { play.textContent = playing ? "Pause" : "Turn"; play.setAttribute("aria-label", playing ? "Pause turning" : "Turn the piece"); };
    play.addEventListener("click", () => { playing = !playing; lastTouch = 0; setPlay(); });
    setPlay();
    bar.appendChild(play);
    if (frames.length > 1) {
      const sep = document.createElement("span"); sep.className = "spv-sep"; bar.appendChild(sep);
      frames.forEach((f, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = f.label || "View " + (i + 1);
        b.setAttribute("aria-pressed", String(i === viewIdx));
        b.addEventListener("click", () => {
          viewIdx = i;
          bar.querySelectorAll("button[data-view]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        });
        b.dataset.view = i;
        bar.appendChild(b);
      });
    }
    bar.hidden = false;
  }

  let drag = null;
  const pts = new Map();
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) drag = { x: e.clientX, t: performance.now() };
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom }; }
    vel = 0; lastTouch = performance.now();
    hint.style.opacity = "0";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId) || !drag) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (drag.pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      zoom = Math.max(1, Math.min(2.4, drag.zoom * Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch));
      return;
    }
    const now = performance.now(), dx = e.clientX - drag.x;
    const d = -dx * (360 / Math.max(500, W * 0.9));
    angle += d;
    vel = d / Math.max(8, now - drag.t) * 1000 * 0.6;
    drag.x = e.clientX; drag.t = now;
    lastTouch = now;
  });
  const end = (e) => { pts.delete(e.pointerId); if (!pts.size) drag = null; lastTouch = performance.now(); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom = Math.max(1, Math.min(2.4, zoom * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });

  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      angle += e.key === "ArrowLeft" ? 15 : -15;
      lastTouch = performance.now();
      e.preventDefault();
    }
  }
  function onResize() { size(); }
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKey);
  box.querySelector(".spv-close").addEventListener("click", close);
  box.querySelector(".spv-close").focus();

  /* ------------------------------------------------------------- drawing */

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* One photograph, foreshortened by `squeeze` (cos of how far it is turned
     from where it was taken), mirrored for the far side, lit by a sweep. */
  function drawFrame(f, cx, cy, scale, squeeze, mirror, alpha, sweep) {
    if (alpha <= 0.002) return null;
    const dw = f.w * scale, dh = f.h * scale;
    const sx = Math.max(0.08, squeeze) * (mirror ? -1 : 1);
    // the cut-out with its light band, composed off-screen so the light falls
    // on the piece only, never on the background
    buf.width = Math.ceil(dw); buf.height = Math.ceil(dh);
    bctx.clearRect(0, 0, buf.width, buf.height);
    bctx.globalCompositeOperation = "source-over";
    bctx.drawImage(f.canvas, 0, 0, dw, dh);
    bctx.globalCompositeOperation = "source-atop";
    const bx = (sweep * 1.6 - 0.3) * dw;
    const gr = bctx.createLinearGradient(bx - dw * 0.22, 0, bx + dw * 0.22, dh * 0.35);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.34)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    bctx.fillStyle = gr;
    bctx.fillRect(0, 0, dw, dh);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(sx, 1);
    ctx.drawImage(buf, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return { dw: dw * Math.abs(sx), dh, sx };
  }

  function star(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.25, `rgba(255,255,255,${a * 0.55})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
  }

  function tick(now) {
    if (closed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag) {
      angle += vel * dt;
      vel *= Math.pow(0.04, dt);           // a flick coasts, then settles
      if (Math.abs(vel) < 2) vel = 0;
      const idle = now - lastTouch > 3500;
      if (playing && idle && !vel) angle += 22 * dt;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = frames[viewIdx];
    const a = ((angle % 360) + 360) % 360;
    const seg = Math.floor(a / 90), t = (a - seg * 90) / 90;
    // keys: 0 front, 1 side, 2 front (far side), 3 side (far side)
    /* A piece photographed only from the front turns on its stand: it narrows
       towards the side (never to nothing: a necklace on a stand still has
       depth) and shows the front, mirrored, on the far side. */
    const single = !v.side;
    const key = (k) => ({ f: single ? v.front : k % 2 ? v.side : v.front, mirror: single ? false : k >= 2 });
    const A = key(seg % 4), B = key((seg + 1) % 4);
    const wB = single ? 0 : smooth(0.42, 0.58, t);
    const turn = t * Math.PI / 2;
    const cosA = Math.cos(a * Math.PI / 180);
    const singleSqueeze = 0.3 + 0.7 * Math.abs(cosA);

    // one scale for both photographs of a view, so the piece keeps its size
    const ref = v.front;
    const scale = Math.min((H * 0.66) / ref.h, (W * 0.62) / ref.w) * zoom;
    const cx = W / 2, cy = H * 0.47;
    const sweep = (1 - (a % 120) / 120);

    // contact shadow, as wide as the piece currently is
    const width = single ? v.front.w * singleSqueeze * scale
      : (A.f.w * Math.cos(turn) * (1 - wB) + B.f.w * Math.sin(turn) * wB) * scale;
    const floorY = cy + (ref.h * scale) / 2 + 6;
    const sg = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, Math.max(30, width * 0.62));
    sg.addColorStop(0, "rgba(40,32,24,0.16)");
    sg.addColorStop(1, "rgba(40,32,24,0)");
    ctx.save(); ctx.translate(cx, floorY); ctx.scale(1, 0.12); ctx.translate(-cx, -floorY);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, floorY, Math.max(30, width * 0.62), 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const dA = single
      ? drawFrame(v.front, cx, cy, scale, singleSqueeze, cosA < 0, 1, sweep)
      : drawFrame(A.f, cx, cy, scale, Math.cos(turn), A.mirror, 1 - wB, sweep);
    const dB = single ? null : drawFrame(B.f, cx, cy, scale, Math.sin(turn), B.mirror, wB, sweep);

    /* The stones catch the light: each sparkle flashes as the piece turns
       past its own angle, more often while it is moving. */
    const lead = wB > 0.5 ? { f: B.f, d: dB, mirror: B.mirror } : { f: A.f, d: dA, mirror: A.mirror };
    if (lead.d && !reduced) {
      const motion = Math.min(1, Math.abs(vel) / 120 + (drag ? 0.6 : 0) + (playing ? 0.35 : 0.15));
      ctx.globalCompositeOperation = "lighter";
      for (const s of lead.f.sparkles) {
        const flash = Math.pow(Math.max(0, Math.sin(angle * Math.PI / 180 * s.rate + s.phase + now / 900)), 24);
        const al = flash * (0.35 + 0.65 * motion);
        if (al < 0.03) continue;
        const px = cx + (s.x * scale - (lead.f.w * scale) / 2) * lead.d.sx;
        const py = cy + s.y * scale - (lead.f.h * scale) / 2;
        star(px, py, Math.max(8, 26 * scale) * (0.7 + al * 0.7), Math.min(1, al * 1.15));
      }
      ctx.globalCompositeOperation = "source-over";
    }

    dial.lastChild.setAttribute("cx", String(17 + 13 * Math.sin(a * Math.PI / 180)));
    dial.lastChild.setAttribute("cy", String(17 - 13 * Math.cos(a * Math.PI / 180)));
  }

  function close() {
    closed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", onKey);
    box.remove();
    document.body.style.overflow = prevOverflow;
    if (opts.returnFocus) opts.returnFocus.focus();
    active = null;
  }
  /* turnTo: for a page that wants to point the piece somewhere (and for tests) */
  active = { close, turnTo(deg) { angle = deg; vel = 0; playing = false; lastTouch = performance.now(); } };
  return active;
}
