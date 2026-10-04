import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const S = {
  whistle: ["Indian pressure cooker whistle, one long steamy whistle in a kitchen", 2.5],
  pop: ["soft cardboard paper cut-out landing on a table, small tap", 0.6],
  curtain: ["theatre curtain swishing up quickly", 1.5],
  stamp: ["rubber stamp thump on paper, punchy", 0.7],
  chime: ["short pleasant two-note payment success chime, generic", 1.2],
  msg: ["short soft message notification pop, bubbly", 0.5],
  clack: ["toy railway points switch clacking, wooden", 0.8],
  train: ["small wooden toy train rolling on track", 2.5],
  bell: ["apartment doorbell ding dong", 1.6],
  click: ["soft phone tap click", 0.3],
  whoosh: ["soft paper whoosh swipe", 0.7],
  birds: ["morning birdsong, Indian city dawn, gentle", 3],
  crickets: ["night crickets softly, city apartment night ambience", 4],
  laugh: ["small audience chuckle", 1.5],
};
const music = ["playful light Indian marimba, harmonium and soft tabla loop, 90 bpm, warm and cheerful, no vocals", 22];
const list = [...Object.entries(S), ["music", music]];
const q = [...list];
await Promise.all([0, 1].map(async () => { while (q.length) { const [k, [t, d]] = q.shift();
  const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ text: t, duration_seconds: d, prompt_influence: 0.5 }) });
  if (!r.ok) { console.log(k, r.status, (await r.text()).slice(0, 160)); continue; }
  fs.writeFileSync(`public/sfx/${k}.mp3`, Buffer.from(await r.arrayBuffer())); console.log(k, "ok"); } }));
