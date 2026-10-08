// Night tasks (lib/prep.js), handoff section 12 step 12. node test/prep.js
const assert = require("assert");
const store = require("../lib/store");
const prep = require("../lib/prep");
const att = require("../lib/attendance");
const household = require("../lib/household");

const D = "2026-10-09";
let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

(async () => {
  await store.set("turn", { tonight: { date_for: D, holder: "Vinay" } });
  await store.set("handoff:last", { date_for: D, phase_done: "LOCK" });
  await ok("rajma at 50 g (low): PREP says not possible tonight", async () => {
    await household.setKitchen({ pantry: { rajma: 50 } });
    const k = await store.get("kitchen");
    k.pantry.rajma = { qty: 50, confidence: "low" };
    await store.set("kitchen", k);
    const l = await prep.line(["Rajma chawal"], D);
    assert.ok(/Rajma chawal needs rajma soak by 22:30 \(8 h\): not possible tonight: rajma in kitchen 0 g \(low\)/.test(l), l);
  });
  await ok("rajma at 400 g: possible, someone home", async () => {
    const k = await store.get("kitchen");
    k.pantry.rajma = { qty: 400, confidence: "high" };
    await store.set("kitchen", k);
    const l = await prep.line(["Rajma chawal", "Lauki chana dal"], D);
    assert.ok(/possible tonight, rajma 250 g, someone home: Vinay, Mummy, Papa, Behen/.test(l), l);
  });
  await ok("the cook never gets the task", async () => {
    const r = await prep.create({ dish: "Rajma chawal", who: "Sunita", date_for: D });
    assert.ok(/NOT_ALLOWED/.test(r.error), r.error);
  });
  await ok("someone away doesn't get it", async () => {
    await att.setAway({ name: "Papa", by: "Mummy" });
    const r = await prep.create({ dish: "Rajma chawal", who: "Papa", date_for: D });
    assert.ok(/NOT_HOME/.test(r.error), r.error);
  });
  let id;
  await ok("Mummy gets it, once", async () => {
    const r = await prep.create({ dish: "Rajma chawal", who: "Mummy", date_for: D });
    assert.ok(r.ok, r.error);
    assert.strictEqual(r.task.qty_g, 200); // 3 eating: 250 * 3/4 -> 200
    id = r.task.id;
    const again = await prep.create({ dish: "Rajma chawal", who: "Mummy", date_for: D });
    assert.ok(again.duplicate);
  });
  await ok("the brief line before it's done never claims a soak", async () => {
    const l = await prep.briefLine(D);
    assert.ok(/not marked done yet/.test(l) && /never claim a soak/.test(l), l);
  });
  await ok("Soaked tap marks it done, and the brief line says so", async () => {
    const r = await prep.done({ id, by: "Mummy", via: "telegram" });
    assert.ok(r.ok);
    assert.ok(/done by Mummy/.test(await prep.briefLine(D)));
  });
  await ok("a task past its deadline turns missed", async () => {
    const p = await store.get(`prep:${D}`);
    p.tasks.push({ id: "tx", dish: "Chole chawal", task: "soak", item: "chole", qty_g: 250, by_ist: "2026-10-08T20:00:00.000", who: "Vinay", status: "open", reminded: true, quick: "hot soak" });
    await store.set(`prep:${D}`, p);
    await prep.tick("http://localhost:0");
    const v = await prep.view(D);
    assert.strictEqual(v.tasks.find((t) => t.id === "tx").status, "missed");
  });
  await ok("kadhi needs curd set only when curd is low", async () => {
    const k = await store.get("kitchen");
    k.pantry.curd = { qty: 800, confidence: "high" };
    await store.set("kitchen", k);
    assert.strictEqual((await prep.feasible("Kadhi chawal", D)).needs, false);
  });
  console.log(`${pass} passed`);
  process.exit();
})();
