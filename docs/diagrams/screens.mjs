// Shoots the app screens the README strip (src/00-app.html) frames:
//   node docs/diagrams/screens.mjs [name ...]
// Serves app/ itself, runs each fixture at iPhone size (393 x 852) with the
// iPhone's safe areas (59 top, 34 bottom) so the header and dock sit where they
// do on a phone, and draws the status bar and home bar into the shot. The frame
// adds the hardware: bezel and island cutout. Writes docs/img/screens/<name>.webp
// and <name>-dark.webp at 2x. Needs Playwright (PLAYWRIGHT_MODULE overrides
// where it's imported from) and python3 with Pillow for the WebP step.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "../../app");
const out = path.resolve(here, "../img/screens");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const INSET = { top: 59, bottom: 34 };
// name, url, steps (click, waitfor a selector, wait ms), clock, status bar ink:
// "auto" follows the theme, "light" or "dark" forces it
const SHOTS = [
  ["vote", "/?fixture=shortlist", [], "9:04", "auto"],
  ["island", "/?fixture=sync", [["click", ".isl"], ["waitfor", ".it-th .it-m.b"], ["wait", 1400]], "9:33", "auto"],
  ["locked", "/?fixture=lock", [], "9:31", "auto"],
  ["khata", "/?fixture=sync#/khata", [["wait", 600]], "9:36", "auto"],
  ["delivery", "/?fixture=lock#/delivery", [["wait", 600]], "9:48", "auto"],
  ["sunita", "/?fixture=morning#/sunita", [["wait", 600]], "7:41", "auto"],
  ["day30", "/?fixture=day30", [], "9:12", "auto"],
];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

function statusBar(clock, ink) {
  const c = ink === "light" ? "#fff" : "#000";
  return `<div style="position:fixed;inset:0;pointer-events:none;z-index:2147483647;color:${c};font:600 17px/1 -apple-system,'SF Pro Text',Inter,sans-serif;letter-spacing:-.3px">
  <div style="position:absolute;left:0;width:128px;top:17px;height:25px;display:flex;align-items:center;justify-content:center">${clock}</div>
  <div style="position:absolute;right:30px;top:17px;height:25px;display:flex;align-items:center;gap:6px">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="${c}"><rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="${c}"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6 10.2 10.2 0 0 0 .8 3.5L2 4.7a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.5 0 1 .2 1.3.5L8 11.4 6.7 9.6c.3-.3.8-.5 1.3-.5Z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.8" stroke="${c}" stroke-opacity=".4"/><rect x="2" y="2" width="16" height="9" rx="2.4" fill="${c}"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="${c}" fill-opacity=".45"/></svg>
  </div>
  <div style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:${c}"></div>
</div>`;
}

const want = process.argv.slice(2);
const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [name, url, steps, clock, bar] of SHOTS) {
    if (want.length && !want.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: theme,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
    await ctx.route("http://baari.local/**", async (route) => {
      let p = decodeURIComponent(new URL(route.request().url()).pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(app, p);
      if (!file.startsWith(app) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: "" });
      let body = fs.readFileSync(file);
      if (p === "/app.css") body = body.toString().replaceAll("env(safe-area-inset-top)", `${INSET.top}px`).replaceAll("env(safe-area-inset-bottom)", `${INSET.bottom}px`);
      route.fulfill({ status: 200, body, contentType: TYPES[path.extname(file)] || "application/octet-stream" });
    });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem("baari:theme", t); localStorage.setItem("baari:install-later", String(Date.now())); sessionStorage.setItem("baari:peek", "1"); sessionStorage.setItem("baari:autoisl", "1"); } catch {}
      document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "*{cursor:none!important;caret-color:transparent}"; document.head.appendChild(s); });
    }, theme);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.error(name, e.message));
    await page.goto("http://baari.local" + url, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    // The app's face is Family (app/fonts). Without it the shots fall back to Inter.
    if (!(await page.evaluate(() => document.fonts.check('600 16px "Family"') && [...document.fonts].some((f) => f.family.replace(/"/g, "") === "Family" && f.status === "loaded"))))
      throw new Error(`${name}: the Family font didn't load, so this shot would use the fallback`);
    await page.waitForTimeout(1800);
    for (const [k, v] of steps) {
      if (k === "click") await page.click(v).catch((e) => console.error(name, "click", e.message));
      else if (k === "waitfor") await page.waitForSelector(v, { timeout: 15000 });
      else await page.waitForTimeout(v);
    }
    await page.waitForTimeout(500);
    const ink = bar === "auto" ? (theme === "dark" ? "light" : "dark") : bar;
    await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), statusBar(clock, ink));
    const png = path.join(out, `${name}${theme === "dark" ? "-dark" : ""}.png`);
    await page.screenshot({ path: png });
    const r = spawnSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],'WEBP',quality=88,method=6)", png, png.replace(/\.png$/, ".webp")], { stdio: "inherit" });
    if (r.status === 0) fs.unlinkSync(png);
    console.log("shot", path.relative(process.cwd(), png.replace(/\.png$/, ".webp")));
    await ctx.close();
  }
}
await browser.close();
