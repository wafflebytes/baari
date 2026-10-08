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
// 3. Dishes. The house nine, plus the dishes the family liked in /swaad or
//    the app's cuisine deck that have a recipe here (lib/cuisine.js). The
//    bridge refuses buttons for anything else (a clock run once offered
//    "Chole chawal" before it was a house dish). Plate rules bind per person:
//    Papa's potato only if he eats, a Jain member's onion only on their plate.

const store = require("./store");
const { istString, istDate } = require("./util");

// The house dishes, recipes for 4, from agent/kb/split (BAARI_dishes_all_sharma.md).
// prep is the night-before work lib/prep.js reads; buy is what the kirana
// doesn't stock. tags are added below from the recipe items.
const soakPrep = (item, qty_per_4, whistles) => [{ task: "soak", item, qty_per_4, hours_min: 8, quick: `Soak the ${item} in hot water for an hour, then pressure cook it ${whistles} whistles` }];
const HOUSE = {
  "Rajma chawal": { id: "rajma-chawal", recipe: { rajma: 250, rice: 400, tomato: 300, onion: 200, "ginger-garlic": 30 }, potato: false, egg: false, buy: "rajma", prep: soakPrep("rajma", 250, 6) },
  "Aloo puri": { id: "aloo-puri", recipe: { potato: 600, atta: 500, oil: 200 }, potato: true, egg: false, buy: null, prep: [] },
  "Lauki chana dal": { id: "lauki-chana-dal", recipe: { lauki: 1000, "chana dal": 200, tomato: 200 }, potato: false, egg: false, buy: "chana dal", prep: [] },
  "Palak paneer roti": { id: "palak-paneer-roti", recipe: { palak: 500, paneer: 250, atta: 400, onion: 100 }, potato: false, egg: false, buy: null, prep: [] },
  "Egg bhurji paratha": { id: "egg-bhurji-paratha", recipe: { egg: 8, atta: 400, onion: 150, tomato: 150 }, potato: false, egg: true, buy: null, prep: [] },
  // Curd only when the pantry's curd is low; otherwise there's nothing to set.
  "Kadhi chawal": { id: "kadhi-chawal", recipe: { curd: 500, besan: 100, rice: 400 }, potato: false, egg: false, buy: "besan", prep: [{ task: "set_curd", item: "curd", qty_per_4: 500, hours_min: 6, only_if_low: true, quick: "Buy curd at the kirana in the morning" }] },
  // Beyond the house six (section 12 step 13): dishes with prep the night
  // before. Ids match app/cuisine.js so the photos line up.
  "Chole chawal": { id: "chole-chawal", recipe: { chole: 250, rice: 400, tomato: 300, onion: 200, "ginger-garlic": 30 }, potato: false, egg: false, buy: "chole", prep: soakPrep("chole", 250, 7) },
  "Dal makhani jeera rice": { id: "dal-makhani", recipe: { urad: 200, rajma: 50, tomato: 300, onion: 150, "ginger-garlic": 30, rice: 400 }, potato: false, egg: false, buy: "urad", prep: soakPrep("urad", 200, 8) },
  "Idli sambar": { id: "idli-sambar", recipe: { "idli batter": 1000, "toor dal": 150, tomato: 200, onion: 100 }, potato: false, egg: false, buy: "idli batter", prep: [] },
};
const NAMES = Object.keys(HOUSE);

// Rule tags from the recipe items, so a rule filters every dish the same way.
// root is what a Jain kitchen also keeps out (carrot, and the bulbs above).
const TAG_ITEMS = {
  onion: ["onion", "spring onion", "salsa", "pizza sauce", "ramen noodles"],
  garlic: ["ginger-garlic", "kimchi", "gochujang", "schezwan sauce", "salsa", "pizza sauce", "ramen noodles"],
  potato: ["potato"],
  root: ["potato", "onion", "spring onion", "ginger-garlic", "carrot"],
  egg: ["egg"],
  dairy: ["paneer", "curd", "milk", "butter", "cheese", "cream", "mozzarella", "cheddar"],
  meat: [],
};
const tagsOf = (recipe, extra = []) => [...new Set([...Object.keys(TAG_ITEMS).filter((t) => Object.keys(recipe).some((i) => TAG_ITEMS[t].includes(i))), ...extra])].sort();

