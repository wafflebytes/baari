// Who's eating (lib/attendance.js), handoff section 12 step 1. In memory, no
// server: node test/attendance.js
const assert = require("assert");
const store = require("../lib/store");
const att = require("../lib/attendance");
const household = require("../lib/household");

const D = "2026-10-09";
let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

(async () => {
  await store.set("turn", { tonight: { date_for: D, holder: "Vinay" } });
  // Each stage: [phase_done on the handoff, changed_after, the wake's prefix]
  const stages = [
    [null, null, null],
    ["SHORTLIST", null, "EATING CHANGED:"],
    ["LOCK", "LOCK", null],
    ["BUY", "BUY", "EATING CHANGED AFTER BUY:"],
    ["BRIEF", "BRIEF", "EATING CHANGED AFTER BRIEF:"],
  ];
  for (const [done, after, wake] of stages) {
    await ok(`Papa away with ${done || "nothing"} done: changed_after ${after}, wake ${wake}`, async () => {
      await store.del(`att:${D}`);
      await store.set("handoff:last", done ? { date_for: D, phase_done: done } : {});
      const r = await att.setAway({ name: "Papa", by: "Mummy", via: "telegram_voice", said: "kal Papa office mein khayenge" });
      assert.ok(r.ok, r.error);
      assert.strictEqual(r.attendance.headcount, 3);
      assert.deepStrictEqual(r.attendance.eating, ["Vinay", "Mummy", "Behen"]);
      assert.strictEqual(r.attendance.changed_after, after);
      const w = att.wakeFor(r.phase_done, r.attendance);
      if (wake) assert.ok(w && w.startsWith(wake), w); else assert.strictEqual(w, null);
    });
  }
  await ok("Sunita can't mark Mummy away: NOT_ALLOWED", async () => {
    const r = await att.setAway({ name: "Mummy", by: "Sunita" });
    assert.strictEqual(r.error, "NOT_ALLOWED");
  });
  await ok("Mehmaan can't mark a family member", async () => {
    const r = await att.setAway({ name: "Papa", by: "Mehmaan" });
    assert.strictEqual(r.error, "NOT_ALLOWED");
  });
  await ok("back puts Papa back, headcount 4", async () => {
    await store.del(`att:${D}`);
    await att.setAway({ name: "Papa", by: "Vinay" });
    const r = await att.setAway({ name: "Papa", by: "Vinay", back: true });
    assert.strictEqual(r.attendance.headcount, 4);
  });
  await ok("guests add to the headcount", async () => {
    const r = await att.setGuests({ n: 2, by: "Vinay" });
    assert.strictEqual(r.attendance.headcount, 6);
    await att.setGuests({ n: 0, by: "Vinay" });
  });
  await ok("aloo puri is refused for Papa, allowed when he's away", async () => {
    assert.ok(household.ruleBreak("Aloo puri", D, []));
    assert.strictEqual(household.ruleBreak("Aloo puri", D, ["Papa"]), null);
  });
  await ok("the EATING line has the shape section 10 gives", async () => {
    await store.del(`att:${D}`);
    await store.set("handoff:last", {});
    await att.setAway({ name: "Papa", by: "Mummy", via: "telegram_voice" });
    const l = att.line(await att.view(D));
    assert.ok(/^EATING 3 for 2026-10-09: Vinay, Mummy, Behen\. Away: Papa \(Mummy, telegram_voice, \d\d:\d\d\)\. Guests 0\.$/.test(l), l);
  });
  await ok("NEEDS scales to 3 eating", async () => {
    await household.setKitchen({ pantry: { rajma: 0, rice: 0, tomato: 0, onion: 0, "ginger-garlic": 0 } });
    const n = await household.needs("Rajma chawal", 3);
    assert.strictEqual(n.buy.find((b) => b.item === "rajma").qty, 200); // 250 * 3/4 = 187.5, up to 200
  });
  console.log(`${pass} passed`);
})();
