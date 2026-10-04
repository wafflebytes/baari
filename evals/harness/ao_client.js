// Minimal AgenticOrg client for the eval harness. Reuses the session saved by
// `node agenticorg-cli/ao.js login` and sends the CSRF token the way the web
// app does (header plus a csrf_token body or form field).
const fs = require("fs");
const path = require("path");

const BASE = (process.env.AO_BASE || "https://agenticorg.hackathon.pinelabs.com").replace(/\/$/, "") + "/api/v1";
const SESSION = path.join(__dirname, "../../agenticorg-cli/.ao-session.json");

function session() {
  if (!fs.existsSync(SESSION)) throw new Error("No AgenticOrg session. Run `node agenticorg-cli/ao.js login`.");
  return JSON.parse(fs.readFileSync(SESSION, "utf8"));
}

function headers(s) {
  return { Cookie: `agenticorg_session=${s.access_token}; agenticorg_csrf=${s.csrf}`, "X-CSRF-Token": s.csrf, Accept: "application/json" };
}

async function api(method, p, body) {
  const s = session();
  let payload;
  const h = headers(s);
  if (body instanceof FormData) {
    body.append("csrf_token", s.csrf);
    payload = body;
  } else if (body !== undefined) {
    h["Content-Type"] = "application/json";
    payload = JSON.stringify(method === "GET" ? body : { ...body, csrf_token: s.csrf });
  }
  const res = await fetch(BASE + p, { method, headers: h, body: payload });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const e = new Error(`${method} ${p} -> ${res.status}: ${typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data.detail || data).slice(0, 600)}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

async function run(agentId, task) {
  const t0 = Date.now();
  const r = await api("POST", `/agents/${agentId}/run`, { inputs: { task } });
  return { ms: Date.now() - t0, result: r };
}

module.exports = { api, run, BASE };

// CLI: node ao_client.js upload <file> | search "<query>"
if (require.main === module) {
  (async () => {
    const [cmd, arg] = process.argv.slice(2);
    if (cmd === "upload") {
      const fd = new FormData();
      fd.append("file", new Blob([fs.readFileSync(arg)], { type: "text/markdown" }), path.basename(arg));
      console.log(JSON.stringify(await api("POST", "/knowledge/upload?replace=true", fd), null, 2));
    } else if (cmd === "search") {
      console.log(JSON.stringify(await api("POST", "/knowledge/search", { query: arg, top_k: 5 }), null, 2));
    } else console.log("usage: upload <file> | search <query>");
  })().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
