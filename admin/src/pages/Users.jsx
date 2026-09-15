import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Empty, Panel, Pill, Search, Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { formatDateTime } from "../lib/format.js";

export default function Users() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status, created_at")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else { setRows(data || []); setError(""); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.email, r.full_name].some((v) => (v || "").toLowerCase().includes(term)));
  }, [rows, q]);

  async function setStatus(id, status) {
    const { error: err } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (err) { show(err.message, false); return; }
    await supabase.from("audit_logs").insert({
      action: status === "blocked" ? "user.block" : "user.unblock",
      entity_type: "profiles",
      entity_id: id,
    });
    show(status === "blocked" ? "Account blocked." : "Account unblocked.");
    load();
  }

  async function setRole(id, role) {
    const { error: err } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (err) show(err.message, false);
    else { show("Role updated."); load(); }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Users</h1>
          <p>Customers and staff. Block accounts or change roles.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Search users…" />
      </header>

      {error ? <p className="err">{error}</p> : null}

      {rows === null ? (
        <Panel><Skeleton rows={5} /></Panel>
      ) : !filtered.length ? (
        <Panel><Empty icon="users" title={q ? "No users match" : "No users yet"} /></Panel>
      ) : (
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
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-strong">{r.email || "—"}</div>
                    <div className="cell-sub">{r.full_name || ""}</div>
                  </td>
                  <td>
                    <select value={r.role} onChange={(e) => setRole(r.id, e.target.value)}>
                      <option value="customer">customer</option>
                      <option value="catalog">catalog</option>
                      <option value="ops">ops</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td><Pill value={r.status} /></td>
                  <td>{formatDateTime(r.created_at)}</td>
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
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
