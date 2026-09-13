import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Forms() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(null);

  async function load() {
    let q = supabase
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
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
      note: `Marked ${status}`,
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
          <h1>Forms</h1>
          <p>Appointment, contact, quotation, newsletter inbox.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
      </header>
      {error ? <p className="err">{error}</p> : null}
      {!rows.length && !error ? <p className="muted">No submissions yet. Public forms will land here.</p> : null}

      <div className="stack">
        {rows.map((r) => (
          <article key={r.id} className="panel">
            <div className="row">
              <div>
                <span className="pill">{r.form_type}</span>{" "}
                <span className={`pill pill--${r.status}`}>{r.status}</span>
                <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="actions">
                <button type="button" className="linkish" onClick={() => setStatus(r, "in_progress")}>In progress</button>
                <button type="button" className="linkish" onClick={() => setStatus(r, "closed")}>Close</button>
                <button type="button" className="linkish" onClick={() => setActive(r)}>Note</button>
              </div>
            </div>
            <pre className="payload">{JSON.stringify(r.payload, null, 2)}</pre>
          </article>
        ))}
      </div>

      {active ? (
        <form className="panel" onSubmit={addNote}>
          <h2>Note on {active.form_type}</h2>
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
