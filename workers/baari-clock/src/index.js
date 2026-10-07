// baari-clock: starts Baari's phases on AgenticOrg (PRD 16 and 18.3).
//
// It is a trigger only. It builds the task text (PHASE, NOW, DATE_FOR, the
// last HANDOFF from rails, the RECORDING tag), calls POST /agents/{id}/run,
// hands the output to rails /admin/run-output and remembers the result. Every
// decision still happens inside the platform run.
//
//   POST /fire     {phase, now_ist?, date_for?, recording_tag?, agent?, extra?}   key
//   GET  /status   in-flight run, last run per phase, session expiry, switches   key
//   POST /auto     {on, seconds}       auto-advance to the next phase             key
//   POST /crons    {on}                let the cron triggers fire                 key
//   POST /session  {access_token, csrf}  replace the AgenticOrg session           key
//   POST /kb/files {files: {name: text}}  the BAARI_ KB copy kept in KV             key
//   POST /kb/heal  check the KB now and re-upload missing BAARI_ files            key
//   GET  /         health, no key
//
// One cron every 5 minutes: at a phase's IST time it fires that phase, and at
// :00 and :30 it refreshes the AgenticOrg session. Phases do nothing unless
// /crons is on, so a rehearsal or an eval round never gets a surprise
// SHORTLIST at 20:30.

const PHASES = ["SHORTLIST", "LOCK", "CHECK", "BRIEF", "COOK_REPLY"];
// INBOX: a message no phase is waiting for (prompt v6). Rails starts it with
// the real NOW and FROM; it never auto-advances and has no cron time.
const ALL_PHASES = [...PHASES, "INBOX"];
// Simulated clock per phase (PRD 18.2). CHECK also runs at 06:30.
const CLOCK = { SHORTLIST: "20:30", LOCK: "21:30", CHECK: "22:45", BRIEF: "07:45", COOK_REPLY: "08:05" };
// UTC HH:MM -> phase (20:30, 21:30, 22:45, 06:30, 07:45, 08:05 IST).
const UTC_PHASE = { "15:00": "SHORTLIST", "16:00": "LOCK", "17:15": "CHECK", "01:00": "CHECK", "02:15": "BRIEF", "02:35": "COOK_REPLY" };
// AgenticOrg sits behind Cloudflare, which answers 403 to requests without a
// browser-like User-Agent.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) baari-clock/1.0";
const AGENTS = { Baari: "36ae8107-adf6-4412-a707-abe19dbf92af", "Baari-eval": "4156793c-783d-493d-98f9-f363f32e26c5" };

const json = (body, status = 200) => new Response(JSON.stringify(body, null, 1), { status, headers: { "content-type": "application/json" } });

function istNow() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
}

function shiftDay(d, n) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

// Evening phases are for tomorrow's food; morning phases are the same day.
function dateFor(nowIst) {
  const [d, t] = nowIst.split(" ");
  if (t >= "12:00") {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    return x.toISOString().slice(0, 10);
  }
  return d;
}

function jwtExp(token) {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000;
  } catch {
    return 0;
  }
}

async function session(env) {
  const s = await env.CLOCK.get("session", "json");
  if (s && s.access_token && jwtExp(s.access_token) > Date.now()) return s;
  if (env.AO_SESSION) return { access_token: env.AO_SESSION, csrf: env.AO_CSRF || "baari" };
  return s;
}

async function refreshSession(env) {
  const s = await session(env);
  if (!s || jwtExp(s.access_token) < Date.now()) return { ok: false, error: "session expired; POST /session with a fresh login" };
  const r = await fetch(`${env.AO_BASE}/api/v1/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${s.access_token}`, "content-type": "application/json", "user-agent": UA }, body: "{}" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) return { ok: false, error: `refresh HTTP ${r.status}` };
  const next = { access_token: j.access_token, csrf: s.csrf, refreshed_at: new Date().toISOString() };
  await env.CLOCK.put("session", JSON.stringify(next));
  return { ok: true, expires: new Date(jwtExp(j.access_token)).toISOString() };
}

