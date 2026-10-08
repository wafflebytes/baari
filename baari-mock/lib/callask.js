// Baari calls to ask (finale S8 step E2, E3). A short call to one person:
// Baari greets them by name, asks at most two of the gaps (lib/gaps.js),
// confirms each answer back in one line, and closes with "baaki baad mein
// poochungi". The answers are that person's own (via "call"): they fill the
// profile's answers_by[member], and a "no" to eating tomorrow marks them
// away in attendance, by themselves.
//
// The call never chooses food and never moves money. Speech stays on Gnani:
// gnani.textToSpeech speaks every line and gnani.speechToText hears every
// web reply. Lines are fixed Hindi templates; no model decides anything,
// and the answers are parsed by rules (gaps.parse).
//
// Two carriers, same steps:
//   web    POST /app/call {member, purpose: "ask", carrier: "web"}
//            -> {session, line_text, audio_url, done}
//          POST /app/call/turn {session, text | audio (base64)}
//            -> {line_text, audio_url, done, answered: [ids]}
//   phone  the same session over Twilio to the demo number only (lib/call.js
//          dialAsk), turns through /twilio/voice and /twilio/heard with ?ask=<session>
//
// purpose "night" runs the phone call demo's night (lib/call.js) with the
// web as the carrier: a sim call whose turns come from /app/call/turn.

const crypto = require("crypto");
const store = require("./store");
const { istString } = require("./util");

const TTL = 6 * 3600;
const MAX_ASKS = 2;
const CLOSE = "बाकी बाद में पूछूँगी। धन्यवाद, नमस्ते!";
// Never on a call: a health goal is a plate rule the family sets in the app.
const NOT_ON_CALLS = new Set(["health_goals"]);

const gaps = () => require("./gaps");
const emit = (kind, f) => require("./events").emit(kind, f);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(id) {
  return id ? store.get(`callask:${id}`) : null;
}
async function save(s) {
  await store.set(`callask:${s.id}`, s, TTL);
  await store.set("callask:last", { id: s.id, member: s.member, purpose: s.purpose, carrier: s.carrier, done: s.done, answered: s.answered, started_ist: s.started_ist, ended_ist: s.ended_ist || null }, TTL);
  return s;
}

// Gnani speaks the line (mp3, so a phone can play it too). No audio when
// Gnani is down: the web shows the text, the phone falls back to Twilio's voice.
async function speak(text, base) {
  try {
    const t = await require("./gnani").textToSpeech({ text, language: "hi-IN", container: "mp3" }, base);
    return t && t.ok ? t.audio_url : null;
  } catch {
    return null;
  }
}

async function hear(audio_b64) {
  const bytes = Buffer.from(String(audio_b64 || ""), "base64");
  if (!bytes.length) return "";
  const s = await require("./gnani").speechToText({ audio_url: "web", language_code: "hi-IN" }, async () => ({ bytes, type: "audio/webm" }));
  return s && s.ok ? String(s.transcript || "").trim() : "";
}

async function members() {
  const att = require("./attendance");
  const ms = (await require("./profile").memberNames()) || (await att.members());
  return ms;
}

const ask = (g) => gaps().BY_ID[g.id].hi;

// ---- start

