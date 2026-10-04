#!/usr/bin/env node
// Small command-line wrapper over the AgenticOrg REST API, so the team (and
// Claude) can change agents and connectors without clicking through the UI.
//
// Auth: a Bearer token. Either AO_API_KEY (an ao_sk_ key from Dashboard ->
// API Keys) in .env, or a session token saved by `node ao.js login`, which
// you run yourself with AO_EMAIL / AO_PASSWORD in .env. Bearer requests skip
// the platform's cookie CSRF check, so no browser session is needed.
//
// HITL approvals are deliberately not here. They stay a human decision in
// the Approvals screen.

const fs = require("fs");
const path = require("path");

const BASE = (process.env.AO_BASE || "https://agenticorg.hackathon.pinelabs.com").replace(/\/$/, "") + "/api/v1";
const DIR = __dirname;
const SESSION = path.join(DIR, ".ao-session.json");

function loadEnv() {
  const f = path.join(DIR, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

function token() {
  if (process.env.AO_API_KEY) return process.env.AO_API_KEY;
  if (fs.existsSync(SESSION)) return JSON.parse(fs.readFileSync(SESSION, "utf8")).access_token;
  fail("No credentials. Put AO_API_KEY in agenticorg-cli/.env, or run `node ao.js login` yourself.");
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function api(method, p, body) {
  // A login token travels the way the website sends it: the
  // agenticorg_session cookie. API keys go as a Bearer header.
  const t = token();
  let auth;
  if (process.env.AO_API_KEY) auth = { Authorization: `Bearer ${t}` };
  else {
    // Same double-submit pair the website sends on every change: the CSRF
    // cookie and an X-CSRF-Token header with the same value.
    const s = fs.existsSync(SESSION) ? JSON.parse(fs.readFileSync(SESSION, "utf8")) : {};
    const csrf = s.csrf || require("crypto").randomBytes(24).toString("hex");
    auth = { Cookie: `agenticorg_session=${t}; agenticorg_csrf=${csrf}`, "X-CSRF-Token": csrf };
    // The deployed site also reads the token from a csrf_token body field,
    // and the header alone gets rejected. The web app sends both; so do we.
    if (method !== "GET" && body && typeof body === "object" && !Array.isArray(body)) body = { ...body, csrf_token: body.csrf_token || csrf };
  }
  const res = await fetch(BASE + p, {
    method,
    headers: { ...auth, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const e = new Error(`${method} ${p} -> ${res.status}: ${typeof data === "string" ? data.slice(0, 500) : JSON.stringify(data.detail || data).slice(0, 800)}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

const out = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
const items = (d) => (Array.isArray(d) ? d : d.items || d.agents || d.connectors || d.tools || []);

// Accept an agent id or a name.
async function agentId(ref) {
  if (/^[0-9a-f-]{36}$/i.test(ref)) return ref;
  const list = items(await api("GET", "/agents?include_builtin=false&page=1&per_page=100"));
  const hit = list.find((a) => (a.name || a.employee_name || "").toLowerCase() === String(ref).toLowerCase());
  if (!hit) fail(`No agent named ${ref}`);
  return hit.id || hit.agent_id;
}

async function connectorId(ref) {
  if (/^[0-9a-f-]{36}$/i.test(ref)) return ref;
  const list = items(await api("GET", "/connectors?page=1&per_page=100"));
  const hit = list.find((c) => c.name === ref);
  if (!hit) fail(`No connector named ${ref}`);
  return hit.id;
}

const commands = {
  async login() {
    const email = process.env.AO_EMAIL;
    const password = process.env.AO_PASSWORD;
    if (!email || !password) fail("Set AO_EMAIL and AO_PASSWORD in agenticorg-cli/.env first.");
    const res = await fetch(BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) fail(`Login failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
    const csrf = (cookies.join(";").match(/agenticorg_csrf=([^;]+)/) || [])[1];
    fs.writeFileSync(SESSION, JSON.stringify({ access_token: data.access_token, csrf, saved_at: new Date().toISOString() }));
    out("Logged in. Session saved to .ao-session.json (git-ignored). You can remove AO_PASSWORD from .env now.");
  },

  async whoami() {
    out(await api("GET", "/auth/me"));
  },

  // ---- agents
  async agents() {
    const list = items(await api("GET", "/agents?include_builtin=false&page=1&per_page=100"));
    out(list.map((a) => ({ id: a.id || a.agent_id, name: a.name, status: a.status, tools: (a.authorized_tools || []).length })));
  },
  async agent(ref) {
    const a = await api("GET", `/agents/${await agentId(ref)}`);
    out({
      id: a.id, name: a.name, status: a.status, llm: `${a.llm_provider}/${a.llm_model}`,
      confidence_floor: a.confidence_floor, hitl_condition: a.hitl_condition,
      connector_ids: a.connector_ids, authorized_tools: a.authorized_tools,
      prompt_chars: (a.system_prompt_text || "").length,
    });
  },
  async tools(ref) {
    const a = await api("GET", `/agents/${await agentId(ref)}`);
    out(a.authorized_tools || []);
  },
  async "set-tools"(ref, ...names) {
    const id = await agentId(ref);
    out(await updateTools(id, () => names));
  },
  async "add-tools"(ref, ...names) {
    const id = await agentId(ref);
    out(await updateTools(id, (cur) => [...new Set([...cur, ...names])]));
  },
  async "remove-tools"(ref, ...names) {
    const id = await agentId(ref);
    out(await updateTools(id, (cur) => cur.filter((t) => !names.includes(t))));
  },
  // Try each tool on its own and report which the platform accepts. Leaves
  // the agent's tool list exactly as it was.
  async "check-tools"(ref, ...names) {
    const id = await agentId(ref);
    const a = await api("GET", `/agents/${id}`);
    const original = a.authorized_tools || [];
    const report = {};
    for (const n of names) {
      try {
        await api("PATCH", `/agents/${id}`, { authorized_tools: [...new Set([...original, n])] });
        report[n] = "accepted";
      } catch (e) {
        report[n] = `rejected (${e.status})`;
      }
    }
    await api("PATCH", `/agents/${id}`, { authorized_tools: original });
    out(report);
  },
  async "set-connectors"(ref, ...names) {
    const id = await agentId(ref);
    const ids = [];
    for (const n of names) ids.push(await connectorId(n));
    await api("PATCH", `/agents/${id}`, { connector_ids: ids });
    out({ connector_ids: ids });
  },
  async prompt(ref, file) {
    const id = await agentId(ref);
    if (!file) return out((await api("GET", `/agents/${id}`)).system_prompt_text || "");
    const text = fs.readFileSync(path.resolve(file), "utf8");
    await api("PATCH", `/agents/${id}`, { system_prompt_text: text });
    out(`Prompt updated (${text.length} chars) from ${file}`);
  },
  async "prompt-history"(ref) {
    out(await api("GET", `/agents/${await agentId(ref)}/prompt-history`));
  },
  async set(ref, field, value) {
    // e.g. set Baari confidence_floor 0.5 | set Baari hitl_condition "confidence < 0.3"
    const id = await agentId(ref);
    let v = value;
    if (/^-?\d+(\.\d+)?$/.test(value)) v = Number(value);
    await api("PATCH", `/agents/${id}`, { [field]: v });
    out(`${field} = ${JSON.stringify(v)}`);
  },
  async run(ref, ...task) {
    const id = await agentId(ref);
    let text = task.join(" ");
    if (text.startsWith("@")) text = fs.readFileSync(path.resolve(text.slice(1)), "utf8");
    if (!text.trim()) fail("Give the task text, or @file.txt");
    const t0 = Date.now();
    const r = await api("POST", `/agents/${id}/run`, { inputs: { task: text } });
    const log = path.join(DIR, "runs");
    fs.mkdirSync(log, { recursive: true });
    const file = path.join(log, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ agent: id, task: text, took_ms: Date.now() - t0, result: r }, null, 2));
    out(r);
    console.error(`\n(saved to ${path.relative(process.cwd(), file)})`);
  },
  async explain(ref) {
    out(await api("GET", `/agents/${await agentId(ref)}/explanation/latest`));
  },
  async promote(ref) {
    out(await api("POST", `/agents/${await agentId(ref)}/promote`, {}));
  },

  // ---- connectors
  async connectors() {
    const list = items(await api("GET", "/connectors?page=1&per_page=100"));
    out(list.map((c) => ({ id: c.id, name: c.name, base_url: c.base_url, auth: c.auth_type, status: c.status, tools: c.tool_functions })));
  },
  async connector(ref) {
    out(await api("GET", `/connectors/${await connectorId(ref)}`));
  },
  // Register a connector from a JSON file you fill in yourself, e.g.
  // connectors/gmail.json. Secrets stay in that (git-ignored) file.
  async register(file) {
    if (!file) fail("Usage: node ao.js register <connector.json>");
    const spec = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const res = await api("POST", "/connectors", spec);
    out({ registered: res.name || spec.name, id: res.id || res.connector_id, tools: res.tool_functions });
  },
  async "valid-tools"(...connectors) {
    const q = connectors.length ? `?connectors=${encodeURIComponent(connectors.join(","))}` : "";
    out(items(await api("GET", `/tools${q}`)));
  },

  // ---- anything else
  async raw(method, p, json) {
    out(await api(method.toUpperCase(), p.startsWith("/") ? p : `/${p}`, json ? JSON.parse(json) : undefined));
  },

  async help() {
    out(`AgenticOrg CLI
  node ao.js login                          (you run this; reads AO_EMAIL/AO_PASSWORD)
  node ao.js whoami
  node ao.js agents | agent <name|id> | tools <agent>
  node ao.js add-tools <agent> <tool...>    | remove-tools | set-tools
  node ao.js check-tools <agent> <tool...>  test which tools the validator accepts, no change kept
  node ao.js set-connectors <agent> <connector name...>
  node ao.js prompt <agent> [file]          print, or replace from file
  node ao.js set <agent> <field> <value>    e.g. confidence_floor 0.5
  node ao.js run <agent> "<task>" | @task.txt   saves result under runs/
  node ao.js explain <agent> | promote <agent> | prompt-history <agent>
  node ao.js connectors | connector <name|id> | valid-tools [connector...]
  node ao.js raw <METHOD> <path> [json]`);
  },
};

async function updateTools(id, fn) {
  const a = await api("GET", `/agents/${id}`);
  const next = fn(a.authorized_tools || []);
  await api("PATCH", `/agents/${id}`, { authorized_tools: next });
  const after = await api("GET", `/agents/${id}`);
  return { authorized_tools: after.authorized_tools };
}

(async () => {
  const [cmd = "help", ...args] = process.argv.slice(2);
  const fn = commands[cmd];
  if (!fn) fail(`Unknown command ${cmd}. Try: node ao.js help`);
  try {
    await fn(...args);
  } catch (e) {
    fail(e.message);
  }
})();
