// ElevenLabs-compatible adapter backed by Gnani.
//
// AgenticOrg has no Gnani connector and rejects every custom MCP tool on our
// tenant, but its native ElevenLabs connector is accepted and takes a custom
// Base URL. So the native connector points here, and this file answers in
// ElevenLabs' request/response shapes while every byte of speech is produced
// or transcribed by Gnani (Vachana TTS and STT). Nothing here calls
// ElevenLabs.

const store = require("./store");
const bridge = require("./bridge");
const c3 = require("./c3");
const appfeed = require("./appfeed");
const { takeOverride } = require("./scenario");
const { fault } = require("./faults");
const ops = require("./ops");
const telegram = require("./telegram");
const { istString } = require("./util");

const KEY = process.env.GNANI_API_KEY;
const STT_URL = "https://api.vachana.ai/stt/v3";
const TTS_URL = "https://api.vachana.ai/api/v1/tts/inference";

// Gnani voices exposed as ElevenLabs "voices". voice_id is the Gnani name.
const VOICES = [
  { voice_id: "Chitra", name: "Chitra (Gnani, Hindi, warm)", language: "hi-IN" },
  { voice_id: "Bhavna", name: "Bhavna (Gnani, Hindi, friendly)", language: "hi-IN" },
  { voice_id: "Deepak", name: "Deepak (Gnani, Hindi, male)", language: "hi-IN" },
  { voice_id: "Poorvi", name: "Poorvi (Gnani, Hinglish)", language: "hi-en" },
  { voice_id: "Kaveri", name: "Kaveri (Gnani, English India)", language: "en-IN" },
];

// ElevenLabs uses ISO 639-3 codes like "hin"; Gnani wants BCP-47.
const LANG = { hin: "hi-IN", hi: "hi-IN", eng: "en-IN", en: "en-IN", mar: "mr-IN", tam: "ta-IN", tel: "te-IN", kan: "kn-IN", ben: "bn-IN", guj: "gu-IN", pan: "pa-IN", mal: "ml-IN" };

const json = (status, body) => ({ status, body });

function voiceView(v) {
  return {
    voice_id: v.voice_id,
    name: v.name,
    category: "premade",
    labels: { provider: "gnani", language: v.language },
    description: `Gnani Timbre v2.5 voice, ${v.language}`,
    preview_url: null,
  };
}

// Minimal multipart/form-data parser over the raw request bytes.
function parseMultipart(raw, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) return {};
  const boundary = Buffer.from("--" + (m[1] || m[2]));
  const out = {};
  let pos = raw.indexOf(boundary);
  while (pos !== -1) {
    const next = raw.indexOf(boundary, pos + boundary.length);
    if (next === -1) break;
    const part = raw.slice(pos + boundary.length + 2, next - 2); // strip CRLFs
    const sep = part.indexOf("\r\n\r\n");
    if (sep !== -1) {
      const head = part.slice(0, sep).toString("utf8");
      const data = part.slice(sep + 4);
      const name = /name="([^"]+)"/i.exec(head);
      const filename = /filename="([^"]*)"/i.exec(head);
      const type = /content-type:\s*([^\r\n]+)/i.exec(head);
      if (name) {
        out[name[1]] = filename ? { filename: filename[1], type: type ? type[1] : "application/octet-stream", bytes: data } : data.toString("utf8");
      }
    }
    pos = next;
  }
  return out;
}

async function log(entry) {
  await ops.log({ at_ist: istString(), kind: "tool", connector: "gnani (via elevenlabs adapter)", ...entry });
}

