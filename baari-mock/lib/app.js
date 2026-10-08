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
const wake = require("./wake");
const uat = require("./pinelabs_uat");
const turn = require("./turn");
const household = require("./household");
const kirana = require("./kirana");

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
  const r = (await delhivery.route(req)) || (await pinelabs.route(req, base)) || (await kirana.route(req));
  if (!r) return null;
  const rail = req.path.startsWith("/kirana/") ? "kirana" : req.path.startsWith("/ps/") || req.path.startsWith("/api/auth/") || req.path === "/api/v1/customer" ? "pinelabs" : "delhivery";
  if (!req.path.startsWith("/pinelabs/approve")) {
    await ops.log({
      at_ist: istString(),
      kind: "rest",
      rail,
      ...(rail === "pinelabs" ? { api: "demo" } : {}),
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
  // Wake on message (lib/wake.js). GET: settings and what a message would start now.
  if (p === "/admin/wake" && req.method === "GET") return { status: 200, body: await wake.status() };
  if (p === "/admin/wake" && req.method === "POST") return { status: 200, body: { ok: true, settings: await wake.setSettings(body) } };
  // Once a minute from baari-clock: deadlines, chain repair, status relay.
  if (p === "/admin/wake/heartbeat" && req.method === "POST") {
    wake.later(wake.heartbeat(base));
    return { status: 202, body: { ok: true } };
  }
  // The phone call demo (lib/call.js). GET: the call and its transcript.
  // POST {sim?: true}: a call night now (sim: no phone, for tests).
  if (p === "/admin/call" && req.method === "GET") return { status: 200, body: await require("./call").view(req.query.sid) };
  if (p === "/admin/call" && req.method === "POST") return { status: 200, body: await wake.startDemo("pick", "admin", base, { call: true, sim: !!body.sim }) };
  // Who holds the guest seat and who's waiting (lib/guest.js).
  if (p === "/admin/guest" && req.method === "POST" && body.clear_queue) {
    await store.del("guest:queue");
    return { status: 200, body: { ok: true, queue: [] } };
  }
  if (p === "/admin/guest" && req.method === "GET") {
    const guest = require("./guest");
    const g = await guest.state();
    return { status: 200, body: { guest: g ? { chat_id: g.chat_id, name: g.name, started_ms: g.started_ms } : null, queue: await guest.queue() } };
  }
  // A demo night: {mode: "pick"|"vote", window_s?, veto_s?, reply_s?} or {stop: true}.
  if (p === "/admin/demo" && req.method === "POST") {
    if (body.stop) return { status: 200, body: await wake.stopDemo(base) };
    const { mode, ...opts } = body;
    return { status: 200, body: await wake.startDemo(mode, "admin", base, Object.fromEntries(Object.entries(opts).filter(([k]) => /_s$/.test(k)).map(([k, v]) => [k, Number(v)]))) };
  }
  if (p === "/admin/demo" && req.method === "GET") return { status: 200, body: await wake.demo() };
  if (p === "/admin/wake/run" && req.method === "POST") {
    // {phase} runs that phase now; no phase runs the same check a message would.
    const phase = body.phase ? String(body.phase).toUpperCase() : null;
    wake.later(wake.tick(body.reason || "admin", base, phase));
    return { status: 202, body: { ok: true, started: phase || "check" } };
  }
  // The clock asks with the night's date_for before each run, which settles
  // whose baari that night is (lib/turn.js) and hands back the TURN lines.
  if (p === "/admin/handoff") {
    const date_for = req.query.date_for ? String(req.query.date_for) : null;
    const phase = String(req.query.phase || "").toUpperCase();
    let handoff = await store.get("handoff:last");
    // A shortlist (or a chat that may start one) after the last night is over
    // opens a new night, even on the same date (test nights run several a day).
    const over = !handoff || ["", "BRIEF", "COOK_REPLY"].includes(String(handoff.phase_done || "").toUpperCase());
    const fresh = ["SHORTLIST", "INBOX"].includes(phase) && over;
    const t = turn.view(date_for ? await turn.ensure(date_for, { fresh }) : await turn.get());
    // A run for a later night never gets an older night's state (it once got
    // a shortlist and votes from three days before), and neither does a new
    // shortlist on the date of a night that's already over. It keeps the
    // message cursor and a one-line note about the night before.
    const older = date_for && handoff && handoff.date_for && handoff.date_for < date_for;
    const sameDayNew = phase === "SHORTLIST" && fresh && handoff && handoff.date_for === date_for && !!handoff.phase_done;
    if (older || sameDayNew) {
      const prev = handoff;
      handoff = {
        date_for,
        phase_done: "",
        last_update_id: prev.last_update_id || 0,
        notes_for_next: `New night. The night of ${prev.date_for} ended at ${prev.phase_done || "an unknown phase"}${prev.locked && prev.locked.winner ? `, dish ${prev.locked.winner}` : ", nothing locked"}.`,
      };
    }
    return { status: 200, body: { handoff, turn: t, turn_line: turn.line(t) } };
  }
  // Save and put back the household's state around a test run on live rails:
  // whose baari, the kitchen, the last handoff, the cast and Reserve Pay.
  if (p === "/admin/snapshot" && req.method === "GET") {
    const keys = ["turn", "kitchen", "handoff:last", "cast", "cast:saved", `pl:sub:${ops.SUB_ID}`, `pl:day:${ops.SUB_ID}:${require("./util").istDate()}`];
    const snap = {};
    for (const k of keys) snap[k] = await store.get(k);
    return { status: 200, body: { at_ist: istString(), snap } };
  }
  if (p === "/admin/snapshot" && req.method === "POST") {
    const snap = (body && body.snap) || {};
    const done = [];
    for (const [k, v] of Object.entries(snap)) {
      if (v === null || v === undefined) await store.del(k);
      else await store.set(k, v);
      done.push(k);
    }
    await ops.log({ at_ist: istString(), kind: "reset", note: `snapshot restored: ${done.join(", ")}` });
    return { status: 200, body: { ok: true, restored: done } };
  }
  if (p === "/admin/kitchen" && req.method === "GET") return { status: 200, body: await household.kitchenView() };
  if (p === "/admin/kitchen" && req.method === "POST") return { status: 200, body: await household.setKitchen(body) };
  if (p === "/admin/turn" && req.method === "GET") return { status: 200, body: turn.view(await turn.get()) };
  if (p === "/admin/turn" && req.method === "POST") return { status: 200, body: await turn.set(body) };
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
  return null;
}

// POST /app/turn from the household app.
//   {action: "give", name}    tonight's baari goes to name (not once it's locked)
//   {action: "pass"}          the holder hands it to the next person; Baari sends them the card
//   {action: "in"|"out", name} take someone into or out of the rotation (two at least)
//   {action: "mode", mode}    pick or vote; tonight if tonight's dishes haven't gone out, else tomorrow
async function appTurn(b, base) {
  const h = (await store.get("handoff:last")) || {};
  const t0 = await turn.get();
  const started = !!(t0.tonight && h.date_for === t0.tonight.date_for && h.phase_done);
  const voting = String(h.phase_done || "").toUpperCase() === "SHORTLIST";
  const bad = (error) => ({ status: 400, body: { ok: false, error } });
  switch (b.action) {
    case "give": {
      if (!t0.order.includes(b.name)) return bad(`${b.name} isn't in the rotation`);
      if (t0.tonight && t0.tonight.locked) return bad("tonight is already locked; the turn moves after it");
      const v = await turn.set(t0.tonight ? { holder: b.name } : { next: b.name });
      await ops.log({ at_ist: istString(), kind: "turn", note: `app gave the baari to ${b.name}` });
      if (voting && t0.tonight && t0.tonight.holder !== b.name) wake.later(wake.tick("app give", base, { phase: "INBOX", from: b.name, extra: `TURN PASSED: the household app gave tonight's baari to ${b.name}. Send ${b.name} the holder card (I8).` }));
      return { status: 200, body: { ok: true, turn: v } };
    }
    case "pass": {
      if (!t0.tonight) return { status: 200, body: { ok: true, turn: await turn.set({ next: turn.view(t0).next }) } };
      const from = t0.tonight.holder;
      const r = await turn.pass(t0.tonight.date_for, from);
      if (!r.ok) return bad(r.error);
      await ops.log({ at_ist: istString(), kind: "turn", note: `app passed the baari from ${from} to ${r.to || "nobody"}` });
      if (voting) wake.later(wake.tick("app pass", base, { phase: "INBOX", from: r.to || from, extra: r.to ? `TURN PASSED: ${from} passed tonight's baari to ${r.to}. Send ${r.to} the holder card (I8).` : `TURN PASSED: ${from} passed and everyone else already had; nobody holds tonight's baari (I8).` }));
      return { status: 200, body: { ok: true, ...r } };
    }
    case "in":
    case "out": {
      const order = b.action === "in" ? [...new Set([...t0.order, b.name])] : t0.order.filter((x) => x !== b.name);
      if (order.length < 2) return bad("a baari needs two people");
      if (!ops.ROLES.includes(b.name)) return bad(`${b.name} isn't in the household`);
      return { status: 200, body: { ok: true, turn: await turn.set({ order }) } };
    }
    case "mode": {
      if (!turn.MODES.includes(b.mode)) return bad("mode must be pick or vote");
      const v = await turn.set({ mode: b.mode, tonight: !started });
      await ops.log({ at_ist: istString(), kind: "turn", note: `app set mode ${b.mode}${started ? " from tomorrow" : " from tonight"}` });
      return { status: 200, body: { ok: true, from: started ? "tomorrow" : "tonight", turn: v } };
    }
    default:
      return bad("action must be give, pass, in, out or mode");
  }
}

function logsPage() {
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Baari rails log</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--mute:#666;--line:#eee;--pre:#f5f5f5;--wake:#eef4ff;--bad:#fdecec;--ok:#1a7f37;--err:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#e8e8e8;--mute:#999;--line:#2a2a2a;--pre:#1e1e1e;--wake:#17233a;--bad:#3a1a1a;--ok:#4ac26b;--err:#ff7b72}}
body{font:14px system-ui;max-width:1200px;margin:16px auto;padding:0 16px;background:var(--bg);color:var(--fg)}
pre{background:var(--pre);padding:6px 8px;margin:4px 0 0;white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:180px;overflow:auto}
select,input,button{font-size:14px;padding:4px}
table{width:100%;border-collapse:collapse;table-layout:fixed}td{vertical-align:top;border-bottom:1px solid var(--line);padding:6px 4px;font-size:12px;overflow-wrap:anywhere}
td:first-child{white-space:nowrap;color:var(--mute);width:64px}
tr.wake td{background:var(--wake)}tr.bad td{background:var(--bad)}
.tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:9px;border:1px solid var(--line);margin-right:6px}
.ok{color:var(--ok)}.err{color:var(--err)}
.api{display:inline-block;font:700 10px system-ui;letter-spacing:.05em;padding:2px 6px;border-radius:4px;margin-right:6px}.api.real{background:#1a7f37;color:#fff}.api.demo{background:#c98a00;color:#fff}
#bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
#st{font-size:13px;color:var(--mute);margin-bottom:8px}
details{margin:12px 0}
</style>
<h2>Baari rails log</h2>
<div id=bar>
<label><input type=checkbox id=auto checked> live (every 3 s)</label>
<select id=flt><option value=all>everything</option><option value=wake>wake and phases</option><option value=tool>agent tool calls</option><option value=rest>REST calls</option><option value=pine>Pine Labs (real and demo)</option><option value=bad>failures only</option></select>
<button onclick=load()>Refresh</button>
</div>
<div id=st>loading…</div>
<table id=log></table>
<script>
async function get(p){const r=await fetch(p,{cache:'no-store'});return r.json()}
const esc=s=>String(s??'').replace(/[&<]/g,c=>c=='&'?'&amp;':'&lt;');
function bad(l){if(l.kind==='wake')return l.ok===false||/failed|error/.test(l.note||'');if(l.kind==='rest')return l.status>=400;if(l.kind==='tool')return /"ok":false|"http_status":"?[45][0-9][0-9]|"error"/.test(l.result||'');return false}
function keep(l,f){if(f==='all')return true;if(f==='pine')return l.rail==='pinelabs'||l.kind==='pine'||/"(name|voice_id)":"pl\./.test(l.args||'');if(f==='bad')return bad(l);if(f==='wake')return !['tool','rest'].includes(l.kind);return l.kind===f}
function api(l){const a=l.api||(/"api":"(real|demo)"/.exec(l.result||'')||[])[1];return a?'<span class="api '+a+'">'+(a==='real'?'REAL API':'DEMO API')+'</span>':''}
function row(l){const t=(l.at_ist||'').slice(11,19);const cls=bad(l)?'bad':(l.kind==='tool'||l.kind==='rest')?'':'wake';
if(l.kind==='tool')return '<tr class='+cls+'><td>'+t+'</td><td>'+api(l)+'<span class=tag>tool</span><b>'+esc(l.tool)+'</b> <small>'+esc(l.connector||'')+'</small><pre>'+esc(l.args)+'</pre></td><td><pre>'+esc(l.result)+'</pre></td></tr>';
if(l.kind==='rest')return '<tr class='+cls+'><td>'+t+'</td><td>'+api(l)+'<span class=tag>'+esc(l.rail)+'</span><b>'+esc(l.request)+'</b> <span class='+(l.status>=400?'err':'ok')+'>'+l.status+'</span> <small>'+esc(l.via)+'</small></td><td><pre>'+esc(l.response)+'</pre></td></tr>';
return '<tr class='+cls+'><td>'+t+'</td><td colspan=2>'+api(l)+'<span class=tag>'+esc(l.kind)+'</span>'+esc(l.note||JSON.stringify(l))+'</td></tr>'}
let busy=false;
async function load(){if(busy)return;busy=true;try{
const d=await get('/logs/data');const j=d,w=d.wake;
log.innerHTML=j.log.filter(l=>keep(l,flt.value)).map(row).join('');
st.innerHTML=w?('wake '+(w.settings.on?'<b class=ok>on</b>':'<b class=err>off</b>')+' · last phase: <b>'+esc(w.handoff_phase||'none')+'</b> · '+(w.busy?'<b>running</b> ('+esc(w.busy)+')':'idle')+' · next message would: '+esc(w.would.phase?'start '+w.would.phase:'wait for '+w.would.wait)+' · updated '+new Date().toLocaleTimeString()):'log loaded';
}catch(e){st.innerHTML='<b class=err>'+esc(e.message)+'</b>'}finally{busy=false}}
flt.onchange=load;
setInterval(()=>{if(auto.checked&&document.visibilityState==='visible')load()},3000);
load();
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
  if (p.startsWith("/twilio/")) return require("./call").route(req, req.base);
  // Real Pine Labs (sandbox) checkout comes back here: the payer's browser to
  // /pinelabs/return, a dashboard webhook to /pinelabs/webhook. Both are
  // checked against Pine Labs before they count (lib/pinelabs_uat.js).
  if (p === "/pinelabs/webhook" && req.method === "POST") return { status: 200, body: await uat.onCallback(req, req.base) };
  // The demo checkout, used only when the real Pine Labs sandbox can't make a
  // link. It says it's a demo; paying or cancelling goes through the same
  // /pinelabs/return as a real checkout.
  if ((m = p.match(/^\/pinelabs\/demo\/(demo-[a-z0-9]+)(?:\/(pay|cancel))?$/))) {
    const id = m[1];
    if (m[2] && req.method === "POST") {
      await uat.demoAct(id, m[2] === "pay");
      return { status: 303, headers: { Location: `/pinelabs/return?order_id=${id}`, "Cache-Control": "no-store" }, body: "" };
    }
    const o = await uat.order(id);
    const d = (o.response && o.response.data) || null;
    const amt = d ? (d.order_amount.value / 100).toFixed(2) : null;
    const open = d && d.status === "CREATED";
    return { status: d ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Pine Labs demo checkout</title><style>:root{--bg:#f4f6fb;--card:#fff;--fg:#1a1a1a;--mute:#666;--brand:#1f3a93;--warn:#fff4d6;--warnfg:#7a5a00}@media(prefers-color-scheme:dark){:root{--bg:#111;--card:#1c1c1c;--fg:#eee;--mute:#999;--brand:#7d9cff;--warn:#3a2f10;--warnfg:#f3c969}}body{font:16px system-ui;margin:0;background:var(--bg);color:var(--fg)}main{max-width:420px;margin:8vh auto;padding:0 16px}.c{background:var(--card);border-radius:16px;padding:24px;box-shadow:0 2px 16px #0001}.w{background:var(--warn);color:var(--warnfg);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:18px}h1{font-size:15px;color:var(--brand);margin:0 0 4px;letter-spacing:.04em}.a{font-size:40px;font-weight:700;margin:6px 0}.m{color:var(--mute);font-size:13px}button{width:100%;font:600 16px system-ui;border:0;border-radius:12px;padding:14px;margin-top:12px;cursor:pointer}.p{background:var(--brand);color:#fff}.n{background:transparent;color:var(--fg);border:1px solid #8884}</style><main><div class=c><div class=w><b>DEMO CHECKOUT.</b> The real Pine Labs sandbox didn't answer, so Baari made this stand-in. No money moves.</div><h1>PINE LABS · DEMO</h1>${d ? `<div class=a>Rs ${amt}</div><p class=m>For ${String(d.merchant_order_reference || "").replace(/[<&]/g, "")}<br>Order ${id}</p>${open ? `<form method=post action="/pinelabs/demo/${id}/pay"><button class=p>Pay Rs ${amt}</button></form><form method=post action="/pinelabs/demo/${id}/cancel"><button class=n>Cancel</button></form>` : `<p>This order is ${d.status}.</p>`}` : "<p>No such demo order.</p>"}</div></main>` };
  }
  if (p === "/pinelabs/return" && (req.method === "GET" || req.method === "POST")) {
    const r = await uat.onCallback(req, req.base).catch((e) => ({ ok: false, error: String(e.message || e) }));
    const msg = r.paid
      ? `Payment received on Pine Labs. Baari has been told.<br><small>Order ${r.order_id}</small>`
      : r.failed
        ? `This payment was closed without paying (${r.status}). Baari has been told and will plan without it.`
        : r.ok
          ? `Payment didn't go through (${r.status || "unknown"}). Go back to Telegram and tap the Pay button again, or tap Nahi.`
          : "We couldn't read this payment.";
    return { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Baari payment</title>${r.api === "demo" ? "<p style=\"background:#fff4d6;color:#7a5a00;border-radius:10px;padding:8px\"><b>Demo checkout.</b> Pine Labs' sandbox didn't answer, so this ran on Baari's stand-in.</p>" : ""}<style>body{font:16px system-ui;max-width:420px;margin:15vh auto;padding:0 16px;text-align:center;background:#fff;color:#1a1a1a}@media(prefers-color-scheme:dark){body{background:#141414;color:#eee}}h1{font-size:44px;margin:0}</style><h1>${r.paid ? "✅" : "⏳"}</h1><p>${msg}</p><p><small>You can go back to Telegram.</small></p>` };
  }
  // Household app feed (lib/appfeed.js). CORS for GET is added in nodeHandler.
  if (p.startsWith("/app/") && req.method === "OPTIONS") return { status: 204, body: "" };
  if (p === "/app/state" && req.method === "GET") return { status: 200, body: await appfeed.state() };
  if (p === "/app/events" && req.method === "GET") return { status: 200, body: await appfeed.events(Number(req.query.after || 0)) };
  // The household app's writes: whose baari, who's in the rotation, the mode,
  // and starting a demo night. Behind the household key (HOUSEHOLD_KEY), which
  // the Pages proxy adds server-side; the browser never holds it.
  if ((p === "/app/turn" || p === "/app/demo") && req.method === "POST") {
    if (!process.env.HOUSEHOLD_KEY) return { status: 503, body: { ok: false, error: "HOUSEHOLD_KEY is not set on rails" } };
    if (req.headers["x-household-key"] !== process.env.HOUSEHOLD_KEY) return { status: 401, body: { ok: false, error: "household key required" } };
    let b = {};
    try {
      b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    } catch {}
    if (p === "/app/demo") return { status: 200, body: b.stop ? await wake.stopDemo(req.base) : await wake.startDemo(b.mode, b.by || "app", req.base) };
    return appTurn(b, req.base);
  }
  if ((m = p.match(/^\/media\/tts\/([0-9a-f]+)\.(ogg|mp3)$/))) {
    const a = await gnani.ttsBytes(m[1]);
    const type = m[2] === "mp3" ? "audio/mpeg" : "audio/ogg";
    return a ? { status: 200, headers: { "Content-Type": type }, body: a.bytes } : { status: 404, body: { error: "expired" } };
  }
  // Small public files (demo audio, receipt images) in place of R2. Vercel caps
  // a request body at 4.5 MB, so the screen recordings go to Google Drive.
  if ((m = p.match(/^\/admin\/media\/([\w.-]{1,80})$/)) && req.method === "PUT") {
    if (!adminAuthed(req)) return { status: 401, body: { error: "admin key required" } };
    const bytes = req.rawBody || Buffer.alloc(0);
    if (!bytes.length) return { status: 400, body: { error: "empty body" } };
    const type = req.headers["content-type"] || "application/octet-stream";
    await store.set(`media:f:${m[1]}`, { type, b64: bytes.toString("base64"), at: new Date().toISOString() });
    return { status: 200, body: { ok: true, bytes: bytes.length, url: `${req.base}/media/f/${m[1]}` } };
  }
  if (p === "/admin/media" && req.method === "GET") {
    if (!adminAuthed(req)) return { status: 401, body: { error: "admin key required" } };
    const keys = await store.keys("media:f:*");
    return { status: 200, body: keys.map((k) => `${req.base}/media/f/${k.slice(8)}`) };
  }
  if ((m = p.match(/^\/media\/f\/([\w.-]{1,80})$/))) {
    const f = await store.get(`media:f:${m[1]}`);
    if (!f) return { status: 404, body: { error: "not found" } };
    return { status: 200, headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=300" }, body: Buffer.from(f.b64, "base64") };
  }
  if ((m = p.match(/^\/media\/tg\/([^/]+)$/))) {
    if (!adminAuthed(req)) return { status: 401, body: { error: "admin key required" } };
    const a = await telegram.fileBytes(m[1]);
    return { status: 200, headers: { "Content-Type": a.type }, body: a.bytes };
  }
  // Read-only live log for the team, no key: /logs. Chat ids are masked and
  // nothing on it can change state.
  if ((p === "/logs" || p === "/admin") && req.method === "GET") return { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: logsPage() };
  if (p === "/logs/data" && req.method === "GET") {
    const log = await store.range("log", 200);
    const dots = (head, tail) => "•".repeat(head.length) + tail;
    const mask = (x) => JSON.parse(JSON.stringify(x)
      .replace(/(chat_id|operator|from_id)([\\"\s:]*)(\d{3,})(\d{3})/g, (m, k, sep, head, tail) => k + sep + dots(head, tail))
      .replace(/("note":")(\d{3,})(\d{3})(?= )/g, (m, k, head, tail) => k + dots(head, tail)));
    const w = await wake.status().catch(() => null);
    return { status: 200, headers: { "Cache-Control": "no-store" }, body: mask({ log, wake: w && { settings: w.settings, busy: w.busy, handoff_phase: w.handoff_phase, would: w.would } }) };
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
    url: req.url,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: raw || undefined,
    rawBody: rawBuf,
  }).catch((e) => ({ status: 500, body: { error: String(e.stack || e) } }));

  const headers = { ...(out.headers || {}) };
  // The app on Cloudflare reads the feed and media cross-origin. GET only;
  // admin and MCP routes stay closed.
  if (/^\/(app|media\/(tts|f))\//.test(url.pathname) && ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
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
