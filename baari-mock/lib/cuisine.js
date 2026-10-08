// Taste picks: the dishes beyond the house nine that someone in the family
// said yes to (prefs.cuisine, lib/prefs.js). Rails keeps the facts and the
// guard; the agent still decides what goes on the shortlist.
//
//   CATALOG        nine cuisines, 32 dishes, recipes for 4 in grams (ids match app/cuisine.js)
//   tonight(date)  may a liked dish be on tonight's shortlist, which one, for whom
//   taskLine()     the CUISINE line in the task text (wake.js), beside EATING and NEEDS
//   noteOffered()  a card offered a liked dish: counts toward the week (bridge tg.send)
//   swaad()        /swaad on Telegram: cuisines as toggles, then dishes one at a time
//
// Frequency (prefs.cuisine.freq): 1w at most one shortlist a week with a liked
// dish, 2w two, wknd only when the meal is on a Friday or Saturday, ask only
// when someone asked on Telegram that day. An ask lifts the week count too.
// Never more than one liked dish per shortlist; the other slot stays a house dish.

const store = require("./store");
const { istString } = require("./util");

// The nine cuisines, keys and names as app/cuisine.js has them. Thai, levant
// and bowls are out: no recipes for them on rails.
const CUISINES = [
  { k: "ghar", e: "🍛", n: "Ghar ka khana" },
  { k: "south", e: "🥞", n: "South Indian" },
  { k: "street", e: "🥙", n: "Street food" },
  { k: "indochinese", e: "🥡", n: "Indo-Chinese" },
  { k: "momos", e: "🥟", n: "Momos and thukpa" },
  { k: "italian", e: "🍝", n: "Italian" },
  { k: "mexican", e: "🌯", n: "Mexican" },
  { k: "korean", e: "🍜", n: "Korean" },
  { k: "cafe", e: "🥪", n: "Cafe at home" },
];
const KEYS = CUISINES.map((c) => c.k);

