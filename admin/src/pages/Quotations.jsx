import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(null);

  async function load() {
    let q = supabase
      .from("form_submissions")
      .select("*")
      .eq("form_type", "quotation")
      .order("created_at", { ascending: false });
    if (filter === "active") q = q.in("status", ["new", "in_progress"]);
    if (filter === "new") q = q.eq("status", "new");
    if (filter === "closed") q = q.eq("status", "closed");
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, [filter]);

  async function setStatus(row, status) {
    await supabase.from("form_submissions").update({ status }).eq("id", row.id);
    await supabase.from("form_activity").insert({
      submission_id: row.id,
      action: "status",
      note: `Quotation marked ${status}`,
    });
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!active || !note.trim()) return;
    await supabase.from("form_activity").insert({
      submission_id: active.id,
      action: "note",
      note: note.trim(),
    });
    setNote("");
    setActive(null);
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <h1>Quotations</h1>
          <p>Active quotation requests from the storefront and checkout.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Active (new + in progress)</option>
          <option value="new">New only</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </header>
      {error ? <p className="err">{error}</p> : null}
      {!rows.length && !error ? <p className="muted">No quotations in this view.</p> : null}

      <div className="stack">
        {rows.map((r) => {
          const p = r.payload || {};
          return (
            <article key={r.id} className="panel">
              <div className="row">
                <div>
                  <span className="pill">quotation</span>{" "}
                  <span className={`pill pill--${r.status}`}>{r.status}</span>
                  <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
                  <strong style={{ display: "block", marginTop: 10 }}>
                    {p.piece || p.ref || (p.pieces && p.pieces.join(", ")) || "General quotation"}
                  </strong>
                  <div className="muted">{p.name} · {p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                </div>
                <div className="actions">
                  <button type="button" className="linkish" onClick={() => setStatus(r, "in_progress")}>In progress</button>
                  <button type="button" className="linkish" onClick={() => setStatus(r, "closed")}>Close</button>
                  <button type="button" className="linkish" onClick={() => setActive(r)}>Note</button>
                </div>
              </div>
              <pre className="payload">{JSON.stringify(p, null, 2)}</pre>
            </article>
          );
        })}
      </div>

      {active ? (
        <form className="panel" onSubmit={addNote}>
          <h2>Note on quotation</h2>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} required />
          <div className="form-actions">
            <button className="btn" type="submit">Save note</button>
            <button className="btn btn--ghost" type="button" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
