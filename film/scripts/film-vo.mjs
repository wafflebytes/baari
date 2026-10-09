// Writes src/p/vo.json for the paper cut trailer: every line's file, length, speaker and caption.
// Sunita's lines come from public/vo/g (Gnani picks, scripts/film-lines.json); until they're
// voiced, their length is estimated from the text so the timeline still lays out.
// The family's and Baari's lines are the trailer's picks, copied to public/vo/l.
import fs from "node:fs";
const sheet = JSON.parse(fs.readFileSync("scripts/film-lines.json", "utf8"));
const gman = fs.existsSync("public/vo/g/manifest.json") ? JSON.parse(fs.readFileSync("public/vo/g/manifest.json", "utf8")) : {};
const lman = JSON.parse(fs.readFileSync("trailer/assets/vo/manifest.json", "utf8"));
const out = {};
for (const l of sheet.lines) {
  const g = gman[l.id];
  const est = l.text.replace(/\s/g, "").length / 11.5 + (l.text.match(/[।?!,.]/g) || []).length * 0.18;
  out[l.id] = { src: g ? `vo/g/${l.id}.wav` : null, dur: +(g ? g.dur : est).toFixed(3), who: "sunita", sub: l.sub };
}
for (const f of fs.readdirSync("public/vo/l")) {
  const id = f.replace(".wav", "");
  out[id] = { src: `vo/l/${f}`, dur: lman[id].dur, who: lman[id].who, sub: lman[id].sub };
}
fs.writeFileSync("src/p/vo.json", JSON.stringify(out, null, 1) + "\n");
console.log(Object.entries(out).map(([k, v]) => `${k} ${v.dur}${v.src ? "" : " (est)"}`).join("\n"));
