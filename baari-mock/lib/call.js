// The phone call demo. Baari rings the demo phone on the table, talks the
// family through tomorrow's dinner, and stays on the line until it's done:
//
//   open     Baari says what's run out and offers two dishes. The family
//            talks it over on speaker; Baari stays quiet until they settle.
//   plan     Baari reads out what the dish needs, what's at home, and what
//            comes from Delhivery and Sharma Kirana. "Theek hai?"
//   order    On a yes, the real Baari agent locks the dish and buys (LOCK,
//            BUY: Sharma Kirana, Delhivery, Pine Labs) while the family holds.
//   bill     Baari reads the bill from what was actually ordered and paid,
//            and asks if it's okay.
//   bye      On a yes (or when they're done talking), a goodbye, then hang up.
//
// Twilio only carries the call. Gnani speaks every line (TTS, mp3) and
// transcribes every reply (STT on Twilio's recording), so voice stays on
// Gnani. A small LLM on rails writes each spoken line from facts rails gives
// it (pantry, recipes, the bill) and says what the family did (chose a dish,
// yes, no, a question). It never orders or pays: the Baari agent does.
//
// Each reply: Twilio posts the recording to /twilio/heard; rails answers at
// once with a short "ji" and a redirect to /twilio/next, and works on the
// reply meanwhile (STT, LLM, TTS). /twilio/next plays it when it's ready.
//
// Stored as "call:<sid>" for the call and "call:active" for the one call
// running now. A sim call (no Twilio keys, or sim: true) runs the same steps
// without a phone; the test harness posts what the family "said".

const crypto = require("crypto");
const store = require("./store");
const ops = require("./ops");
const turn = require("./turn");
const household = require("./household");
const gnani = require("./gnani");
const { istString, istDate } = require("./util");

// Either the account SID and auth token, or an API key (TWILIO_SID "SK…"
// with TWILIO_CLIENT_SECRET) plus the account SID. Only the auth token can
// check Twilio's webhook signature; without it the hook key below guards
// the callbacks.
const RAW_SID = process.env.TWILIO_SID || "";
const SID = process.env.TWILIO_ACCOUNT_SID || (/^AC/.test(RAW_SID) ? RAW_SID : null);
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_USER = process.env.TWILIO_API_KEY || (/^SK/.test(RAW_SID) ? RAW_SID : SID);
const API_PASS = process.env.TWILIO_API_SECRET || process.env.TWILIO_CLIENT_SECRET || TOKEN;
const BASIC = () => `Basic ${Buffer.from(`${API_USER}:${API_PASS}`).toString("base64")}`;
const FROM = process.env.TWILIO_FROM;
const DEMO_TO = process.env.DEMO_CALL_TO;
const MODEL = process.env.CALL_MODEL || "openai/gpt-4o";
// LOCK plus BUY took about 2.5 minutes on 8 Oct; give it four.
const HOLD_MAX_MS = 240 * 1000;
const TTL = 6 * 3600;

const wake = () => require("./wake");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const configured = () => !!(SID && API_USER && API_PASS && FROM && DEMO_TO);

// Hindi names for what Gnani reads out.
const HI_ITEM = { rice: "चावल", atta: "आटा", rajma: "राजमा", "chana dal": "चना दाल", besan: "बेसन", tomato: "टमाटर", onion: "प्याज़", "ginger-garlic": "अदरक-लहसुन", potato: "आलू", oil: "तेल", paneer: "पनीर", palak: "पालक", lauki: "लौकी", curd: "दही", egg: "अंडे" };
const HI_DISH = { "Rajma chawal": "राजमा चावल", "Aloo puri": "आलू पूरी", "Lauki chana dal": "लौकी चना दाल", "Palak paneer roti": "पालक पनीर रोटी", "Egg bhurji paratha": "अंडा भुर्जी पराठा", "Kadhi chawal": "कढ़ी चावल" };

const FILLERS = ["जी।", "अच्छा।", "हम्म।"];
const HOLD = ["ऑर्डर लग रहा है, बस एक मिनट।", "शर्मा किराना और डिलीवरी, दोनों का ऑर्डर हो रहा है।", "पेमेंट हो रही है, बस थोड़ा सा और।", "लगभग हो गया।"];

// ---- state

async function get(sid) {
  return (await store.get(`call:${sid}`)) || null;
}

async function save(c) {
  await store.set(`call:${c.sid}`, c, TTL);
  return c;
}

