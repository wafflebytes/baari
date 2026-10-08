// Taste picks reach the shortlist (lib/cuisine.js, lib/household.js). In
// memory, no server, no keys: node test/cuisine.js
const assert = require("assert");
const store = require("../lib/store");
const prefs = require("../lib/prefs");
const cuisine = require("../lib/cuisine");
const household = require("../lib/household");

// 2026-10-12 is a Monday, 10-13 a Tuesday, 10-14 a Wednesday, 10-16 a Friday.
const MON = "2026-10-12", TUE = "2026-10-13", WED = "2026-10-14", FRI = "2026-10-16", NEXT_MON = "2026-10-19";
let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });
const like = (ids, freq = "1w", who = []) => prefs.set({ cuisine: { c: ["korean", "street", "italian"], like: ids, freq, who } }, { by: "app" });
const fresh = async () => {
  for (const k of ["cuisine:offers", "prefs", "profile", "kitchen", "handoff:last"]) await store.del(k);
  for (const d of [MON, TUE, WED, FRI, NEXT_MON]) { await store.del(`att:${d}`); await store.del(`cuisine:ask:${d}`); }
};

(async () => {
  await ok("1w: the first shortlist of the week offers Korean ramen, the second doesn't", async () => {
    await fresh();
    await like(["korean-ramen"], "1w");
    const first = await cuisine.taskLine("SHORTLIST", MON);
    assert.ok(/^CUISINE: Spicy Korean ramen eligible tonight, for Vinay, Mummy, Papa and Behen\./.test(first), first);
    // The card went out with it (the bridge calls this on tg.send).
    assert.deepStrictEqual(await cuisine.noteOffered(MON, ["pick:korean-ramen", "pick:Rajma chawal"]), ["Spicy Korean ramen"]);
    const second = await cuisine.taskLine("SHORTLIST", WED);
    assert.ok(/^CUISINE: none tonight \(liked dishes once a week, and this week already had Spicy Korean ramen on 2026-10-12\)/.test(second), second);
    // A rerun of Monday's shortlist still may; next week may again.
    assert.ok(/eligible tonight/.test(await cuisine.taskLine("SHORTLIST", MON)));
    assert.ok(/eligible tonight/.test(await cuisine.taskLine("SHORTLIST", NEXT_MON)));
  });
  await ok("2w allows a second shortlist in the week, not a third", async () => {
    await fresh();
    await like(["korean-ramen", "arrabbiata"], "2w");
    await cuisine.noteOffered(MON, ["pick:korean-ramen"]);
    const t = await cuisine.tonight(WED);
    assert.ok(t.eligible, t.line);
    assert.strictEqual(t.dish, "Penne arrabbiata", "the one never offered comes first");
    await cuisine.noteOffered(WED, ["vote:arrabbiata"]);
    assert.ok(/^CUISINE: none tonight/.test((await cuisine.tonight(FRI)).line));
  });
  await ok("Korean ramen's buy items land on the Delhivery side of NEEDS", async () => {
    await fresh();
    await like(["korean-ramen"]);
    await household.setKitchen({ pantry: { egg: 0, cabbage: 0, "spring onion": 0 } });
    const l = await household.needsLine("Spicy Korean ramen", 4, MON);
    const [, kirana, parcel] = /Sharma Kirana: (.*?)\. Delhivery: (.*?)\. Already/.exec(l);
    assert.ok(/ramen noodles 500 g/.test(parcel) && /gochujang/.test(parcel), parcel);
    assert.ok(!/ramen|gochujang/.test(kirana) && /egg 4 pc/.test(kirana) && /cabbage/.test(kirana), kirana);
  });
  await ok("a Jain member filters out a dish with onion, on their plate only", async () => {
    await fresh();
    await store.set("profile", { members: [{ name: "Vinay" }, { name: "Mummy", jain: true }, { name: "Papa" }, { name: "Behen" }] });
    await like(["veg-momos"]);
    const ctx = await household.ruleContext();
    assert.ok(/Veg momos has onion, and Mummy's plate is Jain/.test(household.ruleBreak("Veg momos", WED, [], ctx)));
    assert.ok(/^CUISINE: none tonight \(Veg momos has onion, and Mummy's plate is Jain/.test((await cuisine.tonight(WED)).line));
    // The same house rule filters a house dish too.
    assert.ok(household.ruleBreak("Rajma chawal", WED, [], ctx));
    // Cooked only for Vinay and Behen, Mummy gets the house thali, so it's fine.
    await like(["veg-momos"], "1w", ["Vinay", "Behen"]);
    const t = await cuisine.tonight(WED);
    assert.ok(/^CUISINE: Veg momos eligible tonight, for Vinay and Behen\. Mummy and Papa get the house thali\./.test(t.line), t.line);
  });
  await ok("a no-onion day filters liked dishes like the house ones", async () => {
    await fresh();
    await store.set("profile", { no_onion_days: ["wed"] });
    await like(["pav-bhaji", "grilled-cheese"]);
    const t = await cuisine.tonight(WED);
    assert.strictEqual(t.dish, "Grilled cheese", t.line);
    assert.ok(/no-onion day/.test(household.ruleBreak("Palak paneer roti", WED, [], await household.ruleContext())));
  });
  await ok("wknd on a Tuesday gives none tonight, on a Friday it may", async () => {
    await fresh();
    await like(["arrabbiata"], "wknd");
    assert.ok(/^CUISINE: none tonight \(liked dishes are for Friday and Saturday nights, and 2026-10-13 is a Tuesday\)/.test(await cuisine.taskLine("SHORTLIST", TUE)));
    assert.ok(/^CUISINE: Penne arrabbiata eligible tonight/.test(await cuisine.taskLine("SHORTLIST", FRI)));
  });
  await ok("ask: none until someone asks on Telegram, then eligible", async () => {
    await fresh();
    await like(["korean-ramen"], "ask");
    await store.set("turn", { tonight: { date_for: WED, holder: "Vinay" } });
    assert.ok(/^CUISINE: none tonight/.test(await cuisine.taskLine("SHORTLIST", WED)));
    await prefs.onTelegram({ kind: "text", role: "Mummy", chat_id: "sim-mummy", text: "can we have korean ramen tomorrow?" }, "http://x", {});
    assert.ok(/eligible tonight.*Mummy asked for one\./.test(await cuisine.taskLine("SHORTLIST", WED)));
  });
  await ok("the guard: a liked dish passes the menu, an unliked one doesn't", async () => {
    await fresh();
    await like(["korean-ramen"]);
    const m = await household.menu();
    assert.ok(household.onMenu("pick:korean-ramen", m) && household.onMenu("pick:Spicy Korean ramen", m));
    assert.ok(!household.onMenu("pick:Pav bhaji", m));
    assert.ok(household.onMenu("vote:Rajma chawal", m));
    // Egg on a Tuesday still holds for a liked dish.
    assert.ok(/has egg, and 2026-10-13 is a Tuesday/.test(household.ruleBreak("korean-ramen", TUE, [], await household.ruleContext())));
    // "Chole bhature" is its own dish, never Chole chawal.
    assert.strictEqual(household.dishName("pick:Chole bhature"), "Chole bhature");
    assert.strictEqual(household.dishName("lauki"), "Lauki chana dal");
  });
  await ok("after the lock: plates split, NEEDS scaled to who eats it, house thali costed", async () => {
    await fresh();
    await like(["korean-ramen"], "1w", ["Vinay", "Mummy"]);
    await store.set("handoff:last", { date_for: MON, phase_done: "LOCK", shortlist: ["Spicy Korean ramen", "Rajma chawal"], locked: { winner: "Spicy Korean ramen", runner_up: "Rajma chawal" } });
    const l = await cuisine.taskLine("BUY", MON);
    assert.ok(/^CUISINE: Spicy Korean ramen is locked for Vinay and Mummy \(2 plates\)\. Papa and Behen get the house thali, Rajma chawal \(2 plates\)\./.test(l), l);
    assert.ok(/\nNEEDS FOR THE HOUSE THALI \(rails, from the live pantry, for Rajma chawal and 2 eating\)/.test(l), l);
    const n = await household.needs("Spicy Korean ramen", 4, MON);
    assert.strictEqual(n.headcount, 2);
    assert.strictEqual(n.buy.find((b) => b.item === "ramen noodles").qty, 250); // 480 * 2/4 = 240, up to 250
  });
  await ok("every dish has an id, tags, a prep list, and a buy item for what the kirana lacks", async () => {
    for (const d of Object.values(household.DISHES)) {
      assert.ok(d.id && Array.isArray(d.tags) && Array.isArray(d.prep), d.name);
      for (const b of String(d.buy || "").split(",").map((x) => x.trim()).filter(Boolean)) assert.ok(b in d.recipe, `${d.name} buys ${b}, not in its recipe`);
      if (!d.house) for (const item of Object.keys(d.recipe)) if (!household.KIRANA_STOCK.includes(item) && !["rice", "atta", "oil", "rajma", "chole", "besan", "chana dal", "toor dal", "maida", "cornflour", "peanuts", "matki"].includes(item)) assert.ok(String(d.buy || "").includes(item), `${d.name}: ${item} isn't at the kirana, so it should be in buy`);
    }
    assert.strictEqual(Object.values(household.DISHES).filter((d) => !d.house).length, 33);
    assert.deepStrictEqual([...new Set(Object.values(household.DISHES).map((d) => d.cuisine))].sort(), cuisine.KEYS.slice().sort());
  });
  await ok("/swaad: toggles, Done, one dish at a time, then how often", async () => {
    await fresh();
    const sent = [];
    const tg = { sendMessage: async (m) => { sent.push(m); return { ok: true }; }, call: async () => ({ ok: true }) };
    const tap = (data) => prefs.onTelegram({ kind: "button", role: "Vinay", chat_id: "sim-vinay", reply_to_message_id: 7, button_data: data }, "http://x", tg);
    assert.ok(await prefs.onTelegram({ kind: "text", role: "Vinay", chat_id: "sim-vinay", text: "/swaad" }, "http://x", tg));
    assert.strictEqual(sent[0].buttons.length, 4); // three rows of three, and Done
    await tap("swaad:c:korean");
    await tap("swaad:done");
    assert.deepStrictEqual((await prefs.get()).cuisine.c, ["korean"]);
    await tap("swaad:y:kimchi-fried-rice");
    await tap("swaad:n:korean-ramen");
    await tap("swaad:stop");
    await tap("swaad:f:2w");
    const c = (await prefs.get()).cuisine;
    assert.deepStrictEqual([c.like, c.no, c.freq], [["kimchi-fried-rice"], ["korean-ramen"], "2w"]);
    const edits = (await store.range("sim:outbox", 10)).filter((e) => e.kind === "edit");
    assert.ok(/^Saved\. One liked dish can join the shortlist twice a week/.test(edits[0].text), edits[0].text);
    const ev = (await store.range("hh:events", 20)).filter((e) => e.event === "prefs");
    assert.ok(ev.length >= 4 && ev.some((e) => /Vinay liked Kimchi fried rice/.test(e.summary)), JSON.stringify(ev.map((e) => e.summary)));
  });
  console.log(`${pass} passed`);
})();
