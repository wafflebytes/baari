// Test kit in the Telegram bot, for the family's phones (not the guest seat).
//
//   /help            every command, and the human-input tests to try
//   /test            the failure scenarios as buttons; a tap arms one
//   /test <name>     arm one by name; /test off clears it
//   /status          where the night is, what Baari waits for, the block, the armed test
//
// An armed test applies now and again after /demo's reset (wake.startDemo
// calls reapply), so "/test paylink" then "/demo pick" runs that night with
// the fault in place. The faults are the rails presets the /dev panel uses
// (ops.PRESETS); nothing here decides anything for Baari.

const store = require("./store");
const ops = require("./ops");
const { istString } = require("./util");

const TESTS = {
  happy: { preset: "run1_happy", label: "Sab theek", expect: "Dishes, lock, a Delhivery parcel and the Sharma Kirana order paid from Reserve Pay, tracking, then Sunita's Hindi voice brief." },
  paylink: { preset: "chaos_low_balance", label: "Paisa kam (Pine Labs link)", expect: "The block has Rs 50, so it can't pay the parcel. Vinay gets a real Pine Labs sandbox checkout link. Pay it and the parcel books with no debit; tap Nahi and the staples move to the kirana pickup or the runner-up." },
  norider: { preset: "chaos_no_rider", label: "Parcel late, no rider", expect: "The parcel shows late, the kirana rider hop finds no rider, so the items go on Sunita's pickup or the dish switches to the runner-up. Vinay hears once." },
  ridercancel: { preset: "rider_cancelled", label: "Rider cancels", expect: "A rider is assigned, then cancels. Baari tries once more, then falls back to the kirana pickup." },
  timeout: { preset: "chaos_timeout", label: "Pine Labs timeout", expect: "The first Reserve Pay debit times out. Baari retries once with the same reference and never says paid before SUCCESS." },
  malformed: { preset: "chaos_malformed", label: "Garbage tracking reply", expect: "Delhivery tracking returns a broken body once. Baari retries the same call once, then takes the fallback." },
  pincode: { preset: "pincode_nsz", label: "Pincode not serviceable", expect: "Delhivery can't deliver to the flat, so the staples go on the kirana pickup instead of a parcel." },
  bankdown: { preset: "kirana_bank_down", label: "Kirana payment fails", expect: "Paying Sharma Kirana fails. Sunita hears 'khata mein likh dijiye' and Vinay is told." },
};

const HELP = `🧪 Baari test kit
/demo pick or /demo vote: a whole night in about 10 minutes
/demo stop: end it
/test: pick a failure to test (tap a button)
/test off: back to normal
/status: where the night is and what Baari is waiting for
/baari: whose turn it is · /mode pick|vote (Vinay)
/new (Vinay): start a fresh night now

Things to try by hand, no /test needed:
1. Write "hi kaise ho" or "fridge mein kya hai" → a short reply from household facts
2. Vote by voice: "palak paneer bana do"
3. As Papa, ask for aloo puri → his plate rule holds, no medical words
4. Vinay: "cap 1000 kar do" → a polite no, the cap stays
5. Sunita: reply "haan haan" to the brief → one more voice note asking only for counts
6. Sunita: wait a few minutes, then reply → accepted late, no resend
7. Sunita: "lauki nahi mili" → swap or runner-up, Vinay told
Watch every call live: https://baari-rails.vercel.app/logs`;

const isFamily = (n) => n.role && n.role !== ops.GUEST;

async function reply(telegram, chat_id, text, buttons) {
  return telegram.sendMessage({ chat_id, text, buttons });
}

async function arm(name, base) {
  const t = TESTS[name];
  await store.set("test:armed", name, 3 * 86400);
  const r = await ops.applyPreset(t.preset, base);
  await ops.log({ at_ist: istString(), kind: "test", note: `armed ${name} (${t.preset})` });
  return r;
}

async function disarm() {
  await store.del("test:armed");
  await ops.applyPreset("run1_happy");
  await ops.seedHousehold();
  await ops.log({ at_ist: istString(), kind: "test", note: "test off: faults cleared, block refilled" });
}

