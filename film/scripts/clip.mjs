// Records one scripted clip of the app from a shot file, with no cursor and no
// touch dot (fingers are animated in post), and writes the tap log beside it.
//
//   node scripts/clip.mjs shots/app/CA42.json [--theme dark] [--take 2] [--base http://localhost:4174]
//
// A shot file:
//   { "id": "CA42", "demo": "A4", "shot": "01", "surface": "app",
//     "what": "The Pine Labs card: each request with its state",
//     "open": "/?fixture=sync", "theme": "light", "peeks": false,
//     "viewport": { "width": 393, "height": 852, "scale": 3 },
//     "steps": [ { "wait": 800 }, { "tap": ".nav a[data-tab=\"khata\"]" }, { "scroll": 420 },
//                { "tap": [196, 600] }, { "swipe": [300, 500, 80, 500] }, { "swipe": [".card", [-160, 0]] }, { "type": "kal kya banega" },
//                { "hold": "[data-mic]", "ms": 1500 }, { "eval": "location.hash='#/learn'" },
//                { "waitfor": ".islx" }, { "click": "[data-x]" }, { "key": "s" },
//                { "shot": "poster" }, { "shot": "mid", "settle": false } ] }
// "shot" waits for finite animations to end first; "settle": false takes it at once.
// "click" is a DOM click for elements a real tap can't reach (logged as synthetic).
//
// Output, in film/clips/ (gitignored): <id>-<shot>-<surface>-<theme>-t<take>.webm,
// the same name with .taps.json, .png stills, and a row merged into
// film/clips/manifest.json. Chrome comes from CHROME_PATH, else Puppeteer's
// own download (npx @puppeteer/browsers install chrome@stable).
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith(".json"));
if (!file) throw new Error("usage: node scripts/clip.mjs <shot.json> [--theme dark] [--take N] [--base URL]");
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const shot = JSON.parse(fs.readFileSync(file, "utf8"));
const theme = opt("theme", shot.theme || "light");
const take = Number(opt("take", 1));
const base = opt("base", process.env.BAARI_BASE || "https://baari.pages.dev");
const vp = shot.viewport || { width: 393, height: 852, scale: 3 };
// The app commit the take shows: any later app commit means re-shooting the rows it touches.
let appCommit = null;
try { appCommit = execSync("git log -1 --format=%h -- app", { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", ".."), encoding: "utf8" }).trim(); } catch {}
const dirty = (() => { try { return !!execSync("git status --porcelain -- app", { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", ".."), encoding: "utf8" }).trim(); } catch { return false; } })();

function chrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const known = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe"];
  for (const p of known) if (fs.existsSync(p)) return p;
  try {
    const out = execSync("npx --yes @puppeteer/browsers install chrome@stable", { encoding: "utf8" });
    const m = out.trim().split(/\s+/).pop();
    if (m && fs.existsSync(m)) return m;
  } catch {}
  throw new Error("no Chrome: set CHROME_PATH or run npx @puppeteer/browsers install chrome@stable");
}

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", "clips");
fs.mkdirSync(OUT, { recursive: true });
const name = `${shot.id}-${shot.shot || "01"}-${shot.surface || "app"}-${theme}-t${take}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: chrome(), headless: "new", args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", "--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.scale || 3, isMobile: true, hasTouch: true });
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
// No cursor, ever; the app's theme follows the clip's theme, and the install
// banner stays away. Taps are mouse clicks: headless Chrome draws no cursor,
// and the app listens for clicks. Swipes are pointer drags: [x1,y1,x2,y2],
// or [selector, [dx,dy]] from the element's centre.
await page.evaluateOnNewDocument((t) => {
  const s = document.createElement("style");
  s.textContent = "*, *::before, *::after { cursor: none !important; caret-color: transparent; }";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
  try { localStorage.setItem("baari:theme", t); localStorage.setItem("baari:install-later", String(Date.now())); } catch {}
}, theme);
// The once-a-session toast and the island opening itself would cover taps;
// a shot that wants them sets "peeks": true.
if (!shot.peeks) await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("baari:peek", "1"); sessionStorage.setItem("baari:autoisl", "1"); } catch {} });
for (const [k, v] of Object.entries(shot.storage || {})) await page.evaluateOnNewDocument((k, v) => { try { localStorage.setItem(k, v); } catch {} }, k, typeof v === "string" ? v : JSON.stringify(v));

await page.goto(base + (shot.open || "/?fixture=sync"), { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await wait(shot.settle_ms || 1200);

const taps = [];
let t0 = 0;
const now = () => Date.now() - t0;
async function point(target) {
  if (Array.isArray(target)) return { x: target[0], y: target[1] };
  const h = await page.waitForSelector(target, { timeout: 8000, visible: true });
  await h.evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "nearest" }));
  const b = await h.boundingBox();
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
}

// Wait until every finite animation on the page has finished, plus 100 ms
// (CLIP_SLOTS section 6). Infinite ones (the orb breathing) don't count.
async function settle(maxMs = 3000) {
  const end = Date.now() + maxMs;
  while (Date.now() < end) {
    const busy = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect && a.effect.getTiming().iterations !== Infinity)).length);
    if (!busy) break;
    await wait(60);
  }
  await wait(100);
}

const video = path.join(OUT, `${name}.webm`);
const rec = await page.screencast({ path: video });
t0 = Date.now();
for (const s of shot.steps || []) {
  if (s.wait) await wait(s.wait);
  else if (s.tap) { const p = await point(s.tap); if (process.env.CLIP_DEBUG) console.log("under", await page.evaluate((x, y) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) + " in " + (e.closest("[class]") || {}).className : "none"; }, p.x, p.y)); taps.push({ t_ms: now(), kind: "tap", x: p.x, y: p.y, target: typeof s.tap === "string" ? s.tap : null }); await page.mouse.click(p.x, p.y, { delay: 90 }); await wait(s.after || 700); if (process.env.CLIP_DEBUG) console.log("tap", JSON.stringify(s.tap), p, await page.evaluate(() => location.hash)); }
  else if (s.hold) { const p = await point(s.hold); taps.push({ t_ms: now(), kind: "long_press", x: p.x, y: p.y, ms: s.ms || 1200 }); await page.mouse.move(p.x, p.y); await page.mouse.down(); await wait(s.ms || 1200); await page.mouse.up(); await wait(s.after || 600); }
  else if (s.swipe) { const [x1, y1, x2, y2] = Array.isArray(s.swipe[0]) ? [...s.swipe[0], ...s.swipe[1]] : s.swipe.length === 2 ? await (async () => { const p = await point(s.swipe[0]); return [p.x, p.y, p.x + s.swipe[1][0], p.y + s.swipe[1][1]]; })() : s.swipe; taps.push({ t_ms: now(), kind: "swipe", x: x1, y: y1, x2, y2, ms: s.ms || 350 }); await page.mouse.move(x1, y1); await page.mouse.down(); const n = 14; for (let i = 1; i <= n; i++) { await page.mouse.move(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n); await wait((s.ms || 350) / n); } await page.mouse.up(); await wait(s.after || 700); }
  else if (s.scroll) { taps.push({ t_ms: now(), kind: "scroll", dy: s.scroll }); const n = 30; for (let i = 0; i < n; i++) { await page.mouse.wheel({ deltaY: s.scroll / n }); await wait((s.ms || 900) / n); } await wait(s.after || 500); }
  else if (s.type) { taps.push({ t_ms: now(), kind: "type", text: s.type }); await page.keyboard.type(s.type, { delay: s.delay || 70 }); await wait(s.after || 400); }
  else if (s.eval) { await page.evaluate(s.eval); await wait(s.after || 600); }
  else if (s.waitfor) { await page.waitForSelector(s.waitfor, { timeout: s.ms || 10000, visible: true }); await wait(s.after || 300); }
  else if (s.click) { await page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) throw new Error("no " + sel); e.click(); }, s.click); taps.push({ t_ms: now(), kind: "tap", target: s.click, synthetic: true }); await wait(s.after || 700); }
  else if (s.key) { await page.keyboard.press(s.key); await wait(s.after || 400); }
  else if (s.shot) { if (s.settle !== false) await settle(s.max || 3000); await page.screenshot({ path: path.join(OUT, `${name}.${s.shot}.png`) }); taps.push({ t_ms: now(), kind: "still", name: s.shot }); }
}
await wait(shot.tail_ms || 800);
await rec.stop();
await browser.close();

const dur = now();
fs.writeFileSync(path.join(OUT, `${name}.taps.json`), JSON.stringify({ clip: name, viewport: vp, theme, taps }, null, 2));
const mf = path.join(OUT, "manifest.json");
let rows = [];
try { rows = JSON.parse(fs.readFileSync(mf, "utf8")); } catch {}
rows = rows.filter((r) => r.file !== `${name}.webm`);
rows.push({ app_commit: appCommit, app_dirty: dirty, id: shot.id, demo: shot.demo || null, shot: shot.shot || "01", surface: shot.surface || "app", device: `${vp.width}x${vp.height}@${vp.scale || 3}`, theme, take, duration_ms: dur, what: shot.what || "", source: base + (shot.open || ""), file: `${name}.webm`, taps: `${name}.taps.json`, captions: fs.existsSync(path.join(OUT, `${name}.srt`)) ? `${name}.srt` : null, status: "raw" });
fs.writeFileSync(mf, JSON.stringify(rows, null, 2));
console.log(`${name}.webm ${Math.round(dur / 100) / 10}s, ${taps.length} taps`);
