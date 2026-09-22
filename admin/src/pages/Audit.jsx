/* Who changed what.
 *
 * Rows are written by a database trigger rather than by this app, so an edit
 * made through the Supabase dashboard or a script is recorded too. The panel
 * is read-only by design: an audit trail nobody can edit is the only kind
 * worth keeping.
 */
import { useCallback, useEffect, useState } from "react";
import { Panel, Empty, Skeleton, Pill, Toast, Segment } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readAudit } from "../lib/content.js";
import { supabase } from "../lib/supabase.js";
import { relativeTime } from "../lib/format.js";

const SCOPES = [
  { value: "", label: "Everything" },
  { value: "nav_items", label: "Menu" },
  { value: "offices", label: "Offices" },
];

const TONE = { insert: "ok", update: "warn", delete: "bad" };

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [who, setWho] = useState({});
  const [entity, setEntity] = useState("");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const { toast, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await readAudit({ entity, limit: 150 });
      setRows(data);
      setError("");

      /* Resolve actor ids to names in one request rather than joining: the
         trigger stores only the id, and most pages of log repeat the same
         handful of people. */
      const ids = [...new Set(data.map((r) => r.actor_id).filter(Boolean))];
      if (ids.length) {
        const { data: people } = await supabase
          .from("profiles").select("id, full_name, email").in("id", ids);
        setWho(Object.fromEntries((people || []).map((p) => [p.id, p.full_name || p.email])));
      }
    } catch (e) {
      setError(e.message || "Could not load the audit log.");
      setRows([]);
    }
  }, [entity]);

  useEffect(() => { load(); }, [load]);

  function label(r) {
    const after = r.meta?.after || r.meta?.before || {};
    return after.label || after.name || r.entity_id || "—";
  }

  return (
    <>
      <Panel
        title="Audit log"
        actions={<Segment value={entity} onChange={setEntity} options={SCOPES} />}
      >
        <p className="panel-note">
          Written by the database, not by this screen, so a change made anywhere —
          here, the Supabase dashboard, a script — is recorded.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={6} />
        ) : !rows.length ? (
          <Empty icon="security" title="Nothing recorded yet">
            Edits to the menu and the offices will appear here.
          </Empty>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Who</th><th>What</th><th>Item</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{relativeTime(r.created_at)}</td>
                  <td>{who[r.actor_id] || (r.actor_id ? "…" : "system")}</td>
                  <td>
                    <Pill value={r.action} tone={TONE[r.action]} />
                    <span className="audit-entity">{r.entity_type}</span>
                  </td>
                  <td>{label(r)}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm"
                            onClick={() => setOpen(open === r.id ? null : r.id)}>
                      {open === r.id ? "Hide" : "Detail"}
                    </button>
                    {open === r.id ? (
                      <pre className="audit-detail">{JSON.stringify(r.meta, null, 2)}</pre>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
