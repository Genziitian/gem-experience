/* Gem Experience — 360° stone visualiser
   Realistic faceted gems via Three.js MeshPhysicalMaterial (transmission,
   IOR, attenuation) + studio environment. Drag to orbit, scroll to zoom. */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

var active = null;

function cutGeometry(cut) {
  var g;
  switch (cut) {
    case "marquise":
      g = new THREE.OctahedronGeometry(1, 2);
      g.scale(0.55, 1.35, 0.42);
      break;
    case "oval":
      g = new THREE.IcosahedronGeometry(1, 1);
      g.scale(0.85, 1.1, 0.7);
      break;
    case "cushion":
      g = new THREE.BoxGeometry(1.15, 0.72, 1.15, 2, 2, 2);
      softenBox(g, 0.12);
      break;
    case "emerald":
      g = emeraldCut();
      break;
    case "pear":
      g = pearCut();
      break;
    case "brilliant":
    default:
      g = brilliantCut();
      break;
  }
  g.computeVertexNormals();
  return g;
}

/* Approximate round-brilliant: crown + pavilion from a refined icosahedron. */
function brilliantCut() {
  var g = new THREE.IcosahedronGeometry(1, 2);
  var pos = g.attributes.position;
  var v = new THREE.Vector3();
  for (var i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    var y = v.y;
    if (y > 0) {
      v.y = y * 0.55 + 0.22;
      v.x *= 0.92;
      v.z *= 0.92;
    } else {
      v.y = y * 1.15;
      var t = 1 + y * 0.25;
      v.x *= t;
      v.z *= t;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  g.scale(1.05, 1, 1.05);
  return g;
}

function emeraldCut() {
  var shape = new THREE.Shape();
  var w = 0.7, h = 0.95, c = 0.18;
  shape.moveTo(-w + c, -h);
  shape.lineTo(w - c, -h);
  shape.lineTo(w, -h + c);
  shape.lineTo(w, h - c);
  shape.lineTo(w - c, h);
  shape.lineTo(-w + c, h);
  shape.lineTo(-w, h - c);
  shape.lineTo(-w, -h + c);
  shape.closePath();
  var extrude = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2
  });
  extrude.rotateX(Math.PI / 2);
  extrude.center();
  extrude.scale(1, 0.85, 1);
  return extrude;
}

function pearCut() {
  var g = new THREE.SphereGeometry(1, 16, 12);
  var pos = g.attributes.position;
  var v = new THREE.Vector3();
  for (var i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    var n = (v.y + 1) * 0.5;
    var pinch = 0.55 + n * 0.55;
    v.x *= pinch * 0.75;
    v.z *= pinch * 0.75;
    v.y = v.y * 1.15 + 0.05;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  return g;
}

function softenBox(g, amount) {
  var pos = g.attributes.position;
  var v = new THREE.Vector3();
  for (var i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    var ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
    if (ax > 0.4 && az > 0.4) {
      v.x *= 1 - amount;
      v.z *= 1 - amount;
    }
    if (ay > 0.25 && (ax > 0.4 || az > 0.4)) {
      v.y *= 1 - amount * 0.5;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}

function gemMaterial(cfg) {
  var color = new THREE.Color(cfg.color || "#2a4a9a");
  var accent = new THREE.Color(cfg.accent || cfg.color || "#2a4a9a");
  /* Transmission gems need strong env light; keep a solid colour base so the
     stone stays readable even when refraction under-samples. */
  return new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: 0.15,
    roughness: 0.12,
    transmission: 0.55,
    thickness: 2.0,
    ior: cfg.ior || 1.7,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xffffff),
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    attenuationColor: accent,
    attenuationDistance: cfg.attenuation || 0.4,
    emissive: color.clone().multiplyScalar(0.18),
    flatShading: cfg.cut !== "pear",
    side: THREE.DoubleSide
  });
}

