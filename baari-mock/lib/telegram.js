// Real Telegram Bot API. Nothing here is mocked: messages go to real phones.
// Incoming messages arrive on /telegram/webhook and are kept in Redis so each
// phase of Baari (8:30pm, 9:30pm, 7:45am) can read what came in since the last.

const crypto = require("crypto");
const store = require("./store");
const { istString } = require("./util");

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
  const n = normalize(u, base);
  if (n) {
    await store.push("tg:updates", n, 2000);
    const from = u.callback_query ? u.callback_query.from : (u.message || u.edited_message || {}).from;
    if (from) {
      const contacts = (await store.get("tg:contacts")) || {};
      contacts[n.chat_id] = { chat_id: n.chat_id, name: name(from), username: from.username || null };
      await store.set("tg:contacts", contacts);
    }
  }
  if (u.callback_query) {
    // Stop the spinner on the button and confirm the tap to the voter.
    await call("answerCallbackQuery", { callback_query_id: u.callback_query.id, text: "Noted 👍" });
  }
  return { status: 200, body: { ok: true } };
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

async function sendMessage({ chat_id, text, buttons }) {
  const payload = { chat_id, text };
  if (buttons && buttons.length) {
    payload.reply_markup = {
      inline_keyboard: buttons.map((row) => (Array.isArray(row) ? row : [row]).map((b) => ({ text: b.text, callback_data: String(b.data || b.text).slice(0, 64) }))),
    };
  }
  const r = await call("sendMessage", payload);
  if (!r.ok) return { ok: false, error: r.description };
  return { ok: true, message_id: r.result.message_id, chat_id: String(r.result.chat.id), sent_at_ist: istString(new Date(r.result.date * 1000)) };
}

async function sendVoice({ chat_id, audio_url, caption }, loadAudio) {
  const audio = await loadAudio(audio_url);
  const fd = new FormData();
  fd.append("chat_id", String(chat_id));
  if (caption) fd.append("caption", caption);
  fd.append("voice", new Blob([audio.bytes], { type: "audio/ogg" }), "baari.ogg");
  const res = await fetch(`${API}/sendVoice`, { method: "POST", body: fd });
  const r = await res.json();
  if (!r.ok) return { ok: false, error: r.description };
  return { ok: true, message_id: r.result.message_id, chat_id: String(r.result.chat.id), duration_seconds: r.result.voice && r.result.voice.duration, sent_at_ist: istString(new Date(r.result.date * 1000)) };
}

async function getUpdates({ after_update_id, chat_id, limit }) {
  const all = await store.range("tg:updates", 2000);
  let list = all.filter((u) => !after_update_id || u.update_id > Number(after_update_id));
  if (chat_id) list = list.filter((u) => u.chat_id === String(chat_id));
  list = list.reverse(); // oldest first
  const lim = Number(limit || 50);
  return { now_ist: istString(), count: Math.min(list.length, lim), updates: list.slice(-lim) };
}

async function listContacts() {
  const c = (await store.get("tg:contacts")) || {};
  return { contacts: Object.values(c) };
}

module.exports = { webhook, setWebhook, fileBytes, sendMessage, sendVoice, getUpdates, listContacts, WEBHOOK_SECRET };