async function tts(voiceId, body, query, base) {
  const voice = VOICES.find((v) => v.voice_id.toLowerCase() === String(voiceId).toLowerCase()) || VOICES[0];
  const text = body.text;
  if (!text) return json(422, { detail: { status: "invalid_request", message: "text is required" } });
  const lang = LANG[body.language_code] || body.language_code || voice.language;
  const wantMp3 = !String(query.output_format || "mp3").startsWith("pcm") && !String(query.output_format || "").startsWith("ulaw");
  const t0 = Date.now();
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": KEY },
    body: JSON.stringify({
      text,
      voice: voice.voice_id,
      model: "timbre-v2.5",
      language: lang,
      speed: 1.0,
      audio_config: wantMp3 ? { sample_rate: 44100, num_channels: 1, container: "mp3", bitrate: "64k" } : { sample_rate: 16000, num_channels: 1, container: "raw", encoding: "linear_pcm" },
    }),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 300);
    await log({ tool: "text_to_speech", args: JSON.stringify({ voice: voice.voice_id, lang, text: text.slice(0, 200) }), result: `Gnani TTS failed ${res.status}: ${err}`, ms: Date.now() - t0 });
    return json(502, { detail: { status: "provider_error", message: `Gnani TTS failed (${res.status})` } });
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  // Keep a copy so the brief can be played or forwarded later.
  const id = require("crypto").randomBytes(8).toString("hex");
  await store.set(`tts:${id}`, bytes.toString("base64"), 3 * 86400);
  // The platform's TTS tool hands the model base64, not a URL, so tg.voice
  // accepts audio_url "last" (bridge.js) and rails sends this clip.
  await store.set("tts:last", `${base}/media/tts/${id}.mp3`, 3 * 86400);
  await appfeed.noteTts(`${base}/media/tts/${id}.mp3`, text);
  await log({
    tool: "text_to_speech",
    args: JSON.stringify({ voice: voice.voice_id, lang, text: text.slice(0, 300) }),
    result: JSON.stringify({ ok: true, bytes: bytes.length, audio_url: `${base}/media/tts/${id}.mp3` }),
    ms: Date.now() - t0,
  });
  // The platform base64s whatever comes back into the model's context, and a
  // 20 s brief is about 200k characters of mp3. So the body is the clip's URL
  // (about 80 characters once base64'd); tg.voice sends the real audio.
  // ?raw=1 returns the bytes, as ElevenLabs does.
  if (!(query && query.raw)) {
    return { status: 200, headers: { "Content-Type": "text/plain", "request-id": id, "x-baari-audio-url": `${base}/media/tts/${id}.mp3` }, body: `${base}/media/tts/${id}.mp3` };
  }
  return {
    status: 200,
    headers: { "Content-Type": wantMp3 ? "audio/mpeg" : "audio/pcm", "request-id": id, "x-baari-audio-url": `${base}/media/tts/${id}.mp3` },
    body: bytes,
  };
}

async function stt(req, loadAudio) {
  const started = Date.now();
  // Same fault switch as the other rails, for E3 (STT 503, malformed body).
  const f = await fault(await takeOverride("/v1/speech-to-text"));
  if (f) return f;
  const form = parseMultipart(req.rawBody || Buffer.alloc(0), req.headers["content-type"]);
  let audio;
  // The platform connector only forwards file_base64, and the model can't make
  // audio bytes. A tiny "file" whose content is an https URL is a reference.
  const ref = form.file && form.file.bytes && form.file.bytes.length < 600 ? form.file.bytes.toString("utf8").trim() : "";
  const isRef = /^https?:\/\/\S+$/.test(ref);
  const src = isRef ? ref : form.cloud_storage_url;
  if (isRef) audio = await loadAudio(ref);
  else if (form.file && form.file.bytes) audio = { bytes: form.file.bytes, type: form.file.type };
  else if (form.cloud_storage_url) audio = await loadAudio(form.cloud_storage_url);
  if (!audio) return json(422, { detail: { status: "invalid_request", message: "file or cloud_storage_url is required" } });
  const lang = LANG[form.language_code] || form.language_code || "hi-IN";
  const fd = new FormData();
  // Gnani picks the decoder from the file extension, so name it by type.
  const type = audio.type || "audio/ogg";
  const ext = /mpeg|mp3/.test(type) ? "mp3" : /wav/.test(type) ? "wav" : /mp4|m4a|aac/.test(type) ? "m4a" : /flac/.test(type) ? "flac" : "ogg";
  // A reference arrives with the platform's own filename; name it by the audio.
  const name = (!isRef && form.file && form.file.filename && /\.\w+$/.test(form.file.filename)) ? form.file.filename : `voice.${ext}`;
  fd.append("audio_file", new Blob([audio.bytes], { type }), name);
  fd.append("language_code", lang);
  const t0 = Date.now();
  const res = await fetch(STT_URL, { method: "POST", headers: { "X-API-Key-ID": KEY }, body: fd });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {}
  if (!res.ok || !parsed || !parsed.success) {
    await log({ tool: "speech_to_text", args: JSON.stringify({ lang, source: src || "upload" }), result: `Gnani STT failed ${res.status}: ${text.slice(0, 200)}`, ms: Date.now() - t0 });
    return json(502, { detail: { status: "provider_error", message: `Gnani STT failed (${res.status})` } });
  }
  // C3: commitment label and counts, answered before the connector's 10 s
  // timeout (PRD 8).
  const baari_extract = await c3.extract(parsed.transcript, started + 9000);
  if (src) await appfeed.noteStt(src, parsed.transcript, baari_extract);
  await log({ tool: "speech_to_text", args: JSON.stringify({ lang, source: src || "upload" }), result: JSON.stringify({ text: parsed.transcript, request_id: parsed.request_id, baari_extract }), ms: Date.now() - t0 });
  return json(200, {
    language_code: form.language_code || "hin",
    language_probability: 1,
    text: parsed.transcript,
    words: [],
    transcription_id: parsed.request_id,
    provider: "gnani-prisma-v2.5",
    baari_extract,
  });
}

