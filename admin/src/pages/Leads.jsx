/* Leads.
 *
 * Every storefront form — appointment, quotation, checkout, contact — is a
 * lead: somebody waiting to hear from us. This screen is where they are
 * owned and worked. A super admin or a manager assigns each one to an
 * adviser; the adviser moves it along and writes notes; the timeline shows
 * who did what, and when.
 *
 * The rules live in the database (migration 20261009020000_leads.sql): who may
 * assign, that a note's author is whoever wrote it, and that every assignment
 * and status change is logged. This screen only shows them, so a change made
 * from the Supabase dashboard reads the same here.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Empty, Icon, Pill, Search, Segment, Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { formatDateTime, relativeTime } from "../lib/format.js";

const STATUS = [
  { value: "open", label: "Open" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const STATUS_LABEL = { new: "New", in_progress: "In progress", closed: "Closed" };

/* A checkout files a quotation with source "checkout"; staff call it an order. */
export function leadKind(row) {
  if (row.form_type === "quotation" && row.payload?.source === "checkout") return "checkout";
  return row.form_type;
}

const KIND_LABEL = {
  appointment: "Appointment", quotation: "Quotation", checkout: "Checkout",
  contact: "Contact", newsletter: "Newsletter",
};

/* What each payload key is called out loud, in the order an adviser reads
   them. Keys not listed still show, after these, so nothing a form sends is
   hidden. */
const FIELDS = [
  ["order_number", "Order"], ["pieces", "Pieces"], ["piece", "Piece"], ["ref", "Reference"],
  ["category", "Category"], ["date", "Date"], ["time", "Time"], ["location", "Location"],
  ["subject", "Subject"], ["message", "Message"], ["requirements", "Requirements"],
  ["notes", "Notes"], ["country", "Country"], ["source", "Source"],
];
const SKIP = new Set(["name", "email", "phone", "gift"]);

function initial(s) {
  return (String(s || "").trim().charAt(0) || "·").toUpperCase();
}

function personName(p) {
  return p ? p.full_name || p.email : "";
}

function Who({ person, size = "sm" }) {
  if (!person) return <span className="muted">Unassigned</span>;
  return (
    <span className="who">
      <span className={`who-dot who-dot--${size}`} aria-hidden="true">{initial(personName(person))}</span>
      <span className="who-name">{personName(person)}</span>
    </span>
  );
}