// Gnani speaks a line; the clip URL is cached by its text, so fixed lines
// (fillers, hold lines) are made once. Gnani rate-limits bursts: one request
// at a time, and a 429 waits and tries again. If Gnani is down, the line
// comes back as "say:<text>" and Twilio speaks it instead (see audio()).
async function say(text) {
  const key = `calltts:${crypto.createHash("sha1").update(text).digest("hex").slice(0, 20)}`;
  const hit = await store.get(key);
  if (hit) return hit;
  for (let i = 0; i < 4; i++) {
    const t = await gnani.textToSpeech({ text, language: "hi-IN", container: "mp3" }, base_());
    if (t.ok) {
      await store.set(key, t.audio_url, 3 * 86400);
      return t.audio_url;
    }
    if (t.http_status !== 429) {
      await ops.log({ at_ist: istString(), kind: "call", note: `Gnani TTS failed, Twilio speaks instead: ${JSON.stringify(t.error || t).slice(0, 160)}` });
      return `say:${text}`;
    }
    await sleep(800 * (i + 1));
  }
  return `say:${text}`;
}

// A clip from say(): Gnani's mp3, or Twilio's own Hindi voice as the fallback.
function audio(clip) {
  if (!clip) return "";
  if (String(clip).startsWith("say:")) return `<Say language="hi-IN" voice="Polly.Aditi">${esc(clip.slice(4))}</Say>`;
  return `<Play>${esc(clip)}</Play>`;
}

async function sayAll(texts) {
  const out = [];
  for (const t of texts) out.push(await say(t));
  return out;
}

let BASE = null;
const base_ = () => BASE || process.env.PUBLIC_BASE_URL || "https://baari-rails.vercel.app";

// ---- facts the LLM speaks from

