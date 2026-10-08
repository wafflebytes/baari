// What Baari remembers about the household (finale S8 step B). Facts are
// learned from the app, from what people say on Telegram, from patterns in
// what already happened, and from the agent (hh.learn). Baari asks before it
// believes anything it wasn't told by the person it's about.
//
// Stored as "memory":
//   facts  [{id, who, kind, text, say_it_as, status, source, evidence, health, data, ...}]
//          kind    rule | like | dislike | routine | pantry
//          status  proposed | confirmed | rejected
//          source  {via: app | telegram | telegram_voice | pattern | agent | call, ref, by, at_ist}
//          data    a routine's {weekday: 0-6, away: true}
//   asks   [{to, id, date, at_ist}]   one ask per person per day
//   away_log {date_for: [names]}      kept past attendance's 10 day TTL for the routine pattern
//
// Who confirms: the person the fact is about. A health rule said by someone
// else, and anything about the whole house or the cook, goes to the account
// holder (Vinay). Nobody confirms a fact about someone else.
//
// The medical guard: no fact may name a condition. Rails refuses the text
// with SAY_IT_AS_A_PLATE_RULE, so the agent has to say "no sugar on Papa's
// plate", never why.
//
// Rails keeps the facts and the guard. What a fact means for dinner is the
// agent's call; it reads them as the LEARNED line.

const store = require("./store");
const { istString, istDate } = require("./util");

const KEY = "memory";
const KINDS = ["rule", "like", "dislike", "routine", "pantry"];
const VIAS = ["app", "telegram", "telegram_voice", "pattern", "agent", "call"];
const HOUSE = "Everyone";
const COOK = "Sunita";
const MAX_FACTS = 200;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Condition words, English and Hindi (Latin and Devanagari).
const CONDITION_EN = /\b(diabet(?:es|ic)|sugar ki bimari|shugar ki bimari|b\.?\s?p\b|blood pressure|hypertension|cholesterol|thyroid|heart|dil ki bimari|kidney|pregnan(?:t|cy))\b/i;
const CONDITION_HI = /(मधुमेह|डायबिटीज़|डायबिटीज|डायबिटिक|शुगर की बीमारी|बीपी|ब्लड प्रेशर|रक्तचाप|कोलेस्ट्रॉल|कोलेस्ट्रोल|थायराइड|थायरॉइड|दिल की बीमारी|हृदय|किडनी|गुर्दे|गर्भवती|प्रेग्नेंट)/;
// A rule about these foods is a health rule: someone else's word isn't enough.
const HEALTH = /\b(sugar|cheeni|meetha|sweets?|salt|namak|oil|tel|ghee|fried|maida|potato|aloo)\b|चीनी|मीठा|नमक|तेल|घी|मैदा|आलू/i;

const sid = () => String(Math.random()).slice(2, 6);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, " ").replace(/\s+/g, " ").trim();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
const shiftDay = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();

function condition(text) {
  const t = String(text || "");
  const m = t.match(CONDITION_EN) || t.match(CONDITION_HI);
  return m ? m[0] : null;
}

function looksHealth(kind, text, say) {
  return kind === "rule" && HEALTH.test(`${text || ""} ${say || ""}`);
}

// "eats out on Thursdays", "Thursday ko bahar khate hain" -> {weekday: 4, away: true}
const DAY_WORDS = [/\bsun(day)?s?\b|ravivar|itwar/i, /\bmon(day)?s?\b|somvar/i, /\btue(s|sday)?s?\b|mangal(var)?/i, /\bwed(nesday)?s?\b|budh(var)?/i, /\bthu(rs|rsday)?s?\b|guruvar|veervar|brihaspati/i, /\bfri(day)?s?\b|shukra(var)?/i, /\bsat(urday)?s?\b|shani(var)?/i];
function parseRoutine(text) {
  const t = String(text || "");
  const wd = DAY_WORDS.findIndex((re) => re.test(t));
  if (wd < 0) return null;
  const away = /eats? out|away|out for|not eating|not home|bahar|office mein|dinner out|skips?/i.test(t);
  return { weekday: wd, away };
}

async function load() {
  const m = (await store.get(KEY)) || {};
  return { facts: Array.isArray(m.facts) ? m.facts : [], asks: Array.isArray(m.asks) ? m.asks : [], away_log: m.away_log || {} };
}

