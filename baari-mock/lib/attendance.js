// Who's eating (handoff section 12 step 1, S6). One record per date_for:
//   { date_for, away: [{name, by, via, said, at_ist, auto}], guests, changed_after }
// eating comes from the household's members minus whoever is away;
// headcount = eating + guests. Rails keeps the record and the guard; the
// agent decides what the change means for the night (prompt v13 A1 to A5).

const store = require("./store");
const { istString, istDate } = require("./util");
const shiftDay = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

// The KB household until onboarding sends a profile: the younger sister has
// no name in the KB, so she's "Behen".
const DEFAULT_EATERS = ["Vinay", "Mummy", "Papa", "Behen"];
const FAMILY_ROLES = ["Vinay", "Mummy", "Papa", "Behen"];
const TTL = 10 * 86400;

async function members() {
  const p = await store.get("profile");
  const ms = p && Array.isArray(p.members) ? p.members.filter((m) => m && m.name && m.eats !== false).map((m) => m.name) : [];
  return ms.length ? ms : DEFAULT_EATERS;
}

// The meal Baari plans next: tonight's turn, else the last handoff's, else tomorrow.
async function nextDate() {
  const t = (await store.get("turn")) || {};
  if (t.tonight && t.tonight.date_for) return t.tonight.date_for;
  const h = (await store.get("handoff:last")) || {};
  if (h.date_for && h.date_for >= istDate()) return h.date_for;
  return shiftDay(istDate(), 1);
}

async function raw(date_for) {
  return (await store.get(`att:${date_for}`)) || { date_for, away: [], guests: 0, changed_after: null };
}

async function view(date_for) {
  const d = date_for || (await nextDate());
  const r = await raw(d);
  const all = await members();
  const out = new Set(r.away.map((a) => a.name));
  const eating = all.filter((n) => !out.has(n));
  const headcount = eating.length + (r.guests || 0);
  return { date_for: d, eating, away: r.away, guests: r.guests || 0, headcount: eating.length || r.guests ? headcount : 0, changed_after: r.changed_after || null };
}

// The phase already done for that night, as the app reads it.
async function phaseDone(date_for) {
  const h = (await store.get("handoff:last")) || {};
  if (h.date_for !== date_for) return { done: null, raw: null };
  const p = String(h.phase_done || "").toUpperCase();
  const done = p === "LOCK" ? "LOCK" : p === "BUY" || p === "CHECK" ? "BUY" : p === "BRIEF" || p === "COOK_REPLY" ? "BRIEF" : null;
  return { done, raw: p || null };
}

function line(v) {
  const away = v.away.map((a) => `${a.name} (${a.by || "?"}, ${a.via || "?"}${a.at_ist ? `, ${String(a.at_ist).slice(11, 16)}` : ""}${a.auto ? ", routine" : ""})`);
  return `EATING ${v.headcount} for ${v.date_for}: ${v.eating.join(", ") || "nobody"}.${away.length ? ` Away: ${away.join("; ")}.` : ""} Guests ${v.guests}.`;
}

// Who may mark whom. Any family member: anyone in the family. Mehmaan: only
// themselves. Sunita: never a family member (the agent asks that person or
// Vinay first, prompt A5).
function allowed(by, name) {
  if (!by) return true;
  if (by === "Sunita") return false;
  if (by === "Mehmaan") return name === "Mehmaan";
  return FAMILY_ROLES.includes(by) || by === "app";
}

async function save(r) {
  await store.set(`att:${r.date_for}`, r, TTL);
}

// {name, date_for?, back?, by, via?, said?, auto?}
async function setAway(b) {
  const name = String(b.name || "").trim();
  if (!name) return { ok: false, error: "name is required" };
  const all = await members();
  if (!all.includes(name)) return { ok: false, error: `${name} isn't someone who eats at home (${all.join(", ")})` };
  if (!allowed(b.by, name)) return { ok: false, error: "NOT_ALLOWED", why: `${b.by} can't mark ${name}. Ask ${name} or Vinay to confirm` };
  const date_for = b.date_for || (await nextDate());
  const r = await raw(date_for);
  const had = r.away.some((a) => a.name === name);
  if (b.back) r.away = r.away.filter((a) => a.name !== name);
  else if (!had) r.away.push({ name, by: b.by || null, via: b.via || "app", said: b.said ? String(b.said).slice(0, 200) : null, at_ist: istString(), auto: !!b.auto });
  else return { ok: true, unchanged: true, attendance: await view(date_for) };
  if (b.back && !had) return { ok: true, unchanged: true, attendance: await view(date_for) };
  const ph = await phaseDone(date_for);
  r.changed_after = ph.done;
  await save(r);
  const v = await view(date_for);
  await require("./events").emit("away", { who: b.by || null, name, back: !!b.back, via: b.via || "app", said: b.said || null, date_for, n: v.headcount });
  return { ok: true, attendance: v, phase_done: ph.raw };
}

// {n, date_for?, by}
async function setGuests(b) {
  const n = Math.max(0, Math.min(20, Math.round(Number(b.n) || 0)));
  if (b.by === "Sunita") return { ok: false, error: "NOT_ALLOWED", why: "Sunita can't change the guest count. Ask Vinay" };
  const date_for = b.date_for || (await nextDate());
  const r = await raw(date_for);
  if ((r.guests || 0) === n) return { ok: true, unchanged: true, attendance: await view(date_for) };
  r.guests = n;
  const ph = await phaseDone(date_for);
  r.changed_after = ph.done;
  await save(r);
  const v = await view(date_for);
  await require("./events").emit("guests", { who: b.by || null, n, via: b.via || "app", date_for });
  return { ok: true, attendance: v, phase_done: ph.raw };
}

// What the night does about a change (section 12 step 1.2). Before SHORTLIST
// and between LOCK and BUY: nothing, the next phase reads EATING. After the
// shortlist, after BUY and after the brief: wake INBOX with a line.
function wakeFor(phase_done, v) {
  const l = line(v);
  if (phase_done === "SHORTLIST") return `EATING CHANGED: ${l}`;
  if (phase_done === "BUY" || phase_done === "CHECK") return `EATING CHANGED AFTER BUY: ${l}`;
  if (phase_done === "BRIEF" || phase_done === "COOK_REPLY") return `EATING CHANGED AFTER BRIEF: ${l}`;
  return null;
}

async function react(result, base, from) {
  if (!result || !result.ok || result.unchanged) return null;
  const extra = wakeFor(result.phase_done, result.attendance);
  if (!extra) return null;
  const wake = require("./wake");
  wake.later(wake.tick("eating changed", base, { phase: "INBOX", from: from || "Vinay", date_for: result.attendance.date_for, extra }));
  return extra;
}

module.exports = { view, line, setAway, setGuests, react, wakeFor, members, nextDate, allowed, DEFAULT_EATERS };
