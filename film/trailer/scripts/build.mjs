// Writes index.html, timing.js, captions.json, renders/trailer.srt, compositions/captions.html
// and compositions/island.html. Inputs:
//   timing.json        the lead's: shot starts and lengths (beats), voice placement
//   cues/<shot>.json   the shot lane's: its cues, island lines and extra captions
// All outputs are generated and git-ignored; never edit or commit them.
// A shot with compositions/<id>.html mounts it; any other shot mounts the placeholder.
// Run from film/trailer:
//   node scripts/build.mjs                 the whole trailer
//   node scripts/build.mjs --final         refuses placeholders
//   node scripts/build.mjs --excerpt s05[:s06]   also writes excerpt.html: those shots
//       with the island and captions as they are at that point, for a quick render
//       (npx hyperframes render -c excerpt.html ...)
import fs from "node:fs";
import { measure } from "./measure.mjs";

const T = JSON.parse(fs.readFileSync("timing.json", "utf8"));
const vo = JSON.parse(fs.readFileSync("assets/vo/manifest.json", "utf8"));
const BEAT = 60 / T.bpm;
const r3 = (x) => Math.round(x * 1000) / 1000;
const shots = T.shots.map((s) => {
  const f = `cues/${s.id}.json`;
  const c = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  return { ...s, start: r3(s.beat * BEAT), dur: r3(s.beats * BEAT), cues: c.cues || {}, island: c.island || [], captions: c.captions || [] };
});
const end = r3(Math.max(...shots.map((s) => s.start + s.dur)));
const final = process.argv.includes("--final");
const missing = shots.filter((s) => !fs.existsSync(`compositions/${s.id}.html`));
if (final && missing.length) {
  console.error("placeholders left:", missing.map((s) => `${s.id} (${s.slot})`).join(", "));
  process.exit(1);
}
const shot = (id) => shots.find((s) => s.id === id) || (() => { throw new Error(`no shot ${id}`); })();
const at = (id, t) => r3(shot(id).start + t);

// Captions: one centred line per spoken line, held words/3 + 1 s or to the line's end,
// cut in and cut out (Base44's type never fades).
const caps = [];
for (const c of T.vo) {
  if (c.caption === false) continue;
  const m = vo[c.line];
  const text = c.sub || m.sub;
  const len = c.trim ?? m.dur;
  caps.push({ t: at(c.shot, c.at), d: r3(Math.max(len + 0.25, text.split(/\s+/).length / 3 + 1)), text });
}
for (const s of shots) for (const c of s.captions) caps.push({ t: at(s.id, c.at), d: c.dur, text: c.text });
caps.sort((a, b) => a.t - b.t);
caps.forEach((c, i) => { if (caps[i + 1] && c.t + c.d > caps[i + 1].t - 0.05) c.d = r3(caps[i + 1].t - 0.05 - c.t); });
fs.writeFileSync("captions.json", JSON.stringify(caps, null, 1));
fs.mkdirSync("renders", { recursive: true });
const ts = (x) => { const ms = Math.round(x * 1000); return new Date(ms).toISOString().slice(11, 23).replace(".", ","); };
fs.writeFileSync("renders/trailer.srt", caps.map((c, i) => `${i + 1}\n${ts(c.t)} --> ${ts(c.t + c.d)}\n${c.text}\n`).join("\n"));

// The island: one ink pill over the whole trailer, carrying cuts like Base44's prompt box.
const islHtml = (c) => (c.hide ? "" : c.text + (c.sub ? ` <span class="sub">${c.sub}</span>` : ""));
const wfile = "assets/island-widths.json";
const widths = fs.existsSync(wfile) ? JSON.parse(fs.readFileSync(wfile, "utf8")) : {};
const items = [...new Set(shots.flatMap((s) => s.island.map(islHtml)).filter(Boolean))];
const todo = items.filter((h) => !widths[h]);
if (todo.length) {
  Object.assign(widths, await measure(todo));
  fs.writeFileSync(wfile, JSON.stringify(widths, null, 1));
  console.log(`measured ${todo.length} island line(s)`);
}
const isl = shots.flatMap((s) => s.island.map((c) => ({ t: at(s.id, c.at), html: islHtml(c), w: widths[islHtml(c)] || 0, kind: c.kind || "plain", in: c.in || "type", hide: !!c.hide })));
isl.sort((a, b) => a.t - b.t);

