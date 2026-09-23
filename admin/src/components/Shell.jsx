import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useTheme } from "../lib/useTheme.js";
import { Icon } from "./ui.jsx";
import { recordView } from "../lib/activity.js";

const LINKS = [
  { section: "Overview", items: [
    ["/", "Dashboard", "dashboard"],
  ] },
  { section: "Commerce", items: [
    ["/catalog", "Catalog", "catalog"],
    ["/orders", "Orders", "orders"],
    ["/quotations", "Quotations", "quotations", "quotes"],
    ["/gifts", "Gift requests", "gifts", "gifts"],
  ] },
  { section: "People", items: [
    ["/people", "People & roles", "users"],
    ["/activity", "Activity", "traffic"],
  ] },
  { section: "Engagement", items: [
    ["/forms", "Forms", "forms", "forms"],
    ["/traffic", "Traffic", "traffic"],
  ] },
  { section: "Content", items: [
    ["/navigation", "Menu", "menu"],
    ["/offices", "Offices", "globe"],
    ["/contact", "Contact", "inbox"],
    ["/media", "Media", "download"],
  ] },
  { section: "Site", items: [
    ["/seo", "SEO", "seo"],
    ["/security", "Security", "security"],
    ["/audit", "Audit log", "check"],
  ] },
];

function currentTitle(pathname) {
  for (const group of LINKS) {
    for (const [to, label] of group.items) {
      if (to === "/" ? pathname === "/" : pathname.startsWith(to)) return label;
    }
  }
  return "Admin";
}

function useBadges() {
  const [badges, setBadges] = useState({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [forms, quotes, gifts] = await Promise.all([
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("form_type", "quotation").in("status", ["new", "in_progress"]),
        /* a gift request has a card waiting to be written, so it is worth a
           count of its own rather than being folded into quotations */
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).not("payload->gift", "is", null).in("status", ["new", "in_progress"]),
      ]);
      if (cancelled) return;
      setBadges({ forms: forms.count || 0, quotes: quotes.count || 0, gifts: gifts.count || 0 });
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  return badges;
}

export default function Shell({ profile, email, children }) {
  const [theme, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const badges = useBadges();

  /* Which screen was opened, recorded once per screen rather than per render.
     recordView throttles; this only has to fire on a real path change. */
  useEffect(() => { recordView(location.pathname); }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="shell">
      {open ? <div className="side-scrim" onClick={() => setOpen(false)} /> : null}
      <aside className={`side ${open ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-kicker">Admin</span>
          <strong>Gem Experience</strong>
        </div>
        <nav className="nav">
          {LINKS.map((group) => (
            <div key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map(([to, label, icon, badgeKey]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) => (isActive ? "nav-link is-on" : "nav-link")}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                  {badgeKey && badges[badgeKey] ? <span className="nav-badge">{badges[badgeKey]}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-who">
            <span className="side-email">{email}</span>
            <span className="side-role">{profile?.role?.replace(/_/g, " ") || "…"}</span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => supabase.auth.signOut()}>
            <Icon name="signout" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <span className="topbar-title">{currentTitle(location.pathname)}</span>
          <span className="topbar-spacer" />
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
