// One TTS call per line, cached by hash. Writes public/vo/<id>.mp3 and public/vo/manifest.json.
import fs from "node:fs"; import crypto from "node:crypto"; import { execSync } from "node:child_process";
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const KEY = env.ELEVENLABS_API_KEY;
const { voices, lines } = JSON.parse(fs.readFileSync("scripts/lines.json", "utf8"));
const only = process.argv.slice(2);
const manifest = fs.existsSync("public/vo/manifest.json") ? JSON.parse(fs.readFileSync("public/vo/manifest.json", "utf8")) : {};
const todo = lines.filter((l) => !only.length || only.includes(l.id));
const work = async (l) => {
  const model = l.v3 ? "eleven_v3" : "eleven_multilingual_v2";
  const settings = l.v3 ? { stability: 0.5 } : { stability: 0.4, similarity_boost: 0.8, style: 0.35 };
  const hash = crypto.createHash("sha1").update(JSON.stringify([l.text, voices[l.who], model, settings, l.take || 0])).digest("hex").slice(0, 10);
  const out = `public/vo/${l.id}.mp3`;
  if (manifest[l.id]?.hash === hash && fs.existsSync(out)) return;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[l.who]}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text: l.text, model_id: model, voice_settings: settings, ...({}) }),
  });
  if (!r.ok) { console.error(l.id, r.status, (await r.text()).slice(0, 200)); return; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${out}`).toString());
  manifest[l.id] = { hash, dur, who: l.who, sub: l.sub };
  console.log(l.id, dur.toFixed(2));
};
const q = [...todo];
await Promise.all([0, 1].map(async () => { while (q.length) await work(q.shift()); }));
fs.writeFileSync("public/vo/manifest.json", JSON.stringify(manifest, null, 1));
