/* Analytics collector.
 *
 * The storefront beacons here instead of writing to Supabase directly, so the
 * visitor's country comes from Vercel's edge headers rather than a third-party
 * IP lookup, and so bot/block rules are applied somewhere a visitor can't skip.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (falls back to
 * SUPABASE_ANON_KEY, which the RLS insert policies already allow),
 * ANALYTICS_IP_SALT.
 */

import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const IP_SALT = process.env.ANALYTICS_IP_SALT || "gem-experience";

/* Rules change rarely and this runs on every pageview, so keep them in module
   scope — warm invocations reuse the fetch. */
let rulesCache = { at: 0, rules: [] };
const RULES_TTL_MS = 60_000;

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function getRules() {
  if (Date.now() - rulesCache.at < RULES_TTL_MS) return rulesCache.rules;
  const rules = await sb(
    "traffic_rules?select=kind,match_type,pattern,channel,priority&enabled=eq.true&order=priority.asc"
  );
  rulesCache = { at: Date.now(), rules };
  return rules;
}

function valueFor(matchType, ctx) {
  switch (matchType) {
    case "ip": return ctx.ip;
    case "country": return ctx.country;
    case "referrer": return ctx.referrer;
    case "user_agent": return ctx.userAgent;
    case "path": return ctx.path;
    case "utm_source": return ctx.utm.utm_source;
    default: return "";
  }
}

function matches(rule, ctx) {
  const value = (valueFor(rule.match_type, ctx) || "").toLowerCase();
  if (!value) return false;
  return value.includes(String(rule.pattern).toLowerCase());
}

/* Referrer + UTM -> channel, the way GA groups them. Admin-defined channel
   rules win; this is the fallback when none matched. */
function defaultChannel(ctx) {
  const medium = (ctx.utm.utm_medium || "").toLowerCase();
  if (["cpc", "ppc", "paid", "paidsearch", "display"].includes(medium)) return "Paid";
  if (medium === "email") return "Email";
  if (ctx.utm.utm_source) return "Campaign";
  if (!ctx.referrer) return "Direct";
  try {
    if (new URL(ctx.referrer).hostname === ctx.host) return "Direct";
  } catch {
    /* a malformed referrer is just an unknown one */
  }
  return "Referral";
}

function parseUA(ua = "") {
  const s = ua.toLowerCase();
  const device = /ipad|tablet/.test(s) ? "Tablet"
    : /mobi|iphone|android/.test(s) ? "Mobile"
    : "Desktop";
  const browser = /edg\//.test(s) ? "Edge"
    : /opr\//.test(s) ? "Opera"
    : /chrome\//.test(s) ? "Chrome"
    : /safari/.test(s) ? "Safari"
    : /firefox/.test(s) ? "Firefox"
    : "Other";
  const os = /windows/.test(s) ? "Windows"
    : /mac os|macintosh/.test(s) ? "macOS"
    : /android/.test(s) ? "Android"
    : /iphone|ipad|ios/.test(s) ? "iOS"
    : /linux/.test(s) ? "Linux"
    : "Other";
  return { device, browser, os };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Collector is not configured" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const sessionKey = String(body.sessionKey || "").slice(0, 128);
  const path = String(body.path || "/").slice(0, 512);
  if (!sessionKey) return res.status(400).json({ error: "sessionKey required" });

  const headers = req.headers;
  const ip = String(headers["x-forwarded-for"] || "").split(",")[0].trim();
  const userAgent = String(headers["user-agent"] || "").slice(0, 512);
  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};

  const ctx = {
    ip,
    userAgent,
    path,
    utm,
    referrer: String(body.referrer || "").slice(0, 512),
    country: String(headers["x-vercel-ip-country"] || "").toUpperCase(),
    city: decodeURIComponent(String(headers["x-vercel-ip-city"] || "")),
    region: String(headers["x-vercel-ip-country-region"] || ""),
    host: String(headers["x-forwarded-host"] || headers.host || ""),
  };

  let rules = [];
  try {
    rules = await getRules();
  } catch {
    /* Rules are an enrichment. If they can't be read the hit still counts. */
  }

  const isBot = rules.some((r) => r.kind === "bot" && matches(r, ctx));
  const blocked =
    rules.some((r) => r.kind === "block" && matches(r, ctx)) &&
    !rules.some((r) => r.kind === "allow" && matches(r, ctx));
  const channelRule = rules.find((r) => r.kind === "channel" && matches(r, ctx));
  const channel = channelRule ? channelRule.channel : defaultChannel(ctx);
  const { device, browser, os } = parseUA(userAgent);

  try {
    const now = new Date().toISOString();
    const [existing] = await sb(
      `analytics_sessions?select=id,pageviews&session_key=eq.${encodeURIComponent(sessionKey)}&limit=1`
    );

    let sessionId;
    if (existing) {
      sessionId = existing.id;
      await sb(`analytics_sessions?id=eq.${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_seen: now,
          pageviews: (existing.pageviews || 0) + 1,
        }),
      });
    } else {
      const [created] = await sb("analytics_sessions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          session_key: sessionKey,
          first_seen: now,
          last_seen: now,
          user_agent: userAgent,
          referrer: ctx.referrer || null,
          country: ctx.country || null,
          city: ctx.city || null,
          region: ctx.region || null,
          channel,
          source: utm.utm_source || null,
          medium: utm.utm_medium || null,
          campaign: utm.utm_campaign || null,
          utm,
          landing_path: path,
          device,
          browser,
          os,
          ip_hash: ip ? createHash("sha256").update(IP_SALT + ip).digest("hex").slice(0, 32) : null,
          is_bot: isBot,
          blocked,
          pageviews: 1,
        }),
      });
      sessionId = created.id;
    }

    await sb("analytics_events", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        path,
        referrer: ctx.referrer || null,
        utm,
        event_type: String(body.eventType || "pageview").slice(0, 40),
        title: body.title ? String(body.title).slice(0, 256) : null,
        meta: body.meta && typeof body.meta === "object" ? body.meta : {},
      }),
    });

    return res.status(204).end();
  } catch (err) {
    /* Never let analytics break a page load. */
    return res.status(200).json({ ok: false, error: String(err.message || err) });
  }
}