async function save(m) {
  m.facts = m.facts.slice(-MAX_FACTS);
  const cutoff = shiftDay(istDate(), -10);
  m.asks = m.asks.filter((a) => a.date >= cutoff);
  const keep = shiftDay(istDate(), -28);
  for (const d of Object.keys(m.away_log)) if (d < keep) delete m.away_log[d];
  await store.set(KEY, m);
  return m;
}

// Who answers for a fact.
function confirmer(f) {
  const approver = require("./turn").APPROVER;
  if (!f.who || same(f.who, HOUSE) || same(f.who, COOK)) return approver;
  if (f.health && f.source && f.source.by && !same(f.source.by, f.who)) return approver;
  return f.who;
}

function canAct(f, by) {
  return !!by && (same(by, confirmer(f)) || same(by, f.who));
}

const emit = (fields) => require("./events").emit("memory", fields);

// Learn one fact. status comes from who said it: the app's own rules and the
// person speaking about themselves (not a health rule) are confirmed; a
// pattern, anything about someone else and every health rule are proposed.
async function add(input, { quiet = false } = {}) {
  const who = cap(String(input.who || "").trim()) || HOUSE;
  const kind = String(input.kind || "").toLowerCase();
  const text = String(input.text || "").trim().slice(0, 200);
  const say = String(input.say_it_as || input.text || "").trim().slice(0, 200);
  const via = VIAS.includes(input.via) ? input.via : "agent";
  if (!KINDS.includes(kind)) return { ok: false, error: `kind must be one of ${KINDS.join(", ")}` };
  if (!text) return { ok: false, error: "text is required" };
  const bad = condition(text) || condition(say);
  if (bad) return { ok: false, error: "SAY_IT_AS_A_PLATE_RULE", word: bad, why: `"${bad}" names a condition. Keep the plate rule only, like "No sugar on ${who === HOUSE ? "anyone's" : `${who}'s`} plate".` };
  const health = input.health !== undefined ? !!input.health && input.health !== "false" : looksHealth(kind, text, say);
  const by = input.by ? cap(String(input.by).trim()) : null;
  const self = !!by && same(by, who);
  const status = input.status || (via === "app" ? "confirmed" : via === "pattern" ? "proposed" : self && !health ? "confirmed" : "proposed");
  const m = await load();
  const now = istString();
  const dup = m.facts.find((f) => same(f.who, who) && f.kind === kind && norm(f.text) === norm(text));
  let fact;
  if (dup) {
    // A pattern never brings back what someone said no to.
    if (dup.status === "rejected" && via === "pattern") return { ok: true, fact: dup, unchanged: true };
    if (status === "confirmed" && dup.status !== "confirmed") {
      Object.assign(dup, { status, confirmed_by: by || via, confirmed_at: now, say_it_as: say });
      fact = dup;
    } else if (dup.status === "rejected" && via !== "pattern") {
      Object.assign(dup, { status, source: { via, ref: input.ref || null, by, at_ist: now }, asked_at: null, asked_to: null });
      fact = dup;
    } else return { ok: true, fact: dup, unchanged: true };
  } else {
    fact = {
      id: `f${await store.incr("mem:seq")}${sid()}`,
      who,
      kind,
      text,
      say_it_as: say,
      status,
      health,
      source: { via, ref: input.ref || null, by, at_ist: now },
      evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 10) : input.evidence ? [String(input.evidence).slice(0, 200)] : [],
      data: input.data || (kind === "routine" ? parseRoutine(`${text} ${say}`) : null),
      ...(status === "confirmed" ? { confirmed_by: by || via, confirmed_at: now } : {}),
    };
    m.facts.push(fact);
  }
  await save(m);
  if (!quiet) await emit({ who: by || who, name: fact.who, fact_id: fact.id, action: "learn", status: fact.status, text: fact.say_it_as, via, summary: `Baari ${fact.status === "confirmed" ? "remembers" : "may remember"}: ${fact.say_it_as}` });
  return { ok: true, fact };
}

