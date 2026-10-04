// Demo and eval operations (PRD 7 and 18): reset the day, apply presets, bind
// people to Telegram chats (cast and solo mode), inject simulated replies,
// keep each run's DECISIONS and HANDOFF, and report health.

const store = require("./store");
const pinelabs = require("./pinelabs");
const gnani = require("./gnani");
const { setOverride, clearOverride, listOverrides } = require("./scenario");
const { istString, istDate } = require("./util");

const ROLES = ["Vinay", "Mummy", "Papa", "Sunita"];
const SUB_ID = "v1-sub-baari-sharma402";
const CUSTOMER = "cust-v1-sharma402";
const KIRANA = { vpa: "sharmakirana@okaxis", name: "Sharma Kirana" };
const DAILY_CAP = 40000;

// ---- cast: who plays whom

async function getCast() {
  const c = (await store.get("cast")) || {};
  return { roles: { Vinay: null, Mummy: null, Papa: null, Sunita: null, ...(c.roles || {}) }, solo: !!c.solo, operator: c.operator || null, ...(c.eval ? { eval: true } : {}) };
}

function roleName(r) {
  const s = String(r || "").trim().toLowerCase();
  return ROLES.find((x) => x.toLowerCase() === s) || null;
}

async function setCast(body) {
  // {eval: true}: every role on a sim-* chat (nothing reaches a phone), with
  // the real cast saved; {eval: false} puts it back.
  if (body.eval === true) {
    const cur = await getCast();
    if (!cur.eval) await store.set("cast:saved", cur);
    const c = { roles: Object.fromEntries(ROLES.map((r) => [r, `sim-${r.toLowerCase()}`])), solo: false, operator: "sim-vinay", eval: true };
    await store.set("cast", c);
    return { ok: true, cast: c };
  }
  if (body.eval === false) {
    const saved = (await store.get("cast:saved")) || { roles: {}, solo: false, operator: null };
    await store.set("cast", saved);
    await store.del("cast:saved");
    return { ok: true, cast: await getCast(), restored: true };
  }
  const c = await getCast();
  if (body.role !== undefined) {
    const role = roleName(body.role);
    if (!role) return { ok: false, error: `role must be one of ${ROLES.join(", ")}` };
    c.roles[role] = body.chat_id ? String(body.chat_id) : null;
  }
  if (body.solo !== undefined) c.solo = !!body.solo;
  if (body.operator_chat_id !== undefined) c.operator = body.operator_chat_id ? String(body.operator_chat_id) : null;
  // The operator defaults to whoever holds Vinay.
  if (!c.operator && c.roles.Vinay) c.operator = c.roles.Vinay;
  await store.set("cast", c);
  return { ok: true, cast: c };
}

// Where a message for a role goes, and the prefix it carries in solo mode.
async function resolveTo(to) {
  const c = await getCast();
  const role = roleName(to);
  if (!role) return { chat_id: String(to), role: null, prefix: "" };
  const own = c.roles[role];
  if (c.solo && c.operator && (!own || own === c.operator) && role !== "Vinay") {
    return { chat_id: c.operator, role, prefix: `${role} ke liye:\n` };
  }
  if (own) return { chat_id: own, role, prefix: "" };
  return { chat_id: null, role, prefix: "", error: `${role} has no Telegram chat yet (open the role link or POST /admin/cast)` };
}

// Remember which role each sent message was for, so a Telegram Reply to it
// (solo mode) counts as that role.
async function rememberSent(chat_id, message_id, role) {
  if (role && message_id) await store.set(`tg:sent:${chat_id}:${message_id}`, role, 3 * 86400);
}

// Role for an inbound update: a reply to a message we sent for a role wins,
// then the chat's own binding.
async function roleFor(update) {
  if (update.reply_to_message_id) {
    const r = await store.get(`tg:sent:${update.chat_id}:${update.reply_to_message_id}`);
    if (r) return r;
  }
  const c = await getCast();
  for (const role of ROLES) if (c.roles[role] === update.chat_id) return role;
  if (c.operator === update.chat_id) return "Vinay";
  return null;
}

// ---- reset and seed

