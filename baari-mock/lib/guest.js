// A judge's night. Anyone outside the household who opens the bot gets a
// Namaste and tonight's baari as Mehmaan, the guest: Baari checks the
// kitchen, sends them two dishes to pick from, and runs the rest of the
// night (Delhivery, Sharma Kirana, Pine Labs, Sunita's Hindi brief) as a
// demo night in pick mode. The family's own phones keep their seats; the
// guest seat holds one judge at a time and the rest wait in a queue.
//
// The guest sees only what a person at the table would: the welcome, the
// kitchen, the two dishes, the result, one order card that updates in
// place, a line when Sunita has her brief, and the goodbye. The backend's
// steps stay in the logs.
//
// Stored as "guest": { chat_id, name, started_ms, turn_saved } while a
// guest night runs, and "guest:queue": [{ chat_id, name, at_ms }].

const store = require("./store");
const ops = require("./ops");
const turn = require("./turn");
const household = require("./household");
const { istString } = require("./util");

const GUEST = ops.GUEST;
// A guest night that has run this long is over, finished or not.
const STALE_MS = 25 * 60 * 1000;
const OPTS = { window_s: 180, veto_s: 60, reply_s: 120 };

const tg = () => require("./telegram");
const wake = () => require("./wake");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Rails talks to the guest directly; a sim-* guest (tests) goes to the sim
// outbox. Returns the message_id when Telegram gives one.
async function say(payload) {
  if (String(payload.chat_id).startsWith("sim-")) {
    await store.push("sim:outbox", { at_ist: istString(), at_ms: Date.now(), kind: payload.message_id ? "edit" : "text", chat_id: payload.chat_id, to: GUEST, text: payload.text, buttons: payload.reply_markup ? payload.reply_markup.inline_keyboard : null }, 1000);
    return 1;
  }
  const r = await tg().call(payload.message_id ? "editMessageText" : "sendMessage", payload);
  return r && r.ok && r.result ? r.result.message_id : null;
}

// "typing…" for a moment before a message, so the chat reads like a person.
async function typing(chat_id, ms = 1200) {
  if (String(chat_id).startsWith("sim-")) return;
  tg().chatAction(chat_id, "typing").catch(() => {});
  await sleep(ms);
}

