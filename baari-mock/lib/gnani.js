// Real Gnani (Vachana) speech APIs. Nothing here is mocked.
// STT: POST https://api.vachana.ai/stt/v3 (multipart, X-API-Key-ID)
// TTS: POST https://api.vachana.ai/api/v1/tts/inference (JSON, returns audio)

const crypto = require("crypto");
const store = require("./store");

const KEY = process.env.GNANI_API_KEY;
const STT_URL = "https://api.vachana.ai/stt/v3";
const TTS_URL = "https://api.vachana.ai/api/v1/tts/inference";

const VOICES = { "hi-IN": "Chitra", "en-IN": "Kaveri", "hi-en": "Poorvi" };

async function speechToText({ audio_url, language_code, bias_list }, loadAudio) {
  const audio = await loadAudio(audio_url);
  const fd = new FormData();
  const ext = /wav/.test(audio.type || "") ? "wav" : /mpeg|mp3/.test(audio.type || "") ? "mp3" : "ogg";
  fd.append("audio_file", new Blob([audio.bytes], { type: audio.type || "audio/ogg" }), `voice.${ext}`);
  fd.append("language_code", language_code || "hi-IN");
  if (bias_list) fd.append("bias_list", Array.isArray(bias_list) ? bias_list.join(",") : String(bias_list));
  const t0 = Date.now();
  const res = await fetch(STT_URL, { method: "POST", headers: { "X-API-Key-ID": KEY }, body: fd });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, http_status: res.status, error: "Gnani returned a non-JSON body", raw: text.slice(0, 300) };
  }
  if (!res.ok || !parsed.success) return { ok: false, http_status: res.status, error: parsed };
  return {
    ok: true,
    transcript: parsed.transcript,
    literal: parsed.output && parsed.output.literal,
    model: parsed.model,
    request_id: parsed.request_id,
    language_code: language_code || "hi-IN",
    latency_ms: Date.now() - t0,
  };
}

// container "mp3" for phone calls (Twilio plays mp3, not ogg).
async function textToSpeech({ text, language, voice, speed, container }, base) {
  const mp3 = container === "mp3";
  const lang = language || "hi-IN";
  const t0 = Date.now();
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": KEY },
    body: JSON.stringify({
      text,
      voice: voice || VOICES[lang] || "Chitra",
      model: "timbre-v2.5",
      language: lang,
      speed: speed || 1.0,
      audio_config: mp3 ? { sample_rate: 22050, num_channels: 1, container: "mp3", bitrate: "64k" } : { sample_rate: 48000, num_channels: 1, container: "ogg" },
    }),
  });
  if (!res.ok) {
    return { ok: false, http_status: res.status, error: (await res.text()).slice(0, 300) };
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const id = crypto.randomBytes(8).toString("hex");
  await store.set(`tts:${id}`, bytes.toString("base64"), 3 * 86400);
  return {
    ok: true,
    audio_url: `${base}/media/tts/${id}.${mp3 ? "mp3" : "ogg"}`,
    bytes: bytes.length,
    language: lang,
    voice: voice || VOICES[lang] || "Chitra",
    latency_ms: Date.now() - t0,
  };
}

async function ttsBytes(id) {
  const b64 = await store.get(`tts:${id}`);
  return b64 ? { bytes: Buffer.from(b64, "base64"), type: "audio/ogg" } : null;
}

module.exports = { speechToText, textToSpeech, ttsBytes };
