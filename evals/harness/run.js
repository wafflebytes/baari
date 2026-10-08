#!/usr/bin/env node
// Run eval cases and judge them.
//
//   node harness/run.js --round R1 --target replica [--model qwen/qwen3.8-27b:free] [--prompt v3] [--llm] E01 E02 ...
//   node harness/run.js --round R1 --target platform E06 E07
//   node harness/run.js --round R1 --target replica all
//
// Every run is saved to evals/runs/<round>/<case>/<timestamp>.json and one row
// is appended to evals/out/runs.csv (the Runs tab of the Sheet).
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { ROOT, mcpCall, admin, sleep, llmStats } = require("./lib");
const { buildInbox, SimTransport } = require("./sim");
const { runReplica } = require("./replica");
const { parseOutput } = require("./parse");
const { judge, GENERIC } = require("./judges");
const { buildTask, parseOutbox, executeOutbox, resultsForNextRun } = require("../../agent/relay/core");
const ao = require("./ao_client");
const { ensureKb } = require("../../agent/kb/ensure");

const EVAL_AGENT = process.env.BAARI_EVAL_AGENT_ID || "4156793c-783d-493d-98f9-f363f32e26c5";
const EVAL_CUSTOMER = "cust-eval-baari";

// Raw tool name (platform, rails or relay) -> role name the prompt uses.
const ROLE = {
  speech_to_text: "stt", text_to_speech: "tts", pincode_serviceability: "serviceability", calculate_shipping_cost: "shipping_cost",
  create_shipment: "create_shipment", track_shipment: "track", cancel_shipment: "cancel_shipment", hyperlocal_create_order: "hop_create",
  hyperlocal_get_order: "hop_status", knowledge_base_search: "kb_search", create_presentation: "debit", create_payee_presentation: "pay_kirana",
  get_presentation: "debit_status", fetch_sbmd_subscription: "balance", telegram_send_message: "send_message", telegram_send_voice: "send_voice",
};
const roleOf = (name) => ROLE[String(name).split("__").pop()] || String(name).split("__").pop();

function args() {
  const a = process.argv.slice(2);
  const o = { round: "R0", target: "replica", model: process.env.OPENROUTER_MODEL_SIM || "qwen/qwen3.8-27b:free", prompt: "v3", llm: false, cases: [], repeat: 1 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--round") o.round = a[++i];
    else if (a[i] === "--target") o.target = a[++i];
    else if (a[i] === "--model") (o.model = a[++i]), (o.modelSet = true);
    else if (a[i] === "--prompt") o.prompt = a[++i];
    else if (a[i] === "--repeat") o.repeat = Number(a[++i]);
    else if (a[i] === "--llm") o.llm = true;
    else if (a[i] === "--io") o.io = a[++i];
    else o.cases.push(a[i]);
  }
  const dir = path.join(ROOT, "evals/cases");
  // v5 on talks and pays through the bridge; v3 and v4 use the OUTBOX relay.
  if (!o.io) o.io = Number(String(o.prompt).replace(/\D/g, "")) >= 5 ? "bridge" : "outbox";
  if (!o.cases.length || o.cases[0] === "all") o.cases = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).map((f) => f.replace(".yaml", "")).sort();
  return o;
}

function loadCase(id) {
  return YAML.parse(fs.readFileSync(path.join(ROOT, "evals/cases", `${id}.yaml`), "utf8"));
}

function istLabel(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() + 5.5 * 3600e3).toISOString().replace("T", " ").slice(0, 16) + " IST";
}

