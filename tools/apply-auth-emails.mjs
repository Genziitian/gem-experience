#!/usr/bin/env node
/* Upload the house-design sign-in emails to the Supabase project.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node tools/apply-auth-emails.mjs
 *
 * Sends only what tools/build-auth-emails.mjs wrote to
 * supabase/auth-emails/auth-config.json: the email subjects, the templates and
 * the code length. The Management API's PATCH changes the fields it is given
 * and nothing else, so SMTP, redirect URLs, providers and every other Auth
 * setting stay exactly as they are. (`supabase config push` would instead
 * push a whole local config.toml over the project's.)
 *
 * Before writing, the project's current subjects and templates are saved to
 * supabase/auth-emails/.previous-<date>.json (git-ignored) so the change can
 * be undone by PATCHing that file back. Only mailer_* fields are kept there:
 * the full Auth config also holds provider secrets.
 *
 * The token is a personal access token (supabase.com/dashboard/account/tokens).
 * It is read from the environment and never printed or written anywhere.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "supabase/auth-emails");
const cfg = fs.readFileSync(path.join(ROOT, "frontend/js/config.js"), "utf8");
const REF = cfg.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Set SUPABASE_ACCESS_TOKEN first (supabase.com/dashboard/account/tokens).");
  process.exit(1);
}

const api = async (method, body) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} config/auth: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

const payload = JSON.parse(fs.readFileSync(path.join(DIR, "auth-config.json"), "utf8"));
const keys = Object.keys(payload);

const before = await api("GET");
const backup = Object.fromEntries(keys.map((k) => [k, before[k]]));
const backupFile = path.join(DIR, `.previous-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
console.log(`Project ${REF}. Current templates saved to ${path.relative(ROOT, backupFile)}.`);
console.log(`Custom SMTP: ${before.smtp_host ? "on (" + before.smtp_host + ")" : "off — Supabase's own mailer is used"}.`);

const changed = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(payload[k]));
if (!changed.length) { console.log("Already up to date: nothing to send."); process.exit(0); }
console.log(`Updating ${changed.length} of ${keys.length} fields…`);

await api("PATCH", Object.fromEntries(changed.map((k) => [k, payload[k]])));

const after = await api("GET");
const wrong = keys.filter((k) => JSON.stringify(after[k]) !== JSON.stringify(payload[k]));
if (wrong.length) {
  console.error(`Not applied: ${wrong.join(", ")}`);
  process.exit(1);
}
console.log("Done: every subject and template now matches supabase/auth-emails.");
