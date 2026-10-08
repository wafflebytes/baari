// The quiet log (lib/quiet.js), S8 step C. In memory, no server: node test/quiet.js
const assert = require("assert");
const store = require("../lib/store");
const quiet = require("../lib/quiet");

const D = "2026-10-09";
let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

const tool = (name, ok = true) => ({ kind: "tool", connector: "bridge (via elevenlabs adapter)", tool: "create_voice_clone", args: JSON.stringify({ name, labels: { to: "Vinay" } }), result: JSON.stringify(ok ? { ok: true, message_id: 7 } : { ok: false, error: "no chat" }) });
const wake = (phase, d = D) => ({ kind: "wake", note: `starting ${phase} for ${d}`, phase });

(async () => {
  await store.set("handoff:last", { date_for: D, phase_done: "CHECK" });
  // Runs, oldest pushed first (the list is newest first, like rails keeps it).
  await store.push("runs", { at_ist: "2026-10-07T21:00:00.000", handoff: { date_for: "2026-10-08" }, decisions: [{ raw: "D1 old night", decided: "Locked Kadhi chawal", said_did: "told everyone" }] });
  await store.push("runs", { at_ist: "2026-10-08T20:30:00.000", handoff: { date_for: D }, decisions: [
    { raw: "D1 | 20:30 | shortlist", at: "20:30", decided: "Offered Rajma chawal and Lauki chana dal (S1, S3)", said_did: "sent Vinay the holder card", via: "tg.send" },
  ] });
  await store.push("runs", { at_ist: "2026-10-08T21:30:00.000", handoff: { date_for: D }, decisions: [
    { raw: "D1 | 20:30 | shortlist", at: "20:30", decided: "Offered Rajma chawal and Lauki chana dal (S1, S3)", said_did: "sent Vinay the holder card", via: "tg.send" },
    { raw: "D2 | 21:30 | lock", at: "21:30", decided: "Locked Rajma chawal, rule V2", said_did: "" },
  ] });
  await store.push("runs", { at_ist: "2026-10-08T22:45:00.000", handoff: { date_for: D }, decisions: [
    { raw: "D3 | 22:45 | check", at: "22:45", decided: "Parcel on time, kept the plan per C1", said_did: "nothing to tell" },
  ] });
  // The call log for the night, oldest pushed first.
  for (const e of [
    wake("INBOX", "2026-10-08"), tool("tg.send"),
    wake("SHORTLIST"), tool("tg.send"), tool("tg.send"),
    wake("INBOX"), tool("tg.send"), tool("tg.send", false),
    wake("LOCK"), tool("tg.send"),
    wake("CHECK"), tool("tg.send"),
    wake("BRIEF"), tool("tg.voice"),
  ]) await store.push("log", { at_ist: "2026-10-08T21:00:00.000", ...e });

  let q;
  await ok("handled counts the night's D lines across runs, each once", async () => {
    q = await quiet.state();
    assert.strictEqual(q.date_for, D);
    assert.strictEqual(q.handled, 3);
  });
  await ok("told counts sends to people outside the shortlist, result and brief", async () => {
    // INBOX's one delivered reply and CHECK's note; the failed send doesn't count.
    assert.strictEqual(q.told, 2);
  });
  await ok("items are plain words with rule ids stripped", async () => {
    assert.deepStrictEqual(q.items.map((i) => i.at_ist), ["20:30", "21:30", "22:45"]);
    for (const i of q.items) assert.ok(!/\b[A-Z]\d{1,2}\b/.test(i.text), i.text);
    assert.strictEqual(q.items[1].text, "Locked Rajma chawal");
    assert.strictEqual(q.items[0].told, true);
    assert.strictEqual(q.items[1].told, false);
  });
  await ok("another night's runs and sends stay out", async () => {
    const other = await quiet.build("2026-10-08");
    assert.strictEqual(other.handled, 1);
    assert.strictEqual(other.told, 1);
  });
  console.log(`${pass} passed`);
})();