function weekdayOf(date_for) {
  return new Date(`${date_for}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });
}

async function kitchenFacts(date_for) {
  const k = await household.kitchen();
  const qty = (n) => {
    const v = k.pantry[n];
    return v && typeof v === "object" ? Number(v.qty) || 0 : Number(v) || 0;
  };
  const have = Object.keys(k.pantry).filter((n) => qty(n) > 0);
  const out = Object.keys(k.pantry).filter((n) => qty(n) <= 0);
  const dishes = household.NAMES.map((name) => {
    const d = household.DISHES[name];
    const missing = Object.entries(d.recipe)
      .filter(([item, need]) => qty(item) < need)
      .map(([item, need]) => ({ item, need: need - qty(item), unit: item === "egg" ? "" : item === "oil" ? "ml" : "g", from: household.KIRANA_STOCK.includes(item) ? "Sharma Kirana" : "Delhivery" }));
    const atHome = Object.keys(d.recipe).filter((item) => qty(item) >= d.recipe[item]);
    const last = (k.dishes[name] || {}).last_cooked || null;
    return { name, hindi: HI_DISH[name], allowed: !household.ruleBreak(name, date_for), why_not: household.ruleBreak(name, date_for), last_cooked: last, missing, at_home: atHome };
  });
  return { have, out, dishes };
}

// What was actually ordered and paid, for the bill.
async function billFacts() {
  const h = (await store.get("handoff:last")) || {};
  const pl = require("./pinelabs");
  const paid = async (ref) => {
    const p = await pl.byReference(ref);
    return p && p.status === "SUCCESS" && !p.refunded ? { rs: (p.amount_paise || 0) / 100, utr: p.utr || null } : null;
  };
  const o = await require("./kirana").lastOrder();
  const kir = o && o.order_ref && h.date_for && o.order_ref.includes(h.date_for) ? o : null;
  const kp = h.date_for ? await paid(`BAARI-${h.date_for}-kirana`) : null;
  const sp = h.date_for ? await paid(`BAARI-${h.date_for}-staples`) : null;
  const parcelItems = (h.missing || []).filter((m) => m && m.route && !/kirana/i.test(m.route)).map((m) => m.item);
  return {
    phase_done: String(h.phase_done || "").toUpperCase(),
    dish: h.locked && h.locked.winner,
    kirana: kir ? { order: kir.order_id, names: (kir.lines || []).map((l) => l.item).filter(Boolean), items: (kir.lines || []).map((l) => `${l.item} ${l.qty || ""}${l.unit || ""}`.trim()), rs: kp ? kp.rs : null, paid: !!kp, status: kir.status } : null,
    parcel: h.shipment && h.shipment.waybill ? { items: parcelItems, rs: sp ? sp.rs : null, paid: !!sp } : null,
    total_rs: Math.round(((kp && kp.rs) || 0) + ((sp && sp.rs) || 0)),
    paid_from: "Pine Labs Reserve Pay, the family's UPI block, inside the Rs 400 daily cap",
  };
}

// Has the agent finished buying? Both the kirana order and any parcel paid.
function billReady(b) {
  if (!["BUY", "CHECK", "BRIEF", "COOK_REPLY"].includes(b.phase_done)) return false;
  if (b.kirana && !b.kirana.paid) return false;
  if (b.parcel && !b.parcel.paid) return false;
  return !!(b.kirana || b.parcel);
}

// ---- the LLM that writes each line

const SYSTEM = `You are Baari, the Sharma family's kitchen agent (Rohini, Delhi), on a phone call. The family is on speakerphone and may talk among themselves before answering you.
You are a woman: speak of yourself in the feminine (बोल रही हूँ, भेज दूँगी, कर दूँगी), never the masculine. You speak Hindi in Devanagari script, warm and brief, like a trusted household manager. Every "say" is read aloud by a Hindi TTS voice: plain sentences, numbers as Hindi words ("ढाई सौ ग्राम", "एक सौ बारह रुपये"), dish and item names in Hindi, no English abbreviations, no emojis, no lists, no symbols. Keep it to one or two short sentences, except when STAGE asks you to read out a plan or a bill.
Reply with JSON only: {"say": "...", "intent": "none|chose_dish|confirm|reject|question|end_call", "dish": ""}
intent is what the FAMILY just did: chose_dish (they settled on a dish; put its exact English name from FACTS in "dish"), confirm (a yes to what you asked), reject (a no or a change), question (they asked you something), end_call (they want to finish or hang up), none (still talking among themselves, or nothing clear).
Never break these: only the six dishes in FACTS; a dish with allowed false can't be made (say why kindly, without naming any illness: "पापा की थाली में आलू और मीठा नहीं"); dinner is for four; never invent prices, orders or items that aren't in FACTS.`;

function keys() {
  return String(process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function llm(user, budgetMs = 9000) {
  const key = keys()[0];
  if (!key) return { ok: false, error: "no LLM key" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), budgetMs);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, temperature: 0.3, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
    });
    const j = await res.json();
    const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!content) return { ok: false, error: JSON.stringify(j).slice(0, 200) };
    const m = String(content).match(/\{[\s\S]*\}/);
    const out = JSON.parse(m ? m[0] : content);
    return { ok: true, say: String(out.say || "").trim(), intent: String(out.intent || "none"), dish: household.dishName(out.dish) || null, options: out.options };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

const recent = (c) => c.transcript.slice(-8).map((t) => `${t.who === "baari" ? "Baari" : "Family"}: ${t.text}`).join("\n") || "(nothing yet)";

const STAGE = {
  open: (c, f) => `STAGE: open. The call just connected. Pick two dishes for tomorrow (${c.date_for}, a ${weekdayOf(c.date_for)}): allowed true, fewest missing items, preferably not cooked in the last three days. Say, in at most four short sentences: namaste, you're Baari calling from the Sharma kitchen about tomorrow's dinner; what has run out (name three or four items from FACTS.out); the two options; ask them to talk it over and tell you. Add "options": ["<English name 1>", "<English name 2>"] to the JSON. intent none.`,
  discuss: (c) => `STAGE: discuss. You offered ${c.options.join(" and ")}. The family is talking it over. If they have clearly settled on one dish of the six (allowed), intent chose_dish with its English name and say "" (rails reads out the plan). If they are still discussing or thinking aloud, intent none and say "": stay quiet, don't interrupt. If they asked YOU something (addressed to Baari, or about stock, delivery or money), answer in one short line (intent question). Questions they ask each other ("kya banaye?") and opinions ("rajma bahut din se nahi bana") are not for you: stay quiet. If they want a dish that isn't allowed, explain kindly in one line and repeat the two options.`,
  plan: (c) => `STAGE: plan. You read out the plan for ${c.dish} and asked if it's okay. They want another allowed dish instead: intent chose_dish with it and say "". A question: answer it in one short line from FACTS (intent question); rails asks "ये प्लान ठीक है?" after it. A no without a new dish: intent reject and ask in one line what they'd like to change.`,
  bill: (c, f, b) => `STAGE: bill. You read the bill and asked if it's okay. A question: answer it in one short line from BILL only (intent question); rails asks again after it. A no or a complaint: intent reject and say "". They want to finish: intent end_call with a short goodbye.\nBILL: ${JSON.stringify(b)}`,
  wrap: () => `STAGE: wrap. The bill is settled and you asked if there's anything else. If they have something, answer briefly and ask again (intent question). If not, or they say bye: intent end_call with a short warm goodbye.`,
};

async function brain(c, heard) {
  const f = await kitchenFacts(c.date_for);
  const b = c.stage === "bill" ? await billFacts() : null;
  const user = `${STAGE[c.stage](c, f, b)}\nFACTS: ${JSON.stringify(f)}\nCONVERSATION SO FAR:\n${recent(c)}\n${heard !== undefined ? `THE FAMILY JUST SAID: ${heard || "(silence)"}` : ""}`;
  return llm(user);
}

// ---- Twilio

function twiml(body) {
  return { status: 200, headers: { "Content-Type": "text/xml" }, body: `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>` };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (path, q = {}) => {
  const qs = new URLSearchParams({ ...q, k: hookKey() }).toString();
  return esc(`${base_()}${path}?${qs}`);
};
// Our own key on every callback URL, checked on the way in (Twilio's
// signature is checked too when the auth token is set).
const hookKey = () => crypto.createHash("sha256").update(`baari-call:${API_PASS || process.env.ADMIN_KEY || "sim"}`).digest("hex").slice(0, 24);

// Baari's line plays inside the Gather, so the family can cut in at any point.
// Twilio's speech capture hears them out (it waits for a natural pause) and
// posts the words as SpeechResult; 8 quiet seconds after the line counts as
// silence.
function listen(c, turnNo, line = "") {
  return `<Gather input="speech" language="hi-IN" speechTimeout="auto" timeout="8" actionOnEmptyResult="true" action="${url("/twilio/heard", { sid: c.sid, n: turnNo })}" method="POST">${line}</Gather><Redirect method="POST">${url("/twilio/silence", { sid: c.sid, n: turnNo })}</Redirect>`;
}

function validSignature(req, params) {
  if (!TOKEN) return true;
  const sig = req.headers["x-twilio-signature"];
  if (!sig) return false;
  const full = `${base_()}${req.url || req.path}`;
  const data = full + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const want = crypto.createHmac("sha1", TOKEN).update(data).digest("base64");
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

async function twilioApi(path, form) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}${path}`, {
    method: "POST",
    headers: { Authorization: BASIC(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// The From of the account's recent calls to the demo phone, other than the
// number that was just refused.
async function trialFrom(refused) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json?PageSize=20&To=${encodeURIComponent(DEMO_TO)}`, { headers: { Authorization: BASIC() } });
  const calls = res.ok ? (await res.json()).calls || [] : [];
  const hit = calls.find((x) => x.from && x.from !== refused && x.status !== "failed");
  return hit ? hit.from : null;
}

