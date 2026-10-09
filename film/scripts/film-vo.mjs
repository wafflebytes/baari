// Writes src/p/vo.json for the paper cut trailer: every line's file, length, speaker and caption.
// Sunita narrates in the Round 3 narrator's voice (ElevenLabs v3): the opening reuses the Round 3
// recordings (public/vo/e/RN01, RC1-3, K03), the rest are scripts/film-lines-e.json picks in
// public/vo/e (estimated from the text until they're voiced). The family's and Baari's lines are
// the trailer's Gnani picks in public/vo/l.
import fs from "node:fs";
import { execSync } from "node:child_process";
const dur = (f) => +parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString()).toFixed(3);
const out = {};
const R3 = {
  RN01: ["sunita", "You'd think cooking is the hard part? No ji. The hard part is finding out... what to cook today!"],
  RC1: ["mummy", "Kuch bhi bana do."],
  RC2: ["papa", "Jo mann kare."],
  RC3: ["vinay", "Kuch bhi chalega!"],
  K03: ["sunita", "Is there a vegetable called 'kuch bhi'?"],
};
for (const [id, [who, sub]] of Object.entries(R3)) out[id] = { src: `vo/e/${id}.wav`, dur: dur(`public/vo/e/${id}.wav`), who, sub };
const sheet = JSON.parse(fs.readFileSync("scripts/film-lines-e.json", "utf8"));
for (const l of sheet.lines) {
  const f = `public/vo/e/${l.id}.wav`;
  const words = l.text.replace(/\[[^\]]+\]/g, "");
  const tags = (l.text.match(/\[[^\]]+\]/g) || []).length;
  const est = words.replace(/\s/g, "").length / 10.5 + (words.match(/[।?!,.]/g) || []).length * 0.2 + tags * 0.6;
  out[l.id] = { src: fs.existsSync(f) ? `vo/e/${l.id}.wav` : null, dur: fs.existsSync(f) ? dur(f) : +est.toFixed(3), who: "sunita", sub: l.sub };
}
const lman = JSON.parse(fs.readFileSync("trailer/assets/vo/manifest.json", "utf8"));
for (const f of fs.readdirSync("public/vo/l")) {
  const id = f.replace(".wav", "");
  out[id] = { src: `vo/l/${f}`, dur: lman[id].dur, who: lman[id].who, sub: lman[id].sub };
}
fs.writeFileSync("src/p/vo.json", JSON.stringify(out, null, 1) + "\n");
console.log(Object.entries(out).map(([k, v]) => `${k} ${v.dur}${v.src ? "" : " (est)"}`).join("\n"));
