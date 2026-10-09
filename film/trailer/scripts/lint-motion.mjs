// Refuses motion that isn't Base44's (film/LOOK.md, "Motion"). Run before every commit:
//   node scripts/lint-motion.mjs [files...]   (default: every trailer and night composition)
// Exit 1 on any failure. Generated layers (island, captions) are checked too.
import fs from "node:fs";
import path from "node:path";

const dirs = ["compositions", "../deck/videos/night/compositions"];
const files = process.argv.slice(2).length ? process.argv.slice(2) : dirs.flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".html") && !["placeholder.html", "measure.html"].includes(f)).map((f) => path.join(d, f)) : []));
const RULES = [
  [/\bMOVES\b/, "uses shared/moves.js (landing-page fades and springs); use MOTION from motion.js"],
  [/cubic-bezier|elastic|bounce|back\.(in|out)|\bsine\.|\bexpo\.|\bcirc\.|power[0134]\.|"power2\.(in|out|inOut)"/, "an ease that isn't M.OUT, M.IN or M.STEP"],
  [/ease:\s*(?!M\.(OUT|IN|STEP)\b)[^,}\s]+/, "ease must be M.OUT, M.IN or M.STEP"],
  [/blur\(/, "blur in motion: Base44 never blurs between states"],
  [/onUpdate|onComplete|onStart|\.call\(/, "a callback: frames must be a pure function of time"],
  [/Math\.random|Date\.now|performance\.now/, "unseeded randomness or wall-clock time"],
  [/@keyframes|transition\s*:|animation\s*:/, "CSS animation or transition: everything goes on the GSAP timeline"],
];
let bad = 0, dissolves = 0;
const report = (f, msg, line) => { bad++; console.log(`${f}:${line}: ${msg}`); };
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const styles = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  const lineOf = (i) => src.slice(0, i).split("\n").length;
  for (const m of scripts) {
    const code = m[1], base = m.index + 8;
    for (const [re, msg] of RULES.filter(([re]) => !/@keyframes/.test(re.source))) {
      const g = new RegExp(re.source, "g");
      for (const x of code.matchAll(g)) report(f, msg, lineOf(base + x.index));
    }
    // tweens (not sets) that change opacity, scale on text, or rise: fades are not Base44's
    for (const x of code.matchAll(/\.(to|from|fromTo)\(|M\.(land|push|rise|collapse)\(/g)) {
      let depth = 0, i = x.index + x[0].length - 1, j = i;
      for (; j < code.length; j++) { if (code[j] === "(") depth++; else if (code[j] === ")" && --depth === 0) break; }
      const args = code.slice(i, j);
      if (/\b(opacity|autoAlpha)\b/.test(args)) report(f, "a fade: things cut in and out (M.cut); the one dissolve is M.dissolve", lineOf(base + x.index));
      if (/\bfilter\b/.test(args)) report(f, "a filter tween", lineOf(base + x.index));
    }
    dissolves += (code.match(/M\.dissolve\(/g) || []).length;
  }
  for (const m of styles) for (const x of m[1].matchAll(/@keyframes|transition\s*:|animation\s*:/g)) report(f, "CSS animation or transition", lineOf(m.index + x.index));
}
const trailerDissolves = files.filter((f) => f.startsWith("compositions")).reduce((n, f) => n + (fs.readFileSync(f, "utf8").match(/M\.dissolve\(/g) || []).length, 0);
if (trailerDissolves > 1) { bad++; console.log(`trailer: ${trailerDissolves} dissolves; Base44 has one (ref 183-187)`); }
console.log(bad ? `${bad} problem(s) in ${files.length} file(s)` : `ok: ${files.length} file(s) move like Base44`);
process.exit(bad ? 1 : 0);