// Every dish rails knows: the house ones (house: true) and the cuisine
// catalog. A cuisine dish reaches a card only once someone liked it.
const DISHES = {};
for (const [name, d] of Object.entries(HOUSE)) DISHES[name] = { ...d, name, house: true, cuisine: name === "Idli sambar" ? "south" : "ghar", tags: tagsOf(d.recipe) };
for (const c of require("./cuisine").CATALOG) {
  if (DISHES[c.name]) continue;
  DISHES[c.name] = { id: c.id, name: c.name, recipe: c.recipe, potato: "potato" in c.recipe, egg: "egg" in c.recipe, buy: c.buy || null, prep: c.prep || [], house: false, cuisine: c.c, minutes: c.m, alias: c.alias || [], tags: tagsOf(c.recipe, c.tags) };
}
const ALL = Object.keys(DISHES);
const byId = (id) => Object.values(DISHES).find((d) => d.id === String(id || "").trim().toLowerCase()) || null;

// Pantry as of the KB snapshot (BAARI_pantry_*.md, 2 October). g, ml, or a
// count for eggs. Confidence low counts as zero when planning (prompt M2).
const SEED_PANTRY = {
  rice: [2000, "high"], atta: [3000, "high"], rajma: [0, "high"], "chana dal": [300, "medium"], besan: [400, "high"], oil: [1000, "high"],
  tomato: [100, "low"], onion: [500, "medium"], "ginger-garlic": [50, "medium"], potato: [1000, "high"], paneer: [0, "high"], palak: [0, "high"],
  lauki: [0, "high"], curd: [200, "low"], egg: [0, "high"], chole: [0, "high"], urad: [0, "high"], "toor dal": [300, "medium"], "idli batter": [0, "high"], milk: [1000, "medium"],
};
const SEED_DISHES = {
  "Rajma chawal": { last_cooked: "2026-09-27", last_lost_by: null },
  "Aloo puri": { last_cooked: "2026-09-21", last_lost_by: null },
  "Lauki chana dal": { last_cooked: "2026-09-30", last_lost_by: "Vinay" },
  "Palak paneer roti": { last_cooked: "2026-09-25", last_lost_by: "Papa" },
  "Egg bhurji paratha": { last_cooked: "2026-09-29", last_lost_by: null },
  "Kadhi chawal": { last_cooked: "2026-09-23", last_lost_by: null },
  "Chole chawal": { last_cooked: "2026-09-19", last_lost_by: null },
  "Dal makhani jeera rice": { last_cooked: "2026-09-14", last_lost_by: null },
  "Idli sambar": { last_cooked: "2026-09-17", last_lost_by: null },
};

