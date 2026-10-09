// Measures island lines in the real fonts, so the pill's width lands on known numbers
// instead of being read from the DOM at render time. Serves the repo itself on a free
// port. Writes assets/island-widths.json (a cache; build.mjs calls this when a line is new).
// build.mjs runs it for any island line it hasn't measured yet.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { chrome } from "./chrome.mjs";

const ROOT = path.resolve("../..");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };

export async function measure(items) {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    fs.readFile(f, (e, b) => (e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }), r.end(b))));
  });
  await new Promise((ok) => srv.listen(0, ok));
  const b = await puppeteer.launch({ executablePath: chrome(), headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto(`http://localhost:${srv.address().port}/film/trailer/compositions/measure.html`, { waitUntil: "networkidle0" });
  const out = await p.evaluate(async (items) => {
    await document.fonts.ready;
    const o = {};
    for (const h of items) {
      const s = document.createElement("span");
      s.className = "t";
      s.innerHTML = h;
      document.querySelector(".island").appendChild(s);
      o[h] = Math.ceil(s.getBoundingClientRect().width);
      s.remove();
    }
    return o;
  }, items);
  await b.close();
  srv.close();
  return out;
}

