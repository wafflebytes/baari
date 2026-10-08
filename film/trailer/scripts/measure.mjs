// Measures every island cue's text in the real fonts, so the pill's width can be
// tweened between known numbers instead of read from the DOM at render time.
// Writes assets/island-widths.json. Needs the repo root served on :8741
// (python3 -m http.server 8741, from the repo root).
// Run from film/trailer: node scripts/measure.mjs
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { chrome } from "./chrome.mjs";

const T = JSON.parse(fs.readFileSync("timing.json", "utf8"));
const html = (c) => c.text + (c.sub ? ` <span class="sub">${c.sub}</span>` : "");
const items = [...new Set((T.island || []).filter((c) => !c.hide).map(html))];

const b = await puppeteer.launch({ executablePath: chrome(), headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.goto("http://localhost:8741/film/trailer/compositions/measure.html", { waitUntil: "networkidle0" });
const widths = await p.evaluate(async (items) => {
  await document.fonts.ready;
  const out = {};
  for (const h of items) {
    const s = document.createElement("span");
    s.className = "t";
    s.innerHTML = h;
    document.querySelector(".island").appendChild(s);
    out[h] = Math.ceil(s.getBoundingClientRect().width);
    s.remove();
  }
  return out;
}, items);
await b.close();
fs.writeFileSync("assets/island-widths.json", JSON.stringify(widths, null, 1));
console.log(widths);
