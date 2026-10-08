// The household profile (lib/profile.js), S8 step A. In memory, no server:
// node test/profile.js
const assert = require("assert");
const store = require("../lib/store");
const profile = require("../lib/profile");
const memory = require("../lib/memory");
const att = require("../lib/attendance");

let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

const BODY = {
  home: "Sharma house, Rohini",
  members: [{ name: "Vinay", lang: "English" }, { name: "Mummy" }, { name: "Papa" }, { name: "Behen" }, { name: "Dadi", eats: false, in_baari: false }],
  cook: { name: "Sunita", arrives: "8:00", lang: "Hindi" },
  mode: "pick",
  languages: ["Hinglish"],
  rules: { diet: "veg", jain: false, avoid: { papa: { aloo: 2, karela: 2 }, mummy: { meetha: 1 } }, nv: ["tue"], vrat: ["navratri"], lines: ["Papa ko diabetes hai, sugar mat dena", "Less oil on weekdays"] },
  answers: { rotis_per_adult: 3, spice: "medium", budget: 20000, pay_without_asking: 500 },
  by: "Vinay",
};

(async () => {
  let r;
  await ok("money answers are clamped to the mandate, and the response says so", async () => {
    r = await profile.save(BODY, "Vinay");
    assert.ok(r.ok, r.error);
    assert.strictEqual(r.profile.answers.budget, 12000);
    assert.strictEqual(r.profile.answers.pay_without_asking, 300);
    assert.deepStrictEqual(r.clamped.map((c) => [c.id, c.asked, c.kept]), [["budget", 20000, 12000], ["pay_without_asking", 500, 300]]);
    assert.ok(/Rs 400 a day/.test(r.clamped[0].why), r.clamped[0].why);
    assert.ok(/over Rs 300/.test(r.clamped[1].why), r.clamped[1].why);
    assert.ok(/Clamped/.test(r.limits.note));
  });
  await ok("answers inside the limits stay as given", async () => {
    const x = profile.clampAnswers({ budget: 9000, pay_without_asking: 250, budget_day: 300 });
    assert.deepStrictEqual(x.clamped, []);
    assert.strictEqual(x.answers.pay_without_asking, 250);
  });
  await ok("state.profile has home, members, cook, answers, updated_at, updated_by", async () => {
    const s = await profile.state();
    for (const k of ["home", "members", "cook", "answers", "updated_at", "updated_by"]) assert.ok(k in s, k);
    assert.strictEqual(s.cook.arrives, "08:00");
    assert.strictEqual(s.updated_by, "Vinay");
  });
  await ok("each rule is a confirmed memory fact, via app", async () => {
    const facts = (await memory.state()).facts;
    const say = facts.map((f) => f.say_it_as);
    for (const want of ["No potato on Papa's plate", "No karela on Papa's plate", "Less sugar on Mummy's plate", "No non-veg on Tuesday", "Fasting food on Navratri", "Only vegetarian food at home", "Less oil on weekdays"]) assert.ok(say.includes(want), `${want} in ${say.join(" | ")}`);
    assert.ok(facts.every((f) => f.status === "confirmed" && f.source.via === "app"));
  });
  await ok("a health avoid is a plate rule, never a condition; a line naming one is refused", async () => {
    const potato = (await memory.about("Papa")).find((f) => f.text === "no potato");
    assert.strictEqual(potato.health, true);
    assert.strictEqual(potato.say_it_as, "No potato on Papa's plate");
    assert.strictEqual(r.refused.length, 1);
    assert.strictEqual(r.refused[0].error, "SAY_IT_AS_A_PLATE_RULE");
    const all = JSON.stringify((await memory.state()).facts);
    assert.ok(!/diabet/i.test(all), "no condition word stored");
  });
  await ok("PEOPLE line comes from the profile", async () => {
    const l = await profile.peopleLine();
    assert.strictEqual(l, "PEOPLE (household profile, Sharma house, Rohini; use this over any other PEOPLE line): Vinay (approves money), Mummy, Papa, Behen, Dadi (doesn't eat at home, not in the baari), Sunita (cook, arrives 08:00, speaks Hindi).");
  });
  await ok("attendance's members come from the profile (Dadi doesn't eat at home)", async () => {
    assert.deepStrictEqual(await att.members(), ["Vinay", "Mummy", "Papa", "Behen"]);
  });
  await ok("saving again replaces the profile's facts and keeps unchanged ids", async () => {
    const before = (await memory.about("Papa")).find((f) => f.text === "no potato").id;
    await profile.save({ rules: { diet: "veg", avoid: { papa: { aloo: 2 } } } }, "Mummy");
    const papa = await memory.about("Papa");
    assert.strictEqual(papa.find((f) => f.text === "no potato").id, before);
    assert.ok(!papa.some((f) => f.text === "no karela"), "karela rule gone");
    assert.strictEqual((await profile.state()).updated_by, "Mummy");
  });
  await ok("a save emits a profile event", async () => {
    const [e] = await store.range("hh:events", 1);
    assert.strictEqual(e.event, "profile");
  });
  await ok("no profile, no PEOPLE line (the Worker's fixed line stands)", async () => {
    const saved = await store.get("profile");
    await store.del("profile");
    assert.strictEqual(await profile.peopleLine(), null);
    assert.deepStrictEqual(await att.members(), att.DEFAULT_EATERS);
    await store.set("profile", saved);
  });
  console.log(`${pass} passed`);
})();
