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
        await call("sendMessage", { chat_id: n.chat_id, text: `${want} pehle se jude hue hain. Aap kaun hain? Vinay se kahiye ki aapko sahi link bhejein.` });
        await ops.log({ at_ist: istString(), kind: "cast", note: `${n.chat_id} tried ${want}, refused: already bound` });
      } else {
        const r = await ops.setCast({ role: start[1], chat_id: n.chat_id });
        const role = r.ok ? Object.keys(r.cast.roles).find((k) => r.cast.roles[k] === n.chat_id && k.toLowerCase() === start[1].toLowerCase()) : null;
        await call("sendMessage", { chat_id: n.chat_id, text: role ? `Namaste! Baari mein aap ab ${role} hain.` : "Ye role link sahi nahi hai." });
        await ops.log({ at_ist: istString(), kind: "cast", note: `${n.chat_id} -> ${role || start[1]}` });
      }
      n.kind = "cast";
    }
    const role = await ops.roleFor(n);
    if (role) n.role = role;
    await store.push("tg:updates", n, 2000);
    // "/mode pick" or "/mode vote" from Vinay switches how nights run, and
    // "/baari" from anyone says whose turn it is (lib/turn.js). A new mode
    // starts tonight if tonight's dishes haven't gone out yet, else tomorrow.
    if (n.kind === "text" && n.role && /^\/(mode|baari)\b/i.test(n.text || "")) {
      const turn = require("./turn");
      const m = /^\/mode\s+(pick|vote)\b/i.exec(n.text || "");
      let reply;
      if (m && n.role !== "Vinay") reply = "Mode sirf Vinay badal sakte hain.";
      else if (m) {
        const h = (await store.get("handoff:last")) || {};
        const t0 = await turn.get();
        const started = !!(t0.tonight && h.date_for === t0.tonight.date_for && h.phase_done);
        await turn.set({ mode: m[1].toLowerCase(), tonight: !started });
        reply = `${m[1].toLowerCase() === "vote" ? "Ab sab vote karenge, zyada vote jeetega, baari wala tie todega." : "Ab baari wala chunega, baaki ek veto kar sakte hain."} ${started ? "Kal se." : "Aaj se."}`;
        await ops.log({ at_ist: istString(), kind: "turn", note: `mode ${m[1].toLowerCase()} by ${n.role}${started ? " from tomorrow" : " from tonight"}` });
      } else if (/^\/mode\b/i.test(n.text || "")) reply = "Likho /mode pick (baari wala chune) ya /mode vote (sab vote karein).";
      else {
        const v = turn.view(await turn.get());
        reply = `Aaj ${v.holder || "kisi"} ki baari hai, agli ${v.next} ki. ${v.mode === "vote" ? "Sab vote karte hain." : "Baari wala chunta hai."}`;
      }
      await call("sendMessage", { chat_id: n.chat_id, text: reply });
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
  if (u.callback_query) {
    // Stop the spinner on the button and confirm the tap to the voter.
    await call("answerCallbackQuery", { callback_query_id: u.callback_query.id, text: "Noted 👍" });
  }
  return { status: 200, body: { ok: true } };
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
      inline_keyboard: buttons.map((row) => (Array.isArray(row) ? row : [row]).map((b) => ({ text: b.text, callback_data: String(b.data || b.text).slice(0, 64) }))),
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

module.exports = { webhookInfo, botUsername, webhook, setWebhook, fileBytes, sendMessage, sendVoice, chatAction, statusNote, getUpdates, listContacts, WEBHOOK_SECRET };
