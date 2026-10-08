// Read-only feed for the household app on Cloudflare (PRD 7, 11.3, 17).
// GET /app/state and GET /app/events?after=<id>. CORS open on GET only.
//
// Built only from what already happened: the call log, the household mandate,
// the last HANDOFF and DECISIONS (from /admin/run-output) and what rails saw
// pass through (last tracking, hop, brief, STT). It never calls a mock itself,
// because that would use up counted faults and change what the agent sees.
// No chat ids, phone numbers or keys.

const crypto = require("crypto");
const store = require("./store");
const ops = require("./ops");
const turn = require("./turn");
const kirana = require("./kirana");
const uat = require("./pinelabs_uat");
const { istString, istDate } = require("./util");

const DISHES = {
  "rajma chawal": { hindi: "राजमा चावल", photo: "rajma.png" },
  "lauki chana dal": { hindi: "लौकी चना दाल", photo: "lauki-chana-dal.png" },
  "palak paneer roti": { hindi: "पालक पनीर रोटी", photo: "palak-paneer.png" },
  "kadhi chawal": { hindi: "कढ़ी चावल", photo: "kadhi.png" },
  "aloo puri": { hindi: "आलू पूरी", photo: "aloo-puri.png" },
  "chole chawal": { hindi: "छोले चावल", photo: "chole-chawal.png" },
  "egg bhurji paratha": { hindi: "अंडा भुर्जी पराठा", photo: "egg-bhurji.png" },
  "dal makhani jeera rice": { hindi: "दाल मखनी जीरा राइस", photo: "dal-makhani.png" },
  "idli sambar": { hindi: "इडली सांभर", photo: "idli-sambar.png" },
};
const FAMILY = ["Vinay", "Mummy", "Papa"];
const PHASES = ["SHORTLIST", "LOCK", "BUY", "CHECK", "BRIEF", "COOK_REPLY"];

const urlKey = (url) => crypto.createHash("sha1").update(String(url)).digest("hex").slice(0, 20);

// ---- hooks: rails notes what passes through, for the app to show later

async function noteTracking(view) {
  const s = view && view.response && view.response.ShipmentData && view.response.ShipmentData[0] && view.response.ShipmentData[0].Shipment;
  if (!s) return;
  await store.set("app:track", { waybill: s.AWB, order: s.ReferenceNo, status: s.Status && s.Status.Status, status_type: s.Status && s.Status.StatusType, expected: s.ExpectedDeliveryDate, at_ist: istString() }, 2 * 86400);
}
async function noteHop(view) {
  const r = view && view.response;
  if (!r || typeof r !== "object" || !(r.order_id || r.status)) return;
  await store.set("app:hop", { order_id: r.order_id || null, status: r.status || null, rider: r.rider || null, eta: r.eta || r.deliver_by || null, fee: r.quote || r.fee || null, at_ist: istString() }, 2 * 86400);
}
async function noteTts(audio_url, text) {
  await store.set(`app:tts:${urlKey(audio_url)}`, String(text || "").slice(0, 1500), 2 * 86400);
}
async function noteVoiceSent(role, audio_url) {
  if (role !== "Sunita") return;
  await store.set("app:brief", { audio_url, text: await store.get(`app:tts:${urlKey(audio_url)}`), at_ist: istString() }, 2 * 86400);
}
async function noteStt(audio_url, text, extract) {
  await store.set(`app:stt:${urlKey(audio_url)}`, { text, label: extract && extract.commitment, extract }, 2 * 86400);
  // A cook reply read by Gnani's extraction (Y12): its label is an event.
  if (extract && extract.commitment) await require("./events").emit("cook_reply", { who: "Sunita", rail: "gnani", label: extract.commitment, text: String(text || "").slice(0, 200) });
}

// ---- /app/state

function dish(name) {
  const d = DISHES[String(name || "").toLowerCase()] || {};
  return { dish: name, hindi: d.hindi || null, photo: d.photo || null };
}