// What Sharma Kirana sells in the morning (BAARI_shop_sharma_kirana.md). Dry
// staples (rajma, dal, rice, atta, besan) only come by Delhivery, and so does
// anything a lane kirana won't keep (each dish's buy).
const KIRANA = "Sharma Kirana";
// Fresh things the cuisine dishes need that a lane kirana does keep, Rs per kg
// (lib/kirana.js adds these to its rates).
const KIRANA_RATE_EXTRA = { potato: 30, capsicum: 80, cabbage: 30, carrot: 50, peas: 120, lemon: 100, coriander: 120, "spring onion": 80, butter: 560, cheese: 600, bread: 100, cream: 220 };
const KIRANA_STOCK = ["tomato", "onion", "palak", "paneer", "curd", "lauki", "egg", "ginger-garlic", "idli batter", "milk", ...Object.keys(KIRANA_RATE_EXTRA)];
// Baari staples hub rates, Rs per kg (dry staples ship by Delhivery), and Rs
// per piece for the counted breads.
const STAPLES_RATE = { rajma: 240, "chana dal": 120, rice: 70, atta: 50, besan: 110, chole: 140, urad: 160, "toor dal": 150, maida: 45, cornflour: 90, peanuts: 160, matki: 160, "hakka noodles": 200, penne: 300, macaroni: 250, "ramen noodles": 600, gochujang: 900, kimchi: 800, "schezwan sauce": 400, "dosa batter": 120, "puri shells": 300, farsan: 300, mozzarella: 700, cheddar: 900, "pizza sauce": 400, nachos: 500, salsa: 450 };
const PIECE_RATE = { pav: 5, "pizza base": 30, tortillas: 15, "taco shells": 20, "burger buns": 10 };
// Items counted in pieces, not grams.
const COUNT = new Set(["egg", ...Object.keys(PIECE_RATE)]);
const unitOf = (item) => (COUNT.has(item) ? "pc" : "g");
const KNOWN = new Set([...Object.values(DISHES).flatMap((d) => Object.keys(d.recipe)), ...Object.keys(SEED_PANTRY)]);

// Items in "rajma 250 g, tomato 300 g" that the kirana doesn't stock.
function notAtKirana(itemsDesc) {
  return String(itemsDesc || "")
    .split(/,|\band\b|\baur\b/i)
    .map((p) => p.trim().replace(/\s*[\d.].*$/, "").trim())
    .filter(Boolean)
    .filter((name) => !KIRANA_STOCK.includes(itemKey(name)));
}

// The plate and day rules rails holds. Built in, from the KB: no potato on
// Papa's plate (L3), no egg on Tuesdays. From the household profile when
// onboarding sends one: profile.jain or rules.jain (the whole house),
// members[].jain, members[].avoid (tags), rules.avoid {who: {food: 2}},
// profile.no_onion_days (["tue"] or [2]).
// who: prefs.cuisine.who, the people a liked dish is cooked for.
const JAIN = ["onion", "garlic", "potato", "root", "egg", "meat"];
const DAYKEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DEFAULT_RULES = { plates: { Papa: { tags: ["potato"], why: "there's no potato on Papa's plate" } }, days: { 2: { tags: ["egg", "meat"], why: "is a Tuesday" } }, who: [] };
async function ruleContext() {
  const ctx = JSON.parse(JSON.stringify(DEFAULT_RULES));
  const p = (await store.get("profile")) || {};
  const ms = Array.isArray(p.members) ? p.members.filter((m) => m && m.name) : [];
  const plate = (name, tags, why) => {
    const r = ctx.plates[name] || { tags: [], why };
    r.tags = [...new Set([...r.tags, ...tags])];
    if (!ctx.plates[name]) r.why = why;
    ctx.plates[name] = r;
  };
  const everyone = ms.length ? ms.map((m) => m.name) : require("./attendance").DEFAULT_EATERS;
  if (p.jain === true) for (const n of everyone) plate(n, JAIN, `${n}'s plate is Jain`);
  for (const m of ms) {
    if (m.jain) plate(m.name, JAIN, `${m.name}'s plate is Jain`);
    if (Array.isArray(m.avoid) && m.avoid.length) plate(m.name, m.avoid.map(String), `${m.name} doesn't eat it`);
  }
  // The profile from POST /app/profile (wafflebytes/baari#1) keeps these
  // under rules: jain, and avoid {who: {food: 1 less | 2 never}}.
  const r0 = p.rules || {};
  const FOOD_TAG = { aloo: "potato", potato: "potato", pyaaz: "onion", onion: "onion", lehsun: "garlic", garlic: "garlic", anda: "egg", egg: "egg", paneer: "dairy", dahi: "dairy" };
  if (r0.jain === true) for (const n of everyone) plate(n, JAIN, `${n}'s plate is Jain`);
  for (const [who, foods] of Object.entries(r0.avoid || {})) {
    const tags = Object.entries(foods || {}).filter(([, lvl]) => Number(lvl) >= 2).map(([f]) => FOOD_TAG[f]).filter(Boolean);
    const names = who === "all" ? everyone : everyone.filter((n) => n.toLowerCase() === who.toLowerCase());
    for (const n of names) if (tags.length) plate(n, tags, `${n} doesn't eat it`);
  }
  for (const d of p.no_onion_days || []) {
    const i = typeof d === "number" ? d : DAYKEYS.indexOf(String(d).slice(0, 3).toLowerCase());
    if (i < 0 || i > 6) continue;
    const r = ctx.days[i] || { tags: [], why: "is a no-onion day" };
    r.tags = [...new Set([...r.tags, "onion", "garlic"])];
    if (i === 2) r.why = "is a Tuesday, no egg and no onion";
    ctx.days[i] = r;
  }
  ctx.who = (((await require("./prefs").get()).cuisine || {}).who) || [];
  return ctx;
}