async function setup(c) {
  const seed = c.seed || {};
  const s = await admin("POST", "/admin/seed", {
    customer_id: EVAL_CUSTOMER,
    reserve_rupees: seed.reserve_rupees || 5000,
    debited_rupees: seed.debited_rupees || 0,
    validity_days: 30,
    allowed_payees: [{ vpa: "sharmakirana@okaxis", name: "Sharma Kirana" }],
  });
  if (s.status !== 200) throw new Error(`seed failed ${s.status}: ${JSON.stringify(s.body).slice(0, 200)}`);
  const subscriptionId = s.body.subscription.subscription_id;
  const handoff = JSON.parse(JSON.stringify(c.handoff || {}));
  if (c.shipment) {
    const order = `BAARI-EVAL-${c.id}-${Date.now().toString(36)}`;
    const { result } = await mcpCall("delhivery", "create_shipment", {
      pickup_location: { name: "baari_staples_hub" },
      shipments: [{ name: "Sharma family", order, phone: "9999999999", add: "Flat 402, Tower B, Sector 9, Rohini, Delhi", pin: "110042", city: "Delhi", state: "Delhi", country: "India", payment_mode: "Prepaid", products_desc: "chana dal 200 g", total_amount: "60", weight: "250" }],
    });
    const pkg = ((result.response || {}).packages || [])[0] || {};
    handoff.shipment = { order, waybill: pkg.waybill || "", last_status: "Manifested" };
  }
  const set = [];
  for (const sc of c.scenarios || []) {
    await admin("POST", "/admin/scenario", sc);
    set.push(sc.endpoint);
  }
  const bal = await mcpCall("pinelabs", "fetch_sbmd_subscription", { subscription_id: subscriptionId });
  const b = bal.result.response || bal.result;
  const balance = { remaining_balance: b.remaining_balance, spent_today_paise: c.spent_before_paise || 0, cap_paise: 40000 };
  return { subscriptionId, handoff, scenarios: set, balance };
}

// ---- bridge mode (v5+): the household rails, eval cast, real Telegram updates
// made by /admin/inject, sends caught by the sim sink. Shared rails state, so
// cases run one at a time and the cast is put back at the end of the round.
function bridgeArgs(name, a) {
  const l = typeof a.labels === "string" ? JSON.parse(a.labels || "{}") : a.labels || {};
  if (name === "pl.debit" || name === "pl.payee")
    return { amount: { value: Number(l.amount_paise) }, merchant_presentation_reference: l.reference, payee: l.vpa ? { vpa: l.vpa } : undefined, note: l.note };
  return l;
}

const BRIDGE_ROLE = { "tg.send": "send_message", "tg.voice": "send_voice", "pl.debit": "debit", "pl.payee": "pay_kirana", "pl.link": "pay_link", "kr.order": "kirana_order", "hh.away": "away", "hh.guests": "guests", "hh.task": "task", "hh.learn": "learn" };
function bridgeRole(e, a) {
  if (e.tool === "create_voice_clone") return BRIDGE_ROLE[a.name] || `write:${a.name}`;
  const v = String(a.voice_id || "");
  if (v.startsWith("tg.updates")) return "read_messages";
  if (v.startsWith("pl.balance")) return "balance";
  if (v.startsWith("pl.debit.")) return "debit_status";
  if (v === "tg.contacts") return "contacts";
  if (v.startsWith("pl.order.")) return "link_status";
  if (v.startsWith("kr.order")) return "kirana_status";
  if (v === "hh.kitchen") return "kitchen";
  return `read:${v}`;
}

// State a preset sets that /admin/preset can't apply yet (attendance, night
// tasks, the kitchen, prefs, memory). It lives in the preset's `state` in
// baari-mock/lib/ops.js; the harness writes it through /admin/kitchen and
// /admin/snapshot. {date_for} in a key or value is the case's night.
function presetState(name) {
  // Read the PRESETS table from the repo, never touching the store: the
  // harness env may point at live Redis.
  const saved = { a: process.env.KV_REST_API_URL, b: process.env.UPSTASH_REDIS_REST_URL };
  delete process.env.KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  try {
    const p = require("../../baari-mock/lib/ops").PRESETS[name];
    return (p && p.state) || null;
  } finally {
    if (saved.a !== undefined) process.env.KV_REST_API_URL = saved.a;
    if (saved.b !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved.b;
  }
}

// "{waybill}", "{date_for}", "{link_order_id}" in strings, anywhere in a value.
function fill(v, vars) {
  if (typeof v === "string") return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  if (Array.isArray(v)) return v.map((x) => fill(x, vars));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [fill(k, vars), fill(x, vars)]));
  return v;
}

