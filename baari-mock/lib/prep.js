// Night tasks (handoff section 12 step 12, G9). Some dishes need work the
// night before: rajma and chole soak for 8 hours, urad for dal makhani,
// curd sets from milk for 6. Rails works out whether the prep can happen
// tonight (so the agent doesn't do clock maths), sends the task to the
// person the agent names, reminds once, and marks it missed with a wake.
//
//   PREP line in SHORTLIST and LOCK task text: per candidate dish, possible or not and why
//   hh.task {dish, who}                       create and send tonight's task (bridge)
//   prep:<id> button, POST /app/prep {id, done, by}   mark it done
//   heartbeat: one reminder 30 min before by_ist, missed at by_ist + 45 min -> INBOX "PREP MISSED"

const store = require("./store");
const { istString, istDate } = require("./util");

// Per dish, for 4, from each dish's prep in lib/household.js DISHES. PREP
// holds the house dishes that need any (the SHORTLIST line covers these); a
// liked cuisine dish's prep comes through the CUISINE line (lib/cuisine.js).
const PREP = Object.fromEntries(Object.values(require("./household").DISHES).filter((d) => d.house && d.prep.length).map((d) => [d.name, d.prep]));
const VERB = { soak: "soak", ferment: "ferment", set_curd: "set", marinate: "marinate" };
const TTL = 3 * 86400;
const COOK = "Sunita";

// The deadline: the night before the meal, 22:30 (the cook comes at 08:00,
// and 8 hours of soak need to start by midnight; 22:30 leaves margin). On a
// demo night the whole thing is compressed to minutes.
async function deadline(date_for) {
  const dm = (await store.get("demo")) || {};
  if (dm.on) return { by_ist: istString(new Date(Date.now() + 4 * 60e3)), demo: true };
  const prev = new Date(Date.parse(`${date_for}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
  return { by_ist: `${prev}T22:30:00.000`, demo: false };
}

// Can this dish's prep happen tonight? Rails answers from the live pantry,
// the kirana's stock and who's home.
async function feasible(dish, date_for) {
  const hh = require("./household");
  const name = hh.dishName(dish);
  const steps = (hh.DISHES[name] || {}).prep || [];
  if (!steps.length) return { dish: name, needs: false };
  const k = await hh.kitchen();
  const att = await require("./attendance").view(date_for);
  const home = att.eating.filter((n) => n !== COOK && n !== "Mehmaan");
  const out = [];
  for (const s of steps) {
    const qty = Math.ceil((s.qty_per_4 * Math.max(1, att.headcount || 4)) / 4 / 50) * 50;
    const p = k.pantry[s.item] || { qty: 0, confidence: "high" };
    const have = p.confidence === "low" ? 0 : Number(p.qty) || 0;
    if (s.only_if_low && have >= qty) continue;
    const sold = hh.KIRANA_STOCK.includes(s.item) || (s.task === "set_curd" && hh.KIRANA_STOCK.includes("curd"));
    let why = null;
    if (s.task === "set_curd") {
      const milk = Number((k.pantry.milk || {}).qty) || 0;
      if (milk < 500) { out.push({ ...s, qty, have, possible: false, why: "no milk at home to set curd, so buy curd at the kirana" }); continue; }
    } else if (have < qty) {
      why = sold ? null : `${s.item} in kitchen ${have} g${p.confidence === "low" ? " (low)" : ""}, the kirana doesn't stock it and Delhivery lands at 07:00`;
    }
    if (!why && !home.length) why = "nobody is home tonight except the cook";
    out.push({ ...s, qty, have, possible: !why, why, home });
  }
  return { dish: name, needs: out.length > 0, steps: out };
}

async function line(dishes, date_for) {
  const parts = [];
  const d = await deadline(date_for);
  for (const dish of dishes) {
    const f = await feasible(dish, date_for);
    if (!f.dish || !f.needs) continue;
    for (const s of f.steps) {
      const by = String(d.by_ist).slice(11, 16);
      parts.push(`${f.dish} needs ${s.item} ${VERB[s.task]} by ${by} (${s.hours_min} h): ${s.possible ? `possible tonight, ${s.item} ${s.qty} g, someone home: ${s.home.join(", ")}` : `not possible tonight: ${s.why}`}`);
    }
  }
  return parts.length ? `PREP: ${parts.join("; ")}.` : "PREP: none of tonight's dishes needs prep.";
}

async function get(date_for) {
  return (await store.get(`prep:${date_for}`)) || { date_for, tasks: [], plan_b: null };
}
async function save(p) {
  await store.set(`prep:${p.date_for}`, p, TTL);
}

