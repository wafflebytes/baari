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
    else o.cases.push(a[i]);
  }
  const dir = path.join(ROOT, "evals/cases");
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
  const parsed = parseOutput(run.output);
  const trace = { case: c.id, title: c.title, phase: c.phase, round: o.round, target: o.target, model: o.target === "platform" ? o.platformModel : o.model, prompt: o.prompt, input: "simulated", at: new Date().toISOString(), task, output: run.output, parsed, outbox, executed: resultsForNextRun(executed), tool_calls, messages: transport.messages, spoken: env.spoken, spent_before_paise: c.spent_before_paise || 0, usage: run.usage, ms: run.ms, error, raw: run.raw };
  const verdicts = error && !run.output ? { run_error: { verdict: "fail", evidence: error.slice(0, 300) } } : judge(trace, (c.expect && c.expect.code) || []);
  if (!outbox.found && run.output) verdicts.outbox_block_present = { verdict: "fail", evidence: "no OUTBOX block" };
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

  console.log(`${c.id} ${trace.pass ? "PASS" : "FAIL"} (${fails.length} fails, ${run.tool_calls.length} calls, ${Math.round((run.ms || 0) / 1000)}s)${error ? " ERROR " + error.split("\n")[0] : ""}`);
  for (const [k, v] of fails) console.log(`   x ${k}: ${String(v.evidence).slice(0, 220)}`);
  return trace;
}

(async () => {
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
  for (let r = 0; r < o.repeat; r++)
    for (const id of o.cases) {
      await ensureKb();
      await runOne(id, o);
    }
  console.log(`LLM calls this process: ${llmStats.calls} (+${llmStats.retries} retries)`);
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