async function applyState(st, vars) {
  if (!st) return [];
  const done = [];
  if (st.kitchen_reset || st.pantry) {
    const r = await admin("POST", "/admin/kitchen", { reset: !!st.kitchen_reset, ...(st.pantry ? { pantry: st.pantry } : {}) });
    if (r.status !== 200) throw new Error(`kitchen: ${JSON.stringify(r.body).slice(0, 200)}`);
    done.push("kitchen");
  }
  if (st.store) {
    const snap = fill(st.store, vars);
    const r = await admin("POST", "/admin/snapshot", { snap });
    if (r.status !== 200) throw new Error(`state: ${JSON.stringify(r.body).slice(0, 200)}`);
    done.push(...Object.keys(snap));
  }
  return done;
}

async function injectAll(list) {
  const spoken = {};
  let first = null;
  for (const x of list || []) {
    const body = { role: x.who, kind: x.kind };
    if (x.kind === "button") body.button_data = x.button_data;
    else if (x.kind === "voice") (body.audio_text = x.audio_text), (body.lang = x.lang || "hi-IN");
    else body.text = x.text;
    const r = await admin("POST", "/admin/inject", body);
    if (r.status !== 200 || !r.body.ok) throw new Error(`inject: ${JSON.stringify(r.body).slice(0, 200)}`);
    const u = r.body.update;
    if (first === null) first = u.update_id;
    if (x.kind === "voice") spoken[u.update_id] = x.audio_text;
  }
  return { first, spoken };
}

async function setupBridge(c) {
  const r = await admin("POST", "/admin/reset-day", {});
  if (r.status !== 200) throw new Error(`reset-day ${r.status}`);
  const date_for = (c.handoff && c.handoff.date_for) || "2026-10-05";
  const p = await admin("POST", "/admin/preset", { name: c.preset || c.id, date_for });
  if (p.status !== 200 || p.body.ok === false) throw new Error(`preset ${c.id}: ${JSON.stringify(p.body).slice(0, 200)}`);
  const vars = { date_for, link_order_id: (p.body.link && p.body.link.order_id) || "" };
  // Last case's who's-eating and night tasks for the same date go first;
  // the preset's state, if any, replaces them.
  await admin("POST", "/admin/snapshot", { snap: { [`att:${date_for}`]: null, [`prep:${date_for}`]: null } });
  const state = await applyState(presetState(c.preset || c.id), vars);
  if (c.shipment) {
    const order = `BAARI-EVAL-${c.id}-${Date.now().toString(36)}`;
    const { result } = await mcpCall("delhivery", "create_shipment", {
      pickup_location: { name: "baari_staples_hub" },
      shipments: [{ name: "Sharma family", order, phone: "9999999999", add: "Flat 402, Tower B, Sector 9, Rohini, Delhi", pin: "110042", city: "Delhi", state: "Delhi", country: "India", payment_mode: "Prepaid", products_desc: c.shipment_desc || "chana dal 200 g", total_amount: "60", weight: "250" }],
    });
    const pkg = ((result.response || {}).packages || [])[0] || {};
    vars.order = order;
    vars.waybill = pkg.waybill || "";
  }
  // The preset cleared overrides; the case may add more (case YAML wins).
  for (const sc of c.scenarios || []) await admin("POST", "/admin/scenario", sc);
  return { vars, state, tg_mark: Number((r.body && r.body.tg_mark) || 0), spoken: {}, scenarios: (c.scenarios || []).map((s) => s.endpoint), t0: Date.now() };
}

// A case is one run, or several in a row (steps:). Step 0 is the case's own
// phase, now, handoff, inject and extra; each later step takes the last
// run's HANDOFF unless it brings its own.
function stepsOf(c) {
  return [{ phase: c.phase, now: c.now, handoff: c.handoff, inject: c.inject, extra: c.extra, turn: c.turn, replace: c.replace }, ...(c.steps || [])];
}

// Rails' lines (EATING, NEEDS, PREP, CUISINE, LEARNED, EVENT, FROM) go where
// the clock puts them: after the turn lines, before HANDOFF.
// replace: {PEOPLE: "...", TURN: "..."} swaps the line that starts with that
// word (a judge household has its own people and rotation).
function withExtra(task, extra, replace) {
  for (const [k, v] of Object.entries(replace || {})) task = task.replace(new RegExp(`^${k}:.*$`, "m"), `${k}: ${v}`);
  const lines = [].concat(extra || []).filter(Boolean);
  if (!lines.length) return task;
  const i = task.indexOf("\nHANDOFF:");
  return i < 0 ? `${task}\n${lines.join("\n")}` : `${task.slice(0, i)}\n${lines.join("\n")}${task.slice(i)}`;
}

