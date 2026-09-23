/* Everyone with an account, and what each of them may do.
 *
 * Roles are a hierarchy: Super admin > Manager > Admin > User. The stored
 * values are the ones the row level security policies are written against —
 * see ROLES in lib/activity.js for why the labels and the values differ.
 *
 * Two guards worth naming, because getting either wrong locks people out of
 * their own panel:
 *
 *   - Nobody can change or block their own account from here. Demoting
 *     yourself by mis-clicking a dropdown would take away the access needed to
 *     undo it.
 *   - The last remaining super admin cannot be demoted or blocked. There has
 *     to be somebody left who can promote the others back.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, Empty, Skeleton, Pill, Search, Icon, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { supabase } from "../lib/supabase.js";
import { readPeople, setRole, setStatus, lastSeen, ROLES, roleOf } from "../lib/activity.js";
import { relativeTime, formatDateTime } from "../lib/format.js";

export default function People() {
  const [rows, setRows] = useState(null);
  const [seen, setSeen] = useState({});
  const [me, setMe] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [role, setRoleFilter] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      const [people, seenMap] = await Promise.all([readPeople(), lastSeen()]);
      setRows(people);
      setSeen(seenMap);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load people.");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data?.user?.id || null;
      setMe(id);
      if (!id) return;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
      setMyRole(p?.role ?? null);
    }).catch(() => {});
  }, []);

  const superAdmins = useMemo(
    () => (rows || []).filter((r) => r.role === "super_admin" && r.status === "active").length,
    [rows]
  );

  const counts = useMemo(() => {
    const c = { total: rows?.length || 0 };
    ROLES.forEach((r) => { c[r.value] = (rows || []).filter((x) => x.role === r.value).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    let list = rows || [];
    if (role) list = list.filter((r) => r.role === role);
    const t = q.trim().toLowerCase();
    if (t) list = list.filter((r) =>
      [r.email, r.full_name, r.phone].some((v) => (v || "").toLowerCase().includes(t)));
    return list;
  }, [rows, role, q]);

  /* Why a given account cannot be changed, or null when it can. The message
     shown to the reader is the same string, so the rule and its explanation
     cannot drift apart.

     These mirror the database trigger that actually enforces them. The
     dropdowns are a courtesy — the rule lives in guard_profile_privileges(),
     so disabling a control here can never be the only thing standing between
     somebody and a role change. */
  function lockedRole(row) {
    if (me && row.id === me) return "You cannot change your own role.";
    if (myRole !== "super_admin") return "Only a super admin can change a role.";
    if (row.role === "super_admin" && row.status === "active" && superAdmins <= 1) {
      return "This is the last active super admin.";
    }
    return null;
  }

  function lockedStatus(row) {
    if (me && row.id === me) return "You cannot block your own account.";
    if (myRole === "super_admin") {
      if (row.role === "super_admin" && row.status === "active" && superAdmins <= 1) {
        return "This is the last active super admin.";
      }
      return null;
    }
    if (myRole === "ops" && row.role === "customer") return null;
    return "You do not have permission to change this account.";
  }

  async function changeRole(row, next) {
    const why = lockedRole(row);
    if (why) { show(why, false); return; }
    if (next === row.role) return;
    if (!window.confirm(
      `Change ${row.email || "this account"} from ${roleOf(row.role).label} to ${roleOf(next).label}?`
    )) return;

    setBusy(row.id);
    try {
      await setRole(row.id, next);
      await load();
      show(`${row.email || "Account"} is now ${roleOf(next).label}.`);
    } catch (e) {
      show(e.message || "Could not change the role.", false);
    } finally {
      setBusy("");
    }
  }

  async function changeStatus(row) {
    const why = lockedStatus(row);
    if (why) { show(why, false); return; }
    const next = row.status === "active" ? "blocked" : "active";
    if (next === "blocked" && !window.confirm(`Block ${row.email || "this account"}? They will not be able to sign in.`)) return;

    setBusy(row.id);
    try {
      await setStatus(row.id, next);
      await load();
      show(next === "blocked" ? "Account blocked." : "Account unblocked.");
    } catch (e) {
      show(e.message || "Could not change the status.", false);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>People &amp; roles</h1>
          <p>Every account on the platform, and what each one is allowed to do.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Search by name, email or phone…" />
      </header>

      <div className="role-cards">
        <button type="button" className={`role-card ${role === "" ? "is-on" : ""}`} onClick={() => setRoleFilter("")}>
          <span className="role-count">{counts.total}</span>
          <span className="role-body">
            <span className="role-name">All accounts</span>
            <span className="role-sub">Everyone registered</span>
          </span>
        </button>
        {ROLES.map((r) => (
          <button type="button" key={r.value}
                  className={`role-card ${role === r.value ? "is-on" : ""}`}
                  onClick={() => setRoleFilter(role === r.value ? "" : r.value)}>
            <span className={`role-count role-count--${r.tone || "plain"}`}>{counts[r.value] || 0}</span>
            <span className="role-body">
              <span className="role-name">{r.label}</span>
              <span className="role-sub">{r.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <Panel>
        <p className="panel-note">
          A role change takes effect the next time that person loads the panel,
          and is recorded in Activity with who made it and what it was before.
          Only a super admin can change a role, nobody can change their own, and
          the last active super admin is locked so there is always someone who
          can promote the others back. The database enforces all three — the
          controls below only save you a failed round trip.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={6} />
        ) : !shown.length ? (
          <Empty icon="users" title={q || role ? "Nobody matches" : "No accounts yet"}>
            {q || role ? "Try a different search or role." : null}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last signed in</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const whyRole = lockedRole(r);
                  const whyStatus = lockedStatus(r);
                  const rl = roleOf(r.role);
                  return (
                    <tr key={r.id} className={r.status === "blocked" ? "is-off" : ""}>
                      <td>
                        <div className="cell-strong">
                          {r.full_name || r.email || "—"}
                          {me === r.id ? <span className="you">you</span> : null}
                        </div>
                        <div className="cell-sub">{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                      </td>
                      <td>
                        <select value={r.role} disabled={!!whyRole || busy === r.id}
                                title={whyRole || ""}
                                onChange={(e) => changeRole(r, e.target.value)}>
                          {ROLES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td><Pill value={r.status} tone={r.status === "blocked" ? "bad" : "ok"} /></td>
                      <td>{seen[r.id] ? relativeTime(seen[r.id]) : <span className="cell-sub">never</span>}</td>
                      <td>{formatDateTime(r.created_at)}</td>
                      <td className="actions">
                        <button type="button" className="linkish"
                                disabled={!!whyStatus || busy === r.id} title={whyStatus || ""}
                                onClick={() => changeStatus(r)}>
                          {r.status === "active" ? "Block" : "Unblock"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="What each role can do">
        <ul className="role-legend">
          {ROLES.map((r) => (
            <li key={r.value}>
              <Pill value={r.label} tone={r.tone} />
              <span>{r.blurb}</span>
              <code>{r.value}</code>
            </li>
          ))}
        </ul>
        <p className="panel-note">
          The codes are the values stored in the database. The security rules are
          written against those, so they are shown here rather than hidden — if
          you are reading a policy in Supabase, that is the name you will see.
        </p>
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
