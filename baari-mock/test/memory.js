// What Baari remembers (lib/memory.js), S8 step B. In memory, no server, no
// Telegram (stubbed): node test/memory.js
const assert = require("assert");
const store = require("../lib/store");
const telegram = require("../lib/telegram");
const memory = require("../lib/memory");
const att = require("../lib/attendance");
const bridge = require("../lib/bridge");
const { istDate } = require("../lib/util");

const sent = [];
telegram.sendMessage = async (m) => { sent.push(m); return { ok: true, message_id: sent.length }; };

const shift = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const TODAY = istDate();
// 10:00 and 23:00 IST on a given date.
const at = (d, hhmm) => new Date(Date.parse(`${d}T${hhmm}:00+05:30`));

let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

(async () => {
  await store.set("turn", { tonight: { date_for: shift(TODAY, 1), holder: "Vinay" } });
  await store.set("handoff:last", {});

  await ok("the guard refuses a condition, in English and Hindi", async () => {
    for (const text of ["Papa has diabetes", "Papa is diabetic", "Papa ko sugar ki bimari hai", "Papa's BP is high", "high blood pressure", "cholesterol", "thyroid", "heart patient", "dil ki bimari", "kidney stones", "Mummy is pregnant", "पापा को शुगर की बीमारी है", "बीपी है", "दिल की बीमारी"]) {
      const r = await memory.add({ who: "Papa", kind: "rule", text, by: "Mummy", via: "telegram" });
      assert.strictEqual(r.error, "SAY_IT_AS_A_PLATE_RULE", text);
    }
    const plate = await memory.add({ who: "Papa", kind: "rule", text: "no sugar", say_it_as: "No sugar on Papa's plate", by: "Mummy", via: "telegram" });
    assert.ok(plate.ok);
  });
  await ok("about yourself (not health): confirmed; about someone else: proposed", async () => {
    const self = await memory.add({ who: "Mummy", kind: "like", text: "likes kadhi", by: "Mummy", via: "telegram" });
    assert.strictEqual(self.fact.status, "confirmed");
    const other = await memory.add({ who: "Papa", kind: "dislike", text: "no karela", by: "Mummy", via: "telegram_voice" });
    assert.strictEqual(other.fact.status, "proposed");
  });
  await ok("every health rule is proposed, even about yourself; someone else's goes to Vinay", async () => {
    const self = await memory.add({ who: "Papa", kind: "rule", text: "less salt", say_it_as: "Less salt on Papa's plate", by: "Papa", via: "telegram" });
    assert.strictEqual(self.fact.status, "proposed");
    assert.strictEqual(memory.confirmer(self.fact), "Papa");
    const sugar = (await memory.about("Papa")).find((f) => f.text === "no sugar");
    assert.strictEqual(sugar.status, "proposed");
    assert.strictEqual(memory.confirmer(sugar), "Vinay");
  });
  await ok("only the person a fact is about confirms it", async () => {
    const karela = (await memory.about("Papa")).find((f) => f.text === "no karela");
    const no = await memory.act({ id: karela.id, action: "confirm", by: "Mummy" });
    assert.strictEqual(no.error, "NOT_ALLOWED");
    const yes = await memory.act({ id: karela.id, action: "confirm", by: "Papa" });
    assert.strictEqual(yes.fact.status, "confirmed");
  });
  await ok("hh.learn on the bridge: msg:<id>:<status>, and the guard as fail:", async () => {
    const call = async (labels) => {
      const r = await bridge.route({ method: "POST", path: "/v1/voices/add", headers: {}, body: JSON.stringify({ name: "hh.learn", labels: JSON.stringify(labels) }) }, { rest: async () => ({}), loadAudio: async () => null, form: () => ({}) });
      return r.body.voice_id;
    };
    assert.ok(/^msg:f\d+\w*:confirmed$/.test(await call({ who: "Vinay", kind: "like", text: "likes rajma", by: "Vinay", via: "telegram" })));
    assert.ok(/^msg:f\d+\w*:proposed$/.test(await call({ who: "Behen", kind: "dislike", text: "no lauki", by: "Vinay" })));
    assert.ok(/^fail:SAY_IT_AS_A_PLATE_RULE/.test(await call({ who: "Papa", kind: "rule", text: "Papa ko BP hai", by: "Mummy" })));
  });

  // ---- patterns
  await ok("patterns: two vetoes is a dislike, two losses a like, 2 of 3 weekdays a routine, 3 buys a pantry fact", async () => {
    await store.del("memory");
    // Papa away on the same weekday 1 and 2 weeks back. The older one is
    // past attendance's reach, so an earlier day's run logged it.
    const w1 = shift(TODAY, -6), w2 = shift(TODAY, -13);
    await store.set(`att:${w2}`, { date_for: w2, away: [{ name: "Papa", by: "Papa" }], guests: 0 });
    await memory.patterns(shift(TODAY, -7));
    const d1 = shift(TODAY, -2), d2 = shift(TODAY, -9);
    await store.push("hh:events", { event: "veto", who: "Papa", dish: "Lauki chana dal", at_ist: `${d2}T21:10:00.000` });
    await store.push("hh:events", { event: "veto", who: "Papa", dish: "Lauki chana dal", at_ist: `${d1}T21:10:00.000` });
    await store.push("hh:events", { event: "veto", who: "Mummy", dish: "Rajma chawal", at_ist: `${d1}T21:10:00.000` });
    await store.set("kitchen", { pantry: {}, dishes: {}, meals: {
      [d2]: { date_for: d2, dish: "Rajma chawal", runner_up: "Kadhi chawal", lost_by: ["Behen"], bought: [{ item: "tomato", qty: 300 }] },
      [shift(TODAY, -5)]: { date_for: shift(TODAY, -5), dish: "Aloo puri", runner_up: "Palak paneer roti", lost_by: [], bought: [{ item: "tomato", qty: 300 }] },
      [d1]: { date_for: d1, dish: "Lauki chana dal", runner_up: "Kadhi chawal", lost_by: ["Behen"], bought: [{ item: "tomato", qty: 200 }, { item: "curd", qty: 500 }] },
    } });
    await store.set(`att:${w1}`, { date_for: w1, away: [{ name: "Papa", by: "Mummy" }], guests: 0 });
    const { proposed } = await memory.patterns(TODAY);
    const got = proposed.map((f) => `${f.who}|${f.kind}|${f.say_it_as}`).sort();
    const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${w1}T12:00:00Z`).getUTCDay()];
    assert.deepStrictEqual(got, [
      "Behen|like|Behen keeps asking for Kadhi chawal",
      "Everyone|pantry|Keep tomato stocked: bought 3 times in two weeks",
      "Papa|dislike|Papa isn't keen on Lauki chana dal",
      `Papa|routine|Papa eats out on ${day}s`,
    ]);
    assert.ok(proposed.every((f) => f.status === "proposed" && f.source.via === "pattern"));
    assert.strictEqual(proposed.find((f) => f.kind === "routine").evidence.length, 2);
  });
  await ok("patterns run once a day from the heartbeat, and never bring back a rejected fact", async () => {
    const dislike = (await memory.about("Papa")).find((f) => f.kind === "dislike");
    await memory.act({ id: dislike.id, action: "reject", by: "Papa" });
    const again = await memory.patterns(TODAY);
    assert.ok(!again.proposed.some((f) => f.kind === "dislike"));
    const t1 = await memory.tick(at(TODAY, "07:00"));
    const t2 = await memory.tick(at(TODAY, "07:01"));
    assert.ok(t1.patterns && !t2.patterns);
  });

  // ---- asking
  await ok("never between 22:00 and 08:00 IST", async () => {
    sent.length = 0;
    for (const t of ["22:00", "23:30", "03:00", "07:59"]) assert.strictEqual((await memory.askNext(at(TODAY, t))).quiet, true, t);
    assert.strictEqual(sent.length, 0);
  });
  await ok("at most one ask per person per day, with Yes and No", async () => {
    // Papa has one proposed routine; give him a second proposed fact.
    await memory.add({ who: "Papa", kind: "like", text: "likes kadhi", by: "Mummy", via: "telegram" });
    const r = await memory.askNext(at(TODAY, "10:00"));
    const to = r.sent.map((s) => s.to).sort();
    assert.deepStrictEqual(to, ["Behen", "Papa", "Vinay"]);
    const papa = sent.find((m) => m.to === "Papa");
    assert.ok(/^Should I remember this\? Papa (eats out on \w+days|likes kadhi)\.$/.test(papa.text), papa.text);
    assert.deepStrictEqual(papa.buttons[0].map((b) => b.text), ["Yes", "No"]);
    const again = await memory.askNext(at(TODAY, "15:00"));
    assert.deepStrictEqual(again.sent, []);
    const tomorrow = await memory.askNext(at(shift(TODAY, 1), "10:00"));
    assert.deepStrictEqual(tomorrow.sent.map((s) => s.to), ["Papa"]);
  });
  await ok("a tap on Yes confirms and logs an event; No rejects", async () => {
    const routine = (await memory.about("Papa")).find((f) => f.kind === "routine");
    const reply = await memory.onButton("Papa", `mem:yes:${routine.id}`);
    assert.ok(/^Noted: Papa eats out on/.test(reply), reply);
    const [e] = await store.range("hh:events", 1);
    assert.strictEqual(e.event, "memory");
    assert.strictEqual(e.action, "confirm");
    const like = (await memory.about("Papa")).find((f) => f.text === "likes kadhi");
    assert.strictEqual(await memory.onButton("Papa", `mem:no:${like.id}`), "Okay, I won't remember that.");
    assert.ok(!(await memory.about("Papa")).some((f) => f.text === "likes kadhi"));
  });
  await ok("a confirmed routine marks the person away (auto) for that weekday's meal, once", async () => {
    const routine = (await memory.about("Papa")).find((f) => f.kind === "routine");
    const target = [1, 2, 3, 4, 5, 6, 7].map((i) => shift(TODAY, i)).find((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === routine.data.weekday);
    const marked = await memory.applyRoutines(target);
    assert.deepStrictEqual(marked, ["Papa"]);
    const v = await att.view(target);
    assert.ok(v.away.some((a) => a.name === "Papa" && a.auto && a.via === "memory"));
    assert.ok(/routine/.test(att.line(v)), att.line(v));
    assert.deepStrictEqual(await memory.applyRoutines(target), []);
  });
  await ok("/yaad lists what Baari remembers about the sender, with a remove button each", async () => {
    const y = await memory.yaad("Papa");
    assert.ok(/^What I remember about you:\n1\. /.test(y.text), y.text);
    assert.ok(y.buttons.every((row) => /^mem:del:/.test(row[0].data)));
    const reply = await memory.onButton("Papa", y.buttons[0][0].data);
    assert.ok(/^Forgotten: /.test(reply), reply);
  });
  await ok("LEARNED: confirmed only, newest first, at most 12", async () => {
    await store.del("memory");
    assert.strictEqual(await memory.learnedLine(), "LEARNED: nothing confirmed yet.");
    await memory.add({ who: "Mummy", kind: "like", text: "likes kadhi", via: "app", ref: "profile" });
    await memory.add({ who: "Behen", kind: "dislike", text: "no lauki", by: "Vinay", via: "telegram" });
    await memory.add({ who: "Papa", kind: "dislike", text: "no karela", by: "Papa", via: "telegram" });
    assert.strictEqual(await memory.learnedLine(), "LEARNED: Papa: no karela (confirmed, Telegram). Mummy: likes kadhi (confirmed, app).");
    for (let i = 0; i < 15; i++) await memory.add({ who: "Vinay", kind: "like", text: `likes dish ${i}`, by: "Vinay", via: "telegram" });
    const l = await memory.learnedLine();
    assert.strictEqual(l.split(" (confirmed").length - 1, 12);
    assert.ok(l.startsWith("LEARNED: Vinay: likes dish 14"), l);
  });
  console.log(`${pass} passed`);
})();
