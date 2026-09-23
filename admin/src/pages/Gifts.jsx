/* Gift requests.
 *
 * These are ordinary quotation submissions that arrived carrying a gift note:
 * somebody filled in the personalisation panel on /gifts/ before checking out.
 * They need their own screen because they carry an instruction nobody else's
 * enquiry does — a card has to be written by hand, in the sender's words,
 * before the piece can be boxed. Buried in the general Quotations list that
 * instruction is one collapsed payload away from being missed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Panel, Empty, Skeleton, Pill, Search, Icon, Toast, Segment } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { relativeTime, formatDateTime } from "../lib/format.js";

const FILTERS = [
  { value: "active", label: "Open" },
  { value: "new", label: "New" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

/* The card as the client saw it while writing it, so an adviser copying it out
   by hand is reading the same object the sender was looking at. */
function GiftCard({ gift }) {
  return (
    <div className="gcard">
      <span className="gcard-mark">Gem Experience</span>
      <p className="gcard-to">{gift.to ? `For ${gift.to}` : "For —"}</p>
      <p className="gcard-msg">{gift.message || <em>No message written.</em>}</p>
      <p className="gcard-from">{gift.from ? `— ${gift.from}` : ""}</p>
    </div>
  );
}

export default function Gifts() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");
  const [note, setNote] = useState({});
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      let query = supabase
        .from("form_submissions")
        .select("*")
        /* Anything carrying a gift block, whatever form it came in on — the
           storefront sends these as quotations today, and filtering on the
           payload rather than the form type means a new entry point does not
           silently stop appearing here. */
        .not("payload->gift", "is", null)
        .order("created_at", { ascending: false });

      if (filter === "active") query = query.in("status", ["new", "in_progress"]);
      else if (filter === "new") query = query.eq("status", "new");
      else if (filter === "closed") query = query.eq("status", "closed");

      const { data, error: err } = await query;
      if (err) throw err;
      setRows(data || []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load gift requests.");
      setRows([]);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const p = r.payload || {};
      const g = p.gift || {};
      return [p.name, p.email, p.phone, g.to, g.from, g.message, p.order_number]
        .some((v) => (v || "").toLowerCase().includes(t));
    });
  }, [rows, q]);

  async function setStatus(row, status) {
    const { error: err } = await supabase
      .from("form_submissions").update({ status }).eq("id", row.id);
    if (err) { show(err.message, false); return; }
    await supabase.from("form_activity")
      .insert({ submission_id: row.id, action: "status", note: `Gift request marked ${status}` });
    show(`Marked ${status}.`);
    load();
  }

  async function addNote(row) {
    const text = (note[row.id] || "").trim();
    if (!text) return;
    const { error: err } = await supabase.from("form_activity")
      .insert({ submission_id: row.id, action: "note", note: text });
    if (err) { show(err.message, false); return; }
    setNote((n) => ({ ...n, [row.id]: "" }));
    show("Note saved.");
  }

  function copyCard(g) {
    const lines = [
      g.to ? `For ${g.to}` : null,
      g.message || null,
      g.from ? `— ${g.from}` : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(lines)
      .then(() => show("Card text copied."))
      .catch(() => show("Could not copy.", false));
  }

  const letters = (rows || []).filter((r) => r.payload?.gift?.letter).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Gift requests</h1>
          <p>Enquiries that arrived with a card to be written and a box to be prepared.</p>
        </div>
        <div className="panel-actions">
          <Search value={q} onChange={setQ} placeholder="Search name, recipient or message…" />
          <Segment value={filter} onChange={setFilter} options={FILTERS} />
        </div>
      </header>

      <div className="role-cards">
        <div className="role-card">
          <span className="role-count">{rows?.length ?? "—"}</span>
          <span className="role-body">
            <span className="role-name">Gift requests</span>
            <span className="role-sub">In the current filter</span>
          </span>
        </div>
        <div className="role-card">
          <span className="role-count role-count--warn">{letters}</span>
          <span className="role-body">
            <span className="role-name">With a workshop letter</span>
            <span className="role-sub">The stone's story is to be enclosed too</span>
          </span>
        </div>
      </div>

      {error ? <p className="err">{error}</p> : null}

      {rows === null ? (
        <Panel><Skeleton rows={5} /></Panel>
      ) : !shown.length ? (
        <Panel>
          <Empty icon="inbox" title={q ? "Nothing matches" : "No gift requests yet"}>
            A request appears here when somebody fills in the personalisation panel
            on the Gifts page and then checks out.
          </Empty>
        </Panel>
      ) : (
        <div className="stack">
          {shown.map((r) => {
            const p = r.payload || {};
            const g = p.gift || {};
            return (
              <article className="panel gift-req" key={r.id}>
                <div className="gift-req-main">
                  <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                    <Pill value={r.status} />
                    {g.occasion ? <Pill value={g.occasion} tone="info" /> : null}
                    {g.letter ? <Pill value="workshop letter" tone="warn" /> : null}
                    {p.order_number ? <span className="cell-sub">{p.order_number}</span> : null}
                  </div>

                  <h3 className="gift-req-title">
                    {g.to ? `A gift for ${g.to}` : "A gift"}
                    {g.from ? <span className="cell-sub"> from {g.from}</span> : null}
                  </h3>

                  <ul className="gift-req-facts">
                    <li><strong>Ordered by</strong><span>{p.name || "—"}</span></li>
                    <li><strong>Email</strong><span>{p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : "—"}</span></li>
                    <li><strong>Phone</strong><span>{p.phone || "—"}</span></li>
                    <li><strong>Occasion</strong><span>{g.occasion || "Not said"}</span></li>
                    <li><strong>Workshop letter</strong><span>{g.letter ? "Yes — include the stone's story" : "No"}</span></li>
                    <li><strong>Received</strong><span title={formatDateTime(r.created_at)}>{relativeTime(r.created_at)}</span></li>
                  </ul>

                  {Array.isArray(p.pieces) && p.pieces.length ? (
                    <p className="gift-req-pieces">
                      <strong>Pieces</strong> {p.pieces.join(" · ")}
                    </p>
                  ) : null}

                  {p.notes ? <p className="gift-req-notes"><strong>Their notes</strong> {p.notes}</p> : null}

                  <div className="actions" style={{ marginTop: 12 }}>
                    {r.status !== "in_progress" ? (
                      <button type="button" className="linkish" onClick={() => setStatus(r, "in_progress")}>In progress</button>
                    ) : null}
                    {r.status !== "closed" ? (
                      <button type="button" className="linkish" onClick={() => setStatus(r, "closed")}>Close</button>
                    ) : null}
                    <button type="button" className="linkish" onClick={() => copyCard(g)}>Copy card text</button>
                  </div>

                  <form className="gift-req-note" onSubmit={(e) => { e.preventDefault(); addNote(r); }}>
                    <input value={note[r.id] || ""} placeholder="Add a note for the workshop…"
                           onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))} />
                    <button type="submit" className="btn btn--ghost btn--sm">
                      <Icon name="check" width="14" height="14" /> Save
                    </button>
                  </form>
                </div>

                <aside className="gift-req-card" aria-label="The card to be written">
                  <GiftCard gift={g} />
                  <p className="gcard-cap">To be written by hand</p>
                </aside>
              </article>
            );
          })}
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
