// Every trailer line in Gnani Timbre v2.5: two punctuation variants at three speeds,
// cached by hash. Takes land in assets/vo/takes/<id>[-<who>]-<a|b>-<speed>.wav.
// Run from film/trailer: node scripts/gnani.mjs [L01 L02 ...]
import fs from "node:fs";
import crypto from "node:crypto";
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
fs.mkdirSync(dir, { recursive: true });
const cachePath = `${dir}/cache.json`;
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};

const jobs = [];
for (const l of sheet.lines) {
  if (only.length && !only.includes(l.id)) continue;
  const whos = l.voices || [l.who];
  for (const who of whos) {
    for (const [v, text] of [["a", l.text], ["b", l.alt]]) {
      if (!text) continue;
      for (const speed of sheet.speeds) {
        const tag = l.voices ? `${l.id}-${who}` : l.id;
        jobs.push({ id: l.id, out: `${dir}/${tag}-${v}-${speed}.wav`, voice: sheet.voices[who], text, speed });
      }
    }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function tts(j, tries = 0) {
  const res = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({
      text: j.text, voice: j.voice, model: "timbre-v2.5", language: "hi-IN", speed: j.speed,
      audio_config: { sample_rate: 44100, num_channels: 1, container: "wav" },
    }),
  });
  if (res.status === 429 && tries < 6) { await wait(1500 * (tries + 1)); return tts(j, tries + 1); }
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

let made = 0;
for (const j of jobs) {
  const hash = crypto.createHash("sha1").update(JSON.stringify([j.text, j.voice, j.speed])).digest("hex").slice(0, 12);
  if (cache[j.out] === hash && fs.existsSync(j.out)) continue;
  try {
    fs.writeFileSync(j.out, await tts(j));
    cache[j.out] = hash;
    const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${j.out}"`).toString());
    console.log(j.out, j.voice, dur.toFixed(2));
    made++;
  } catch (e) {
    console.error("FAIL", j.out, j.voice, e.message);
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
}
console.log(`${made} new takes, ${jobs.length} total`);
