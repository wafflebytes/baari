// Shoots the deck's phone screens the way the README's are shot (docs/diagrams/screens.mjs):
// the local app at iPhone size (393 x 852) with the iPhone's safe areas written into its
// CSS (59 top, 34 bottom), so the header and dock sit where they do on a phone, and the
// status bar drawn into the shot. No home bar. The frame on the slide adds the hardware.
// Each screen replays its recorded shot file (film/shots/) up to the still it names.
//
//   node shoot.mjs [key ...]      writes assets/screens/<key>.jpg (786 px wide)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const here = path.dirname(new URL(import.meta.url).pathname);
const app = path.resolve(here, "../../app"), shots = path.resolve(here, "../shots"), out = path.join(here, "assets/screens");
const INSET = { top: 59, bottom: 34 };
// key, shot file, the still to stop at, clock, theme
const SCREENS = [
  ["island", "island/CA17.json", "poster", "9:33", "light"],
  ["deck", "island/CA17b.json", "question", "9:34", "light"],
  ["haan", "island/CA35-CA36.json", "haan", "9:35", "light"],
  ["badlo", "ghar/CA20.json", "poster", "9:31", "light"],
  ["cuisine", "ghar/CA25.json", "poster", "8:12", "light"],
  ["voice", "ghar/CA26.json", "poster", "8:14", "light"],
  ["khata", "screens/CA71-CA42-CA47.json", "poster", "9:36", "light"],
  ["eating", "island/CA68.json", "poster", "8:40", "light"],
  ["reminders", "screens/CA70.json", "poster", "8:02", "light"],
  ["seekha", "ghar/CA66-CA65.json", "poster", "9:12", "light"],
  ["kyun", "ghar/CA66-CA65.json", "kyun", "9:13", "light"],
  ["call", "island/CA64.json", "poster", "9:20", "dark"],
  ["karaoke", "onboard/CA76.json", "poster", "7:41", "light"],
  ["raatbhar", "screens/CA50.json", "poster", "6:40", "light"],
  ["kirana", "screens/CA51.json", "kirana", "7:38", "light"],
  ["receipt", "screens/CA55.json", "poster", "9:50", "light"],
];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

