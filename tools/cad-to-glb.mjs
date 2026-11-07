#!/usr/bin/env node
/* A workshop CAD file (Rhino .3dm) as a glTF the 360° view can show.
 *
 *   npm i --no-save rhino3dm@8.4.0 gltfpack@0.24.0
 *   node tools/cad-to-glb.mjs "render 806.3dm" raw.glb
 *   npx gltfpack -i raw.glb -o frontend/high-jewellery/models/<id>.glb -si 0.08 -km -c
 *
 * Reads the render meshes Rhino saved with the file (no re-meshing) and the
 * placed stones (block instances), and writes three parts named by material:
 * "metal", "diamond" (layer "Gem 03") and "gem" (layer "User Layer 02", the
 * coloured stones). /js/piece-viewer.js colours each part, so the same file
 * serves any metal or stone colour. gltfpack then keeps 8% of the triangles
 * and meshopt-compresses the result: 90 MB in, about 1.3 MB out for Rift.
 * Layer names are the CAD team's; check them with a new file before trusting
 * the split.
 */
import rhino3dm from "rhino3dm"; import fs from "node:fs";
const rh = await rhino3dm();
const doc = rh.File3dm.fromByteArray(new Uint8Array(fs.readFileSync(process.argv[2])));
const objs = doc.objects(), layers = doc.layers(), defs = doc.instanceDefinitions();
const parts = { metal: { p: [], n: [], i: [] }, diamond: { p: [], n: [], i: [] }, gem: { p: [], n: [], i: [] } };
const partOf = (lay) => lay === "Gem 03" ? "diamond" : lay === "User Layer 02" ? "gem" : "metal";
function addMesh(m, part, xf) {
  if (!m) return;
  const P = parts[part], base = P.p.length / 3;
  const v = m.vertices(), n = m.normals(), f = m.faces();
  const vn = v.count, hasN = n.count === vn;
  for (let k = 0; k < vn; k++) {
    let [x, y, z] = v.get(k); let [a, b, c] = hasN ? n.get(k) : [0, 0, 1];
    if (xf) { const M = xf; const X = M[0]*x+M[1]*y+M[2]*z+M[3], Y = M[4]*x+M[5]*y+M[6]*z+M[7], Z = M[8]*x+M[9]*y+M[10]*z+M[11];
      const A = M[0]*a+M[1]*b+M[2]*c, B = M[4]*a+M[5]*b+M[6]*c, C = M[8]*a+M[9]*b+M[10]*c; const L = Math.hypot(A,B,C)||1;
      x=X; y=Y; z=Z; a=A/L; b=B/L; c=C/L; }
    // Rhino is Z-up; glTF is Y-up
    P.p.push(x, z, -y); P.n.push(a, c, -b);
  }
  // a mirrored placement (negative determinant) turns the triangles inside out
  const M = xf, flip = M && (M[0]*(M[5]*M[10]-M[6]*M[9]) - M[1]*(M[4]*M[10]-M[6]*M[8]) + M[2]*(M[4]*M[9]-M[5]*M[8])) < 0;
  const tri = (a, b, c) => flip ? P.i.push(base+a, base+c, base+b) : P.i.push(base+a, base+b, base+c);
  for (let k = 0; k < f.count; k++) { const q = f.get(k); tri(q[0], q[1], q[2]); if (q[2] !== q[3]) tri(q[0], q[2], q[3]); }
}
function meshesOf(g) {
  const t = g.constructor.name, out = [];
  if (t === "Brep") { const fs_ = g.faces(); for (let k = 0; k < fs_.count; k++) out.push(fs_.get(k).getMesh(rh.MeshType.Any)); }
  else if (t === "Extrusion") out.push(g.getMesh(rh.MeshType.Any));
  else if (t === "Mesh") out.push(g);
  return out.filter(Boolean);
}
const defGeom = {};
for (let i = 0; i < defs.count; i++) { const d = defs.get(i); defGeom[d.id] = d.getObjectIds().map((id) => objs.findId(id)).filter(Boolean).flatMap((o) => meshesOf(o.geometry())); }
let stones = { diamond: 0, gem: 0 };
for (let i = 0; i < objs.count; i++) {
  const o = objs.get(i), a = o.attributes(); if (a.isInstanceDefinitionObject) continue;
  const g = o.geometry(), t = g.constructor.name, part = partOf(layers.get(a.layerIndex).name);
  if (t === "InstanceReference") { const xf = g.xform.toFloatArray(true); (defGeom[g.parentIdefId] || []).forEach((m) => addMesh(m, part, xf)); stones[part]++; }
  else meshesOf(g).forEach((m) => addMesh(m, part));
}
console.log("stones", stones, Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, (v.i.length / 3) + " tris"])));
// minimal GLB: one node per part, float positions/normals, uint32 indices
const bufs = [], views = [], accs = [], meshes = [], nodes = []; let off = 0;
const push = (arr, T, target) => { const b = Buffer.from(new T(arr).buffer); const pad = (4 - b.length % 4) % 4; bufs.push(b, Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); off += b.length + pad; return views.length - 1; };
const mats = [{ name: "metal" }, { name: "diamond" }, { name: "gem" }];
Object.entries(parts).forEach(([name, P], mi) => {
  if (!P.i.length) return;
  const min = [1e9,1e9,1e9], max = [-1e9,-1e9,-1e9]; for (let k = 0; k < P.p.length; k += 3) for (let j = 0; j < 3; j++) { min[j] = Math.min(min[j], P.p[k+j]); max[j] = Math.max(max[j], P.p[k+j]); }
  const pv = push(P.p, Float32Array, 34962), nv = push(P.n, Float32Array, 34962), iv = push(P.i, Uint32Array, 34963);
  accs.push({ bufferView: pv, componentType: 5126, count: P.p.length / 3, type: "VEC3", min, max }, { bufferView: nv, componentType: 5126, count: P.n.length / 3, type: "VEC3" }, { bufferView: iv, componentType: 5125, count: P.i.length, type: "SCALAR" });
  const a0 = accs.length - 3;
  meshes.push({ name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1 }, indices: a0 + 2, material: mi }] });
  nodes.push({ name, mesh: meshes.length - 1 });
});
const bin = Buffer.concat(bufs);
const json = Buffer.from(JSON.stringify({ asset: { version: "2.0", generator: "gem-experience 3dm" }, scene: 0, scenes: [{ nodes: nodes.map((_, k) => k) }], nodes, meshes, materials: mats, accessors: accs, bufferViews: views, buffers: [{ byteLength: bin.length }] }));
const jpad = Buffer.alloc((4 - json.length % 4) % 4, 0x20);
const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
const total = 12 + 8 + json.length + jpad.length + 8 + bin.length;
head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
jh.writeUInt32LE(json.length + jpad.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(process.argv[3], Buffer.concat([head, jh, json, jpad, bh, bin]));
console.log("wrote", process.argv[3], (total / 1e6).toFixed(1) + "MB");