// Twilio's recording, once it's ready (it can lag the callback a little).
async function recording(recUrl) {
  if (!recUrl) return null;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${recUrl}.wav`, { headers: { Authorization: BASIC() } });
    if (res.ok) return { bytes: Buffer.from(await res.arrayBuffer()), type: "audio/wav" };
    await sleep(500);
  }
  return null;
}

// ---- starting a call

// Called by wake.startDemo (opts.call): the night is set up, the holder
// knows the phone will ring. Writes the opening line first so the call
// starts talking the moment it's answered.
async function dial(base, { date_for, sim = false } = {}) {
  BASE = base;
  const c = { sid: null, sim: sim || !configured(), date_for, stage: "open", options: [], dish: null, runner_up: null, transcript: [], replies: {}, silences: 0, started_ms: Date.now(), events: [] };
  const o = await brain(c);
  const f = await kitchenFacts(date_for);
  const allowed = f.dishes.filter((d) => d.allowed);
  let opts = (Array.isArray(o.options) ? o.options : []).map((x) => household.dishName(x)).filter((x) => x && allowed.some((d) => d.name === x));
  if (opts.length < 2) opts = allowed.sort((a, b) => a.missing.length - b.missing.length).map((d) => d.name).filter((n) => !opts.includes(n)).slice(0, 2 - opts.length).concat(opts).slice(0, 2);
  c.options = opts;
  const opener = o.ok && o.say ? o.say : `नमस्ते! मैं बारी बोल रही हूँ, शर्मा परिवार की रसोई से। कल के खाने के लिए फ़ोन किया है। दो ऑप्शन हैं: ${HI_DISH[opts[0]]} या ${HI_DISH[opts[1]]}। आप सब आपस में बात करके बताइए।`;
  const [openUrl, ...fill] = await sayAll([opener, ...FILLERS]);
  c.open = { text: opener, play: openUrl };
  c.fillers = fill;
  c.transcript.push({ who: "baari", text: opener });
  c.stage = "discuss";
  if (c.sim) {
    c.sid = `SIM-${crypto.randomBytes(5).toString("hex")}`;
  } else {
    // Trial accounts refuse the status callback options, so only the basics;
    // the call is marked over when Baari hangs up.
    const form = { To: DEMO_TO, From: (await store.get("call:from")) || FROM, Url: `${base}/twilio/voice?k=${hookKey()}` };
    let r = await twilioApi("/Calls.json", form);
    // 573003: a new trial account calls its verified number only from the
    // trial number Twilio paired with it. That number made the account's last
    // calls, so take it from there, try again, and remember it.
    if (r.body && r.body.code === 573003) {
      const paired = await trialFrom(form.From);
      if (paired) {
        r = await twilioApi("/Calls.json", { ...form, From: paired });
        if (r.status < 300) await store.set("call:from", paired);
      }
    }
    if (r.status >= 300) {
      await ops.log({ at_ist: istString(), kind: "call", note: `Twilio refused the call: ${JSON.stringify(r.body).slice(0, 200)}` });
      // No call, no night: end the demo so nothing waits on it.
      await wake().stopDemo(base);
      return { ok: false, error: r.body };
    }
    c.sid = r.body.sid;
  }
  await save(c);
  await store.set("call:active", c.sid, TTL);
  // The hold lines, ready before anyone says yes.
  wake().later(sayAll(HOLD).catch(() => {}));
  await ops.log({ at_ist: istString(), kind: "call", note: `${c.sim ? "sim call" : `calling ${DEMO_TO.slice(0, 4)}…${DEMO_TO.slice(-2)}`} for ${date_for}: ${opts.join(" or ")}` });
  return { ok: true, sid: c.sid, sim: c.sim, options: opts, opener };
}

// ---- what rails says word for word: the plan, the order, the bill, goodbye

const T = ["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर", "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उन्यासी", "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी", "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे"];

function num(n) {
  n = Math.round(Number(n) || 0);
  if (n <= 0) return "शून्य";
  if (n < 100) return T[n];
  if (n < 1000) return `${T[Math.floor(n / 100)]} सौ${n % 100 ? ` ${T[n % 100]}` : ""}`;
  return `${num(Math.floor(n / 1000))} हज़ार${n % 1000 ? ` ${num(n % 1000)}` : ""}`;
}

function amount(item, n, unit) {
  if (item === "egg" || !unit) return `${num(n)}`;
  if (unit === "ml") return `${num(n)} मिलीलीटर`;
  if (n === 250) return "ढाई सौ ग्राम";
  if (n === 150) return "डेढ़ सौ ग्राम";
  if (n === 500) return "आधा किलो";
  if (n === 1500) return "डेढ़ किलो";
  if (n >= 1000 && n % 1000 === 0) return `${num(n / 1000)} किलो`;
  return `${num(n)} ग्राम`;
}

const and = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} और ${xs[xs.length - 1]}`);
const hi = (item) => HI_ITEM[item] || item;

