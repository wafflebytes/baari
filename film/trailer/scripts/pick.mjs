// Picks one take per line without ears: Gnani STT hears every take, and a take
// wins on how closely the transcript matches the script, then on how little dead
// air it has, then on speed 1.0. Trims edge silence and writes assets/vo/<id>.wav
// plus assets/vo/manifest.json (duration, chosen take, transcript, caption).
// Run from film/trailer: node scripts/pick.mjs [L01 ...]
import fs from "node:fs";
import { execSync } from "node:child_process";

// GNANI_API_KEY from the environment, else from the repo's gitignored .env.shared
const env = fs.existsSync("../../.env.shared")
  ? Object.fromEntries(fs.readFileSync("../../.env.shared", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)))
  : {};
const KEY = process.env.GNANI_API_KEY || env.GNANI_API_KEY;
// Without a key, requests go out bare and the environment's network secret adds X-API-Key-ID
const AUTH = KEY ? { "X-API-Key-ID": KEY } : {};
const sheet = JSON.parse(fs.readFileSync(process.env.SHEET || "scripts/trailer-lines.json", "utf8"));
const only = process.argv.slice(2);
const VO = process.env.VO || "assets/vo";
const dir = `${VO}/takes`;
const heardPath = `${dir}/heard.json`;
const heard = fs.existsSync(heardPath) ? JSON.parse(fs.readFileSync(heardPath, "utf8")) : {};
const manPath = `${VO}/manifest.json`;
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, "utf8")) : {};

const norm = (s) => s.replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function stt(file, tries = 0) {
  const fd = new FormData();
  fd.append("audio_file", new Blob([fs.readFileSync(file)], { type: "audio/wav" }), "take.wav");
  fd.append("language_code", "hi-IN");
  const res = await fetch("https://api.vachana.ai/stt/v3", { method: "POST", headers: AUTH, body: fd });
  if (res.status === 429 && tries < 6) { await wait(1500 * (tries + 1)); return stt(file, tries + 1); }
  const j = await res.json().catch(() => ({}));
  return j.transcript || "";
}
// Longest internal pause and edge silences, from ffmpeg's silencedetect.
function silences(file) {
  const out = execSync(`ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=noise=-40dB:d=0.12 -f null - 2>&1`).toString();
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`).toString());
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...out.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  let head = 0, tail = dur, gap = 0;
  starts.forEach((s, i) => {
    const e = ends[i] ?? dur;
    if (s <= 0.01) head = e;
    else if (e >= dur - 0.01) tail = s;
    else gap = Math.max(gap, e - s);
  });
  return { dur, head, tail, gap };
}

for (const l of sheet.lines) {
  if (only.length && !only.includes(l.id)) continue;
  const whos = l.voices || [null];
  for (const who of whos) {
    const tag = who ? `${l.id}-${who}` : l.id;
    const takes = fs.readdirSync(dir).filter((f) => f.startsWith(`${tag}-`) && /-(a|b)-[\d.]+\.wav$/.test(f) && (who || !/-[a-z]+-(a|b)-/.test(f)));
    const scored = [];
    for (const f of takes) {
      const p = `${dir}/${f}`;
      const st = fs.statSync(p), key = `${p}:${st.size}:${Math.round(st.mtimeMs)}`;
      if (!heard[key]) { heard[key] = await stt(p); fs.writeFileSync(heardPath, JSON.stringify(heard, null, 1)); }
      heard[p] = heard[key];
      const v = f.match(/-(a|b)-([\d.]+)\.wav$/);
      const script = v[1] === "a" ? l.text : l.alt;
      const s = silences(p);
      const leaked = /break|time|ms/i.test(heard[p]);
      const score = sim(heard[p], script) - (leaked ? 1 : 0) - Math.max(0, s.gap - 0.7) * 0.3 - (v[2] === "1" ? 0 : 0.03);
      scored.push({ f, p, variant: v[1], speed: +v[2], heard: heard[p], score: +score.toFixed(3), ...s });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) { console.log(tag, "no takes"); continue; }
    const out = `${VO}/${tag}.wav`;
    const start = Math.max(0, best.head - 0.03);
    const len = best.tail - start + 0.08;
    execSync(`ffmpeg -y -v error -i "${best.p}" -ss ${start.toFixed(3)} -t ${len.toFixed(3)} -af "afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse" -ar 48000 "${out}"`);
    const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString());
    manifest[tag] = { who: who || l.who, voice: sheet.voices[who || l.who], take: best.f, dur: +dur.toFixed(3), score: best.score, heard: best.heard, text: best.variant === "a" ? l.text : l.alt, sub: l.sub, runners: scored.slice(1, 3).map((s) => `${s.f} ${s.score}`) };
    console.log(tag.padEnd(14), best.f.padEnd(22), dur.toFixed(2).padStart(5), String(best.score).padStart(6), "|", best.heard);
  }
}
fs.writeFileSync(manPath, JSON.stringify(manifest, null, 1));