// A dish no family button may offer for that night. Returns the reason.
// away: names not eating that night; a plate rule binds only who eats (S1),
// and for a liked cuisine dish only who it's cooked for (ctx.who). Without a
// ctx, the built-in rules: potato off Papa's plate, egg off Tuesdays.
function ruleBreak(name, date_for, away = [], ctx = DEFAULT_RULES) {
  const n = dishName(name);
  const d = DISHES[n];
  if (!d) return null;
  for (const [person, r] of Object.entries(ctx.plates || {})) {
    if (away.includes(person)) continue;
    if (!d.house && ctx.who && ctx.who.length && !ctx.who.includes(person)) continue;
    const hit = r.tags.find((t) => d.tags.includes(t));
    if (hit) return `${n} has ${hit === "root" ? "root vegetables" : hit}, and ${r.why}`;
  }
  const day = date_for ? new Date(`${date_for}T12:00:00+05:30`).getUTCDay() : null;
  const dr = day === null ? null : (ctx.days || {})[day];
  const hit = dr && dr.tags.find((t) => d.tags.includes(t));
  if (hit) return `${n} has ${hit}, and ${date_for} ${dr.why}`;
  return null;
}

// The dishes a card may offer: the house nine, and the liked ones with a recipe.
async function menu() {
  const like = ((await require("./prefs").get()).cuisine || {}).like || [];
  return [...NAMES, ...like.map(byId).filter((d) => d && !d.house).map((d) => d.name)];
}
const onMenu = (s, m) => {
  const n = dishName(s);
  return !!n && m.includes(n);
};

// "lauki chana dal", "Lauki", "vote:lauki chana dal" -> "Lauki chana dal".
// Also ids ("korean-ramen") and aliases ("korean ramen"). The first-word
// match ("lauki") is for the house dishes only, so "Chole bhature" never
// reads as Chole chawal.
function dishName(s) {
  const t = String(s || "").toLowerCase().replace(/^(vote|pick|wish):/, "").trim();
  if (!t) return null;
  const exact = ALL.find((n) => n.toLowerCase() === t || DISHES[n].id === t || (DISHES[n].alias || []).includes(t));
  if (exact) return exact;
  const words = ALL.flatMap((n) => [n, ...(DISHES[n].alias || [])].map((w) => [w.toLowerCase(), n])).sort((a, b) => b[0].length - a[0].length);
  const inside = words.find(([w]) => t.includes(w));
  if (inside) return inside[1];
  return NAMES.find((n) => t.startsWith(n.toLowerCase().split(" ")[0])) || null;
}

const itemKey = (s) => {
  const t = String(s || "").toLowerCase().trim();
  if (KNOWN.has(t)) return t;
  if (KNOWN.has(t.replace(/s$/, ""))) return t.replace(/s$/, "");
  if (KNOWN.has(t.replace(/es$/, ""))) return t.replace(/es$/, "");
  if (/ginger|garlic|adrak|lehsun/.test(t)) return "ginger-garlic";
  if (/chole|kabuli/.test(t)) return "chole";
  if (/urad/.test(t)) return "urad";
  if (/toor|arhar/.test(t)) return "toor dal";
  if (/idli|^batter$/.test(t)) return "idli batter";
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
  // A kitchen saved before a dish was added has no history for it; the seed
  // fills the gap (Chole chawal on 8 Oct crashed every demo start).
  k.dishes = { ...SEED_DISHES, ...(k.dishes || {}) };
  return applyDue(k);
}

