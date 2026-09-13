import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Seo() {
  const [globals, setGlobals] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [g, p] = await Promise.all([
      supabase.from("seo_globals").select("*").eq("id", 1).single(),
      supabase.from("products").select("id, name, slug, seo_title, seo_description, indexable, status").order("name"),
    ]);
    if (g.error) setError(g.error.message);
    else setGlobals(g.data);
    if (!p.error) setProducts(p.data || []);
  }

  useEffect(() => { load(); }, []);

  async function saveGlobals(e) {
    e.preventDefault();
    const { error: err } = await supabase.from("seo_globals").update({
      site_name: globals.site_name,
      title_template: globals.title_template,
      default_description: globals.default_description,
      robots_txt: globals.robots_txt,
    }).eq("id", 1);
    if (err) setError(err.message);
    else setMsg("SEO globals saved.");
  }

  async function saveProduct(row) {
    await supabase.from("products").update({
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      indexable: row.indexable,
    }).eq("id", row.id);
    setMsg(`SEO updated for ${row.name}`);
  }

  if (!globals) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-head">
        <h1>SEO</h1>
        <p>Globals, robots.txt, and per-product meta.</p>
      </header>
      {error ? <p className="err">{error}</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}

      <form className="panel form-grid" onSubmit={saveGlobals}>
        <h2>Globals</h2>
        <label>Site name<input value={globals.site_name || ""} onChange={(e) => setGlobals({ ...globals, site_name: e.target.value })} /></label>
        <label>Title template<input value={globals.title_template || ""} onChange={(e) => setGlobals({ ...globals, title_template: e.target.value })} /></label>
        <label className="full">Default description<textarea rows={3} value={globals.default_description || ""} onChange={(e) => setGlobals({ ...globals, default_description: e.target.value })} /></label>
        <label className="full">robots.txt<textarea rows={5} value={globals.robots_txt || ""} onChange={(e) => setGlobals({ ...globals, robots_txt: e.target.value })} /></label>
        <div className="form-actions full"><button className="btn" type="submit">Save globals</button></div>
      </form>

      <div className="stack">
        {products.map((p) => (
          <div key={p.id} className="panel form-grid">
            <h2>{p.name} <span className="muted">/{p.slug}</span></h2>
            <label>SEO title<input value={p.seo_title || ""} onChange={(e) => setProducts(products.map((x) => x.id === p.id ? { ...x, seo_title: e.target.value } : x))} /></label>
            <label className="check"><input type="checkbox" checked={!!p.indexable} onChange={(e) => setProducts(products.map((x) => x.id === p.id ? { ...x, indexable: e.target.checked } : x))} /> Indexable</label>
            <label className="full">SEO description<textarea rows={2} value={p.seo_description || ""} onChange={(e) => setProducts(products.map((x) => x.id === p.id ? { ...x, seo_description: e.target.value } : x))} /></label>
            <div className="form-actions full">
              <button type="button" className="btn btn--ghost" onClick={() => saveProduct(p)}>Save</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
