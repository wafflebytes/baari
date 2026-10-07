// The household's own rules and memory, kept on rails so they hold whatever
// the model does. Three parts:
//
// 1. Kitchen. The pantry, and when each dish was last cooked and who last
//    wanted it and didn't get it. The KB only has the 2 October snapshot;
//    this is the live copy. After a night is cooked, what was bought goes in
//    and the recipe comes out. The agent reads it with get_voice "hh.kitchen".
// 2. Spend approvals. A single debit over Rs 300 needs Vinay's yes (household
//    rule, prompt M5). His "Haan" button tap is stored here; the bridge
//    refuses a big debit without one.
// 3. Dishes. Only the six household dishes exist; the bridge refuses buttons
//    for anything else (a clock run once offered "Chole chawal").

const store = require("./store");
const { istString, istDate } = require("./util");

// The six dishes, recipes for 4, from agent/kb/split (BAARI_dishes_all_sharma.md).
const DISHES = {
  "Rajma chawal": { recipe: { rajma: 250, rice: 400, tomato: 300, onion: 200, "ginger-garlic": 30 }, potato: false, egg: false },
  "Aloo puri": { recipe: { potato: 600, atta: 500, oil: 200 }, potato: true, egg: false },
  "Lauki chana dal": { recipe: { lauki: 1000, "chana dal": 200, tomato: 200 }, potato: false, egg: false },
  "Palak paneer roti": { recipe: { palak: 500, paneer: 250, atta: 400, onion: 100 }, potato: false, egg: false },
  "Egg bhurji paratha": { recipe: { egg: 8, atta: 400, onion: 150, tomato: 150 }, potato: false, egg: true },
  "Kadhi chawal": { recipe: { curd: 500, besan: 100, rice: 400 }, potato: false, egg: false },
};
const NAMES = Object.keys(DISHES);

// Pantry as of the KB snapshot (BAARI_pantry_*.md, 2 October). g, ml, or a
// count for eggs. Confidence low counts as zero when planning (prompt M2).
const SEED_PANTRY = {
  rice: [2000, "high"], atta: [3000, "high"], rajma: [0, "high"], "chana dal": [300, "medium"], besan: [400, "high"], oil: [1000, "high"],
  tomato: [100, "low"], onion: [500, "medium"], "ginger-garlic": [50, "medium"], potato: [1000, "high"], paneer: [0, "high"], palak: [0, "high"],
  lauki: [0, "high"], curd: [200, "low"], egg: [0, "high"],
};
const SEED_DISHES = {
  "Rajma chawal": { last_cooked: "2026-09-27", last_lost_by: null },
  "Aloo puri": { last_cooked: "2026-09-21", last_lost_by: null },
  "Lauki chana dal": { last_cooked: "2026-09-30", last_lost_by: "Vinay" },
  "Palak paneer roti": { last_cooked: "2026-09-25", last_lost_by: "Papa" },
  "Egg bhurji paratha": { last_cooked: "2026-09-29", last_lost_by: null },
  "Kadhi chawal": { last_cooked: "2026-09-23", last_lost_by: null },
};

// "lauki chana dal", "Lauki", "vote:lauki chana dal" -> "Lauki chana dal".
function dishName(s) {
  const t = String(s || "").toLowerCase().replace(/^(vote|pick|wish):/, "").trim();
  if (!t) return null;
  return NAMES.find((n) => n.toLowerCase() === t) || NAMES.find((n) => t.includes(n.toLowerCase())) || NAMES.find((n) => t.startsWith(n.toLowerCase().split(" ")[0])) || null;
}

const itemKey = (s) => {
  const t = String(s || "").toLowerCase().trim();
  if (/ginger|garlic|adrak|lehsun/.test(t)) return "ginger-garlic";
  if (/chana/.test(t)) return "chana dal";
  if (/eggs?|anda/.test(t)) return "egg";
  return t.replace(/s$/, "");
};
const qtyOf = (m) => Number(m.qty_g ?? m.qty_ml ?? m.qty ?? m.count ?? m.quantity ?? 0) || 0;

// ---- kitchen

async function kitchen() {
  let k = await store.get("kitchen");
  if (!k) {
    k = { as_of: "2026-10-02", pantry: Object.fromEntries(Object.entries(SEED_PANTRY).map(([i, [q, c]]) => [i, { qty: q, confidence: c }])), dishes: SEED_DISHES, meals: {} };
    await store.set("kitchen", k);
  }
  return applyDue(k);
}

// A night counts as cooked once its morning is over (10:00 IST on date_for),
// or when COOK_REPLY saves. Each night is applied once.
async function applyDue(k, force) {
  const now = istString();
  const today = istDate();
  let changed = false;
  for (const [date_for, m] of Object.entries(k.meals || {})) {
    if (m.applied) continue;
    const due = force === date_for || date_for < today || (date_for === today && now.slice(11, 16) >= "10:00");
    if (!due) continue;
    for (const it of m.bought || []) {
      const key = itemKey(it.item);
      const p = k.pantry[key] || { qty: 0, confidence: "high" };
      k.pantry[key] = { qty: p.confidence === "low" ? it.qty : p.qty + it.qty, confidence: "high" };
    }
    const recipe = (DISHES[m.dish] || {}).recipe || {};
    for (const [item, q] of Object.entries(recipe)) {
      const p = k.pantry[item] || { qty: 0, confidence: "high" };
      k.pantry[item] = { qty: Math.max(0, p.qty - q), confidence: p.confidence };
    }
    if (k.dishes[m.dish]) k.dishes[m.dish].last_cooked = date_for;
    if (m.runner_up && k.dishes[m.runner_up] && m.lost_by && m.lost_by.length) k.dishes[m.runner_up].last_lost_by = m.lost_by.join(", ");
    m.applied = now;
    k.as_of = now.slice(0, 16).replace("T", " ");
    changed = true;
  }
  // Keep two weeks of nights.
  const keep = Object.keys(k.meals || {}).sort().slice(-14);
  for (const d of Object.keys(k.meals || {})) if (!keep.includes(d)) delete k.meals[d];
  if (changed) await store.set("kitchen", k);
  return k;
}