// hh.task {dish, who}: the agent names who; rails checks they're home and
// eating and not the cook, sends the task with a done button, and logs it.
async function create({ dish, who, date_for }) {
  const hh = require("./household");
  const day = date_for || (await require("./attendance").nextDate());
  const att = await require("./attendance").view(day);
  if (!who || who === COOK) return { ok: false, error: "fail:NOT_ALLOWED the cook never gets a night task. Pick someone home tonight" };
  if (!att.eating.includes(who)) return { ok: false, error: `fail:NOT_HOME ${who} isn't eating at home tonight (${att.eating.join(", ")})` };
  const f = await feasible(dish, day);
  if (!f.needs) return { ok: false, error: `${f.dish || dish} needs no prep` };
  const step = f.steps.find((s) => s.possible);
  if (!step) return { ok: false, error: `fail:NOT_POSSIBLE ${f.steps.map((s) => s.why).join("; ")}` };
  const p = await get(day);
  const open = p.tasks.find((t) => t.dish === f.dish && t.status === "open");
  if (open) return { ok: true, duplicate: true, task: open };
  const d = await deadline(day);
  const t = { id: `t${Date.now().toString(36)}`, dish: f.dish, task: step.task, item: step.item, qty_g: step.qty, by_ist: d.by_ist, who, status: "open", done_by: null, via: null, at_ist: null, reminded: false, quick: step.quick };
  p.tasks.push(t);
  p.plan_b = step.quick;
  await save(p);
  const by = String(d.by_ist).slice(11, 16);
  const text = `For tomorrow's ${f.dish}: please ${VERB[step.task]} ${step.qty} g ${step.item} by ${by}.${step.task === "soak" ? " Plenty of water, it doubles." : ""}`;
  const sent = await require("./telegram").sendMessage({ to: who, text, buttons: [[{ text: step.task === "soak" ? "Soaked ✓" : "Done ✓", data: `prep:${t.id}` }]] });
  await require("./events").emit("prep_ask", { who, to: who, dish: f.dish, task: step.task, item: step.item, by_ist: d.by_ist, text });
  return { ok: true, task: t, sent: !!(sent && sent.ok) };
}

async function done({ id, by, via }) {
  for (const day of [await require("./attendance").nextDate(), istDate()]) {
    const p = await get(day);
    const t = p.tasks.find((x) => x.id === id);
    if (!t) continue;
    if (t.status === "done") return { ok: true, already: true, task: t };
    if (by && by !== t.who && t.status !== "open") return { ok: false, error: "only the person it's for, or anyone while it's open" };
    t.status = "done"; t.done_by = by || t.who; t.via = via || "telegram"; t.at_ist = istString();
    await save(p);
    await require("./events").emit("prep_done", { who: t.done_by, dish: t.dish, task: t.task, item: t.item, via: t.via });
    return { ok: true, task: t };
  }
  return { ok: false, error: `no task ${id}` };
}

// From the minute heartbeat: one reminder 30 minutes before (1 on a demo
// night), and missed 45 minutes after the deadline (2 on a demo night).
async function tick(base) {
  const day = await require("./attendance").nextDate();
  const p = await get(day);
  if (!p.tasks.some((t) => t.status === "open")) return null;
  const dm = (await store.get("demo")) || {};
  const now = Date.now();
  const at = (iso) => Date.parse(String(iso).replace(" ", "T") + (/[+Z]/.test(String(iso).slice(10)) ? "" : "+05:30"));
  let changed = false;
  for (const t of p.tasks.filter((x) => x.status === "open")) {
    const by = at(t.by_ist);
    if (!t.reminded && now >= by - (dm.on ? 60e3 : 30 * 60e3)) {
      t.reminded = true; changed = true;
      await require("./telegram").sendMessage({ to: t.who, text: `Reminder: ${t.qty_g} g ${t.item} for tomorrow's ${t.dish}, by ${String(t.by_ist).slice(11, 16)}.`, buttons: [[{ text: t.task === "soak" ? "Soaked ✓" : "Done ✓", data: `prep:${t.id}` }]] }).catch(() => null);
    }
    if (now >= by + (dm.on ? 2 * 60e3 : 45 * 60e3)) {
      t.status = "missed"; changed = true;
      await require("./events").emit("prep_missed", { who: t.who, dish: t.dish, task: t.task, item: t.item });
      const wake = require("./wake");
      wake.later(wake.tick("prep missed", base, { phase: "INBOX", from: t.who, date_for: day, extra: `PREP MISSED: nobody marked "${t.item} ${t.task}" done for ${t.dish} by ${String(t.by_ist).slice(11, 16)}. Quick plan: ${t.quick}.` }));
    }
  }
  if (changed) await save(p);
  return changed;
}

async function view(date_for) {
  const p = await get(date_for || (await require("./attendance").nextDate()));
  return { date_for: p.date_for, tasks: p.tasks.map(({ reminded, ...t }) => t), plan_b: p.plan_b };
}

// The brief's prep status, for the task text of BRIEF.
async function briefLine(date_for) {
  const p = await get(date_for);
  if (!p.tasks.length) return null;
  return `PREP STATUS: ${p.tasks.map((t) => `${t.item} ${t.task} for ${t.dish}: ${t.status === "done" ? `done by ${t.done_by} at ${String(t.at_ist).slice(11, 16)}` : t.status === "missed" ? `missed, so the brief carries the quick plan: ${t.quick}` : "not marked done yet"}`).join("; ")}. Say only this about the prep; never claim a soak that isn't marked done.`;
}

module.exports = { PREP, feasible, line, create, done, tick, view, briefLine, deadline };
