import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AreaChart } from "../components/charts.jsx";
import { Panel, Empty, RankList, Skeleton, Pill } from "../components/ui.jsx";
import { relativeTime } from "../lib/format.js";
import { actionLabel, roleLabel } from "../lib/activity.js";

/* What a submission is, in the words the inbox uses. A checkout files a
   quotation with source "checkout", which staff think of as an order. */
function enquiryKind(row) {
  const p = row.payload || {};
  if (row.form_type === "quotation" && p.source === "checkout") return "Checkout";
  return { quotation: "Quotation", appointment: "Appointment", contact: "Contact" }[row.form_type]
    || String(row.form_type || "Form").replace(/_/g, " ");
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState(null);
  const [topPaths, setTopPaths] = useState([]);
  const [activity, setActivity] = useState([]);
  const [enquiries, setEnquiries] = useState(null);
  const [signIns, setSignIns] = useState(null);

  useEffect(() => {
    async function load() {
      const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [products, forms, quotes, orders, visitors, ts, paths, logs, recentForms, sessions] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("form_type", "quotation").in("status", ["new", "in_progress"]),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen", since5),
        supabase.rpc("analytics_timeseries", { since: since24h, bucket_minutes: 60 }),
        supabase.rpc("analytics_top_paths", { since: since24h, max_rows: 6 }),
        supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("form_submissions").select("id, form_type, status, payload, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("activity_log").select("id, actor_email, actor_role, action, area, detail, created_at").in("action", ["login", "logout"]).order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        products: products.count || 0,
        forms: forms.count || 0,
        quotes: quotes.count || 0,
        orders: orders.count || 0,
        visitors: visitors.count || 0,
      });
      if (!ts.error) {
        setSeries((ts.data || []).map((r) => ({ label: r.bucket, value: r.pageviews })));
      } else {
        setSeries([]);
      }
      if (!paths.error) setTopPaths(paths.data || []);
      if (!logs.error) setActivity(logs.data || []);
      setEnquiries(recentForms.error ? [] : recentForms.data || []);
      setSignIns(sessions.error ? [] : sessions.data || []);
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Catalog, quotations, forms, orders, and live visitors — one glance at how the storefront is doing.</p>
        </div>
      </header>

      <div className="stat-grid">
        <Link className="stat" to="/catalog"><span>Products</span><strong>{stats ? stats.products : "—"}</strong></Link>
        <Link className="stat" to="/quotations"><span>Active quotes</span><strong>{stats ? stats.quotes : "—"}</strong></Link>
        <Link className="stat" to="/forms"><span>New leads</span><strong>{stats ? stats.forms : "—"}</strong></Link>
        <Link className="stat" to="/orders"><span>Orders</span><strong>{stats ? stats.orders : "—"}</strong></Link>
        <Link className="stat" to="/traffic"><span><i className="live-dot" />Visitors now</span><strong>{stats ? stats.visitors : "—"}</strong></Link>
      </div>

      <div className="split split--wide">
        <Panel title="Pageviews — last 24h">
          {series === null ? (
            <Skeleton rows={5} />
          ) : series.length ? (
            <AreaChart
              data={series}
              formatLabel={(l) => new Date(l).toLocaleTimeString(undefined, { hour: "numeric" })}
            />
          ) : (
            <Empty icon="traffic" title="No traffic recorded yet">
              Once the storefront beacon fires, pageviews over the last 24 hours will chart here.
            </Empty>
          )}
        </Panel>

        <Panel title="Top pages · 24h">
          {topPaths.length ? (
            <RankList items={topPaths.map((p) => ({ key: p.path, label: p.path, value: p.views }))} />
          ) : (
            <Empty icon="globe" title="No pageviews yet" />
          )}
        </Panel>
      </div>

      <div className="split">
        <Panel title="Latest leads" actions={<Link className="cell-sub" to="/forms">All leads →</Link>}>
          {enquiries === null ? (
            <Skeleton rows={4} />
          ) : enquiries.length ? (
            <ul className="list">
              {enquiries.map((r) => {
                const p = r.payload || {};
                return (
                  <li key={r.id}>
                    <span>
                      <strong className="cell-strong">{p.name || p.email || "Anonymous"}</strong>{" "}
                      <span className="muted">
                        {enquiryKind(r)}
                        {p.order_number ? ` · ${p.order_number}` : ""}
                        {p.email && p.name ? ` · ${p.email}` : ""}
                      </span>
                    </span>
                    <Pill value={r.status} />
                    <span className="cell-sub">{relativeTime(r.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon="inbox" title="No enquiries yet">
              Contact, appointment, quotation and checkout enquiries arrive here.
            </Empty>
          )}
        </Panel>

        <Panel title="Sign-ins & sign-outs" actions={<Link className="cell-sub" to="/activity">All activity →</Link>}>
          {signIns === null ? (
            <Skeleton rows={4} />
          ) : signIns.length ? (
            <ul className="list">
              {signIns.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong className="cell-strong">{a.actor_email || "Unknown"}</strong>{" "}
                    <span className="muted">
                      {actionLabel(a.action)}
                      {a.area === "storefront" ? " on the site" : " to admin"}
                      {a.detail?.provider === "google" ? " with Google" : ""}
                    </span>
                  </span>
                  {a.actor_role ? <Pill value={roleLabel(a.actor_role)} tone={a.actor_role === "customer" ? "info" : "primary"} /> : null}
                  <span className="cell-sub">{relativeTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="security" title="No sign-ins recorded yet">
              Customer and staff sign-ins appear here as they happen.
            </Empty>
          )}
        </Panel>
      </div>

      <Panel title="Recent activity">
        {activity.length ? (
          <ul className="list">
            {activity.map((a) => (
              <li key={a.id}>
                <span>
                  <strong className="cell-strong">{a.action}</strong>{" "}
                  {a.entity_type ? <span className="muted">{a.entity_type} {a.entity_id || ""}</span> : null}
                </span>
                <span className="cell-sub">{relativeTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="security" title="No activity logged yet" />
        )}
      </Panel>
    </div>
  );
}
