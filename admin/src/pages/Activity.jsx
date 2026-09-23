/* One timeline of everything that happened in the panel.
 *
 * Two kinds of event, read through a view that unions them so the ordering is
 * done by the database rather than by interleaving two lists here:
 *
 *   sessions — signing in, signing out, opening a screen. Written by the app,
 *              because no row changes when somebody navigates.
 *   changes  — creates, edits, deletes, role changes. Written by database
 *              triggers, so an edit made outside this app is still recorded.
 *
 * Read-only on purpose. A log its subject can edit is not a log.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, Empty, Skeleton, Pill, Icon, Toast, Search } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readFeed, readPeople, ROLES, roleOf, actionLabel } from "../lib/activity.js";
import { relativeTime, formatDateTime } from "../lib/format.js";

const SOURCES = [
  { value: "", label: "Everything" },
  { value: "session", label: "Sessions" },
  { value: "change", label: "Changes" },
];

const ACTION_TONE = {
  login: "ok", logout: "", login_failed: "bad", view: "",
  insert: "ok", update: "warn", delete: "bad",
  role_change: "bad", status_change: "warn",
};

/* What the row is about, in as few words as the event allows. */
function subject(r) {
  const d = r.detail || {};
  /* Signing in and out are about nobody but the actor, and the row already
     names them. A dash here was pure noise on every session row. */
  if (r.action === "login" || r.action === "logout" || r.action === "login_failed") return "";
  if (r.action === "view") return r.area || "a screen";
  if (r.action === "role_change") {
    const from = d.before?.role, to = d.after?.role;
    return `${d.email || r.area || "account"}${from && to ? ` · ${roleOf(from).label} → ${roleOf(to).label}` : ""}`;
  }
  if (r.action === "status_change") return `${d.email || "account"} · ${d.after?.status || ""}`;
  const after = d.after || d.before || {};
  return after.label || after.name || after.email || r.area || "";
}

export default function Activity() {
  const [rows, setRows] = useState(null);
  const [people, setPeople] = useState([]);
  const [role, setRole] = useState("");
  const [source, setSource] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await readFeed({ role, source, actor, limit: 300 }));
      setError("");
    } catch (e) {
      setError(e.message || "Could not load activity.");
      setRows([]);
    }
  }, [role, source, actor]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { readPeople().then(setPeople).catch(() => {}); }, []);

  /* Free text is filtered here rather than in the query: the feed is a union
     view, so an `or` across its columns is awkward to express, and three
     hundred rows filter instantly in the browser. */
  const shown = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.actor_email, r.action, r.area, subject(r)].some((v) => (v || "").toLowerCase().includes(t)));
  }, [rows, q]);

  const counts = useMemo(() => {
    const c = { total: rows?.length || 0 };
    ROLES.forEach((r) => { c[r.value] = (rows || []).filter((x) => x.actor_role === r.value).length; });
    return c;
  }, [rows]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p>Sign-ins, screens opened and every change made, newest first.</p>
        </div>
        <div className="panel-actions">
          <Search value={q} onChange={setQ} placeholder="Search activity…" />
          <button type="button" className="btn btn--ghost" onClick={() => { load(); show("Refreshed."); }}>
            <Icon name="refresh" width="15" height="15" /> Refresh
          </button>
        </div>
      </header>

      {/* counts by role, and each one doubles as the filter for that role */}
      <div className="role-cards">
        <button type="button" className={`role-card ${role === "" ? "is-on" : ""}`} onClick={() => setRole("")}>
          <span className="role-count">{counts.total}</span>
          <span className="role-body">
            <span className="role-name">All activity</span>
            <span className="role-sub">Everyone</span>
          </span>
        </button>
        {ROLES.map((r) => (
          <button type="button" key={r.value}
                  className={`role-card ${role === r.value ? "is-on" : ""}`}
                  onClick={() => setRole(role === r.value ? "" : r.value)}>
            <span className={`role-count role-count--${r.tone || "plain"}`}>{counts[r.value] || 0}</span>
            <span className="role-body">
              <span className="role-name">{r.label}</span>
              <span className="role-sub">{r.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <Panel
        title="Timeline"
        actions={
          <div className="panel-actions">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={actor} onChange={(e) => setActor(e.target.value)}>
              <option value="">Anyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </div>
        }
      >
        <p className="panel-note">
          Changes are recorded by the database, so an edit made outside this panel
          still appears. Nothing here can be edited or deleted from the admin.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={8} />
        ) : !shown.length ? (
          <Empty icon="traffic" title="Nothing recorded yet">
            Sign-ins and edits will appear here as they happen. If this stays empty
            after people have used the panel, the activity migration has not been run.
          </Empty>
        ) : (
          <ol className="feed">
            {shown.map((r) => {
              const rl = roleOf(r.actor_role);
              return (
                <li className="feed-row" key={r.id}>
                  <span className={`feed-dot feed-dot--${ACTION_TONE[r.action] || "plain"}`} aria-hidden="true" />
                  <span className="feed-main">
                    <span className="feed-line">
                      <strong>{r.actor_email || "system"}</strong>
                      {r.actor_role ? <Pill value={rl.label} tone={rl.tone} /> : null}
                      <span className="feed-action">{actionLabel(r.action)}</span>
                      <span className="feed-subject">{subject(r)}</span>
                    </span>
                    <span className="feed-meta" title={formatDateTime(r.created_at)}>
                      {relativeTime(r.created_at)} · {r.source}
                    </span>
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm"
                          onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? "Hide" : "Detail"}
                  </button>
                  {open === r.id ? (
                    <pre className="audit-detail feed-detail">{JSON.stringify(r, null, 2)}</pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