async function start({ member, purpose = "ask", carrier = "web", base }) {
  if (!["ask", "night"].includes(purpose)) return { ok: false, error: "purpose must be ask or night" };
  if (!["web", "phone"].includes(carrier)) return { ok: false, error: "carrier must be web or phone" };
  if (purpose === "night") return startNight({ member, carrier, base });
  const all = await members();
  const who = all.find((m) => m.toLowerCase() === String(member || "").toLowerCase());
  if (!who) return { ok: false, error: `member must be one of ${all.join(", ")}` };
  if (carrier === "phone" && !require("./call").configured()) return { ok: false, error: "Phone calls aren't set up (Twilio keys or the demo number missing). Use carrier web." };
  const list = (await gaps().missing({ member: who })).filter((g) => !NOT_ON_CALLS.has(g.id)).slice(0, MAX_ASKS);
  const s = { id: `ask-${crypto.randomBytes(5).toString("hex")}`, member: who, purpose, carrier, gaps: list, i: 0, tries: 0, transcript: [], answered: [], done: false, started_ist: istString() };
  const hello = `नमस्ते ${who} जी! मैं बारी बोल रही हूँ।`;
  let line;
  if (!list.length) {
    line = `${hello} अभी कुछ पूछना नहीं है। ${CLOSE}`;
    s.done = true;
    s.ended_ist = istString();
  } else line = `${hello} ${list.length === 1 ? "एक छोटी बात पूछनी है।" : "दो छोटी बातें पूछनी हैं।"} ${ask(list[0])}`;
  s.transcript.push({ who: "baari", text: line });
  s.first = { text: line, audio_url: carrier === "web" ? await speak(line, base) : null };
  await save(s);
  await emit("call", { who, member: who, rail: carrier === "phone" ? "twilio" : "web", status: "started", for: "ask", q: list.map((g) => g.id).join(","), summary: `Baari called ${who} to ask ${list.length} thing${list.length === 1 ? "" : "s"}` });
  if (carrier === "phone") {
    const d = await require("./call").dialAsk(base, s.id);
    if (!d.ok) return { ok: false, error: d.error || "Twilio refused the call", session: s.id };
    return { ok: true, session: s.id, carrier, sid: d.sid, line_text: line, done: s.done };
  }
  return { ok: true, session: s.id, carrier, line_text: line, audio_url: s.first.audio_url, done: s.done, asking: list.map((g) => g.id) };
}

// ---- one turn: what the person said, and Baari's next line

async function store_(s, g, value, heard, base) {
  const att = require("./attendance");
  if (g.id === "eating_tomorrow") {
    await gaps().markEatingSaid(g.date_for, s.member);
    await require("./profile").answer(s.member, "eating_tomorrow", value, "call", { personal: true });
    if (value === false) {
      const by = att.allowed(s.member, s.member) ? s.member : "app";
      const r = await att.setAway({ name: s.member, date_for: g.date_for, by, via: "call", said: heard });
      // A change after the shortlist wakes the night, like any away mark.
      if (r.ok && base) await att.react(r, base, s.member).catch(() => null);
    }
    return { value };
  }
  const r = await require("./profile").answer(s.member, g.id, value, "call");
  return { value: r.ok ? r.value : value, clamped: r.clamped || [] };
}

async function turn({ session, text, audio, base }) {
  if (String(session || "").startsWith("night:")) return turnNight({ session, text, audio, base });
  const s = await load(session);
  if (!s) return { ok: false, error: "no such call" };
  if (s.done) return { ok: true, line_text: CLOSE, audio_url: null, done: true, answered: s.answered };
  let heard = String(text || "").trim();
  if (!heard && audio) heard = await hear(audio);
  if (heard) s.transcript.push({ who: s.member, text: heard });
  const g = s.gaps[s.i];
  const r = gaps().parse(g.id, heard);
  let line;
  let moved = false;
  if (r.ok) {
    const kept = await store_(s, g, r.value, heard, base);
    let back = r.say_hi;
    if (kept.clamped && kept.clamped.length) back = `${r.value} रुपये से ज़्यादा नहीं हो सकता, ${kept.value} रुपये लिख लिए।`;
    s.answered.push(g.id);
    await emit("answer", { who: s.member, member: s.member, q: g.id, a: kept.value, via: "call", summary: `${s.member} answered ${g.id} on a call` });
    line = back;
    moved = true;
  } else if (s.tries < 1) {
    s.tries++;
    line = `माफ़ कीजिए, फिर से बताइए? ${ask(g)}`;
  } else {
    line = "कोई बात नहीं, बाद में देख लेंगे।";
    moved = true;
  }
  if (moved) {
    s.i++;
    s.tries = 0;
    if (s.i >= s.gaps.length) {
      line = `${line} ${CLOSE}`;
      s.done = true;
      s.ended_ist = istString();
    } else line = `${line} ${ask(s.gaps[s.i])}`;
  }
  s.transcript.push({ who: "baari", text: line });
  const audio_url = s.carrier === "web" ? await speak(line, base) : null;
  await save(s);
  if (s.done) await emit("call", { who: s.member, member: s.member, rail: s.carrier === "phone" ? "twilio" : "web", status: "completed", for: "ask", q: s.answered.join(","), lines: s.transcript.slice(-10).map((x) => ({ who: x.who === "baari" ? "baari" : "family", text: String(x.text).slice(0, 240) })), summary: `Call with ${s.member} done: ${s.answered.length} answered` });
  return { ok: true, line_text: line, audio_url, done: s.done, answered: s.answered, heard };
}

