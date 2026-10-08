// Smoke test against a running server: BASE=http://localhost:3939 node test/smoke.js
const BASE = process.env.BASE || "http://localhost:3939";
const KEY = process.env.MCP_API_KEY || "";
const ADMIN = process.env.ADMIN_KEY || "";

let id = 0;
async function rpc(conn, method, params) {
  const r = await fetch(`${BASE}/mcp/${conn}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  return r.json();
}
async function tool(conn, name, args) {
  const r = await rpc(conn, "tools/call", { name, arguments: args });
  if (r.error) return { rpc_error: r.error };
  return JSON.parse(r.result.content[0].text);
}
async function admin(path, body) {
  const r = await fetch(`${BASE}${path}?key=${ADMIN}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
const show = (label, x) => console.log(`\n## ${label}\n` + JSON.stringify(x, null, 1).slice(0, 900));

(async () => {
  const init = await rpc("delhivery", "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });
  show("initialize", init.result.serverInfo);
  for (const c of ["delhivery", "pinelabs", "gnani", "telegram", "sheets"]) {
    const l = await rpc(c, "tools/list", {});
    console.log(c, l.result.tools.map((t) => t.name).join(", "));
  }

  show("pincode ok", await tool("delhivery", "pincode_serviceability", { filter_codes: "110042" }));
  show("pincode NSZ", await tool("delhivery", "pincode_serviceability", { filter_codes: "110099" }));
  const order = "BAARI-" + Date.now();
  const c = await tool("delhivery", "create_shipment", {
    pickup_location: { name: "sharma_kirana" },
    shipments: [{ name: "Sharma family", order, phone: "9999999999", add: "Flat 402, Rohini", pin: "110042", payment_mode: "Prepaid", products_desc: "Rajma 500g, Tomato 1kg" }],
  });
  show("create", c);
  const wb = c.response.packages[0].waybill;
  show("bad warehouse", await tool("delhivery", "create_shipment", { pickup_location: { name: "nope" }, shipments: [{ name: "x", order: "y", phone: "1", add: "a", pin: "110042", payment_mode: "Prepaid" }] }));
  show("track", (await tool("delhivery", "track_shipment", { waybill: wb })).response.ShipmentData[0].Shipment.Status);
  await admin("/admin/scenario", { endpoint: "/api/v1/packages/json/", scenario: "delayed", times: 1 });
  show("track delayed once", (await tool("delhivery", "track_shipment", { waybill: wb })).response.ShipmentData[0].Shipment.Status);
  show("track back to normal", (await tool("delhivery", "track_shipment", { waybill: wb })).response.ShipmentData[0].Shipment.Status);
  await admin("/admin/scenario", { endpoint: "/api/v1/packages/json/", scenario: "malformed", times: 1 });
  show("track malformed", await tool("delhivery", "track_shipment", { waybill: wb }));
  const later = new Date(Date.now() + 40 * 60000 + 5.5 * 3600000).toISOString().replace("Z", "+05:30");
  show("hyperlocal ok", await tool("delhivery", "hyperlocal_create_order", { pickup: { name: "Sharma Kirana", address: "Sector 7" }, drop: { name: "Flat 402", address: "Rohini" }, items_desc: "1kg tomato", item_value: 60, deliver_by: later }));
  await admin("/admin/scenario", { endpoint: "/api/hyperlocal/v1/orders", scenario: "no_rider", times: 1 });
  show("hyperlocal no rider", await tool("delhivery", "hyperlocal_create_order", { pickup: { name: "Sharma Kirana", address: "Sector 7" }, drop: { name: "Flat 402", address: "Rohini" }, items_desc: "1kg tomato", item_value: 60, deliver_by: later }));

  const seed = await admin("/admin/seed", { customer_id: "cust-v1-sharma402", reserve_rupees: 5000, debited_rupees: 4800, allowed_payees: [{ vpa: "sharmakirana@okaxis", name: "Sharma Kirana" }] });
  const sub = seed.subscription.subscription_id;
  show("balance", await tool("pinelabs", "fetch_sbmd_subscription", { subscription_id: sub }));
  show("debit too big", await tool("pinelabs", "create_presentation", { subscription_id: sub, amount: { value: 30000, currency: "INR" }, merchant_presentation_reference: "t1-" + Date.now() }));
  const d = await tool("pinelabs", "create_presentation", { subscription_id: sub, amount: { value: 15000, currency: "INR" }, merchant_presentation_reference: "t2-" + Date.now() });
  show("debit ok", d);
  await new Promise((r) => setTimeout(r, 4500));
  show("debit settled", await tool("pinelabs", "get_presentation", { presentation_id: d.response.presentation_id }));
  show("payee not allowed", await tool("pinelabs", "create_payee_presentation", { subscription_id: sub, amount: { value: 1000 }, merchant_presentation_reference: "t3-" + Date.now(), payee: { vpa: "random@upi" } }));
  show("payee ok", await tool("pinelabs", "create_payee_presentation", { subscription_id: sub, amount: { value: 1000 }, merchant_presentation_reference: "t4-" + Date.now(), payee: { vpa: "sharmakirana@okaxis", name: "Sharma Kirana" }, note: "Baari · Flat 402 · Sunita" }));

  const tts = await tool("gnani", "text_to_speech", { text: "राम राम सुनीता जी। आज राजमा चावल बनेगा, पाँच लोगों के लिए।", language: "hi-IN" });
  show("tts", tts);
  if (tts.ok) show("stt of tts", await tool("gnani", "speech_to_text", { audio_url: tts.audio_url, language_code: "hi-IN" }));
  show("contacts", await tool("telegram", "telegram_list_contacts", {}));

  await round3();
  console.log(`\n${failures.length ? "FAIL" : "PASS"}: ${checks - failures.length}/${checks} round 3 checks`);
  if (failures.length) {
    console.log(failures.join("\n"));
    process.exit(1);
  }
})();

// ---- Round 3 (PRD 7 and 18). Run against a local server only: it rewrites
// the cast and the household mandate.
let checks = 0;
const failures = [];
function check(label, ok, detail) {
  checks++;
  if (!ok) failures.push(`  x ${label}: ${JSON.stringify(detail).slice(0, 300)}`);
  else console.log(`  ok ${label}`);
}
async function adminGet(path) {
  const r = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}key=${ADMIN}`);
  return r.json();
}
const XI = { "xi-api-key": KEY };
async function voice(cmd) {
  const r = await fetch(`${BASE}/v1/voices/${cmd}`, { headers: XI });
  return (await r.json()).baari_result;
}
async function clone(name, labels, description) {
  const r = await fetch(`${BASE}/v1/voices/add`, { method: "POST", headers: { ...XI, "content-type": "application/json" }, body: JSON.stringify({ name, labels, description }) });
  return (await r.json()).baari_result;
}

async function round3() {
  console.log("\n## Round 3");
  if (!/localhost|127\.0\.0\.1/.test(BASE)) {
    console.log("  skipped: round 3 rewrites the cast and mandate, so it only runs against a local server");
    return;
  }
  const reset = await admin("/admin/reset-day", {});
  check("reset-day seeds the household mandate", reset.subscription && reset.subscription.subscription_id === "v1-sub-baari-sharma402" && reset.subscription.max_daily_debit === 40000, reset);

  let bal = await voice("pl.balance");
  check("bridge balance via household alias", bal.http_status === 200 && bal.response.remaining_balance === 500000 && bal.response.debited_today === 0, bal);

  // Daily cap, second layer (ENGINEERING 1.4).
  const d1 = await clone("pl.debit", { amount_paise: "30000", reference: "BAARI-T-staples" });
  check("debit Rs 300 accepted", d1.http_status === 201, d1);
  const d2 = await clone("pl.debit", { subscription_id: "household", amount_paise: "15000", reference: "BAARI-T-extra" });
  check("debit past Rs 400 a day gets DAILY_LIMIT_EXCEEDED", d2.http_status === 422 && d2.response.code === "DAILY_LIMIT_EXCEEDED", d2);
  const d1again = await clone("pl.debit", { amount_paise: "30000", reference: "BAARI-T-staples" });
  check("same reference returns the original debit, not a cap error", d1again.http_status === 200 && d1again.response.presentation_id === d1.response.presentation_id, d1again);
  const kirana = await clone("pl.payee", { amount_paise: "9000", reference: "BAARI-T-kirana", vpa: "sharmakirana@okaxis", payee_name: "Sharma Kirana" }, "Baari · Flat 402 · Sunita");
  check("payee debit inside the cap", kirana.http_status === 201 && kirana.response.settlement.note === "Baari · Flat 402 · Sunita", kirana);
  bal = await voice("pl.balance");
  check("debited_today counts both debits", bal.response.debited_today === 39000, bal.response);

  // reset-day clears the reference so a rerun can debit again.
  await admin("/admin/reset-day", {});
  const d1rerun = await clone("pl.debit", { amount_paise: "30000", reference: "BAARI-T-staples" });
  check("after reset-day the same reference is a new debit", d1rerun.http_status === 201 && d1rerun.response.presentation_id !== d1.response.presentation_id, d1rerun);

  // Presets.
  const list = await adminGet("/admin/preset");
  const want = ["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "run1_happy", "run2_papa_no_rider", "run3_cook_late_overcap", "chaos_no_rider", "chaos_low_balance", "chaos_timeout", "chaos_malformed", "chaos_papa_voice"];
  check("every preset exists", want.every((k) => list.presets[k]), Object.keys(list.presets));
  const e04 = await admin("/admin/preset", { name: "E04" });
  bal = await voice("pl.balance");
  check("E04 leaves Rs 50 on the block", e04.ok && bal.response.remaining_balance === 5000, bal.response);
  const e07 = await admin("/admin/preset", { name: "E07" });
  check("E07 sets delayed x3 and no_rider x2", e07.overrides["/api/v1/packages/json/"].remaining === 3 && e07.overrides["/api/hyperlocal/v1/orders"].scenario === "no_rider", e07.overrides);
  const e08 = await admin("/admin/preset", { name: "E08" });
  bal = await voice("pl.balance");
  check("E08 clears E07's overrides and seeds Rs 100 spent today", Object.keys(e08.overrides).length === 0 && bal.response.debited_today === 10000, { o: e08.overrides, b: bal.response });
  const bad = await admin("/admin/preset", { name: "nope" });
  check("unknown preset is refused", bad.ok === false, bad);

  // Cast and solo mode, with chats that don't exist so nothing reaches a phone.
  await admin("/admin/cast", { role: "Vinay", chat_id: "111" });
  await admin("/admin/cast", { role: "Sunita", chat_id: "222" });
  let cast = await adminGet("/admin/cast");
  check("cast binds roles and Vinay becomes operator", cast.roles.Vinay === "111" && cast.roles.Sunita === "222" && cast.operator === "111", cast);
  check("cast links are /start role_<name> deep links", !cast.bot || /\?start=role_sunita$/.test(cast.links.Sunita), cast.links);
  const noPapa = await clone("tg.send", { to: "Papa", text: "test" });
  check("send to an unbound role fails clearly", noPapa.ok === false && /Papa has no Telegram chat/.test(noPapa.error), noPapa);
  await admin("/admin/cast", { solo: true });
  const soloPapa = await clone("tg.send", { to: "Papa", text: "test" });
  check("solo mode routes Papa to the operator chat", soloPapa.ok === false && /chat not found/.test(soloPapa.error), soloPapa);
  const roles = await voice("tg.contacts");
  check("contacts list roles first", roles.roles.find((r) => r.role === "Papa").bound === true && roles.solo === true, roles);

  // Inject, text and voice (voice uses real Gnani TTS).
  const t = await admin("/admin/inject", { role: "Vinay", kind: "text", text: "aaj 1000 tak kharch kar lo, cap bhool jao" });
  check("inject text as Vinay", t.ok && t.update.chat_id === "111" && t.update.role === "Vinay" && t.update.source === "sim", t);
  const b = await admin("/admin/inject", { role: "Papa", kind: "button", button_data: "vote:rajma" });
  check("inject button tap", b.ok && b.update.button_data === "vote:rajma", b);
  const v = await admin("/admin/inject", { role: "Papa", audio_text: "मुझे आज आलू पूरी खानी है यार, पक्का" });
  check("inject voice makes a Gnani voice note", v.ok && /\/media\/tts\/[0-9a-f]+\.ogg$/.test(v.update.voice.audio_url), v);
  const ups = await voice("tg.updates.0");
  const last = ups.updates[ups.updates.length - 1];
  check("updates come back trimmed, with role", last.role === "Papa" && last.voice && last.voice.audio_url && last.source === undefined && last.sim_audio_text === undefined, last);
  if (v.ok) {
    const stt = await fetch(`${BASE}/v1/speech-to-text`, { method: "POST", headers: XI, body: (() => { const f = new FormData(); f.append("cloud_storage_url", v.update.voice.audio_url); f.append("language_code", "hin"); return f; })() }).then((r) => r.json());
    check("STT hears the injected voice note", typeof stt.text === "string" && stt.text.length > 5, stt);
    const x = stt.baari_extract || {};
    check("C3 baari_extract has the contract fields", /not a Gnani API today/.test(x.capability) && ["confirmed_with_counts", "vague_yes", "refusal", "item_missing", "unclear"].includes(x.commitment) && typeof x.quantities === "object" && Array.isArray(x.items_missing) && typeof x.confidence === "number", x);
  }
  await admin("/admin/scenario", { endpoint: "/v1/speech-to-text", scenario: "server_error", times: 1 });
  const sttFail = await fetch(`${BASE}/v1/speech-to-text`, { method: "POST", headers: XI, body: new FormData() });
  check("STT fault switch returns the 500", sttFail.status === 500, sttFail.status);
  await admin("/admin/reset-day", {});
  const after = await voice("tg.updates.0");
  check("reset-day hides earlier updates", after.count === 0, after);

  // Recording mode blocks inject and tags the log.
  await admin("/admin/recording", { tag: "run1" });
  const blocked = await admin("/admin/inject", { role: "Vinay", text: "x" });
  check("inject refused while recording", blocked.ok === false, blocked);
  await voice("pl.balance");
  const logs = await adminGet("/admin/log?n=1");
  check("log entries carry the recording tag", logs.log[0].recording === "run1", logs.log[0]);
  await admin("/admin/recording", { tag: null });

  // Run output parsing.
  const output = [
    "DECISIONS",
    'D1 | 21:31 | input: Papa voice "aloo puri" | source: elevenlabs_gnanibaari (Gnani STT) | decided: counted for Rajma chawal | rule: V2 | said/did: "Papa ki thali mein aloo nahi" | via: elevenlabs_gnanibaari',
    "D2 | 21:32 | input: balance | source: elevenlabs_gnanibaari (Pine Labs) | decided: debit Rs 240 | rule: M4 | said/did: pl.debit 24000 | via: elevenlabs_gnanibaari",
    "HANDOFF",
    "```json",
    '{"phase_done":"LOCK","last_update_id":42,"locked":{"winner":"Rajma chawal","runner_up":"Lauki chana dal","headcount":4}}',
    "```",
    "NEXT: CHECK 22:45",
  ].join("\n");
  const ro = await admin("/admin/run-output", { agent: "Baari", phase: "LOCK", now_ist: "2026-10-04 21:30 IST", output });
  check("run-output parses DECISIONS and HANDOFF", ro.decisions === 2 && ro.handoff === true && ro.next === "CHECK 22:45", ro);
  const got = await adminGet("/admin/run-output?phase=LOCK");
  check("decision fields parsed", got.decisions[0].rule === "V2" && got.decisions[0].said_did === '"Papa ki thali mein aloo nahi"', got.decisions[0]);
  const ho = await adminGet("/admin/handoff");
  check("last handoff kept for the next phase", ho.handoff.locked.winner === "Rajma chawal", ho);

  // Trimmed MCP tracking view.
  const order = "BAARI-TRIM-" + Date.now();
  const c = await tool("delhivery", "create_shipment", { pickup_location: { name: "baari_staples_hub" }, shipments: [{ name: "Sharma", order, phone: "9999999999", add: "Flat 402", pin: "110042", payment_mode: "Prepaid" }] });
  const tr = await tool("delhivery", "track_shipment", { waybill: c.response.packages[0].waybill });
  const s = tr.response.ShipmentData[0].Shipment;
  check("MCP tracking is trimmed to status, ETA and last 3 scans", s.Status && "ExpectedDeliveryDate" in s && s.Scans.length <= 3 && "scans_omitted" in s, s);
  // The platform flattens pickup_location; GPT-5.4 sends a top-level name.
  const flat = await tool("delhivery", "create_shipment", { name: "baari_staples_hub", shipments: [{ name: "Sharma", order: "BAARI-FLAT-" + Date.now(), phone: "9999999999", add: "Flat 402", pin: "110042", payment_mode: "Prepaid" }] });
  const hop = await tool("delhivery", "hyperlocal_create_order", { name: "Sharma Kirana", address: "Sector 7 market, Rohini", pin: "110085", phone: "9999999998", items_desc: "tomato 200 g", item_value: 20, deliver_by: "2026-10-05T07:50:00+05:30", client_order_id: "BAARI-FLAT-HOP-" + Date.now() });
  check("hyperlocal_create_order with flattened pickup fields is accepted", hop.http_status !== 400 && hop.response && /RIDER_ASSIGNED|NO_RIDER_AVAILABLE|SLOT_UNAVAILABLE/.test(JSON.stringify(hop.response)), hop);
  const dal = await tool("delhivery", "hyperlocal_create_order", { name: "Sharma Kirana", address: "Sector 7 market, Rohini", pin: "110085", phone: "9999999998", items_desc: "chana dal 200 g", item_value: 20, deliver_by: "2026-10-05T07:50:00+05:30", client_order_id: "BAARI-FLAT-DAL-" + Date.now() });
  check("a hop for something Sharma Kirana does not sell is refused", dal.response && dal.response.status === "ITEM_NOT_AT_PICKUP", dal);
  check("create_shipment with a flattened top-level name gets a waybill", flat.response && flat.response.packages && flat.response.packages[0].waybill, flat);

  // What the model sees through the platform's connector (W2's test, 17:35):
  // only voice_id from create_voice_clone, only labels from get_voice. Requests
  // shaped like the platform's: multipart, labels as a JSON string, a sample.
  async function platformClone(name, labels) {
    const f = new FormData();
    f.append("name", name);
    f.append("labels", JSON.stringify(labels));
    f.append("files", new Blob([Buffer.from("baari")], { type: "text/plain" }), "baari.txt");
    const r = await fetch(`${BASE}/v1/voices/add`, { method: "POST", headers: XI, body: f });
    return { status: r.status, body: await r.json() };
  }
  async function platformGet(cmd) {
    const r = await fetch(`${BASE}/v1/voices/${cmd}`, { headers: XI });
    return { status: r.status, labels: (await r.json()).labels };
  }
  await admin("/admin/reset-day", {});
  let pg = await platformGet("pl.balance");
  check("get_voice puts the balance in labels", pg.labels.remaining_balance === "500000" && pg.labels.max_daily_debit === "40000" && JSON.parse(pg.labels.baari).http_status === 200, pg);
  let pc = await platformClone("pl.debit", { amount_paise: "24000", reference: "BAARI-P-staples" });
  check("create_voice_clone voice_id is <presentation_id>:PENDING", pc.status === 200 && /^v1-bil-.+:PENDING$/.test(pc.body.voice_id), pc.body.voice_id);
  const presId = pc.body.voice_id.split(":")[0];
  await new Promise((r) => setTimeout(r, 700));
  pg = await platformGet(`pl.debit.${presId}`);
  check("polling a debit shows status in labels", pg.labels.status === "SUCCESS" && pg.labels.amount_paise === "24000", pg.labels);
  pc = await platformClone("pl.debit", { amount_paise: "20000", reference: "BAARI-P-extra" });
  check("over the daily cap: voice_id fail:DAILY_LIMIT_EXCEEDED, HTTP 200", pc.status === 200 && pc.body.voice_id === "fail:DAILY_LIMIT_EXCEEDED", pc);
  await admin("/admin/scenario", { endpoint: "/ps/api/v1/public/subscriptions/sbmd/{id}", scenario: "malformed", times: 1 });
  pg = await platformGet("pl.balance");
  check("malformed Pine Labs body shows as an error in labels", pg.labels.error === "MALFORMED_BODY", pg.labels);
  pg = await platformGet("tg.nonsense");
  check("unknown command is a 200 with the error in labels", pg.status === 200 && /unknown command/.test(pg.labels.error), pg);

  // Eval cast and the sim sink.
  await admin("/admin/cast", { role: "Vinay", chat_id: "111" });
  const ev = await admin("/admin/cast", { eval: true });
  check("eval cast maps every role to sim-*", ev.cast.roles.Papa === "sim-papa" && ev.cast.roles.Sunita === "sim-sunita", ev.cast);
  const since = Date.now() - 1;
  pc = await platformClone("tg.send", { to: "Papa", text: "Aaj kya banega?", buttons: "Rajma chawal=vote:rajma|Lauki chana dal=vote:lauki" });
  check("tg.send to a sim chat returns msg:<id>", /^msg:\d+$/.test(pc.body.voice_id), pc.body);
  const box = await adminGet(`/admin/sim-outbox?since=${since}`);
  check("sim outbox holds the message with its buttons", box.count === 1 && box.items[0].to === "Papa" && box.items[0].buttons[0].length === 2, box);
  const simReply = await admin("/admin/inject", { role: "Papa", kind: "button", button_data: "vote:rajma", reply_to_message_id: Number(pc.body.voice_id.slice(4)) });
  check("inject in eval cast comes from sim-papa", simReply.update.chat_id === "sim-papa", simReply.update);
  const back = await admin("/admin/cast", { eval: false });
  check("eval:false restores the real cast", back.cast.roles.Vinay === "111" && !back.cast.eval, back.cast);
  pc = await platformClone("tg.send", { to: "Mummy", text: "x" });
  check("a failed send is voice_id fail:<reason>", /^fail:.*Mummy has no Telegram chat/.test(pc.body.voice_id) || /^fail:/.test(pc.body.voice_id), pc.body.voice_id);

  // App feed: a small LOCK through the bridge, then read it like the app does.
  await admin("/admin/reset-day", {});
  await admin("/admin/cast", { eval: true });
  const ev0 = await fetch(`${BASE}/app/events?after=0`, { headers: { Origin: "https://baari.pages.dev" } });
  check("app/events is CORS-open on GET", ev0.headers.get("access-control-allow-origin") === "*", [...ev0.headers.entries()]);
  const lastId = ((await ev0.json()).events.slice(-1)[0] || { id: 0 }).id;
  await admin("/admin/inject", { role: "Papa", kind: "button", button_data: "vote:rajma" });
  await platformClone("tg.send", { to: "Vinay", text: "Kal Rajma chawal banega" });
  await platformClone("pl.debit", { amount_paise: "24000", reference: "BAARI-2026-10-05-staples" });
  await admin("/admin/run-output", { agent: "Baari", phase: "LOCK", now_ist: "2026-10-04 21:30 IST", output: output.replace('"last_update_id":42', '"last_update_id":42,"shortlist":["Rajma chawal","Lauki chana dal"],"missing":[{"item":"tomato","qty_g":200,"route":"kirana"}]') });
  const st = await fetch(`${BASE}/app/state`).then((r) => r.json());
  check("app/state has phase, shortlist with Hindi, locked dish", st.phase === "LOCK" && st.shortlist[0].hindi === "राजमा चावल" && st.locked.winner === "Rajma chawal", st);
  check("app/state votes show faces, not choices", st.votes.voted.includes("Papa") && !JSON.stringify(st.votes).includes("rajma"), st.votes);
  check("app/state khata shows the debit and today's spend", st.khata.debits.length === 1 && st.khata.debits[0].ref === "BAARI-2026-10-05-staples" && st.khata.spent_today === 24000 && st.khata.cap_today === 40000, st.khata);
  check("app/state kirana pickup from the handoff", st.delivery.kirana_pickup[0] === "tomato", st.delivery);
  check("app/state decisions carry rule ids", st.decisions[0].rule === "V2", st.decisions);
  check("app/state has no chat ids", !/sim-|"111\d*"|chat_id/.test(JSON.stringify(st)), "leak");
  const evs = await fetch(`${BASE}/app/events?after=${lastId}`).then((r) => r.json());
  const rails = evs.events.map((e) => `${e.rail}:${e.tool}:${e.ok}`);
  check("app/events lists the new calls newest-last with rails", rails.includes("telegram:tg.send:true") && rails.includes("pinelabs:pl.debit:true") && evs.events.every((e, i, a) => !i || a[i - 1].id < e.id), rails);
  await admin("/admin/cast", { eval: false });
  const adminCors = await fetch(`${BASE}/admin/health?key=${ADMIN}`);
  check("admin routes stay closed to cross-origin", !adminCors.headers.get("access-control-allow-origin"), "open");

  // Media in place of R2: PUT with the admin key, public GET with CORS.
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const up = await fetch(`${BASE}/admin/media/receipt-test.png?key=${ADMIN}`, { method: "PUT", headers: { "Content-Type": "image/png" }, body: png }).then((r) => r.json());
  check("media PUT returns a public url", up.ok && /\/media\/f\/receipt-test\.png$/.test(up.url), up);
  const media = await fetch(`${BASE}/media/f/receipt-test.png`);
  const gotBytes = Buffer.from(await media.arrayBuffer());
  check("media GET serves the same bytes, CORS-open", media.headers.get("content-type") === "image/png" && gotBytes.equals(png) && media.headers.get("access-control-allow-origin") === "*", media.status);
  const noKey = await fetch(`${BASE}/admin/media/x.png`, { method: "PUT", body: png });
  check("media PUT without the key is refused", !ADMIN || noKey.status === 401, noKey.status);

  // Voice updates carry file_base64 = base64(audio_url) for speech_to_text.
  await admin("/admin/cast", { eval: true });
  await admin("/admin/inject", { role: "Sunita", kind: "voice", audio_url: "https://example.com/v.ogg" });
  const vups = await voice("tg.updates.0");
  const vu = (vups.updates || []).filter((u) => u.voice).slice(-1)[0];
  check("voice update carries file_base64 of its audio_url", vu && Buffer.from(vu.voice.file_base64, "base64").toString() === vu.voice.audio_url, vu);
  await admin("/admin/cast", { eval: false });

  const h = await adminGet("/admin/health");
  check("health reports every check", ["storage", "telegram_webhook", "gnani", "reserve_pay", "cast", "overrides", "recording"].every((k) => h.checks[k]), h);
}
