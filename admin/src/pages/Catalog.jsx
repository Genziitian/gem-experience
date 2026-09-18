import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Panel, Empty, Skeleton, Pill, Search, Icon, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { importFromSite, buildExport, downloadFile } from "../lib/catalogSync.js";

const empty = {
  slug: "",
  name: "",
  materials: "",
  metal: "",
  product_type: "",
  occasion: "",
  carat: "",
  origin: "",
  story: "",
  ref_code: "",
  stone: "",
  shape: "",
  stone_ct: "",
  diamond_ct: "",
  net_g: "",
  gross_g: "",
  status: "draft",
  price_on_enquiry: true,
  has_visualiser: false,
  is_gemstone: false,
};

export default function Catalog() {
  const [cats, setCats] = useState(null);
  const [cols, setCols] = useState([]);
  const [rows, setRows] = useState(null);

  // drill-down: null -> category list, {category} -> collections, {category, collection} -> products
  const [cat, setCat] = useState(null);
  const [col, setCol] = useState(null);

  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    const [c, l, p] = await Promise.all([
      supabase.from("categories").select("id, slug, name, kind, sort_order").order("sort_order"),
      supabase.from("collections").select("id, slug, name, category_id, sort_order").order("sort_order"),
      supabase
        .from("products")
        .select("id, slug, name, status, product_type, materials, has_visualiser, price_on_enquiry, ref_code, metal, occasion, carat, origin, story, is_gemstone, category_id, collection_id, stone, shape, stone_ct, diamond_ct, net_g, gross_g")
        .order("featured_sort", { ascending: true }),
    ]);
    const err = c.error || l.error || p.error;
    if (err) {
      // settle the page so the reason is readable instead of an endless skeleton
      setError(
        /does not exist/i.test(err.message)
          ? `${err.message} — run migrations/20260918000000_catalog_hierarchy.sql in the Supabase SQL editor.`
          : err.message
      );
      setCats([]); setCols([]); setRows([]);
      return;
    }
    setError("");
    setCats(c.data || []);
    setCols(l.data || []);
    setRows(p.data || []);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const byCat = {}, byCol = {};
    (rows || []).forEach((r) => {
      if (r.category_id) byCat[r.category_id] = (byCat[r.category_id] || 0) + 1;
      if (r.collection_id) byCol[r.collection_id] = (byCol[r.collection_id] || 0) + 1;
    });
    return { byCat, byCol };
  }, [rows]);

  // products in the current drill-down, then filtered by the search box
  const scoped = useMemo(() => {
    if (!rows) return [];
    let list = rows;
    if (cat) list = list.filter((r) => r.category_id === cat.id);
    if (col) {
      list = col.unassigned
        ? list.filter((r) => !r.collection_id)
        : list.filter((r) => r.collection_id === col.id);
    }
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((r) =>
      [r.name, r.slug, r.ref_code, r.product_type, r.materials, r.stone].some((v) =>
        (v || "").toLowerCase().includes(term)
      )
    );
  }, [rows, cat, col, q]);

  const catCollections = useMemo(() => {
    if (!cat) return [];
    const mine = cols.filter((c) => c.category_id === cat.id);
    const loose = (rows || []).filter((r) => r.category_id === cat.id && !r.collection_id).length;
    return loose
      ? [...mine, { id: "__none", slug: "__none", name: "Not in a collection", unassigned: true, count: loose }]
      : mine;
  }, [cat, cols, rows]);

  function startEdit(row) {
    setEditing(row.id);
    setForm({ ...empty, ...row });
  }

  function startCreate() {
    setEditing("new");
    setForm({ ...empty, category_id: cat?.id, collection_id: col?.unassigned ? null : col?.id });
  }

  function numOrNull(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function save(e) {
    e.preventDefault();
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      materials: form.materials || null,
      metal: form.metal || null,
      product_type: form.product_type || null,
      occasion: form.occasion || null,
      carat: form.carat || null,
      origin: form.origin || null,
      story: form.story || null,
      ref_code: form.ref_code || null,
      stone: form.stone || null,
      shape: form.shape || null,
      stone_ct: numOrNull(form.stone_ct),
      diamond_ct: numOrNull(form.diamond_ct),
      net_g: numOrNull(form.net_g),
      gross_g: numOrNull(form.gross_g),
      status: form.status,
      price_on_enquiry: !!form.price_on_enquiry,
      has_visualiser: !!form.has_visualiser,
      is_gemstone: !!form.is_gemstone,
      category_id: form.category_id ?? cat?.id ?? null,
      collection_id: form.collection_id ?? null,
    };

    let err;
    if (editing === "new") {
      ({ error: err } = await supabase.from("products").insert(payload));
    } else {
      ({ error: err } = await supabase.from("products").update(payload).eq("id", editing));
    }
    if (err) { show(err.message, false); return; }

    await supabase.from("audit_logs").insert({
      action: editing === "new" ? "product.create" : "product.update",
      entity_type: "products",
      entity_id: payload.slug,
      meta: { name: payload.name },
    });
    show(editing === "new" ? "Product created." : "Product saved.");
    setEditing(null);
    load();
  }

  async function setStatus(id, status) {
    const { error: err } = await supabase.from("products").update({ status }).eq("id", id);
    if (err) show(err.message, false);
    else { show(`Marked ${status}.`); load(); }
  }

  async function remove(row) {
    if (!confirm(`Archive "${row.name}"? This hides it from the storefront; it stays in the catalog as archived.`)) return;
    await setStatus(row.id, "archived");
  }

  async function runImport() {
    if (!confirm("Import the catalog from the live site? Products and collections are matched by slug and overwritten with what the site currently has.")) return;
    setBusy("Reading the site…");
    try {
      const c = await importFromSite(setBusy);
      await supabase.from("audit_logs").insert({
        action: "catalog.import", entity_type: "products", entity_id: "site", meta: c,
      });
      show(`Imported ${c.products} products, ${c.collections} collections, ${c.images} images.`);
      load();
    } catch (err) {
      show(err.message || String(err), false);
    } finally {
      setBusy("");
    }
  }

  async function runExport() {
    setBusy("Building files…");
    try {
      const out = await buildExport();
      downloadFile("fine-jewellery-data.js", out["fine-jewellery/data.js"]);
      downloadFile("high-jewellery-data.js", out["high-jewellery/data.js"]);
      show(`Exported ${out.counts.fine} Fine and ${out.counts.high} High Jewellery pieces. Replace the data.js files and deploy.`);
    } catch (err) {
      show(err.message || String(err), false);
    } finally {
      setBusy("");
    }
  }

  const loading = cats === null || rows === null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Catalog</h1>
          <p>
            {col ? `${col.name} — ${scoped.length} ${scoped.length === 1 ? "piece" : "pieces"}`
              : cat ? "Choose a collection."
              : "Choose a category."}
          </p>
        </div>
        <div className="actions">
          {col ? <Search value={q} onChange={setQ} placeholder="Search products…" /> : null}
          <button type="button" className="btn btn--ghost" onClick={runImport} disabled={!!busy}>
            <Icon name="refresh" /> {busy || "Import from site"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={runExport} disabled={!!busy}>
            <Icon name="download" /> Export data.js
          </button>
          {col ? (
            <button type="button" className="btn" onClick={startCreate}>
              <Icon name="plus" /> Add product
            </button>
          ) : null}
        </div>
      </header>

      {(cat || col) ? (
        <nav className="crumbs">
          <button type="button" className="linkish" onClick={() => { setCat(null); setCol(null); setQ(""); }}>
            All categories
          </button>
          {cat ? (
            <>
              <span aria-hidden="true">/</span>
              {col ? (
                <button type="button" className="linkish" onClick={() => { setCol(null); setQ(""); }}>{cat.name}</button>
              ) : (
                <span className="crumbs-here">{cat.name}</span>
              )}
            </>
          ) : null}
          {col ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="crumbs-here">{col.name}</span>
            </>
          ) : null}
        </nav>
      ) : null}

      {error ? <p className="err">{error}</p> : null}

      {editing ? (
        <Panel title={editing === "new" ? "New product" : `Edit — ${form.name || form.slug}`}>
          <form className="form-grid" onSubmit={save}>
            <label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>SKU / Ref<input value={form.ref_code || ""} onChange={(e) => setForm({ ...form, ref_code: e.target.value })} /></label>
            <label>Type<input value={form.product_type || ""} onChange={(e) => setForm({ ...form, product_type: e.target.value })} /></label>
            <label>Collection
              <select
                value={form.collection_id || ""}
                onChange={(e) => setForm({ ...form, collection_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {cols.filter((c) => !cat || c.category_id === cat.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>Metal<input value={form.metal || ""} onChange={(e) => setForm({ ...form, metal: e.target.value })} /></label>
            <label>Stone<input value={form.stone || ""} onChange={(e) => setForm({ ...form, stone: e.target.value })} /></label>
            <label>Shape<input value={form.shape || ""} onChange={(e) => setForm({ ...form, shape: e.target.value })} /></label>
            <label>Stone ct<input type="number" step="0.001" value={form.stone_ct ?? ""} onChange={(e) => setForm({ ...form, stone_ct: e.target.value })} /></label>
            <label>Diamond ct<input type="number" step="0.001" value={form.diamond_ct ?? ""} onChange={(e) => setForm({ ...form, diamond_ct: e.target.value })} /></label>
            <label>Net g<input type="number" step="0.001" value={form.net_g ?? ""} onChange={(e) => setForm({ ...form, net_g: e.target.value })} /></label>
            <label>Gross g<input type="number" step="0.001" value={form.gross_g ?? ""} onChange={(e) => setForm({ ...form, gross_g: e.target.value })} /></label>
            <label>Materials<input value={form.materials || ""} onChange={(e) => setForm({ ...form, materials: e.target.value })} /></label>
            <label>Occasion<input value={form.occasion || ""} onChange={(e) => setForm({ ...form, occasion: e.target.value })} /></label>
            <label>Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={!!form.price_on_enquiry} onChange={(e) => setForm({ ...form, price_on_enquiry: e.target.checked })} /> Price on enquiry</label>
            <label className="check"><input type="checkbox" checked={!!form.has_visualiser} onChange={(e) => setForm({ ...form, has_visualiser: e.target.checked })} /> 360° visualiser</label>
            <label className="check"><input type="checkbox" checked={!!form.is_gemstone} onChange={(e) => setForm({ ...form, is_gemstone: e.target.checked })} /> Gemstone</label>
            <label className="full">Story<textarea rows={4} value={form.story || ""} onChange={(e) => setForm({ ...form, story: e.target.value })} /></label>
            <div className="form-actions full">
              <button type="submit" className="btn">Save</button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </Panel>
      ) : null}

      {loading ? (
        <Panel><Skeleton rows={5} /></Panel>
      ) : !cat ? (
        /* level 1 — categories */
        <div className="tiles">
          {cats.map((c) => (
            <button type="button" key={c.id} className="tile" onClick={() => { setCat(c); setCol(null); }}>
              <span className="tile-icon"><Icon name="catalog" /></span>
              <span className="tile-body">
                <span className="tile-name">{c.name}</span>
                <span className="tile-sub">
                  {cols.filter((l) => l.category_id === c.id).length} collections ·{" "}
                  {counts.byCat[c.id] || 0} pieces
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : !col ? (
        /* level 2 — collections in the chosen category */
        !catCollections.length ? (
          <Panel><Empty icon="catalog" title="No collections here">
            Import from the site, or add a collection in Supabase.
          </Empty></Panel>
        ) : (
          <div className="tiles">
            {catCollections.map((c) => (
              <button type="button" key={c.id} className="tile" onClick={() => { setCol(c); setQ(""); }}>
                <span className="tile-icon"><Icon name="catalog" /></span>
                <span className="tile-body">
                  <span className="tile-name">{c.name}</span>
                  <span className="tile-sub">
                    {(c.unassigned ? c.count : counts.byCol[c.id]) || 0} pieces
                  </span>
                </span>
              </button>
            ))}
          </div>
        )
      ) : !scoped.length ? (
        /* level 3 — products */
        <Panel><Empty icon="catalog" title={q ? "No products match" : "No products in this collection"}>
          {q ? "Try a different search." : "Add a product, or import from the site."}
        </Empty></Panel>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Stone</th>
                <th>Status</th>
                <th>360°</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-strong">{r.name}</div>
                    <div className="cell-sub">{r.ref_code || r.slug}</div>
                  </td>
                  <td>{r.product_type || "—"}</td>
                  <td>{r.stone || r.materials || "—"}</td>
                  <td><Pill value={r.status} /></td>
                  <td>{r.has_visualiser ? <Icon name="check" width="16" height="16" /> : "—"}</td>
                  <td className="actions">
                    <button type="button" className="linkish" onClick={() => startEdit(r)}>Edit</button>
                    {r.status !== "published" ? (
                      <button type="button" className="linkish" onClick={() => setStatus(r.id, "published")}>Publish</button>
                    ) : (
                      <button type="button" className="linkish" onClick={() => setStatus(r.id, "draft")}>Unpublish</button>
                    )}
                    {r.status !== "archived" ? (
                      <button type="button" className="linkish" onClick={() => remove(r)}>Archive</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
