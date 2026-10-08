// Final frames of every slide to PNG, then to Baari_finale.pdf.
//   node export.mjs --png [s01 s08 ...]   out/<id>.png at 1920 x 1080 (add --4k for 3840 x 2160)
//   node export.mjs --pdf                  out/4k/*.png joined into out/Baari_finale.pdf
//   node export.mjs --at s01 0,1.2,2.6     stills at given times, for the three-still check
// Needs the deck served at BASE (default http://localhost:8741/), e.g. python3 -m http.server 8741.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const BASE = process.env.BASE || "http://localhost:8741/film/deck/";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
const k4 = args.includes("--4k");
const scale = k4 ? 2 : 1;
const out = path.resolve(k4 ? "out/4k" : "out");
fs.mkdirSync(out, { recursive: true });
const order = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10a", "s10", "s11", "s12", "s13", "s14", "s15", "s16", "s17", "s18", "a01", "a02", "a03", "a04", "a05", "a06", "a07"];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"] });
async function still(id, query, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("requestfailed", (r) => errs.push(`failed ${r.url()}`));
  const file_ = id.replace(/^s10a$/, "s10");
  await page.goto(`${BASE}${file_}.html?${query}${id === "s10a" ? "&beat=1" : ""}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 15000 }).catch(() => errs.push("never ready"));
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: file });
  await page.close();
  if (errs.length) console.log(id, "ERRORS", errs.join(" | "));
  else console.log(id, "->", path.relative(process.cwd(), file));
}

if (args.includes("--at")) {
  const i = args.indexOf("--at");
  const id = args[i + 1];
  for (const t of args[i + 2].split(",")) await still(id, `t=${t}`, `${out}/${id}-t${t}.png`);
} else if (args.includes("--png")) {
  const ids = args.filter((a) => /^[sa]\d/.test(a));
  for (const id of ids.length ? ids : order) {
    const f = id.replace(/^s10a$/, "s10");
    if (!fs.existsSync(`${f}.html`)) continue;
    await still(id, "print", `${out}/${id}.png`);
  }
} else if (args.includes("--pdf")) {
  const pdf = await PDFDocument.create();
  for (const id of order) {
    const f = `out/4k/${id}.png`;
    if (!fs.existsSync(f)) continue;
    const png = await pdf.embedPng(fs.readFileSync(f));
    const pg = pdf.addPage([1920, 1080]);
    pg.drawImage(png, { x: 0, y: 0, width: 1920, height: 1080 });
  }
  fs.writeFileSync("out/Baari_finale.pdf", await pdf.save());
  console.log("out/Baari_finale.pdf", pdf.getPageCount(), "pages");
}
await browser.close();