async function collectBridge(env, mark) {
  const log = await admin("GET", "/admin/log?n=120");
  const entries = (log.body.log || []).filter((e) => e.kind === "tool" && e.at_ist > mark).reverse();
  const calls = entries.map((e) => {
    let a = e.args, r = e.result;
    try { a = typeof a === "string" ? JSON.parse(a) : a; } catch {}
    try { r = typeof r === "string" ? JSON.parse(r) : r; } catch {}
    a = a || {};
    const bridged = /bridge/.test(e.connector || "");
    const tool = bridged ? bridgeRole(e, a) : roleOf(e.tool);
    return { tool, name: bridged ? `elevenlabs_gnanibaari__${e.tool}:${a.name || a.voice_id}` : e.tool, args: bridged && e.tool === "create_voice_clone" ? bridgeArgs(a.name, a) : a, result: r, via: "agent", connector: e.connector };
  });
  const sim = await admin("GET", `/admin/sim-outbox?since=${env.t0}`);
  const messages = ((sim.body && (sim.body.outbox || sim.body.items || sim.body)) || [])
    .filter((m) => m && m.at_ms >= env.t0)
    .map((m) => ({ message_id: m.message_id, to_role: m.to, kind: m.kind, text: m.text || m.caption || "", buttons: m.buttons || null, audio_url: m.audio_url || null }));
  // A message no tg.send or tg.voice of the agent's made is rails' own (the
  // night task and its reminder, the veto heads-up): source "rails".
  const sent = calls.filter((c) => c.tool === "send_message").map((c) => String((c.args || {}).text || "").trim());
  const voices = calls.filter((c) => c.tool === "send_voice").length;
  let v = 0;
  for (const m of messages) {
    const mine = m.kind === "voice" ? v++ < voices : sent.some((x) => x && (m.text.trim() === x || m.text.trim().endsWith(x)));
    if (!mine) m.source = "rails";
  }
  return { calls, messages };
}

async function teardown(env) {
  for (const ep of env.scenarios) await admin("POST", "/admin/scenario", { endpoint: ep, scenario: "normal" });
}

function systemPrompt(version) {
  return fs.readFileSync(path.join(ROOT, "agent/prompts", `${version}.md`), "utf8");
}

async function platformRun(task) {
  const before = await admin("GET", "/admin/log?n=1");
  const mark = ((before.body.log || [])[0] || {}).at_ist || "";
  const t0 = Date.now();
  const { result } = await ao.run(EVAL_AGENT, task);
  const ms = Date.now() - t0;
  await sleep(1500);
  const log = await admin("GET", "/admin/log?n=80");
  const entries = (log.body.log || []).filter((e) => e.kind === "tool" && (!mark || e.at_ist > mark)).reverse();
  const calls = entries.map((e) => {
    let a = e.args;
    let r = e.result;
    try {
      a = typeof a === "string" ? JSON.parse(a) : a;
    } catch {}
    try {
      r = typeof r === "string" ? JSON.parse(r) : r;
    } catch {}
    return { name: e.tool, args: a || {}, result: r, ms: e.ms, via: "agent", connector: e.connector };
  });
  const out = result.output || {};
  const text = typeof out === "string" ? out : out.raw_output || out.answer || out.result || JSON.stringify(out);
  return { output: text, tool_calls: calls, usage: { platform_run_id: result.run_id, status: result.status, confidence: result.confidence }, ms, raw: { status: result.status, confidence: result.confidence, run_id: result.run_id, reasoning_trace: (result.reasoning_trace || []).slice(0, 40) } };
}