// Recipes for 4, in grams (eggs and the counted breads in pieces), main
// ingredients only, like the house dishes. buy: what a kirana won't have; it
// comes on the Delhivery parcel. prep: night-before work (lib/prep.js).
// tags: anything the recipe items don't already say (lib/household.js
// derives onion, garlic, potato, root, egg and dairy from the items).
const soak = (item, qty_per_4, whistles) => [{ task: "soak", item, qty_per_4, hours_min: 8, quick: `Soak the ${item} in hot water for an hour, then pressure cook it ${whistles} whistles` }];
const CATALOG = [
  { id: "chole-bhature", c: "ghar", name: "Chole bhature", m: 60, recipe: { chole: 250, maida: 400, curd: 100, onion: 150, tomato: 200, "ginger-garlic": 30, oil: 300 }, prep: soak("chole", 250, 7) },
  { id: "aloo-paratha", c: "ghar", name: "Aloo paratha", m: 35, recipe: { potato: 600, atta: 500, butter: 50, curd: 300 } },
  { id: "paneer-butter-masala", c: "ghar", name: "Paneer butter masala", m: 40, recipe: { paneer: 400, tomato: 400, butter: 50, cream: 100, onion: 150, "ginger-garlic": 30, atta: 400 } },
  { id: "masala-dosa", c: "south", name: "Masala dosa", m: 40, recipe: { "dosa batter": 1000, potato: 400, onion: 150, "toor dal": 150, tomato: 150 }, buy: "dosa batter" },
  { id: "curd-rice", c: "south", name: "Curd rice", m: 20, recipe: { rice: 300, curd: 600, milk: 100 } },
  { id: "lemon-rice", c: "south", name: "Lemon rice", m: 20, recipe: { rice: 400, lemon: 100, peanuts: 100, "chana dal": 30 } },
  { id: "pav-bhaji", c: "street", name: "Pav bhaji", m: 45, recipe: { pav: 8, potato: 400, tomato: 300, onion: 200, capsicum: 150, peas: 150, butter: 100, "ginger-garlic": 30 }, buy: "pav" },
  { id: "vada-pav", c: "street", name: "Vada pav", m: 40, recipe: { pav: 8, potato: 600, besan: 200, "ginger-garlic": 30, oil: 300 }, buy: "pav" },
  { id: "dahi-puri", c: "street", name: "Dahi puri", m: 25, recipe: { "puri shells": 150, potato: 300, curd: 500, onion: 100 }, buy: "puri shells" },
  { id: "misal-pav", c: "street", name: "Misal pav", m: 50, recipe: { matki: 250, pav: 8, farsan: 200, onion: 200, tomato: 200, "ginger-garlic": 30 }, buy: "pav, farsan", prep: soak("matki", 250, 3) },
  { id: "hakka-noodles", c: "indochinese", name: "Veg hakka noodles", m: 25, recipe: { "hakka noodles": 400, cabbage: 300, capsicum: 150, carrot: 150, "spring onion": 100, "ginger-garlic": 30 }, buy: "hakka noodles", alias: ["hakka noodles"] },
  { id: "chilli-paneer", c: "indochinese", name: "Chilli paneer", m: 30, recipe: { paneer: 400, capsicum: 200, onion: 200, cornflour: 50, "ginger-garlic": 30, rice: 400 } },
  { id: "manchurian-fried-rice", c: "indochinese", name: "Manchurian fried rice", m: 45, recipe: { cabbage: 300, carrot: 150, maida: 100, cornflour: 50, rice: 400, "spring onion": 100, "ginger-garlic": 30, capsicum: 100 }, alias: ["veg manchurian"] },
  { id: "schezwan-noodles", c: "indochinese", name: "Schezwan noodles", m: 25, recipe: { "hakka noodles": 400, "schezwan sauce": 150, cabbage: 200, capsicum: 150, carrot: 100, "ginger-garlic": 30 }, buy: "schezwan sauce, hakka noodles" },
  { id: "veg-momos", c: "momos", name: "Veg momos", m: 50, recipe: { maida: 400, cabbage: 400, carrot: 150, onion: 150, "ginger-garlic": 30, tomato: 200 }, alias: ["momos"] },
  { id: "paneer-momos", c: "momos", name: "Paneer momos", m: 50, recipe: { maida: 400, paneer: 300, onion: 150, "ginger-garlic": 30, tomato: 200 } },
  { id: "thukpa", c: "momos", name: "Veg thukpa", m: 30, recipe: { "hakka noodles": 300, cabbage: 200, carrot: 150, onion: 150, tomato: 150, "ginger-garlic": 30 }, buy: "hakka noodles", alias: ["thukpa"] },
  { id: "arrabbiata", c: "italian", name: "Penne arrabbiata", m: 25, recipe: { penne: 400, tomato: 600, onion: 100, "ginger-garlic": 30 }, buy: "penne", alias: ["pasta arrabbiata", "arrabbiata"] },
  { id: "white-sauce-pasta", c: "italian", name: "White sauce pasta", m: 25, recipe: { penne: 400, milk: 600, butter: 60, maida: 50, cheese: 100, capsicum: 150, "ginger-garlic": 20 }, buy: "penne" },
  { id: "tawa-pizza", c: "italian", name: "Tawa pizza", m: 30, recipe: { "pizza base": 4, mozzarella: 300, "pizza sauce": 150, capsicum: 150, onion: 150, tomato: 200 }, buy: "pizza base, mozzarella, pizza sauce" },
  { id: "mac-cheese", c: "italian", name: "Mac and cheese", m: 25, recipe: { macaroni: 400, cheddar: 250, milk: 500, butter: 50, maida: 40 }, buy: "macaroni, cheddar" },
  { id: "burrito-bowl", c: "mexican", name: "Rajma burrito bowl", m: 35, recipe: { rajma: 250, rice: 400, tomato: 300, onion: 200, capsicum: 150, curd: 200, "ginger-garlic": 20, lemon: 50 }, prep: soak("rajma", 250, 6), alias: ["burrito bowl"] },
  { id: "quesadilla", c: "mexican", name: "Paneer quesadilla", m: 25, recipe: { tortillas: 8, paneer: 300, capsicum: 150, onion: 150, cheese: 150 }, buy: "tortillas", alias: ["quesadilla"] },
  { id: "nachos", c: "mexican", name: "Loaded nachos", m: 20, recipe: { nachos: 400, salsa: 300, cheese: 200, onion: 100, tomato: 150, capsicum: 100 }, buy: "nachos, salsa" },
  { id: "tacos", c: "mexican", name: "Bean tacos", m: 30, recipe: { "taco shells": 12, rajma: 250, tomato: 200, onion: 150, cabbage: 150, cheese: 100 }, buy: "taco shells", prep: soak("rajma", 250, 6), alias: ["tacos"] },
  { id: "kimchi-fried-rice", c: "korean", name: "Kimchi fried rice", m: 20, recipe: { rice: 400, kimchi: 250, egg: 4, "spring onion": 50, "ginger-garlic": 20 }, buy: "kimchi" },
  { id: "korean-ramen", c: "korean", name: "Spicy Korean ramen", m: 15, recipe: { "ramen noodles": 480, gochujang: 60, egg: 4, "spring onion": 50, cabbage: 150 }, buy: "ramen noodles, gochujang", alias: ["korean ramen", "ramen"] },
  { id: "bibimbap", c: "korean", name: "Bibimbap", m: 40, recipe: { rice: 400, gochujang: 100, egg: 4, carrot: 150, palak: 200, "spring onion": 50, "ginger-garlic": 20 }, buy: "gochujang" },
  { id: "gochujang-paneer", c: "korean", name: "Gochujang paneer rice", m: 30, recipe: { paneer: 400, gochujang: 100, rice: 400, "spring onion": 50, capsicum: 150, "ginger-garlic": 20 }, buy: "gochujang" },
  { id: "bombay-sandwich", c: "cafe", name: "Bombay sandwich", m: 15, recipe: { bread: 800, potato: 300, tomato: 200, onion: 150, capsicum: 100, butter: 60, coriander: 50 } },
  { id: "aloo-tikki-burger", c: "cafe", name: "Aloo tikki burger", m: 35, recipe: { "burger buns": 4, potato: 500, tomato: 150, onion: 100, cheese: 100 }, buy: "burger buns" },
  { id: "grilled-cheese", c: "cafe", name: "Grilled cheese", m: 10, recipe: { bread: 800, cheese: 300, butter: 80 } },
  { id: "masala-omelette", c: "cafe", name: "Masala omelette toast", m: 10, recipe: { egg: 8, bread: 800, onion: 150, tomato: 150, butter: 50 } },
];
// The house dishes that also sit in the app's deck (dal makhani, idli
// sambar) live in household.js; liking them changes nothing.

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FREQ = { "1w": "once a week", "2w": "twice a week", wknd: "on Friday and Saturday nights", ask: "only when someone asks" };
const dow = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const shift = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekOf = (d) => shift(d, -((dow(d) + 6) % 7)); // the Monday
const and = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const cuisineName = (k) => (CUISINES.find((c) => c.k === k) || {}).n || k;