// ---- the phone carrier: TwiML for an ask session (lib/call.js routes here
// when the callback carries ?ask=<session>). h: call.js's helpers.

async function twilioStep(req, h) {
  const q = req.query || {};
  const params = h.parseForm(req.body);
  const s = await load(q.ask);
  if (!s) return h.twiml(`<Say language="hi-IN">Namaste.</Say><Hangup/>`);
  const n = Number(q.n || 0);
  const listen = (line) => `<Gather input="speech" language="hi-IN" speechTimeout="auto" timeout="8" actionOnEmptyResult="true" action="${h.url("/twilio/heard", { ask: s.id, n: n + 1 })}" method="POST">${line}</Gather><Redirect method="POST">${h.url("/twilio/heard", { ask: s.id, n: n + 1, silent: 1 })}</Redirect>`;
  if (req.path === "/twilio/voice") {
    const play = h.audio(await h.say(s.first.text));
    return h.twiml(s.done ? `${play}<Hangup/>` : listen(play));
  }
  if (req.path === "/twilio/heard") {
    let heard = String(params.SpeechResult || "").trim();
    // Twilio's own capture is the fallback; Gnani hears the recording when there is one.
    if (params.RecordingUrl && h.recording) {
      const a = await h.recording(params.RecordingUrl);
      if (a) {
        const r = await require("./gnani").speechToText({ audio_url: "twilio", language_code: "hi-IN" }, async () => a);
        if (r && r.ok && r.transcript) heard = String(r.transcript).trim();
      }
    }
    if (!heard && q.silent && n > 4) return h.twiml(`${h.audio(await h.say(CLOSE))}<Hangup/>`);
    const r = await turn({ session: s.id, text: heard });
    const play = h.audio(await h.say(r.line_text));
    return h.twiml(r.done ? `${play}<Pause length="1"/><Hangup/>` : listen(play));
  }
  return { status: 404, body: { ok: false } };
}

// ---- purpose "night" on the web: the phone call demo's night as a sim call.

async function startNight({ member, carrier, base }) {
  if (carrier === "phone") {
    if (!require("./call").configured()) return { ok: false, error: "Phone calls aren't set up. Use carrier web." };
    const r = await require("./wake").startDemo("pick", member || "app", base, { call: true });
    return { ok: !!r.ok, carrier, date_for: r.date_for, phone: true };
  }
  await store.del("call:active");
  const r = await require("./wake").startDemo("pick", member || "app", base, { call: true, sim: true });
  if (!r.ok) return { ok: false, error: "couldn't start the night" };
  let sid = null;
  for (let i = 0; i < 60 && !sid; i++) {
    sid = await store.get("call:active");
    if (!sid) await sleep(250);
  }
  if (!sid) return { ok: false, error: "the call didn't start" };
  const c = await require("./call").getCall(sid);
  const play = c && c.open && c.open.play;
  return { ok: true, session: `night:${sid}`, carrier, line_text: c ? c.open.text : "", audio_url: play && !String(play).startsWith("say:") ? play : null, done: false };
}

async function turnNight({ session, text, audio }) {
  const call = require("./call");
  const sid = session.slice("night:".length);
  let c = await call.getCall(sid);
  if (!c) return { ok: false, error: "no such call" };
  const url = (p) => (p && !String(p).startsWith("say:") ? p : null);
  // On hold while the agent locks and buys: the bill once it's paid.
  if (c.stage === "order") {
    const b = await call.billFacts();
    if (!call.billReady(b)) return { ok: true, line_text: "ऑर्डर लग रहा है, बस एक मिनट।", audio_url: null, done: false, hold: true, answered: [] };
    const r = await call.readBill(sid, b);
    return { ok: true, line_text: r.text, audio_url: url(r.play), done: false, answered: [] };
  }
  let heard = String(text || "").trim();
  if (!heard && audio) heard = await hear(audio);
  const n = Object.keys(c.replies || {}).length + 1;
  await call.respond(sid, n, heard);
  c = await call.getCall(sid);
  const r = (c.replies || {})[n] || { text: "", next: "listen" };
  return { ok: true, line_text: r.text, audio_url: url(r.play), done: r.next === "hangup", hold: r.next === "order", answered: [] };
}

async function state() {
  return (await store.get("callask:last")) || null;
}

module.exports = { start, turn, twilioStep, state, load, CLOSE, MAX_ASKS };
