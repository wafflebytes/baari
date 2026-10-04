// Copies agent/kb/split/BAARI_*.md into baari-clock's KV, so the Worker can
// re-upload a file another team deleted. Run again after W2 changes the KB.
//
//   node workers/baari-clock/kb-load.js          load, then one heal
//
// Reads CLOCK_URL and CLOCK_KEY from the environment or .env.shared.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const env = { ...process.env };
const shared = path.join(root, ".env.shared");
if (fs.existsSync(shared)) {
  for (const line of fs.readFileSync(shared, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trim().startsWith("#") && !env[line.slice(0, i).trim()]) env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
const URL_ = (env.CLOCK_URL || "https://baari-clock.chaitanyajha.workers.dev").replace(/\/$/, "");
if (!env.CLOCK_KEY) throw new Error("CLOCK_KEY missing");

const dir = path.join(root, "agent/kb/split");
const files = {};
for (const f of fs.readdirSync(dir)) if (/^BAARI_.*\.md$/.test(f)) files[f] = fs.readFileSync(path.join(dir, f), "utf8");

(async () => {
  const post = (p, body) => fetch(`${URL_}${p}`, { method: "POST", headers: { "x-clock-key": env.CLOCK_KEY, "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  console.log("load", await post("/kb/files", { files }));
  console.log("heal", await post("/kb/heal", {}));
})();