// POST /app/memory {id, action: confirm|reject|edit, text?, by}, the Yes/No
// buttons and /yaad's remove.
async function act({ id, action, text, say_it_as, by, via = "app" }) {
  const m = await load();
  const f = m.facts.find((x) => x.id === id);
  if (!f) return { ok: false, error: `no fact ${id}` };
  if (!["confirm", "reject", "edit"].includes(action)) return { ok: false, error: "action must be confirm, reject or edit" };
  if (!canAct(f, by)) return { ok: false, error: "NOT_ALLOWED", why: `Only ${confirmer(f)} can ${action} what Baari remembers about ${f.who === HOUSE ? "the house" : f.who}` };
  const now = istString();
  if (action === "confirm") Object.assign(f, { status: "confirmed", confirmed_by: cap(by), confirmed_at: now });
  if (action === "reject") Object.assign(f, { status: "rejected", rejected_by: cap(by), rejected_at: now });
  if (action === "edit") {
    const t = String(text || "").trim().slice(0, 200);
    if (!t) return { ok: false, error: "edit needs text" };
    const s = String(say_it_as || t).trim().slice(0, 200);
    const bad = condition(t) || condition(s);
    if (bad) return { ok: false, error: "SAY_IT_AS_A_PLATE_RULE", word: bad, why: `"${bad}" names a condition. Keep the plate rule only.` };
    Object.assign(f, { text: t, say_it_as: s, status: "confirmed", confirmed_by: cap(by), confirmed_at: now, edited_at: now });
    if (f.kind === "routine") f.data = parseRoutine(`${t} ${s}`) || f.data;
  }
  await save(m);
  await emit({ who: cap(by), name: f.who, fact_id: f.id, action, status: f.status, text: f.say_it_as, via, summary: `${cap(by)} ${action === "confirm" ? "confirmed" : action === "reject" ? "said no to" : "changed"}: ${f.say_it_as}` });
  return { ok: true, fact: f };
}

// The profile's rules, replacing the last profile save's facts. Facts that
// didn't change keep their id.
async function fromProfile(list, by) {
  const m = await load();
  const key = (f) => `${String(f.who).toLowerCase()}|${f.kind}|${norm(f.text)}`;
  const want = new Map();
  const refused = [];
  for (const f of list) {
    const bad = condition(f.text) || condition(f.say_it_as);
    if (bad) refused.push({ text: f.text, error: "SAY_IT_AS_A_PLATE_RULE", word: bad });
    else want.set(key(f), f);
  }
  const old = m.facts.filter((f) => f.source && f.source.via === "app" && f.source.ref === "profile");
  m.facts = m.facts.filter((f) => !(f.source && f.source.via === "app" && f.source.ref === "profile" && !want.has(key(f))));
  await save(m);
  const facts = [];
  for (const f of want.values()) {
    const kept = old.find((o) => key(o) === key(f));
    if (kept) { facts.push(kept); continue; }
    const r = await add({ ...f, via: "app", ref: "profile", by, status: "confirmed" }, { quiet: true });
    if (r.ok) facts.push(r.fact);
  }
  return { facts, refused };
}

// ---- patterns, once a day from the heartbeat. No LLM: counts over what
// rails already stored (vetoes in the event stream, who wished for the dish
// that lost in the kitchen's meals, attendance, what was bought).