// "बढ़िया, राजमा चावल तय रहा। इसके लिए राजमा ढाई सौ ग्राम और चावल चार सौ
// ग्राम डिलीवरी से आएगा, टमाटर तीन सौ ग्राम शर्मा किराना से। प्याज़ घर में
// है। ये प्लान ठीक है?"
function planText(d) {
  const dl = d.missing.filter((m) => m.from === "Delhivery").map((m) => `${hi(m.item)} ${amount(m.item, m.need, m.unit)}`);
  const kr = d.missing.filter((m) => m.from !== "Delhivery").map((m) => `${hi(m.item)} ${amount(m.item, m.need, m.unit)}`);
  const home = d.at_home.map(hi);
  const parts = [];
  if (dl.length) parts.push(`${and(dl)} डिलीवरी से आएगा`);
  if (kr.length) parts.push(`${and(kr)} शर्मा किराना से`);
  return `बढ़िया, ${d.hindi} तय रहा। ${parts.length ? `इसके लिए ${parts.join(", ")}।` : "सब सामान घर में है।"}${home.length && parts.length ? ` ${and(home)} घर में है।` : ""} ये प्लान ठीक है?`;
}

function billText(b) {
  const lines = ["ऑर्डर हो गया।"];
  if (b.kirana) lines.push(`शर्मा किराना ने ${and(b.kirana.names.map(hi))} पैक कर दिए हैं${b.kirana.rs ? `, ${num(b.kirana.rs)} रुपये` : ""}।`);
  if (b.parcel) lines.push(`डिलीवरी से ${b.parcel.items.length ? and(b.parcel.items.map(hi)) : "सूखा सामान"} आ रहा है${b.parcel.rs ? `, ${num(b.parcel.rs)} रुपये` : ""}।`);
  lines.push(`कुल ${num(b.total_rs)} रुपये, पाइन लैब्स रिज़र्व पे से, रोज़ की लिमिट के अंदर। क्या बिल ठीक है?`);
  return lines.join(" ");
}

const ORDERING = "बढ़िया! मैं अभी शर्मा किराना और डिलीवरी से ऑर्डर लगा रही हूँ, और परिवार के खाते से पेमेंट कर रहा हूँ। बस एक मिनट, लाइन पे रहिए।";
const BYE = "धन्यवाद! सुबह सुनीता जी को कल का पूरा प्लान हिंदी वॉइस नोट में भेज दूँगी। नमस्ते!";

