// What Baari still doesn't know (finale S8 step E1), ranked by what tomorrow
// needs: who's eating first, then rotis, spice, the cook's days off, then
// the rest of the island's questions. Built from the profile and its answers.
//
//   state.gaps = {missing: [{id, q, who, why}], next_ask_ist}
//   who  a member's name for a question only they can answer (are they
//        eating tomorrow), "anyone" for a household answer
//
// Rails only lists the gaps and parses an answer into a value. Asking
// happens on a call (lib/callask.js) or in the app's island.

const store = require("./store");
const { istString, istDate } = require("./util");

// id, the app's English question, Baari's Hindi line on a call, why it matters.
const QUESTIONS = [
  { id: "eating_tomorrow", q: "Are you eating at home tomorrow?", hi: "कल आप घर पे खाना खाएँगे?", why: "Tomorrow's headcount: how much to cook and buy", personal: true },
  { id: "rotis_per_adult", q: "At lunch, how many rotis does an adult usually eat?", hi: "एक बड़ा आदमी आमतौर पर कितनी रोटी खाता है?", why: "So the atta and the cook's count come out right" },
  { id: "spice", q: "How spicy does the house like it?", hi: "घर में तीखा कितना चलता है? हल्का, मीडियम या तेज़?", why: "Sunita's brief says how much chilli" },
  { id: "cook_days_off", q: "Which days is the cook usually off?", hi: "सुनीता जी आमतौर पर किस दिन छुट्टी लेती हैं?", why: "An easy dish or a treat on those days" },
  { id: "health_goals", q: "Does anyone have a health goal Baari should cook for?", hi: "किसी के खाने में कोई परहेज़ रखना है?", why: "Plate rules, never a condition" },
  { id: "repeat_gap", q: "How often can the same dish come back?", hi: "एक डिश कितने दिन बाद दोबारा बन सकती है?", why: "The shortlist skips recent dishes" },
  { id: "budget", q: "Food budget for the month?", hi: "महीने का खाने का बजट कितना है?", why: "Baari plans inside it, never past Rs 400 a day" },
  { id: "pay_without_asking", q: "Biggest single order Baari can pay without asking you?", hi: "एक ऑर्डर में बारी बिना पूछे कितने रुपये तक दे सकती है?", why: "Above this, a Pine Labs link; never above Rs 300" },
  { id: "grocery_source", q: "Where should groceries come from first?", hi: "सामान पहले कहाँ से आए? पास की किराना या डिलीवरी?", why: "Which shop Baari orders from first" },
  { id: "leftovers", q: "What usually happens to leftovers?", hi: "बचा खाना आमतौर पर क्या होता है?", why: "Less cooked when leftovers go to lunch" },
  { id: "guests", q: "When do guests usually turn up?", hi: "मेहमान आमतौर पर कब आते हैं?", why: "More food on those days" },
  { id: "tiffins", q: "Do the kids take a tiffin?", hi: "बच्चे टिफ़िन ले जाते हैं?", why: "A tiffin portion in the morning" },
  { id: "meals", q: "Should Baari plan only lunch, or more?", hi: "बारी सिर्फ़ लंच प्लान करे, या और भी?", why: "Which meals Baari plans" },
  { id: "try_new", q: "Try one new dish a week?", hi: "हफ़्ते में एक नई डिश ट्राई करें?", why: "New dishes only enter the vote" },
];
const BY_ID = Object.fromEntries(QUESTIONS.map((x) => [x.id, x]));

// Who has said whether they eat tomorrow: a call answer for that date, or an
// away/back mark in attendance (anyone marking them counts).
async function eatingSaid(date_for, who) {
  if (await store.get(`gap:eat:${date_for}:${String(who).toLowerCase()}`)) return true;
  const r = await store.get(`att:${date_for}`);
  return !!(r && Array.isArray(r.away) && r.away.some((a) => a.name === who));
}

async function markEatingSaid(date_for, who) {
  await store.set(`gap:eat:${date_for}:${String(who).toLowerCase()}`, 1, 3 * 86400);
}

// The next slot Baari asks in: 18:00 IST, before the 20:30 shortlist. Today's
// if it's still ahead, else tomorrow's.
function nextAsk(now = new Date()) {
  const ist = istString(now);
  const today = ist.slice(0, 10);
  const slot = `${today}T18:00:00.000`;
  if (ist < slot) return slot;
  const t = new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  return `${t}T18:00:00.000`;
}

// The ranked list. member: only what that person can answer (a call to them).
async function missing({ member, date_for } = {}) {
  const p = (await require("./profile").get()) || { members: [], answers: {} };
  const answers = p.answers || {};
  const att = require("./attendance");
  const d = date_for || (await att.nextDate());
  const eaters = await att.members();
  const out = [];
  for (const who of member ? [member] : eaters) {
    if (!eaters.includes(who)) continue;
    if (!(await eatingSaid(d, who))) out.push({ id: "eating_tomorrow", q: BY_ID.eating_tomorrow.q, who, why: BY_ID.eating_tomorrow.why, date_for: d });
  }
  for (const x of QUESTIONS) {
    if (x.personal) continue;
    const a = answers[x.id];
    if (a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && !a.length && x.id !== "cook_days_off")) continue;
    // A household question someone already answered on a call isn't asked again.
    if (member && p.answers_by && p.answers_by[member] && p.answers_by[member][x.id]) continue;
    out.push({ id: x.id, q: x.q, who: "anyone", why: x.why });
  }
  return out;
}

