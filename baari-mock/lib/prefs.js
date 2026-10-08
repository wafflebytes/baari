// The household's preferences, one record on rails (store key "prefs"):
//
//   voice   {owner, cook}   Gnani voice per audience: urmila, jwala, chitra, ambuja, nalini
//   lang    {owner, cook}   language per audience (owner en, hinglish, hi; cook hi, mr, bn, ta, kn, te)
//   cuisine {c, like, no, freq, who}   taste picks (lib/cuisine.js)
//   updated_at, updated_by ("app" | "telegram"), updated_who (a role)
//
// POST /app/prefs merges, validates and returns the full record; GET /app/state
// carries it as state.prefs. On Telegram: /awaaz (voices), /bhasha (languages),
// /swaad (taste, lib/cuisine.js). Every change is a "prefs" event.
//
// Who may change what: the owner (Vinay, the approver in ops.js) anything;
// Sunita only voice.cook and lang.cook; the rest of the family only cuisine.
// The app's writes come with the household key and may change anything.
//
// A voice note picks its voice by who hears it: the cook's brief and anything
// to Sunita take voice.cook, the family takes voice.owner. The TTS tools call
// voiceFor() when they get an audience ("cook" or "owner") and no voice.

const store = require("./store");
const { istString } = require("./util");

const VOICES = ["urmila", "jwala", "chitra", "ambuja", "nalini"];
const LANGS = { owner: ["en", "hinglish", "hi"], cook: ["hi", "mr", "bn", "ta", "kn", "te"] };
// Gnani's language codes.
const CODE = { en: "en-IN", hinglish: "hi-en", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN", ta: "ta-IN", kn: "kn-IN", te: "te-IN" };
const LANG_NAME = { en: "English", hinglish: "Hinglish", hi: "Hindi", mr: "Marathi", bn: "Bangla", ta: "Tamil", kn: "Kannada", te: "Telugu" };
const LANG_NATIVE = { hi: "हिंदी", mr: "मराठी", bn: "বাংলা", ta: "தமிழ்", kn: "ಕನ್ನಡ", te: "తెలుగు" };
const FREQS = ["1w", "2w", "wknd", "ask"];
const DEFAULTS = { voice: { owner: "chitra", cook: "urmila" }, lang: { owner: "en", cook: "hi" }, cuisine: { c: [], like: [], no: [], freq: "1w", who: [] } };
const FAMILY = ["Vinay", "Mummy", "Papa", "Behen"];
const COOK = "Sunita";

const cap = (v) => String(v || "").charAt(0).toUpperCase() + String(v || "").slice(1);
const copy = (x) => JSON.parse(JSON.stringify(x));

async function get() {
  const p = (await store.get("prefs")) || {};
  return {
    voice: { ...DEFAULTS.voice, ...(p.voice || {}) },
    lang: { ...DEFAULTS.lang, ...(p.lang || {}) },
    cuisine: { ...copy(DEFAULTS.cuisine), ...(p.cuisine || {}) },
    updated_at: p.updated_at || null,
    updated_by: p.updated_by || null,
    updated_who: p.updated_who || null,
  };
}

// What /app/state carries: the record plus the choices, so the app can draw them.
async function view() {
  return { ...(await get()), voices: VOICES, langs: LANGS };
}

// by: a role, "app", or nothing (the household key). owner: ops.approver().
function allowed(by, path, owner) {
  if (!by || by === "app") return true;
  if (by === COOK) return path === "voice.cook" || path === "lang.cook";
  if (path === "cuisine") return FAMILY.includes(by) || by === owner;
  return by === owner;
}

// patch: {voice?: {owner?, cook?}, lang?: {owner?, cook?}, cuisine?: {c?, like?, no?, freq?, who?}}
// A voice or language that isn't on the list falls back to the default, and
// the reply says so in fixed. Nothing is written when a path isn't allowed.
async function set(patch = {}, { by = null, via = "app" } = {}) {
  const owner = await require("./ops").approver();
  const paths = [];
  for (const k of ["voice", "lang"]) for (const aud of ["owner", "cook"]) if (patch[k] && patch[k][aud] !== undefined) paths.push(`${k}.${aud}`);
  if (patch.cuisine && typeof patch.cuisine === "object") paths.push("cuisine");
  if (!paths.length) return { ok: false, error: "send voice, lang or cuisine" };
  const refused = paths.filter((p) => !allowed(by, p, owner));
  if (refused.length) return { ok: false, error: "NOT_ALLOWED", why: by === COOK ? `${COOK} can change only her own voice and language` : `Only ${owner} can change ${refused.join(", ")}` };

  const cur = await get();
  const next = copy(cur);
  const changed = [], fixed = [];
  for (const k of ["voice", "lang"]) {
    for (const aud of ["owner", "cook"]) {
      if (!patch[k] || patch[k][aud] === undefined) continue;
      let v = String(patch[k][aud] || "").toLowerCase().trim();
      const ok = k === "voice" ? VOICES : LANGS[aud];
      if (!ok.includes(v)) {
        fixed.push(`${k}.${aud}: "${patch[k][aud]}" isn't one of ${ok.join(", ")}, so it's ${DEFAULTS[k][aud]}`);
        v = DEFAULTS[k][aud];
      }
      if (v !== cur[k][aud]) { next[k][aud] = v; changed.push(`${k}.${aud}`); }
    }
  }
  if (patch.cuisine && typeof patch.cuisine === "object") {
    const c = patch.cuisine;
    const ids = new Set(require("./cuisine").CATALOG.map((d) => d.id).concat(Object.values(require("./household").DISHES).map((d) => d.id)));
    const keys = require("./cuisine").KEYS;
    const list = (v, okSet, name) => {
      const arr = Array.isArray(v) ? v : String(v || "").split(",");
      const clean = [...new Set(arr.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
      const bad = clean.filter((x) => !okSet.has(x));
      if (bad.length) fixed.push(`cuisine.${name}: dropped ${bad.join(", ")}`);
      return clean.filter((x) => okSet.has(x));
    };
    if (c.c !== undefined) next.cuisine.c = list(c.c, new Set(keys), "c");
    if (c.like !== undefined) next.cuisine.like = list(c.like, ids, "like");
    if (c.no !== undefined) next.cuisine.no = list(c.no, ids, "no");
    // A dish is liked or not, never both: the list sent last wins.
    if (c.like !== undefined) next.cuisine.no = next.cuisine.no.filter((x) => !next.cuisine.like.includes(x));
    else if (c.no !== undefined) next.cuisine.like = next.cuisine.like.filter((x) => !next.cuisine.no.includes(x));
    if (c.freq !== undefined) {
      const f = String(c.freq).toLowerCase();
      if (!FREQS.includes(f)) fixed.push(`cuisine.freq: "${c.freq}" isn't one of ${FREQS.join(", ")}, so it's 1w`);
      next.cuisine.freq = FREQS.includes(f) ? f : "1w";
    }
    if (c.who !== undefined) {
      const ms = await require("./attendance").members();
      next.cuisine.who = list(c.who === null ? [] : c.who, new Set(ms.map((m) => m.toLowerCase())), "who").map((x) => ms.find((m) => m.toLowerCase() === x));
      // Everyone named is the same as nobody named: everyone.
      if (next.cuisine.who.length === ms.length) next.cuisine.who = [];
    }
    for (const k of ["c", "like", "no", "freq", "who"]) if (JSON.stringify(next.cuisine[k]) !== JSON.stringify(cur.cuisine[k])) changed.push(`cuisine.${k}`);
  }
  if (changed.length) {
    next.updated_at = istString();
    next.updated_by = via;
    next.updated_who = by && by !== "app" ? by : null;
    await store.set("prefs", { voice: next.voice, lang: next.lang, cuisine: next.cuisine, updated_at: next.updated_at, updated_by: next.updated_by, updated_who: next.updated_who });
    await require("./events").emit("prefs", { who: by && by !== "app" ? by : null, via, changed, summary: summary(by, changed, cur, next, via) });
  }
  return { ok: true, prefs: { ...next, voices: VOICES, langs: LANGS }, changed, fixed };
}

function summary(by, changed, cur, next, via) {
  const w = by && by !== "app" ? by : via === "app" ? "The app" : "Someone";
  const whose = (aud) => (aud === "cook" ? `${COOK}'s` : "the family's");
  const parts = changed.map((p) => {
    const [k, sub] = p.split(".");
    if (k === "voice") return `set ${whose(sub)} voice to ${cap(next.voice[sub])}`;
    if (k === "lang") return `set ${whose(sub)} language to ${LANG_NAME[next.lang[sub]]}`;
    if (sub === "like") {
      const added = next.cuisine.like.filter((x) => !cur.cuisine.like.includes(x)).map((id) => (require("./household").byId(id) || {}).name).filter(Boolean);
      return added.length ? `liked ${added.join(", ")}` : null;
    }
    if (sub === "no") {
      const added = next.cuisine.no.filter((x) => !cur.cuisine.no.includes(x)).map((id) => (require("./household").byId(id) || {}).name).filter(Boolean);
      return added.length ? `said no to ${added.join(", ")}` : null;
    }
    if (sub === "freq") return `wants liked dishes ${({ "1w": "once a week", "2w": "twice a week", wknd: "on weekends", ask: "only when asked" })[next.cuisine.freq]}`;
    if (sub === "c") return "picked cuisines";
    if (sub === "who") return next.cuisine.who.length ? `set liked dishes for ${next.cuisine.who.join(" and ")}` : "set liked dishes for everyone";
    return null;
  }).filter(Boolean);
  if (!parts.length) parts.push("changed the dish picks");
  return `${w} ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}`;
}

// ---- voice by audience

const AUD = { cook: "cook", sunita: "cook", owner: "owner", family: "owner" };
// A named voice wins. "cook" or "owner" as the voice, or no voice and an
// audience, means: look it up in prefs.
function audienceOf(voice, audience) {
  const v = String(voice || "").toLowerCase().trim();
  if (AUD[v]) return AUD[v];
  if (v) return null;
  return AUD[String(audience || "").toLowerCase().trim()] || null;
}
async function voiceFor(aud) {
  return cap((await get()).voice[aud === "cook" ? "cook" : "owner"]);
}
async function langFor(aud) {
  return CODE[(await get()).lang[aud === "cook" ? "cook" : "owner"]];
}

// ---- /awaaz and /bhasha on Telegram

// A short sample per language, for the voice notes /awaaz and /bhasha send.
const SAMPLE = {
  en: "Hi, I'm Baari. Tomorrow it's rajma chawal or kadhi chawal. Tap the one you want.",
  hinglish: "Hi, main Baari hoon. Kal rajma chawal banega ya kadhi chawal? Jo chahiye, tap karo.",
  hi: "नमस्ते, मैं बारी हूँ। कल चार लोगों के लिए राजमा चावल बनाना है।",
  mr: "नमस्कार, मी बारी. उद्या चार जणांसाठी राजमा भात करायचा आहे.",
  bn: "নমস্কার, আমি বারী। কাল চারজনের জন্য রাজমা ভাত রান্না করতে হবে।",
  ta: "வணக்கம், நான் பாரி. நாளை நான்கு பேருக்கு ராஜ்மா சாதம் செய்ய வேண்டும்.",
  kn: "ನಮಸ್ಕಾರ, ನಾನು ಬಾರಿ. ನಾಳೆ ನಾಲ್ಕು ಜನರಿಗೆ ರಾಜ್ಮಾ ಅನ್ನ ಮಾಡಬೇಕು.",
  te: "నమస్కారం, నేను బారి. రేపు నలుగురికి రాజ్మా అన్నం చేయాలి.",
};

const ttsId = (url) => (/\/media\/tts\/([0-9a-f]+)\./.exec(String(url || "")) || [])[1];
const loadTts = async (url) => {
  const a = await require("./gnani").ttsBytes(ttsId(url));
  if (!a) throw new Error("sample expired");
  return a;
};

// Send a voice's sample in a language as a real voice note. Gnani renders it
// once (OGG); after the first send Telegram's file_id is reused, kept in the
// store under awaaz:fid:<voice>:<lang>.
async function sample(tg, chat_id, voice, lang, base) {
  const key = `awaaz:fid:${voice}:${lang}`;
  const c = (await store.get(key)) || {};
  const sim = String(chat_id).startsWith("sim-");
  if (c.file_id && !sim) {
    const r = await tg.call("sendVoice", { chat_id, voice: c.file_id, caption: cap(voice) });
    if (r && r.ok) return { ok: true, cached: true };
  }
  let url = c.audio_url;
  if (!url || !(await loadTts(url).catch(() => null))) {
    const t = await require("./gnani").textToSpeech({ text: SAMPLE[lang], language: CODE[lang], voice: cap(voice) }, base);
    if (!t.ok) return { ok: false, error: "Gnani didn't render the sample" };
    url = t.audio_url;
  }
  const r = await tg.sendVoice({ chat_id, audio_url: url, caption: cap(voice) }, loadTts);
  await store.set(key, { audio_url: url, file_id: (r && r.file_id) || c.file_id || null, at_ist: istString() });
  return { ok: !!(r && r.ok), cached: false, file_id: (r && r.file_id) || null };
}

// One picker for both commands. kind "voice" (/awaaz) or "lang" (/bhasha).
// Button data: <cmd>:aud:<aud>, <cmd>:try:<aud>:<value>, <cmd>:keep:<aud>:<value>.
const CMD = { voice: "awaaz", lang: "bhasha" };
function options(kind, aud) {
  return kind === "voice" ? VOICES : LANGS[aud];
}
function label(kind, v, forCook) {
  if (kind === "voice") return cap(v);
  return forCook && LANG_NATIVE[v] ? LANG_NATIVE[v] : LANG_NAME[v];
}

function card(kind, p, aud, trying, isCook) {
  const cmd = CMD[kind];
  const cur = p[kind][aud];
  let text;
  if (isCook) {
    text = kind === "voice"
      ? `Baari ki awaaz chuniye. Naam dabaiye, namuna sun lijiye.\nAbhi: ${cap(cur)}.`
      : `Baari aapse kis bhasha mein baat kare? Dabaiye, namuna sun lijiye.\nAbhi: ${LANG_NATIVE[cur] || LANG_NAME[cur]}.`;
    if (trying) text += `\nSun rahi hain: ${label(kind, trying, true)}.`;
  } else {
    const what = kind === "voice" ? "Baari's voice" : "Baari's language for voice notes";
    const say = (a) => label(kind, p[kind][a], false);
    text = `${what}. Tap one to hear a sample.\nYours: ${say("owner")}. Sunita's: ${say("cook")}.\nChoosing ${aud === "cook" ? "for Sunita" : "for you"}.`;
    if (trying) text += `\nPlaying: ${label(kind, trying, false)}.`;
  }
  const rows = [];
  if (!isCook) rows.push([{ text: `${aud === "owner" ? "● " : ""}For me`, data: `${cmd}:aud:owner` }, { text: `${aud === "cook" ? "● " : ""}For Sunita`, data: `${cmd}:aud:cook` }]);
  const opts = options(kind, aud).map((v) => ({ text: `${v === cur ? "✓ " : v === trying ? "▶ " : ""}${label(kind, v, isCook)}`, data: `${cmd}:try:${aud}:${v}` }));
  for (let i = 0; i < opts.length; i += 3) rows.push(opts.slice(i, i + 3));
  if (trying && trying !== cur) rows.push([{ text: isCook ? `Yahi rakho: ${label(kind, trying, true)}` : `Keep ${label(kind, trying, false)}`, data: `${cmd}:keep:${aud}:${trying}` }]);
  return { text, buttons: rows };
}

async function picker(kind, n, base, tg) {
  const cmd = CMD[kind];
  const owner = await require("./ops").approver();
  const isCook = n.role === COOK;
  const chat = n.chat_id;
  if (!isCook && n.role !== owner) {
    const what = kind === "voice" ? "Baari's voice" : "Baari's language";
    await tg.sendMessage({ chat_id: chat, text: `Sorry, only ${owner} can change ${what}. Ask ${owner} to send /${cmd}.` });
    return true;
  }
  const edit = require("./cuisine").edit;
  const b = n.kind === "button" ? String(n.button_data || "") : "";
  const m = new RegExp(`^${cmd}:(aud|try|keep):(owner|cook)(?::([\\w-]+))?$`).exec(b);
  if (!m) {
    const c = card(kind, await get(), isCook ? "cook" : "owner", null, isCook);
    await tg.sendMessage({ chat_id: chat, text: c.text, buttons: c.buttons });
    return true;
  }
  const [, act, aud, val] = m;
  // Sunita's buttons only ever say cook; a forged owner tap gets the no.
  if (isCook && aud !== "cook") {
    await tg.sendMessage({ chat_id: chat, text: "Maaf kijiye, ye sirf Vinay badal sakte hain." });
    return true;
  }
  if (act === "aud") {
    const c = card(kind, await get(), aud, null, isCook);
    await edit(tg, chat, n.reply_to_message_id, c.text, c.buttons);
    return true;
  }
  if (!options(kind, aud).includes(val)) return true;
  if (act === "try") {
    const p = await get();
    const c = card(kind, p, aud, val, isCook);
    await edit(tg, chat, n.reply_to_message_id, c.text, c.buttons);
    const voice = kind === "voice" ? val : p.voice[aud];
    const lang = kind === "lang" ? val : p.lang[aud];
    const s = await sample(tg, chat, voice, lang, base).catch((e) => ({ ok: false, error: e.message }));
    if (!s.ok) await tg.sendMessage({ chat_id: chat, text: isCook ? "Namuna abhi nahi chal paya. Thodi der mein phir dabaiye." : "The sample didn't play this time. Tap it again in a minute." });
    return true;
  }
  // keep
  const r = await set({ [kind]: { [aud]: val } }, { by: n.role, via: "telegram" });
  if (!r.ok) {
    await tg.sendMessage({ chat_id: chat, text: isCook ? "Maaf kijiye, ye sirf Vinay badal sakte hain." : `Sorry, that didn't save: ${r.why || r.error}.` });
    return true;
  }
  const name = label(kind, val, isCook);
  const text = isCook
    ? kind === "voice" ? `Theek hai. Ab Baari ${name} ki awaaz mein bolegi.` : `Theek hai. Ab Baari aapse ${name} mein baat karegi.`
    : `Saved. ${aud === "cook" ? "Sunita's" : "Your"} voice notes now ${kind === "voice" ? `use ${name}` : `come in ${name}`}.`;
  await edit(tg, chat, n.reply_to_message_id, text, null);
  return true;
}

// The Telegram block in telegram.js calls this for every update with a role.
// True when the update was a prefs command or button (kept, not sent to Baari).
async function onTelegram(n, base, tg) {
  if (!n || !n.role || n.kind === "cast") return false;
  const t = n.kind === "text" ? String(n.text || "").trim() : "";
  const b = n.kind === "button" ? String(n.button_data || "") : "";
  if (/^\/swaad\b/i.test(t) || /^swaad:/.test(b)) return require("./cuisine").swaad(n, base, tg);
  if (/^\/awaaz\b/i.test(t) || /^awaaz:/.test(b)) return picker("voice", n, base, tg);
  if (/^\/bhasha\b/i.test(t) || /^bhasha:/.test(b)) return picker("lang", n, base, tg);
  // A plain message naming a liked dish asks for it on the next shortlist.
  if (t && !t.startsWith("/") && FAMILY.includes(n.role)) await require("./cuisine").noteAsk(n).catch(() => null);
  return false;
}

module.exports = { get, view, set, allowed, audienceOf, voiceFor, langFor, onTelegram, sample, VOICES, LANGS, CODE, DEFAULTS };
