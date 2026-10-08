// Whose baari it is. Every night one member of the house holds the turn,
// and the turn moves to the next person in the order once the night locks,
// so over a week everyone gets their say. Two ways to run a night (the same
// two the household app offers, app/onboard.js):
//
//   pick  One picks ("Baari wala chune"). The turn-holder picks one of two
//         dishes. The others get a heads-up and, between them, one veto.
//   vote  Everyone votes ("Sab vote karein"). Majority wins; the turn-holder
//         breaks a tie. Who voted what stays private.
//
// Rails only keeps the record (who holds tonight, who's next, the history).
// It never decides a dish. The agent reads this as the TURN line in its task
// text and writes back HANDOFF.turn after LOCK.
//
// Money approval is a separate role: Vinay owns the UPI mandate, so he okays
// any debit over Rs 300 whoever's turn it is.
//
// Stored as "turn":
//   { order: [names in the rotation], next: name, approver: "Vinay",
//     mode: "pick" | "vote"   (for nights not started yet)
//     tonight: { date_for, holder, scheduled, passed: [names], mode } | null,
//     history: [{ date_for, holder, dish, how, mode, passed }] }   newest first
//   how, pick nights: "picked" (holder chose, no veto), "vetoed" (someone
//   vetoed, the other dish won), "default" (holder silent, dish 1).
//   how, vote nights: "voted" (majority), "tie" (the holder broke it),
//   "default" (no votes, dish 1).

const store = require("./store");

const KEY = "turn";
const ORDER = ["Vinay", "Mummy", "Papa"];
const APPROVER = "Vinay";
const HISTORY = 30;
const MODES = ["pick", "vote"];
const HOWS = ["picked", "vetoed", "voted", "tie", "default"];

async function get() {
  const t = (await store.get(KEY)) || {};
  const order = Array.isArray(t.order) && t.order.length ? t.order : ORDER;
  return {
    order,
    next: order.includes(t.next) ? t.next : order[0],
    approver: t.approver || APPROVER,
    mode: MODES.includes(t.mode) ? t.mode : "pick",
    tonight: t.tonight || null,
    history: Array.isArray(t.history) ? t.history : [],
  };
}

async function save(t) {
  await store.set(KEY, t);
  return t;
}

const after = (order, name, skip = []) => {
  const i = order.indexOf(name);
  for (let k = 1; k <= order.length; k++) {
    const n = order[(i + k + order.length) % order.length];
    if (!skip.includes(n)) return n;
  }
  return null;
};

// Has tonight's night locked? Nights before night numbers existed count as
// locked once the history has their date.
const isLocked = (t, n) => !!n && (n.locked ?? t.history.some((h) => h.date_for === n.date_for));

// The turn for the night of date_for. The first time a night is asked about,
// the person whose turn is next takes it. Asking again for the same night
// changes nothing. fresh: a new night is starting (a shortlist after the last
// night finished), so a night already locked on the same date (test nights,
// a second dinner) doesn't get its spent turn back.
async function ensure(date_for, { fresh = false } = {}) {
  const t = await get();
  if (!date_for) return t;
  const cur = t.tonight;
  if (cur && cur.date_for === date_for && !(fresh && isLocked(t, cur))) return t;
  // An older night that never locked keeps its holder's turn: they never got
  // to use it, so it carries over.
  const carried = cur && !isLocked(t, cur) ? cur.scheduled : null;
  const holder = carried && t.order.includes(carried) ? carried : t.next;
  t.seq = (t.seq || 0) + 1;
  t.tonight = { n: t.seq, date_for, holder, scheduled: holder, passed: [], mode: t.mode, locked: false };
  return save(t);
}

// The holder hands tonight's turn to the next person who hasn't passed.
// Everyone passed: nobody holds it and the others' wishes decide.
async function pass(date_for, from) {
  const t = await ensure(date_for);
  const n = t.tonight;
  if (!n || n.holder !== from) return { ok: false, error: `${from} doesn't hold the turn for ${date_for}`, turn: view(t) };
  n.passed = [...new Set([...(n.passed || []), from])];
  n.holder = after(t.order, from, n.passed);
  await save(t);
  return { ok: true, from, to: n.holder, turn: view(t) };
}

