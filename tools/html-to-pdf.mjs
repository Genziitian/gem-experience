#!/usr/bin/env node
/* Print a handover document (docs/handover/*.html) to PDF with headless Chrome,
 * page numbers in the footer:
 *   node tools/html-to-pdf.mjs docs/handover/admin-sop.html "Gem Experience - Admin Panel SOP.pdf" "Footer label"
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const [src, out, label] = process.argv.slice(2);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--remote-debugging-port=9334", "--user-data-dir=" + fs.mkdtempSync(path.join(os.tmpdir(), "pdf-")), "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 50; i++) { try { list = await (await fetch("http://127.0.0.1:9334/json/list")).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = {};
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.navigate", { url: pathToFileURL(path.resolve(src)).href });
await sleep(2500);
const r = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font:8px Helvetica,Arial;color:#8a8279;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${label || "Gem Experience"}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>` });
fs.writeFileSync(out, Buffer.from(r.result.data, "base64"));
chrome.kill(); process.exit(0);
