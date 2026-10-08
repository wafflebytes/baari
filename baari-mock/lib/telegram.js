// Real Telegram Bot API. Nothing here is mocked: messages go to real phones.
// Incoming messages arrive on /telegram/webhook and are kept in Redis so each
// phase of Baari (8:30pm, 9:30pm, 7:45am) can read what came in since the last.

const crypto = require("crypto");
const store = require("./store");
const { istString } = require("./util");
const ops = require("./ops");
const appfeed = require("./appfeed");

const TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

// Telegram echoes this back on every webhook call so strangers cannot post
// fake votes to our endpoint.
const WEBHOOK_SECRET = crypto.createHash("sha256").update(`baari:${TOKEN}`).digest("hex").slice(0, 40);

async function call(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function name(u) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || String(u.id);
}

function normalize(u, base) {
  const out = { update_id: u.update_id };
  if (u.callback_query) {
    const q = u.callback_query;
    return {
      ...out,
      kind: "button",
      chat_id: String(q.message ? q.message.chat.id : q.from.id),
      from_name: name(q.from),
      date_ist: istString(new Date()),
      button_data: q.data,
      reply_to_message_id: q.message ? q.message.message_id : null,
      button_message_text: q.message ? q.message.text : null,
    };
  }
  const m = u.message || u.edited_message;
  if (!m) return null;
  const base_ = {
    ...out,
    chat_id: String(m.chat.id),
    from_name: name(m.from || m.chat),
    date_ist: istString(new Date(m.date * 1000)),
    message_id: m.message_id,
    reply_to_message_id: m.reply_to_message ? m.reply_to_message.message_id : null,
  };
  if (m.voice || m.audio) {
    const v = m.voice || m.audio;
    return {
      ...base_,
      kind: "voice",
      voice: { audio_url: `${base}/media/tg/${v.file_id}`, duration_seconds: v.duration, mime_type: v.mime_type },
      text: m.caption || null,
    };
  }
  return { ...base_, kind: "text", text: m.text || m.caption || "" };
}