async function patterns(today = istDate()) {
  const m = await load();
  // Attendance expires after 10 days; keep who was away (not routine marks).
  for (let i = 0; i <= 10; i++) {
    const d = shiftDay(today, -i + 1);
    const r = await store.get(`att:${d}`);
    if (r && Array.isArray(r.away)) m.away_log[d] = [...new Set(r.away.filter((a) => !a.auto).map((a) => a.name))];
  }
  await save(m);
  const proposed = [];
  const propose = async (f) => {
    const r = await add({ ...f, via: "pattern", ref: `patterns ${today}`, by: "Baari" });
    if (r.ok && !r.unchanged) proposed.push(r.fact);
  };
  const since14 = shiftDay(today, -14);
  // The same person vetoed the same dish twice in 14 days: a dislike.
  const vetoes = {};
  for (const e of await store.range("hh:events", 300)) {
    if (e.event !== "veto" || !e.who || !e.dish) continue;
    const d = String(e.at_ist || "").slice(0, 10);
    if (d < since14) continue;
    const k = `${e.who}|${e.dish}`;
    (vetoes[k] = vetoes[k] || new Set()).add(d);
  }
  for (const [k, ds] of Object.entries(vetoes)) {
    if (ds.size < 2) continue;
    const [who, dish] = k.split("|");
    await propose({ who, kind: "dislike", text: `not keen on ${dish}`, say_it_as: `${who} isn't keen on ${dish}`, evidence: [...ds].sort().map((d) => `vetoed ${dish} on ${d}`) });
  }
  // The same person wished for the dish that lost, twice in 14 days: they
  // want it (lost_by in lib/household.js is who asked for the runner-up).
  const k = (await store.get("kitchen")) || {};
  const lost = {};
  for (const meal of Object.values(k.meals || {})) {
    if (!meal || !meal.date_for || meal.date_for < since14 || !meal.runner_up) continue;
    for (const who of meal.lost_by || []) {
      const key = `${who}|${meal.runner_up}`;
      (lost[key] = lost[key] || new Set()).add(meal.date_for);
    }
  }
  for (const [key, ds] of Object.entries(lost)) {
    if (ds.size < 2) continue;
    const [who, dish] = key.split("|");
    await propose({ who, kind: "like", text: `keeps asking for ${dish}`, say_it_as: `${who} keeps asking for ${dish}`, evidence: [...ds].sort().map((d) => `wanted ${dish}, lost on ${d}`) });
  }
  // Away on the same weekday in 2 of the last 3 weeks: a routine.
  const away = {};
  for (let i = 1; i <= 21; i++) {
    const d = shiftDay(today, -i + 1);
    for (const name of m.away_log[d] || []) {
      const key = `${name}|${weekday(d)}`;
      (away[key] = away[key] || new Set()).add(d);
    }
  }
  for (const [key, ds] of Object.entries(away)) {
    if (ds.size < 2) continue;
    const [name, wd] = key.split("|");
    const day = DAYS[Number(wd)];
    await propose({ who: name, kind: "routine", text: `eats out on ${day}s`, say_it_as: `${name} eats out on ${day}s`, data: { weekday: Number(wd), away: true }, evidence: [...ds].sort().map((d) => `away on ${d}`) });
  }
  // An item bought on 3 nights in 14 days: a pantry fact.
  const bought = {};
  for (const meal of Object.values(k.meals || {})) {
    if (!meal || !meal.date_for || meal.date_for < since14) continue;
    for (const b of meal.bought || []) {
      if (!b || !b.item) continue;
      const item = String(b.item).toLowerCase();
      (bought[item] = bought[item] || new Set()).add(meal.date_for);
    }
  }
  for (const [item, ds] of Object.entries(bought)) {
    if (ds.size < 3) continue;
    await propose({ who: HOUSE, kind: "pantry", text: `${item} runs out often`, say_it_as: `Keep ${item} stocked: bought ${ds.size} times in two weeks`, evidence: [...ds].sort().map((d) => `bought for ${d}`) });
  }
  return { proposed };
}

// ---- asking: one Telegram line with Yes and No, at most one per person a
// day, never between 22:00 and 08:00 IST.

function quietHours(now = new Date()) {
  const h = Number(istString(now).slice(11, 13));
  return h >= 22 || h < 8;
}

async function askNext(now = new Date()) {
  if (quietHours(now)) return { quiet: true, sent: [] };
  const today = istDate(now);
  const m = await load();
  const asked = new Set(m.asks.filter((a) => a.date === today).map((a) => a.to.toLowerCase()));
  const sent = [];
  const ops = require("./ops");
  for (const f of m.facts) {
    if (f.status !== "proposed" || f.asked_at || f.ask_failed === today) continue;
    const to = confirmer(f);
    // The cook hears only Hindi voice notes; a guest isn't asked about the family.
    if (!to || same(to, COOK) || same(to, ops.GUEST) || asked.has(to.toLowerCase())) continue;
    const line = String(f.say_it_as || f.text).replace(/[.\s]+$/, "");
    const r = await require("./telegram").sendMessage({ to, text: `Should I remember this? ${line}.`, buttons: [[{ text: "Yes", data: `mem:yes:${f.id}` }, { text: "No", data: `mem:no:${f.id}` }]] });
    if (!r || !r.ok) {
      f.ask_failed = today;
      continue;
    }
    Object.assign(f, { asked_at: istString(now), asked_to: to });
    m.asks.push({ to, id: f.id, date: today, at_ist: istString(now) });
    asked.add(to.toLowerCase());
    sent.push({ to, id: f.id, text: line });
  }
  await save(m);
  for (const s of sent) await emit({ who: s.to, fact_id: s.id, action: "ask", status: "proposed", text: s.text, via: "telegram", summary: `Baari asked ${s.to}: ${s.text}` });
  return { quiet: false, sent };
}

