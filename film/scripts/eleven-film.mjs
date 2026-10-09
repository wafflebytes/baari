// Voices the paper cut trailer's narration in the Round 3 narrator's voice: ElevenLabs v3, two
// takes per line (v3 varies take to take), as wav in public/vo/e/takes/<id>-<a|b>-1.wav, so
// trailer/scripts/pick.mjs can pick by STT (SHEET=../scripts/film-lines-e.json VO=../public/vo/e).
// The key comes from ELEVENLABS_API_KEY, else from the environment's network secret on
// api.elevenlabs.io (requests go out without it and the proxy adds xi-api-key).
// Run from film/: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/eleven-film.mjs [E02 ...]
import fs from "node:fs";
import { execSync } from "node:child_process";

const KEY = process.env.ELEVENLABS_API_KEY;
const AUTH = KEY ? { "xi-api-key": KEY } : {};
const sheet = JSON.parse(fs.readFileSync("scripts/film-lines-e.json", "utf8"));
const only = process.argv.slice(2);
const dir = "public/vo/e/takes";
fs.mkdirSync(dir, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function tts(text, voice, tries = 0) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json", ...AUTH },
    body: JSON.stringify({ text, model_id: "eleven_v3", voice_settings: { stability: 0.5 } }),
  });
  if (r.status === 429 && tries < 6) { await wait(2000 * (tries + 1)); return tts(text, voice, tries + 1); }
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}

for (const l of sheet.lines) {
  if (only.length && !only.includes(l.id)) continue;
  l.alt = l.alt || l.text;
  for (const v of ["a", "b"]) {
    const out = `${dir}/${l.id}-${v}-1.wav`;
    if (fs.existsSync(out)) continue;
    try {
      fs.writeFileSync("/tmp/eleven.mp3", await tts(v === "a" ? l.text : l.alt, sheet.voices[l.who]));
      execSync(`ffmpeg -v error -y -i /tmp/eleven.mp3 -ar 44100 -ac 1 "${out}"`);
      console.log(out, execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim());
    } catch (e) {
      console.error("FAIL", out, e.message);
    }
  }
}
