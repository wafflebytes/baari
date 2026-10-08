// The quiet log (finale S8 step C, belief 7: stay quiet unless a rule says
// speak). How much Baari handled tonight against how often it bothered
// someone, counted from what already happened. No mock is called.
//
//   state.quiet = {date_for, handled, told, items: [{at_ist, text, told}]}
//   handled  the night's D lines, across every run for that night
//            (the run outputs rails keeps from /admin/run-output)
//   told     messages sent to a person (tg.send, tg.voice) that weren't the
//            night's own cards: the shortlist, the result and the brief
//   items    the D lines in plain words, rule ids stripped

const store = require("./store");
const { plain } = require("./pinelabs_uat");

// Phases whose messages are the night's own cards, not interruptions.
const CARDS = new Set(["SHORTLIST", "LOCK", "BRIEF"]);
const TELLS = /\b(told|sent|messaged|asked|wrote|replied|reminded|tg\.send|tg\.voice|send_message|voice note)\b/i;

async function nightOf() {
  const h = (await store.get("handoff:last")) || {};
  if (h.date_for) return h.date_for;
  return require("./attendance").nextDate();
}

function sendName(e) {
  if (e.kind !== "tool" || !String(e.connector || "").startsWith("bridge")) return null;
  const m = String(e.args || "").match(/"name":"(tg\.send|tg\.voice)"/);
  return m ? m[1] : null;
}

async function build(date_for) {
  const night = date_for || (await nightOf());
  const [runs, log] = await Promise.all([store.range("runs", 100), store.range("log", 1000)]);
  // D lines from every run for this night, oldest first, each once.
  const seen = new Set();
  const items = [];
  for (const r of [...runs].reverse()) {
    if (!r || !r.handoff || r.handoff.date_for !== night) continue;
    for (const d of r.decisions || []) {
      const raw = d.raw || `${d.id}|${d.decided}|${d.said_did}`;
      if (seen.has(raw)) continue;
      seen.add(raw);
      const text = plain([d.decided, d.said_did].filter(Boolean).join(": ")).replace(/[\s,;:]+$/, "");
      if (!text) continue;
      const at = d.at && /^\d\d:\d\d/.test(d.at) ? d.at.slice(0, 5) : String(r.at_ist || "").slice(11, 16);
      items.push({ at_ist: at, text, told: TELLS.test(`${d.via || ""} ${d.said_did || ""}`) });
    }
  }
  // Messages to people since this night started, outside the night's cards.
  // The log is newest first; walk it oldest first, tracking the phase.
  let phase = null, started = false, told = 0;
  for (const e of [...log].reverse()) {
    if (e.kind === "wake") {
      const m = /^starting ([A-Z_]+) for (\d{4}-\d{2}-\d{2})/.exec(e.note || "");
      if (m) {
        phase = m[1];
        if (m[2] === night) started = true;
        else if (started && m[2] > night) break;
      }
      continue;
    }
    if (!started) continue;
    if (sendName(e) && !CARDS.has(phase) && /"ok":true|"message_id"/.test(String(e.result || ""))) told++;
  }
  return { date_for: night, handled: items.length, told, items: items.slice(-40) };
}

async function state() {
  return build();
}

module.exports = { build, state };
