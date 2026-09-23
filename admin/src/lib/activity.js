/* Recording and reading the activity feed.
 *
 * Two sources sit behind it. Row changes are written by database triggers, so
 * an edit made through the Supabase dashboard or a script is recorded whether
 * or not it went through this app. Sessions and navigation are written here,
 * because nothing changes in the database when somebody signs in or opens a
 * screen, so no trigger can see it.
 */
import { supabase } from "./supabase.js";

/* The database has four roles and they are already a hierarchy. These are the
 * names people use for them out loud; the stored values are what the row level
 * security policies are written against, so they stay as they are.
 *
 * `ops` and `catalog` predate this screen. Renaming the enum would mean
 * rewriting every policy that names them, for a cosmetic gain, so the labels
 * live here instead.
 */
export const ROLES = [
  { value: "super_admin", label: "Super admin", rank: 3, tone: "bad",
    blurb: "Everything, including other people's roles." },
  { value: "ops",         label: "Manager",     rank: 2, tone: "warn",
    blurb: "Orders, quotations, enquiries and the whole catalogue." },
  { value: "catalog",     label: "Admin",       rank: 1, tone: "ok",
    blurb: "Catalogue and site content. No access to people or security." },
  { value: "customer",    label: "User",        rank: 0, tone: "",
    blurb: "A storefront account. No admin access at all." },
];

export const STAFF_ROLES = ROLES.filter((r) => r.rank > 0).map((r) => r.value);

export function roleOf(value) {
  return ROLES.find((r) => r.value === value) || { value, label: value, rank: -1, tone: "" };
}

export function roleLabel(value) {
  return roleOf(value).label;
}

/* Actions worth naming. Anything not listed still records and displays — the
   map is for reading, not for validation, so a new action added later does not
   need this file changed before it shows up. */
export const ACTIONS = {
  login: "Signed in",
  logout: "Signed out",
  login_failed: "Failed sign-in",
  view: "Opened",
  insert: "Created",
  update: "Edited",
  delete: "Deleted",
  role_change: "Changed a role",
  status_change: "Blocked or unblocked",
  export: "Exported",
  import: "Imported",
};

export function actionLabel(a) {
  return ACTIONS[a] || (a || "").replace(/[._]/g, " ");
}

/* Recording never blocks and never throws.
 *
 * A failed write here must not stop somebody signing in or navigating: the
 * log exists to describe what happened, and it is not worth breaking the thing
 * it is describing. Failures are swallowed deliberately. */
export async function record(action, { area = null, detail = {} } = {}) {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;

    let role = null;
    try {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      role = data?.role ?? null;
    } catch { /* the row may not exist yet on a first sign-in */ }

    await supabase.from("activity_log").insert({
      actor_id: user.id,
      actor_email: user.email || null,
      actor_role: role,
      action,
      area,
      detail,
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
    });
  } catch {
    /* deliberately silent — see above */
  }
}

/* Page views are recorded, but not every render of one.
 *
 * React re-runs effects on far more than a real navigation, and a route the
 * reader is sitting still on would otherwise write a row a second and bury
 * everything that matters. Only a change of screen counts, and only once a
 * minute for the same screen. */
const seen = new Map();

export function recordView(area) {
  const now = Date.now();
  const last = seen.get(area) || 0;
  if (now - last < 60000) return;
  seen.set(area, now);
  record("view", { area });
}

/* ------------------------------------------------------------------- reads */

export async function readFeed({ role = "", action = "", actor = "", source = "", limit = 200 } = {}) {
  let q = supabase
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role) q = q.eq("actor_role", role);
  if (action) q = q.eq("action", action);
  if (actor) q = q.eq("actor_id", actor);
  if (source) q = q.eq("source", source);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function readPeople() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setRole(id, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
  /* The database trigger records the change itself, with the before and after
     role, so there is nothing to write here — and writing it from the browser
     as well would put the same event in the feed twice. */
}

export async function setStatus(id, status) {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) throw error;
}

/* Recent sign-ins per person, for the "last seen" column. One query for the
   whole table rather than one per row. */
export async function lastSeen(limit = 500) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("actor_id, created_at")
    .eq("action", "login")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return {};
  const out = {};
  (data || []).forEach((r) => { if (r.actor_id && !out[r.actor_id]) out[r.actor_id] = r.created_at; });
  return out;
}