// A night counts as cooked once its morning is over (10:00 IST on date_for),
// or when COOK_REPLY saves. Each night is applied once.
async function applyDue(k, force) {
  const now = istString();
  const today = istDate();
  let changed = false;
  for (const [key, m] of Object.entries(k.meals || {})) {
    if (m.applied) continue;
    const date_for = m.date_for || key;
    const due = force === key || date_for < today || (date_for === today && now.slice(11, 16) >= "10:00");
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
    else if (DISHES[m.dish]) k.dishes[m.dish] = { last_cooked: date_for, last_lost_by: null };
    if (m.runner_up && k.dishes[m.runner_up] && m.lost_by && m.lost_by.length) k.dishes[m.runner_up].last_lost_by = m.lost_by.join(", ");
    m.applied = now;
    k.as_of = now.slice(0, 16).replace("T", " ");
    changed = true;
  }
  // Keep two weeks of nights.
  const keep = Object.keys(k.meals || {}).sort().slice(-20);
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
  // One record per night. A second night on the same date (a test night, a
  // second dinner) gets its own key once the first is cooked.
  const same = Object.keys(k.meals).filter((x) => (k.meals[x].date_for || x) === handoff.date_for);
  const open = same.find((x) => !k.meals[x].applied);
  const key = open || (same.length ? `${handoff.date_for}#${same.length + 1}` : handoff.date_for);
  k.meals[key] = { date_for: handoff.date_for, dish, runner_up, holder: (handoff.turn && handoff.turn.holder) || null, lost_by, bought, applied: false };
  await store.set("kitchen", k);
  return k;
}

// COOK_REPLY saved: the night is cooked now. A dish switched in the morning
// (K3) replaces the locked one.
async function recordCooked(handoff) {
  if (!handoff || !handoff.date_for) return null;
  const k = await kitchen();
  const key = Object.keys(k.meals || {}).find((x) => (k.meals[x].date_for || x) === handoff.date_for && !k.meals[x].applied);
  if (!key) return null;
  const m = k.meals[key];
  const now = dishName(handoff.locked && handoff.locked.winner);
  if (now && now !== m.dish) m.dish = now;
  return applyDue(k, key);
}

