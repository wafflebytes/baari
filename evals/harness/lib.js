// Shared plumbing for the eval harness: env, the OpenRouter key pool, and the
// rails MCP and admin clients. No secrets are logged or written to traces.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");

function loadEnv() {
  for (const f of [path.join(ROOT, ".env.shared"), path.join(ROOT, "evals/.env")]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i < 1 || line.trim().startsWith("#")) continue;
      const k = line.slice(0, i).trim();
      if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const RAILS = (process.env.RAILS_BASE || "https://baari-rails.vercel.app").replace(/\/$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- OpenRouter, through the baari-llm Worker when LLM_BASE is set, else direct
// with our own key rotation. Spent keys are remembered for the process.
const KEYS = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map((s) => s.trim()).filter(Boolean);
const spent = new Set();
let slot = 0;
const llmStats = { calls: 0, retries: 0, by_slot: {} };

async function chat({ model, messages, tools, max_tokens = 1500, temperature = 0.2 }) {
  const base = process.env.LLM_BASE ? process.env.LLM_BASE.replace(/\/$/, "") : "https://openrouter.ai/api/v1";
  const body = { model, messages, max_tokens: Math.max(max_tokens, 800), temperature };
  if (tools && tools.length) body.tools = tools;
  if (/qwen|deepseek|r1|thinking/i.test(model)) body.reasoning = { effort: "low", exclude: true };
  let lastErr;
  for (let attempt = 0; attempt < KEYS.length * 2 + 2; attempt++) {
    const live = KEYS.map((k, i) => i).filter((i) => !spent.has(i));
    if (!process.env.LLM_BASE && !live.length) throw new Error("All OpenRouter keys are spent for today");
    const i = live[slot++ % live.length];
    const key = process.env.LLM_BASE ? process.env.LLM_TOKEN || "" : KEYS[i];
    const t0 = Date.now();
    let res, data;
    try {
      res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://baari.pages.dev", "X-Title": "Baari evals" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      lastErr = e;
      llmStats.retries++;
      await sleep(1500);
      continue;
    }
    llmStats.calls++;
    llmStats.by_slot[i] = (llmStats.by_slot[i] || 0) + 1;
    if (res.status === 429 || res.status === 402 || (data.error && /rate|limit|credit/i.test(JSON.stringify(data.error)))) {
      // 429 on a free model can be the upstream provider, not our key. Mark the
      // key spent only when OpenRouter says the daily free quota is used.
      if (/free-models-per-day|per-day|credits/i.test(JSON.stringify(data.error || ""))) spent.add(i);
      lastErr = new Error(`LLM ${res.status}: ${JSON.stringify(data.error || data).slice(0, 200)}`);
      llmStats.retries++;
      await sleep(2000 + attempt * 1000);
      continue;
    }
    if (!res.ok || data.error) {
      lastErr = new Error(`LLM ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
      llmStats.retries++;
      await sleep(1000);
      continue;
    }
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) {
      lastErr = new Error("LLM returned no choices");
      continue;
    }
    return { message: msg, usage: data.usage || {}, ms: Date.now() - t0, model: data.model || model };
  }
  throw lastErr || new Error("LLM failed");
}

// ---- rails MCP. One JSON-RPC POST per call, authenticated with the MCP key.
let rpcId = 1;
async function mcp(connector, method, params) {
  const res = await fetch(`${RAILS}/mcp/${connector}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "x-api-key": process.env.RAILS_MCP_KEY || process.env.MCP_API_KEY || "" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
    signal: AbortSignal.timeout(90000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const m = text.match(/data: (\{.*\})/);
    data = m ? JSON.parse(m[1]) : { error: { message: text.slice(0, 200) } };
  }
  if (data.error) throw new Error(`MCP ${connector} ${method}: ${data.error.message}`);
  return data.result;
}

async function mcpTools(connector) {
  return (await mcp(connector, "tools/list", {})).tools;
}

async function mcpCall(connector, name, args) {
  const r = await mcp(connector, "tools/call", { name, arguments: args || {} });
  const text = (r.content || []).map((c) => c.text || "").join("");
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { result: parsed, isError: !!r.isError };
}

// ---- rails admin
async function admin(method, p, body) {
  const res = await fetch(RAILS + p, {
    method,
    headers: { "Content-Type": "application/json", "x-admin-key": process.env.RAILS_ADMIN_KEY || process.env.ADMIN_KEY || "" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

function istNow() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().replace("T", " ").slice(0, 16) + " IST";
}

module.exports = { ROOT, RAILS, chat, mcp, mcpTools, mcpCall, admin, sleep, istNow, llmStats, KEYS };