// renders/island.txt: what the island shows when each shot starts, for the lanes.
fs.writeFileSync("renders/island.txt", shots.map((s) => {
  const last = isl.filter((c) => c.t <= s.start + 0.001).pop();
  return `${s.id} ${String(s.start).padStart(7)}s  ${!last || last.hide ? "(hidden)" : last.html.replace(/<[^>]+>/g, "")}`;
}).join("\n") + "\n");

const head = `<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<link rel="stylesheet" href="shared/theme.css" />
<link rel="stylesheet" href="trailer.css" />
<script src="shared/vendor/gsap.min.js"></script>
<script src="shared/moves.js"></script>
<script src="motion.js"></script>
<script src="timing.js"></script>
<script src="shared/vendor/qrcode.js"></script>`;
const mount = (s, start) => {
  const has = fs.existsSync(`compositions/${s.id}.html`);
  const src = has ? `compositions/${s.id}.html` : "compositions/placeholder.html";
  const vars = has ? "" : ` data-variable-values='${JSON.stringify({ slot: s.slot, shows: s.shows.replace(/'/g, "’") })}'`;
  return `    <div id="el-${s.id}" data-composition-id="${s.id}" data-composition-src="${src}" data-start="${start}" data-duration="${s.dur}" data-track-index="1"${vars}></div>`;
};
const page = (list, offset, len, audio) => `<!doctype html>
<html lang="en">
<head>
${head}
<title>Baari trailer</title>
<!-- Generated by scripts/build.mjs. Edit timing.json or cues/, then rebuild. -->
<script>window.EXCERPT_OFFSET = ${offset};</script>
</head>
<body>
  <div id="root" data-composition-id="trailer" data-width="1920" data-height="1080" data-start="0" data-duration="${len}">
${list.map((s) => mount(s, r3(s.start - offset))).join("\n")}
    <div id="el-island" data-composition-id="island" data-composition-src="compositions/island.html" data-start="0" data-duration="${len}" data-track-index="4"></div>
    <div id="el-captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${len}" data-track-index="5"></div>
${audio}  </div>
  <script>window.__timelines["trailer"] = gsap.timeline({ paused: true });</script>
</body>
</html>
`;
const mix = fs.existsSync("assets/mix.wav") ? `    <audio id="mix" src="assets/mix.wav" data-start="0" data-duration="${end}" data-track-index="10" data-volume="1"></audio>\n` : "";
fs.writeFileSync("index.html", page(shots, 0, end, mix));
const cues = Object.fromEntries(shots.map((s) => [s.id, { start: s.start, dur: s.dur, ...s.cues }]));
fs.writeFileSync("timing.js", `// Generated by scripts/build.mjs.\nwindow.TIMING = ${JSON.stringify({ bpm: T.bpm, beat: BEAT, end, cues })};\n`);

const ex = process.argv.indexOf("--excerpt");
if (ex > 0) {
  const [a, b] = process.argv[ex + 1].split(":");
  const i0 = shots.indexOf(shot(a)), i1 = shots.indexOf(shot(b || a));
  const list = shots.slice(i0, i1 + 1);
  const off = list[0].start, len = r3(list.at(-1).start + list.at(-1).dur - off);
  fs.writeFileSync("excerpt.html", page(list, off, len, ""));
  console.log(`excerpt.html: ${list.map((s) => s.id).join(", ")}, ${len}s from ${off}s`);
}

// Layers. Both read window.EXCERPT_OFFSET, so an excerpt starts in the right state.
const layerHead = (id, z) => `<template id="${id}-template">
  <div data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${end}" style="position:absolute;inset:0;pointer-events:none;z-index:${z}">`;
