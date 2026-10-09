/* Runs the Vercel-style handlers on a plain Node server, for the VPS deploy.
 *
 * nginx proxies /api/collect here and fills in the x-vercel-ip-* headers from
 * its GeoIP database, so collect.js reads the same headers it does on Vercel.
 * This only adds the two Vercel helpers it uses (res.status, res.json) and the
 * parsed body.
 *
 * Env: PORT (default 3001), plus whatever the handlers need.
 */

import { createServer } from "node:http";
import collect from "./collect.js";

const PORT = Number(process.env.PORT || 3001);
const MAX_BODY = 64 * 1024;
const routes = { "/api/collect": collect };

createServer((req, res) => {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (data) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  const handler = routes[new URL(req.url, "http://localhost").pathname];
  if (!handler) return res.status(404).json({ error: "Not found" });

  /* Vercel URL-encodes the city; nginx passes the raw UTF-8 bytes, which Node
     reads as latin1. Re-encode so collect.js's decodeURIComponent gets "São Paulo". */
  const city = req.headers["x-vercel-ip-city"];
  if (city) {
    req.headers["x-vercel-ip-city"] = encodeURIComponent(Buffer.from(city, "latin1").toString("utf8"));
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) req.destroy();
  });
  req.on("end", async () => {
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    try {
      await handler(req, res);
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: String(err.message || err) });
    }
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`api listening on 127.0.0.1:${PORT}`);
});
