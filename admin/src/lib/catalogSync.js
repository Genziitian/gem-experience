/* Moves the catalog between the storefront's data.js files and Supabase.
 *
 * The storefront renders from static data.js files, so Supabase is the editing
 * surface and those files stay the published artefact: import pulls the site's
 * catalog in, export writes it back out for committing. Both files are a single
 * JSON object after one assignment, which is what makes the round trip possible.
 */
import { supabase } from "./supabase.js";

const SITES = {
  fine: { url: "/fine-jewellery/data.js", global: "FJ_DATA", category: "fine-jewellery" },
  high: { url: "/high-jewellery/data.js", global: "HJ_DATA", category: "high-jewellery" },
};

/* The files are `window.X = {…};` and nothing else, so the JSON can be taken
   from the first brace to the last without executing anything. */
function parseDataFile(text, global) {
  const start = text.indexOf("{", text.indexOf(`window.${global}`));
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Could not find ${global} in the data file`);
  return JSON.parse(text.slice(start, end + 1));
}

async function fetchSite(key) {
  const site = SITES[key];
  const res = await fetch(site.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${site.url} returned ${res.status}`);
  return parseDataFile(await res.text(), site.global);
}

export async function readSiteCatalog() {
  const [fine, high] = await Promise.all([fetchSite("fine"), fetchSite("high")]);
  return { fine, high };
}

/* Fields the columns below cover. Anything else a storefront product carries
   is kept verbatim in `extras`, so a field this schema never anticipated
   survives the round trip instead of being dropped on the next export. */
const FINE_KEYS = new Set([
  "id", "sku", "name", "collection", "type", "metal", "metalCode", "stone", "shape",
  "stonePcs", "stoneCt", "diamondCt", "netG", "grossG", "story", "tone", "images",
]);
const HIGH_KEYS = new Set([
  "id", "name", "materials", "type", "collection", "occasion", "carat", "origin",
  "metal", "ref", "story", "visualiser", "isGemstone",
]);

function extrasOf(product, known) {
  const out = {};
  for (const [k, v] of Object.entries(product)) if (!known.has(k)) out[k] = v;
  return out;
}

function chunk(list, size = 100) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function categoryIds() {
  const { data, error } = await supabase.from("categories").select("id, slug");
  if (error) throw error;
  return Object.fromEntries((data || []).map((c) => [c.slug, c.id]));
}

/* ------------------------------------------------------------------ import */

export async function importFromSite(onProgress = () => {}) {
  const { fine, high } = await readSiteCatalog();
  const cats = await categoryIds();
  if (!cats["fine-jewellery"] || !cats["high-jewellery"]) {
    throw new Error("Categories are missing. Run migrations/ in the Supabase SQL editor first.");
  }

  const counts = { collections: 0, products: 0, images: 0 };

  // ---- collections
  onProgress("Collections…");
  const collectionRows = [
    ...(fine.collections || []).map((c, i) => ({
      slug: c.id,
      name: c.name,
      lede: c.lede || null,
      description: c.story || null,
      tone: c.tone || null,
      banner: c.banner || null,
      meta: c.meta || null,
      designer: c.designer || null,
      models: c.models || [],
      category_id: cats["fine-jewellery"],
      sort_order: i,
      published: true,
    })),
    ...(high.collections || []).map((c, i) => ({
      slug: c.id,
      name: c.name,
      category_id: cats["high-jewellery"],
      sort_order: i,
      published: true,
    })),
  ];
  const { error: colErr } = await supabase
    .from("collections")
    .upsert(collectionRows, { onConflict: "slug" });
  if (colErr) throw colErr;
  counts.collections = collectionRows.length;

  const { data: colData, error: colReadErr } = await supabase.from("collections").select("id, slug");
  if (colReadErr) throw colReadErr;
  const colId = Object.fromEntries((colData || []).map((c) => [c.slug, c.id]));
  // storefront products reference a collection by display name, not slug
  const colIdByName = {};
  [...(fine.collections || []), ...(high.collections || [])].forEach((c) => {
    colIdByName[c.name] = colId[c.id];
  });

  // ---- products
  onProgress("Products…");
  const productRows = [
    ...(fine.products || []).map((p, i) => ({
      slug: p.id,
      name: p.name,
      ref_code: p.sku || null,
      product_type: p.type || null,
      metal: p.metal || null,
      metal_code: p.metalCode || null,
      stone: p.stone || null,
      shape: p.shape || null,
      stone_pcs: p.stonePcs ?? null,
      stone_ct: p.stoneCt ?? null,
      diamond_ct: p.diamondCt ?? null,
      net_g: p.netG ?? null,
      gross_g: p.grossG ?? null,
      story: p.story || null,
      tone: p.tone || null,
      materials: p.stone || null,
      collection_id: colIdByName[p.collection] || null,
      category_id: cats["fine-jewellery"],
      status: "published",
      price_on_enquiry: true,
      featured_sort: i,
      extras: extrasOf(p, FINE_KEYS),
    })),
    ...(high.products || []).map((p, i) => ({
      slug: p.id,
      name: p.name,
      ref_code: p.ref && p.ref !== "—" ? p.ref : null,
      product_type: p.type || null,
      materials: p.materials || null,
      metal: p.metal || null,
      occasion: p.occasion || null,
      carat: p.carat && p.carat !== "—" ? p.carat : null,
      origin: p.origin && p.origin !== "—" ? p.origin : null,
      story: p.story || null,
      collection_id: colIdByName[p.collection] || null,
      category_id: cats["high-jewellery"],
      is_gemstone: !!p.isGemstone,
      has_visualiser: !!p.visualiser,
      visualiser: p.visualiser || {},
      status: "published",
      price_on_enquiry: true,
      featured_sort: i,
      extras: extrasOf(p, HIGH_KEYS),
    })),
  ];

  for (const batch of chunk(productRows)) {
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "slug" });
    if (error) throw error;
    counts.products += batch.length;
  }

  // ---- images (fine jewellery only; the storefront is the source of the paths)
  onProgress("Images…");
  const { data: prodData, error: prodErr } = await supabase.from("products").select("id, slug");
  if (prodErr) throw prodErr;
  const prodId = Object.fromEntries((prodData || []).map((p) => [p.slug, p.id]));

  const withImages = (fine.products || []).filter((p) => p.images && p.images.length);
  const ids = withImages.map((p) => prodId[p.id]).filter(Boolean);
  if (ids.length) {
    // replace wholesale rather than diff — the site file is authoritative here
    const { error } = await supabase.from("product_images").delete().in("product_id", ids);
    if (error) throw error;
  }
  const imageRows = withImages.flatMap((p) =>
    (p.images || []).map((url, i) => ({
      product_id: prodId[p.id],
      url,
      alt: p.name,
      sort_order: i,
    })).filter((r) => r.product_id)
  );
  for (const batch of chunk(imageRows, 200)) {
    const { error } = await supabase.from("product_images").insert(batch);
    if (error) throw error;
    counts.images += batch.length;
  }

  return counts;
}

