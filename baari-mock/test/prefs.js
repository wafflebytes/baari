// Voice and language prefs (lib/prefs.js), voice by audience in Gnani TTS,
// /awaaz on Telegram. In memory, no server, no keys: Gnani and Telegram are
// stubbed at fetch. node test/prefs.js
const assert = require("assert");
const store = require("../lib/store");
const prefs = require("../lib/prefs");
const gnani = require("../lib/gnani");
const telegram = require("../lib/telegram");

// Every outgoing call lands here. Gnani TTS returns 4 bytes of "audio";
// Telegram's sendVoice returns a file_id.
const calls = [];
global.fetch = async (url, opts = {}) => {
  const body = typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
  calls.push({ url: String(url), body });
  if (/vachana\.ai\/api\/v1\/tts/.test(url)) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from("OggS") };
  const method = String(url).split("/").pop();
  const result = { message_id: 50 + calls.length, chat: { id: 111 }, date: 1760000000 };
  if (method === "sendVoice") result.voice = { file_id: "FILE-nalini-hi", duration: 3 };
  return { ok: true, status: 200, json: async () => ({ ok: true, result }) };
};
const tg = { call: telegram.call, sendMessage: telegram.sendMessage, sendVoice: telegram.sendVoice };
const ttsCalls = () => calls.filter((c) => /vachana/.test(c.url));
const tgCalls = (m) => calls.filter((c) => c.url.endsWith(`/${m}`));

let pass = 0;
const ok = (name, fn) => fn().then(() => { pass++; console.log("  ✓", name); }).catch((e) => { console.log("  x", name, e.message); process.exitCode = 1; });

