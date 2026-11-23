#!/usr/bin/env node
/* Tell Bing (and the other IndexNow engines: Yandex, Seznam, Naver) that
 * pages changed, instead of waiting for them to recrawl.
 *
 *   node tools/indexnow.mjs              # every URL in the sitemap
 *   node tools/indexnow.mjs /icons/ /fine-jewellery/p/gd26-806/
 *
 * Run it after a deploy, never before: the engines fetch the key file and the
 * pages straight away. The key is public by design; it only proves the
 * submission comes from whoever controls gem-experience.com.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "gem-experience.com";
const KEY = "3b2fb9d2f58a973ab1a2fb8881d06048";

const args = process.argv.slice(2);
const urls = args.length
  ? args.map((u) => (u.startsWith("http") ? u : `https://${HOST}${u}`))
  : [...fs.readFileSync(path.join(ROOT, "frontend/sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1]).filter((u) => !/\.(webp|jpe?g|png)$/.test(u));

for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`IndexNow: ${res.status} ${res.statusText} for ${Math.min(urls.length - i, 10000)} URLs`);
  if (res.status >= 400) console.log(await res.text());
}
