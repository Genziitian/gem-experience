import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Empty, Panel, Pill, Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { formatDateTime, relativeTime } from "../lib/format.js";

export default function Security() {
  const [audits, setAudits] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    const [a, l, b] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("login_attempts").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("blocked_ips").select("*").order("created_at", { ascending: false }),
    ]);
    if (a.error || l.error || b.error) {
      setError(a.error?.message || l.error?.message || b.error?.message);
      return;
    }
    setError("");
    setAudits(a.data || []);
    setAttempts(l.data || []);
    setBlocks(b.data || []);
  }

  useEffect(() => { load(); }, []);

  async function blockIp(e) {
    e.preventDefault();
    const { error: err } = await supabase.from("blocked_ips").insert({ ip: ip.trim(), reason: reason || null });
    if (err) { show(err.message, false); return; }
    setIp("");
    setReason("");
    show("IP blocked.");
    load();
  }

  async function unblock(id) {
    await supabase.from("blocked_ips").delete().eq("id", id);
    show("IP unblocked.");
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Security</h1>
          <p>Audit log, login attempts, IP blocks. Referrer and country blocks live on the Traffic page.</p>
        </div>
      </header>
      {error ? <p className="err">{error}</p> : null}

      <Panel title="Block an IP">
        <form className="form-grid" onSubmit={blockIp}>
          <label>IP<input value={ip} onChange={(e) => setIp(e.target.value)} required placeholder="1.2.3.4" /></label>
          <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" /></label>
          <div className="form-actions full"><button className="btn" type="submit">Block</button></div>
        </form>
      </Panel>

      <div className="split">
        <Panel title="Blocked IPs">
          {!blocks.length ? (
            <p className="muted">None blocked.</p>
          ) : (
            <ul className="list">
              {blocks.map((b) => (
                <li key={b.id}>
                  <span>
                    <span className="cell-strong">{b.ip}</span>
                    <div className="cell-sub">{b.reason || ""}</div>
                  </span>
                  <button type="button" className="linkish" onClick={() => unblock(b.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent login attempts">
          {!attempts.length ? (
            <p className="muted">None logged yet.</p>
          ) : (
            <ul className="list">
              {attempts.map((a) => (
                <li key={a.id}>
                  <span>{a.email || "—"} · {a.ip || "—"}</span>
                  <Pill value={a.success ? "ok" : "fail"} tone={a.success ? "success" : "danger"} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Audit log" flush>
        {audits === null ? (
          <div style={{ padding: 18 }}><Skeleton rows={4} /></div>
        ) : !audits.length ? (
          <Empty icon="security" title="No activity logged yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Action</th><th>Entity</th></tr></thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td title={formatDateTime(a.created_at)}>{relativeTime(a.created_at)}</td>
                    <td>{a.action}</td>
                    <td>{a.entity_type} {a.entity_id || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
