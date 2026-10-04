// Simulated people for eval runs. They feed the INBOX (text, button taps,
// and voice notes spoken by real Gnani TTS so STT runs on real audio) and
// receive the OUTBOX (messages are captured, never sent to a phone). Pine
// Labs debits go to the real rails mock, on an eval-only subscription.
const fs = require("fs");
const path = require("path");
const { mcpCall } = require("./lib");

const TTS_CACHE = path.join(__dirname, "../out/tts_cache.json");

function ttsCache() {
  try {
    return JSON.parse(fs.readFileSync(TTS_CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function voiceUrl(text, lang) {
  const cache = ttsCache();
  const key = `${lang || "hi-IN"}|${text}`;
  if (cache[key]) return cache[key];
  const { result } = await mcpCall("gnani", "text_to_speech", { text, language: lang || "hi-IN" });
  const url = result && (result.audio_url || (result.response && result.response.audio_url));
  if (!url) throw new Error(`TTS gave no audio_url: ${JSON.stringify(result).slice(0, 200)}`);
  cache[key] = url;
  fs.mkdirSync(path.dirname(TTS_CACHE), { recursive: true });
  fs.writeFileSync(TTS_CACHE, JSON.stringify(cache, null, 1));
  return url;
}

function istString(d) {
  return new Date(d.getTime() + 5.5 * 3600e3).toISOString().replace("T", " ").slice(0, 16);
}

// inject: [{who, kind: text|button|voice, text, button_data, audio_text, lang, minutes_before}]
async function buildInbox(inject, now, firstId = 81230001) {
  const inbox = [];
  const spoken = {};
  let id = firstId;
  for (const x of inject || []) {
    const at = new Date(new Date(now).getTime() - (x.minutes_before || 5) * 60000);
    const u = { update_id: id++, from: x.who, kind: x.kind, at_ist: istString(at) };
    if (x.kind === "button") u.button_data = x.button_data;
    else if (x.kind === "voice") {
      u.audio_url = await voiceUrl(x.audio_text, x.lang);
      // The platform's speech_to_text takes only file_base64; rails reads a
      // file that is a URL as a reference to that audio (STATUS W2 ask 0).
      u.file_base64 = Buffer.from(u.audio_url).toString("base64");
      u.duration_seconds = Math.max(2, Math.round(x.audio_text.length / 12));
      spoken[u.update_id] = x.audio_text;
    } else u.text = x.text;
    inbox.push(u);
  }
  return { inbox, spoken };
}

class SimTransport {
  constructor({ subscriptionId }) {
    this.subscriptionId = subscriptionId;
    this.messages = [];
    this.n = 5001;
  }
  async sendMessage({ to, text, buttons }) {
    this.messages.push({ message_id: this.n, to_role: to, kind: "text", text, buttons });
    return { ok: true, message_id: this.n++ };
  }
  async sendVoice({ to, audio_url, caption }) {
    if (!audio_url) return { ok: false, error: "audio_url is required" };
    this.messages.push({ message_id: this.n, to_role: to, kind: "voice", text: caption || "", audio_url });
    return { ok: true, message_id: this.n++ };
  }
  async pine(tool, args) {
    const { result } = await mcpCall("pinelabs", tool, args);
    return result;
  }
}

module.exports = { buildInbox, SimTransport, voiceUrl };
