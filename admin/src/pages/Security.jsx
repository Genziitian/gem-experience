import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Security() {
  const [audits, setAudits] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

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
    setAudits(a.data || []);
    setAttempts(l.data || []);
    setBlocks(b.data || []);
  }

  useEffect(() => { load(); }, []);

  async function blockIp(e) {
    e.preventDefault();
    const { error: err } = await supabase.from("blocked_ips").insert({ ip: ip.trim(), reason: reason || null });
    if (err) setError(err.message);
    else {
      setIp("");
      setReason("");
      load();
    }
  }

  async function unblock(id) {
    await supabase.from("blocked_ips").delete().eq("id", id);
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Security</h1>
        <p>Audit log, login attempts, IP blocks.</p>
      </header>
      {error ? <p className="err">{error}</p> : null}

      <form className="panel form-grid" onSubmit={blockIp}>
        <h2>Block IP</h2>
        <label>IP<input value={ip} onChange={(e) => setIp(e.target.value)} required placeholder="1.2.3.4" /></label>
        <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <div className="form-actions full"><button className="btn" type="submit">Block</button></div>
      </form>

      <div className="split">
        <section className="panel">
          <h2>Blocked IPs</h2>
          <ul className="list">
            {blocks.map((b) => (
              <li key={b.id}>
                <span>{b.ip}<div className="muted">{b.reason || ""}</div></span>
                <button type="button" className="linkish" onClick={() => unblock(b.id)}>Remove</button>
              </li>
            ))}
            {!blocks.length ? <li className="muted">None</li> : null}
          </ul>
        </section>
        <section className="panel">
          <h2>Recent login attempts</h2>
          <ul className="list">
            {attempts.map((a) => (
              <li key={a.id}>
                <span>{a.email || "—"} · {a.ip || "—"}</span>
                <span className={a.success ? "ok" : "err"}>{a.success ? "ok" : "fail"}</span>
              </li>
            ))}
            {!attempts.length ? <li className="muted">None logged yet</li> : null}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Audit log</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>When</th><th>Action</th><th>Entity</th></tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{a.action}</td>
                  <td>{a.entity_type} {a.entity_id || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
