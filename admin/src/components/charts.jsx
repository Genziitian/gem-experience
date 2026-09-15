import { useMemo, useState } from "react";

/* A dependency-free area/line chart. Takes { label, value } points and draws
   an SVG path by hand — enough for a dashboard sparkline, not a charting
   library. */
export function AreaChart({ data, height = 180, formatValue = (v) => v, formatLabel = (l) => l }) {
  const [hover, setHover] = useState(null);
  const width = 640;
  const padL = 34, padR = 10, padT = 12, padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1]?.x ?? padL},${padT + innerH} L${padL},${padT + innerH} Z`;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => {
    const y = padT + (innerH / gridLines) * i;
    const value = Math.round(max - (max / gridLines) * i);
    return { y, value };
  });

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div style={{ position: "relative" }}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
           onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <line key={i} className="chart-grid" x1={padL} x2={width - padR} y1={t.y} y2={t.y} />
        ))}
        {ticks.map((t, i) => (
          <text key={i} className="chart-axis" x={4} y={t.y + 3}>{formatValue(t.value)}</text>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={i} className="chart-axis" x={p.x} y={height - 6} textAnchor="middle">
              {formatLabel(p.label)}
            </text>
          ) : null
        )}
        {data.length > 1 ? <path className="chart-area" d={area} /> : null}
        {data.length > 1 ? <path className="chart-line" d={line} /> : null}
        {points.map((p, i) => (
          <circle
            key={i}
            className="chart-dot"
            cx={p.x}
            cy={p.y}
            r={hover === i ? 4 : 0}
          />
        ))}
        {points.map((p, i) => (
          <rect
            key={"h" + i}
            x={p.x - stepX / 2}
            y={padT}
            width={Math.max(stepX, 4)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && points[hover] ? (
        <div
          style={{
            position: "absolute",
            left: `${(points[hover].x / width) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
            background: "var(--text)",
            color: "var(--surface)",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {formatLabel(points[hover].label)} · {formatValue(points[hover].value)}
        </div>
      ) : null}
    </div>
  );
}

/* Small horizontal bar chart for hour-of-day / weekday distributions. */
export function BarRow({ data, formatLabel = (l) => l }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 640, height = 120, padL = 4, padB = 18;
  const barW = (width - padL) / data.length;
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - padB - 6);
        return (
          <g key={i}>
            <rect
              className="chart-bar"
              x={padL + i * barW + 1}
              y={height - padB - h}
              width={Math.max(barW - 2, 1)}
              height={h}
              rx={2}
            />
            {i % Math.max(1, Math.ceil(data.length / 12)) === 0 ? (
              <text className="chart-axis" x={padL + i * barW + barW / 2} y={height - 4} textAnchor="middle">
                {formatLabel(d.label)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* Equirectangular world map, built once from a compact land-outline path so
   we don't pull in a mapping library for a handful of session bubbles.
   Coordinates below are simple lon/lat -> x/y projections. */
const MAP_W = 720, MAP_H = 360;

function project([lon, lat]) {
  return [((lon + 180) / 360) * MAP_W, ((90 - lat) / 180) * MAP_H];
}

export function WorldMap({ points, onSelect }) {
  const graticule = useMemo(() => {
    const lines = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = project([lon, 0]);
      lines.push(`M${x},0 L${x},${MAP_H}`);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = project([0, lat]);
      lines.push(`M0,${y} L${MAP_W},${y}`);
    }
    return lines.join(" ");
  }, []);

  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className="map-wrap">
      <svg className="chart" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Visitors by location">
        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="var(--surface-2)" />
        <path className="map-graticule" d={graticule} />
        <rect x="0.5" y="0.5" width={MAP_W - 1} height={MAP_H - 1} fill="none" stroke="var(--border)" />
        {points.map((p, i) => {
          if (p.lon == null || p.lat == null) return null;
          const [x, y] = project([p.lon, p.lat]);
          const r = 4 + Math.sqrt(p.value / max) * 16;
          return (
            <circle
              key={i}
              className="map-bubble"
              cx={x}
              cy={y}
              r={r}
              onClick={() => onSelect && onSelect(p)}
            >
              <title>{`${p.label}: ${p.value.toLocaleString()} visitors`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