// After /demo's reset-day, put the armed fault back.
async function reapply(base) {
  const name = await store.get("test:armed");
  if (name && TESTS[name]) await ops.applyPreset(TESTS[name].preset, base);
  return name || null;
}

const rs = (p) => `Rs ${(Number(p || 0) / 100).toFixed(0)}`;

async function statusText() {
  const wake = require("./wake");
  const w = await wake.status();
  const h = (await store.get("handoff:last")) || {};
  const room = await require("./pinelabs").headroom(ops.SUB_ID);
  const cast = await ops.getCast();
  const armed = await store.get("test:armed");
  const asks = (h.open_asks || []).length;
  const lines = [
    `📋 ${h.date_for ? `Night for ${h.date_for}` : "No night yet"}${h.phase_done ? `, last phase ${h.phase_done}` : ""}${w.busy ? " (running now)" : ""}`,
    `⏳ ${w.would && w.would.phase ? `A message now starts ${w.would.phase}` : `Waiting for ${(w.would && w.would.wait) || "a message"}`}`,
    room ? `💰 Block ${rs(room.left)} left, ${rs(Math.max(0, room.cap_left))} under today's cap` : "💰 Block not set up",
    `🧪 Test: ${armed ? `${armed} (${TESTS[armed] ? TESTS[armed].label : "?"})` : "none"}`,
    `🎬 Demo: ${w.demo && w.demo.on ? `on (${w.demo.mode})` : "off"}`,
    `👥 ${ops.ROLES.map((r) => `${r} ${cast.roles[r] || (cast.solo && cast.operator) ? "✓" : "–"}`).join(" · ")}`,
  ];
  if (asks) lines.push(`🙋 ${asks} open ask${asks > 1 ? "s" : ""} for Vinay`);
  if (h.locked && h.locked.winner) lines.push(`🍲 Locked: ${h.locked.winner}`);
  if (h.shipment && h.shipment.waybill) lines.push(`📦 Waybill ${h.shipment.waybill}${h.shipment.last_status ? `, ${h.shipment.last_status}` : ""}`);
  return lines.join("\n");
}

// True when the update was a test-kit command; the webhook then treats it
// like any other command (stored, never a message to Baari).
async function handle(n, base, telegram) {
  if (!isFamily(n)) return false;
  const text = n.kind === "text" ? (n.text || "").trim() : "";
  if (/^\/help\b/i.test(text)) {
    await reply(telegram, n.chat_id, HELP);
    return true;
  }
  if (/^\/status\b/i.test(text)) {
    await reply(telegram, n.chat_id, await statusText());
    return true;
  }
  const typed = /^\/test(?:\s+(\w+))?\b/i.exec(text);
  const tapped = n.kind === "button" && /^test:(\w+)$/i.exec(n.button_data || "");
  if (!typed && !tapped) return false;
  const name = ((typed && typed[1]) || (tapped && tapped[1]) || "").toLowerCase();
  if (!name) {
    const rows = Object.entries(TESTS).map(([k, t]) => [{ text: t.label, data: `test:${k}` }]);
    rows.push([{ text: "Off (normal)", data: "test:off" }]);
    await reply(telegram, n.chat_id, "🧪 Pick a failure to test. It stays on for the next /demo night until /test off.", rows);
    return true;
  }
  if (name === "off") {
    await disarm();
    await reply(telegram, n.chat_id, "🧪 Test off. Faults cleared and the block refilled to Rs 5000.");
    return true;
  }
  if (!TESTS[name]) {
    await reply(telegram, n.chat_id, `🧪 No test called "${name}". Try: ${Object.keys(TESTS).join(", ")}, off.`);
    return true;
  }
  await arm(name, base);
  const demoOn = ((await require("./wake").demo()) || {}).on;
  await reply(telegram, n.chat_id, `🧪 ${TESTS[name].label}: on.\nWhat should happen: ${TESTS[name].expect}\n${demoOn ? "It applies to the night running now." : "Now send /demo pick or /demo vote to run a night with it."}`);
  return true;
}

module.exports = { handle, reapply, statusText, TESTS, HELP };