// What the guest wants, from what they typed. Anything about food, dinner
// or starting counts as "go"; the bot doesn't need an exact phrase.
const GO = /(kya\s*(ban|pak|khana|khaa)|khana|khaana|dinner|lunch|menu|food|cook|bana|bhook|bhuk|hungry|what('?s| is)\s+for|eat|shuru|start|begin|chalo|let'?s|haan|^ha+\b|^yes|^ok|^okay|^sure|^go\b|try|demo)/i;
const ABOUT = /(baari kya|what('?s| is) (a )?baari|kaun ho|who are you|kya ho|kya karte|what do you do|help|samjhao|explain|how does)/i;
const STOP = /^(stop|band|ruk|bas|cancel|exit|quit)\b/i;

function intent(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (STOP.test(t)) return "stop";
  if (ABOUT.test(t)) return "about";
  if (GO.test(t)) return "go";
  return null;
}

// A judge whose Telegram name is a family member's (Vinay, Mummy...) isn't
// called by it: the family member exists, and the chat would read wrong.
function guestName(display) {
  const n = String(display || "").trim().split(/\s+/)[0];
  if (!n || [...ops.ROLES, GUEST].some((r) => r.toLowerCase() === n.toLowerCase())) return null;
  return n;
}

async function state() {
  return (await store.get("guest")) || null;
}

async function queue() {
  return (await store.get("guest:queue")) || [];
}

// Is someone else's guest night (or a family /demo) using the table now?
async function busyFor(chat_id) {
  const g = await state();
  const dm = await wake().demo();
  if (!dm.on) return null;
  const started = g ? g.started_ms : Date.parse(`${dm.started_ist}+05:30`);
  if (Date.now() - (started || 0) > STALE_MS) return null;
  if (g && g.chat_id === String(chat_id)) return { mine: true, g };
  return { mine: false, g, left_min: Math.max(1, Math.round((started + 10 * 60 * 1000 - Date.now()) / 60000)) };
}

const START = [[{ text: "Aaj kya banega?", callback_data: "guest:go" }, { text: "Baari kya hai?", callback_data: "guest:about" }]];
const GO_ONLY = [[{ text: "Chaliye, shuru karein", callback_data: "guest:go" }]];

async function greet(chat_id, display) {
  const name = guestName(display);
  await typing(chat_id, 800);
  await say({
    chat_id,
    text:
      `Namaste${name ? ` ${name} ji` : ""}! Main Baari hoon, Sharma parivaar ki rasoi sambhalta hoon.\n` +
      "Aaj aap hamare mehmaan hain, toh kal ka khaana aap tay karenge.\n\n" +
      "Hi! I run the Sharma family's kitchen. You're our guest tonight, so you choose tomorrow's dinner.",
    reply_markup: { inline_keyboard: START },
  });
}

async function about(chat_id) {
  await typing(chat_id, 900);
  await say({
    chat_id,
    text:
      "Baari matlab \"turn\". Is ghar mein har raat kisi ek ki baari hoti hai: wahi kal ki dish chunta hai, baaki ek baar veto kar sakte hain. " +
      "Phir main saamaan mangwata hoon, pay karta hoon, aur subah Sunita ji ko Hindi mein bata deta hoon.\n\n" +
      "Every night one person picks tomorrow's dish and the others get one veto. I order what's missing, pay for it, and brief the cook.",
    reply_markup: { inline_keyboard: GO_ONLY },
  });
}

// The kitchen as Baari sees it before shortlisting, written over the
// "dekh raha hoon" message so it reads as one step.
async function scan(chat_id, message_id) {
  const k = await household.kitchen();
  const p = Object.entries(k.pantry || {}).map(([n, v]) => [n, v && typeof v === "object" ? v.qty : v]);
  const have = p.filter(([, q]) => Number(q) > 0).map(([n]) => n);
  const out = p.filter(([, q]) => !(Number(q) > 0)).map(([n]) => n);
  await say({
    chat_id,
    ...(message_id ? { message_id } : {}),
    text:
      `Rasoi mein hai: ${have.join(", ") || "kuch nahi"}\n` +
      `Khatam: ${out.join(", ") || "kuch nahi"}\n\n` +
      "Ab aapke liye do dishes chun raha hoon…",
  });
}

// Start this guest's night, or put them in the queue.
async function begin(chat_id, display, base) {
  chat_id = String(chat_id);
  const name = guestName(display);
  const busy = await busyFor(chat_id);
  if (busy && busy.mine) {
    await say({ chat_id, text: "Aapki baari chal rahi hai. Upar dish chuniye, ya mujhse kuch bhi poochiye.\n(Your night is on: pick a dish above, or ask me anything.)" });
    return { running: true };
  }
  if (busy) {
    const q = (await queue()).filter((x) => x.chat_id !== chat_id);
    q.push({ chat_id, name, at_ms: Date.now() });
    await store.set("guest:queue", q, 6 * 3600);
    await say({ chat_id, text: `Abhi ek aur mehmaan ki baari chal rahi hai, lagbhag ${busy.left_min} minute aur. Aap line mein ${q.length} number pe hain; baari aate hi yahin bataunga.\n(Another guest is choosing right now, about ${busy.left_min} min left. You're number ${q.length}.)` });
    await ops.log({ at_ist: istString(), kind: "guest", note: `${chat_id} queued at ${q.length}` });
    return { queued: q.length };
  }
  // A guest night that never closed hands its seat back first.
  const old = await state();
  if (old) await release(old, { quiet: old.chat_id === chat_id });
  const turn_saved = await store.get("turn");
  await ops.setCast({ role: GUEST, chat_id });
  await store.set("guest", { chat_id, name, started_ms: Date.now(), turn_saved: turn_saved || null }, 6 * 3600);
  // Tonight's rotation has the guest first, so the guest holds the turn.
  await turn.set({ order: [GUEST, ...turn.ORDER], next: GUEST });
  await typing(chat_id, 600);
  const scan_id = await say({ chat_id, text: "Rasoi dekh raha hoon…" });
  await ops.log({ at_ist: istString(), kind: "guest", note: `${chat_id} (${name || "guest"}) holds tonight's baari` });
  return wake().startDemo("pick", GUEST, base, { ...OPTS, guest: { chat_id, name, scan_id } });
}

// The guest's night is over: give the family back its rotation and the seat.
// wake calls next() once the demo night is closed.
async function release(g, { quiet = false } = {}) {
  if (!g) return;
  if (g.turn_saved) await store.set("turn", g.turn_saved);
  else await turn.set({ order: turn.ORDER, next: turn.ORDER[0] });
  const cast = await ops.getCast();
  if (cast.roles[GUEST] === g.chat_id) await ops.setCast({ role: GUEST, chat_id: null });
  await store.del("guest");
  if (!quiet) await store.set(`guest:done:${g.chat_id}`, 1, 7 * 86400);
  await ops.log({ at_ist: istString(), kind: "guest", note: `${g.chat_id} left the guest seat` });
}

async function finish(base, date_for) {
  const g = await state();
  if (!g) return;
  await typing(g.chat_id, 800);
  await say({
    chat_id: g.chat_id,
    text:
      `Bas, ho gaya. Dhanyavaad${g.name ? ` ${g.name} ji` : ""}!\n` +
      "Kal ka khaana tay hai, saamaan aa raha hai aur paise de diye, Sunita ji ko sab bata diya.\n\n" +
      `Receipt: https://baari.pages.dev/receipt/${date_for}`,
    reply_markup: { inline_keyboard: [[{ text: "Ek aur baari", callback_data: "guest:go" }]] },
  }).catch(() => {});
  await release(g);
}

async function next(base) {
  const q = await queue();
  const n = q.shift();
  await store.set("guest:queue", q, 6 * 3600);
  if (!n) return;
  await say({ chat_id: n.chat_id, text: "Aapki baari aa gayi! (Your turn now.)" }).catch(() => {});
  await begin(n.chat_id, n.name, base);
}

// A message or tap from someone outside the household (or the guest
// between nights). Returns true when it was handled here.
async function onOutsider(n, display, base) {
  const chat_id = String(n.chat_id);
  if (n.kind === "button" && n.button_data === "guest:go") {
    wake().later(begin(chat_id, display, base));
    return true;
  }
  if (n.kind === "button" && n.button_data === "guest:about") {
    await about(chat_id);
    return true;
  }
  if (n.kind === "text" && /^\/start\b/i.test(n.text || "")) {
    await greet(chat_id, display);
    return true;
  }
  if (n.kind === "text" || n.kind === "voice") {
    const it = n.kind === "text" ? intent(n.text) : null;
    if (it === "go") {
      wake().later(begin(chat_id, display, base));
      return true;
    }
    if (it === "about") {
      await about(chat_id);
      return true;
    }
    if (it === "stop") {
      const q = (await queue()).filter((x) => x.chat_id !== chat_id);
      await store.set("guest:queue", q, 6 * 3600);
      await say({ chat_id, text: "Theek hai. Jab mann ho, /start bhejiye." });
      return true;
    }
    if (await store.setnx(`guest:hint:${chat_id}`, 1, 20)) {
      await typing(chat_id, 600);
      await say({
        chat_id,
        text: "Main Sharma parivaar ka khaana tay karta hoon, aur aaj ki baari aapki hai.\n(I plan the Sharma family's dinner, and tonight it's your call.)",
        reply_markup: { inline_keyboard: START },
      });
    }
    return true;
  }
  return false;
}

// The GUEST line for the agent's task text on a guest night.
async function taskLine() {
  const g = await state();
  if (!g) return null;
  const call = g.name ? `${g.name} ji` : "aap (no name)";
  const other = g.name ? `${g.name} ji` : "hamare mehmaan";
  return `GUEST: ${GUEST} is ${g.name || "a guest"}, a judge visiting the Sharmas tonight, and holds tonight's baari. send_message to "${GUEST}" like any member. Messages to ${GUEST}: address them as ${call}, two or three short lines, the Hinglish first and then one short English line, no emojis, never more than one message per step. The holder card to ${GUEST} has only the two dish buttons, no pass button. In the result to ${GUEST}, leave out "Agli baari". When you mention them to anyone else, say ${other}, never the word ${GUEST} on its own. ${GUEST} isn't in PEOPLE: the plate rules (L3) and Vinay's money approval are unchanged, and dinner is still for 4.`;
}

module.exports = { GUEST, intent, guestName, state, queue, greet, about, scan, begin, finish, next, release, onOutsider, taskLine };
