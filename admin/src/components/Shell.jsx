import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

const links = [
  ["/", "Dashboard"],
  ["/catalog", "Catalog"],
  ["/users", "Users"],
  ["/orders", "Orders"],
  ["/forms", "Forms"],
  ["/traffic", "Traffic"],
  ["/seo", "SEO"],
  ["/security", "Security"],
];

export default function Shell({ profile, email, children }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-kicker">Admin</span>
          <strong>Gem Experience</strong>
        </div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "nav-link is-on" : "nav-link")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <span className="side-email">{email}</span>
          <span className="side-role">{profile?.role || "…"}</span>
          <button type="button" className="btn btn--ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