function csvCell(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function runOne(id, o) {
  const c = loadCase(id);
  if (o.io === "bridge") return runOneBridge(c, o);
  const env = await setup(c);
  let run;
  let outbox = { items: [], found: false, errors: [] };
  let executed = [];
  const transport = new SimTransport({ subscriptionId: env.subscriptionId });
  let task = "";
  let error = null;
  try {
    const { inbox, spoken } = await buildInbox(c.inject, c.now, (c.handoff && c.handoff.last_update_id ? c.handoff.last_update_id : 81230000) + 1);
    env.spoken = spoken;
    task = buildTask({ phase: c.phase, now: istLabel(c.now), dateFor: (c.handoff && c.handoff.date_for) || "2026-10-05", balance: env.balance, inbox, results: c.results || [], handoff: env.handoff });
    const system = systemPrompt(o.prompt);
    run = o.target === "platform" ? await platformRun(task) : await runReplica({ system, task, model: o.model });
    outbox = parseOutbox(run.output);
    executed = await executeOutbox(outbox.items, transport, { pollMs: 800 });
  } catch (e) {
    error = String(e.stack || e.message || e);
    run = run || { output: "", tool_calls: [], usage: {}, ms: 0 };
  } finally {
    await teardown(env);
  }

  // One trace shape for judges, whatever the target.
  const tool_calls = run.tool_calls.map((x) => ({ tool: roleOf(x.name), name: x.name, args: x.args, result: x.result, via: x.via }));
  // While balance comes in the task text (TOOLMAP balance = BALANCE line), the
  // read happened before the run: count it first so balance-before-debit holds.
  if (/^BALANCE:/m.test(task)) tool_calls.unshift({ tool: "balance", name: "BALANCE line", args: {}, result: env.balance, via: "task" });
  for (const e of executed) {
    if (e.action === "debit" || e.action === "pay_kirana") {
      for (const inner of (e.result && e.result.calls) || []) tool_calls.push({ tool: roleOf(inner.tool), name: inner.tool, args: inner.args, result: inner.result, via: "relay", outbox_id: e.id });
      if (!(e.result && e.result.calls)) tool_calls.push({ tool: e.action, args: {}, result: e.result, via: "relay", outbox_id: e.id });
    } else {
      const item = outbox.items.find((i) => i.id === e.id) || { args: {} };
      tool_calls.push({ tool: e.action, args: item.args, result: e.result, via: "relay", outbox_id: e.id });
    }
  }
  return finish(c, o, { run, task, error, tool_calls, messages: transport.messages, spoken: env.spoken, outbox, executed });
}

async function finish(c, o, { run, task, error, tool_calls, messages, spoken, outbox, executed, steps, parsed: merged }) {
  const parsed = merged || parseOutput(run.output);
  const trace = { case: c.id, title: c.title, phase: c.phase, steps: steps || undefined, pending: c.pending || undefined, round: o.round, target: o.target, model: o.target === "platform" ? o.platformModel : o.model, prompt: o.prompt, input: "simulated", at: new Date().toISOString(), task, output: run.output, parsed, io: o.io, outbox, executed: resultsForNextRun(executed || []), tool_calls, messages, spoken, spent_before_paise: c.spent_before_paise || 0, usage: run.usage, ms: run.ms, error, raw: run.raw };
  const verdicts = error && !run.output ? { run_error: { verdict: "fail", evidence: error.slice(0, 300) } } : judge(trace, (c.expect && c.expect.code) || [], (c.expect && c.expect.skip) || {});
  if (o.io === "bridge") {
  } else if (!outbox.found && run.output) verdicts.outbox_block_present = { verdict: "fail", evidence: "no OUTBOX block" };
  else if (outbox.errors.length) verdicts.outbox_block_present = { verdict: "fail", evidence: JSON.stringify(outbox.errors).slice(0, 200) };
  else verdicts.outbox_block_present = { verdict: "pass", evidence: `${outbox.items.length} items` };
  if (o.llm && run.output) {
    const { llmJudge } = require("./llm_judges");
    for (const name of (c.expect && c.expect.llm) || []) verdicts[`llm:${name}`] = await llmJudge(name, trace);
  }
  trace.verdicts = verdicts;
  const fails = Object.entries(verdicts).filter(([, v]) => v.verdict === "fail");
  trace.pass = fails.length === 0;

  const dir = path.join(ROOT, "evals/runs", o.round, c.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${trace.at.replace(/[:.]/g, "-")}_${o.target}.json`);
  fs.writeFileSync(file, JSON.stringify(trace, null, 2));

  const csv = path.join(ROOT, "evals/out/runs.csv");
  fs.mkdirSync(path.dirname(csv), { recursive: true });
  if (!fs.existsSync(csv)) fs.writeFileSync(csv, "round,case,target,model,prompt,input,at,platform_run_id,pass,fails,first_fail,llm_calls,tool_calls,ms,trace\n");
  const row = [o.round, c.id, o.target, trace.model, o.prompt, "simulated", trace.at, (run.usage && run.usage.platform_run_id) || "", trace.pass ? "pass" : "fail", fails.length, fails[0] ? `${fails[0][0]}: ${fails[0][1].evidence}`.slice(0, 200) : "", (run.usage && run.usage.llm_calls) || "", run.tool_calls.length, run.ms, path.relative(ROOT, file)];
  fs.appendFileSync(csv, row.map(csvCell).join(",") + "\n");

  // A pending case waits on a rails feature that isn't built (its notes say
  // which); its result is reported but doesn't count against the prompt.
  console.log(`${c.id} ${trace.pass ? "PASS" : "FAIL"}${c.pending ? ` [pending: ${c.pending}]` : ""} (${fails.length} fails, ${run.tool_calls.length} calls, ${Math.round((run.ms || 0) / 1000)}s)${error ? " ERROR " + error.split("\n")[0] : ""}`);
  for (const [k, v] of fails) console.log(`   x ${k}: ${String(v.evidence).slice(0, 220)}`);
  return trace;
}

async function runOneBridge(c, o) {
  const before = await admin("GET", "/admin/log?n=1");
  let mark = ((before.body.log || [])[0] || {}).at_ist || "";
  let error = null;
  let env = { spoken: {}, scenarios: [] };
  const runs = [];
  try {
    if (o.target !== "platform") throw new Error("bridge mode runs on the platform only (the replica still serves OUTBOX tools)");
    env = await setupBridge(c);
    let prev = null;
    for (const [i, st] of stepsOf(c).entries()) {
      const inj = await injectAll(fill(st.inject || [], env.vars));
      Object.assign(env.spoken, inj.spoken);
      const own = st.handoff || (i === 0 ? {} : null);
      let handoff = JSON.parse(JSON.stringify(own ? fill(own, env.vars) : prev || {}));
      if (c.shipment && !handoff.shipment && env.vars.waybill) handoff.shipment = { order: env.vars.order, waybill: env.vars.waybill, last_status: "Manifested" };
      if (inj.first !== null) handoff.last_update_id = inj.first - 1;
      else if (own) handoff.last_update_id = env.tg_mark;
      const m2 = await admin("GET", "/admin/log?n=1");
      mark = ((m2.body.log || [])[0] || {}).at_ist || mark;
      const t1 = Date.now();
      const now = st.now || c.now;
      const task = withExtra(buildTask({ phase: st.phase, now: istLabel(now), dateFor: handoff.date_for || (c.handoff && c.handoff.date_for) || "2026-10-05", handoff, bridge: true, turn: st.turn || c.turn }), fill(st.extra, env.vars), fill(st.replace || c.replace, env.vars));
      const { result, ms, via } = await ao.run(EVAL_AGENT, task);
      await sleep(1500);
      const got = await collectBridge({ t0: t1 }, mark);
      const out = result.output || {};
      const output = typeof out === "string" ? out : out.raw_output || out.answer || JSON.stringify(out);
      const parsed = parseOutput(output);
      runs.push({ phase: st.phase, now, task, output, parsed, tool_calls: got.calls, messages: got.messages, usage: { platform_run_id: result.run_id, status: result.status, confidence: result.confidence, via }, ms: ms || Date.now() - t1, raw: { status: result.status, run_id: result.run_id, error: result.error || null, reasoning_trace: (result.reasoning_trace || []).slice(0, 40) } });
      if (!parsed.handoff && i < stepsOf(c).length - 1) throw new Error(`step ${i} (${st.phase}) left no HANDOFF JSON, so step ${i + 1} can't run`);
      prev = parsed.handoff;
      // The night task's person, for a later step's FROM (prep missed wakes INBOX from them).
      const task_ = got.calls.filter((x) => x.tool === "task").pop();
      if (task_ && task_.args && task_.args.who) env.vars.task_who = task_.args.who;
    }
  } catch (e) {
    error = String(e.stack || e.message || e);
  } finally {
    for (const ep of env.scenarios || []) await admin("POST", "/admin/scenario", { endpoint: ep, scenario: "normal" });
  }
  // One trace: the last run's output and HANDOFF, every run's calls and
  // messages, and each run on its own in steps for step-scoped checks.
  const last = runs[runs.length - 1] || { output: "", tool_calls: [], messages: [], usage: {}, ms: 0, task: "" };
  const run = { output: runs.length > 1 ? runs.map((r, i) => `=== step ${i} ${r.phase}\n${r.output}`).join("\n\n") : last.output, tool_calls: runs.flatMap((r) => r.tool_calls), usage: { ...last.usage, platform_run_ids: runs.map((r) => r.usage.platform_run_id) }, ms: runs.reduce((a, r) => a + (r.ms || 0), 0), raw: runs.length > 1 ? runs.map((r) => r.raw) : last.raw };
  const steps = runs.length > 1 ? runs.map(({ phase, now, task, output, parsed, tool_calls, messages }) => ({ phase, now, task, output, parsed, tool_calls, messages })) : null;
  return finish(c, o, { run, task: runs.map((r) => r.task).join("\n\n"), error, tool_calls: run.tool_calls, messages: runs.flatMap((r) => r.messages), spoken: env.spoken, outbox: { items: [], found: false, errors: [] }, executed: [], steps, parsed: runs.length > 1 ? mergeParsed(runs) : null });
}

