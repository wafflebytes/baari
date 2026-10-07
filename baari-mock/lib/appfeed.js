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
const { istString, istDate } = require("./util");

const DISHES = {
  "rajma chawal": { hindi: "राजमा चावल", photo: "rajma.png" },
  "lauki chana dal": { hindi: "लौकी चना दाल", photo: "lauki-chana-dal.png" },
  "palak paneer roti": { hindi: "पालक पनीर रोटी", photo: "palak-paneer.png" },
  "kadhi chawal": { hindi: "कढ़ी चावल", photo: "kadhi.png" },
  "aloo puri": { hindi: "आलू पूरी", photo: "aloo-puri.png" },
  "chole chawal": { hindi: "छोले चावल", photo: null },
  "egg bhurji paratha": { hindi: "अंडा भुर्जी पराठा", photo: "egg-bhurji.png" },
};
const FAMILY = ["Vinay", "Mummy", "Papa"];
const PHASES = ["SHORTLIST", "LOCK", "CHECK", "BRIEF", "COOK_REPLY"];

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
}

// ---- /app/state

function dish(name) {
  const d = DISHES[String(name || "").toLowerCase()] || {};
  return { dish: name, hindi: d.hindi || null, photo: d.photo || null };
}

async function householdDebits() {
  const out = [];
  for (const k of await store.keys("pl:mpr:BAARI-*")) {
    if (k.includes("BAARI-EVAL-")) continue;
    const p = await store.get(`pl:pres:${await store.get(k)}`);
    if (!p || p.subscription_id !== ops.SUB_ID) continue;
    out.push({
      to: p.settlement ? p.settlement.payee_name || p.settlement.payee_vpa : "Baari staples hub",
      amount: p.amount.value,
      status: p.status === "PENDING" && Date.now() >= p.settle_at ? (p.fail_with ? "FAILED" : "SUCCESS") : p.status,
      ref: p.merchant_presentation_reference,
      note: p.settlement ? p.settlement.note : null,
      at: p.due_date,
    });
  }
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

async function state() {
  const runs = {};
  for (const ph of PHASES) {
    const r = await store.get(`run:${ph}`);
    if (r) runs[ph] = r;
  }
  const latest = Object.values(runs).sort((a, b) => String(a.at_ist).localeCompare(String(b.at_ist))).pop();
  const h = (await store.get("handoff:last")) || {};

  const sub = await store.get(`pl:sub:${ops.SUB_ID}`);
  const spent = Number((await store.get(`pl:day:${ops.SUB_ID}:${istDate()}`)) || 0);
  const debits = await householdDebits();

  // Who has spoken since the day began. Faces only, never their choice.
  const mark = Number((await store.get("tg:mark")) || 0);
  const ups = (await store.range("tg:updates", 500)).filter((u) => u.update_id > mark && u.kind !== "cast");
  const voted = FAMILY.filter((r) => ups.some((u) => u.role === r && ["button", "voice", "text"].includes(u.kind)));

  const track = await store.get("app:track");
  const hop = await store.get("app:hop");
  const brief = (await store.get("app:brief")) || {};
  const lastCook = ups.find((u) => u.role === "Sunita" && u.kind === "voice");
  const reply = lastCook ? (await store.get(`app:stt:${urlKey(lastCook.voice.audio_url)}`)) || {} : {};

  const decisions = [];
  for (const ph of PHASES) for (const d of (runs[ph] && runs[ph].decisions) || []) decisions.push({ id: d.id, phase: ph, at: d.at, rule: d.rule, text: [d.decided, d.said_did].filter(Boolean).join(": ") });

  // Whose baari tonight (or the next night, between nights) and the record of
  // who chose what. duty_holder stays for older app builds.
  const tv = turn.view(await turn.get());
  return {
    household: { name: "Sharma", flat: "402", duty_holder: tv.holder || tv.next, approver: tv.approver },
    turn: { mode: tv.mode, next_mode: tv.next_mode, holder: tv.holder, next: tv.next, order: tv.order, passed: tv.passed, date_for: tv.date_for, approver: tv.approver, history: tv.history.slice(0, 7).map(({ date_for, holder, dish, how }) => ({ date_for, holder, dish, how })), picks: tv.picks_this_month },
    now_ist: latest ? latest.now_ist : null,
    date_for: h.date_for || null,
    phase: latest ? latest.phase : null,
    recording: (await store.get("recording")) || null,
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
    },
    brief: { audio_url: brief.audio_url || null, text: brief.text || null, reply_text: reply.text || null, reply_label: reply.label || null, reply_extract: reply.extract || null },
    decisions,
  };
}

// ---- /app/events

function railOf(e) {
  if (e.kind === "rest") return e.rail;
  const c = String(e.connector || "");
  if (c.startsWith("gnani")) return "gnani";
  if (c.startsWith("bridge")) {
    const a = String(e.args || "");
    return /"(name|voice_id)":"pl\./.test(a) ? "pinelabs" : "telegram";
  }
  return c || "system";
}

function opOf(e) {
  if (e.kind === "rest") return e.request;
  if (String(e.connector || "").startsWith("bridge")) {
    const m = String(e.args || "").match(/"(?:name|voice_id)":"((?:tg|pl)\.[a-z_]+)/);
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
  if (e.kind === "reset" || e.kind === "cast") return e.note;
  const r = String(e.result || e.response || "");
  const m = r.match(/"(status|code|error|text)":"([^"]{1,80})"/);
  return m ? `${m[1]}: ${m[2]}` : r.slice(0, 100);
}

async function events(after) {
  const log = await store.range("log", 300);
  const out = [];
  for (const e of log) {
    if (!e.id || e.id <= after) continue;
    // A REST call made by an MCP tool or the bridge already has its tool entry.
    if (e.kind === "rest" && e.via !== "direct") continue;
    out.push({ id: e.id, at_ist: e.at_ist, rail: railOf(e), tool: opOf(e), ok: okOf(e), status: e.status || null, summary: summaryOf(e), recording: e.recording || null });
  }
  return { now_ist: istString(), events: out.reverse() };
}

module.exports = { state, events, noteTracking, noteHop, noteTts, noteVoiceSent, noteStt };