// ---- offers: when a liked dish went out on a card (the week count)

async function offers() {
  return (await store.get("cuisine:offers")) || [];
}

// datas: button data or names ("pick:Spicy Korean ramen", "vote:korean-ramen").
async function noteOffered(date_for, datas) {
  if (!date_for) return [];
  const hh = require("./household");
  const names = [...new Set((datas || []).map((x) => hh.dishName(String(x || "").replace(/^(vote|pick|wish):/i, ""))).filter((n) => n && hh.DISHES[n] && !hh.DISHES[n].house))];
  if (!names.length) return [];
  const list = await offers();
  const added = names.filter((dish) => !list.some((o) => o.date_for === date_for && o.dish === dish));
  if (!added.length) return [];
  for (const dish of added) list.push({ date_for, dish, at_ist: istString() });
  await store.set("cuisine:offers", list.slice(-40));
  for (const dish of added) await require("./events").emit("cuisine_offer", { dish, date_for, summary: `${dish} offered for ${date_for}` });
  return added;
}

// Someone asked for one on Telegram (freq "ask", or past the week's count).
async function setAsk(date_for, who, said) {
  const rec = { who, said: String(said || "").slice(0, 200), at_ist: istString() };
  await store.set(`cuisine:ask:${date_for}`, rec, 2 * 86400);
  await require("./events").emit("cuisine_ask", { who, date_for, summary: `${who} asked for a liked dish on ${date_for}` });
  return rec;
}

// A plain message naming a liked dish counts as an ask for the next meal.
// Rails only matches the name; the message still goes to Baari as usual.
async function noteAsk(n) {
  const hh = require("./household");
  const p = (await require("./prefs").get()).cuisine;
  if (!p.like.length || !n.text) return null;
  const name = hh.dishName(n.text);
  const d = name && hh.DISHES[name];
  if (!d || d.house || !p.like.includes(d.id)) return null;
  const date_for = await require("./attendance").nextDate();
  if (await store.get(`cuisine:ask:${date_for}`)) return null;
  return setAsk(date_for, n.role, n.text);
}