// Once a minute from the heartbeat: the patterns once a day, then one ask.
async function tick(now = new Date()) {
  const today = istDate(now);
  let found = null;
  if (await store.setnx(`memory:patterns:${today}`, 1, 2 * 86400)) found = await patterns(today);
  const asked = await askNext(now);
  return { patterns: found, asked };
}

// ---- routines act: a confirmed "away on Thursdays" marks that person away
// for a Thursday's meal when SHORTLIST fires, once per night.
async function applyRoutines(date_for) {
  if (!date_for) return [];
  const m = await load();
  const att = require("./attendance");
  const members = await att.members();
  const out = [];
  for (const f of m.facts) {
    if (f.status !== "confirmed" || f.kind !== "routine" || !f.data || !f.data.away || f.data.weekday !== weekday(date_for)) continue;
    const name = members.find((x) => same(x, f.who));
    if (!name || !(await store.setnx(`routine:${date_for}:${name}`, 1, 3 * 86400))) continue;
    const r = await att.setAway({ name, date_for, by: att.allowed(name, name) ? name : "app", via: "memory", said: f.say_it_as, auto: true });
    if (r.ok && !r.unchanged) out.push(name);
  }
  return out;
}

// ---- reads

const VIA_LABEL = { app: "app", telegram: "Telegram", telegram_voice: "Telegram voice note", pattern: "pattern", agent: "agent", call: "call" };

// The LEARNED line for every task text: confirmed facts, newest first, at most 12.
async function learnedLine() {
  const m = await load();
  // Newest first; two facts confirmed in the same millisecond keep the later one first.
  const when = (f) => String(f.confirmed_at || f.source.at_ist);
  const facts = m.facts.map((f, i) => [f, i]).filter(([f]) => f.status === "confirmed").sort((x, y) => when(y[0]).localeCompare(when(x[0])) || y[1] - x[1]).map(([f]) => f).slice(0, 12);
  if (!facts.length) return "LEARNED: nothing confirmed yet.";
  return `LEARNED: ${facts.map((f) => `${f.who}: ${String(f.text).replace(/[.\s]+$/, "")} (confirmed, ${VIA_LABEL[f.source.via] || f.source.via})`).join(". ")}.`;
}

async function state() {
  const m = await load();
  const week = shiftDay(istDate(), -7);
  return {
    facts: m.facts.filter((f) => f.status !== "rejected").slice(-60).reverse().map(({ id, who, kind, text, say_it_as, status, source, evidence }) => ({ id, who, kind, text, say_it_as, status, source: { via: source.via, ref: source.ref, at_ist: source.at_ist }, evidence })),
    asked_week: m.asks.filter((a) => a.date > week).length,
    learned_week: m.facts.filter((f) => f.status === "confirmed" && String(f.confirmed_at || "").slice(0, 10) > week).length,
  };
}

// /yaad: what Baari remembers about one person.
async function about(who) {
  const m = await load();
  return m.facts.filter((f) => same(f.who, who) && f.status !== "rejected");
}

// Telegram: mem:yes:<id>, mem:no:<id>, mem:del:<id>. Returns the reply line.
async function onButton(role, data) {
  const t = /^mem:(yes|no|del):(.+)$/.exec(String(data || ""));
  if (!t) return null;
  const r = await act({ id: t[2], action: t[1] === "yes" ? "confirm" : "reject", by: role, via: "telegram" });
  if (!r.ok) return r.error === "NOT_ALLOWED" ? r.why : "That one isn't open any more.";
  if (t[1] === "yes") return `Noted: ${r.fact.say_it_as}.`;
  return t[1] === "del" ? `Forgotten: ${r.fact.say_it_as}.` : "Okay, I won't remember that.";
}

async function yaad(role) {
  const facts = await about(role);
  if (!facts.length) return { text: "I don't remember anything about you yet. Tell me what you like or don't, and I'll ask before I keep it.", buttons: null };
  const lines = facts.slice(-10).map((f, i) => `${i + 1}. ${f.say_it_as}${f.status === "proposed" ? " (not confirmed yet)" : ""}`);
  return { text: `What I remember about you:\n${lines.join("\n")}\n\nTap one to remove it.`, buttons: facts.slice(-10).map((f, i) => [{ text: `Remove ${i + 1}`, data: `mem:del:${f.id}` }]) };
}

module.exports = { add, act, fromProfile, patterns, askNext, tick, applyRoutines, learnedLine, state, about, onButton, yaad, condition, confirmer, quietHours, parseRoutine, KINDS };
