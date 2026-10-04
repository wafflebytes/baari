// One handler for everything: Delhivery and Pine Labs REST mocks, real
// Telegram and Gnani passthroughs, MCP endpoints for AgenticOrg, and the
// admin page used to set scenarios before a recording.

const store = require("./store");
const delhivery = require("./delhivery");
const pinelabs = require("./pinelabs");
const telegram = require("./telegram");
const gnani = require("./gnani");
const elevenGnani = require("./eleven_gnani");
const { catalogs } = require("./tools");
const { setOverride, clearOverride, listOverrides } = require("./scenario");
const { FAULTS } = require("./faults");
const { istString } = require("./util");
const ops = require("./ops");
const appfeed = require("./appfeed");

const ADMIN_KEY = process.env.ADMIN_KEY;
const MCP_KEY = process.env.MCP_API_KEY;

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

function clip(v, n = 1500) {
  if (v == null) return v;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Every REST call to a mock, from MCP or from outside, lands in the call log.
async function rest(req) {
  req = { query: {}, headers: {}, ...req };
  const base = req.base;
  const t0 = Date.now();
  const r = (await delhivery.route(req)) || (await pinelabs.route(req, base));
  if (!r) return null;
  const rail = req.path.startsWith("/ps/") || req.path.startsWith("/api/auth/") || req.path === "/api/v1/customer" ? "pinelabs" : "delhivery";
  if (!req.path.startsWith("/pinelabs/approve")) {
    await ops.log({
      at_ist: istString(),
      kind: "rest",
      rail,
      via: req.via || "direct",
      request: `${req.method} ${req.path}${req.query && Object.keys(req.query).length ? "?" + new URLSearchParams(req.query) : ""}`,
      body: clip(req.body, 600),
      status: r.status,
      response: clip(r.body, 800),
      ms: Date.now() - t0,
    });
  }
  return r;
}

// Audio lives either in Telegram (voice notes people sent) or in our TTS
// cache. Both are addressed by URLs on this host.
async function loadAudio(url) {
  let m = String(url).match(/\/media\/tg\/([^/?#]+)/);
  if (m) return telegram.fileBytes(m[1]);
  m = String(url).match(/\/media\/tts\/([0-9a-f]+)\.(?:ogg|mp3)/);
  if (m) {
    const a = await gnani.ttsBytes(m[1]);
    if (!a) throw new Error("audio expired or unknown");
    return a;
  }
  const res = await fetch(url);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") || "audio/ogg" };
}

// ---- MCP (streamable HTTP, JSON responses, stateless)

function mcpAuthed(req) {
  if (!MCP_KEY) return true;
  const h = req.headers;
  const bearer = (h.authorization || "").replace(/^(Bearer|Token)\s+/i, "");
  return [bearer, h["x-api-key"], h["api-key"], req.query.key].includes(MCP_KEY);
}

async function mcp(req, name) {
  const base = req.base;
  const all = catalogs({ rest: (r) => rest({ ...r, base }), base, loadAudio });
  let cat;
  if (name === "all") {
    // /mcp/all serves every rail from one connector.
    cat = { title: "Baari rails (all)", tools: Object.values(all).flatMap((c) => c.tools) };
  } else {
    cat = all[name];
  }
  if (!cat) return { status: 404, body: { error: "unknown connector" } };

  if (req.method === "GET") {
    // Some clients probe with GET for an SSE stream; we only speak JSON.
    return { status: 405, headers: { Allow: "POST" }, body: { error: "Use POST (MCP streamable HTTP, JSON responses)" } };
  }
  let rpcMethod = "";
  try {
    const peek = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    rpcMethod = Array.isArray(peek) ? peek.map((x) => x.method).join(",") : peek.method;
  } catch {}
  await store.push("mcplog", {
    at_ist: istString(),
    connector: name,
    rpc: rpcMethod,
    authed: mcpAuthed(req),
    auth_headers: Object.keys(req.headers).filter((h) => /auth|key|token/i.test(h)),
    ua: String(req.headers["user-agent"] || "").slice(0, 40),
  }, 300);
  if (!mcpAuthed(req)) {
    return { status: 401, body: { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } } };
  }

  let msg;
  try {
    msg = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return { status: 400, body: { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } } };
  }
  const batch = Array.isArray(msg);
  const out = [];
  for (const m of batch ? msg : [msg]) {
    const r = await mcpOne({ ...m, _all: all }, cat, name);
    if (r) out.push(r);
  }
  if (!out.length) return { status: 202, body: "" };
  return { status: 200, body: batch ? out : out[0] };
}

async function mcpOne(m, cat, name) {
  const reply = (result) => ({ jsonrpc: "2.0", id: m.id, result });
  if (m.id === undefined || m.id === null) return null; // notification
  switch (m.method) {
    case "initialize":
      return reply({
        protocolVersion: (m.params && m.params.protocolVersion) || "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: `baari-${name}`, title: cat.title, version: "1.0.0" },
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: cat.tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      // AgenticOrg's registry mixes up tools across MCP connectors on one
      // host, so a call may arrive on the wrong endpoint. Look in this
      // connector first, then in the others, and log the real owner.
      let tool = cat.tools.find((t) => t.name === m.params.name);
      if (!tool) {
        for (const [other, c] of Object.entries(m._all || {})) {
          const t = c.tools.find((x) => x.name === m.params.name);
          if (t) {
            tool = t;
            name = other;
            break;
          }
        }
      }
      if (!tool) return { jsonrpc: "2.0", id: m.id, error: { code: -32602, message: `Unknown tool ${m.params.name}` } };
      // Log the rail that really owns the tool, whichever endpoint it came in on.
      const owner = Object.entries(m._all || {}).find(([, c]) => c.tools.includes(tool));
      if (owner) name = owner[0];
      const args = m.params.arguments || {};
      const t0 = Date.now();
      let result;
      let isError = false;
      try {
        result = await tool.run(args);
      } catch (e) {
        result = { ok: false, error: String(e.message || e) };
        isError = true;
      }
      await ops.log({
        at_ist: istString(),
        kind: "tool",
        connector: name,
        tool: tool.name,
        args: clip(args, 800),
        result: clip(result, 1200),
        ms: Date.now() - t0,
      });
      return reply({ content: [{ type: "text", text: JSON.stringify(result) }], isError });
    }
    default:
      return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } };
  }
}

async function probe(req, name) {
  const cats = catalogs({ rest: async () => null, base: req.base, loadAudio });
  let real = name === "all" ? { tools: Object.values(cats).flatMap((c) => c.tools) } : cats[name];
  if (name === "uniq") {
    real = {
      tools: ["sheets", "telegram", "gnani", "pinelabs"].flatMap((k) => cats[k].tools.map((t) => ({ ...t, name: `bri_${t.name}` }))),
    };
  }
  if (!real || req.method !== "POST") return { status: 404, body: { error: "unknown probe" } };
  const msg = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  if (msg.id === undefined || msg.id === null) return { status: 202, body: "" };
  const reply = (result) => ({ status: 200, body: { jsonrpc: "2.0", id: msg.id, result } });
  if (msg.method === "initialize") {
    return reply({ protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: `probe-${name}`, version: "0" } });
  }
  if (msg.method === "tools/list") {
    return reply({ tools: real.tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (msg.method === "tools/call") return reply({ content: [{ type: "text", text: '{"probe":true}' }], isError: false });
  return reply({});
}

// ---- Admin

function adminAuthed(req) {
  return !ADMIN_KEY || req.query.key === ADMIN_KEY || req.headers["x-admin-key"] === ADMIN_KEY;
}

const ENDPOINTS = [
  "*",
  "/c/api/pin-codes/json/",
  "/waybill/api/bulk/json/",
  "/api/cmu/create.json",
  "/api/v1/packages/json/",
  "/api/kinko/v1/invoice/charges/.json",
  "/fm/request/new/",
  "/api/p/edit",
  "/api/p/update",
  "/api/hyperlocal/v1/orders",
  "/api/hyperlocal/v1/orders/{id}",
  "/api/auth/v1/token",
  "/ps/api/v1/public/subscriptions/sbmd",
  "/ps/api/v1/public/subscriptions/sbmd/{id}",
  "/ps/api/v1/public/presentations",
  "/ps/api/v1/public/presentations/{id}",
  "/ps/api/v1/public/subscriptions/{id}/presentations/payee",
  "/v1/speech-to-text",
];

const BUSINESS = {
  "/c/api/pin-codes/json/": ["nsz"],
  "/api/cmu/create.json": ["duplicate_order"],
  "/api/v1/packages/json/": ["delayed", "ndr", "rto"],
  "/fm/request/new/": ["pr_exist"],
  "/api/hyperlocal/v1/orders": ["no_rider", "rider_cancelled"],
  "/ps/api/v1/public/subscriptions/sbmd": ["active_exists", "bank_not_supported"],
  "/ps/api/v1/public/presentations": ["debit_declined"],
  "/ps/api/v1/public/subscriptions/{id}/presentations/payee": ["payee_bank_down", "debit_declined"],
};

async function admin(req, base) {
  if (!adminAuthed(req)) return { status: 401, body: { error: "admin key required" } };
  const body = typeof req.body === "string" && req.body ? JSON.parse(req.body) : req.body || {};
  const p = req.path;

  if (p === "/admin/scenario" && req.method === "POST") {
    const { endpoint, scenario, times } = { ...req.query, ...body };
    if (!scenario || scenario === "normal") await clearOverride(endpoint || "all");
    else await setOverride(endpoint || "*", scenario, times);
    return { status: 200, body: { ok: true, overrides: await listOverrides() } };
  }
  if (p === "/admin/scenario" && req.method === "GET") {
    return { status: 200, body: { overrides: await listOverrides(), endpoints: ENDPOINTS, transport_faults: FAULTS, business: BUSINESS } };
  }
  if (p === "/admin/seed" && req.method === "POST") {
    const s = await pinelabs.seed(body);
    await store.set("household:subscription", s.subscription_id);
    return { status: 200, body: { ok: true, subscription: s } };
  }
  if (p === "/admin/unmatched") {
    return { status: 200, body: { log: await store.range("unmatched", Number(req.query.n || 50)) } };
  }
  if (p === "/admin/mcplog") {
    return { status: 200, body: { log: await store.range("mcplog", Number(req.query.n || 100)) } };
  }
  // ---- Round 3 operations (lib/ops.js, PRD 7 and 18)
  if (p === "/admin/reset-day" && req.method === "POST") return { status: 200, body: await ops.resetDay() };
  if (p === "/admin/preset" && req.method === "POST") {
    const r = await ops.applyPreset(body.name || req.query.name, base);
    return { status: r.ok ? 200 : 404, body: r };
  }
  if (p === "/admin/preset" && req.method === "GET") {
    return { status: 200, body: { presets: Object.fromEntries(Object.entries(ops.PRESETS).map(([k, v]) => [k, { label: v.label || null, note: v.note || null, seed: v.seed || null, scenarios: v.scenarios || [], inject: v.inject ? true : false }])) } };
  }
  if (p === "/admin/cast" && req.method === "POST") {
    const r = await ops.setCast(body);
    return { status: r.ok ? 200 : 400, body: r };
  }
  if (p === "/admin/cast" && req.method === "GET") {
    const cast = await ops.getCast();
    const bot = await telegram.botUsername();
    const links = Object.fromEntries(ops.ROLES.map((r) => [r, bot ? `https://t.me/${bot}?start=role_${r.toLowerCase()}` : null]));
    return { status: 200, body: { ...cast, bot, links } };
  }
  if (p === "/admin/inject" && req.method === "POST") {
    const r = await ops.inject(body, base);
    return { status: r.ok ? 200 : 409, body: r };
  }
  if (p === "/admin/run-output" && req.method === "POST") return { status: 200, body: await ops.saveRunOutput(body) };
  if (p === "/admin/run-output" && req.method === "GET") return { status: 200, body: await ops.getRunOutput(req.query.phase) };
  if (p === "/admin/sim-outbox") {
    // since: epoch ms or an IST timestamp like 2026-10-04T18:05:00
    const since = req.query.since ? (/^\d+$/.test(req.query.since) ? Number(req.query.since) : Date.parse(req.query.since + "+05:30")) : 0;
    const items = (await store.range("sim:outbox", 1000)).filter((x) => x.at_ms > since).reverse();
    return { status: 200, body: { now_ms: Date.now(), count: items.length, items } };
  }
  if (p === "/admin/handoff") return { status: 200, body: { handoff: await store.get("handoff:last") } };
  if (p === "/admin/health") return { status: 200, body: await ops.health(base, telegram) };
  if (p === "/admin/recording" && req.method === "POST") return { status: 200, body: await ops.setRecording(body.tag || (body.on ? "on" : null)) };
  if (p === "/admin/elevenraw") {
    return { status: 200, body: { log: await store.range("elevenraw", Number(req.query.n || 50)) } };
  }
  if (p === "/admin/log") {
    return { status: 200, body: { log: await store.range("log", Number(req.query.n || 200)) } };
  }
  if (p === "/admin/log/clear" && req.method === "POST") {
    await store.del("log");
    return { status: 200, body: { ok: true } };
  }
  if (p === "/admin/telegram/webhook" && req.method === "POST") {
    return { status: 200, body: await telegram.setWebhook(base) };
  }
  if (p === "/admin/telegram/reset" && req.method === "POST") {
    await store.del("tg:updates");
    return { status: 200, body: { ok: true } };
  }
  if (p === "/admin") return { status: 200, headers: { "Content-Type": "text/html" }, body: adminPage(req.query.key || "") };
  return null;
}

function adminPage(key) {
  const opts = (xs) => xs.map((x) => `<option>${x}</option>`).join("");
  return `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Baari mock admin</title>
<style>body{font:14px system-ui;max-width:1100px;margin:20px auto;padding:0 16px}pre{background:#f4f4f4;padding:8px;white-space:pre-wrap;word-break:break-word;font-size:12px}
select,input,button{font-size:14px;padding:4px}td{vertical-align:top;border-bottom:1px solid #eee;padding:4px;font-size:12px}</style>
<h2>Baari mock admin</h2>
<p>Endpoint <select id=ep>${opts(ENDPOINTS)}</select> scenario <select id=sc>${opts(["normal", ...FAULTS, ...new Set(Object.values(BUSINESS).flat())])}</select>
times <input id=tm size=3 placeholder="∞"> <button onclick=setS()>Set</button> <button onclick="post('/admin/scenario',{scenario:'normal',endpoint:'all'})">Clear all</button></p>
<pre id=ov></pre>
<p><button onclick=load()>Refresh log</button> <button onclick="post('/admin/log/clear',{}).then(load)">Clear log</button></p>
<table id=log></table>
<script>
const K=${JSON.stringify(key)};
const q=(p)=>p+(p.includes('?')?'&':'?')+'key='+encodeURIComponent(K);
async function post(p,b){const r=await fetch(q(p),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});const j=await r.json();show();return j}
async function show(){const j=await (await fetch(q('/admin/scenario'))).json();document.getElementById('ov').textContent=JSON.stringify(j.overrides,null,1)}
function setS(){post('/admin/scenario',{endpoint:ep.value,scenario:sc.value,times:tm.value||undefined})}
async function load(){const j=await (await fetch(q('/admin/log?n=150'))).json();
document.getElementById('log').innerHTML=j.log.map(l=>'<tr><td>'+l.at_ist.slice(11,19)+'</td><td>'+(l.kind==='tool'?'<b>'+l.connector+'.'+l.tool+'</b><pre>'+esc(l.args)+'</pre>':l.rail+' '+l.via+'<br><b>'+esc(l.request)+'</b> → '+l.status)+'</td><td><pre>'+esc(l.kind==='tool'?l.result:l.response)+'</pre></td></tr>').join('')}
const esc=s=>String(s??'').replace(/[&<]/g,c=>c=='&'?'&amp;':'&lt;');
show();load();
</script>`;
}

// ---- Entry

async function handle(req) {
  req.base = baseUrl(req);
  const p = req.path;

  if (p === "/" || p === "/health") {
    return { status: 200, body: { ok: true, service: "baari-rails", storage: store.usingRedis ? "upstash" : "memory", mcp: ["delhivery", "pinelabs", "gnani", "telegram", "sheets"].map((n) => `${req.base}/mcp/${n}`) } };
  }
  // Probe endpoints: same tool names as a real connector, but every call is
  // a no-op and no key is needed. Used once to see how AgenticOrg classifies
  // a connector at registration.
  let m = p.match(/^\/mcp\/probe\/([a-z]+)\/?$/);
  if (m) return probe(req, m[1]);
  m = p.match(/^\/mcp\/([a-z]+)\/?$/);
  if (m) return mcp(req, m[1]);
  if (p === "/telegram/webhook" && req.method === "POST") return telegram.webhook(req, req.base);
  // Household app feed (lib/appfeed.js). CORS for GET is added in nodeHandler.
  if (p.startsWith("/app/") && req.method === "OPTIONS") return { status: 204, body: "" };
  if (p === "/app/state" && req.method === "GET") return { status: 200, body: await appfeed.state() };
  if (p === "/app/events" && req.method === "GET") return { status: 200, body: await appfeed.events(Number(req.query.after || 0)) };
  if ((m = p.match(/^\/media\/tts\/([0-9a-f]+)\.(ogg|mp3)$/))) {
    const a = await gnani.ttsBytes(m[1]);
    const type = m[2] === "mp3" ? "audio/mpeg" : "audio/ogg";
    return a ? { status: 200, headers: { "Content-Type": type }, body: a.bytes } : { status: 404, body: { error: "expired" } };
  }
  if ((m = p.match(/^\/media\/tg\/([^/]+)$/))) {
    if (!adminAuthed(req)) return { status: 401, body: { error: "admin key required" } };
    const a = await telegram.fileBytes(m[1]);
    return { status: 200, headers: { "Content-Type": a.type }, body: a.bytes };
  }
  if (p.startsWith("/admin")) {
    const r = await admin(req, req.base);
    if (r) return r;
  }
  req.rest = (r) => rest({ query: {}, ...r, base: req.base });
  const ev = await elevenGnani.route(req, req.base, loadAudio);
  if (ev) return ev;
  const r = await rest(req);
  if (r) return r;
  // Anything we do not recognise gets logged with its shape, so we can see
  // exactly what a platform connector sends when pointed at this server.
  await store.push("unmatched", {
    at_ist: istString(),
    method: req.method,
    path: req.path,
    query: req.query,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([k]) => !/cookie|oidc/i.test(k)).map(([k, v]) => [k, /auth|key|token/i.test(k) ? "(present)" : v])),
    body: clip(req.body, 1500),
  }, 200);
  return { status: 404, body: { detail: "Not found." } };
}

// Node http adapter, used by both Vercel and the local server. We read the
// raw body ourselves: Delhivery's create.json sends form data under a JSON
// content type, which body parsers reject.
async function nodeHandler(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const rawBuf = Buffer.concat(chunks);
  const raw = rawBuf.toString("utf8");
  const url = new URL(req.url, "http://x");
  const out = await handle({
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: raw || undefined,
    rawBody: rawBuf,
  }).catch((e) => ({ status: 500, body: { error: String(e.stack || e) } }));

  const headers = { ...(out.headers || {}) };
  // The app on Cloudflare reads the feed and media cross-origin. GET only;
  // admin and MCP routes stay closed.
  if (/^\/(app|media\/tts)\//.test(url.pathname) && ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  let payload = out.body;
  if (!Buffer.isBuffer(payload) && typeof payload !== "string") {
    payload = JSON.stringify(payload);
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  res.writeHead(out.status, headers);
  res.end(payload);
}

module.exports = { handle, nodeHandler };