// Yes and no, in Hinglish or Devanagari, as Gnani writes them.
const YES = /(\bhaan\b|\bhan\b|\bha\b|\bhaa\b|theek|thik|\bok\b|okay|chalega|kar do|kardo|order kar|bilkul|sahi hai|done|yes|हाँ|हां|हा\b|ठीक|बिल्कुल|बिलकुल|कर दो|करदो|चलेगा|सही है|ओके)/i;
const NO = /(\bnahi\b|\bnahin\b|\bna\b|\bmat\b|\bno\b|नहीं|नही|ना\b|मत)/i;
const isYes = (s) => !!s && YES.test(s) && !NO.test(s);
const isNo = (s) => !!s && NO.test(s);
const asks = (s) => /\?|\bkya\b|kitna|kitne|kaun|kab|kaise|क्या|कितना|कितने|कौन|कब|कैसे/i.test(s || "");

// A dish named in what the family said, in English or Hindi.
function dishIn(s) {
  const t = String(s || "");
  const hiHit = Object.entries(HI_DISH).find(([, h]) => t.includes(h) || t.includes(h.split(" ")[0]));
  return household.dishName(t) || (hiHit ? hiHit[0] : null);
}

// ---- the turn loop

// Work out the reply to what the family said (or didn't), and store it for
// /twilio/next. Runs after Twilio has already been answered.
async function respond(sid, n, heard) {
  const c = await get(sid);
  if (!c || c.replies[n]) return;
  const silent = !heard;
  if (!silent) c.transcript.push({ who: "family", text: heard });
  c.silences = silent ? c.silences + 1 : 0;
  let next = "listen";
  let text = "";
  const f = await kitchenFacts(c.date_for);
  const choose = (dish) => {
    c.runner_up = c.options.find((d) => d !== dish) || c.options[0];
    c.dish = dish;
    c.plan = f.dishes.find((d) => d.name === dish);
    c.stage = "plan";
    return planText(c.plan);
  };
  if (silent && c.silences >= 3) {
    text = "लगता है अभी बात नहीं हो पा रही। मैं टेलीग्राम पे बता दूँगी। नमस्ते!";
    next = "hangup";
  } else if (silent) {
    text = c.stage === "discuss" ? `तो क्या तय हुआ? ${HI_DISH[c.options[0]]} या ${HI_DISH[c.options[1]]}?` : c.stage === "plan" ? "ये प्लान ठीक है?" : c.stage === "bill" ? "क्या बिल ठीक है?" : "और कुछ?";
  } else if (c.stage === "order") {
    text = "बस एक मिनट, ऑर्डर लग रहा है।";
    next = "order";
  } else if (c.stage === "plan" && isYes(heard) && !asks(heard)) {
    text = ORDERING;
    next = "order";
    c.stage = "order";
    c.order_ms = Date.now();
    await placeOrder(c);
  } else if (c.stage === "bill" && isYes(heard) && !asks(heard)) {
    text = BYE;
    next = "hangup";
  } else if (c.stage === "wrap" && (isNo(heard) || isYes(heard)) && !asks(heard)) {
    text = BYE;
    next = "hangup";
  } else {
    const r = await brain(c, heard);
    // The LLM saw a choice, or the family said yes and named a dish.
    const named = (r.ok && r.intent === "chose_dish" ? r.dish : null) || (c.stage === "discuss" && isYes(heard) ? dishIn(heard) : null);
    if (!r.ok) {
      text = "माफ़ कीजिए, एक बार फिर बोलिए?";
    } else if ((c.stage === "discuss" || c.stage === "plan") && named && named !== c.dish) {
      text = household.ruleBreak(named, c.date_for) ? r.say || "पापा की थाली में आलू और मीठा नहीं, कोई और डिश चुनिए।" : choose(named);
    } else if (r.intent === "end_call") {
      text = r.say || BYE;
      next = "hangup";
    } else if (c.stage === "plan") {
      text = /ठीक है?/.test(r.say || "") ? r.say : `${r.say ? `${r.say} ` : ""}ये प्लान ठीक है?`;
    } else if (c.stage === "bill") {
      if (r.intent === "reject") {
        text = "ठीक है, विनय जी को बता देता हूँ, वो बिल देख लेंगे। और कुछ?";
        c.stage = "wrap";
      } else text = /ठीक है?/.test(r.say || "") ? r.say : `${r.say ? `${r.say} ` : ""}क्या बिल ठीक है?`;
    } else {
      text = r.say;
    }
  }
  if (text) c.transcript.push({ who: "baari", text });
  c.replies[n] = { text, next, play: text ? await say(text) : null };
  c.events.push({ at_ist: istString(), n, heard: heard || null, said: text, stage: c.stage, next });
  await save(c);
  await ops.log({ at_ist: istString(), kind: "call", note: `turn ${n} [${c.stage}] heard "${(heard || "").slice(0, 80)}" -> "${text.slice(0, 80)}"${next !== "listen" ? ` (${next})` : ""}` });
}

