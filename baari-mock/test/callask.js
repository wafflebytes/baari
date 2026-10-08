// Baari calls to ask (lib/callask.js, lib/gaps.js), S8 step E. A web session
// with Gnani stubbed, in memory, no server: node test/callask.js
process.env.HOUSEHOLD_KEY = "hk-test";
const assert = require("assert");
const store = require("../lib/store");
const gnani = require("../lib/gnani");
const profile = require("../lib/profile");
const gaps = require("../lib/gaps");
const callask = require("../lib/callask");
const att = require("../lib/attendance");
const call = require("../lib/call");
const app = require("../lib/app");

// Gnani: every line gets a clip; STT hears whatever the test queued.
const spoken = [];
const heardQueue = [];
gnani.textToSpeech = async ({ text }) => { spoken.push(text); return { ok: true, audio_url: `http://rails.test/media/tts/${spoken.length}.mp3` }; };
gnani.speechToText = async (_, load) => { const a = await load(); assert.ok(a.bytes.length); return { ok: true, transcript: heardQueue.shift() || "" }; };

const D = "2026-10-09";
const BASE = "http://rails.test";
let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

(async () => {
  await store.set("turn", { tonight: { date_for: D, holder: "Vinay" } });
  await store.set("handoff:last", {});
  await profile.save({ home: "Sharma house", members: [{ name: "Vinay" }, { name: "Mummy" }, { name: "Papa" }, { name: "Behen" }], cook: { name: "Sunita", arrives: "08:00", lang: "Hindi" } }, "Vinay");

  let before;
  await ok("gaps rank headcount first, then rotis, spice, the cook's days off", async () => {
    before = await gaps.state();
    const ids = before.missing.map((g) => g.id);
    assert.deepStrictEqual(ids.slice(0, 7), ["eating_tomorrow", "eating_tomorrow", "eating_tomorrow", "eating_tomorrow", "rotis_per_adult", "spice", "cook_days_off"]);
    assert.deepStrictEqual(before.missing.slice(0, 4).map((g) => g.who), ["Vinay", "Mummy", "Papa", "Behen"]);
    assert.strictEqual(before.missing[4].who, "anyone");
    assert.ok(/T18:00:00/.test(before.next_ask_ist));
  });

  let s;
  await ok("a web call greets by name and asks the first of two gaps", async () => {
    s = await callask.start({ member: "Mummy", purpose: "ask", carrier: "web", base: BASE });
    assert.ok(s.ok, s.error);
    assert.ok(s.session.startsWith("ask-"));
    assert.deepStrictEqual(s.asking, ["eating_tomorrow", "rotis_per_adult"]);
    assert.ok(s.line_text.startsWith("नमस्ते Mummy जी! मैं बारी बोल रही हूँ। दो छोटी बातें पूछनी हैं। कल आप घर पे खाना खाएँगे?"), s.line_text);
    assert.strictEqual(s.audio_url, "http://rails.test/media/tts/1.mp3");
    assert.strictEqual(s.done, false);
  });
  await ok("answer one: confirmed back in a line, then the second question", async () => {
    const r = await callask.turn({ session: s.session, text: "haan ji, khaungi", base: BASE });
    assert.deepStrictEqual(r.answered, ["eating_tomorrow"]);
    assert.ok(r.line_text.startsWith("ठीक है, कल आप घर पे खाएँगे।"), r.line_text);
    assert.ok(/कितनी रोटी/.test(r.line_text), r.line_text);
    assert.strictEqual(r.done, false);
  });
  await ok("an unclear answer gets asked once more", async () => {
    const r = await callask.turn({ session: s.session, text: "pata nahi", base: BASE });
    assert.ok(r.line_text.startsWith("माफ़ कीजिए, फिर से बताइए?"), r.line_text);
    assert.deepStrictEqual(r.answered, ["eating_tomorrow"]);
  });
  await ok("answer two from audio: stored, and the call closes with baaki baad mein poochungi", async () => {
    heardQueue.push("teen roti");
    const r = await callask.turn({ session: s.session, audio: Buffer.from("fake webm").toString("base64"), base: BASE });
    assert.strictEqual(r.heard, "teen roti");
    assert.deepStrictEqual(r.answered, ["eating_tomorrow", "rotis_per_adult"]);
    assert.ok(r.line_text.startsWith("ठीक है, एक बड़े के लिए तीन रोटी।"), r.line_text);
    assert.ok(r.line_text.endsWith("बाकी बाद में पूछूँगी। धन्यवाद, नमस्ते!"), r.line_text);
    assert.strictEqual(r.done, true);
    assert.ok(r.audio_url);
  });
  await ok("answers are Mummy's own (via call) and the gaps shrink", async () => {
    const p = await profile.state();
    assert.strictEqual(p.answers_by.Mummy.rotis_per_adult.value, 3);
    assert.strictEqual(p.answers_by.Mummy.rotis_per_adult.via, "call");
    assert.strictEqual(p.answers_by.Mummy.eating_tomorrow.value, true);
    assert.strictEqual(p.answers.rotis_per_adult, 3);
    assert.strictEqual(p.answers.eating_tomorrow, undefined);
    const after = await gaps.state();
    assert.strictEqual(after.missing.length, before.missing.length - 2);
    assert.ok(!after.missing.some((g) => g.id === "rotis_per_adult"));
    assert.ok(!after.missing.some((g) => g.id === "eating_tomorrow" && g.who === "Mummy"));
  });
  await ok("Papa says he's out tomorrow: he's marked away, by himself, via call", async () => {
    const r = await callask.start({ member: "Papa", carrier: "web", base: BASE });
    assert.deepStrictEqual(r.asking, ["eating_tomorrow", "spice"]);
    const t = await callask.turn({ session: r.session, text: "nahi, kal office mein khaunga" });
    assert.ok(t.line_text.startsWith("ठीक है, कल आप घर पे नहीं खाएँगे।"), t.line_text);
    const v = await att.view(D);
    assert.ok(v.away.some((a) => a.name === "Papa" && a.by === "Papa" && a.via === "call"));
    assert.strictEqual(v.headcount, 3);
  });
  await ok("call.js reads the headcount from attendance, not a fixed 4", async () => {
    const f = await call.kitchenFacts(D);
    assert.strictEqual(f.headcount, 3);
  });
  await ok("the call never asks a health goal, and events say what happened", async () => {
    const kinds = (await store.range("hh:events", 40)).map((e) => e.event);
    assert.ok(kinds.includes("call") && kinds.includes("answer"));
    const answers = (await store.range("hh:events", 40)).filter((e) => e.event === "answer").map((e) => e.q);
    assert.ok(!answers.includes("health_goals"));
  });
  await ok("/app/call needs the household key; with it, the same web session", async () => {
    const no = await app.handle({ method: "POST", path: "/app/call", query: {}, headers: { host: "rails.test" }, body: JSON.stringify({ member: "Behen", purpose: "ask", carrier: "web" }) });
    assert.strictEqual(no.status, 401);
    const yes = await app.handle({ method: "POST", path: "/app/call", query: {}, headers: { host: "rails.test", "x-household-key": "hk-test" }, body: JSON.stringify({ member: "Behen", purpose: "ask", carrier: "web" }) });
    assert.strictEqual(yes.status, 200);
    assert.ok(yes.body.session && yes.body.line_text && yes.body.audio_url);
    const t = await app.handle({ method: "POST", path: "/app/call/turn", query: {}, headers: { host: "rails.test", "x-household-key": "hk-test" }, body: JSON.stringify({ session: yes.body.session, text: "haan" }) });
    assert.strictEqual(t.status, 200);
    assert.deepStrictEqual(t.body.answered, ["eating_tomorrow"]);
  });
  await ok("phone stays off without Twilio (demo number only)", async () => {
    const r = await callask.start({ member: "Vinay", carrier: "phone", base: BASE });
    assert.strictEqual(r.ok, false);
    assert.ok(/Phone calls aren't set up/.test(r.error));
  });
  await ok("/app/profile and /app/memory: household key, and only the owner confirms", async () => {
    const h = { host: "rails.test", "x-household-key": "hk-test" };
    const p = await app.handle({ method: "POST", path: "/app/profile", query: {}, headers: h, body: JSON.stringify({ answers: { pay_without_asking: 900 }, by: "Vinay" }) });
    assert.strictEqual(p.status, 200);
    assert.strictEqual(p.body.profile.answers.pay_without_asking, 300);
    const f = await require("../lib/memory").add({ who: "Papa", kind: "like", text: "likes rajma", by: "Mummy", via: "telegram" });
    const bad = await app.handle({ method: "POST", path: "/app/memory", query: {}, headers: h, body: JSON.stringify({ id: f.fact.id, action: "confirm", by: "Mummy" }) });
    assert.strictEqual(bad.status, 403);
    const good = await app.handle({ method: "POST", path: "/app/memory", query: {}, headers: h, body: JSON.stringify({ id: f.fact.id, action: "edit", text: "likes rajma chawal", by: "Papa" }) });
    assert.strictEqual(good.status, 200);
    assert.strictEqual(good.body.fact.status, "confirmed");
  });
  console.log(`${pass} passed`);
})();