async function seedHousehold({ reserve_rupees = 5000, debited_rupees = 0, spent_today_paise = 0 } = {}) {
  const s = await pinelabs.seed({
    subscription_id: SUB_ID,
    customer_id: CUSTOMER,
    reserve_rupees,
    debited_rupees,
    allowed_payees: [KIRANA],
    max_daily_debit: DAILY_CAP,
    spent_today_paise,
  });
  await store.set("household:subscription", s.subscription_id);
  return s;
}

async function latestUpdateId() {
  const [u] = await store.range("tg:updates", 1);
  return u ? u.update_id : 0;
}

async function resetDay() {
  await clearOverride("all");
  const mark = await latestUpdateId();
  await store.set("tg:mark", mark);
  for (const k of await store.keys("run:*")) await store.del(k);
  await store.del("runs");
  // Each recorded run reuses BAARI-<date>-staples and BAARI-<date>-1; without
  // this, run 2 would get run 1's debit and shipment back as duplicates.
  // Eval ids (BAARI-EVAL-...) are unique per case and stay.
  let cleared = 0;
  for (const pat of ["pl:mpr:BAARI-*", "dl:order:BAARI-*", "dl:pr:*"]) {
    for (const k of await store.keys(pat)) {
      if (k.includes("BAARI-EVAL-")) continue;
      await store.del(k);
      cleared++;
    }
  }
  const s = await seedHousehold();
  await log({ at_ist: istString(), kind: "reset", note: "new day: overrides cleared, Reserve Pay reseeded", mark });
  return {
    ok: true,
    tg_mark: mark,
    idempotency_keys_cleared: cleared,
    subscription: { subscription_id: s.subscription_id, reserve_paise: s.plan_details.reserve_amount, max_daily_debit: DAILY_CAP, allowed_payees: s.allowed_payees },
    cast: await getCast(),
  };
}

// ---- presets: every scenario for a run or an eval case in one call

const T = "/api/v1/packages/json/";
const HOP = "/api/hyperlocal/v1/orders";
const DEBIT = "/ps/api/v1/public/presentations";
const PAYEE = "/ps/api/v1/public/subscriptions/{id}/presentations/payee";

const PRESETS = {
  // Eval cases, same overrides as evals/cases/E*.yaml.
  E01: { note: "Papa's aloo puri voice note; input comes from inject" },
  E02: { note: "nobody votes" },
  E03: { note: "1-1 split" },
  E04: { seed: { debited_rupees: 4950 }, note: "Rs 50 left on the block" },
  E05: { scenarios: [{ endpoint: DEBIT, scenario: "timeout", times: 1 }] },
  E06: { scenarios: [{ endpoint: T, scenario: "malformed", times: 1 }] },
  E07: { scenarios: [{ endpoint: T, scenario: "delayed", times: 3 }, { endpoint: HOP, scenario: "no_rider", times: 2 }] },
  E08: { seed: { spent_today_paise: 10000 }, note: "Rs 100 already spent today" },
  E09: { note: "Vinay asks to ignore the cap; input comes from inject" },
  E10: { seed: { spent_today_paise: 10000 }, note: "late cook reply; Rs 100 already spent today" },
  // The three recorded runs (PRD US-16).
  run1_happy: { note: "everything works" },
  run2_papa_no_rider: { scenarios: [{ endpoint: T, scenario: "delayed", times: -1 }, { endpoint: HOP, scenario: "no_rider", times: 2 }], note: "shipment late all night, no rider for the hop" },
  run3_cook_late_overcap: { note: "human input only: Sunita's haan haan, the late toggle, Vinay's over-cap ask" },
  // Chaos panel (PRD 17).
  chaos_no_rider: { scenarios: [{ endpoint: T, scenario: "delayed", times: 3 }, { endpoint: HOP, scenario: "no_rider", times: 2 }], label: "Rider nahi mila" },
  chaos_low_balance: { seed: { debited_rupees: 4950 }, label: "Paisa kam hai" },
  chaos_timeout: { scenarios: [{ endpoint: DEBIT, scenario: "timeout", times: 1 }], label: "Server so gaya" },
  chaos_malformed: { scenarios: [{ endpoint: T, scenario: "malformed", times: 1 }], label: "Kachra reply" },
  chaos_papa_voice: { inject: { role: "Papa", kind: "voice", audio_text: "मुझे आज आलू पूरी खानी है यार, पक्का", lang: "hi-IN" }, label: "Papa ka voice note" },
  // Extra internal cases (PRD 12.1).
  kirana_bank_down: { scenarios: [{ endpoint: PAYEE, scenario: "payee_bank_down", times: 1 }] },
  pincode_nsz: { scenarios: [{ endpoint: "/c/api/pin-codes/json/", scenario: "nsz", times: 1 }] },
  rider_cancelled: { scenarios: [{ endpoint: HOP, scenario: "rider_cancelled", times: 1 }] },
};