async function state() {
  const list = await missing();
  return { missing: list, next_ask_ist: list.length ? nextAsk() : null };
}

// ---- answers, parsed without a model

const NUM_WORDS = { ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, chah: 6, saat: 7, sat: 7, aath: 8, ath: 8, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8 };
const DEV_DIGITS = "०१२३४५६७८९";
const toAscii = (s) => String(s || "").replace(/[०-९]/g, (c) => String(DEV_DIGITS.indexOf(c)));

function number(s) {
  const t = toAscii(s).toLowerCase();
  const d = t.match(/\d+/);
  if (d) return Number(d[0]);
  for (const w of t.split(/[^a-zऀ-ॿ]+/)) if (NUM_WORDS[w]) return NUM_WORDS[w];
  return null;
}

const YES = /(\bhaan\b|\bhan\b|\bha\b|\bhaa\b|\bji\b|theek|thik|\bok\b|okay|bilkul|zaroor|yes|हाँ|हां|जी|ठीक|बिल्कुल|ज़रूर|जरूर)/i;
const NO = /(\bnahi\b|\bnahin\b|\bna\b|\bno\b|नहीं|नही|ना\b)/i;
const DAY_HI = [["sunday", "ravivar", "itwar", "रविवार", "इतवार"], ["monday", "somvar", "सोमवार"], ["tuesday", "mangalvar", "mangal", "मंगलवार", "मंगल"], ["wednesday", "budhvar", "budh", "बुधवार", "बुध"], ["thursday", "guruvar", "veervar", "brihaspativar", "गुरुवार", "वीरवार", "बृहस्पतिवार"], ["friday", "shukravar", "shukra", "शुक्रवार"], ["saturday", "shanivar", "shani", "शनिवार", "शनि"]];
const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// {ok, value, say_hi} or {ok: false}. say_hi is the one line Baari confirms back.
function parse(id, heard) {
  const t = String(heard || "").trim();
  if (!t) return { ok: false };
  const low = t.toLowerCase();
  if (id === "eating_tomorrow") {
    if (NO.test(t) || /bahar|office|nahi khaunga|nahi khaungi|बाहर/i.test(t)) return { ok: true, value: false, say_hi: "ठीक है, कल आप घर पे नहीं खाएँगे। लिख लिया।" };
    if (YES.test(t) || /khaunga|khaungi|खाऊँगा|खाऊँगी|खाएँगे/.test(t)) return { ok: true, value: true, say_hi: "ठीक है, कल आप घर पे खाएँगे।" };
    return { ok: false };
  }
  if (id === "rotis_per_adult") {
    const n = number(t);
    if (!n || n < 1 || n > 12) return { ok: false };
    return { ok: true, value: n, say_hi: `ठीक है, एक बड़े के लिए ${["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह"][n]} रोटी।` };
  }
  if (id === "spice") {
    if (/halka|halki|kam|mild|less|हल्का|हल्की|कम/i.test(t)) return { ok: true, value: "mild", say_hi: "ठीक है, हल्का तीखा।" };
    if (/tez|teekha|tikha|zyada|jyada|spicy|hot|तेज़|तेज|तीखा|ज़्यादा|ज्यादा/i.test(t) && !/medium|मीडियम|normal|नॉर्मल/i.test(t)) return { ok: true, value: "spicy", say_hi: "ठीक है, तेज़ तीखा।" };
    if (/medium|normal|beech|theek|मीडियम|नॉर्मल|बीच|ठीक/i.test(t)) return { ok: true, value: "medium", say_hi: "ठीक है, मीडियम तीखा।" };
    return { ok: false };
  }
  if (id === "cook_days_off") {
    const days = DAY_HI.map((ws, i) => (ws.some((w) => low.includes(w)) ? i : -1)).filter((i) => i >= 0);
    if (days.length) return { ok: true, value: days.map((i) => DAY_EN[i]), say_hi: `ठीक है, ${days.map((i) => DAY_HI[i][DAY_HI[i].length - 1]).join(" और ")} को छुट्टी।` };
    if (/koi nahi|kabhi nahi|none|never|कोई नहीं|कभी नहीं/i.test(t)) return { ok: true, value: [], say_hi: "ठीक है, कोई तय छुट्टी नहीं।" };
    return { ok: false };
  }
  if (id === "budget" || id === "pay_without_asking") {
    const n = number(t.replace(/hazaar|hazar|हज़ार|हजार/i, "000"));
    if (!n) return { ok: false };
    return { ok: true, value: n, say_hi: `ठीक है, ${n} रुपये लिख लिए।` };
  }
  if (id === "try_new" || id === "tiffins") {
    if (NO.test(t)) return { ok: true, value: "no", say_hi: "ठीक है, नहीं।" };
    if (YES.test(t)) return { ok: true, value: "yes", say_hi: "ठीक है, हाँ।" };
    return { ok: false };
  }
  // The rest are kept in the person's words.
  return { ok: true, value: t.slice(0, 160), say_hi: "ठीक है, लिख लिया।" };
}

module.exports = { QUESTIONS, BY_ID, missing, state, parse, number, nextAsk, eatingSaid, markEatingSaid };