(async () => {
  await ok("defaults: owner chitra, cook urmila, owner en, cook hi", async () => {
    const p = await prefs.get();
    assert.deepStrictEqual([p.voice, p.lang], [{ owner: "chitra", cook: "urmila" }, { owner: "en", cook: "hi" }]);
  });
  await ok("POST cook nalini, then a cook-brief TTS with no voice uses Nalini", async () => {
    const r = await prefs.set({ voice: { cook: "Nalini" } }, { by: "app", via: "app" });
    assert.ok(r.ok);
    assert.strictEqual(r.prefs.voice.cook, "nalini");
    assert.deepStrictEqual(r.changed, ["voice.cook"]);
    const t = await gnani.textToSpeech({ text: "कल राजमा चावल", audience: "cook" }, "http://rails");
    assert.strictEqual(t.voice, "Nalini");
    assert.strictEqual(t.language, "hi-IN");
    assert.strictEqual(ttsCalls().pop().body.voice, "Nalini");
  });
  await ok("the family hears the owner's voice, and a named voice still wins", async () => {
    assert.strictEqual((await gnani.textToSpeech({ text: "Hi", audience: "owner" }, "http://rails")).voice, "Chitra");
    assert.strictEqual((await gnani.textToSpeech({ text: "Hi", audience: "owner" }, "http://rails")).language, "en-IN");
    assert.strictEqual((await gnani.textToSpeech({ text: "Hi", voice: "Kaveri", audience: "cook" }, "http://rails")).voice, "Kaveri");
    assert.strictEqual((await gnani.textToSpeech({ text: "Hi", language: "hi-IN" }, "http://rails")).voice, "Chitra");
  });
  await ok("the ElevenLabs adapter takes voice_id cook, and Nalini by name", async () => {
    const eleven = require("../lib/eleven_gnani");
    for (const id of ["cook", "Nalini"]) {
      const r = await eleven.route({ method: "POST", path: `/v1/text-to-speech/${id}`, headers: {}, query: {}, body: JSON.stringify({ text: "कल राजमा चावल" }) }, "http://rails", null);
      assert.strictEqual(r.status, 200, JSON.stringify(r.body));
      assert.strictEqual(ttsCalls().pop().body.voice, "Nalini");
    }
    // Before this change an unknown id fell back to Chitra; it still does.
    await eleven.route({ method: "POST", path: "/v1/text-to-speech/xyz", headers: {}, query: {}, body: JSON.stringify({ text: "hi" }) }, "http://rails", null);
    assert.strictEqual(ttsCalls().pop().body.voice, "Chitra");
  });
  await ok("an invalid voice falls back to the default and says so", async () => {
    const r = await prefs.set({ voice: { owner: "deepak" }, lang: { cook: "fr" } }, { by: "Vinay", via: "telegram" });
    assert.ok(r.ok);
    assert.strictEqual(r.prefs.voice.owner, "chitra");
    assert.strictEqual(r.prefs.lang.cook, "hi");
    assert.strictEqual(r.fixed.length, 2, r.fixed.join("; "));
  });
  await ok("Sunita can't change owner prefs; she can change her own voice", async () => {
    const r = await prefs.set({ voice: { owner: "jwala" } }, { by: "Sunita", via: "telegram" });
    assert.strictEqual(r.error, "NOT_ALLOWED");
    assert.strictEqual((await prefs.get()).voice.owner, "chitra");
    const r2 = await prefs.set({ lang: { cook: "mr" } }, { by: "Sunita", via: "telegram" });
    assert.ok(r2.ok && r2.prefs.lang.cook === "mr");
    assert.strictEqual(r2.prefs.updated_by, "telegram");
    // Mummy can like a dish, not change a voice.
    assert.strictEqual((await prefs.set({ voice: { cook: "jwala" } }, { by: "Mummy" })).error, "NOT_ALLOWED");
    await prefs.set({ lang: { cook: "hi" } }, { by: "app" });
  });
  await ok("every change is a prefs event; no change, no event", async () => {
    const before = (await store.range("hh:events", 50)).filter((e) => e.event === "prefs").length;
    await prefs.set({ voice: { cook: "nalini" } }, { by: "app" });
    await prefs.set({ voice: { cook: "ambuja" } }, { by: "Vinay", via: "telegram" });
    const ev = (await store.range("hh:events", 50)).filter((e) => e.event === "prefs");
    assert.strictEqual(ev.length, before + 1);
    assert.strictEqual(ev[0].summary, "Vinay set Sunita's voice to Ambuja");
    await prefs.set({ voice: { cook: "nalini" } }, { by: "app" });
  });
  await ok("/awaaz: a tap sends a real voice note once rendered, then the cached file_id", async () => {
    const n = (data) => ({ kind: "button", role: "Vinay", chat_id: "111", reply_to_message_id: 9, button_data: data });
    assert.ok(await prefs.onTelegram({ kind: "text", role: "Vinay", chat_id: "111", text: "/awaaz" }, "http://rails", tg));
    const card = tgCalls("sendMessage").pop().body;
    assert.deepStrictEqual(card.reply_markup.inline_keyboard[0].map((b) => b.text), ["● For me", "For Sunita"]);
    const tts0 = ttsCalls().length;
    await prefs.onTelegram(n("awaaz:aud:cook"), "http://rails", tg);
    await prefs.onTelegram(n("awaaz:try:cook:nalini"), "http://rails", tg);
    assert.strictEqual(ttsCalls().length, tts0 + 1, "rendered once");
    assert.strictEqual(tgCalls("sendVoice").length, 1);
    await prefs.onTelegram(n("awaaz:try:cook:nalini"), "http://rails", tg);
    assert.strictEqual(ttsCalls().length, tts0 + 1, "not rendered again");
    assert.strictEqual(tgCalls("sendVoice").pop().body.voice, "FILE-nalini-hi");
    // Keep Jwala for Sunita: saved, edited in place.
    await prefs.onTelegram(n("awaaz:keep:cook:jwala"), "http://rails", tg);
    const p = await prefs.get();
    assert.deepStrictEqual([p.voice.cook, p.updated_by, p.updated_who], ["jwala", "telegram", "Vinay"]);
    assert.strictEqual(tgCalls("editMessageText").pop().body.text, "Saved. Sunita's voice notes now use Jwala.");
  });
  await ok("/awaaz from Sunita: only her voice; a forged owner tap gets a polite no", async () => {
    await prefs.onTelegram({ kind: "text", role: "Sunita", chat_id: "222", text: "/awaaz" }, "http://rails", tg);
    const card = tgCalls("sendMessage").pop().body;
    assert.ok(/^Baari ki awaaz chuniye/.test(card.text), card.text);
    assert.ok(card.reply_markup.inline_keyboard.flat().every((b) => /^awaaz:try:cook:/.test(b.callback_data)));
    await prefs.onTelegram({ kind: "button", role: "Sunita", chat_id: "222", reply_to_message_id: 3, button_data: "awaaz:keep:owner:jwala" }, "http://rails", tg);
    assert.strictEqual((await prefs.get()).voice.owner, "chitra");
    assert.ok(/sirf Vinay/.test(tgCalls("sendMessage").pop().body.text));
    await prefs.onTelegram({ kind: "button", role: "Sunita", chat_id: "222", reply_to_message_id: 3, button_data: "awaaz:keep:cook:urmila" }, "http://rails", tg);
    assert.strictEqual((await prefs.get()).voice.cook, "urmila");
  });
  await ok("/awaaz and /bhasha from Papa: a polite no", async () => {
    await prefs.onTelegram({ kind: "text", role: "Papa", chat_id: "333", text: "/bhasha" }, "http://rails", tg);
    assert.strictEqual(tgCalls("sendMessage").pop().body.text, "Sorry, only Vinay can change Baari's language. Ask Vinay to send /bhasha.");
  });
  await ok("/bhasha: Vinay sets Sunita's language to Tamil, the sample is in Tamil", async () => {
    await prefs.onTelegram({ kind: "button", role: "Vinay", chat_id: "111", reply_to_message_id: 9, button_data: "bhasha:try:cook:ta" }, "http://rails", tg);
    const last = ttsCalls().pop().body;
    assert.deepStrictEqual([last.voice, last.language], ["Urmila", "ta-IN"]);
    await prefs.onTelegram({ kind: "button", role: "Vinay", chat_id: "111", reply_to_message_id: 9, button_data: "bhasha:keep:cook:ta" }, "http://rails", tg);
    assert.strictEqual((await prefs.get()).lang.cook, "ta");
    assert.strictEqual((await gnani.textToSpeech({ text: "x", audience: "cook" }, "http://rails")).language, "ta-IN");
  });
  await ok("POST /app/prefs needs the household key and returns the full record", async () => {
    process.env.HOUSEHOLD_KEY = "test-key";
    const app = require("../lib/app");
    const req = (key, body) => ({ method: "POST", path: "/app/prefs", headers: { host: "localhost", ...(key ? { "x-household-key": key } : {}) }, query: {}, body: JSON.stringify(body) });
    assert.strictEqual((await app.handle(req(null, { voice: { cook: "nalini" } }))).status, 401);
    const r = await app.handle(req("test-key", { voice: { cook: "nalini" }, cuisine: { like: ["korean-ramen", "nope"], freq: "2w" } }));
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual([r.body.prefs.voice.cook, r.body.prefs.cuisine.like, r.body.prefs.cuisine.freq], ["nalini", ["korean-ramen"], "2w"]);
    assert.ok(r.body.fixed.some((f) => /dropped nope/.test(f)));
    assert.strictEqual((await app.handle(req("test-key", { voice: { owner: "jwala" }, by: "Sunita" }))).status, 403);
    const st = await require("../lib/appfeed").state({ fresh: true });
    assert.strictEqual(st.prefs.voice.cook, "nalini");
    assert.deepStrictEqual(st.prefs.voices, ["urmila", "jwala", "chitra", "ambuja", "nalini"]);
  });
  console.log(`${pass} passed`);
  process.exit();
})();
