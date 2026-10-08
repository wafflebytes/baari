// One event stream for the app and Telegram (handoff S1). Every action a
// person takes on either surface lands in /app/events with a kind, so the
// household app's Diary and island can show it within one poll.
//
// Kinds written here: pick, ok, veto, vote, wish, pass, voice, msg, approve,
// deny, turn, demo, cook_reply, away, guests. Pine Labs writes its own
// (link, link_paid, link_declined, link_closed, refuse) in pinelabs_uat.js.
//
// Privacy: a vote never carries the dish (votes stay private in vote mode),
// and a free-text message carries no text unless it's a wish to the holder.

const store = require("./store");
const { istString } = require("./util");

async function emit(kind, fields = {}) {
  const rec = { id: await store.incr("log:seq"), at_ist: istString(), kind: "event", event: kind, rail: fields.rail || "household", ...fields };
  if (!rec.summary) rec.summary = line(kind, rec);
  const recording = await store.get("recording");
  if (recording) rec.recording = recording;
  await store.push("log", rec);
  await store.push("hh:events", rec, 300);
  return rec;
}

// A plain English line, for /live and older app builds. The app writes its
// own copy in the household's language from the fields.
function line(kind, e) {
  const w = e.who || "Someone";
  switch (kind) {
    case "pick": return `${w} picked ${e.dish}`;
    case "ok": return `${w} okayed the pick`;
    case "veto": return `${w} vetoed${e.dish ? ` ${e.dish}` : ""}`;
    case "vote": return `${w} voted`;
    case "wish": return `${w} sent a wish`;
    case "pass": return `${w} passed the baari`;
    case "voice": return `${w} sent a voice note`;
    case "msg": return `${w} wrote to Baari`;
    case "approve": return `${w} said yes to a payment`;
    case "deny": return `${w} said no to a payment`;
    case "turn": return e.text || "The baari moved";
    case "demo": return e.on ? `Demo night started (${e.mode})` : "Demo night stopped";
    case "cook_reply": return `${w} replied: ${e.label || "heard"}`;
    case "away": return `${e.name} ${e.back ? "is back" : "is away"} for ${e.date_for}`;
    case "guests": return `${e.n} guests for ${e.date_for}`;
    default: return kind;
  }
}

// What a family member's Telegram update means, as an event. Called once per
// update, after rails has stored it. Commands and joins are "cast" and skip.
async function fromUpdate(n, ctx = {}) {
  if (!n || !n.role || n.kind === "cast" || n.role === "Sunita" && n.kind !== "voice") return null;
  const via = n.source === "sim" ? "sim" : n.source === "app" ? "app" : "telegram";
  const base = { who: n.role, via, update_id: n.update_id };
  const b = n.kind === "button" ? String(n.button_data || "") : "";
  let m;
  if ((m = /^pick:(.+)$/i.exec(b))) return emit("pick", { ...base, dish: require("./household").dishName(m[1]) || m[1] });
  if ((m = /^vote:(.+)$/i.exec(b))) return emit("vote", base);
  if (/^veto\b/i.test(b)) return emit("veto", { ...base, dish: ctx.dish || null });
  if (/^ok\b/i.test(b)) return emit("ok", base);
  if (/^pass\b/i.test(b)) return emit("pass", base);
  if ((m = /^approve:(.+)$/i.exec(b))) return emit("approve", { ...base, reference: m[1] });
  if ((m = /^deny:(.+)$/i.exec(b))) return emit("deny", { ...base, reference: m[1] });
  if (n.kind === "voice") return emit("voice", base);
  if (n.kind === "text" && n.text && !/^\//.test(n.text)) {
    if (ctx.wishing && n.role !== ctx.holder) return emit("wish", { ...base, to: ctx.holder, text: String(n.text).slice(0, 200) });
    return emit("msg", base);
  }
  return null;
}

// Where the night is, so a text from a non-holder during the pick window
// counts as a wish and a veto names the dish it vetoed.
async function context() {
  const t = await require("./turn").get();
  const h = (await store.get("handoff:last")) || {};
  const voting = String(h.phase_done || "").toUpperCase() === "SHORTLIST";
  const tn = t.tonight || {};
  return { holder: tn.holder || null, wishing: voting && t.mode !== "vote", dish: tn.dish || (h.turn && h.turn.dish) || null };
}

async function onUpdate(n) {
  try {
    return await fromUpdate(n, await context());
  } catch (e) {
    console.error("events.onUpdate", e && e.message);
    return null;
  }
}

async function recent(n = 100) {
  return store.range("hh:events", n);
}

module.exports = { emit, onUpdate, fromUpdate, recent, line };