async function ao(env, method, path, body) {
  const s = await session(env);
  if (!s) throw new Error("no AgenticOrg session");
  const res = await fetch(`${env.AO_BASE}/api/v1${path}`, {
    method,
    headers: { Cookie: `agenticorg_session=${s.access_token}; agenticorg_csrf=${s.csrf}`, "X-CSRF-Token": s.csrf, "content-type": "application/json", accept: "application/json", "user-agent": UA },
    body: body ? JSON.stringify({ ...body, csrf_token: s.csrf }) : undefined,
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const err = new Error(`AgenticOrg ${method} ${path} -> ${res.status}: ${String(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// The gateway in front of /run gives up at about 30 s with a 504 while the
// run carries on; LOCK takes longer than that. On a 504 or 502, find our run
// in /agent-runs (started after the call, same task text) and wait for it.
// Same recovery as evals/harness/ao_client.js.
async function runAgent(env, agent, task) {
  const t0 = Date.now();
  try {
    return await ao(env, "POST", `/agents/${agent}/run`, { inputs: { task } });
  } catch (e) {
    if (e.status !== 504 && e.status !== 502) throw e;
  }
  const head = task.slice(0, 120);
  const done = ["completed", "failed", "hitl_triggered"];
  // Every 6 s for about 3.5 minutes: the free plan allows 50 subrequests per call.
  for (let i = 0; i < 35; i++) {
    await new Promise((res) => setTimeout(res, 6000));
    const l = await ao(env, "GET", `/agent-runs?agent_id=${agent}&limit=10`);
    const hit = (Array.isArray(l) ? l : l.items || [])
      .filter((x) => Date.parse(x.started_at || x.created_at) >= t0 - 5000 && String(x.query || "").replace(/\\n/g, "\n").includes(head))
      .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))[0];
    if (!hit || !done.includes(String(hit.status))) continue;
    const d = await ao(env, "GET", `/agent-runs/${hit.id}`);
    const answer = (d.result && (d.result.raw_output || d.result.output)) || d.answer || d.result;
    return { run_id: d.id, status: d.status, confidence: d.confidence ?? null, output: { raw_output: typeof answer === "string" ? answer : JSON.stringify(answer) }, via: "agent-runs after 504" };
  }
  throw new Error("run gave 504 and never showed up in /agent-runs");
}

// Other teams keep deleting every KB document in the shared org. Before each
// fire, and on every 5-minute tick, compare GET /knowledge/documents with our
// copy in KV and re-upload what is missing (same check as agent/kb/ensure.js,
// which only runs while Chaitanya's laptop is awake). Only BAARI_ files.
async function kbHeal(env) {
  const want = (await env.CLOCK.get("kb:files", "json")) || {};
  const names = Object.keys(want);
  if (!names.length) return { ok: false, error: "no KB copy in KV; POST /kb/files" };
  const have = new Set();
  for (let offset = 0, page = 0; page < 20; page++) {
    const r = await ao(env, "GET", `/knowledge/documents?limit=200&offset=${offset}`);
    const items = Array.isArray(r) ? r : r.items || r.documents || [];
    for (const d of items) if (!d.deleted && d.status !== "deleted") have.add(d.filename || d.name || d.document_name);
    offset += items.length;
    if (!items.length || offset >= (r.total || 0)) break;
  }
  const missing = names.filter((n) => !have.has(n));
  const failed = [];
  const s = await session(env);
  for (let i = 0; i < missing.length; i += 6) {
    await Promise.all(missing.slice(i, i + 6).map(async (n) => {
      const fd = new FormData();
      fd.append("file", new Blob([want[n]], { type: "text/markdown" }), n);
      fd.append("csrf_token", s.csrf);
      const r = await fetch(`${env.AO_BASE}/api/v1/knowledge/upload?replace=true`, { method: "POST", headers: { Cookie: `agenticorg_session=${s.access_token}; agenticorg_csrf=${s.csrf}`, "X-CSRF-Token": s.csrf, accept: "application/json", "user-agent": UA }, body: fd });
      if (!r.ok) failed.push(`${n}: ${r.status}`);
    }));
  }
  const out = { ok: !failed.length, total: names.length, missing: missing.length, reuploaded: missing.length - failed.length, failed, at_ist: istNow() };
  await env.CLOCK.put("kb:last", JSON.stringify(out));
  return out;
}

async function rails(env, method, path, body) {
  const r = await fetch(`${env.RAILS_BASE}${path}`, { method, headers: { "x-admin-key": env.RAILS_ADMIN_KEY, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json().catch(() => ({}));
}

function taskText({ phase, now, date_for, handoff, tag, extra, turn }) {
  const lines = [];
  if (tag) lines.push(`RECORDING: ${tag}`);
  lines.push(`PHASE: ${phase}`, `NOW: ${now} IST`, `DATE_FOR: ${date_for}`, "PEOPLE: Vinay (approves money), Mummy, Papa, Sunita (cook)");
  if (turn) lines.push(turn);
  if (extra) lines.push(String(extra));
  lines.push("HANDOFF:", "```json", JSON.stringify(handoff || {}), "```");
  return lines.join("\n");
}

async function fire(env, ctx, p) {
  const phase = String(p.phase || "").toUpperCase();
  if (!ALL_PHASES.includes(phase)) return json({ ok: false, error: `phase must be one of ${ALL_PHASES.join(", ")}` }, 400);
  if (phase === "INBOX" && !p.now_ist) return json({ ok: false, error: "INBOX needs now_ist" }, 400);
  const inflight = await env.CLOCK.get("inflight", "json");
  if (inflight && Date.now() - inflight.started_ms < 10 * 60e3) return json({ ok: false, error: `a run is already in flight: ${inflight.phase} since ${inflight.started_ist}` }, 409);

  // With date_for given, the phase's clock time sits on the right night:
  // evening phases the day before date_for, morning phases on date_for.
  const evening = ["SHORTLIST", "LOCK", "CHECK"].includes(phase);
  const day = p.date_for ? (evening ? shiftDay(p.date_for, -1) : p.date_for) : istNow().slice(0, 10);
  const now = p.now_ist ? String(p.now_ist).replace("T", " ").replace(/ IST$/, "").slice(0, 16) : `${day} ${CLOCK[phase]}`;
  const date_for = p.date_for || dateFor(now);
  const agent = AGENTS[p.agent] || p.agent || AGENTS.Baari;
  const tag = p.recording_tag || null;
  // A missing KB file is a worse run, not a reason to skip the phase.
  const kb = await kbHeal(env).catch((e) => ({ ok: false, error: String(e.message || e).slice(0, 160) }));
  // Asking with date_for settles whose baari this night is (rails lib/turn.js).
  const fromRails = await rails(env, "GET", `/admin/handoff?date_for=${encodeURIComponent(date_for)}`);
  const handoff = p.handoff || fromRails.handoff || {};
  const task = taskText({ phase, now, date_for, handoff, tag, extra: p.extra, turn: fromRails.turn_line });

  const started_ms = Date.now();
  await env.CLOCK.put("inflight", JSON.stringify({ phase, started_ms, started_ist: istNow(), agent }), { expirationTtl: 900 });
  let result;
  try {
    const r = await runAgent(env, agent, task);
    const out = r.output || {};
    const output = typeof out === "string" ? out : out.raw_output || out.answer || out.result || JSON.stringify(out);
    const saved = await rails(env, "POST", "/admin/run-output", { agent: p.agent || "Baari", phase, now_ist: `${now} IST`, output, run_id: r.run_id || null, recording_tag: tag });
    result = { ok: true, phase, run_id: r.run_id || null, status: r.status || null, confidence: r.confidence ?? null, ms: Date.now() - started_ms, decisions_count: saved.decisions ?? null, kb, handoff_saved: !!saved.handoff, next: saved.next || null, now_ist: now, date_for, recording: tag };
  } catch (e) {
    result = { ok: false, phase, error: String(e.message || e), ms: Date.now() - started_ms, now_ist: now, recording: tag, kb };
  } finally {
    await env.CLOCK.delete("inflight");
  }
  await env.CLOCK.put(`last:${phase}`, JSON.stringify({ ...result, at_ist: istNow() }));

  // Auto-advance (PRD 18.2): wait N seconds for humans to reply, then the next phase.
  const auto = (await env.CLOCK.get("auto", "json")) || { on: false, seconds: 20 };
  const next = PHASES.includes(phase) ? PHASES[PHASES.indexOf(phase) + 1] : null;
  if (result.ok && auto.on && next && ctx) {
    result.auto_next = { phase: next, in_seconds: auto.seconds };
    ctx.waitUntil(new Promise((res) => setTimeout(res, auto.seconds * 1000)).then(() => fire(env, ctx, { phase: next, recording_tag: tag, agent: p.agent })));
  }
  return json(result, result.ok ? 200 : 502);
}

async function status(env) {
  const s = await session(env);
  const last = {};
  for (const ph of ALL_PHASES) last[ph] = await env.CLOCK.get(`last:${ph}`, "json");
  const exp = s ? jwtExp(s.access_token) : 0;
  return json({
    now_ist: istNow(),
    inflight: await env.CLOCK.get("inflight", "json"),
    last,
    session: { valid: exp > Date.now(), expires: exp ? new Date(exp).toISOString() : null, minutes_left: exp ? Math.round((exp - Date.now()) / 60000) : null },
    auto: (await env.CLOCK.get("auto", "json")) || { on: false, seconds: 20 },
    crons: (await env.CLOCK.get("crons")) === "on",
    kb: await env.CLOCK.get("kb:last", "json"),
    clock: CLOCK,
  });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === "/") return json({ ok: true, service: "baari-clock", endpoints: ["POST /fire", "GET /status", "POST /auto", "POST /crons", "POST /session"] });
    const key = req.headers.get("x-clock-key") || url.searchParams.get("key");
    if (!env.CLOCK_KEY || key !== env.CLOCK_KEY) return json({ ok: false, error: "clock key required" }, 401);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (url.pathname === "/fire" && req.method === "POST") return fire(env, ctx, { ...Object.fromEntries(url.searchParams), ...body });
    if (url.pathname === "/status") return status(env);
    if (url.pathname === "/auto" && req.method === "POST") {
      const a = { on: !!body.on, seconds: Math.max(5, Math.min(120, Number(body.seconds) || 20)) };
      await env.CLOCK.put("auto", JSON.stringify(a));
      return json({ ok: true, auto: a });
    }
    if (url.pathname === "/crons" && req.method === "POST") {
      await env.CLOCK.put("crons", body.on ? "on" : "off");
      return json({ ok: true, crons: !!body.on });
    }
    if (url.pathname === "/session" && req.method === "POST") {
      if (!body.access_token) return json({ ok: false, error: "access_token required" }, 400);
      await env.CLOCK.put("session", JSON.stringify({ access_token: body.access_token, csrf: body.csrf || "baari", set_at: new Date().toISOString() }));
      return json({ ok: true, expires: new Date(jwtExp(body.access_token)).toISOString() });
    }
    if (url.pathname === "/kb/files" && req.method === "POST") {
      const files = Object.fromEntries(Object.entries(body.files || {}).filter(([n, t]) => /^BAARI_[\w.-]+\.md$/.test(n) && typeof t === "string"));
      if (!Object.keys(files).length) return json({ ok: false, error: "files: {BAARI_*.md: text}" }, 400);
      await env.CLOCK.put("kb:files", JSON.stringify(files));
      return json({ ok: true, files: Object.keys(files).length });
    }
    if (url.pathname === "/kb/heal" && req.method === "POST") return json(await kbHeal(env).catch((e) => ({ ok: false, error: String(e.message || e) })));
    if (url.pathname === "/refresh" && req.method === "POST") return json(await refreshSession(env));
    if (url.pathname === "/probe") {
      // Can this Worker reach AgenticOrg at all? (status and first bytes only)
      const s = await session(env);
      const out = {};
      for (const [label, init] of [
        ["me_cookie", { headers: { Cookie: `agenticorg_session=${s.access_token}; agenticorg_csrf=${s.csrf}`, accept: "application/json", "user-agent": UA } }],
        ["refresh_bearer", { method: "POST", headers: { Authorization: `Bearer ${s.access_token}`, "content-type": "application/json", "user-agent": UA }, body: "{}" }],
      ]) {
        const r = await fetch(`${env.AO_BASE}/api/v1/${label.startsWith("me") ? "auth/me" : "auth/refresh"}`, init);
        out[label] = { status: r.status, server: r.headers.get("server"), body: (await r.text()).slice(0, 160).replace(/eyJ[\w.-]+/g, "<jwt>") };
      }
      return json(out);
    }
    return json({ ok: false, error: "not found" }, 404);
  },

  async scheduled(event, env, ctx) {
    const hhmm = new Date(event.scheduledTime).toISOString().slice(11, 16);
    if (hhmm.endsWith(":00") || hhmm.endsWith(":30")) ctx.waitUntil(refreshSession(env));
    else ctx.waitUntil(kbHeal(env).catch(() => {}));
    const phase = UTC_PHASE[hhmm];
    if (!phase || (await env.CLOCK.get("crons")) !== "on") return;
    // A real schedule uses the real clock.
    ctx.waitUntil(fire(env, ctx, { phase, now_ist: istNow() }));
  },
};