// the README's status bar (screens.mjs statusBar), without the home bar
const statusBar = (clock, ink) => {
  const c = ink === "light" ? "#fff" : "#000";
  return `<div style="position:fixed;inset:0;pointer-events:none;z-index:2147483647;color:${c};font:600 17px/1 -apple-system,'SF Pro Text',Inter,sans-serif;letter-spacing:-.3px">
  <div style="position:absolute;left:0;width:128px;top:17px;height:25px;display:flex;align-items:center;justify-content:center">${clock}</div>
  <div style="position:absolute;right:30px;top:17px;height:25px;display:flex;align-items:center;gap:6px">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="${c}"><rect x="0" y="7.5" width="3" height="4.5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="${c}"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6 10.2 10.2 0 0 0 .8 3.5L2 4.7a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.5 0 1 .2 1.3.5L8 11.4 6.7 9.6c.3-.3.8-.5 1.3-.5Z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.8" stroke="${c}" stroke-opacity=".4"/><rect x="2" y="2" width="16" height="9" rx="2.4" fill="${c}"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="${c}" fill-opacity=".45"/></svg>
  </div>
</div>`;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const want = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"] });
for (const [key, file, still, clock, theme] of SCREENS) {
  if (want.length && !want.includes(key)) continue;
  const shot = JSON.parse(fs.readFileSync(path.join(shots, file), "utf8"));
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
  // serve app/ itself; the safe areas go into app.css
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.host !== "baari.local") return req.continue();
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(app, p);
    if (!f.startsWith(app) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return req.respond({ status: 404, body: "" });
    let body = fs.readFileSync(f);
    if (p.endsWith(".css")) body = body.toString().replaceAll("env(safe-area-inset-top)", `${INSET.top}px`).replaceAll("env(safe-area-inset-bottom)", `${INSET.bottom}px`);
    req.respond({ status: 200, body, contentType: TYPES[path.extname(f)] || "application/octet-stream" });
  });
  await page.evaluateOnNewDocument((t, peeks) => {
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "*{cursor:none!important;caret-color:transparent}"; document.head.appendChild(s); });
    try { localStorage.setItem("baari:theme", t); localStorage.setItem("baari:install-later", String(Date.now())); if (!peeks) { sessionStorage.setItem("baari:peek", "1"); sessionStorage.setItem("baari:autoisl", "1"); } } catch {}
  }, theme, !!shot.peeks);
  for (const [k, v] of Object.entries(shot.storage || {})) await page.evaluateOnNewDocument((k, v) => { try { localStorage.setItem(k, v); } catch {} }, k, typeof v === "string" ? v : JSON.stringify(v));
  await page.goto("http://baari.local" + (shot.open || "/?fixture=sync"), { waitUntil: "networkidle2" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await wait(shot.settle_ms || 1200);
  const point = async (t) => {
    if (Array.isArray(t)) return { x: t[0], y: t[1] };
    const h = await page.waitForSelector(t, { timeout: 8000, visible: true });
    await h.evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "nearest" }));
    const b = await h.boundingBox();
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
  };
  const settle = async (max = 3000) => {
    const end = Date.now() + max;
    while (Date.now() < end) { if (!(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect && a.effect.getTiming().iterations !== Infinity).length))) break; await wait(60); }
    await wait(100);
  };
  let done = false;
  try {
    for (const s of shot.steps || []) {
      if (s.wait) await wait(s.wait);
      else if (s.tap) { const p = await point(s.tap); await page.mouse.click(p.x, p.y, { delay: 90 }); await wait(s.after || 700); }
      else if (s.hold) { const p = await point(s.hold); await page.mouse.move(p.x, p.y); await page.mouse.down(); await wait(s.ms || 1200); await page.mouse.up(); await wait(s.after || 600); }
      else if (s.swipe) {
        const [x1, y1, x2, y2] = Array.isArray(s.swipe[0]) ? [...s.swipe[0], ...s.swipe[1]] : s.swipe.length === 2 ? await (async () => { const p = await point(s.swipe[0]); return [p.x, p.y, p.x + s.swipe[1][0], p.y + s.swipe[1][1]]; })() : s.swipe;
        await page.mouse.move(x1, y1); await page.mouse.down();
        for (let i = 1; i <= 14; i++) { await page.mouse.move(x1 + ((x2 - x1) * i) / 14, y1 + ((y2 - y1) * i) / 14); await wait((s.ms || 350) / 14); }
        await page.mouse.up(); await wait(s.after || 700);
      }
      else if (s.scroll) { for (let i = 0; i < 30; i++) { await page.mouse.wheel({ deltaY: s.scroll / 30 }); await wait((s.ms || 900) / 30); } await wait(s.after || 500); }
      else if (s.type) { await page.keyboard.type(s.type, { delay: s.delay || 70 }); await wait(s.after || 400); }
      else if (s.eval) { await page.evaluate(s.eval); await wait(s.after || 600); }
      else if (s.waitfor) { await page.waitForSelector(s.waitfor, { timeout: s.ms || 10000, visible: true }); await wait(s.after || 300); }
      else if (s.click) { await page.evaluate((sel) => document.querySelector(sel).click(), s.click); await wait(s.after || 700); }
      else if (s.key) { await page.keyboard.press(s.key); await wait(s.after || 400); }
      else if (s.shot === still) { if (s.settle !== false) await settle(s.max || 3000); done = true; break; }
    }
  } catch (e) { console.log(key, "step failed:", e.message.slice(0, 120)); }
  if (!done) console.log(key, `never reached the "${still}" still; shooting where it stopped`);
  // the bar's ink follows what's behind it (a dark sheet on a light theme gets white ink)
  const dark = await page.evaluate(() => {
    for (let e = document.elementFromPoint(64, 29); e; e = e.parentElement) {
      const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] === undefined || +m[3] > 0.5)) return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] < 128;
    }
    return false;
  });
  await page.evaluate((h) => document.body.insertAdjacentHTML("beforeend", h), statusBar(clock, dark ? "light" : "dark"));
  const png = path.join(out, `${key}.png`);
  await page.screenshot({ path: png });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", png, "-q:v", "3", png.replace(/\.png$/, ".jpg")]);
  fs.unlinkSync(png);
  console.log("shot", key);
  await page.close();
}
await browser.close();
