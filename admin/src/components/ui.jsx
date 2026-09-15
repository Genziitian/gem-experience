/* Shared presentational pieces. Everything here is stateless — pages own the
   data, these own the look. */

const PATHS = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  catalog: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7 12 12l8.7-5 M12 22V12",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  orders: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  quotations: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  forms: "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  traffic: "M3 3v18h18 M18.7 8l-5.1 5.2-2.8-2.7L7 14.3",
  seo: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35",
  security: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
  check: "M20 6 9 17l-5-5",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  x: "M18 6 6 18 M6 6l12 12",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  arrowUp: "M12 19V5 M5 12l7-7 7 7",
  arrowDown: "M12 5v14 M19 12l-7 7-7-7",
  signout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
};

export function Icon({ name, ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

export function Panel({ title, actions, children, className = "", flush = false }) {
  return (
    <section className={`panel ${flush ? "panel--flush" : ""} ${className}`}>
      {title || actions ? (
        <div className="panel-head">
          {title ? <h2>{title}</h2> : <span style={{ flex: 1 }} />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Empty({ icon = "inbox", title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      {title ? <strong>{title}</strong> : null}
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

const PILL_TONE = {
  published: "success", active: "success", paid: "success", resolved: "success",
  confirmed: "success", completed: "success", allow: "success",
  draft: "warning", new: "warning", pending: "warning", in_progress: "warning",
  enquiry: "warning", bot: "warning",
  blocked: "danger", failed: "danger", cancelled: "danger", archived: "danger",
  block: "danger", suspended: "danger",
  channel: "info", customer: "info",
  super_admin: "primary", ops: "primary", catalog: "primary",
};

export function Pill({ value, tone }) {
  const key = String(value ?? "").toLowerCase();
  const resolved = tone || PILL_TONE[key] || "";
  return (
    <span className={`pill ${resolved ? `pill--${resolved}` : ""}`}>
      {String(value ?? "").replace(/_/g, " ")}
    </span>
  );
}

export function Segment({ value, onChange, options }) {
  return (
    <div className="segment" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "is-on" : ""}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="search">
      <Icon name="search" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Stat({ label, value, delta, live, hint }) {
  return (
    <div className="stat">
      <span>
        {live ? <i className="live-dot" /> : null}
        {label}
      </span>
      <strong>{value}</strong>
      {delta !== undefined && delta !== null ? <Delta value={delta} /> : null}
      {hint ? <span className="cell-sub">{hint}</span> : null}
    </div>
  );
}

export function Delta({ value }) {
  const tone = value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat";
  const icon = value > 0 ? "arrowUp" : value < 0 ? "arrowDown" : null;
  return (
    <span className={`stat-delta ${tone}`}>
      {icon ? <Icon name={icon} width="12" height="12" /> : null}
      {value > 0 ? "+" : ""}{value}% vs previous
    </span>
  );
}

/* Ranked list with the share drawn as a bar behind each row. */
export function RankList({ items, total, renderLabel, empty = "Nothing yet." }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  const sum = total || items.reduce((n, i) => n + i.value, 0) || 1;
  return (
    <div className="rank">
      {items.map((item) => (
        <div className="rank-row" key={item.key ?? item.label}>
          <span className="rank-bar" style={{ width: `${(item.value / max) * 100}%` }} />
          <span className="rank-label">{renderLabel ? renderLabel(item) : item.label}</span>
          <span className="rank-value">{item.value.toLocaleString()}</span>
          <span className="rank-pct">{Math.round((item.value / sum) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.ok ? "toast--ok" : "toast--err"}`} role="status">
      <Icon name={toast.ok ? "check" : "alert"} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="x" />
      </button>
    </div>
  );
}
