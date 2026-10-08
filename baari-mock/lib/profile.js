// The household profile (finale S8 step A). What onboarding collects, kept on
// rails so the agent reads the real family instead of the KB's Sharmas:
//
//   POST /app/profile {home, members, cook, mode, languages, rules, answers, by}
//     members  [{name, eats, in_baari, lang}]
//     cook     {name, arrives: "08:00", lang}
//     rules    the rules page's pick: {diet, jain, avoid: {who: {food: 1|2}}, nv, vrat, lines}
//              (nv_days and vrat_days work too)
//     answers  {question_id: value}, ids in lib/gaps.js QUESTIONS
//
// Stored as "profile". /app/state shows {home, members, cook, answers,
// updated_at, updated_by}. Every rule becomes a confirmed memory fact with
// via "app" (lib/memory.js). A health avoid is a plate rule ("No potato on
// Papa's plate"), never a condition. Money answers are clamped to the
// mandate's limits, and the response says what was clamped.
//
// Rails stores and guards. It never decides what the family eats.

const store = require("./store");
const { istString } = require("./util");

const KEY = "profile";
// The household mandate's limits (lib/ops.js DAILY_CAP, lib/household.js BIG_DEBIT).
const DAY_CAP_RS = 400;
const SINGLE_DEBIT_RS = 300;

// The rules page's food keys (app/onboard.js FOODS), in plain English.
const FOOD = { aloo: "potato", pyaaz: "onion", lehsun: "garlic", teekha: "chilli", tel: "oil", namak: "salt", meetha: "sugar", moong: "peanuts", paneer: "paneer", doodh: "dairy", baingan: "brinjal", mushroom: "mushroom" };
// Avoids that are about health. They become plate rules, worded with no condition.
const HEALTH_FOODS = new Set(["aloo", "tel", "namak", "meetha", "potato", "oil", "salt", "sugar"]);
const DAY = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const VRAT = { navratri: "Navratri", ekadashi: "Ekadashi", tue: "Tuesdays", mon: "Mondays", thu: "Thursdays", sawan: "Sawan", karwa: "Karwa Chauth" };

const str = (v, n = 60) => String(v == null ? "" : v).trim().slice(0, n);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

async function get() {
  return (await store.get(KEY)) || null;
}

function cleanMembers(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const m of list.slice(0, 12)) {
    const name = cap(str(m && m.name, 30));
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, eats: m.eats !== false, in_baari: m.in_baari !== false, lang: str(m.lang, 20) || null });
  }
  return out;
}

// Money answers can't go past what the mandate allows. budget is the month's
// food budget (the island asks for it per month), so its daily share is held
// to Rs 400; budget_day and pay_without_asking are held directly.
function clampAnswers(answers) {
  const a = { ...(answers && typeof answers === "object" ? answers : {}) };
  const clamped = [];
  const hold = (k, max, why) => {
    if (a[k] === undefined || a[k] === null || a[k] === "") return;
    const n = Math.round(Number(String(a[k]).replace(/[^\d.]/g, "")));
    if (!Number.isFinite(n) || n < 0) {
      clamped.push({ id: k, asked: a[k], kept: null, why: "not a number" });
      delete a[k];
      return;
    }
    if (n > max) clamped.push({ id: k, asked: n, kept: max, why });
    a[k] = Math.min(n, max);
  };
  hold("budget", DAY_CAP_RS * 30, `Baari can spend at most Rs ${DAY_CAP_RS} a day, so the month's food budget on Baari tops out at Rs ${DAY_CAP_RS * 30}`);
  hold("budget_day", DAY_CAP_RS, `the household mandate's daily cap is Rs ${DAY_CAP_RS}`);
  hold("pay_without_asking", SINGLE_DEBIT_RS, `any single payment over Rs ${SINGLE_DEBIT_RS} needs a yes from the account holder`);
  return { answers: a, clamped };
}

