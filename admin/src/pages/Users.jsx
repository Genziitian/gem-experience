import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status, created_at")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await supabase.from("profiles").update({ status }).eq("id", id);
    await supabase.from("audit_logs").insert({
      action: status === "blocked" ? "user.block" : "user.unblock",
      entity_type: "profiles",
      entity_id: id,
    });
    load();
  }

  async function setRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Users</h1>
        <p>Customers and staff. Block accounts or change roles.</p>
      </header>
      {error ? <p className="err">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.email || "—"}</strong>
                  <div className="muted">{r.full_name || ""}</div>
                </td>
                <td>
                  <select value={r.role} onChange={(e) => setRole(r.id, e.target.value)}>
                    <option value="customer">customer</option>
                    <option value="catalog">catalog</option>
                    <option value="ops">ops</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </td>
                <td><span className={`pill pill--${r.status}`}>{r.status}</span></td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  {r.status === "active" ? (
                    <button type="button" className="linkish" onClick={() => setStatus(r.id, "blocked")}>Block</button>
                  ) : (
                    <button type="button" className="linkish" onClick={() => setStatus(r.id, "active")}>Unblock</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