/* ------------------------------------------------------------------ export */

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Key order is written out by hand so the generated file keeps reading like the
   one a person wrote, and diffs stay small when only a value changes. */
function fineProduct(p, images) {
  return {
    id: p.slug,
    sku: p.ref_code || "",
    name: p.name,
    collection: p.collection_name || "",
    type: p.product_type || "",
    metal: p.metal || "",
    metalCode: p.metal_code || "",
    stone: p.stone || "",
    shape: p.shape || "",
    stonePcs: p.stone_pcs ?? null,
    stoneCt: num(p.stone_ct),
    diamondCt: num(p.diamond_ct),
    netG: num(p.net_g),
    grossG: num(p.gross_g),
    story: p.story || "",
    tone: p.tone || "",
    ...(images.length ? { images } : {}),
    ...(p.extras || {}),
  };
}

function fineCollection(c) {
  return {
    id: c.slug,
    name: c.name,
    lede: c.lede || "",
    story: c.description || "",
    tone: c.tone || "",
    banner: c.banner || "",
    ...(c.designer ? { designer: c.designer } : {}),
    meta: c.meta || "",
    ...(Array.isArray(c.models) && c.models.length ? { models: c.models } : {}),
  };
}

function highProduct(p) {
  const out = {
    id: p.slug,
    name: p.name,
    materials: p.materials || "",
    type: p.product_type || "",
    collection: p.collection_name || "",
    occasion: p.occasion || "",
    carat: p.carat || "—",
    origin: p.origin || "—",
    metal: p.metal || null,
    ref: p.ref_code || "—",
    story: p.story || "",
  };
  if (p.visualiser && Object.keys(p.visualiser).length) out.visualiser = p.visualiser;
  Object.assign(out, p.extras || {});
  if (p.is_gemstone) out.isGemstone = true;
  return out;
}

export async function buildExport() {
  const { data: cats, error: catErr } = await supabase.from("categories").select("id, slug");
  if (catErr) throw catErr;
  const bySlug = Object.fromEntries((cats || []).map((c) => [c.slug, c.id]));

  const { data: cols, error: colErr } = await supabase
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true });
  if (colErr) throw colErr;

  const { data: prods, error: prodErr } = await supabase
    .from("products")
    .select("*, product_images (url, sort_order)")
    .neq("status", "archived")
    .order("featured_sort", { ascending: true });
  if (prodErr) throw prodErr;

  const colById = Object.fromEntries((cols || []).map((c) => [c.id, c]));
  const named = (prods || []).map((p) => ({
    ...p,
    collection_name: colById[p.collection_id]?.name || "",
  }));

  const fineCols = (cols || []).filter((c) => c.category_id === bySlug["fine-jewellery"]);
  const highCols = (cols || []).filter((c) => c.category_id === bySlug["high-jewellery"]);
  const fineProds = named.filter((p) => p.category_id === bySlug["fine-jewellery"]);
  const highProds = named.filter((p) => p.category_id === bySlug["high-jewellery"]);

  const fine = {
    collections: fineCols.map(fineCollection),
    types: ["Necklaces", "Pendants", "Earrings", "Rings", "Bracelets"],
    products: fineProds.map((p) =>
      fineProduct(
        p,
        (p.product_images || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => i.url)
      )
    ),
  };

  const high = {
    collections: highCols.map((c) => ({ id: c.slug, name: c.name })),
    types: ["Gemstones", "Rings", "Necklaces", "Earrings", "Bracelets", "Tiaras"],
    occasions: ["Bridal", "Gala", "Collector", "Gifting"],
    products: highProds.map(highProduct),
  };

  return {
    "fine-jewellery/data.js":
      "/* Fine Jewellery catalog — generated from the admin. Edit in the admin and\n" +
      "   re-export rather than by hand, or the next export will overwrite it. */\n" +
      "window.FJ_DATA = " + JSON.stringify(fine, null, 2) + ";\n",
    "high-jewellery/data.js":
      "/* High Jewellery catalog — generated from the admin. Edit in the admin and\n" +
      "   re-export rather than by hand, or the next export will overwrite it. */\n" +
      "window.HJ_DATA = " + JSON.stringify(high, null, 2) + ";\n",
    counts: { fine: fine.products.length, high: high.products.length },
  };
}

export function downloadFile(name, contents) {
  const blob = new Blob([contents], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