// Who a rules-page key means: "papa" -> "Papa", "all" -> "Everyone".
function whoOf(key, members) {
  const k = String(key || "").toLowerCase();
  if (!k || k === "all" || k === "sab" || k === "everyone") return "Everyone";
  const m = members.find((x) => x.name.toLowerCase() === k);
  return m ? m.name : cap(k);
}

// The rules page's pick as memory facts (confirmed, via app). The plate words
// are what the agent says; the condition behind a health avoid never appears.
function factsFromRules(rules, members) {
  const r = rules && typeof rules === "object" ? rules : {};
  const out = [];
  const add = (who, text, say_it_as, health) => out.push({ who, kind: "rule", text, say_it_as: say_it_as || text, health: !!health });
  if (r.jain) add("Everyone", "Jain kitchen: nothing from under the ground", "Jain kitchen: no potato, onion or garlic on any plate");
  else if (r.diet === "veg") add("Everyone", "Vegetarian kitchen", "Only vegetarian food at home");
  else if (r.diet === "egg" || r.diet === "eggetarian") add("Everyone", "Eggs are fine, no meat", "Eggs yes, meat no");
  for (const [whoKey, foods] of Object.entries(r.avoid && typeof r.avoid === "object" ? r.avoid : {})) {
    const who = whoOf(whoKey, members);
    for (const [food, level] of Object.entries(foods || {})) {
      const lv = Number(level);
      if (lv !== 1 && lv !== 2) continue;
      const name = FOOD[food] || String(food).toLowerCase();
      const plate = who === "Everyone" ? "any plate" : `${who}'s plate`;
      const say = lv === 2 ? `No ${name} on ${plate}` : `Less ${name} on ${plate}`;
      add(who, lv === 2 ? `no ${name}` : `less ${name}`, say, HEALTH_FOODS.has(food) || HEALTH_FOODS.has(name));
    }
  }
  const nv = r.nv_days || r.nv || [];
  if (Array.isArray(nv) && nv.length) {
    const days = nv.map((d) => DAY[String(d).slice(0, 3).toLowerCase()] || cap(str(d, 12)));
    add("Everyone", `no non-veg on ${days.join(", ")}`, `No non-veg on ${days.join(" or ")}`);
  }
  const vrat = r.vrat_days || r.vrat || [];
  if (Array.isArray(vrat) && vrat.length) {
    const vs = vrat.map((v) => VRAT[String(v).toLowerCase()] || cap(str(v, 20)));
    add("Everyone", `fasting food on ${vs.join(", ")}`, `Fasting food on ${vs.join(" and ")}`);
  }
  for (const line of Array.isArray(r.lines) ? r.lines : Array.isArray(r.own) ? r.own : []) {
    const t = str(line, 160);
    if (t) add("Everyone", t, t);
  }
  return out;
}

