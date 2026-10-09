// DOM checks on settled frames: text-safe-area, projector-size, no-collisions,
// text-contrast and the slide word count. Measures the live page, so it sees
// what the render sees.
//   node checks/dom.mjs deck s01 s08 ...        deck slides at their final frame (?end)
//   node checks/dom.mjs trailer s01@1.6 s08@6.7  trailer shots at seconds into the shot
// Writes checks/dom-<kind>.json and prints one line per frame. Needs the repo
// root served on :8741. Set CHROME on machines without Google Chrome in /Applications.
import fs from "node:fs";
import { createRequire } from "node:module";

// puppeteer-core comes from whichever project is installed: the trailer or the deck
const fsx = await import("node:fs");
const owner = ["../trailer/package.json", "../deck/package.json"].map((p) => new URL(p, import.meta.url)).find((u) => fsx.existsSync(new URL("node_modules/puppeteer-core", u)));
const puppeteer = createRequire(owner)("puppeteer-core");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [kind, ...ids] = process.argv.slice(2);
const BASE = "http://localhost:8741/film/";
const url = (x) => {
  if (kind === "deck") return `${BASE}deck/${x}.html?end`;
  const [c, t] = x.split("@");
  return `${BASE}trailer/check.html?c=${c}&t=${t}`;
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const results = {};
for (const id of ids) {
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  await p.goto(url(id), { waitUntil: "networkidle0" });
  await p.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
  const r = await p.evaluate((kind) => {
    const SAFE = { l: 96, t: 54, r: 1824, b: 1026 };
    const rgba = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const items = [];
    // k: the scale the parent puts on this document (an iframe drawn smaller or larger); na: projector size marked n/a
    const walk = (doc, ox, oy, k = 1, na = false) => {
      const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (el.closest("script,style,template,[aria-hidden=true],.no-check")) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        let op = 1;
        for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
        if (op < 0.5) continue;
        const range = doc.createRange(); range.selectNodeContents(n);
        const rs = [...range.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
        if (!rs.length) continue;
        const box = { l: Math.min(...rs.map((q) => q.left)) * k + ox, t: Math.min(...rs.map((q) => q.top)) * k + oy, r: Math.max(...rs.map((q) => q.right)) * k + ox, b: Math.max(...rs.map((q) => q.bottom)) * k + oy };
        if (box.r < 0 || box.l > 1920 || box.b < 0 || box.t > 1080) continue;
        // effective size: the font size times whatever scale the ancestors apply
        // (multiplied up the ancestors' transforms; offsetHeight rounds and reads 22 px as 21.8)
        let scale = 1;
        for (let a = el; a; a = a.parentElement) { const t = getComputedStyle(a).transform; if (t && t !== "none") { const m = new DOMMatrix(t); scale *= Math.hypot(m.b, m.d); } }
        const px = parseFloat(cs.fontSize) * (isFinite(scale) && scale > 0 ? scale : 1) * k;
        // background: first ancestor with a solid-ish colour or a gradient's first stop
        let bg = null, dark = false;
        for (let a = el; a && !bg; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (a.classList.contains("dark")) dark = true;
          if (s.backgroundClip === "text" || s.webkitBackgroundClip === "text") continue;
          const c = rgba(s.backgroundColor);
          if (c && c.a > 0.5) bg = c;
          else if (s.backgroundImage && s.backgroundImage.includes("gradient") && !a.classList.contains("mark") && !a.classList.contains("uline") && !a.classList.contains("u")) { const g = rgba(s.backgroundImage); if (g && g.a > 0.5) bg = g; }
        }
        bg = bg || (dark ? { r: 15, g: 14, b: 12, a: 1 } : { r: 246, g: 244, b: 239, a: 1 });
        let fg = rgba(cs.color);
        if (cs.webkitTextFillColor && rgba(cs.webkitTextFillColor) && rgba(cs.webkitTextFillColor).a === 0) fg = { r: 154, g: 148, b: 138, a: 1 }; // shimmer text: its mute base
        const cr = ratio(over(fg, bg), bg);
        const chrome = !!el.closest(".foot,#chrome,.chrome,.src,.tag,.cap,.island,#isl");
        items.push({ text: n.textContent.trim().slice(0, 48), box, px: +px.toFixed(1), cr: +cr.toFixed(2), chrome, fig: doc !== document || !!el.closest("[data-fig]"), na, el });
      }
      for (const f of doc.querySelectorAll("iframe")) {
        try { const fr = f.getBoundingClientRect(), fk = f.offsetWidth ? fr.width / f.offsetWidth : 1; walk(f.contentDocument, ox + fr.left * k, oy + fr.top * k, k * fk, na || f.hasAttribute("data-size-na")); } catch (e) {}
      }
    };
    walk(document, 0, 0);
    const fails = { safe: [], size: [], contrast: [], collide: [] };
    for (const it of items) {
      const B = it.box;
      if (B.l < SAFE.l - 0.5 || B.t < SAFE.t - 0.5 || B.r > SAFE.r + 0.5 || B.b > SAFE.b + 0.5) fails.safe.push(`${it.text} [${Math.round(B.l)},${Math.round(B.t)},${Math.round(B.r)},${Math.round(B.b)}]`);
      if (it.px < 21.5 && !it.na) fails.size.push(`${it.text} ${it.px}px`);
      if (it.cr < 4.5) fails.contrast.push(`${it.text} ${it.cr}:1`);
    }
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], c = items[j];
        if (a.el === c.el || a.el.contains(c.el) || c.el.contains(a.el)) continue;
        const w = Math.min(a.box.r, c.box.r) - Math.max(a.box.l, c.box.l), h = Math.min(a.box.b, c.box.b) - Math.max(a.box.t, c.box.t);
        // line boxes of the same paragraph touch; only count real overlaps
        if (w > 4 && h > 0.3 * Math.min(a.box.b - a.box.t, c.box.b - c.box.t)) fails.collide.push(`"${a.text}" x "${c.text}"`);
      }
    // numbers and clock times are data, not words; labels inside an iframe diagram are a figure, counted apart
    const count = (xs) => xs.map((i) => i.text).join(" ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w) && !/^(₹?[\d:.,]+%?\??|am|pm)$/i.test(w)).length;
    const copy = items.filter((i) => !i.chrome && !i.fig), fig = items.filter((i) => !i.chrome && i.fig);
    return { n: items.length, words: count(copy), figWords: count(fig), texts: copy.map((i) => i.text), fails, minPx: Math.min(...items.filter((i) => !i.na).map((i) => i.px)), naN: items.filter((i) => i.na).length, minCr: Math.min(...items.map((i) => i.cr)) };
  }, kind);
  results[id] = r;
  const f = r.fails;
  const bad = Object.entries(f).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.length}`);
  console.log(id.padEnd(10), `${r.n} texts`, kind === "deck" ? `${r.words} words${r.figWords ? ` + ${r.figWords} in figure` : ""}` : "", `min ${r.minPx}px${r.naN ? ` (${r.naN} texts size n/a)` : ""}`, `min ${r.minCr}:1`, bad.length ? "FAIL " + bad.join(" ") : "ok");
  for (const [k, v] of Object.entries(f)) for (const x of v.slice(0, 6)) console.log("   ", k, x);
  if (kind === "deck" && r.words > 30) console.log("    words:", r.texts.join(" | "));
  await p.close();
}
await b.close();
fs.writeFileSync(new URL(`dom-${kind}.json`, import.meta.url), JSON.stringify(results, null, 1));