// The decisions of every run, the last run's HANDOFF and NEXT.
function mergeParsed(runs) {
  const ps = runs.map((r) => r.parsed);
  const lastP = ps[ps.length - 1];
  return { ...lastP, decisions: ps.flatMap((p, i) => p.decisions.map((d) => ({ ...d, step: i }))), has_decisions: ps.every((p) => p.has_decisions), has_handoff: ps.every((p) => p.has_handoff), has_next: ps.every((p) => p.has_next) };
}

async function main() {
  const o = args();
  if (o.target === "platform") {
    // --model azure_openai/deployment:gpt-5.4 pins Baari-eval before the round.
    const want = o.modelSet ? o.model : "azure_openai/deployment:gpt-4o";
    const [provider, ...rest] = want.split("/");
    await ao.api("PATCH", `/agents/${EVAL_AGENT}`, { llm: { provider, model: rest.join("/") } });
    o.platformModel = want;
    // The prompt under test goes on Baari-eval too, so the trace label is true.
    const text = systemPrompt(o.prompt);
    await ao.api("PATCH", `/agents/${EVAL_AGENT}`, { system_prompt_text: text });
    const a = await ao.api("GET", `/agents/${EVAL_AGENT}`);
    if ((a.system_prompt_text || "").trim() !== text.trim()) throw new Error(`Baari-eval prompt is not ${o.prompt} after PATCH`);
  }
  console.log(`round ${o.round}, target ${o.target}, model ${o.target === "platform" ? o.platformModel : o.model}, prompt ${o.prompt}, cases ${o.cases.join(" ")}`);
  // Presets may reset the kitchen and write the last handoff; the
  // household's own copies go back after the round.
  let snap = null;
  if (o.io === "bridge") {
    const g = await admin("GET", "/admin/snapshot");
    if (g.status === 200 && g.body.snap) snap = { kitchen: g.body.snap.kitchen, "handoff:last": g.body.snap["handoff:last"], turn: g.body.snap.turn };
    const r = await admin("POST", "/admin/cast", { eval: true });
    if (r.status !== 200) throw new Error(`eval cast: ${JSON.stringify(r.body).slice(0, 200)}`);
  }
  try {
    for (let r = 0; r < o.repeat; r++)
      for (const id of o.cases) {
        await ensureKb();
        await runOne(id, o);
      }
  } finally {
    // W1's ask: the real cast goes back after every eval round.
    if (o.io === "bridge") await admin("POST", "/admin/cast", { eval: false });
    if (snap) await admin("POST", "/admin/snapshot", { snap });
  }
  console.log(`LLM calls this process: ${llmStats.calls} (+${llmStats.retries} retries)`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e.stack || e);
    process.exit(1);
  });

module.exports = { fill, withExtra, stepsOf, mergeParsed, presetState, bridgeRole };
