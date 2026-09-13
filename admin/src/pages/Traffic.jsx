import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Traffic() {
  const [live, setLive] = useState(0);
  const [top, setTop] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [liveRes, eventsRes] = await Promise.all([
      supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen", since5),
      supabase.from("analytics_events").select("path, created_at, referrer").gte("created_at", since7d).order("created_at", { ascending: false }).limit(200),
    ]);

    if (liveRes.error || eventsRes.error) {
      setError(liveRes.error?.message || eventsRes.error?.message);
      return;
    }

    setLive(liveRes.count || 0);
    const events = eventsRes.data || [];
    setRecent(events.slice(0, 20));

    const counts = {};
    events.forEach((e) => { counts[e.path] = (counts[e.path] || 0) + 1; });
    setTop(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Traffic</h1>
        <p>In-house visitors (last 5 min) and top paths (7 days). Polls every 10s.</p>
      </header>
      {error ? <p className="err">{error}</p> : null}
      <div className="stat-grid">
        <div className="stat"><span>Visitors now</span><strong>{live}</strong></div>
        <div className="stat"><span>Events (sample)</span><strong>{recent.length}</strong></div>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Top pages</h2>
          {!top.length ? <p className="muted">No traffic yet. Wire <code>POST analytics</code> from the storefront.</p> : null}
          <ul className="list">
            {top.map((t) => (
              <li key={t.path}><span>{t.path}</span><strong>{t.views}</strong></li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Recent views</h2>
          <ul className="list">
            {recent.map((e, i) => (
              <li key={i}>
                <span>{e.path}</span>
                <span className="muted">{new Date(e.created_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