// After LOCK: write the night into the history and move the turn on to the
// person after tonight's holder. HANDOFF.turn from the agent says how the
// dish was settled; the winner comes from HANDOFF.locked.
async function recordLock(handoff) {
  if (!handoff || !handoff.date_for || !handoff.locked || !handoff.locked.winner) return null;
  const t = await ensure(handoff.date_for);
  const n = t.tonight;
  if (isLocked(t, n)) return null;
  n.locked = true;
  const ht = handoff.turn || {};
  const mode = n.mode || t.mode;
  const how = HOWS.includes(ht.how) ? ht.how : mode === "vote" ? "voted" : "picked";
  t.history = [{ n: n.n || null, date_for: handoff.date_for, holder: n.holder, dish: handoff.locked.winner, how, mode, passed: n.passed || [] }, ...t.history].slice(0, HISTORY);
  t.next = after(t.order, n.holder || n.scheduled) || t.order[0];
  return save(t);
}

// Change the rotation (who's in the baari), who's next, tonight's holder,
// or the mode. A new mode starts with the next night, unless tonight hasn't
// started yet (tonight: true), so nobody's card changes under them.
async function set(body) {
  const t = await get();
  if (body.mode !== undefined) {
    if (!MODES.includes(body.mode)) return { ok: false, error: `mode must be one of ${MODES.join(", ")}` };
    t.mode = body.mode;
    if (body.tonight && t.tonight) t.tonight.mode = body.mode;
  }
  if (Array.isArray(body.order) && body.order.length) t.order = body.order.map(String);
  if (body.next && t.order.includes(body.next)) t.next = body.next;
  if (body.holder && t.tonight && t.order.includes(body.holder)) t.tonight.holder = body.holder;
  if (body.clear_tonight) t.tonight = null;
  if (body.clear_history) t.history = [];
  return view(await save(t));
}

function view(t) {
  const n = t.tonight;
  const holder = n ? n.holder : t.next;
  const used = t.history.length;
  const picks = Object.fromEntries(t.order.map((p) => [p, t.history.filter((h) => h.holder === p && ["picked", "tie"].includes(h.how)).length]));
  return {
    mode: n && n.mode ? n.mode : t.mode,
    next_mode: t.mode,
    order: t.order,
    approver: t.approver,
    date_for: n ? n.date_for : null,
    holder,
    scheduled: n ? n.scheduled : t.next,
    passed: n ? n.passed : [],
    next: n ? after(t.order, n.holder || n.scheduled) : after(t.order, t.next),
    history: t.history,
    picks_this_month: picks,
    nights: used,
  };
}

// The TURN line for the agent's task text.
function line(v) {
  const said = { picked: "picked", vetoed: "picked, vetoed, so", voted: "vote won:", tie: "broke a tie:", default: "no choice, dish 1:" };
  const last = v.history.slice(0, 6).map((h) => `${h.date_for.slice(5)} ${h.holder || "nobody"} (${h.mode || "pick"}) ${said[h.how] || h.how} ${h.dish}`).join("; ");
  const how = v.mode === "vote"
    ? "MODE: vote. Everyone in ORDER votes; majority wins; the holder breaks a tie."
    : "MODE: pick. The holder picks one of the two; the others get a heads-up and one veto between them.";
  return [
    how,
    `TURN: ${v.holder ? `${v.holder} holds tonight's baari` : "nobody holds tonight's baari (everyone passed), dish 1 unless votes decide"}` +
      (v.passed.length ? ` (passed by ${v.passed.join(", ")})` : "") + `. NEXT: ${v.next}. ORDER: ${v.order.join(", ")}. MONEY: ${v.approver} approves.`,
    `TURN HISTORY: ${last || "none yet"}`,
  ].join("\n");
}

module.exports = { get, ensure, pass, recordLock, set, view, line, ORDER, APPROVER, MODES };
