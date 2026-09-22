/* Reads and writes for the content the storefront now loads at run time:
 * the menu tree, the office cards, the contact block, and the media library.
 *
 * Everything here returns plain data or throws. Pages own loading and error
 * state; this file owns the shape of a row and the order of writes.
 */
import { supabase } from "./supabase.js";

/* ---------------------------------------------------------------- settings */

export async function readSetting(key, fallback = {}) {
  const { data, error } = await supabase
    .from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.value ?? fallback;
}

export async function writeSetting(key, value) {
  const { error } = await supabase
    .from("site_settings").upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

/* -------------------------------------------------------------------- nav */

export async function readNav() {
  const { data, error } = await supabase
    .from("nav_items")
    .select("*")
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

/* The table is flat with a parent_id; the editor wants sections holding their
   own children.

   The sort is done here rather than relied on from the query. Reordering
   repaints optimistically by rewriting sort_order in component state, which
   does not move anything in the array — so building the tree in array order
   left the list looking untouched until the next reload, and the arrows
   appeared to do nothing. */
export function nest(rows) {
  const byId = new Map();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots = [];
  rows.forEach((r) => {
    const node = byId.get(r.id);
    const parent = r.parent_id ? byId.get(r.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  roots.sort(byOrder);
  roots.forEach((r) => r.children.sort(byOrder));
  return roots;
}

export async function saveNavItem(item) {
  const row = {
    location: item.location || "primary",
    parent_id: item.parent_id || null,
    label: (item.label || "").trim(),
    /* An empty href is stored as null, not "": the storefront renders a null
       href as plain, unclickable text for a section that has no page yet, and
       an empty string would become href="" and reload the current page. */
    href: (item.href || "").trim() || null,
    is_heading: !!item.is_heading,
    sort_order: Number(item.sort_order) || 0,
    published: item.published !== false,
  };
  if (!row.label) throw new Error("A menu item needs a label.");

  if (item.id) {
    const { error } = await supabase.from("nav_items").update(row).eq("id", item.id);
    if (error) throw error;
    return item.id;
  }
  const { data, error } = await supabase.from("nav_items").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteNavItem(id) {
  /* Children are removed by the foreign key's cascade, so a section takes its
     panel with it rather than leaving orphans pointing at nothing. */
  const { error } = await supabase.from("nav_items").delete().eq("id", id);
  if (error) throw error;
}

/* Reordering writes every affected row's sort_order in one round trip rather
   than one request per row, so dragging an item up a long list is a single
   save and cannot leave the list half-renumbered if one request fails. */
export async function reorderNav(items) {
  if (!items.length) return;
  const rows = items.map((it, i) => ({ id: it.id, sort_order: i }));
  const { error } = await supabase.from("nav_items").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

/* ---------------------------------------------------------------- offices */

export async function readOffices() {
  const { data, error } = await supabase
    .from("offices").select("*").order("kind").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function saveOffice(o) {
  const row = {
    kind: o.kind === "store" ? "store" : "atelier",
    name: (o.name || "").trim(),
    region: (o.region || "").trim() || null,
    address: (o.address || "").trim() || null,
    phone: (o.phone || "").trim() || null,
    tel: (o.tel || "").trim() || null,
    whatsapp: (o.whatsapp || "").trim() || null,
    email: (o.email || "").trim() || null,
    image: (o.image || "").trim() || null,
    map_query: (o.map_query || "").trim() || null,
    hours: (o.hours || "").trim() || null,
    sort_order: Number(o.sort_order) || 0,
    published: o.published !== false,
  };
  if (!row.name) throw new Error("An office needs a name.");

  if (o.id) {
    const { error } = await supabase.from("offices").update(row).eq("id", o.id);
    if (error) throw error;
    return o.id;
  }
  const { data, error } = await supabase.from("offices").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteOffice(id) {
  const { error } = await supabase.from("offices").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderOffices(items) {
  if (!items.length) return;
  const rows = items.map((it, i) => ({ id: it.id, sort_order: i }));
  const { error } = await supabase.from("offices").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

/* ------------------------------------------------------------------ media */

export const MEDIA_BUCKET = "media";

/* Object keys are ASCII, lower case and collision-proofed with a timestamp:
   Supabase storage rejects some characters outright, and the catalogue's own
   filenames are full of spaces and parentheses ("GD25-401 A_2.jpg"). */
export function safeName(name) {
  const dot = name.lastIndexOf(".");
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  const ext = (dot > 0 ? name.slice(dot + 1) : "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${stem}-${Date.now().toString(36)}.${ext}`;
}

export async function listMedia({ folder = "", q = "", limit = 200 } = {}) {
  let query = supabase.from("media").select("*").order("created_at", { ascending: false }).limit(limit);
  if (folder) query = query.eq("folder", folder);
  if (q) query = query.ilike("path", `%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/* Reads the pixel dimensions before upload so the library can show them
   without fetching every file back. Never rejects: a file the browser cannot
   decode still uploads, just without a width and height. */
function measure(file) {
  return new Promise((resolve) => {
    if (!/^image\//.test(file.type)) return resolve({});
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export async function uploadMedia(file, { folder = "general", alt = "" } = {}) {
  const path = `${folder}/${safeName(file.name)}`;
  const dims = await measure(file);

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const row = {
    path, url: pub.publicUrl, alt: alt || null,
    width: dims.width ?? null, height: dims.height ?? null,
    bytes: file.size, mime: file.type || null, folder,
  };
  const { data, error } = await supabase.from("media").insert(row).select().single();
  if (error) {
    /* The object is already in the bucket. Leaving it there with no row would
       make it invisible to the library and impossible to clean up from here. */
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function deleteMedia(item) {
  const { error: sErr } = await supabase.storage.from(MEDIA_BUCKET).remove([item.path]);
  if (sErr) throw sErr;
  const { error } = await supabase.from("media").delete().eq("id", item.id);
  if (error) throw error;
}

/* ------------------------------------------------------------- audit trail */

export async function readAudit({ entity = "", limit = 100 } = {}) {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (entity) query = query.eq("entity_type", entity);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
