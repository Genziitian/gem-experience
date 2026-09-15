import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { AreaChart, WorldMap } from "../components/charts.jsx";
import { Empty, Icon, Panel, Pill, RankList, Segment, Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { hostnameOf, relativeTime } from "../lib/format.js";
import { countryCentroid, countryName, flagEmoji } from "../lib/countries.js";

const RANGES = {
  "24h": { label: "24h", hours: 24, bucket: 60 },
  "7d": { label: "7d", hours: 24 * 7, bucket: 360 },
  "30d": { label: "30d", hours: 24 * 30, bucket: 1440 },
};

const DIMENSIONS = [
  ["channel", "Channel"],
  ["device", "Device"],
  ["browser", "Browser"],
  ["os", "OS"],
];

function bucketLabel(iso, hours) {
  const d = new Date(iso);
  if (hours <= 24) return d.toLocaleTimeString(undefined, { hour: "numeric" });
  if (hours <= 24 * 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Traffic() {
  const [range, setRange] = useState("7d");
  const [includeBots, setIncludeBots] = useState(false);
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState(null);
  const [countries, setCountries] = useState([]);
  const [dimension, setDimension] = useState("channel");
  const [dimRows, setDimRows] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [topPaths, setTopPaths] = useState([]);
  const [live, setLive] = useState([]);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const since = useMemo(() => {
    const { hours } = RANGES[range];
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  }, [range]);

  async function loadReport() {
    const { bucket } = RANGES[range];
    const [ov, ts, geo, dim, ref, paths] = await Promise.all([
      supabase.rpc("analytics_overview", { since, include_bots: includeBots }),
      supabase.rpc("analytics_timeseries", { since, bucket_minutes: bucket, include_bots: includeBots }),
      supabase.rpc("analytics_breakdown", { dimension: "country", since, max_rows: 12, include_bots: includeBots }),
      supabase.rpc("analytics_breakdown", { dimension, since, max_rows: 8, include_bots: includeBots }),
      supabase.rpc("analytics_breakdown", { dimension: "referrer", since, max_rows: 8, include_bots: includeBots }),
      supabase.rpc("analytics_top_paths", { since, max_rows: 10, include_bots: includeBots }),
    ]);

    const firstError = [ov, ts, geo, dim, ref, paths].find((r) => r.error)?.error;
    if (firstError) { setError(firstError.message); return; }
    setError("");

    setOverview(ov.data?.[0] || { sessions: 0, pageviews: 0, countries: 0, live: 0 });
    setSeries((ts.data || []).map((r) => ({ label: r.bucket, value: r.pageviews })));
    setCountries((geo.data || []).filter((r) => r.label !== "Unknown"));
    setDimRows(dim.data || []);
    setReferrers((ref.data || []).filter((r) => r.label !== "Unknown"));
    setTopPaths(paths.data || []);
  }

  async function loadLive() {
    const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from("analytics_sessions")
      .select("id, country, city, channel, device, referrer, landing_path, last_seen, is_bot, blocked")
      .gte("last_seen", since5)
      .order("last_seen", { ascending: false })
      .limit(30);
    if (!err) setLive((data || []).filter((s) => includeBots || (!s.is_bot && !s.blocked)));
  }

  useEffect(() => { loadReport(); }, [range, dimension, includeBots, since]);
  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 10000);
    return () => clearInterval(t);
  }, [includeBots]);

  const mapPoints = useMemo(
    () =>
      countries
        .map((c) => {
          const centroid = countryCentroid(c.label);
          return centroid ? { label: countryName(c.label), value: c.sessions, ...centroid } : null;
        })
        .filter(Boolean),
    [countries]
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Traffic</h1>
          <p>Visitors by location, channel and device — with live sessions, rules and alerts below.</p>
        </div>
        <div className="actions">
          <label className="check" style={{ fontSize: 12 }}>
            <input type="checkbox" checked={includeBots} onChange={(e) => setIncludeBots(e.target.checked)} />
            Include bots &amp; blocked
          </label>
          <Segment
            value={range}
            onChange={setRange}
            options={Object.entries(RANGES).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
      </header>

      {error ? <p className="err">{error}</p> : null}

      <div className="stat-grid">
        <div className="stat">
          <span><i className="live-dot" />Visitors now</span>
          <strong>{overview ? overview.live : "—"}</strong>
        </div>
        <div className="stat">
          <span>Sessions · {RANGES[range].label}</span>
          <strong>{overview ? overview.sessions.toLocaleString() : "—"}</strong>
        </div>
        <div className="stat">
          <span>Pageviews · {RANGES[range].label}</span>
          <strong>{overview ? overview.pageviews.toLocaleString() : "—"}</strong>
        </div>
        <div className="stat">
          <span>Countries · {RANGES[range].label}</span>
          <strong>{overview ? overview.countries : "—"}</strong>
        </div>
      </div>

      <div className="split split--wide">
        <Panel title={`Pageviews — ${RANGES[range].label}`}>
          {series === null ? (
            <Skeleton rows={5} />
          ) : series.length ? (
            <AreaChart data={series} formatLabel={(l) => bucketLabel(l, RANGES[range].hours)} />
          ) : (
            <Empty icon="traffic" title="No traffic in this window" />
          )}
        </Panel>
        <Panel title="Visitors by country">
          {mapPoints.length ? (
            <WorldMap points={mapPoints} />
          ) : (
            <Empty icon="globe" title="No geolocated sessions yet">
              Country is set by the /api/collect edge function from Vercel's geo headers — it fills in once traffic hits production.
            </Empty>
          )}
        </Panel>
      </div>

      <div className="split split--3">
        <Panel title="Top countries">
          {countries.length ? (
            <RankList
              items={countries.map((c) => ({ key: c.label, label: c.label, value: c.sessions }))}
              renderLabel={(i) => <><span className="flag">{flagEmoji(i.label)}</span> {countryName(i.label)}</>}
            />
          ) : (
            <p className="muted">No data yet.</p>
          )}
        </Panel>

        <Panel
          title="Breakdown"
          actions={
            <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
              {DIMENSIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          }
        >
          {dimRows.length ? (
            <RankList items={dimRows.map((r) => ({ key: r.label, label: r.label, value: r.sessions }))} />
          ) : (
            <p className="muted">No data yet.</p>
          )}
        </Panel>

        <Panel title="Top referrers">
          {referrers.length ? (
            <RankList items={referrers.map((r) => ({ key: r.label, label: r.label, value: r.sessions }))} empty="Mostly direct traffic." />
          ) : (
            <p className="muted">Mostly direct traffic.</p>
          )}
        </Panel>
      </div>

      <Panel title="Top pages">
        {topPaths.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Path</th><th className="num">Views</th><th className="num">Visitors</th></tr></thead>
              <tbody>
                {topPaths.map((p) => (
                  <tr key={p.path}>
                    <td>{p.path}</td>
                    <td className="num">{p.views}</td>
                    <td className="num">{p.visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="globe" title="No pageviews in this window" />
        )}
      </Panel>

      <Panel title="Live sessions" actions={<span className="cell-sub">Refreshes every 10s</span>}>
        {!live.length ? (
          <Empty icon="traffic" title="No one on the site right now" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Location</th><th>Page</th><th>Channel</th><th>Device</th><th>Referrer</th><th>Seen</th></tr></thead>
              <tbody>
                {live.map((s) => (
                  <tr key={s.id}>
                    <td>{s.country ? <><span className="flag">{flagEmoji(s.country)}</span> {countryName(s.country)}{s.city ? `, ${s.city}` : ""}</> : "—"}</td>
                    <td>{s.landing_path || "—"}</td>
                    <td>{s.channel ? <Pill value={s.channel} tone="info" /> : "—"}</td>
                    <td>{s.device || "—"}</td>
                    <td className="cell-sub">{hostnameOf(s.referrer)}</td>
                    <td className="cell-sub">{relativeTime(s.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <TrafficRules onMessage={show} />
      <TrafficAlerts onMessage={show} />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

const RULE_KINDS = ["block", "allow", "bot", "channel"];
const MATCH_TYPES = ["ip", "country", "referrer", "user_agent", "path", "utm_source"];
const ruleEmpty = { kind: "block", match_type: "referrer", pattern: "", channel: "", note: "" };

function TrafficRules({ onMessage }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(ruleEmpty);
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("traffic_rules").select("*").order("priority", { ascending: true });
    if (!error) setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    const { error } = await supabase.from("traffic_rules").insert({
      kind: form.kind,
      match_type: form.match_type,
      pattern: form.pattern.trim(),
      channel: form.kind === "channel" ? form.channel.trim() : null,
      note: form.note.trim() || null,
    });
    if (error) { onMessage(error.message, false); return; }
    onMessage("Rule added.");
    setForm(ruleEmpty);
    setAdding(false);
    load();
  }

  async function toggle(row) {
    await supabase.from("traffic_rules").update({ enabled: !row.enabled }).eq("id", row.id);
    load();
  }

  async function remove(row) {
    if (!confirm(`Remove rule "${row.pattern}"?`)) return;
    await supabase.from("traffic_rules").delete().eq("id", row.id);
    onMessage("Rule removed.");
    load();
  }

  return (
    <Panel
      title="Traffic rules"
      actions={<button type="button" className="btn btn--sm" onClick={() => setAdding((a) => !a)}><Icon name="plus" />New rule</button>}
    >
      <p className="cell-sub" style={{ marginTop: -8 }}>
        Applied by the /api/collect edge function on every hit — block/allow lists, bot detection, and referrer/UTM → channel mapping.
      </p>

      {adding ? (
        <form className="form-grid" onSubmit={add}>
          <label>Kind
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {RULE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Match on
            <select value={form.match_type} onChange={(e) => setForm({ ...form, match_type: e.target.value })}>
              {MATCH_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Pattern (substring match)
            <input value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} required placeholder="e.g. google., 103.21., headless" />
          </label>
          {form.kind === "channel" ? (
            <label>Channel name
              <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} required placeholder="e.g. Organic" />
            </label>
          ) : null}
          <label className="full">Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" /></label>
          <div className="form-actions full">
            <button className="btn" type="submit">Add rule</button>
            <button className="btn btn--ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      {rows === null ? (
        <Skeleton rows={3} />
      ) : !rows.length ? (
        <Empty icon="security" title="No rules yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kind</th><th>Match</th><th>Pattern</th><th>Channel</th><th className="num">Hits</th><th>Enabled</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Pill value={r.kind} tone={r.kind === "block" ? "danger" : r.kind === "allow" ? "success" : r.kind === "bot" ? "warning" : "info"} /></td>
                  <td className="cell-sub">{r.match_type}</td>
                  <td><code>{r.pattern}</code></td>
                  <td>{r.channel || "—"}</td>
                  <td className="num">{r.hits}</td>
                  <td>
                    <button type="button" className="linkish" onClick={() => toggle(r)}>{r.enabled ? "On" : "Off"}</button>
                  </td>
                  <td className="actions">
                    <button type="button" className="linkish" onClick={() => remove(r)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const METRICS = ["sessions", "pageviews", "country", "channel", "referrer"];
const alertEmpty = { name: "", metric: "sessions", dimension: "", comparator: "gt", threshold: 50, window_minutes: 60 };

function TrafficAlerts({ onMessage }) {
  const [rows, setRows] = useState(null);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(alertEmpty);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);

  async function load() {
    const [a, e] = await Promise.all([
      supabase.from("traffic_alerts").select("*").order("created_at", { ascending: false }),
      supabase.from("traffic_alert_events").select("*, traffic_alerts(name)").order("created_at", { ascending: false }).limit(15),
    ]);
    if (!a.error) setRows(a.data || []);
    if (!e.error) setEvents(e.data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    const { error } = await supabase.from("traffic_alerts").insert({
      name: form.name.trim(),
      metric: form.metric,
      dimension: ["country", "channel", "referrer"].includes(form.metric) ? form.dimension.trim() : null,
      comparator: form.comparator,
      threshold: Number(form.threshold),
      window_minutes: Number(form.window_minutes),
    });
    if (error) { onMessage(error.message, false); return; }
    onMessage("Alert created.");
    setForm(alertEmpty);
    setAdding(false);
    load();
  }

  async function toggle(row) {
    await supabase.from("traffic_alerts").update({ enabled: !row.enabled }).eq("id", row.id);
    load();
  }

  async function remove(row) {
    if (!confirm(`Delete alert "${row.name}"?`)) return;
    await supabase.from("traffic_alerts").delete().eq("id", row.id);
    load();
  }

  async function checkNow() {
    setChecking(true);
    const { data, error } = await supabase.rpc("evaluate_traffic_alerts");
    setChecking(false);
    if (error) { onMessage(error.message, false); return; }
    onMessage(data?.length ? `${data.length} alert(s) breached.` : "No thresholds breached.");
    load();
  }

  return (
    <Panel
      title="Alerts"
      actions={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={checkNow} disabled={checking}>
            <Icon name="refresh" />{checking ? "Checking…" : "Check now"}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setAdding((a) => !a)}><Icon name="plus" />New alert</button>
        </>
      }
    >
      <p className="cell-sub" style={{ marginTop: -8 }}>
        Fires when a metric crosses a threshold within a rolling window — e.g. sessions &gt; 200 in 60 minutes, or a country/referrer spike.
      </p>

      {adding ? (
        <form className="form-grid" onSubmit={add}>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Traffic spike" /></label>
          <label>Metric
            <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          {["country", "channel", "referrer"].includes(form.metric) ? (
            <label>Dimension value<input value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} required placeholder={form.metric === "country" ? "e.g. IN" : "e.g. Organic"} /></label>
          ) : <span />}
          <label>Comparator
            <select value={form.comparator} onChange={(e) => setForm({ ...form, comparator: e.target.value })}>
              <option value="gt">greater than</option>
              <option value="lt">less than</option>
            </select>
          </label>
          <label>Threshold<input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} required /></label>
          <label>Window (minutes)<input type="number" value={form.window_minutes} onChange={(e) => setForm({ ...form, window_minutes: e.target.value })} required /></label>
          <div className="form-actions full">
            <button className="btn" type="submit">Create alert</button>
            <button className="btn btn--ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="split">
        <div>
          {rows === null ? (
            <Skeleton rows={2} />
          ) : !rows.length ? (
            <Empty icon="alert" title="No alerts configured" />
          ) : (
            <ul className="list">
              {rows.map((r) => (
                <li key={r.id}>
                  <span>
                    <span className="cell-strong">{r.name}</span>
                    <div className="cell-sub">
                      {r.metric}{r.dimension ? ` = ${r.dimension}` : ""} {r.comparator === "gt" ? ">" : "<"} {r.threshold} / {r.window_minutes}m
                    </div>
                  </span>
                  <div className="actions">
                    <button type="button" className="linkish" onClick={() => toggle(r)}>{r.enabled ? "On" : "Off"}</button>
                    <button type="button" className="linkish" onClick={() => remove(r)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {!events.length ? (
            <Empty icon="alert" title="No breaches recorded" />
          ) : (
            <ul className="list">
              {events.map((e) => (
                <li key={e.id}>
                  <span>
                    <span className="cell-strong">{e.traffic_alerts?.name || "Alert"}</span>
                    <div className="cell-sub">{e.observed} vs {e.threshold} · {relativeTime(e.created_at)}</div>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
