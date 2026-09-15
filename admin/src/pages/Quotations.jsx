import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import SubmissionFeed from "../components/SubmissionFeed.jsx";
import { Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";

export default function Quotations() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    let q = supabase.from("form_submissions").select("*").eq("form_type", "quotation").order("created_at", { ascending: false });
    if (filter === "active") q = q.in("status", ["new", "in_progress"]);
    if (filter === "new") q = q.eq("status", "new");
    if (filter === "closed") q = q.eq("status", "closed");
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else { setRows(data || []); setError(""); }
  }

  useEffect(() => { load(); }, [filter]);

  async function setStatus(row, status) {
    const { error: err } = await supabase.from("form_submissions").update({ status }).eq("id", row.id);
    if (err) { show(err.message, false); return; }
    await supabase.from("form_activity").insert({ submission_id: row.id, action: "status", note: `Quotation marked ${status}` });
    show(`Marked ${status}.`);
    load();
  }

  async function addNote(row, text) {
    const { error: err } = await supabase.from("form_activity").insert({ submission_id: row.id, action: "note", note: text });
    if (err) show(err.message, false);
    else show("Note saved.");
  }

  return (
    <div className="page">
      <header className="page-head">
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

      {rows === null ? (
        <div className="panel"><Skeleton rows={4} /></div>
      ) : (
        <SubmissionFeed
          rows={rows}
          onStatus={setStatus}
          onNote={addNote}
          emptyLabel="No quotations in this view."
          summary={(r) => {
            const p = r.payload || {};
            return (
              <>
                <strong className="cell-strong">
                  {p.piece || p.ref || (p.pieces && p.pieces.join(", ")) || "General quotation"}
                </strong>
                <div className="cell-sub">{p.name} · {p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
              </>
            );
          }}
        />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