// POST /app/profile. by: who saved it (the app sends the member's name).
async function save(body, by) {
  const b = body && typeof body === "object" ? body : {};
  const old = (await get()) || {};
  const members = b.members !== undefined ? cleanMembers(b.members) : old.members || [];
  if (b.members !== undefined && !members.length) return { ok: false, error: "members needs at least one {name}" };
  const cookIn = b.cook && typeof b.cook === "object" ? b.cook : old.cook || null;
  const arrives = cookIn && /^\d{1,2}:\d{2}$/.test(str(cookIn.arrives, 5)) ? str(cookIn.arrives, 5).padStart(5, "0") : (cookIn && cookIn.arrives) || "08:00";
  const cook = cookIn ? { name: cap(str(cookIn.name, 30)) || "Sunita", arrives, lang: str(cookIn.lang, 20) || "Hindi" } : null;
  const { answers, clamped } = clampAnswers({ ...(old.answers || {}), ...(b.answers || {}) });
  const p = {
    home: str(b.home !== undefined ? b.home : old.home, 60) || null,
    members,
    cook,
    mode: ["pick", "vote"].includes(b.mode) ? b.mode : old.mode || null,
    languages: Array.isArray(b.languages) ? b.languages.map((x) => str(x, 20)).filter(Boolean) : old.languages || [],
    rules: b.rules && typeof b.rules === "object" ? b.rules : old.rules || {},
    answers,
    // Answers each person gave themselves (a call, lib/callask.js).
    answers_by: old.answers_by || {},
    updated_at: istString(),
    updated_by: str(by || b.by, 30) || "app",
  };
  await store.set(KEY, p);
  // The rules as memory facts, replacing the last save's.
  const memory = require("./memory");
  const r = await memory.fromProfile(factsFromRules(p.rules, members), p.updated_by);
  await require("./events").emit("profile", { who: p.updated_by, via: "app", n: members.length, summary: `${p.updated_by} saved the household profile` });
  return { ok: true, profile: view(p), facts: r.facts, refused: r.refused, clamped, limits: { day_cap_rs: DAY_CAP_RS, single_debit_rs: SINGLE_DEBIT_RS, note: clamped.length ? `Clamped to the mandate's limits: ${clamped.map((c) => `${c.id} Rs ${c.kept}`).join(", ")}` : "Inside the mandate's limits" } };
}

// One answer a person gave on a call (or anywhere they speak for themselves).
// It lands in answers_by[who] and, when the household has no answer yet and
// it isn't personal (eating tomorrow), in answers. Money answers are clamped
// the same way.
async function answer(who, id, value, via = "call", { personal = false } = {}) {
  const p = (await get()) || { home: null, members: [], cook: null, mode: null, languages: [], rules: {}, answers: {}, answers_by: {} };
  const { answers, clamped } = clampAnswers({ [id]: value });
  if (!(id in answers)) return { ok: false, error: "not a usable answer", clamped };
  p.answers_by = p.answers_by || {};
  p.answers_by[who] = { ...(p.answers_by[who] || {}), [id]: { value: answers[id], via, at_ist: istString() } };
  p.answers = p.answers || {};
  if (!personal && p.answers[id] === undefined) p.answers[id] = answers[id];
  p.updated_at = istString();
  p.updated_by = who;
  await store.set(KEY, p);
  return { ok: true, value: answers[id], clamped };
}

function view(p) {
  if (!p) return null;
  return { home: p.home, members: p.members, cook: p.cook, mode: p.mode, languages: p.languages, answers: p.answers || {}, answers_by: p.answers_by || {}, updated_at: p.updated_at, updated_by: p.updated_by };
}

async function state() {
  return view(await get());
}

// Names of everyone at home (eaters and not), for attendance and asks.
async function memberNames() {
  const p = await get();
  return p && p.members && p.members.length ? p.members.map((m) => m.name) : null;
}

// The PEOPLE line for the task text. Only when a profile exists: until then
// the clock Worker's fixed PEOPLE line is the household.
async function peopleLine() {
  const p = await get();
  if (!p || !p.members || !p.members.length) return null;
  const approver = require("./turn").APPROVER;
  const ppl = p.members.map((m) => {
    const notes = [];
    if (m.name === approver) notes.push("approves money");
    if (!m.eats) notes.push("doesn't eat at home");
    if (!m.in_baari) notes.push("not in the baari");
    return notes.length ? `${m.name} (${notes.join(", ")})` : m.name;
  });
  if (p.cook) ppl.push(`${p.cook.name} (cook, arrives ${p.cook.arrives}, speaks ${p.cook.lang})`);
  return `PEOPLE (household profile${p.home ? `, ${p.home}` : ""}; use this over any other PEOPLE line): ${ppl.join(", ")}.`;
}

module.exports = { get, save, answer, state, view, peopleLine, memberNames, clampAnswers, factsFromRules, DAY_CAP_RS, SINGLE_DEBIT_RS };
