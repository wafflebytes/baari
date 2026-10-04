// Records the real app (baari.pages.dev, fixture mode) being used by a pointer.
// A soft touch dot follows the mouse so the viewer sees every press.
import puppeteer from "puppeteer-core";
const B = "https://baari.pages.dev";
const which = process.argv[2];
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const DOT = `(() => { const d = document.createElement('div'); d.id='__dot'; Object.assign(d.style,{position:'fixed',left:'-100px',top:'-100px',width:'34px',height:'34px',margin:'-17px 0 0 -17px',borderRadius:'50%',background:'rgba(20,20,20,.18)',border:'2px solid rgba(255,255,255,.9)',boxShadow:'0 4px 14px rgba(0,0,0,.25)',zIndex:99999,pointerEvents:'none',transition:'transform .15s cubic-bezier(.22,1,.36,1)'}); document.documentElement.appendChild(d);
 addEventListener('mousemove',e=>{d.style.left=e.clientX+'px';d.style.top=e.clientY+'px'},true);
 addEventListener('mousedown',()=>d.style.transform='scale(.8)',true); addEventListener('mouseup',()=>d.style.transform='scale(1)',true); })()`;
await page.evaluateOnNewDocument(DOT);
const m = page.mouse; let pos = { x: 330, y: 900 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(x, y, ms = 600) { const steps = Math.max(8, Math.round(ms / 16)); for (let i = 1; i <= steps; i++) { const t = i / steps, e = 1 - Math.pow(1 - t, 3); await m.move(pos.x + (x - pos.x) * e, pos.y + (y - pos.y) * e); await wait(ms / steps); } pos = { x, y }; }
async function tap(x, y) { await go(x, y, 550); await wait(250); await m.down(); await wait(110); await m.up(); }
async function el(sel, i = 0) { const h = (await page.$$(sel))[i]; const b = await h.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; }
async function tapSel(sel, i) { const p = await el(sel, i); await tap(p.x, p.y); }
async function scroll(dy, ms = 900) { const n = 30; for (let i = 0; i < n; i++) { await m.wheel({ deltaY: dy / n }); await wait(ms / n); } }
async function open(fx, hash = "") { await page.goto(`${B}/?fixture=${fx}${hash}`, { waitUntil: "networkidle2" }); await page.evaluate(() => document.fonts.ready); }

if (which === "vote") {
  await open("shortlist"); await wait(500);
  const rec = await page.screencast({ path: "public/rec/vote.webm" });
  await page.evaluate(() => { location.hash = "#/x"; }); await wait(50); await page.evaluate(() => { location.hash = "#/"; });
  await wait(1800); await go(140, 420, 800); await wait(1600); await go(260, 470, 900); await wait(1200);
  await scroll(420, 1400); await wait(1500); await go(200, 500, 600); await wait(800);
  await scroll(-420, 1100); await wait(800); await rec.stop();
}
if (which === "lock") {
  await open("lock"); await wait(300);
  const rec = await page.screencast({ path: "public/rec/lock.webm" });
  await page.evaluate(() => { location.hash = "#/x"; }); await wait(50); await page.evaluate(() => { location.hash = "#/"; });
  await wait(3200); await go(200, 600, 700); await scroll(520, 1600); await wait(1800); await scroll(380, 1200); await wait(1800); await rec.stop();
}
if (which === "tour") {
  await open("morning"); await wait(600);
  const rec = await page.screencast({ path: "public/rec/tour.webm" });
  await wait(1200);
  await tapSel('.nav a[data-tab="khata"]'); await wait(1300);
  const c = await el(".t-tilt"); const b = c.b;
  await go(b.x + b.width * 0.12, b.y + b.height * 0.85, 700); await wait(200);
  await go(b.x + b.width * 0.88, b.y + b.height * 0.15, 2000); await wait(500); await go(b.x + b.width * 0.3, b.y + b.height * 0.3, 900); await wait(300);
  await go(b.x + b.width * 0.6, b.y + b.height + 120, 500); await wait(1200);
  await scroll(500, 1400); await wait(1800); await scroll(-500, 700);
  await tapSel('.nav a[data-tab="delivery"]'); await wait(2600);
  try { await tapSel("[data-copy]"); } catch {} await wait(1400);
  await scroll(450, 1300); await wait(1600); await scroll(-450, 600);
  await tapSel('.nav a[data-tab="sunita"]'); await wait(1600);
  try { await tapSel("[data-play]"); } catch {} await wait(6500);
  await scroll(400, 1200); await wait(1800); await scroll(-400, 600);
  await tapSel('.nav a[data-tab="baari"]'); await wait(1500);
  try { await tapSel(".dec-h[aria-expanded]", 0); await wait(1500); await tapSel(".dec-h[aria-expanded]", 1); } catch {} await wait(2200);
  await scroll(500, 1500); await wait(1500);
  await rec.stop();
}
if (which === "receipt") {
  await page.goto(`${B}/receipt/2026-10-05`, { waitUntil: "networkidle2" }); await wait(300);
  const rec = await page.screencast({ path: "public/rec/receipt.webm" });
  await page.reload({ waitUntil: "networkidle2" }); await wait(2500); await scroll(400, 1500); await wait(1500); await rec.stop();
}
await browser.close();
