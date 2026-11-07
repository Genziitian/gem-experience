/* Gem Experience — a piece in 3D, from the workshop's own CAD file.
 *
 * The CAD model is converted once (Rhino .3dm -> glTF, simplified and
 * meshopt-compressed; see tools/cad-to-glb.mjs) into three
 * named parts: "metal", "diamond" and "gem". Each gets its material here, so
 * one file serves any metal colour and any coloured stone:
 *
 *   import("/js/piece-viewer.js").then((m) => m.open({
 *     src: "/fine-jewellery/models/gd26-806.glb",
 *     metal: "white", gem: "#d4507a", title: "Pink Spinel Ring",
 *   }));
 *
 * Needs the page's import map to point "three" and "three/addons/" at
 * /high-jewellery/vendor/three/.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const METALS = {
  white: 0xe4e2dd,
  yellow: 0xe6c27a,
  rose: 0xe2a88f,
};

let active = null;

function materials(opts) {
  return {
    metal: new THREE.MeshPhysicalMaterial({
      color: METALS[opts.metal] || METALS.white, metalness: 1, roughness: 0.16,
      clearcoat: 0.4, clearcoatRoughness: 0.12, envMapIntensity: 1.25,
    }),
    diamond: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.6,
      ior: 2.42, specularIntensity: 1, envMapIntensity: 2.2, dispersion: 0.3,
    }),
    gem: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(opts.gem || "#d4507a"), metalness: 0, roughness: 0.02,
      // only partly clear, so the colour holds from every angle
      transmission: 0.5, thickness: 1.2, ior: 1.72, envMapIntensity: 1.8,
      attenuationColor: new THREE.Color(opts.gem || "#d4507a"), attenuationDistance: 0.8,
    }),
  };
}

function overlay(title) {
  const box = document.createElement("div");
  box.className = "pv";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", (title ? title + ", " : "") + "360° view");
  box.innerHTML =
    '<div class="pv-stage"></div>' +
    '<p class="pv-status" aria-live="polite">Loading the 3D model…</p>' +
    '<p class="pv-hint">Drag to turn · Pinch or scroll to zoom</p>' +
    '<button class="pv-close" type="button" aria-label="Close the 360° view">×</button>';
  if (!document.getElementById("pv-css")) {
    const s = document.createElement("style");
    s.id = "pv-css";
    s.textContent =
      ".pv{position:fixed;inset:0;z-index:300;background:#f2f2f2;display:grid}" +
      ".pv-stage{position:absolute;inset:0;cursor:grab}.pv-stage:active{cursor:grabbing}" +
      ".pv-stage canvas{display:block;width:100%;height:100%;touch-action:none}" +
      ".pv-status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;font:300 13px/1.4 Jost,sans-serif;letter-spacing:.08em;color:#6f675d}" +
      ".pv-hint{position:absolute;left:0;right:0;bottom:22px;margin:0;text-align:center;font:400 11px/1 Jost,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8a8279}" +
      ".pv-close{position:absolute;top:16px;right:16px;width:46px;height:46px;border:0;border-radius:50%;background:#fff;box-shadow:0 1px 8px rgba(0,0,0,.14);font:300 28px/46px Jost,sans-serif;color:#17140f;cursor:pointer}";
    document.head.appendChild(s);
  }
  return box;
}

export function open(opts) {
  if (active) active.close();
  const box = overlay(opts.title);
  document.body.appendChild(box);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  const stage = box.querySelector(".pv-stage");
  const status = box.querySelector(".pv-status");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const camera = new THREE.PerspectiveCamera(30, stage.clientWidth / stage.clientHeight, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // until the visitor takes over, the piece sways a little either side of the
  // front: a necklace turned a full circle spends half its time edge-on
  let swaying = true, swayFrom = 0, swayDist = 1, swayY = 0;
  controls.addEventListener("start", () => { swaying = false; });

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4ea, 1.1);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  let frame = 0, closed = false;
  function loop() {
    if (closed) return;
    frame = requestAnimationFrame(loop);
    if (swaying) {
      const a = Math.sin((performance.now() - swayFrom) / 2600) * 0.6;
      camera.position.set(Math.sin(a) * swayDist, swayY, Math.cos(a) * swayDist);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  const mats = materials(opts);
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(opts.src, (gltf) => {
    if (closed) return;
    const root = gltf.scene;
    // the parts are told apart by material name: simplifying the model merges
    // its meshes but keeps the materials ("metal", "diamond", "gem")
    root.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.material && o.material.name) || o.name;
      const part = /diamond/i.test(name) ? "diamond" : /gem/i.test(name) ? "gem" : "metal";
      o.material = mats[part];
    });
    // A flat piece (a necklace, a pendant) is turned to face the camera: CAD
    // files are drawn lying in whichever plane the designer chose.
    const raw = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    const thin = Math.min(raw.x, raw.y, raw.z), wide = Math.max(raw.x, raw.y, raw.z);
    if (thin < wide * 0.5) {
      if (thin === raw.x) root.rotation.y = Math.PI / 2;
      else if (thin === raw.y) root.rotation.x = Math.PI / 2;
    }
    if (opts.turn) root.rotation.z += opts.turn;
    // centre the piece and frame it whatever units the CAD file was drawn in
    const pivot = new THREE.Group();
    pivot.add(root);
    const box3 = new THREE.Box3().setFromObject(pivot);
    const size = box3.getSize(new THREE.Vector3()), centre = box3.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    scene.add(pivot);
    const r = size.length() / 2;
    camera.near = r / 100; camera.far = r * 100; camera.updateProjectionMatrix();
    const dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    swayDist = Math.hypot(dist, r * 0.35); swayY = r * 0.35; swayFrom = performance.now();
    camera.position.set(0, swayY, swayDist);
    controls.minDistance = r * 1.2;
    controls.maxDistance = dist * 2.2;
    controls.target.set(0, 0, 0);
    status.hidden = true;
    loop();
  }, undefined, () => {
    status.textContent = "The 3D model could not be loaded.";
  });

  function onResize() {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  function close() {
    closed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", onKey);
    controls.dispose();
    Object.values(mats).forEach((m) => m.dispose());
    pmrem.dispose();
    renderer.dispose();
    box.remove();
    document.body.style.overflow = prevOverflow;
    if (opts.returnFocus) opts.returnFocus.focus();
    active = null;
  }
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKey);
  box.querySelector(".pv-close").addEventListener("click", close);
  box.querySelector(".pv-close").focus();
  active = { close };
  return active;
}
