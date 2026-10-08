// Pages Function: speech to text for the app's mic. The phone records a short
// 16 kHz WAV and posts it here; this forwards it to rails, whose ElevenLabs
// shaped adapter runs it through Gnani (Vachana STT, lib/eleven_gnani.js).
// The rails key is the RAILS_MCP_KEY Pages secret and never reaches a phone.
const RAILS = "https://baari-rails.vercel.app";
const LANGS = { "hi-IN": "hin", "en-IN": "eng", "mr-IN": "mar", "bn-IN": "ben", "ta-IN": "tam", "te-IN": "tel", "kn-IN": "kan" };
const MAX = 2 * 1024 * 1024; // about a minute of 16 kHz mono

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.RAILS_MCP_KEY) return json(503, { error: "stt_not_configured" });
  let form;
  try { form = await request.formData(); } catch (e) { return json(400, { error: "bad_form" }); }
  const audio = form.get("audio");
  if (!audio || typeof audio === "string") return json(400, { error: "no_audio" });
  if (audio.size > MAX) return json(413, { error: "too_long" });
  const fd = new FormData();
  fd.append("file", audio, "voice.wav");
  fd.append("model_id", "scribe_v1");
  fd.append("language_code", LANGS[form.get("lang")] || "hin");
  const t0 = Date.now();
  let res, out = null;
  try {
    res = await fetch(`${RAILS}/v1/speech-to-text`, { method: "POST", headers: { "xi-api-key": env.RAILS_MCP_KEY }, body: fd });
    out = await res.json();
  } catch (e) { return json(502, { error: "rails_unreachable" }); }
  if (!res.ok || !out || typeof out.text !== "string") return json(502, { error: "stt_failed", status: res.status });
  return json(200, { text: out.text, provider: out.provider || "gnani", ms: Date.now() - t0 });
}