function buildScene(canvas, cfg) {
  var w = canvas.clientWidth || 640;
  var h = canvas.clientHeight || 480;

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x1a1715, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1715);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  var camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 40);
  camera.position.set(0.15, 0.55, 3.2);

  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 1.8;
  controls.maxDistance = 5.2;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.target.set(0, 0.05, 0);

  var amb = new THREE.AmbientLight(0xfff8f0, 0.55);
  scene.add(amb);

  var key = new THREE.DirectionalLight(0xfff6ea, 3.2);
  key.position.set(3.2, 4.5, 2.4);
  scene.add(key);

  var fill = new THREE.DirectionalLight(0xd8e6ff, 1.4);
  fill.position.set(-3.5, 1.2, -1.5);
  scene.add(fill);

  var rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(-1.2, 2.8, -3.4);
  scene.add(rim);

  var sparkA = new THREE.PointLight(0xffffff, 2.2, 10);
  sparkA.position.set(1.6, 1.1, 1.8);
  scene.add(sparkA);

  var sparkB = new THREE.PointLight(cfg.accent || cfg.color || "#ffffff", 1.6, 9);
  sparkB.position.set(-1.8, 0.4, 1.2);
  scene.add(sparkB);

  var group = new THREE.Group();
  var stoneGeo = cutGeometry(cfg.cut || "brilliant");
  var stone = new THREE.Mesh(stoneGeo, gemMaterial(cfg));
  stone.rotation.x = -0.12;
  group.add(stone);

  /* Inner core gives depth and colour saturation through the facets */
  var coreGeo = cutGeometry(cfg.cut || "brilliant");
  coreGeo.scale(0.42, 0.42, 0.42);
  var core = new THREE.Mesh(
    coreGeo,
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.accent || cfg.color || "#2a4a9a"),
      roughness: 0.25,
      metalness: 0.05,
      transmission: 0.15,
      thickness: 0.5,
      emissive: new THREE.Color(cfg.color || "#2a4a9a").multiplyScalar(0.15),
      flatShading: true
    })
  );
  group.add(core);

  scene.add(group);

  var disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 64),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.07
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.95;
  scene.add(disc);

  var userInteracted = false;
  function onInteract() {
    if (userInteracted) return;
    userInteracted = true;
    controls.autoRotate = false;
  }
  canvas.addEventListener("pointerdown", onInteract);
  canvas.addEventListener("wheel", onInteract, { passive: true });

  var raf = 0;
  var t0 = performance.now();

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    sparkA.intensity = 1.15 + Math.sin(t * 1.7) * 0.35;
    sparkB.intensity = 0.7 + Math.cos(t * 1.3) * 0.35;
    if (!userInteracted) group.rotation.y = Math.sin(t * 0.15) * 0.08;
    controls.update();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  function resize() {
    var nw = canvas.clientWidth;
    var nh = canvas.clientHeight;
    if (!nw || !nh) return;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  }

  function reset() {
    camera.position.set(0.15, 0.55, 3.2);
    controls.target.set(0, 0.05, 0);
    controls.autoRotate = true;
    userInteracted = false;
    group.rotation.set(0, 0, 0);
  }

  function dispose() {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointerdown", onInteract);
    canvas.removeEventListener("wheel", onInteract);
    controls.dispose();
    stone.geometry.dispose();
    stone.material.dispose();
    core.geometry.dispose();
    core.material.dispose();
    disc.geometry.dispose();
    disc.material.dispose();
    renderer.dispose();
  }

  return { resize: resize, reset: reset, dispose: dispose, controls: controls };
}

function close() {
  if (!active) return;
  window.removeEventListener("resize", active.onResize);
  active.api.dispose();
  if (active.root && active.root.parentNode) active.root.parentNode.removeChild(active.root);
  document.body.style.overflow = "";
  active = null;
}

function open(cfg) {
  close();

  var root = document.createElement("div");
  root.className = "viz";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "360 degree stone view — " + (cfg.name || "Gem"));

  root.innerHTML =
    '<div class="viz-scrim" data-viz-close></div>' +
    '<div class="viz-stage">' +
      '<button class="viz-close" type="button" data-viz-close aria-label="Close">×</button>' +
      '<div class="viz-head">' +
        '<span class="viz-kicker">360° stone view</span>' +
        '<h2 class="viz-title"></h2>' +
        '<p class="viz-meta"></p>' +
      '</div>' +
      '<div class="viz-canvas-wrap">' +
        '<canvas class="viz-canvas" aria-label="Interactive gemstone"></canvas>' +
        '<div class="viz-vignette" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="viz-foot">' +
        '<p class="viz-hint">Drag to turn · Scroll to zoom</p>' +
        '<div class="viz-actions">' +
          '<button class="viz-btn" type="button" data-viz-reset>Reset view</button>' +
          '<button class="viz-btn viz-btn--solid" type="button" data-viz-close>Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  root.querySelector(".viz-title").textContent = cfg.name || "Gemstone";
  var meta = [];
  if (cfg.materials) meta.push(cfg.materials);
  if (cfg.carat && cfg.carat !== "—") meta.push(cfg.carat);
  if (cfg.cutLabel) meta.push(cfg.cutLabel);
  root.querySelector(".viz-meta").textContent = meta.join(" · ");

  document.body.appendChild(root);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(function () { root.classList.add("is-on"); });

  var canvas = root.querySelector(".viz-canvas");
  var api = buildScene(canvas, cfg);
  var onResize = function () { api.resize(); };
  window.addEventListener("resize", onResize);
  api.resize();

  root.querySelectorAll("[data-viz-close]").forEach(function (n) {
    n.addEventListener("click", close);
  });
  root.querySelector("[data-viz-reset]").addEventListener("click", function () {
    api.reset();
  });

  active = { root: root, api: api, onResize: onResize };
  root.querySelector(".viz-close").focus();
  return { close: close };
}

window.GemVisualiser = {
  open: open,
  close: close,
  isOpen: function () { return !!active; }
};