async function route(req, base, loadAudio) {
  const { method, path } = req;
  if (!path.startsWith("/v1/")) return null;
  const key = req.headers["xi-api-key"];
  const expected = process.env.MCP_API_KEY;
  if (expected && key !== expected) {
    return json(401, { detail: { status: "invalid_api_key", message: "Invalid API key" } });
  }
  // Keep the raw shape of every non-speech call, so we can see exactly what
  // the native connector sends for its spare tools (lib/bridge.js).
  if (!/^\/v1\/(text-to-speech|speech-to-text)/.test(path)) {
    await store.push("elevenraw", {
      at_ist: istString(),
      method,
      path,
      query: req.query,
      content_type: req.headers["content-type"] || null,
      body: /multipart/i.test(req.headers["content-type"] || "")
        ? Object.fromEntries(Object.entries(parseMultipart(req.rawBody || Buffer.alloc(0), req.headers["content-type"])).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 500) : `(file ${v.filename}, ${v.bytes.length} bytes)`]))
        : String(req.body || "").slice(0, 800),
    }, 200);
  }
  const bridged = await bridge.route(req, { rest: req.rest, loadAudio, form: () => parseMultipart(req.rawBody || Buffer.alloc(0), req.headers["content-type"]) });
  if (bridged) return bridged;
  let m;
  if (method === "GET" && path === "/v1/user/subscription") {
    return json(200, { tier: "gnani-adapter", character_count: 0, character_limit: 1000000, can_extend_character_limit: false, status: "active", provider: "gnani" });
  }
  if (method === "GET" && path === "/v1/user") {
    return json(200, { subscription: { tier: "gnani-adapter", status: "active" }, is_new_user: false, xi_api_key: null });
  }
  if (method === "GET" && path === "/v1/models") {
    return json(200, [{ model_id: "timbre-v2.5", name: "Gnani Timbre v2.5", can_do_text_to_speech: true, languages: VOICES.map((v) => ({ language_id: v.language })) }]);
  }
  if (method === "GET" && path === "/v1/voices") {
    // list_voices also tells the agent who it can message (bridge.js).
    return json(200, { voices: VOICES.map(voiceView), baari_contacts: (await telegram.listContacts()).contacts });
  }
  if (method === "GET" && (m = path.match(/^\/v1\/voices\/([^/]+)$/))) {
    const v = VOICES.find((x) => x.voice_id.toLowerCase() === m[1].toLowerCase());
    return v ? json(200, voiceView(v)) : json(404, { detail: { status: "voice_not_found", message: `No voice ${m[1]}` } });
  }
  if (method === "POST" && (m = path.match(/^\/v1\/text-to-speech\/([^/]+)(?:\/stream)?$/))) {
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    } catch {
      return json(400, { detail: { status: "invalid_json", message: "Body must be JSON" } });
    }
    return tts(m[1], body, req.query, base);
  }
  if (method === "POST" && path === "/v1/speech-to-text") return stt(req, loadAudio);
  return json(404, { detail: { status: "not_supported", message: `${method} ${path} is not supported by the Gnani adapter` } });
}

module.exports = { route };