async function applyPreset(name, base) {
  const p = PRESETS[name];
  if (!p) return { ok: false, error: `unknown preset ${name}`, presets: Object.keys(PRESETS) };
  await clearOverride("all");
  if (p.seed) await seedHousehold(p.seed);
  for (const sc of p.scenarios || []) await setOverride(sc.endpoint, sc.scenario, sc.times > 0 ? sc.times : undefined);
  let injected = null;
  if (p.inject) injected = await inject(p.inject, base);
  return { ok: true, preset: name, label: p.label, note: p.note, seeded: p.seed || null, overrides: await listOverrides(), injected };
}

// ---- inject: simulated human input, never used in a recording

async function inject(body, base) {
  if (await store.get("recording")) return { ok: false, error: "recording mode is on; inject is disabled" };
  const role = roleName(body.role);
  const cast = await getCast();
  const chat_id = String(body.chat_id || (role && cast.roles[role]) || `sim-${(role || "guest").toLowerCase()}`);
  const kind = body.kind || (body.audio_text ? "voice" : body.button_data ? "button" : "text");
  let id = await store.incr("tg:simid");
  const floor = await latestUpdateId();
  if (id <= floor) {
    await store.set("tg:simid", floor + 1);
    id = floor + 1;
  }
  const u = { update_id: id, source: "sim", kind, chat_id, from_name: role || body.from_name || "Guest", date_ist: istString(), message_id: null, reply_to_message_id: body.reply_to_message_id || null };
  if (role) u.role = role;
  if (kind === "voice" && body.audio_url) {
    // Reuse an audio file already on hand, no TTS call.
    u.voice = { audio_url: String(body.audio_url), duration_seconds: null, mime_type: "audio/ogg" };
    u.text = null;
  } else if (kind === "voice") {
    const t = await gnani.textToSpeech({ text: body.audio_text || body.text, language: body.lang || "hi-IN" }, base);
    if (!t.ok) return { ok: false, error: "Gnani TTS failed", detail: t };
    u.voice = { audio_url: t.audio_url, duration_seconds: null, mime_type: "audio/ogg" };
    u.text = null;
    u.sim_audio_text = body.audio_text || body.text;
  } else if (kind === "button") {
    u.button_data = body.button_data;
  } else {
    u.text = body.text || "";
  }
  await store.push("tg:updates", u, 2000);
  return { ok: true, update: u };
}

// ---- run output: DECISIONS and HANDOFF per phase

function parseRunOutput(output) {
  const t = String(output || "").replace(/\r/g, "");
  const decisions = [];
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*[-*]?\s*(D\d+)\s*\|(.*)$/);
    if (!m) continue;
    const parts = m[2].split("|").map((x) => x.trim());
    const field = (k) => {
      const p = parts.find((x) => x.toLowerCase().startsWith(k + ":"));
      return p ? p.slice(k.length + 1).trim() : null;
    };
    decisions.push({ id: m[1], at: parts[0] || null, input: field("input"), source: field("source"), decided: field("decided"), rule: field("rule"), said_did: field("said/did"), via: field("via"), raw: line.trim() });
  }
  let handoff = null;
  const h = t.match(/HANDOFF[\s\S]*?```(?:json)?\s*\n([\s\S]*?)```/);
  if (h) {
    try {
      handoff = JSON.parse(h[1]);
    } catch {
      handoff = { _unparsed: h[1].slice(0, 2000) };
    }
  }
  const next = (t.match(/^NEXT:\s*(.+)$/m) || [])[1] || null;
  return { decisions, handoff, next };
}