// The family said yes to the plan: the Baari agent locks the dish and buys.
async function placeOrder(c) {
  const t = turn.view(await turn.get());
  // No veto round on a call night: the family decided together.
  await store.set(`vetoask:${c.date_for}`, 1, 86400);
  const [last] = await store.range("tg:updates", 1);
  await store.set("handoff:last", {
    date_for: c.date_for,
    phase_done: "SHORTLIST",
    last_update_id: last ? last.update_id : 0,
    shortlist: c.options,
    turn: { holder: t.holder || "", how: "picked", dish: c.dish },
    votes_heard: t.holder ? [t.holder] : [],
    locked: { winner: "", runner_up: "", headcount: 4 },
    missing: [],
    pickup: [],
    money: { spent_today_paise: 0, debits: [] },
    shipment: { order: "", waybill: "", last_status: "" },
    open_asks: [],
    sent: [],
    notes_for_next: `Decided on a phone call with the family: ${c.dish}.`,
  });
  const agreed = (c.plan && c.plan.missing.length ? c.plan.missing.map((m) => `${m.item} ${m.need}${m.unit ? ` ${m.unit}` : ""} from ${m.from}`).join(", ") : "nothing, all at home");
  const extra = `CALL: The family settled tomorrow's dish on a phone call with Baari's voice line: ${c.dish} (runner-up ${c.runner_up}). Treat it as ${t.holder || "the family"}'s pick (V2, how "picked"); there is no veto round. Lock it and tell everyone as usual, saying the family decided it together on the call. On the call they agreed to buy: ${agreed}. Buy exactly that at BUY unless a rule or a tool stops you.`;
  wake().later(wake().tick("call", base_(), { phase: "LOCK", date_for: c.date_for, extra }));
  await ops.log({ at_ist: istString(), kind: "call", note: `family chose ${c.dish} on the call; LOCK and BUY started` });
}

// ---- routes

function parseForm(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  return Object.fromEntries(new URLSearchParams(String(body)));
}

function playOrSay(r) {
  return r && r.play ? audio(r.play) : "";
}

// The TwiML for a stored reply: speak it, then listen, hang up or hold.
async function replyTwiml(c, sid, r, n) {
  if (r.next === "hangup") {
    if ((await store.get("call:active")) === sid) await store.del("call:active");
    return twiml(`${playOrSay(r)}<Pause length="1"/><Hangup/>`);
  }
  if (r.next === "order") return twiml(`${playOrSay(r)}<Redirect method="POST">${url("/twilio/hold", { sid, n: n + 1, h: 0 })}</Redirect>`);
  return twiml(listen(c, n + 1, playOrSay(r)));
}

// A step that throws must never reach Twilio as an error: Twilio would say
// "an application error has occurred" and drop the call. Ask again instead.
async function route(req, base) {
  try {
    return await routeStep(req, base);
  } catch (e) {
    await ops.log({ at_ist: istString(), kind: "call", note: `call step ${req.path} failed: ${String(e && e.message).slice(0, 160)}` }).catch(() => {});
    const q = req.query || {};
    const sid = parseForm(req.body).CallSid || q.sid;
    const n = Number(q.n || 1);
    const again = `<Say language="hi-IN" voice="Polly.Aditi">माफ़ कीजिए, एक बार फिर बोलिए?</Say>`;
    if (!sid || !String(req.path).startsWith("/twilio/") || req.path === "/twilio/status") return twiml(`${again}`);
    return twiml(listen({ sid }, n + 1, again));
  }
}