// ---- tonight

// Who gets the liked dish and who gets the house thali, from prefs.who and EATING.
async function plates(date_for) {
  const p = (await require("./prefs").get()).cuisine;
  const v = await require("./attendance").view(date_for);
  const eaters = p.who.length ? v.eating.filter((x) => p.who.includes(x)) : v.eating.slice();
  return { eaters, rest: v.eating.filter((x) => !eaters.includes(x)), guests: v.guests || 0, view: v };
}

async function tonight(date_for) {
  const hh = require("./household");
  const p = (await require("./prefs").get()).cuisine;
  const liked = p.like.map((id) => hh.byId(id)).filter((d) => d && !d.house);
  if (!liked.length) return null;
  const none = (reason) => ({ eligible: false, reason, line: `CUISINE: none tonight (${reason}).` });
  const asked = await store.get(`cuisine:ask:${date_for}`);
  const all = await offers();
  const week = all.filter((o) => o.date_for !== date_for && weekOf(o.date_for) === weekOf(date_for));
  if (!asked) {
    if (p.freq === "ask") return none("liked dishes come only when someone asks on Telegram, and nobody has");
    if (p.freq === "wknd" && ![5, 6].includes(dow(date_for))) return none(`liked dishes are for Friday and Saturday nights, and ${date_for} is a ${DAY[dow(date_for)]}`);
    const cap = p.freq === "2w" ? 2 : 1;
    if (p.freq !== "wknd" && week.length >= cap) return none(`liked dishes ${FREQ[p.freq]}, and this week already had ${and(week.map((o) => `${o.dish} on ${o.date_for}`))}`);
  }
  const s = await plates(date_for);
  if (!s.eaters.length) return none(`nobody who wants the liked dishes (${and(p.who)}) is eating`);
  const ctx = await hh.ruleContext();
  const away = s.view.away.map((a) => a.name);
  const ok = [], blocked = [];
  for (const d of liked) {
    const why = hh.ruleBreak(d.name, date_for, away, ctx);
    if (why) blocked.push(why);
    else ok.push(d);
  }
  if (!ok.length) return none(blocked.join("; "));
  // The one offered longest ago (never offered first), then the like order.
  const last = (name) => all.filter((o) => o.dish === name).map((o) => o.date_for).sort().pop() || "";
  const d = ok.map((x, i) => [x, i]).sort((a, b) => last(a[0].name).localeCompare(last(b[0].name)) || a[1] - b[1])[0][0];
  const restSay = [...s.rest, ...(s.guests ? [`${s.guests} guest${s.guests > 1 ? "s" : ""}`] : [])];
  let line = `CUISINE: ${d.name} eligible tonight, for ${and(s.eaters)}.`;
  if (restSay.length) line += ` ${and(restSay)} get${restSay.length === 1 && !s.guests ? "s" : ""} the house thali.`;
  line += " At most one liked dish on the shortlist; the other slot stays a house dish.";
  if (d.buy) line += ` A kirana won't have ${d.buy}: it comes on the Delhivery parcel.`;
  if (d.prep.length) line += ` ${(await require("./prep").line([d.name], date_for)).replace(/^PREP: /, "Prep: ")}`;
  if (asked) line += ` ${asked.who} asked for one.`;
  return { eligible: true, dish: d.name, id: d.id, eaters: s.eaters, rest: s.rest, guests: s.guests, line };
}