async function webhook(req, base) {
  if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
    return { status: 403, body: { ok: false } };
  }
  const u = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  // Telegram resends an update it thinks we missed; keep each one once.
  if (!(await store.setnx(`tg:seen:${u.update_id}`, 1, 2 * 86400))) return { status: 200, body: { ok: true, duplicate: true } };
  if (u.callback_query) {
    // Stop the spinner, and fold the buttons into the message: it keeps its
    // text and shows what was tapped, so nobody taps twice.
    const q = u.callback_query;
    await call("answerCallbackQuery", { callback_query_id: q.id, text: "Done" });
    // /bahar and /mehmaan keep their buttons: a tap toggles and the message redraws.
    if (q.message && q.message.text && !/^(away|guests):/i.test(q.data || "")) {
      const rows = (q.message.reply_markup && q.message.reply_markup.inline_keyboard) || [];
      const b = [].concat(...rows).find((x) => x.callback_data === q.data);
      const label = b ? b.text : q.data;
      await call("editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${q.message.text}\n\n✓ ${label}` }).catch(() => {});
    }
  }
  const n = normalize(u, base);
  if (n) {
    n.tg_update_id = n.update_id;
    n.update_id = await ops.nextUpdateId();
    // "/start role_sunita" from a deep link binds this chat to the role.
    const start = n.kind === "text" && /^\/start\s+role_(\w+)/i.exec(n.text || "");
    if (start) {
      // A role that already has a real chat stays with it: opening someone
      // else's link can't take their place (Vinay's role approves money).
      // Only the operator rebinds, through /admin/cast.
      const cast = await ops.getCast();
      const want = Object.keys(cast.roles).find((k) => k.toLowerCase() === start[1].toLowerCase());
      const holder = want ? cast.roles[want] : null;
      if (want && holder && holder !== n.chat_id && !String(holder).startsWith("sim-")) {
        await call("sendMessage", { chat_id: n.chat_id, text: `${want} is already connected. Who are you? Ask Vinay to send you the right link.` });
        await ops.log({ at_ist: istString(), kind: "cast", note: `${n.chat_id} tried ${want}, refused: already bound` });
      } else {
        const r = await ops.setCast({ role: start[1], chat_id: n.chat_id });
        const role = r.ok ? Object.keys(r.cast.roles).find((k) => r.cast.roles[k] === n.chat_id && k.toLowerCase() === start[1].toLowerCase()) : null;
        await call("sendMessage", { chat_id: n.chat_id, text: role ? `Hi! In Baari you're now ${role}.` : "That role link isn't valid." });
        await ops.log({ at_ist: istString(), kind: "cast", note: `${n.chat_id} -> ${role || start[1]}` });
      }
      n.kind = "cast";
    }
    // The invite link (t.me/<bot>?start=join, from the household app) and
    // /join: Baari asks who you are, with a button per open role. A tap on
    // "join:<Role>" claims it. Roles held by another real chat stay theirs.
    const who = u.callback_query ? u.callback_query.from : (u.message || u.edited_message || {}).from;
    if (n.kind === "text" && /^\/(start\s+join|join)\b/i.test(n.text || "")) {
      await joinPrompt(n.chat_id);
      n.kind = "cast";
    }
    const tap = n.kind === "button" && /^join:(\w+)$/i.exec(n.button_data || "");
    if (tap) {
      await claimRole(n.chat_id, tap[1], who ? name(who) : null);
      n.kind = "cast";
    }
    const role = await ops.roleFor(n);
    if (role) n.role = role;
    // Someone outside the household (a judge) writes: /start gets a Namaste
    // and the offer of tonight's baari; "aaj kya banega", or the button,
    // starts their night as the guest (lib/guest.js). Never silence.
    const guest = require("./guest");
    const display = who ? who.first_name || name(who) : null;
    // A judge's /test, /status or /help before their night: the test kit.
    if (!n.role && n.kind !== "cast" && (await require("./testkit").handle(n, base, { sendMessage }))) n.kind = "cast";
    if (!n.role && n.kind !== "cast" && (!String(n.chat_id).startsWith("sim-") || n.chat_id === "sim-judge")) {
      if (await guest.onOutsider(n, display, base)) n.kind = "cast";
    }
    if (n.role === guest.GUEST && n.kind === "button" && n.button_data === "guest:about") {
      await guest.about(n.chat_id);
      n.kind = "cast";
    }
    // The guest taps the button again or sends /start mid-night.
    if (n.role === guest.GUEST && ((n.kind === "button" && n.button_data === "guest:go") || (n.kind === "text" && /^\/start\b/i.test(n.text || "")))) {
      await guest.begin(n.chat_id, display, base);
      n.kind = "cast";
    }
    // Plain /start from the family: who they are and what they can send.
    if (n.role && n.role !== guest.GUEST && n.kind === "text" && /^\/start\s*$/i.test(n.text || "")) {
      await call("sendMessage", { chat_id: n.chat_id, text: `Hi ${n.role}! 🙏 In Baari you're ${n.role}.
/baari: whose turn it is tonight
/demo pick or /demo vote: a whole night in 10 minutes
Or just write "what's for dinner?"` });
      n.kind = "cast";
    }
    // /leave frees your role; /demo pick | vote | stop runs a whole night now.
    if (n.kind === "text" && n.role && /^\/leave\b/i.test(n.text || "")) {
      await ops.setCast({ role: n.role, chat_id: null });
      await call("sendMessage", { chat_id: n.chat_id, text: `OK, you're no longer ${n.role}. Send /join to come back.` });
      await ops.log({ at_ist: istString(), kind: "cast", note: `${n.chat_id} left ${n.role}` });
      n.kind = "cast";
    }
    // /call: tomorrow's dinner on a phone call to the demo phone (lib/call.js).
    if (n.kind === "text" && n.role && /^\/call\b/i.test(n.text || "")) {
      const wake = require("./wake");
      if (!require("./call").configured()) await call("sendMessage", { chat_id: n.chat_id, text: "Phone calls aren't set up right now (Twilio keys missing)." });
      else wake.later(wake.startDemo("pick", n.role, base, { call: true }));
      n.kind = "cast";
    }
    const dm = n.kind === "text" && n.role && /^\/demo(?:\s+(pick|vote|stop))?\b/i.exec(n.text || "");
    if (dm) {
      const wake = require("./wake");
      if (!dm[1]) await call("sendMessage", { chat_id: n.chat_id, text: "🎬 /demo pick: one person picks, the others can veto.\n🎬 /demo vote: everyone votes, the turn-holder breaks a tie.\nEither runs a whole night (dishes, lock, Delhivery and Sharma Kirana orders, Pine Labs payments, tracking, Sunita's voice brief) in about 10 minutes. /demo stop ends it." });
      else if (dm[1].toLowerCase() === "stop") {
        await wake.stopDemo(base);
        await call("sendMessage", { chat_id: n.chat_id, text: "🎬 Demo stopped." });
      } else await wake.startDemo(dm[1].toLowerCase(), n.role, base);
      n.kind = "cast";
    }
    // Who's eating (S6). /bahar: a button per person for "not eating
    // tomorrow", a tap toggles. /mehmaan: guests with - and +. Plain speech
    // ("Papa won't eat tomorrow") goes to Baari, who calls hh.away.
    if (n.role && n.role !== "Sunita" && ((n.kind === "text" && /^\/(bahar|away|mehmaan|guests)\b/i.test(n.text || "")) || (n.kind === "button" && /^(away|guests):/i.test(n.button_data || "")))) {
      const att = require("./attendance");
      let v = await att.view();
      let note = "";
      const tap = n.kind === "button" ? /^(away|guests):(.+)$/i.exec(n.button_data) : null;
      if (tap && tap[1].toLowerCase() === "away") {
        const isAway = v.away.some((a) => a.name === tap[2]);
        const r = await att.setAway({ name: tap[2], back: isAway, by: n.role, via: "telegram" });
        if (!r.ok) note = r.why || r.error;
        else { v = r.attendance; await att.react(r, base, n.role); }
      } else if (tap) {
        const r = await att.setGuests({ n: v.guests + (tap[2] === "+1" ? 1 : -1), by: n.role, via: "telegram" });
        if (!r.ok) note = r.why || r.error;
        else { v = r.attendance; await att.react(r, base, n.role); }
      }
      const guests = /^\/(mehmaan|guests)/i.test(n.text || "") || (tap && tap[1].toLowerCase() === "guests");
      const all = await att.members();
      const text = `${note ? `${note}\n` : ""}${v.headcount} eating on ${v.date_for}${v.away.length ? `. Out: ${v.away.map((a) => a.name).join(", ")}` : ""}${v.guests ? `. Guests: ${v.guests}` : ""}.\n${guests ? "Guests coming?" : "Tap whoever won't eat at home."}`;
      const buttons = guests ? [[{ text: "−", data: "guests:-1" }, { text: `${v.guests} guests`, data: "guests:0" }, { text: "+", data: "guests:+1" }]] : [all.map((m) => ({ text: `${v.away.some((a) => a.name === m) ? "✗ " : "✓ "}${m}`, data: `away:${m}` }))];
      if (tap && n.reply_to_message_id) await call("editMessageText", { chat_id: n.chat_id, message_id: n.reply_to_message_id, text, reply_markup: { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } }).catch(() => null);
      else await sendMessage({ chat_id: n.chat_id, text, buttons });
      n.kind = "cast";
    }
    // /help, /test and /status: the test kit (lib/testkit.js). Like any
    // command, it's kept but never read as a message to Baari.
    if (n.kind !== "cast" && (await require("./testkit").handle(n, base, { sendMessage }))) n.kind = "cast";
    await store.push("tg:updates", n, 2000);
    await require("./events").onUpdate(n);
    // "/mode pick" or "/mode vote" from Vinay switches how nights run, and
    // "/baari" from anyone says whose turn it is (lib/turn.js). A new mode
    // starts tonight if tonight's dishes haven't gone out yet, else tomorrow.
    if (n.kind === "text" && n.role && /^\/(mode|baari)\b/i.test(n.text || "")) {
      const turn = require("./turn");
      const m = /^\/mode\s+(pick|vote)\b/i.exec(n.text || "");
      let reply;
      if (m && n.role !== "Vinay") reply = "Only Vinay can change the mode.";
      else if (m) {
        const h = (await store.get("handoff:last")) || {};
        const t0 = await turn.get();
        const started = !!(t0.tonight && h.date_for === t0.tonight.date_for && h.phase_done);
        await turn.set({ mode: m[1].toLowerCase(), tonight: !started });
        reply = `${m[1].toLowerCase() === "vote" ? "Now everyone votes, the most votes win, and the turn-holder breaks a tie." : "Now the turn-holder picks, and the others get one veto."} ${started ? "Starting tomorrow." : "Starting tonight."}`;
        await ops.log({ at_ist: istString(), kind: "turn", note: `mode ${m[1].toLowerCase()} by ${n.role}${started ? " from tomorrow" : " from tonight"}` });
        await require("./events").emit("turn", { who: n.role, via: "telegram", mode: m[1].toLowerCase(), text: `${n.role} set ${m[1].toLowerCase()} mode${started ? " from tomorrow" : ""}` });
      } else if (/^\/mode\b/i.test(n.text || "")) reply = "Write /mode pick (the turn-holder picks) or /mode vote (everyone votes).";
      else {
        const v = turn.view(await turn.get());
        reply = `It's ${v.holder || "nobody"}'s baari tonight, ${v.next}'s next. ${v.mode === "vote" ? "Everyone votes." : "The turn-holder picks."}`;
      }
      await call("sendMessage", { chat_id: n.chat_id, text: reply });
    }
    // A pick or vote tap is remembered for tonight, so a run that started
    // before it doesn't send the same dish buttons again (lib/bridge.js).
    if (n.kind === "button" && n.role && /^(pick|vote):/i.test(n.button_data || "")) {
      const tn = (await require("./turn").get()).tonight;
      if (tn && tn.date_for) await store.set(`picktap:${tn.date_for}:${n.chat_id}`, 1, 3600);
    }
    // Vinay's "Haan" or "Nahi" on a spend ask is the approval the bridge
    // checks before a debit over Rs 300 (lib/household.js).
    if (n.kind === "button" && n.role) {
      const a = await require("./household").onButton(n.role, n.button_data);
      if (a) await ops.log({ at_ist: istString(), kind: "approval", note: `${n.role}: ${JSON.stringify(a)}` });
    }
    const from = u.callback_query ? u.callback_query.from : (u.message || u.edited_message || {}).from;
    if (from) {
      const contacts = (await store.get("tg:contacts")) || {};
      contacts[n.chat_id] = { chat_id: n.chat_id, name: name(from), username: from.username || null };
      await store.set("tg:contacts", contacts);
    }
    // A message from someone in the household may be what a phase is
    // waiting for. Answer Telegram now; the wake check runs after.
    if (n.role && n.kind !== "cast") {
      const wake = require("./wake");
      wake.later(wake.onMessage(n, base));
    }
  }
  return { status: 200, body: { ok: true } };
}