async function householdDebits() {
  const ks = (await store.keys("pl:mpr:BAARI-*")).filter((k) => !k.includes("BAARI-EVAL-"));
  const ids = await store.mget(ks);
  const pres = await store.mget(ids.filter(Boolean).map((id) => `pl:pres:${id}`));
  const out = [];
  for (const p of pres) {
    if (!p || p.subscription_id !== ops.SUB_ID) continue;
    out.push({
      to: p.settlement ? p.settlement.payee_name || p.settlement.payee_vpa : "Baari staples hub",
      amount: p.amount.value,
      status: p.status === "PENDING" && Date.now() >= p.settle_at ? (p.fail_with ? "FAILED" : "SUCCESS") : p.status,
      ref: p.merchant_presentation_reference,
      note: p.settlement ? p.settlement.note : null,
      utr: p.utr || null,
      refunded: !!p.refund,
      at: p.due_date,
    });
  }
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// Every payment, block debit or paid link, with what it was for and why
// (PL3). The reason is what the agent said when it paid, else the run's D
// line that names the reference or the amount, in plain words.
async function payments(debits, requests, decisions) {
  const reasonFor = (ref, paise) => {
    const rs = (paise / 100).toFixed(0);
    const d = decisions.slice().reverse().find((x) => (ref && x.text.includes(ref)) || new RegExp(`Rs\\.? ?${rs}\\b`).test(x.text));
    return d ? uat.plain(d.text) : null;
  };
  const block = await Promise.all(
    debits.map(async (d) => {
      const w = await uat.whyOf(d.ref);
      return { reference: d.ref, amount: d.amount, payee: d.to, purpose: w.purpose, reason: w.reason || reasonFor(d.ref, d.amount), rule: w.rule, status: d.status, utr: d.utr, api: "demo", via: "block", refunded: d.refunded, at_ist: d.at };
    }),
  );
  const links = requests
    .filter((r) => r.status === "PAID")
    .map((r) => ({ reference: r.reference, amount: r.amount, payee: "Baari staples hub", purpose: r.for, reason: r.reason || reasonFor(r.reference, r.amount), rule: null, status: "PAID", utr: null, api: r.api, via: "link", paid_by: r.approver, refunded: false, at_ist: r.paid_at }));
  return block.concat(links).sort((a, b) => String(a.at_ist).localeCompare(String(b.at_ist))).slice(-30);
}

// The app polls every few seconds from every open phone, so the whole state
// is cached for 2 seconds, and every read that doesn't depend on another
// runs at once (it was ~45 reads one after another, about 7 s on Vercel).
const STATE_TTL_MS = 2000;
let stateMemo = null;
async function state({ fresh } = {}) {
  if (!fresh && stateMemo && Date.now() - stateMemo.at < STATE_TTL_MS) return stateMemo.body;
  if (!fresh) {
    const c = await store.get("app:state:cache").catch(() => null);
    if (c) { stateMemo = { at: Date.now(), body: c }; return c; }
  }
  const body = await buildState();
  stateMemo = { at: Date.now(), body };
  await store.setPx("app:state:cache", body, STATE_TTL_MS).catch(() => {});
  return body;
}

async function buildState() {
  const [runList, hRaw, sub, spentRaw, debits, markRaw, upsRaw, track, hop, briefRaw, turnRaw, cast, dmRaw, recording, ask, attendance, prep, logRaw, kOrder, m] = await Promise.all([
    store.mget(PHASES.map((ph) => `run:${ph}`)),
    store.get("handoff:last"),
    store.get(`pl:sub:${ops.SUB_ID}`),
    store.get(`pl:day:${ops.SUB_ID}:${istDate()}`),
    householdDebits(),
    store.get("tg:mark"),
    store.range("tg:updates", 500),
    store.get("app:track"),
    store.get("app:hop"),
    store.get("app:brief"),
    turn.get(),
    ops.getCast(),
    store.get("demo"),
    store.get("recording"),
    store.get("hh:ask"),
    require("./attendance").view().catch(() => null),
    require("./prep").view().catch(() => null),
    store.range("log", 300),
    kirana.lastOrder(),
    uat.mandateFast().catch(() => ({ ok: false })),
  ]);
  const runs = {};
  PHASES.forEach((ph, i) => { if (runList[i]) runs[ph] = runList[i]; });
  const latest = Object.values(runs).sort((a, b) => String(a.at_ist).localeCompare(String(b.at_ist))).pop();
  const h = hRaw || {};
  const spent = Number(spentRaw || 0);

  // Who has spoken since the day began. Faces only, never their choice.
  const mark = Number(markRaw || 0);
  const ups = upsRaw.filter((u) => u.update_id > mark && u.kind !== "cast");
  const voted = FAMILY.filter((r) => ups.some((u) => u.role === r && ["button", "voice", "text"].includes(u.kind)));

  const brief = briefRaw || {};
  const lastCook = ups.find((u) => u.role === "Sunita" && u.kind === "voice");

  const decisions = [];
  for (const ph of PHASES) for (const d of (runs[ph] && runs[ph].decisions) || []) decisions.push({ id: d.id, phase: ph, at: d.at, rule: d.rule, text: [d.decided, d.said_did].filter(Boolean).join(": ") });

  // Whose baari tonight (or the next night, between nights) and the record of
  // who chose what. duty_holder stays for older app builds.
  const tv = turn.view(turnRaw);
  // Who has really joined on Telegram (no chat ids leave rails).
  const members = ops.ROLES.map((r) => ({ name: r, kind: r === "Sunita" ? "cook" : "family", joined: !!cast.roles[r] && !String(cast.roles[r]).startsWith("sim-"), in_baari: tv.order.includes(r) }));
  const dm = dmRaw || {};
  const day = h.date_for || null;
  const [reply, requests, refusals] = await Promise.all([
    lastCook ? store.get(`app:stt:${urlKey(lastCook.voice.audio_url)}`).then((x) => x || {}) : {},
    day ? uat.requests(day) : [],
    uat.refusals(day),
  ]);
  // Pine Labs as the app shows it: the household's mandate (real on the
  // sandbox, and the demo block that runs its debits until it's approved)
  // and tonight's pay requests to Vinay. Read from what rails stored; the
  // mandate status is at most a minute old.
  const lastPine = logRaw.find((e) => e.api && (e.rail === "pinelabs" || e.kind === "pine"));
  const pinelabs = {
    mandate: {
      real: m.ok ? { id: m.id, status: m.status, total: m.total, ends: m.end_date, checked_at: m.checked_at } : null,
      runs_on: m.ok && m.status === "ACTIVE" ? "real" : "demo",
      why_demo: m.ok && m.status === "ACTIVE" ? null : m.ok ? `Mandate is ${m.status}: waiting for the payer's UPI approval` : "Pine Labs sandbox not reachable",
      limits: sub ? { block: sub.plan_details.reserve_amount, per_day: sub.max_daily_debit || 40000, ask_above: 30000 } : null,
    },
    requests,
    payments: await payments(debits, requests, decisions),
    refusals,
    last_call: lastPine ? { api: lastPine.api, at_ist: lastPine.at_ist, what: lastPine.request || lastPine.note || null } : null,
  };
  return {
    household: { name: "Sharma", flat: "402", duty_holder: tv.holder || tv.next, approver: tv.approver, invite: "https://t.me/Baari_ken_bot?start=join", members, demo: dm.on ? { mode: dm.mode, started_ist: dm.started_ist } : null },
    turn: { mode: tv.mode, next_mode: tv.next_mode, holder: tv.holder, next: tv.next, order: tv.order, passed: tv.passed, date_for: tv.date_for, approver: tv.approver, history: tv.history.slice(0, 7).map(({ date_for, holder, dish, how }) => ({ date_for, holder, dish, how })), picks: tv.picks_this_month },
    now_ist: latest ? latest.now_ist : null,
    date_for: h.date_for || null,
    phase: latest ? latest.phase : null,
    recording: recording || null,
    shortlist: (h.shortlist || []).map((n) => ({ ...dish(typeof n === "string" ? n : n.dish), missing: [] })),
    votes: { voted, pending: FAMILY.filter((r) => !voted.includes(r)), closes_at: "21:30" },
    locked: h.locked ? { ...h.locked, winner_hindi: dish(h.locked.winner).hindi, runner_up_hindi: dish(h.locked.runner_up).hindi } : null,
    missing: h.missing || [],
    khata: sub
      ? { block_total: sub.plan_details.reserve_amount, used: sub.debited_amount, left: sub.plan_details.reserve_amount - sub.debited_amount, cap_today: sub.max_daily_debit || 40000, spent_today: spent, payees: (sub.allowed_payees || []).map((p) => p.name || p.vpa), debits }
      : null,
    delivery: {
      waybill: (h.shipment && h.shipment.waybill) || (track && track.waybill) || null,
      status: track ? track.status : (h.shipment && h.shipment.last_status) || null,
      expected: track ? track.expected : null,
      seen_at: track ? track.at_ist : null,
      hop: hop || null,
      kirana_pickup: (h.missing || []).filter((m) => m.route === "kirana").map((m) => m.item),
      // Tonight's Sharma Kirana order (lib/kirana.js): what's packed, the
      // bill, and whether Reserve Pay has paid it.
      kirana_order: (() => {
        const o = kOrder;
        if (!o || (h.date_for && o.order_ref && !o.order_ref.includes(h.date_for))) return null;
        return { order_id: o.order_id, status: o.status, lines: o.lines, total_rupees: o.total_rupees, paid: !!o.paid, utr: o.utr || null, pickup_by: o.pickup_by, picker: o.picker };
      })(),
    },
    brief: { audio_url: brief.audio_url || null, text: brief.text || null, reply_text: reply.text || null, reply_label: reply.label || null, reply_extract: reply.extract || null },
    decisions,
    pinelabs,
    // The open Haan/Nahi spend ask (the kirana's Rs 300 rule), for the island.
    approvals: ask ? [ask] : [],
    run: runOf(logRaw),
    attendance,
    prep,
    // ---- W3 memory block (S8): profile, memory, quiet log, gaps, last ask call
    ...(await w3State()),
  };
}

// ---- W3 memory block (S8): lib/profile.js, memory.js, quiet.js, gaps.js, callask.js
async function w3State() {
  const safe = (p) => p.catch(() => null);
  const [profile, memory, quiet, gaps, call] = await Promise.all([
    safe(require("./profile").state()),
    safe(require("./memory").state()),
    safe(require("./quiet").state()),
    safe(require("./gaps").state()),
    safe(require("./callask").state()),
  ]);
  return { profile, memory, quiet, gaps, call };
}

// ---- the run in flight, in plain words (S4)

function argsOf(e) {
  try { return JSON.parse(e.args || "{}"); } catch { return {}; }
}
function stepText(e) {
  const op = opOf(e);
  const a = argsOf(e), l = a.labels || a;
  const rs = (p) => (p ? `Rs ${Math.round(Number(p) / 100)}` : "");
  switch (op) {
    case "tg.updates": return "Read the family's messages";
    case "hh.kitchen": return "Checked the kitchen";
    case "knowledge_base_search": return "Read the household notes";
    case "tg.send": return `Messaged ${l.to || "the family"}`;
    case "tg.voice": return `Voice note to ${l.to || "Sunita"}`;
    case "speech_to_text": return "Listened to a voice note";
    case "text_to_speech": return "Recorded a voice note";
    case "kr.order": return `Sharma Kirana order: ${String(l.items || "").replace(/\s*\d+\s*(g|kg|ml|pc)\b/gi, "").slice(0, 60)}`;
    case "pl.balance": case "fetch_sbmd_subscription": return "Checked the Pine Labs block";
    case "pl.payee": return `Paid Sharma Kirana ${rs(l.amount_paise)} on Pine Labs`;
    case "pl.debit": return `Paid ${rs(l.amount_paise) || "the staples"} on Pine Labs`;
    case "pl.link": return `Pine Labs link for ${rs(l.amount_paise)}`;
    case "pl.order": return "Checked the Pine Labs link";
    case "pincode_serviceability": return "Checked Delhivery reaches us";
    case "calculate_shipping_cost": return "Priced the Delhivery parcel";
    case "create_shipment": return "Booked the Delhivery parcel";
    case "track_shipment": return "Tracked the parcel";
    case "hyperlocal_create_order": return "Looked for a rider";
    case "hh.away": return `${l.name || "Someone"} ${l.back === "true" ? "is back" : "is away"}`;
    case "hh.guests": return `${l.n || 0} guests`;
    case "hh.task": return `Tonight's prep to ${l.who || "someone"}`;
    default: return null;
  }
}
// From the call log: the newest "starting <PHASE>" note, and every tool call
// after it, until "<PHASE> done" or "failed". No ids or keys leave rails.
function runOf(log) {
  const i = log.findIndex((e) => e.kind === "wake" && /^starting [A-Z_]+/.test(e.note || ""));
  if (i < 0) return null;
  const start = log[i];
  const phase = (start.note.match(/^starting ([A-Z_]+)/) || [])[1];
  const after = log.slice(0, i).reverse();
  const end = after.find((e) => e.kind === "wake" && new RegExp(`^${phase} (done|failed)`).test(e.note || ""));
  const steps = after
    .filter((e) => e.kind === "tool" && (!end || e.id < end.id))
    .map((e) => ({ at_ist: e.at_ist, text: stepText(e), tool: opOf(e), ok: okOf(e) }))
    .filter((x) => x.text)
    .slice(-12);
  return { phase, started_ist: start.at_ist, running: !end, ended_ist: end ? end.at_ist : null, steps };
}

// ---- /app/events

function railOf(e) {
  if (e.kind === "rest" || e.kind === "pine" || e.kind === "event") return e.rail;
  const c = String(e.connector || "");
  if (c.startsWith("gnani")) return "gnani";
  if (c.startsWith("bridge")) {
    const a = String(e.args || "");
    return /"(name|voice_id)":"pl\./.test(a) ? "pinelabs" : "telegram";
  }
  return c || "system";
}

function opOf(e) {
  if (e.kind === "event") return e.event;
  if (e.kind === "pine") return "demo fallback";
  if (e.kind === "rest") return e.request;
  if (String(e.connector || "").startsWith("bridge")) {
    const m = String(e.args || "").match(/"(?:name|voice_id)":"((?:tg|pl|kr|hh)\.[a-z_]+)/);
    return m ? m[1] : e.tool;
  }
  return e.tool;
}

function okOf(e) {
  if (e.kind === "rest") return e.status < 400;
  const r = String(e.result || "");
  if (/"ok":false|failed|"http_status":[45]\d\d|^Gnani .* failed/.test(r)) return false;
  return true;
}

function summaryOf(e) {
  if (e.kind === "event") return e.summary;
  if (e.kind === "reset" || e.kind === "cast" || e.kind === "pine") return e.note;
  const r = String(e.result || e.response || "");
  const m = r.match(/"(status|code|error|text)":"([^"]{1,80})"/);
  return m ? `${m[1]}: ${m[2]}` : r.slice(0, 100);
}

// Household event fields the app renders (lib/events.js). Never chat ids.
const EV_FIELDS = ["who", "to", "dish", "text", "label", "mode", "on", "name", "n", "date_for", "back", "in_baari", "holder", "for", "status", "said", "task", "item", "by_ist", "lines", "bill", "member", "q", "a", "why", "instead", "seconds", "fact_id", "action"];
function pickFields(e) {
  const o = {};
  for (const k of EV_FIELDS) if (e[k] !== undefined && e[k] !== null) o[k] = e[k];
  return o;
}

async function events(after) {
  const log = await store.range("log", 300);
  const out = [];
  for (const e of log) {
    if (!e.id || e.id <= after) continue;
    // A REST call made by an MCP tool or the bridge already has its tool entry.
    if (e.kind === "rest" && e.via !== "direct") continue;
    out.push({ id: e.id, at_ist: e.at_ist, rail: railOf(e), tool: opOf(e), ok: okOf(e), status: e.status || null, summary: summaryOf(e), recording: e.recording || null, kind: e.event || null, ...(e.event ? { reference: e.reference || null, amount: e.amount || null, by: e.by || null, via: e.via || null, ...pickFields(e) } : {}), api: e.api || (/"api":"(real|demo)"/.exec(String(e.result || "")) || [])[1] || null });
  }
  return { now_ist: istString(), events: out.reverse() };
}

module.exports = { state, events, noteTracking, noteHop, noteTts, noteVoiceSent, noteStt };
