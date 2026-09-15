import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AreaChart } from "../components/charts.jsx";
import { Panel, Empty, RankList, Skeleton } from "../components/ui.jsx";
import { relativeTime } from "../lib/format.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState(null);
  const [topPaths, setTopPaths] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    async function load() {
      const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [products, forms, quotes, orders, visitors, ts, paths, logs] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("form_type", "quotation").in("status", ["new", "in_progress"]),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen", since5),
        supabase.rpc("analytics_timeseries", { since: since24h, bucket_minutes: 60 }),
        supabase.rpc("analytics_top_paths", { since: since24h, max_rows: 6 }),
        supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8),
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
        <Link className="stat" to="/forms"><span>New forms</span><strong>{stats ? stats.forms : "—"}</strong></Link>
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
