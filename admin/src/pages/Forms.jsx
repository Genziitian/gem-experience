import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import SubmissionFeed from "../components/SubmissionFeed.jsx";
import { Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";

export default function Forms() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    let q = supabase.from("form_submissions").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else { setRows(data || []); setError(""); }
  }

  useEffect(() => { load(); }, [filter]);

  async function setStatus(row, status) {
    const { error: err } = await supabase.from("form_submissions").update({ status }).eq("id", row.id);
    if (err) { show(err.message, false); return; }
    await supabase.from("form_activity").insert({ submission_id: row.id, action: "status", note: `Marked ${status}` });
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

      {rows === null ? (
        <div className="panel"><Skeleton rows={4} /></div>
      ) : (
        <SubmissionFeed
          rows={rows}
          onStatus={setStatus}
          onNote={addNote}
          emptyLabel="No submissions in this view."
          summary={(r) => (
            <strong className="cell-strong">
              {r.payload?.name || r.payload?.email || "Submission"}
            </strong>
          )}
        />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