const OPEN = (chat) => !chat || String(chat).startsWith("sim-");

async function joinPrompt(chat_id) {
  const cast = await ops.getCast();
  const mine = Object.keys(cast.roles).find((r) => cast.roles[r] === String(chat_id));
  if (mine) return call("sendMessage", { chat_id, text: `You're already ${mine}. Run a whole night with /demo, or leave the role with /leave.` });
  const open = Object.keys(cast.roles).filter((r) => OPEN(cast.roles[r]));
  if (!open.length) return call("sendMessage", { chat_id, text: "Hi! All the family's roles are taken right now; ask Vinay to free one." });
  const label = (r) => (r === "Sunita" ? "Sunita (cook)" : r);
  return call("sendMessage", {
    chat_id,
    text: "Hi, I'm Baari, the Sharma family's dinner agent. Who will you be?",
    reply_markup: { inline_keyboard: [open.map((r) => ({ text: label(r), callback_data: `join:${r}` }))] },
  });
}

async function claimRole(chat_id, want, display) {
  const cast = await ops.getCast();
  const role = Object.keys(cast.roles).find((r) => r.toLowerCase() === String(want).toLowerCase());
  const mine = Object.keys(cast.roles).find((r) => cast.roles[r] === String(chat_id));
  if (!role) return call("sendMessage", { chat_id, text: "I couldn't find that role. Send /join again." });
  if (mine) return call("sendMessage", { chat_id, text: `You're already ${mine}. To switch, send /leave first.` });
  if (!OPEN(cast.roles[role])) return call("sendMessage", { chat_id, text: `Someone else is ${role} right now. Pick a free role with /join.` });
  await ops.setCast({ role, chat_id: String(chat_id) });
  await ops.log({ at_ist: istString(), kind: "cast", note: `${chat_id} joined as ${role}` });
  const hello = role === "Sunita"
    ? "Namaste Sunita ji! Baari subah aapko Hindi voice note bhejegi: kya banana hai, kitne log, kya lena hai. Jawab voice note mein dijiye."
    : `Namaste ${role}! You're in. Each evening Baari offers two dishes. In pick mode the person whose baari it is chooses and the others can veto once; in vote mode everyone votes. Send /demo pick or /demo vote to run a whole night now, /baari to see whose turn it is.`;
  await call("sendMessage", { chat_id, text: hello });
  const op = (await ops.getCast()).operator;
  if (op && op !== String(chat_id) && !String(op).startsWith("sim-")) await call("sendMessage", { chat_id: op, text: `🙋 ${display || "Someone"} joined as ${role}.`, disable_notification: true });
}

