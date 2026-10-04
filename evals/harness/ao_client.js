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

// The gateway in front of /run gives up at about 30 s with an HTML 504, while
// the run itself carries on (LOCK on v4 takes 25 to 40 s). On a 504 we find
// the run in /agent-runs, started after our call with our task text, and wait
// for it to finish. run-async is VEGA-only on this deployment (409).
async function run(agentId, task) {
  const t0 = Date.now();
  try {
    const r = await api("POST", `/agents/${agentId}/run`, { inputs: { task } });
    return { ms: Date.now() - t0, result: r };
  } catch (e) {
    if (e.status !== 504 && e.status !== 502) throw e;
  }
  const head = task.slice(0, 120);
  const done = ["completed", "failed", "hitl_triggered"];
  for (let i = 0; i < 60; i++) {
    await new Promise((res) => setTimeout(res, 4000));
    const l = await api("GET", `/agent-runs?agent_id=${agentId}&limit=10`);
    const hit = (Array.isArray(l) ? l : l.items || [])
      .filter((x) => Date.parse(x.started_at || x.created_at) >= t0 - 5000 && String(x.query || "").replace(/\\n/g, "\n").includes(head))
      .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))[0];
    if (!hit || !done.includes(String(hit.status))) continue;
    const d = await api("GET", `/agent-runs/${hit.id}`);
    const answer = (d.result && (d.result.raw_output || d.result.output)) || d.answer || d.result;
    return {
      ms: d.latency_ms || Date.now() - t0,
      via: "agent-runs after 504",
      result: { run_id: d.id, status: d.status, output: { raw_output: typeof answer === "string" ? answer : JSON.stringify(answer) }, confidence: d.confidence ?? null, error: d.error, model_used: d.model_used },
    };
  }
  throw new Error("run gave 504 and never showed up in /agent-runs");
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