// After LOCK: tomorrow's dish, what's being bought, and who wished for the
// runner-up (they "lost" it, which makes it likelier on the next shortlist).
async function recordLock(handoff, cursor) {
  if (!handoff || !handoff.date_for || !handoff.locked || !handoff.locked.winner) return null;
  const k = await kitchen();
  const dish = dishName(handoff.locked.winner) || handoff.locked.winner;
  const runner_up = dishName(handoff.locked.runner_up);
  const ups = (await store.range("tg:updates", 500)).filter((u) => u.update_id > Number(cursor || 0) && u.role && ["button", "text"].includes(u.kind));
  const latest = {};
  for (const u of [...ups].reverse()) latest[u.role] = u; // oldest first, so the newest wins
  const lost_by = Object.values(latest).filter((u) => runner_up && dishName(u.button_data || u.text) === runner_up).map((u) => u.role);
  const bought = (handoff.missing || []).filter((m) => m && m.item && !/none|skip|dropped/i.test(m.route || "")).map((m) => ({ item: m.item, qty: qtyOf(m), route: m.route || null }));
  k.meals = k.meals || {};
  if (k.meals[handoff.date_for] && k.meals[handoff.date_for].applied) return k;
  k.meals[handoff.date_for] = { dish, runner_up, holder: (handoff.turn && handoff.turn.holder) || null, lost_by, bought, applied: false };
  await store.set("kitchen", k);
  return k;
}

// COOK_REPLY saved: the night is cooked now. A dish switched in the morning
// (K3) replaces the locked one.
async function recordCooked(handoff) {
  if (!handoff || !handoff.date_for) return null;
  const k = await kitchen();
  const m = k.meals && k.meals[handoff.date_for];
  if (!m || m.applied) return null;
  const now = dishName(handoff.locked && handoff.locked.winner);
  if (now && now !== m.dish) m.dish = now;
  return applyDue(k, handoff.date_for);
}

// The read the agent gets: pantry rows (low confidence marked) and dishes.
async function kitchenView() {
  const k = await kitchen();
  const pantry = Object.entries(k.pantry).map(([item, p]) => `${item} ${p.qty}${item === "egg" ? "" : item === "oil" ? " ml" : " g"}${p.confidence === "low" ? " (low)" : ""}`).join(", ");
  const dishes = NAMES.map((n) => `${n} | last cooked ${k.dishes[n].last_cooked || "never"} | last lost by ${k.dishes[n].last_lost_by || "none"}`).join("; ");
  const pending = Object.entries(k.meals || {}).filter(([, m]) => !m.applied).map(([d, m]) => `${d} ${m.dish}`);
  return { as_of: k.as_of, pantry, dishes, not_cooked_yet: pending.join(", ") || "none", raw: k };
}

async function setKitchen(body) {
  if (body.reset) await store.del("kitchen");
  const k = await kitchen();
  if (body.pantry) for (const [item, v] of Object.entries(body.pantry)) k.pantry[itemKey(item)] = typeof v === "object" ? v : { qty: Number(v) || 0, confidence: "high" };
  await store.set("kitchen", k);
  return kitchenView();
}

// ---- spend approvals (prompt M5)

const APPROVAL_TTL = 12 * 3600;

// Vinay's button tap: "approve:<reference>" approves that payment, a plain
// "Haan" approves the next big one. "Nahi"/"deny:" clears them.
async function onButton(role, data) {
  if (role !== "Vinay") return null;
  const d = String(data || "").trim();
  let m;
  if ((m = d.match(/^approve:(.+)$/i))) {
    await store.set(`approval:${m[1].trim()}`, { at: istString() }, APPROVAL_TTL);
    return { approved: m[1].trim() };
  }
  if (/^haan\b/i.test(d)) {
    await store.set("approval:any", { at: istString() }, APPROVAL_TTL);
    return { approved: "next" };
  }
  if ((m = d.match(/^(deny|nahi)(?::(.+))?$/i))) {
    if (m[2]) await store.del(`approval:${m[2].trim()}`);
    await store.del("approval:any");
    return { denied: m[2] ? m[2].trim() : "all" };
  }
  return null;
}

const BIG_DEBIT = 30000; // paise: Rs 300

// Before a debit over Rs 300: is there a yes from Vinay? Used once.
async function takeApproval(reference, amount_paise) {
  if (Number(amount_paise) <= BIG_DEBIT) return { ok: true, needed: false };
  if (reference && (await store.get(`approval:${reference}`))) {
    await store.del(`approval:${reference}`);
    return { ok: true, needed: true, by: "reference" };
  }
  if (await store.get("approval:any")) {
    await store.del("approval:any");
    return { ok: true, needed: true, by: "haan" };
  }
  return { ok: false, needed: true };
}

module.exports = { DISHES, NAMES, dishName, kitchen, kitchenView, recordLock, recordCooked, setKitchen, onButton, takeApproval, BIG_DEBIT };
