import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

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
  status: "draft",
  price_on_enquiry: true,
  has_visualiser: false,
  is_gemstone: false,
};

export default function Catalog() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data, error: err } = await supabase
      .from("products")
      .select("id, slug, name, status, product_type, materials, has_visualiser, price_on_enquiry, ref_code, metal, occasion, carat, origin, story, is_gemstone")
      .order("featured_sort", { ascending: true });
    if (err) setError(err.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row) {
    setEditing(row.id);
    setForm({ ...empty, ...row });
    setMsg("");
    setError("");
  }

  function startCreate() {
    setEditing("new");
    setForm(empty);
    setMsg("");
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setMsg("");
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
      status: form.status,
      price_on_enquiry: !!form.price_on_enquiry,
      has_visualiser: !!form.has_visualiser,
      is_gemstone: !!form.is_gemstone,
    };

    let err;
    if (editing === "new") {
      ({ error: err } = await supabase.from("products").insert(payload));
    } else {
      ({ error: err } = await supabase.from("products").update(payload).eq("id", editing));
    }
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.from("audit_logs").insert({
      action: editing === "new" ? "product.create" : "product.update",
      entity_type: "products",
      entity_id: payload.slug,
      meta: { name: payload.name },
    });
    setMsg("Saved.");
    setEditing(null);
    load();
  }

  async function setStatus(id, status) {
    await supabase.from("products").update({ status }).eq("id", id);
    load();
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <h1>Catalog</h1>
          <p>Products, publish state, enquiry vs priced, 360° flag.</p>
        </div>
        <button type="button" className="btn" onClick={startCreate}>Add product</button>
      </header>

      {error ? <p className="err">{error}</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}

      {editing ? (
        <form className="panel form-grid" onSubmit={save}>
          <h2>{editing === "new" ? "New product" : "Edit product"}</h2>
          <label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Materials<input value={form.materials || ""} onChange={(e) => setForm({ ...form, materials: e.target.value })} /></label>
          <label>Metal<input value={form.metal || ""} onChange={(e) => setForm({ ...form, metal: e.target.value })} /></label>
          <label>Type<input value={form.product_type || ""} onChange={(e) => setForm({ ...form, product_type: e.target.value })} /></label>
          <label>Occasion<input value={form.occasion || ""} onChange={(e) => setForm({ ...form, occasion: e.target.value })} /></label>
          <label>Ref<input value={form.ref_code || ""} onChange={(e) => setForm({ ...form, ref_code: e.target.value })} /></label>
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
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>360°</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  <div className="muted">{r.slug}</div>
                </td>
                <td>{r.product_type || "—"}</td>
                <td><span className={`pill pill--${r.status}`}>{r.status}</span></td>
                <td>{r.has_visualiser ? "Yes" : "—"}</td>
                <td className="actions">
                  <button type="button" className="linkish" onClick={() => startEdit(r)}>Edit</button>
                  {r.status !== "published" ? (
                    <button type="button" className="linkish" onClick={() => setStatus(r.id, "published")}>Publish</button>
                  ) : (
                    <button type="button" className="linkish" onClick={() => setStatus(r.id, "draft")}>Unpublish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