function fieldValue(v) {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function digits(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

/* ------------------------------------------------------------------ drawer */

function LeadDrawer({ lead, staff, me, canAssign, onClose, onChanged, show }) {
  const [activity, setActivity] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = lead.payload || {};
  const byId = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  const loadActivity = useCallback(async () => {
    const { data } = await supabase
      .from("form_activity")
      .select("id, admin_id, action, note, created_at")
      .eq("submission_id", lead.id)
      .order("created_at", { ascending: false });
    setActivity(data || []);
  }, [lead.id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function update(patch, done) {
    setBusy(true);
    const { error } = await supabase.from("form_submissions").update(patch).eq("id", lead.id);
    setBusy(false);
    if (error) { show(error.message, false); return; }
    show(done);
    await onChanged();
    loadActivity();
  }

  async function addNote(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.from("form_activity").insert({ submission_id: lead.id, action: "note", note: text });
    setBusy(false);
    if (error) { show(error.message, false); return; }
    setNote("");
    show("Note added.");
    loadActivity();
    onChanged();
  }

  const extra = Object.keys(p).filter((k) => !SKIP.has(k) && !FIELDS.some(([f]) => f === k));
  const rows = [...FIELDS.filter(([k]) => p[k] != null && p[k] !== "" && !(Array.isArray(p[k]) && !p[k].length)), ...extra.map((k) => [k, k.replace(/_/g, " ")])];
  const phone = digits(p.phone);
  const kind = leadKind(lead);

  return (
    <div className="drawer-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Lead from ${p.name || p.email || "a client"}`}>
        <header className="drawer-head">
          <div className="drawer-title">
            <span className="who-dot who-dot--lg" aria-hidden="true">{initial(p.name || p.email)}</span>
            <div>
              <h2>{p.name || p.email || "Unnamed lead"}</h2>
              <div className="row" style={{ gap: 6, justifyContent: "flex-start" }}>
                <Pill value={KIND_LABEL[kind] || kind} tone="info" />
                <Pill value={lead.status} />
                <span className="cell-sub">Received {formatDateTime(lead.created_at)}</span>
              </div>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>

        <div className="drawer-body">
          <section className="lead-contact">
            {p.email ? <a className="btn btn--ghost btn--sm" href={`mailto:${p.email}`}><Icon name="inbox" />{p.email}</a> : null}
            {phone ? <a className="btn btn--ghost btn--sm" href={`tel:${phone}`}>Call {p.phone}</a> : null}
            {phone ? (
              <a className="btn btn--ghost btn--sm" href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>
            ) : null}
          </section>

          <section className="lead-grid">
            <label className="lead-control">
              <span>Assigned to</span>
              <select
                value={lead.assigned_to || ""}
                disabled={!canAssign || busy}
                title={canAssign ? "" : "Only a super admin or a manager can assign leads."}
                onChange={(e) => {
                  const id = e.target.value || null;
                  update({ assigned_to: id }, id ? `Assigned to ${personName(byId[id])}.` : "Unassigned.");
                }}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{personName(s)}{s.id === me?.id ? " (you)" : ""}</option>
                ))}
              </select>
              {lead.assigned_at ? <small className="cell-sub">since {relativeTime(lead.assigned_at)}</small> : null}
            </label>

            <div className="lead-control">
              <span>Status</span>
              <Segment
                value={lead.status}
                onChange={(s) => { if (s !== lead.status) update({ status: s }, `Marked ${STATUS_LABEL[s].toLowerCase()}.`); }}
                options={[{ value: "new", label: "New" }, { value: "in_progress", label: "In progress" }, { value: "closed", label: "Closed" }]}
              />
            </div>
          </section>

          <section>
            <h3 className="drawer-sub">Details</h3>
            {rows.length ? (
              <dl className="lead-fields">
                {rows.map(([k, label]) => (
                  <div key={k} className={["message", "requirements", "notes"].includes(k) ? "is-wide" : ""}>
                    <dt>{label}</dt>
                    <dd>{fieldValue(p[k])}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="muted">No details beyond contact.</p>}
          </section>

          {p.gift && (p.gift.to || p.gift.message) ? (
            <section>
              <h3 className="drawer-sub">Gift card to write</h3>
              <div className="gcard">
                <span className="gcard-mark">{p.gift.occasion || "Gem Experience"}</span>
                <p className="gcard-to">{p.gift.to ? `For ${p.gift.to}` : "For —"}</p>
                <p className="gcard-msg">{p.gift.message || <em>No message written.</em>}</p>
                <p className="gcard-from">{p.gift.from ? `— ${p.gift.from}` : ""}</p>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="drawer-sub">Notes &amp; timeline</h3>
            <form className="lead-note" onSubmit={addNote}>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Called the client, sent the price, booked a viewing…"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(e); }}
              />
              <div className="form-actions">
                <button className="btn btn--sm" type="submit" disabled={busy || !note.trim()}>Add note</button>
                <span className="cell-sub">⌘ + Enter</span>
              </div>
            </form>

            {activity === null ? <Skeleton rows={3} /> : (
              <ol className="timeline">
                {activity.map((a) => (
                  <li key={a.id} className={`timeline-item timeline-item--${a.action}`}>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div>
                      <div className="timeline-meta">
                        <strong>{a.admin_id ? personName(byId[a.admin_id]) || "Staff" : "System"}</strong>
                        <span className="cell-sub">{a.action === "note" ? "added a note" : ""} · {relativeTime(a.created_at)}</span>
                      </div>
                      <p className={a.action === "note" ? "timeline-note" : "timeline-event"}>{a.note}</p>
                    </div>
                  </li>
                ))}
                <li className="timeline-item timeline-item--created">
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <div className="timeline-meta"><strong>{p.name || "Client"}</strong><span className="cell-sub"> · {relativeTime(lead.created_at)}</span></div>
                    <p className="timeline-event">Sent a {String(KIND_LABEL[kind] || kind).toLowerCase()} {kind === "contact" ? "message" : "request"} from the website</p>
                  </div>
                </li>
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

/* `kinds` narrows the screen to some lead types (Quotations shows quotation
   and checkout leads); without it every type shows, with a type filter. */
export default function Leads({ kinds = null, title = "Leads", lede }) {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [me, setMe] = useState(null);
  const [lastNote, setLastNote] = useState({});
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("all");
  const [owner, setOwner] = useState("all");
  const [q, setQ] = useState("");
  /* the mail sent to staff links to ?lead=<id>, which opens that lead */
  const [params, setParams] = useSearchParams();
  const [openId, setOpenIdState] = useState(params.get("lead"));
  const setOpenId = useCallback((id) => {
    setOpenIdState(id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("lead", id); else next.delete("lead");
      return next;
    }, { replace: true });
  }, [setParams]);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    const [{ data, error: err }, act] = await Promise.all([
      supabase.from("form_submissions").select("*").neq("form_type", "newsletter").order("created_at", { ascending: false }).limit(500),
      supabase.from("form_activity").select("submission_id, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (err) { setError(err.message); return; }
    setError("");
    setRows(data || []);
    const last = {};
    (act.data || []).forEach((a) => { if (!last[a.submission_id]) last[a.submission_id] = a.created_at; });
    setLastNote(last);
  }, []);

  useEffect(() => {
    load();
    (async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, status")
        .in("role", ["super_admin", "ops", "catalog"])
        .eq("status", "active")
        .order("full_name");
      setStaff(data || []);
      setMe((data || []).find((s) => s.id === user?.id) || null);
    })();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const byId = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);
  const canAssign = me && (me.role === "super_admin" || me.role === "ops");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (status === "open" && r.status === "closed") return false;
      if (status !== "open" && status !== "all" && r.status !== status) return false;
      if (kinds && !kinds.includes(leadKind(r))) return false;
      if (kind !== "all" && leadKind(r) !== kind) return false;
      if (owner === "mine" && r.assigned_to !== me?.id) return false;
      if (owner === "none" && r.assigned_to) return false;
      if (!["all", "mine", "none"].includes(owner) && r.assigned_to !== owner) return false;
      if (term) {
        const p = r.payload || {};
        const hay = [p.name, p.email, p.phone, p.order_number, p.subject, p.piece, (p.pieces || []).join(" ")].join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, status, kind, kinds, owner, q, me]);

  const counts = useMemo(() => {
    const r = rows || [];
    const scoped = kinds ? r.filter((x) => kinds.includes(leadKind(x))) : r;
    return {
      fresh: scoped.filter((x) => x.status === "new").length,
      unassigned: scoped.filter((x) => !x.assigned_to && x.status !== "closed").length,
      mine: scoped.filter((x) => me && x.assigned_to === me.id && x.status !== "closed").length,
      closed: scoped.filter((x) => x.status === "closed" && Date.now() - new Date(x.updated_at) < 7 * 864e5).length,
    };
  }, [rows, me, kinds]);

  const open = openId && (rows || []).find((r) => r.id === openId);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{lede || "Every enquiry from the website. Assign each to an adviser, follow it up, and close it."}</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Name, email, phone, order…" />
      </header>

      <div className="stat-grid">
        <button type="button" className="stat" onClick={() => { setStatus("new"); setOwner("all"); }}><span>New</span><strong>{rows ? counts.fresh : "—"}</strong></button>
        <button type="button" className="stat" onClick={() => { setStatus("open"); setOwner("none"); }}><span>Unassigned</span><strong>{rows ? counts.unassigned : "—"}</strong></button>
        <button type="button" className="stat" onClick={() => { setStatus("open"); setOwner("mine"); }}><span>Assigned to me</span><strong>{rows ? counts.mine : "—"}</strong></button>
        <button type="button" className="stat" onClick={() => { setStatus("closed"); setOwner("all"); }}><span>Closed · 7 days</span><strong>{rows ? counts.closed : "—"}</strong></button>
      </div>

      <div className="lead-filters">
        <Segment value={status} onChange={setStatus} options={STATUS} />
        {!kinds ? (
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
            <option value="all">All types</option>
            <option value="appointment">Appointments</option>
            <option value="quotation">Quotations</option>
            <option value="checkout">Checkout</option>
            <option value="contact">Contact</option>
          </select>
        ) : null}
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Assigned to">
          <option value="all">Everyone</option>
          <option value="mine">Assigned to me</option>
          <option value="none">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{personName(s)}</option>)}
        </select>
      </div>

      {error ? <p className="err">{error}</p> : null}

      {rows === null ? (
        <div className="panel"><Skeleton rows={6} /></div>
      ) : !filtered.length ? (
        <div className="panel"><Empty icon="inbox" title="No leads in this view">Try another filter, or wait for the next enquiry.</Empty></div>
      ) : (
        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Received</th>
                <th>Last update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = r.payload || {};
                const k = leadKind(r);
                return (
                  <tr key={r.id} className="is-clickable" onClick={() => setOpenId(r.id)} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenId(r.id); }}>
                    <td>
                      <div className="cell-strong">{p.name || p.email || "Unnamed"}{r.status === "new" ? <span className="new-dot" title="New" /> : null}</div>
                      <div className="cell-sub">{[p.email, p.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td>
                      <Pill value={KIND_LABEL[k] || k} tone="info" />
                      {p.gift && (p.gift.to || p.gift.message) ? <span className="cell-sub"> + gift</span> : null}
                    </td>
                    <td><Pill value={r.status} /></td>
                    <td><Who person={byId[r.assigned_to]} /></td>
                    <td className="cell-sub" title={formatDateTime(r.created_at)}>{relativeTime(r.created_at)}</td>
                    <td className="cell-sub">{relativeTime(lastNote[r.id] || r.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <LeadDrawer
          lead={open}
          staff={staff}
          me={me}
          canAssign={canAssign}
          onClose={() => setOpenId(null)}
          onChanged={load}
          show={show}
        />
      ) : null}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
