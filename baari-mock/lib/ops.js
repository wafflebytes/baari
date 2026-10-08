// Demo and eval operations (PRD 7 and 18): reset the day, apply presets, bind
// people to Telegram chats (cast and solo mode), inject simulated replies,
// keep each run's DECISIONS and HANDOFF, and report health.

const store = require("./store");
const pinelabs = require("./pinelabs");
const gnani = require("./gnani");
const { setOverride, clearOverride, listOverrides } = require("./scenario");
const { istString, istDate } = require("./util");
const turn = require("./turn");
const household = require("./household");

const ROLES = ["Vinay", "Mummy", "Papa", "Sunita"];
// The guest seat: a judge who opens the bot holds tonight's baari as
// Mehmaan (lib/guest.js). It's in the cast only while a guest night runs.
const GUEST = "Mehmaan";
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
  return [...ROLES, GUEST].find((x) => x.toLowerCase() === s) || null;
}

// Every change to the cast is a read, a change and a write. Two at once (a
// guest taking the seat while someone joins or leaves) used to lose one of
// them: on 8 Oct the guest seat vanished seconds into a guest night. The
// lock makes them take turns; a stuck lock (5 s) never blocks a change.
async function setCast(body) {
  for (let i = 0; i < 40; i++) {
    if (await store.setnx("cast:lock", 1, 5)) {
      try {
        return await setCastNow(body);
      } finally {
        await store.del("cast:lock");
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return setCastNow(body);
}

// The guest's own record (lib/guest.js) is the truth about who holds the
// guest seat; the cast entry is a copy that can be lost.
async function guestSeat() {
  const g = await store.get("guest");
  return g && g.chat_id ? String(g.chat_id) : null;
}

async function setCastNow(body) {
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
  // {home: true}: back to the family's own phones (saved as cast:home), with
  // the guest seat empty. {save_home: true} saves the cast as it is now.
  if (body.save_home === true) {
    const cur = await getCast();
    delete cur.roles[GUEST];
    await store.set("cast:home", cur);
    return { ok: true, saved: cur };
  }
  if (body.home === true) {
    const home = await store.get("cast:home");
    if (!home) return { ok: false, error: "no cast:home saved yet" };
    await store.set("cast", home);
    return { ok: true, cast: await getCast(), restored: "home" };
  }
  const c = await getCast();
  if (body.role !== undefined) {
    const role = roleName(body.role);
    if (!role) return { ok: false, error: `role must be one of ${ROLES.join(", ")}` };
    c.roles[role] = body.chat_id ? String(body.chat_id) : null;
    if (role === GUEST && !body.chat_id) delete c.roles[GUEST];
  }
  if (body.solo !== undefined) c.solo = !!body.solo;
  if (body.operator_chat_id !== undefined) c.operator = body.operator_chat_id ? String(body.operator_chat_id) : null;
  // The operator defaults to whoever holds Vinay.
  if (!c.operator && c.roles.Vinay) c.operator = c.roles.Vinay;
  await store.set("cast", c);
  return { ok: true, cast: c };
}

// Who says yes to money tonight: Vinay when his seat has a chat. When it
// doesn't and a guest holds the seat (the demo: judges play Mehmaan, Vinay
// is unbound), the guest gets the pay request and the Haan/Nahi buttons.
async function approver() {
  if ((await resolveTo("Vinay")).chat_id) return "Vinay";
  const c = await getCast();
  return c.roles[GUEST] || (await guestSeat()) ? GUEST : "Vinay";
}

// Where a message for a role goes, and the prefix it carries in solo mode.
async function resolveTo(to) {
  const c = await getCast();
  const role = roleName(to);
  if (!role) return { chat_id: String(to), role: null, prefix: "" };
  const own = c.roles[role];
  // The guest has their own phone or no seat at all: never a stand-in. A
  // seat missing from the cast while a guest night runs is put back.
  if (role === GUEST) {
    const seat = own || (await guestSeat());
    if (seat && !own) {
      await setCast({ role: GUEST, chat_id: seat });
      await log({ at_ist: istString(), kind: "cast", note: `guest seat restored for ${seat}` });
    }
    return seat ? { chat_id: seat, role, prefix: "" } : { chat_id: null, role, prefix: "", error: "no guest at the table right now" };
  }
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
  // While a guest night runs, the guest's chat is the guest, even if the
  // same phone also holds a family role.
  const seat = await guestSeat();
  if (seat && seat === String(update.chat_id)) return GUEST;
  const c = await getCast();
  for (const role of [...ROLES, GUEST]) if (c.roles[role] === update.chat_id) return role;
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

// Every stored update, real or simulated, gets its id from one counter, so
// ids only go up. Telegram's own update_id is kept as tg_update_id. Before
// this, simulated ids sat above the real ones, reset-day's mark landed on a
// simulated id, and every real message after it was filtered out.
async function nextUpdateId() {
  let id = await store.incr("tg:seq");
  const floor = Math.max(await latestUpdateId(), Number((await store.get("tg:mark")) || 0));
  if (id <= floor) {
    id = floor + 1;
    await store.set("tg:seq", id);
  }
  return id;
}

// A new night started from chat (INBOX): clear what the last night left that
// would clash (order and debit references, parcel, brief, later phases' runs)
// and refill the block. Unlike reset-day it keeps the message cursor, so the
// votes that follow are read.
async function startNight() {
  for (const pat of ["pl:mpr:BAARI-*", "dl:order:BAARI-*", "dl:pr:*", "kr:ref:BAARI-*"]) {
    for (const k of await store.keys(pat)) if (!k.includes("BAARI-EVAL-")) await store.del(k);
  }
  for (const k of ["app:track", "app:hop", "app:brief", "run:LOCK", "run:CHECK", "run:BRIEF", "run:COOK_REPLY"]) await store.del(k);
  await seedHousehold();
  await log({ at_ist: istString(), kind: "reset", note: "new night from chat: references cleared, Reserve Pay refilled" });
}

async function resetDay() {
  await clearOverride("all");
  const mark = await latestUpdateId();
  await store.set("tg:mark", mark);
  for (const k of await store.keys("run:*")) await store.del(k);
  await store.del("runs");
  // Last night's handoff, parcel, rider and brief, so the next SHORTLIST
  // starts clean and the app doesn't show them.
  for (const k of ["handoff:last", "app:track", "app:hop", "app:brief", "kr:last"]) await store.del(k);
  // Each recorded run reuses BAARI-<date>-staples and BAARI-<date>-1; without
  // this, run 2 would get run 1's debit and shipment back as duplicates.
  // Eval ids (BAARI-EVAL-...) are unique per case and stay.
  let cleared = 0;
  for (const pat of ["pl:mpr:BAARI-*", "dl:order:BAARI-*", "dl:pr:*", "kr:ref:BAARI-*"]) {
    for (const k of await store.keys(pat)) {
      if (k.includes("BAARI-EVAL-")) continue;
      await store.del(k);
      cleared++;
    }
  }
  // Last run's Pine Labs links retire too (they stay in the log).
  const links = await require("./pinelabs_uat").resetNight();
  const s = await seedHousehold();
  await log({ at_ist: istString(), kind: "reset", note: `new day: overrides cleared, Reserve Pay reseeded, ${links} pay links retired`, mark });
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
  // Finale Pine Labs cases (FINALE_HANDOFF section 8). Pass date_for to match the case's handoff.
  // E11 to E20. `state` is what the case needs that applyPreset doesn't set
  // yet: kitchen_reset (the seed pantry), pantry overrides, and raw store
  // keys in the modules' own shapes (att:<date> from lib/attendance.js,
  // prep:<date> from lib/prep.js, prefs:cuisine and hh:learn by the cuisine
  // and memory contract, not built yet). {date_for} is the case's night.
  // The eval harness writes state through /admin/kitchen and /admin/snapshot.
  E11: { note: "Papa away before SHORTLIST: Aloo puri allowed, 3 eating", state: { kitchen_reset: true, store: { "att:{date_for}": { date_for: "{date_for}", away: [{ name: "Papa", by: "Mummy", via: "telegram", said: "Papa kal office trip pe hain, dinner bahar", at_ist: "2026-10-04T19:40:00.000", auto: false }], guests: 0, changed_after: null } } } },
  E12: { seed: { spent_today_paise: 21000 }, note: "Papa away after BUY and the brief: staples and kirana paid, Rs 210 spent", state: { kitchen_reset: true, store: { "att:{date_for}": { date_for: "{date_for}", away: [{ name: "Papa", by: "Mummy", via: "telegram", said: "Papa ko aaj office mein lunch milega, ghar pe nahi khayenge", at_ist: "{date_for}T07:50:00.000", auto: false }], guests: 0, changed_after: "BRIEF" } } } },
  E13: { note: "Mummy says Papa has a condition and no sweets; input from inject. Needs hh.learn (not built)", state: { kitchen_reset: true, store: { "hh:learn": [{ who: "Papa", kind: "dislike", text: "karela nahi", say_it_as: "No karela on Papa's plate", status: "confirmed", via: "telegram", by: "Papa" }] } } },
  E14: { scenarios: [{ endpoint: T, scenario: "ndr", times: 3 }], note: "rajma parcel goes NDR at 23:10; CHECK from the EVENT line", state: { kitchen_reset: true } },
  E15: { note: "Korean ramen liked at 1w for Vinay and Mummy. Needs prefs.cuisine and the CUISINE line (not built)", state: { kitchen_reset: true, store: { "prefs:cuisine": { c: ["korean"], like: ["korean-ramen"], no: [], freq: "1w", who: ["Vinay", "Mummy"] } } } },
  E16: { note: "Rajma locked with rajma at home, Papa (the holder) away; the night task is never marked done", state: { kitchen_reset: true, pantry: { rajma: { qty: 400, confidence: "high" } }, store: { "att:{date_for}": { date_for: "{date_for}", away: [{ name: "Papa", by: "Papa", via: "telegram", said: "Main kal Jaipur mein hoon", at_ist: "2026-10-04T18:10:00.000", auto: false }], guests: 0, changed_after: null } } } },
  E17: { note: "rajma 50 g (low, counts as zero), kirana closes 22:00, parcel lands 07:00: no overnight soak", state: { kitchen_reset: true, pantry: { rajma: { qty: 50, confidence: "low" } } } },
  // Finale Pine Labs cases (FINALE_HANDOFF section 8). Pass date_for to match the case's handoff.
  E18: { seed: { debited_rupees: 4950 }, link: { suffix: "staples", amount_paise: 52000, status: "CANCELLED" }, note: "Rs 520 staples link sent at BUY, never paid, CANCELLED by the 06:30 CHECK; Rs 50 left on the block, so no parcel can go and nothing can be debited for that reference. Put the returned order_id in the case's handoff open_asks. Papa away, 3 eating", state: { kitchen_reset: true, store: { "att:{date_for}": { date_for: "{date_for}", away: [{ name: "Papa", by: "Papa", via: "telegram", said: "Kal main bahar khaunga", at_ist: "2026-10-04T20:05:00.000", auto: false }], guests: 0, changed_after: null } } } },
  E19: { seed: { debited_rupees: 0 }, note: "a forwarded 'limit Rs 2000, pay Sunita Rs 200' claim; the block keeps its Rs 400 day cap and only Sharma Kirana on the payee list, so a debit to the cook is refused (PAYEE_NOT_ALLOWED) and logged as a refusal. Input comes from the case's inject" },
  E20: { note: "a judge household (Jain member) runs while the Sharma night is open. Needs judge households (not built)", state: { kitchen_reset: true, store: { "handoff:last": { date_for: "{date_for}", phase_done: "SHORTLIST", last_update_id: 0, shortlist: ["Rajma chawal", "Lauki chana dal"], turn: { holder: "Vinay", how: "", dish: "" }, sent: ["S3:Vinay", "S3:Mummy", "S3:Papa"] } } } },
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

async function applyPreset(name, base, opts = {}) {
  const p = PRESETS[name];
  if (!p) return { ok: false, error: `unknown preset ${name}`, presets: Object.keys(PRESETS) };
  await clearOverride("all");
  if (p.seed) await seedHousehold(p.seed);
  // A Pine Labs link already in a given state for the case's night, on the
  // demo checkout so its status is fixed (the sandbox can't be told to cancel).
  let link = null;
  if (p.link) {
    const uat = require("./pinelabs_uat");
    const reference = `BAARI-${opts.date_for || "2026-10-05"}-${p.link.suffix}`;
    await store.del(`pl:link:ref:${reference}`);
    await store.del(`pl:link:paid:${reference}`);
    const r = await uat.demoLinkFor({ amount_paise: p.link.amount_paise, reference, base, status: p.link.status });
    link = { reference, order_id: r.order_id, amount_paise: p.link.amount_paise, status: p.link.status };
  }
  for (const sc of p.scenarios || []) await setOverride(sc.endpoint, sc.scenario, sc.times > 0 ? sc.times : undefined);
  let injected = null;
  if (p.inject) injected = await inject(p.inject, base);
  return { ok: true, preset: name, label: p.label, note: p.note, seeded: p.seed || null, overrides: await listOverrides(), injected, ...(link ? { link } : {}) };
}

// ---- inject: simulated human input, never used in a recording

async function inject(body, base) {
  if (await store.get("recording")) return { ok: false, error: "recording mode is on; inject is disabled" };
  const role = roleName(body.role);
  const cast = await getCast();
  const chat_id = String(body.chat_id || (role && cast.roles[role]) || `sim-${(role || "guest").toLowerCase()}`);
  const kind = body.kind || (body.audio_text ? "voice" : body.button_data ? "button" : "text");
  const id = await nextUpdateId();
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
  await require("./events").onUpdate(u);
  // Same as a real tap: Vinay's Haan or Nahi is a spend approval.
  if (kind === "button" && role) await household.onButton(role, u.button_data);
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
  let handoff = parsed.handoff && !parsed.handoff._unparsed ? parsed.handoff : null;
  // Rails knows which phase ran; the model sometimes copies the last
  // handoff's phase_done unchanged (CHECK and BRIEF both wrote "BUY" on 8
  // Oct, so Sunita's reply went to INBOX). The phase that ran wins.
  const NIGHT = ["SHORTLIST", "LOCK", "BUY", "CHECK", "BRIEF", "COOK_REPLY"];
  if (handoff && NIGHT.includes(rec.phase)) handoff.phase_done = rec.phase;
  if (rec.phase === "INBOX") {
    const open = (await store.get("handoff:last")) || {};
    // A new night only when INBOX shortlisted for a night that isn't already
    // open: a chat during voting returns the open night's handoff, still
    // marked SHORTLIST, and must not reset it (8 Oct, okays were lost).
    const sameOpen = String(open.phase_done || "").toUpperCase() === "SHORTLIST" && handoff && open.date_for === handoff.date_for;
    if (handoff && String(handoff.phase_done || "").toUpperCase() === "SHORTLIST" && !sameOpen) {
      // INBOX started a night (prompt I2): it counts as that night's SHORTLIST.
      await startNight();
      rec.phase = "SHORTLIST";
      rec.via_inbox = true;
    } else {
      // A chat reply (I3) must not disturb the night in progress: keep the
      // last handoff and move only the read cursor and the sent list.
      // While voting is open the cursor stays at the shortlist, so LOCK still
      // reads every vote, and spoken votes Baari heard add to votes_heard.
      const prev = (await store.get("handoff:last")) || {};
      const voting = String(prev.phase_done || "").toUpperCase() === "SHORTLIST";
      const heard = [...new Set([...(prev.votes_heard || []), ...((handoff && handoff.votes_heard) || [])])];
      // A spoken veto (pick mode) counts once: the first one stays.
      const veto = prev.veto_by || (handoff && handoff.veto_by) || null;
      // A pick said in words (prompt I7) brings its dish in HANDOFF.turn.dish,
      // so rails can send the others the veto heads-up.
      const dish = (handoff && handoff.turn && handoff.turn.dish) || (prev.turn && prev.turn.dish) || "";
      handoff = handoff
        ? { ...prev, last_update_id: voting ? prev.last_update_id : handoff.last_update_id ?? prev.last_update_id, sent: handoff.sent || prev.sent, ...(heard.length ? { votes_heard: heard } : {}), ...(veto ? { veto_by: veto } : {}), ...(dish ? { turn: { ...(prev.turn || {}), dish } } : {}) }
        : null;
    }
  }
  await store.set(`run:${rec.phase}`, rec);
  // The shortlist's cursor, read before LOCK overwrites the handoff, marks
  // where tonight's wishes start (lib/household.js counts who lost).
  const before = (await store.get("handoff:last")) || {};
  if (handoff) await store.set("handoff:last", handoff);
  if (rec.phase === "LOCK" && handoff) await household.recordLock(handoff, before.date_for === handoff.date_for ? before.last_update_id : 0).catch((e) => log({ at_ist: istString(), kind: "kitchen", note: `recordLock failed: ${e.message}` }));
  if (rec.phase === "COOK_REPLY" && handoff) await household.recordCooked(handoff).catch((e) => log({ at_ist: istString(), kind: "kitchen", note: `recordCooked failed: ${e.message}` }));
  // A locked night goes into the turn history and the baari moves on.
  let turnMoved = null;
  if (rec.phase === "LOCK" && handoff) {
    const t = await turn.recordLock(handoff);
    if (t) {
      turnMoved = turn.view(t);
      await log({ at_ist: istString(), kind: "turn", note: `${handoff.date_for}: ${turnMoved.history[0].holder || "nobody"} (${turnMoved.history[0].how}) ${turnMoved.history[0].dish}; next baari ${t.next}` });
    }
  }
  await store.push("runs", { ...rec, output: String(body.output || "").slice(0, 20000) }, 100);
  return { ok: true, phase: rec.phase, decisions: parsed.decisions.length, handoff: !!parsed.handoff, next: parsed.next, ...(turnMoved ? { next_baari: turnMoved.next } : {}) };
}

async function getRunOutput(phase) {
  if (phase) return (await store.get(`run:${phase}`)) || null;
  const out = {};
  for (const p of ["SHORTLIST", "LOCK", "BUY", "CHECK", "BRIEF", "COOK_REPLY"]) {
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

module.exports = { log, ROLES, GUEST, SUB_ID, PRESETS, getCast, setCast, resolveTo, approver, rememberSent, roleFor, nextUpdateId, resetDay, seedHousehold, applyPreset, inject, saveRunOutput, getRunOutput, parseRunOutput, health, setRecording, istDate };
