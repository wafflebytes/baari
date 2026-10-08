// Pairing (S2): the app shows "Telegram se judo", a deep link that binds the
// chat that opens it to this household and member. Opened another way, the
// bot takes the 6-character code shown in the app. Codes last 10 minutes and
// work once. Pairing replaces the role picker for that member.

const crypto = require("crypto");
const store = require("./store");
const ops = require("./ops");
const { istString } = require("./util");

const TTL = 600;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

function code() {
  const b = crypto.randomBytes(6);
  return [...b].map((x) => ALPHA[x % ALPHA.length]).join("");
}

async function create(member) {
  const role = ops.ROLES.find((r) => r.toLowerCase() === String(member || "").toLowerCase());
  if (!role || role === ops.GUEST) return { ok: false, error: `member must be one of ${ops.ROLES.filter((r) => r !== ops.GUEST).join(", ")}` };
  const c = code();
  await store.set(`pair:${c}`, { member: role, at_ist: istString() }, TTL);
  const bot = process.env.TELEGRAM_BOT_USERNAME || "Baari_ken_bot";
  return { ok: true, code: c, deep_link: `https://t.me/${bot}?start=p_${c}`, expires_in: TTL, member: role };
}

// From the bot: "/start p_<code>" or a bare code. Returns the greeting, or null
// when the text isn't a pairing code at all.
async function claim(text, chat_id, display) {
  const m = /^\/start\s+p_([A-Z0-9]{6})\b/i.exec(text || "") || /^\s*([A-Z0-9]{6})\s*$/i.exec(text || "");
  if (!m) return null;
  const c = m[1].toUpperCase();
  const p = await store.get(`pair:${c}`);
  if (!p) return /^\/start/i.test(text) ? { ok: false, text: "That link has expired. Open Baari's app and tap Telegram se judo again." } : null;
  await store.del(`pair:${c}`);
  await ops.setCast({ role: p.member, chat_id });
  await ops.log({ at_ist: istString(), kind: "cast", note: `${chat_id} paired as ${p.member} from the app` });
  await require("./events").emit("pair", { who: p.member, via: "telegram" });
  return { ok: true, member: p.member, text: `Hi ${display || p.member}! You're connected to the Sharma home as ${p.member}. Your baari, votes and Baari's messages come here now, and the app shows the same. Write "what's for dinner?" any time.` };
}

module.exports = { create, claim };
