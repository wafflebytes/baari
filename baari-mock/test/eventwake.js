// Events wake CHECK (lib/eventwake.js), S8 step D. In memory, no server; the
// fire is a stub that records what wake would start: node test/eventwake.js
const assert = require("assert");
const store = require("../lib/store");
const eventwake = require("../lib/eventwake");
const { istString } = require("../lib/util");

let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

const fired = [];
const fire = async (f) => { fired.push(f); return { ok: true }; };
const night = async (date_for, done, waybill) => {
  await store.set("handoff:last", { date_for, phase_done: done, shipment: { waybill } });
  await store.del("run:CHECK");
  fired.length = 0;
};

(async () => {
  await ok("NDR on tonight's parcel fires CHECK once, with the EVENT line", async () => {
    await night("2026-10-09", "BUY", "WB1");
    await store.set("app:track", { waybill: "WB1", status: "Pending", status_type: "UD", expected: "2026-10-09T06:30:00.000", at_ist: "2026-10-08T22:51:00.000" });
    const r = await eventwake.check(fire);
    assert.deepStrictEqual(r.fired, ["ship:WB1"]);
    assert.strictEqual(fired.length, 1);
    assert.strictEqual(fired[0].phase, "CHECK");
    assert.strictEqual(fired[0].date_for, "2026-10-09");
    assert.ok(fired[0].extra.startsWith("EVENT: shipment WB1 went NDR at 22:51"), fired[0].extra);
    const again = await eventwake.check(fire);
    assert.ok(again.none);
    assert.strictEqual(fired.length, 1);
  });
  await ok("the same parcel going RTO later that night doesn't fire again (one event per thing)", async () => {
    await store.set("app:track", { waybill: "WB1", status: "In Transit", status_type: "RT", at_ist: "2026-10-08T23:30:00.000" });
    assert.ok((await eventwake.check(fire)).none);
  });
  await ok("RTO and a late ETA each fire on their own night", async () => {
    await night("2026-10-10", "CHECK", "WB2");
    await store.set("app:track", { waybill: "WB2", status: "In Transit", status_type: "RT", at_ist: "2026-10-09T22:50:00.000" });
    assert.ok(/went RTO/.test((await eventwake.check(fire)).extra));
    await night("2026-10-11", "BUY", "WB3");
    await store.set("app:track", { waybill: "WB3", status: "In Transit", status_type: "UD", expected: "2026-10-11T09:15:00.000", at_ist: "2026-10-10T22:50:00.000" });
    assert.ok(/went an ETA of 09:15, after 07:30/.test((await eventwake.check(fire)).extra));
  });
  await ok("an ETA before 07:30 is fine", async () => {
    await night("2026-10-12", "BUY", "WB4");
    await store.set("app:track", { waybill: "WB4", status: "In Transit", status_type: "UD", expected: "2026-10-12T06:45:00.000", at_ist: "2026-10-11T22:50:00.000" });
    assert.ok((await eventwake.check(fire)).none);
  });
  await ok("nothing new since the last CHECK started: no wake", async () => {
    await night("2026-10-13", "CHECK", "WB5");
    await store.set("app:track", { waybill: "WB5", status: "Pending", status_type: "UD", at_ist: "2026-10-12T22:40:00.000" });
    await store.set("run:CHECK", { at_ist: "2026-10-12T22:45:00.000", handoff: { date_for: "2026-10-13" } });
    assert.ok((await eventwake.check(fire)).none);
  });
  await ok("before BUY, or after BRIEF, the heartbeat leaves it alone", async () => {
    await night("2026-10-14", "LOCK", "WB6");
    await store.set("app:track", { waybill: "WB6", status: "Pending", status_type: "UD", at_ist: istString() });
    assert.ok((await eventwake.check(fire)).idle);
    await store.set("handoff:last", { date_for: "2026-10-14", phase_done: "BRIEF", shipment: { waybill: "WB6" } });
    assert.ok((await eventwake.check(fire)).idle);
  });
  await ok("a kirana order with an item it can't supply fires once", async () => {
    await night("2026-10-15", "BUY", null);
    await store.push("log", { id: 901, at_ist: "2026-10-14T21:36:00.000", kind: "tool", connector: "bridge (via elevenlabs adapter)", args: JSON.stringify({ name: "kr.order", labels: { items: "rajma 250 g", reference: "BAARI-2026-10-15-kirana" } }), result: JSON.stringify({ http_status: 200, response: { success: false, status: "ITEM_NOT_STOCKED", not_stocked: ["rajma"] } }) });
    const r = await eventwake.check(fire);
    assert.deepStrictEqual(r.fired, ["kirana:BAARI-2026-10-15-kirana"]);
    assert.ok(/EVENT: Sharma Kirana order BAARI-2026-10-15-kirana came back with rajma unavailable at 21:36/.test(r.extra), r.extra);
    assert.ok((await eventwake.check(fire)).none);
  });
  await ok("a debit that went FAILED after PENDING fires once", async () => {
    await night("2026-10-16", "BUY", null);
    await store.set("pl:mpr:BAARI-2026-10-16-staples", "pres-1");
    await store.set("pl:pres:pres-1", { presentation_id: "pres-1", status: "FAILED", amount: { value: 18000 }, merchant_presentation_reference: "BAARI-2026-10-16-staples" });
    const r = await eventwake.check(fire);
    assert.deepStrictEqual(r.fired, ["debit:pres-1"]);
    assert.ok(/Reserve Pay debit BAARI-2026-10-16-staples \(Rs 180\) went FAILED after PENDING/.test(r.extra), r.extra);
    assert.ok((await eventwake.check(fire)).none);
  });
  await ok("the wake is an event in the household stream", async () => {
    const [e] = await store.range("hh:events", 1);
    assert.strictEqual(e.event, "check_event");
  });
  console.log(`${pass} passed`);
})();