// The CUISINE line for a phase. Before the lock: may a liked dish be on the
// card. After it: if a liked dish won, the plates split, and at BUY and CHECK
// what the house thali for the rest needs.
async function taskLine(phase, date_for) {
  if (["SHORTLIST", "INBOX", "LOCK"].includes(phase)) {
    const t = await tonight(date_for);
    return t ? t.line : null;
  }
  const hh = require("./household");
  const h = (await store.get("handoff:last")) || {};
  if (h.date_for && h.date_for !== date_for) return null;
  const win = hh.dishName(h.locked && h.locked.winner);
  if (!win || hh.DISHES[win].house) return null;
  const s = await plates(date_for);
  const eaters = s.eaters.length ? s.eaters : s.view.eating;
  const rest = s.eaters.length ? s.rest : [];
  const restN = rest.length + s.guests;
  const house = [h.locked.runner_up, ...(h.shortlist || [])].map((x) => hh.dishName(typeof x === "string" ? x : x && x.dish)).find((n) => n && hh.DISHES[n].house) || null;
  let line = `CUISINE: ${win} is locked for ${and(eaters)} (${eaters.length} plate${eaters.length === 1 ? "" : "s"}).`;
  if (restN) line += ` ${and([...rest, ...(s.guests ? [`${s.guests} guest${s.guests > 1 ? "s" : ""}`] : [])])} get the house thali${house ? `, ${house}` : ", a house dish"} (${restN} plate${restN === 1 ? "" : "s"}).`;
  if (restN && phase === "BRIEF") line += " The brief names both dishes and both counts.";
  if (restN && house && ["BUY", "CHECK"].includes(phase)) {
    const nl = await hh.needsLine(house, restN, date_for);
    if (nl) line += `\n${nl.replace(/^NEEDS/, "NEEDS FOR THE HOUSE THALI")}`;
  }
  return line;
}

// ---- /swaad on Telegram

const draftKey = (chat) => `swaad:${chat}`;
const deck = (hh, c) => CATALOG.filter((d) => c.includes(d.c)).map((d) => hh.DISHES[d.name]).filter(Boolean);

function cuisineRows(sel) {
  const btn = (c) => ({ text: `${sel.includes(c.k) ? "✓ " : ""}${c.e} ${c.n}`, data: `swaad:c:${c.k}` });
  const rows = [];
  for (let i = 0; i < CUISINES.length; i += 3) rows.push(CUISINES.slice(i, i + 3).map(btn));
  rows.push([{ text: "Done", data: "swaad:done" }]);
  return rows;
}

function dishCard(d, i, total, before) {
  const facts = [cuisineName(d.cuisine), `${d.minutes} min`, d.tags.includes("egg") ? "has egg" : "veg"];
  const text = `${i + 1} of ${total}. ${d.name}\n${facts.join(" · ")}${d.buy ? `\nBaari orders ${d.buy} on the parcel.` : ""}${before ? `\nYou said ${before} before.` : ""}\nWould you eat it?`;
  return { text, buttons: [[{ text: "Yes", data: `swaad:y:${d.id}` }, { text: "No", data: `swaad:n:${d.id}` }], [{ text: "That's enough", data: "swaad:stop" }]] };
}

function freqCard(liked, freq) {
  const text = liked.length ? `You'd eat ${liked.length}: ${and(liked)}.\nHow often should one come up?` : "Nothing new for now, that's fine. Ghar ka khana it is.";
  const buttons = liked.length ? [Object.entries({ "1w": "Once a week", "2w": "Twice a week", wknd: "Weekends", ask: "When I ask" }).map(([k, l]) => ({ text: `${freq === k ? "✓ " : ""}${l}`, data: `swaad:f:${k}` }))] : null;
  return { text, buttons };
}