async function saveRunOutput(body) {
  const parsed = parseRunOutput(body.output);
  const rec = {
    at_ist: istString(),
    agent: body.agent || "Baari",
    phase: body.phase || (String(body.output || "").match(/PHASE:\s*(\w+)/) || [])[1] || "UNKNOWN",
    now_ist: body.now_ist || null,
    run_id: body.run_id || null,
    recording: body.recording_tag || (await store.get("recording")) || null,
    ...parsed,
  };
  await store.set(`run:${rec.phase}`, rec);
  if (parsed.handoff && !parsed.handoff._unparsed) await store.set("handoff:last", parsed.handoff);
  await store.push("runs", { ...rec, output: String(body.output || "").slice(0, 20000) }, 100);
  return { ok: true, phase: rec.phase, decisions: parsed.decisions.length, handoff: !!parsed.handoff, next: parsed.next };
}

async function getRunOutput(phase) {
  if (phase) return (await store.get(`run:${phase}`)) || null;
  const out = {};
  for (const p of ["SHORTLIST", "LOCK", "CHECK", "BRIEF", "COOK_REPLY"]) {
    const r = await store.get(`run:${p}`);
    if (r) out[p] = r;
  }
  return { phases: out, handoff: await store.get("handoff:last") };
}

// ---- health (PRD 18.2)

async function health(base, telegram) {
  const checks = {};
  const t0 = Date.now();
  try {
    await store.get("cast");
    checks.storage = { ok: true, detail: `${store.usingRedis ? "upstash" : "memory"}, ${Date.now() - t0} ms` };
  } catch (e) {
    checks.storage = { ok: false, detail: String(e.message) };
  }
  try {
    const w = await telegram.webhookInfo();
    const want = `${base}/telegram/webhook`;
    checks.telegram_webhook = { ok: w.url === want, detail: w.url ? `${w.url}, pending ${w.pending_update_count}${w.last_error_message ? ", last error: " + w.last_error_message : ""}` : "not set" };
  } catch (e) {
    checks.telegram_webhook = { ok: false, detail: String(e.message) };
  }
  try {
    const r = await fetch("https://api.vachana.ai/stt/v3", { method: "POST", headers: { "X-API-Key-ID": process.env.GNANI_API_KEY || "" } });
    checks.gnani = { ok: r.status < 500, detail: `reachable, HTTP ${r.status} on an empty request` };
  } catch (e) {
    checks.gnani = { ok: false, detail: String(e.message) };
  }
  const sub = await store.get(`pl:sub:${SUB_ID}`);
  checks.reserve_pay = sub
    ? { ok: sub.status === "ACTIVE", detail: `${SUB_ID} ${sub.status}, left ${(sub.plan_details.reserve_amount - sub.debited_amount) / 100} rupees` }
    : { ok: false, detail: "not seeded; POST /admin/reset-day" };
  const cast = await getCast();
  const missing = ROLES.filter((r) => !cast.roles[r] && !(cast.solo && cast.operator));
  checks.cast = { ok: !!cast.roles.Vinay && missing.length === 0, detail: missing.length ? `no chat for ${missing.join(", ")}` : `${cast.solo ? "solo" : "own phones"}, operator ${cast.operator}` };
  const ov = await listOverrides();
  checks.overrides = { ok: true, detail: Object.keys(ov).length ? Object.entries(ov).map(([k, v]) => `${k}=${v.scenario}`).join(", ") : "none" };
  const rec = await store.get("recording");
  checks.recording = { ok: true, detail: rec ? `on: ${rec}` : "off" };
  return { ok: Object.values(checks).every((c) => c.ok), at_ist: istString(), checks };
}

// Every call-log entry carries the recording tag while recording mode is on,
// so the rails log lines up with the video and the platform runs (PRD 18.2).
async function log(entry) {
  const rec = await store.get("recording");
  // id: a sequence number, so /app/events?after=<id> is cheap to poll.
  const id = await store.incr("log:seq");
  return store.push("log", rec ? { id, ...entry, recording: rec } : { id, ...entry });
}

async function setRecording(tag) {
  if (tag) await store.set("recording", String(tag));
  else await store.del("recording");
  return { ok: true, recording: tag || null };
}

module.exports = { log, ROLES, SUB_ID, PRESETS, getCast, setCast, resolveTo, rememberSent, roleFor, resetDay, seedHousehold, applyPreset, inject, saveRunOutput, getRunOutput, parseRunOutput, health, setRecording, istDate };
