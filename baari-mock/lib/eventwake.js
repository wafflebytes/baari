// Events wake CHECK (finale S8 step D). The minute heartbeat looks at what
// rails already saw tonight and wakes CHECK when something went wrong since
// the last CHECK started:
//
//   the parcel went NDR or RTO, or its ETA moved past 07:30 on date_for
//   a Sharma Kirana order came back with an item it can't supply
//   a Reserve Pay debit that was PENDING settled as FAILED
//
// The task text gets one EVENT line per thing ("EVENT: shipment <waybill>
// went NDR at 22:51"), and each thing fires at most once a night.
//
// Real Delhivery and Pine Labs would push these by webhook (Delhivery's
// status push, Pine Labs' presentation webhook). The mock has no push, so
// rails reads what it stored (app:track, the call log, the debits) once a
// minute and simulates the webhook. No mock is called from here: reading a
// mock would use up a counted fault.

const store = require("./store");
const ops = require("./ops");
const { istString } = require("./util");

const LATEST_ETA = "07:30";
const at = (s) => String(s || "").slice(11, 16) || "now";

// What's gone wrong for this night, as [{key, line, at_ist}].
async function found(h) {
  const night = h.date_for;
  const out = [];
  // The parcel, as rails last saw it (lib/appfeed.js noteTracking, written
  // by every track_shipment call and by the order card's read).
  const wb = h.shipment && (h.shipment.waybill || h.shipment.awb);
  const t = await store.get("app:track");
  if (wb && t && t.waybill === wb) {
    let status = null;
    if (t.status_type === "RT" || /\brto\b|return/i.test(t.status || "")) status = "RTO";
    else if (/^pending$/i.test(t.status || "") || /\bndr\b|undelivered/i.test(t.status || "")) status = "NDR";
    else if (t.expected && t.expected.slice(0, 10) >= night && t.expected.slice(0, 16) > `${night}T${LATEST_ETA}` && !/delivered/i.test(t.status || "")) status = `an ETA of ${at(t.expected)}, after ${LATEST_ETA}`;
    if (status) out.push({ key: `ship:${wb}`, at_ist: t.at_ist, line: `EVENT: shipment ${wb} went ${status} at ${at(t.at_ist)}. Act on it first (CHECK: rider hop, kirana pickup or the runner-up dish).` });
  }
  // The kirana: an order that came back with something it can't supply.
  const log = await store.range("log", 300);
  for (const e of log) {
    if (e.kind !== "tool" || !/"name":"kr\.order"/.test(String(e.args || ""))) continue;
    const r = String(e.result || "");
    if (!/ITEM_NOT_STOCKED|unavailable|out of stock/i.test(r)) continue;
    const ref = (String(e.args).match(/"reference":"([^"]+)"/) || [])[1] || null;
    if (ref && !ref.includes(night)) continue;
    const items = ((r.match(/"not_stocked":\[([^\]]*)\]/) || [])[1] || "").replace(/"/g, "").replace(/,/g, ", ") || "an item";
    out.push({ key: `kirana:${ref || e.id}`, at_ist: e.at_ist, line: `EVENT: Sharma Kirana order ${ref || ""} came back with ${items} unavailable at ${at(e.at_ist)}.`.replace("  ", " ") });
    break;
  }
  // Reserve Pay: tonight's debits that settled FAILED.
  const pl = require("./pinelabs");
  for (const k of await store.keys(`pl:mpr:BAARI-${night}*`)) {
    const ref = k.slice("pl:mpr:".length);
    const p = await pl.byReference(ref);
    if (!p || p.status !== "FAILED") continue;
    out.push({ key: `debit:${p.presentation_id}`, at_ist: istString(), line: `EVENT: Reserve Pay debit ${ref} (Rs ${Math.round((p.amount_paise || 0) / 100)}) went FAILED after PENDING at ${at(istString())}.` });
  }
  return out;
}

// From the heartbeat: wake CHECK for anything new. fire(forced) is wake's
// tick; passed in so the test can watch it. Only after BUY: before that
// there's nothing bought to go wrong, and after BRIEF a CHECK would take
// Sunita's reply away from COOK_REPLY.
async function check(fire) {
  const h = (await store.get("handoff:last")) || {};
  const done = String(h.phase_done || "").toUpperCase();
  if (!h.date_for || !["BUY", "CHECK"].includes(done)) return { idle: true };
  if (await store.get("wake:lock")) return { busy: true };
  const lastCheck = (await store.get("run:CHECK")) || {};
  const since = lastCheck.handoff && lastCheck.handoff.date_for === h.date_for ? String(lastCheck.at_ist || "") : "";
  const fresh = [];
  for (const ev of await found(h)) {
    if (since && String(ev.at_ist || "") && String(ev.at_ist) <= since) continue;
    if (!(await store.setnx(`evwake:${h.date_for}:${ev.key}`, 1, 2 * 86400))) continue;
    fresh.push(ev);
  }
  if (!fresh.length) return { none: true };
  const extra = fresh.map((e) => e.line).join("\n");
  await ops.log({ at_ist: istString(), kind: "wake", note: `event wake for ${h.date_for}: ${fresh.map((e) => e.key).join(", ")}` });
  await require("./events").emit("check_event", { rail: "household", date_for: h.date_for, text: extra.slice(0, 400), summary: fresh.map((e) => e.line.replace(/^EVENT: /, "").replace(/\. Act on it.*$/, "")).join("; ") });
  const r = await fire({ phase: "CHECK", date_for: h.date_for, extra });
  return { fired: fresh.map((e) => e.key), extra, result: r };
}

module.exports = { check, found };