fs.writeFileSync("compositions/captions.html", `${layerHead("captions", 50)}
    <div id="cap-wrap"></div>
    <script>
      // Generated by scripts/build.mjs from timing.json vo and cues/*.json captions.
      // Base44's type cuts in and out: one plate per spoken line, no fades.
      (function () {
        const M = MOTION, OFF = window.EXCERPT_OFFSET || 0, CAPS = ${JSON.stringify(caps)};
        const wrap = document.getElementById("cap-wrap");
        const tl = gsap.timeline({ paused: true });
        CAPS.forEach((c) => {
          const t0 = c.t - OFF, t1 = c.t + c.d - OFF;
          if (t1 <= 0) return;
          const el = document.createElement("div");
          el.className = "cap";
          el.textContent = c.text;
          wrap.appendChild(el);
          M.hide(el);
          M.cut(tl, el, Math.max(0, t0));
          M.cut(tl, el, t1, false);
        });
        tl.set({}, {}, ${end});
        window.__timelines["captions"] = tl;
      })();
    </script>
  </div>
</template>
`);
fs.writeFileSync("compositions/island.html", `${layerHead("island", 40)}
    <style>
      #isl-row { position: absolute; left: 0; right: 0; top: 54px; display: flex; justify-content: center; }
      #isl { width: 70px; overflow: hidden; visibility: hidden; }
      #isl .ba { position: relative; z-index: 1; }
      #isl .txt { position: relative; flex: 1; height: 68px; }
      #isl .txt > span { position: absolute; left: 0; top: 0; line-height: 68px; white-space: nowrap; }
      #isl .txt > span.shimmer .sub { color: inherit; }
    </style>
    <div id="isl-row"><div id="isl" class="island"><img class="ba" src="shared/img/baari-mark.png" alt=""><div class="txt" id="isl-txt"></div></div></div>
    <script>
      // Generated by scripts/build.mjs from cues/*.json "island".
      // Base44's prompt box: the pill cuts in and out; when its words change, the old
      // words cut out, the width lands (M.GATHER, power2.out) and the new words type on
      // (in: "type") or cut in whole (in: "cut", for runs of verbs and clock steps).
      (function () {
        const M = MOTION, OFF = window.EXCERPT_OFFSET || 0, PAD = 102, DOT = 70;
        let CUES = ${JSON.stringify(isl)}.map((c) => ({ ...c, t: Math.round((c.t - OFF) * 1000) / 1000 }));
        const past = CUES.filter((c) => c.t <= 0).pop();
        CUES = CUES.filter((c) => c.t > 0);
        if (past) CUES.unshift({ ...past, t: 0, now: true });
        const pill = document.getElementById("isl"), box = document.getElementById("isl-txt");
        const tl = gsap.timeline({ paused: true });
        let shown = false, prev = null;
        CUES.forEach((c, i) => {
          const next = CUES[i + 1] ? CUES[i + 1].t : ${end};
          if (prev) M.cut(tl, prev, c.t, false);
          if (c.hide) {
            if (shown) M.cut(tl, pill, c.t, false);
            shown = false; prev = null;
            return;
          }
          const s = document.createElement("span");
          s.className = c.kind === "shimmer" ? "t shimmer" : "t";
          s.innerHTML = c.html;
          box.appendChild(s);
          M.hide(s);
          const w = c.w + PAD;
          let t = c.t;
          if (!shown || c.now) {
            tl.set(pill, { width: w }, t);
            M.cut(tl, pill, t);
          } else {
            M.land(tl, pill, t, {}, { width: w }, M.GATHER);
            t += M.GATHER;
          }
          shown = true;
          M.cut(tl, s, t);
          if (c.in === "type" && !c.now) M.type(tl, s, t, { caret: false });
          // the app's own shimmer sweep, run as the app runs it: a machine, so linear
          if (c.kind === "shimmer") tl.fromTo(s, { backgroundPosition: "100% 0" }, { backgroundPosition: "-50% 0", duration: 1.2, ease: M.STEP, repeat: Math.max(0, Math.floor((next - c.t) / 1.2) - 1), immediateRender: false }, c.t);
          prev = s;
        });
        tl.set({}, {}, ${end});
        window.__timelines["island"] = tl;
      })();
    </script>
  </div>
</template>
`);
if (!mix) console.warn("no assets/mix.wav yet: index.html has no soundtrack");
console.log(`index.html: ${shots.length} shots, ${end}s, ${missing.length} placeholders; ${caps.length} captions, ${isl.length} island lines`);