// The read the agent gets: pantry rows (low confidence marked) and dishes.
async function kitchenView() {
  const k = await kitchen();
  const pantry = Object.entries(k.pantry).map(([item, p]) => `${item} ${p.qty}${COUNT.has(item) ? "" : item === "oil" ? " ml" : " g"}${p.confidence === "low" ? " (low)" : ""}`).join(", ");
  const dishes = NAMES.map((n) => `${n} | last cooked ${k.dishes[n].last_cooked || "never"} | last lost by ${k.dishes[n].last_lost_by || "none"}`).join("; ");
  const pending = Object.entries(k.meals || {}).filter(([, m]) => !m.applied).map(([d, m]) => `${m.date_for || d} ${m.dish}`);
  return { as_of: k.as_of, pantry, dishes, not_cooked_yet: pending.join(", ") || "none", kirana_stock: `${KIRANA} sells ${KIRANA_STOCK.join(", ")}. Nothing else: no rajma, chole, urad, dal, rice, atta or besan.`, staples_rates: `Baari staples hub, Rs per kg: ${Object.entries(STAPLES_RATE).map(([i, r]) => `${i} ${r}`).join(", ")}. Rs per piece: ${Object.entries(PIECE_RATE).map(([i, r]) => `${i} ${r}`).join(", ")}`, raw: k };
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
// The open Haan/Nahi ask, if this tap answers it.
async function clearAsk(reference) {
  const a = await store.get("hh:ask");
  if (a && a.reference === reference) await store.del("hh:ask");
}

async function onButton(role, data) {
  if (role !== "Vinay" && !(role === "Mehmaan" && (await require("./ops").approver()) === "Mehmaan")) return null;
  const d = String(data || "").trim();
  let m;
  if ((m = d.match(/^approve:(.+)$/i))) {
    await store.set(`approval:${m[1].trim()}`, { at: istString() }, APPROVAL_TTL);
    await clearAsk(m[1].trim());
    return { approved: m[1].trim() };
  }
  if (/^haan\b/i.test(d)) {
    await store.set("approval:any", { at: istString() }, APPROVAL_TTL);
    return { approved: "next" };
  }
  if ((m = d.match(/^(deny|nahi)(?::(.+))?$/i))) {
    if (m[2]) await store.del(`approval:${m[2].trim()}`);
    if (m[2]) await clearAsk(m[2].trim());
    // A No on a Pine Labs pay link: the app shows it declined too (PL2).
    if (m[2]) await require("./pinelabs_uat").decline(m[2].trim(), role, "telegram").catch(() => null);
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

// What tonight's dish needs that the kitchen doesn't have, worked out on
// rails from the live pantry, so BUY never misses a staple or orders 0 g
// (T1, 8 October: kadhi chawal went without besan and rice). Quantities are
// for 4 in DISHES, scaled by who's eating and rounded up to 50 g. A low
// confidence count is treated as zero, as prompt M2 says. A liked cuisine
// dish is scaled to the plates it's cooked for (who and EATING); the rest
// get the house thali, which the CUISINE line costs separately.
async function needs(dish, headcount = 4, date_for) {
  const name = dishName(dish);
  const d = DISHES[name];
  if (!d) return null;
  if (!d.house) {
    const s = await require("./cuisine").plates(date_for || (await require("./attendance").nextDate())).catch(() => null);
    if (s && s.eaters.length) headcount = s.eaters.length;
  }
  const k = await kitchen();
  const scale = Math.max(1, headcount) / 4;
  const buy = [], home = [];
  for (const [item, per4] of Object.entries(d.recipe)) {
    const need = COUNT.has(item) ? Math.ceil(per4 * scale) : Math.ceil((per4 * scale) / 50) * 50;
    const p = k.pantry[item] || { qty: 0, confidence: "high" };
    const have = p.confidence === "low" ? 0 : Number(p.qty) || 0;
    if (have >= need) { home.push(item); continue; }
    const short = COUNT.has(item) ? need - have : Math.ceil((need - have) / 50) * 50;
    buy.push({ item, qty: short, unit: unitOf(item), have, route: KIRANA_STOCK.includes(item) ? "kirana" : "delhivery" });
  }
  return { dish: name, headcount, buy, home };
}
async function needsLine(dish, headcount = 4, date_for) {
  const n = await needs(dish, headcount, date_for);
  if (!n) return null;
  const say = (b) => `${b.item} ${b.qty} ${b.unit} (kitchen has ${b.have} ${b.unit})`;
  const kir = n.buy.filter((b) => b.route === "kirana"), dl = n.buy.filter((b) => b.route === "delhivery");
  return `NEEDS (rails, from the live pantry, for ${n.dish} and ${n.headcount} eating): Sharma Kirana: ${kir.length ? kir.map(say).join(", ") : "nothing"}. Delhivery: ${dl.length ? dl.map(say).join(", ") : "nothing"}. Already at home: ${n.home.join(", ") || "nothing"}. Order exactly these; never put a 0 g line on an order.`;
}

module.exports = { needs, needsLine, ruleBreak, ruleContext, menu, onMenu, byId, itemKey, KIRANA, KIRANA_STOCK, KIRANA_RATE_EXTRA, notAtKirana, DISHES, NAMES, ALL, dishName, kitchen, kitchenView, recordLock, recordCooked, setKitchen, onButton, takeApproval, BIG_DEBIT };
