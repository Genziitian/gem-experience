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

/* ------------------------------------------------------------------- faqs
 *
 * Categories are keyed by slug, not a uuid: the slug is the anchor on /faqs/
 * and what a collection page asks for when it embeds its own questions, so it
 * is the thing that has to stay stable. Renaming a slug cascades to its
 * questions in the database.
 */

export async function readFaqCategories() {
  const { data, error } = await supabase
    .from("faq_categories").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveFaqCategory(c, previousSlug) {
  const row = {
    slug: slugify(c.slug || c.label),
    label: (c.label || "").trim(),
    intro: (c.intro || "").trim() || null,
    sort_order: Number(c.sort_order) || 0,
    published: c.published !== false,
  };
  if (!row.label) throw new Error("A category needs a name.");
  if (!row.slug) throw new Error("A category needs a slug.");

  if (previousSlug) {
    const { error } = await supabase.from("faq_categories").update(row).eq("slug", previousSlug);
    if (error) throw error;
    return row.slug;
  }
  const { error } = await supabase.from("faq_categories").insert(row);
  if (error) throw error;
  return row.slug;
}

export async function deleteFaqCategory(slug) {
  /* its questions go with it, by the foreign key's cascade */
  const { error } = await supabase.from("faq_categories").delete().eq("slug", slug);
  if (error) throw error;
}

export async function reorderFaqCategories(items) {
  if (!items.length) return;
  const rows = items.map((it, i) => ({ slug: it.slug, label: it.label, sort_order: i }));
  const { error } = await supabase.from("faq_categories").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
}

export async function readFaqs() {
  const { data, error } = await supabase
    .from("faqs").select("*").order("category").order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveFaq(f) {
  const row = {
    category: f.category,
    question: (f.question || "").trim(),
    answer: (f.answer || "").trim(),
    sort_order: Number(f.sort_order) || 0,
    published: f.published !== false,
  };
  if (!row.category) throw new Error("Choose a category.");
  if (!row.question) throw new Error("A question is needed.");
  if (!row.answer) throw new Error("An answer is needed.");

  if (f.id) {
    const { error } = await supabase.from("faqs").update(row).eq("id", f.id);
    if (error) throw error;
    return f.id;
  }
  const { data, error } = await supabase.from("faqs").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteFaq(id) {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
}

/* The upsert carries the not-null columns as well as the order: an upsert is
   an insert first, and Postgres checks the row it would insert before it
   finds the conflict and turns it into an update. */
export async function reorderFaqs(items) {
  if (!items.length) return;
  const rows = items.map((it, i) => ({
    id: it.id, category: it.category, question: it.question, answer: it.answer, sort_order: i,
  }));
  const { error } = await supabase.from("faqs").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

/* ------------------------------------------------------------------- blog */

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function readPosts() {
  const { data, error } = await supabase
    .from("blog_posts").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function savePost(p) {
  const tags = Array.isArray(p.tags)
    ? p.tags
    : String(p.tags || "").split(",");
  const row = {
    slug: slugify(p.slug || p.title),
    title: (p.title || "").trim(),
    excerpt: (p.excerpt || "").trim() || null,
    body: p.body || "",
    cover_image: (p.cover_image || "").trim() || null,
    cover_alt: (p.cover_alt || "").trim() || null,
    author: (p.author || "").trim() || null,
    tags: [...new Set(tags.map((t) => t.trim()).filter(Boolean))],
    seo_title: (p.seo_title || "").trim() || null,
    seo_description: (p.seo_description || "").trim() || null,
    published: !!p.published,
    /* Publishing without a date means "now". A date that is set is kept, so
       re-saving an old post does not move it to the top of the journal. */
    published_at: p.published_at
      ? new Date(p.published_at).toISOString()
      : p.published ? new Date().toISOString() : null,
  };
  if (!row.title) throw new Error("A post needs a title.");
  if (!row.slug) throw new Error("A post needs a slug.");
  if (row.slug === "post") throw new Error("“post” is reserved by the article page. Choose another slug.");

  if (p.id) {
    const { error } = await supabase.from("blog_posts").update(row).eq("id", p.id);
    if (error) throw friendly(error);
    return p.id;
  }
  const { data, error } = await supabase.from("blog_posts").insert(row).select("id").single();
  if (error) throw friendly(error);
  return data.id;
}

function friendly(error) {
  if (error && error.code === "23505") return new Error("Another post already uses this slug.");
  return error;
}

export async function deletePost(id) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}