async function webhookInfo() {
  const r = await call("getWebhookInfo", {});
  if (!r.ok) throw new Error(r.description);
  return r.result;
}

let me = null;
async function botUsername() {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME;
  if (!me) me = await call("getMe", {});
  return me.ok ? me.result.username : null;
}

async function setWebhook(base) {
  return call("setWebhook", {
    url: `${base}/telegram/webhook`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message", "edited_message", "callback_query"],
    drop_pending_updates: false,
  });
}

// Download a voice note so Gnani can transcribe it.
async function fileBytes(fileId) {
  const info = await call("getFile", { file_id: fileId });
  if (!info.ok) throw new Error(`getFile failed: ${info.description}`);
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${info.result.file_path}`);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") || "audio/ogg" };
}

// ---- tools

// `to` may be a role (Vinay, Mummy, Papa, Sunita); rails resolves it through
// the cast, and in solo mode prefixes the role so one phone can play several.
async function route(to, chat_id) {
  if (chat_id && !to) return { chat_id: String(chat_id), role: null, prefix: "" };
  return ops.resolveTo(to || chat_id);
}

// Eval sink: chats named sim-* never reach Telegram. Each send is kept for
// the harness at GET /admin/sim-outbox and gets a fake message_id.
async function simSend(dest, kind, fields) {
  const message_id = await store.incr("sim:msgid");
  const rec = { at_ist: istString(), at_ms: Date.now(), kind, chat_id: dest.chat_id, to: dest.role, message_id, ...fields };
  await store.push("sim:outbox", rec, 1000);
  await ops.rememberSent(dest.chat_id, message_id, dest.role);
  return { ok: true, message_id, chat_id: dest.chat_id, ...(dest.role ? { to: dest.role } : {}), sent_at_ist: rec.at_ist, sim: true };
}

async function sendMessage({ chat_id, to, text, buttons }) {
  const dest = await route(to, chat_id);
  if (!dest.chat_id) return { ok: false, error: dest.error };
  if (dest.chat_id.startsWith("sim-")) return simSend(dest, "text", { text: dest.prefix + text, buttons: buttons || null });
  const payload = { chat_id: dest.chat_id, text: dest.prefix + text };
  if (buttons && buttons.length) {
    payload.reply_markup = {
      // A button with url opens a page (a Pine Labs checkout); the rest call back.
      inline_keyboard: buttons.map((row) => (Array.isArray(row) ? row : [row]).map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: String(b.data || b.text).slice(0, 64) }))),
    };
  }
  const r = await call("sendMessage", payload);
  if (!r.ok) return { ok: false, error: r.description };
  await ops.rememberSent(dest.chat_id, r.result.message_id, dest.role);
  return { ok: true, message_id: r.result.message_id, chat_id: String(r.result.chat.id), ...(dest.role ? { to: dest.role } : {}), sent_at_ist: istString(new Date(r.result.date * 1000)) };
}

// Rails' own status signals while a run is starting: Telegram's "typing…"
// line and a short "working on it" note. Not Baari's words and not a
// decision, so they skip the cast, the sent-message index and simulated chats.
async function chatAction(chat_id, action = "typing") {
  if (!chat_id || String(chat_id).startsWith("sim-")) return { ok: false };
  return call("sendChatAction", { chat_id, action });
}

// One message kept up to date in place (the order card): sends it the first
// time, edits it after. Returns the message_id to edit next time.
async function liveMessage(chat_id, message_id, text) {
  if (!chat_id || String(chat_id).startsWith("sim-")) {
    await store.push("sim:outbox", { at_ist: istString(), at_ms: Date.now(), kind: message_id ? "edit" : "text", chat_id, text }, 1000);
    return message_id || 1;
  }
  if (message_id) {
    const r = await call("editMessageText", { chat_id, message_id, text });
    if (r.ok || /not modified/i.test(r.description || "")) return message_id;
  }
  const r = await call("sendMessage", { chat_id, text, disable_notification: !!message_id });
  return r.ok ? r.result.message_id : null;
}

async function statusNote(chat_id, text) {
  if (!chat_id || String(chat_id).startsWith("sim-")) return { ok: false };
  return call("sendMessage", { chat_id, text, disable_notification: true });
}

async function sendVoice({ chat_id, to, audio_url, caption }, loadAudio) {
  const dest = await route(to, chat_id);
  if (!dest.chat_id) return { ok: false, error: dest.error };
  if (dest.chat_id.startsWith("sim-")) await appfeed.noteVoiceSent(dest.role, audio_url);
  if (dest.chat_id.startsWith("sim-")) return simSend(dest, "voice", { audio_url, caption: (dest.prefix + (caption || "")).trim() || null });
  const audio = await loadAudio(audio_url);
  const fd = new FormData();
  fd.append("chat_id", dest.chat_id);
  const cap = (dest.prefix + (caption || "")).trim();
  if (cap) fd.append("caption", cap);
  fd.append("voice", new Blob([audio.bytes], { type: "audio/ogg" }), "baari.ogg");
  const res = await fetch(`${API}/sendVoice`, { method: "POST", body: fd });
  const r = await res.json();
  if (!r.ok) return { ok: false, error: r.description };
  await ops.rememberSent(dest.chat_id, r.result.message_id, dest.role);
  await appfeed.noteVoiceSent(dest.role, audio_url);
  return { ok: true, message_id: r.result.message_id, chat_id: String(r.result.chat.id), ...(dest.role ? { to: dest.role } : {}), duration_seconds: r.result.voice && r.result.voice.duration, sent_at_ist: istString(new Date(r.result.date * 1000)) };
}

async function getUpdates({ after_update_id, chat_id, limit }) {
  const all = await store.range("tg:updates", 2000);
  // Nothing from before the last /admin/reset-day.
  const after = Math.max(Number(after_update_id || 0), Number((await store.get("tg:mark")) || 0));
  let list = all.filter((u) => u.update_id > after && u.kind !== "cast");
  if (chat_id) list = list.filter((u) => u.chat_id === String(chat_id));
  list = list.reverse(); // oldest first
  const lim = Number(limit || 50);
  return { now_ist: istString(), count: Math.min(list.length, lim), updates: list.slice(-lim) };
}

async function listContacts() {
  const c = (await store.get("tg:contacts")) || {};
  const cast = await ops.getCast();
  // Roles first: that's who the agent writes to (labels.to).
  const roles = Object.entries(cast.roles).map(([role, chat]) => ({ role, chat_id: chat, bound: !!chat || (cast.solo && !!cast.operator) }));
  return { roles, solo: cast.solo, contacts: Object.values(c) };
}

module.exports = { call, liveMessage, webhookInfo, botUsername, webhook, setWebhook, fileBytes, sendMessage, sendVoice, chatAction, statusNote, getUpdates, listContacts, WEBHOOK_SECRET };
