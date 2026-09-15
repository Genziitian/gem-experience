import { useState } from "react";
import { Empty, Panel, Pill } from "./ui.jsx";
import { relativeTime } from "../lib/format.js";

/* Shared card feed behind Forms and Quotations — both browse
   form_submissions, just with a different filter and summary line. */
export default function SubmissionFeed({ rows, onStatus, onNote, summary, emptyLabel }) {
  const [active, setActive] = useState(null);
  const [note, setNote] = useState("");

  async function submitNote(e) {
    e.preventDefault();
    if (!active || !note.trim()) return;
    await onNote(active, note.trim());
    setNote("");
    setActive(null);
  }

  if (!rows.length) {
    return <Panel><Empty icon="forms" title={emptyLabel || "Nothing here yet"} /></Panel>;
  }

  return (
    <div className="stack">
      {rows.map((r) => (
        <article key={r.id} className="panel">
          <div className="row">
            <div>
              <div className="row" style={{ gap: 8 }}>
                <Pill value={r.form_type} tone="info" />
                <Pill value={r.status} />
              </div>
              {summary ? <div style={{ marginTop: 10 }}>{summary(r)}</div> : null}
              <div className="cell-sub" style={{ marginTop: 4 }}>{relativeTime(r.created_at)}</div>
            </div>
            <div className="actions">
              {r.status !== "in_progress" ? (
                <button type="button" className="linkish" onClick={() => onStatus(r, "in_progress")}>In progress</button>
              ) : null}
              {r.status !== "closed" ? (
                <button type="button" className="linkish" onClick={() => onStatus(r, "closed")}>Close</button>
              ) : null}
              <button type="button" className="linkish" onClick={() => setActive(r)}>Note</button>
            </div>
          </div>
          <pre className="payload">{JSON.stringify(r.payload, null, 2)}</pre>
        </article>
      ))}

      {active ? (
        <form className="panel" onSubmit={submitNote}>
          <h2>Note on {active.form_type}</h2>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} required autoFocus />
          <div className="form-actions">
            <button className="btn" type="submit">Save note</button>
            <button className="btn btn--ghost" type="button" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