async function swaad(n, base, tg) {
  const hh = require("./household");
  const prefs = require("./prefs");
  const chat = n.chat_id;
  const msg = n.reply_to_message_id;
  if (!require("./attendance").allowed(n.role, n.role) || n.role === "Mehmaan") {
    const no = n.role === "Sunita" ? "Ye family ke khane ki pasand ke liye hai. Aapke liye /awaaz aur /bhasha hain." : "Dish picks are for the family. Ask Vinay to add one.";
    await tg.sendMessage({ chat_id: chat, text: no });
    return true;
  }
  const t = n.kind === "text" ? String(n.text || "") : "";
  const b = n.kind === "button" ? String(n.button_data || "") : "";
  const cur = (await prefs.get()).cuisine;
  // "/swaad tonight": ask for a liked dish on the next shortlist.
  if (/^\/swaad(@\w+)?\s+(tonight|aaj)\b/i.test(t)) {
    const date_for = await require("./attendance").nextDate();
    if (!cur.like.length) await tg.sendMessage({ chat_id: chat, text: "Nobody has liked a dish yet. Send /swaad to pick some." });
    else {
      await setAsk(date_for, n.role, t);
      await tg.sendMessage({ chat_id: chat, text: `Noted. The shortlist for ${date_for} can have one of your liked dishes, if the house rules allow it.` });
    }
    return true;
  }
  if (t) {
    await store.set(draftKey(chat), { c: cur.c.slice(), q: [], i: 0 }, 86400);
    await tg.sendMessage({ chat_id: chat, text: "What else would you eat? Tap every cuisine you like, then Done.", buttons: cuisineRows(cur.c) });
    return true;
  }
  const dr = (await store.get(draftKey(chat))) || { c: cur.c.slice(), q: [], i: 0 };
  const save = async (patch) => {
    const r = await prefs.set({ cuisine: patch }, { by: n.role, via: "telegram" });
    return r.ok;
  };
  let m;
  if ((m = /^swaad:c:(\w+)$/.exec(b))) {
    if (KEYS.includes(m[1])) dr.c = dr.c.includes(m[1]) ? dr.c.filter((x) => x !== m[1]) : [...dr.c, m[1]];
    await store.set(draftKey(chat), dr, 86400);
    await edit(tg, chat, msg, "What else would you eat? Tap every cuisine you like, then Done.", cuisineRows(dr.c));
    return true;
  }
  if (b === "swaad:done") {
    if (!dr.c.length) {
      await edit(tg, chat, msg, "Pick at least one cuisine, then Done.", cuisineRows(dr.c));
      return true;
    }
    await save({ c: dr.c });
    dr.q = deck(hh, dr.c).map((d) => d.id);
    dr.i = 0;
    await store.set(draftKey(chat), dr, 86400);
    return showNext(tg, chat, msg, hh, dr, cur);
  }
  if ((m = /^swaad:([yn]):([\w-]+)$/.exec(b))) {
    const d = hh.byId(m[2]);
    if (d && !d.house) {
      const now = (await prefs.get()).cuisine;
      const like = now.like.filter((x) => x !== d.id), no = now.no.filter((x) => x !== d.id);
      (m[1] === "y" ? like : no).push(d.id);
      await save({ like, no });
    }
    const at = dr.q.indexOf(m[2]);
    dr.i = at >= 0 ? at + 1 : dr.i + 1;
    await store.set(draftKey(chat), dr, 86400);
    return showNext(tg, chat, msg, hh, dr, await prefs.get().then((p) => p.cuisine));
  }
  if (b === "swaad:stop") {
    dr.i = dr.q.length;
    await store.set(draftKey(chat), dr, 86400);
    return showNext(tg, chat, msg, hh, dr, cur);
  }
  if ((m = /^swaad:f:(1w|2w|wknd|ask)$/.exec(b))) {
    await save({ freq: m[1] });
    await store.del(draftKey(chat));
    const say = m[1] === "ask" ? "A liked dish comes up only when someone asks for one here (or sends /swaad tonight)." : `One liked dish can join the shortlist ${FREQ[m[1]]}, for whoever likes them. The other dish stays ghar ka khana.`;
    await edit(tg, chat, msg, `Saved. ${say}`, null);
    return true;
  }
  return true;
}

async function showNext(tg, chat, msg, hh, dr, cur) {
  if (dr.i < dr.q.length) {
    const d = hh.byId(dr.q[dr.i]);
    const card = dishCard(d, dr.i, dr.q.length, cur.like.includes(d.id) ? "yes" : cur.no.includes(d.id) ? "no" : null);
    await edit(tg, chat, msg, card.text, card.buttons);
    return true;
  }
  const liked = cur.like.map((id) => hh.byId(id)).filter((d) => d && !d.house).map((d) => d.name);
  const card = freqCard(liked, cur.freq);
  await edit(tg, chat, msg, card.text, card.buttons);
  return true;
}

// Redraw a message in place with new buttons (rows of {text, data}).
async function edit(tg, chat_id, message_id, text, buttons) {
  if (String(chat_id).startsWith("sim-") || !message_id) {
    if (!message_id) return tg.sendMessage({ chat_id, text, buttons: buttons || undefined });
    await store.push("sim:outbox", { at_ist: istString(), at_ms: Date.now(), kind: "edit", chat_id, message_id, text, buttons: buttons || null }, 1000);
    return { ok: true };
  }
  return tg.call("editMessageText", { chat_id, message_id, text, reply_markup: { inline_keyboard: (buttons || []).map((row) => row.map((x) => ({ text: x.text, callback_data: x.data }))) } });
}

module.exports = { CUISINES, KEYS, CATALOG, tonight, taskLine, plates, noteOffered, noteAsk, setAsk, swaad, edit, weekOf };