async function routeStep(req, base) {
  BASE = base;
  const p = req.path;
  const q = req.query || {};
  const params = parseForm(req.body);
  const admin = process.env.ADMIN_KEY && (q.key === process.env.ADMIN_KEY || req.headers["x-admin-key"] === process.env.ADMIN_KEY);
  if (q.k !== hookKey() && !admin) return { status: 403, body: { ok: false } };
  if (!admin && !validSignature(req, params)) return { status: 403, body: { ok: false, error: "bad signature" } };
  const sid = params.CallSid || q.sid;
  const c = sid ? await get(sid) : null;

  if (p === "/twilio/status") {
    if (c) {
      c.ended = { status: params.CallStatus || "completed", at_ist: istString(), seconds: Number(params.CallDuration || 0) };
      await save(c);
    }
    if ((await store.get("call:active")) === sid) await store.del("call:active");
    await ops.log({ at_ist: istString(), kind: "call", note: `call ${sid} ended: ${params.CallStatus || "completed"}, ${params.CallDuration || "?"} s` });
    return { status: 200, body: { ok: true } };
  }
  if (!c) return twiml(`<Say language="hi-IN">Namaste.</Say><Hangup/>`);

  if (p === "/twilio/voice") {
    c.answered_ist = istString();
    await save(c);
    return twiml(listen(c, 1, audio(c.open.play)));
  }

  // What the family said: answer now with a short "ji", work on the reply.
  if (p === "/twilio/heard" || p === "/twilio/silence") {
    const n = Number(q.n || 1);
    const spoken = String(params.SpeechResult || "").trim();
    const silent = p === "/twilio/silence" || (!spoken && Number(params.RecordingDuration || 0) < 1 && q.sim_text === undefined);
    const work = (async () => {
      let heard = q.sim_text !== undefined && admin ? String(q.sim_text) : spoken;
      if (!heard && !silent && !c.sim) {
        const audio = await recording(params.RecordingUrl);
        if (audio) {
          const s = await gnani.speechToText({ audio_url: "twilio", language_code: "hi-IN" }, async () => audio);
          heard = s.ok ? String(s.transcript || "").trim() : "";
          if (!s.ok) await ops.log({ at_ist: istString(), kind: "call", note: `Gnani STT failed: ${JSON.stringify(s.error).slice(0, 160)}` });
        }
      }
      await respond(sid, n, heard);
    })();
    // Think inside this request and answer in its response: one round trip,
    // nothing for Twilio to poll. Only a slow turn falls back to a filler
    // and /twilio/next.
    const done = await Promise.race([work.then(() => true), sleep(c.sim ? 120000 : 11000).then(() => false)]);
    if (done) {
      const r = ((await get(sid)) || {}).replies?.[n];
      if (r) return replyTwiml(c, sid, r, n);
    } else wake().later(work);
    const filler = !silent && c.fillers && c.fillers.length ? `${audio(c.fillers[n % c.fillers.length])}` : "";
    return twiml(`${filler}<Redirect method="POST">${url("/twilio/next", { sid, n })}</Redirect>`);
  }

  // The reply, once it's ready.
  if (p === "/twilio/next") {
    const n = Number(q.n || 1);
    const w = Number(q.w || 0);
    let r = c.replies[n];
    for (let i = 0; !r && i < 16; i++) {
      await sleep(500);
      r = ((await get(sid)) || {}).replies?.[n];
    }
    if (!r) {
      if (w >= 3) return twiml(listen(c, n + 1, audio(await say("माफ़ कीजिए, एक बार फिर बोलिए?"))));
      return twiml(`<Pause length="1"/><Redirect method="POST">${url("/twilio/next", { sid, n, w: w + 1 })}</Redirect>`);
    }
    return replyTwiml(c, sid, r, n);
  }

  // On hold while the agent locks and buys; then the bill.
  if (p === "/twilio/hold") {
    const n = Number(q.n || 1);
    const h = Number(q.h || 0);
    const b = await billFacts();
    if (billReady(b)) {
      const cur = await get(sid);
      if (!cur.bill) {
        const text = billText(b);
        cur.stage = "bill";
        cur.bill = { text, facts: b, play: await say(text) };
        cur.transcript.push({ who: "baari", text });
        await save(cur);
        await ops.log({ at_ist: istString(), kind: "call", note: `bill read: Rs ${b.total_rs}` });
      }
      return twiml(listen(cur, n, audio(cur.bill.play)));
    }
    if (Date.now() - (c.order_ms || Date.now()) > HOLD_MAX_MS) {
      const text = "ऑर्डर में थोड़ा समय लग रहा है। बिल टेलीग्राम पे भेज दूँगी। धन्यवाद, नमस्ते!";
      return twiml(`${audio(await say(text))}<Hangup/>`);
    }
    // A short line every few loops, so the hold never feels dead.
    // Hold lines are warmed at dial; never let making them stall Twilio.
    if (!c.hold) {
      const ready = await Promise.race([sayAll(HOLD), sleep(6000).then(() => null)]);
      if (ready) {
        c.hold = ready;
        await save(c);
      }
    }
    const line = c.hold && h % 3 === 0 ? `${audio(c.hold[Math.floor(h / 3) % c.hold.length])}` : "";
    return twiml(`${line}<Pause length="4"/><Redirect method="POST">${url("/twilio/hold", { sid, n, h: h + 1 })}</Redirect>`);
  }
  return { status: 404, body: { ok: false } };
}

async function view(sid) {
  const id = sid || (await store.get("call:active"));
  const c = id ? await get(id) : null;
  return { configured: configured(), demo_to: DEMO_TO ? `${DEMO_TO.slice(0, 4)}…${DEMO_TO.slice(-2)}` : null, active: await store.get("call:active"), call: c ? { sid: c.sid, sim: c.sim, stage: c.stage, options: c.options, dish: c.dish, transcript: c.transcript, events: c.events, ended: c.ended || null, bill: c.bill ? c.bill.facts : null } : null };
}

module.exports = { dial, route, view, configured, billFacts, kitchenFacts, hookKey };
