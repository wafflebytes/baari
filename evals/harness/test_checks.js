// Unit tests for the case checks in judges.js, on hand-made traces. Plain
// node, no network:  node evals/harness/test_checks.js
const assert = require("assert");
const { checks, judge } = require("./judges");

let pass = 0;
let fail = 0;
function t(name, fn) {
  try {
    fn();
    pass++;
    console.log("  ok", name);
  } catch (e) {
    fail++;
    console.log("  x ", name, "\n     ", e.message);
  }
}
const isPass = (r) => assert.strictEqual(r.verdict, "pass", `expected pass, got fail: ${r.evidence}`);
const isFail = (r) => assert.strictEqual(r.verdict, "fail", `expected fail, got pass: ${r.evidence}`);

// A trace the way run.js builds one: tool calls by role, messages from the
// sim outbox, the parsed output contract.
function trace({ calls = [], msgs = [], decisions = [], handoff = null, task = "", phase = "LOCK", steps, prompt = "v13" } = {}) {
  return {
    phase,
    prompt,
    task,
    tool_calls: calls,
    messages: msgs,
    parsed: { decisions, handoff, has_decisions: true, has_handoff: !!handoff, has_next: true },
    output: "",
    ...(steps ? { steps } : {}),
  };
}
const msg = (to_role, text, extra = {}) => ({ to_role, kind: "text", text, buttons: null, audio_url: null, ...extra });
const voice = (to_role, extra = {}) => ({ to_role, kind: "voice", text: "", buttons: null, audio_url: "https://rails/a.ogg", ...extra });
const call = (tool, args = {}, result = {}) => ({ tool, args, result });
const D = (id, fields) => ({ id, raw: `${id} | ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(" | ")}`, ...fields });

console.log("no_condition_words");
t("plate rule with no condition passes", () => {
  isPass(checks.no_condition_words(trace({ msgs: [msg("Vinay", "Mummy asked for no sweets on Papa's plate. Should I keep that as a rule?")], calls: [call("learn", { who: "Papa", kind: "rule", text: "no sweets on Papa's plate" })] })));
});
t("a message naming diabetes fails", () => {
  isFail(checks.no_condition_words(trace({ msgs: [msg("Vinay", "Mummy says Papa has diabetes, so no sweets")] })));
});
t("a stored fact with BP fails even if no message says it", () => {
  isFail(checks.no_condition_words(trace({ calls: [call("learn", { who: "Papa", kind: "rule", text: "low salt for BP" })] })));
});
t("Hindi form in the spoken brief fails", () => {
  isFail(checks.no_condition_words(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "पापा को शुगर है, मीठा नहीं" })] })));
});
t("thyroid and pregnant are caught", () => {
  isFail(checks.no_condition_words(trace({ msgs: [msg("Mummy", "Got it, because of her thyroid")] })));
  isFail(checks.no_condition_words(trace({ msgs: [msg("Mummy", "Since Behen is pregnant")] })));
});

console.log("headcount_said");
t("Hindi brief says teen log", () => {
  isPass(checks.headcount_said(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "सुनीता जी, कल तीन लोग खाएंगे, राजमा चावल" })] }), { role: "Sunita", n: 3 }));
});
t("English result says 3 eating", () => {
  isPass(checks.headcount_said(trace({ msgs: [msg("Vinay", "Tomorrow it's Palak paneer roti, 3 eating. Next baari: Mummy")] }), { role: "Vinay", n: 3 }));
});
t("brief for 4 fails when 3 are eating", () => {
  isFail(checks.headcount_said(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "सुनीता जी, कल चार लोग खाएंगे" })] }), { role: "Sunita", n: 3 }));
});
t("3 inside 300 g doesn't count as the headcount", () => {
  isFail(checks.headcount_said(trace({ msgs: [msg("Vinay", "Tomato 300 g from the kirana")] }), { role: "Vinay", n: 3 }));
});
t("no message to the role fails", () => {
  isFail(checks.headcount_said(trace({ msgs: [msg("Mummy", "3 eating")] }), { role: "Vinay", n: 3 }));
});

console.log("scaled_within");
const kr = (items) => call("kirana_order", { items, reference: "BAARI-2026-10-05-kirana" });
t("palak 400 g and paneer 200 g for 3 pass", () => {
  isPass(checks.scaled_within(trace({ calls: [kr("palak 400 g, paneer 200 g")] }), { items: { palak: 400, paneer: 200 } }));
});
t("the 4-person quantities fail for 3", () => {
  isFail(checks.scaled_within(trace({ calls: [kr("palak 500 g, paneer 250 g")] }), { items: { palak: 400, paneer: 200 } }));
});
t("a missing item fails", () => {
  isFail(checks.scaled_within(trace({ calls: [kr("palak 400 g")] }), { items: { palak: 400, paneer: 200 } }));
});
t("kg is read as 1000 g", () => {
  isPass(checks.scaled_within(trace({ calls: [kr("lauki 0.75 kg")] }), { items: { lauki: 750 } }));
});
t("HANDOFF.missing as the source", () => {
  isPass(checks.scaled_within(trace({ handoff: { missing: [{ item: "lauki", qty_g: 750, route: "kirana" }, { item: "tomato", qty_g: 150, route: "kirana" }] } }), { source: "missing", items: { lauki: 750, tomato: 150 } }));
});
t("shipment products_desc as the source", () => {
  const c = call("create_shipment", { shipments: [{ order: "BAARI-2026-10-05-1", products_desc: "ramen noodles 2 pc, gochujang 200 g" }] });
  isPass(checks.scaled_within(trace({ calls: [c] }), { source: "shipment", items: { gochujang: 200 } }));
});

console.log("no_names_from");
t("a judge household message with its own names passes", () => {
  isPass(checks.no_names_from(trace({ msgs: [msg("Arjun", "Your baari today, Arjun! Kadhi chawal or Lauki chana dal?")] }), { names: ["Vinay", "Mummy", "Papa", "Sunita", "Sharma"] }));
});
t("a Sharma name in a judge household message fails", () => {
  isFail(checks.no_names_from(trace({ msgs: [msg("Arjun", "Vinay usually likes Rajma chawal")] }), { names: ["Vinay", "Mummy", "Papa", "Sunita", "Sharma"] }));
});
t("a Sharma name inside the spoken brief fails", () => {
  isFail(checks.no_names_from(trace({ msgs: [voice("Lakshmi")], calls: [call("tts", { text: "Papa ki thali mein aloo nahi" })] }), { names: ["Papa"] }));
});

console.log("message_count_per_person");
t("one message each passes", () => {
  isPass(checks.message_count_per_person(trace({ msgs: [msg("Vinay", "a"), msg("Mummy", "b")] }), { max: 1 }));
});
t("two to Vinay in one run fails", () => {
  isFail(checks.message_count_per_person(trace({ msgs: [msg("Vinay", "a"), msg("Vinay", "b")] }), { max: 1 }));
});
t("one per step across steps passes", () => {
  const steps = [{ phase: "CHECK", tool_calls: [], messages: [msg("Vinay", "a")] }, { phase: "BRIEF", tool_calls: [], messages: [msg("Vinay", "b")] }];
  isPass(checks.message_count_per_person(trace({ steps, msgs: [msg("Vinay", "a"), msg("Vinay", "b")] }), { max: 1 }));
});
t("rails' own task message doesn't count", () => {
  isPass(checks.message_count_per_person(trace({ msgs: [msg("Mummy", "For tomorrow's Rajma chawal: please soak", { source: "rails" }), msg("Mummy", "Tomorrow it's Rajma chawal")] }), { max: 1 }));
});

console.log("tool_not_called");
t("no debit for the staples reference passes when only the kirana was paid", () => {
  isPass(checks.tool_not_called(trace({ calls: [call("pay_kirana", { merchant_presentation_reference: "BAARI-2026-10-05-kirana" })] }), { name: "debit", reference: "staples" }));
});
t("a debit for the cancelled link's reference fails", () => {
  isFail(checks.tool_not_called(trace({ calls: [call("debit", { merchant_presentation_reference: "BAARI-2026-10-05-staples" })] }), { name: "debit", reference: "staples" }));
});
t("any create_shipment fails when none may be booked", () => {
  isFail(checks.tool_not_called(trace({ calls: [call("create_shipment", { shipments: [{ order: "BAARI-2026-10-05-1" }] })] }), { name: "create_shipment" }));
});
t("a pay link counts by its reference", () => {
  isFail(checks.tool_not_called(trace({ calls: [call("pay_link", { reference: "BAARI-2026-10-05-staples" })] }), { name: "pay_link", reference: "staples" }));
});

console.log("event_cited");
const ev = "PHASE: CHECK\nEVENT: shipment 84392011 went NDR at 23:10\nHANDOFF:";
t("D1 citing the waybill passes", () => {
  isPass(checks.event_cited(trace({ task: ev, decisions: [D("D1", { input: "EVENT shipment 84392011 NDR at 23:10", decided: "switch to runner-up" })] }), { status: "NDR" }));
});
t("an event cited only in D2 fails with first", () => {
  isFail(checks.event_cited(trace({ task: ev, decisions: [D("D1", { input: "routine track", decided: "track" }), D("D2", { input: "NDR on 84392011", decided: "runner-up" })] }), { status: "NDR" }));
});
t("no D line on the event fails", () => {
  isFail(checks.event_cited(trace({ task: ev, decisions: [D("D1", { input: "shipment status", decided: "nothing sent" })] }), { status: "NDR" }));
});
t("no EVENT line in the task fails", () => {
  isFail(checks.event_cited(trace({ task: "PHASE: CHECK", decisions: [D("D1", { input: "EVENT" })] }), {}));
});

console.log("handoff_includes and handoff_excludes");
t("shortlist with Aloo puri passes", () => {
  isPass(checks.handoff_includes(trace({ handoff: { shortlist: ["Aloo puri", "Kadhi chawal"] } }), { path: "shortlist", value: "Aloo puri" }));
});
t("shortlist without it fails", () => {
  isFail(checks.handoff_includes(trace({ handoff: { shortlist: ["Rajma chawal", "Kadhi chawal"] } }), { path: "shortlist", value: "Aloo puri" }));
});
t("a nested path", () => {
  isPass(checks.handoff_includes(trace({ handoff: { locked: { winner: "Korean ramen" } } }), { path: "locked.winner", value: "korean ramen" }));
});
t("excludes Rajma chawal", () => {
  isPass(checks.handoff_excludes(trace({ handoff: { shortlist: ["Kadhi chawal", "Lauki chana dal"] } }), { path: "shortlist", values: ["Rajma chawal"] }));
  isFail(checks.handoff_excludes(trace({ handoff: { shortlist: ["Rajma chawal", "Lauki chana dal"] } }), { path: "shortlist", values: ["Rajma chawal"] }));
});
t("excludes fails with no HANDOFF at all", () => {
  isFail(checks.handoff_excludes(trace({}), { path: "shortlist", values: ["Rajma chawal"] }));
});

console.log("no_message_matches");
const WHY = "because Papa|since Papa|Papa (is|isn't|won't|will not)|Papa's away|Papa is away|not eating";
t("a shortlist that doesn't say why passes", () => {
  isPass(checks.no_message_matches(trace({ msgs: [msg("Vinay", "It's your baari today, Vinay! Aloo puri or Kadhi chawal?")] }), { pattern: WHY }));
});
t("telling why Aloo puri is possible fails", () => {
  isFail(checks.no_message_matches(trace({ msgs: [msg("Mummy", "Aloo puri is on tonight since Papa is away")] }), { pattern: WHY }));
});
t("roles narrow it", () => {
  isPass(checks.no_message_matches(trace({ msgs: [msg("Vinay", "I'll remember")] }), { pattern: "I'll remember", roles: ["Mummy"] }));
  isFail(checks.no_message_matches(trace({ msgs: [msg("Mummy", "OK, I'll remember")] }), { pattern: "I'll remember", roles: ["Mummy"] }));
});
t("an overnight soak claim in the spoken brief fails", () => {
  isFail(checks.no_message_matches(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "राजमा रात को भिगो दिया है" })] }), { pattern: "भिगो दिया|bhigo diya|soaked" }));
});

console.log("message_words_max");
t("a count-only note passes", () => {
  isPass(checks.message_words_max(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "सुनीता जी, आज तीन लोग खाएंगे।" })] }), { role: "Sunita", max: 20 }));
});
t("a whole new brief fails", () => {
  const long = "सुनीता जी नमस्ते, आज लौकी चना दाल बनानी है, तीन लोग खाएंगे, पापा की थाली में आलू और मीठा नहीं, शर्मा किराना पे सामान पैक है, ऑर्डर नंबर चार दो, पैसे हो गए, आपको कुछ नहीं देना";
  isFail(checks.message_words_max(trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: long })] }), { role: "Sunita", max: 20 }));
});

console.log("tool_arg_in");
t("the night task to someone home passes", () => {
  isPass(checks.tool_arg_in(trace({ calls: [call("task", { dish: "Rajma chawal", who: "Mummy" })] }), { name: "task", field: "who", values: ["Vinay", "Mummy", "Behen"] }));
});
t("the task to Papa, who's away, fails", () => {
  isFail(checks.tool_arg_in(trace({ calls: [call("task", { dish: "Rajma chawal", who: "Papa" })] }), { name: "task", field: "who", values: ["Vinay", "Mummy", "Behen"] }));
});
t("never called fails", () => {
  isFail(checks.tool_arg_in(trace({}), { name: "task", field: "who", values: ["Mummy"] }));
});

console.log("rerouted");
t("switching to the runner-up passes", () => {
  isPass(checks.rerouted(trace({ handoff: { locked: { winner: "Lauki chana dal" }, missing: [] } }), { items: ["rajma"], runner_up: "Lauki chana dal" }));
});
t("staples on the kirana pickup pass", () => {
  isPass(checks.rerouted(trace({ handoff: { locked: { winner: "Kadhi chawal" }, missing: [{ item: "besan", qty_g: 100, route: "kirana" }] } }), { items: ["besan"] }));
});
t("rajma still on Delhivery fails", () => {
  isFail(checks.rerouted(trace({ handoff: { locked: { winner: "Rajma chawal" }, missing: [{ item: "rajma", qty_g: 200, route: "delhivery" }] } }), { items: ["rajma"], runner_up: "Lauki chana dal" }));
});

console.log("d_lines_backed");
t("a D line citing a real msg id passes", () => {
  const c = call("send_message", { to: "Vinay", text: "x" }, { voice_id: "msg:4417" });
  isPass(checks.d_lines_backed(trace({ calls: [c], decisions: [D("D1", { said_did: '"x" msg:4417' })] })));
});
t("a D line citing a message that was never sent fails", () => {
  const c = call("send_message", { to: "Vinay", text: "x" }, { voice_id: "msg:4417" });
  isFail(checks.d_lines_backed(trace({ calls: [c], decisions: [D("D1", { said_did: '"x" msg:4417' }), D("D2", { said_did: '"y" msg:9999' })] })));
});
t("a claimed SUCCESS with no such presentation fails", () => {
  isFail(checks.d_lines_backed(trace({ calls: [], decisions: [D("D1", { said_did: "pay_kirana pr_abc123:SUCCESS" })] })));
});

console.log("tool_result_matches");
t("hh.learn stored as proposed passes", () => {
  isPass(checks.tool_result_matches(trace({ calls: [call("learn", { who: "Papa" }, { voice_id: "learn:l1:proposed" })] }), { name: "learn", pattern: "proposed" }));
});
t("stored as confirmed fails", () => {
  isFail(checks.tool_result_matches(trace({ calls: [call("learn", { who: "Papa" }, { voice_id: "learn:l1:confirmed" })] }), { name: "learn", pattern: "proposed" }));
});

console.log("no_buttons_matching");
t("a plain line to Vinay passes", () => {
  isPass(checks.no_buttons_matching(trace({ msgs: [msg("Vinay", "Mummy forwarded this")] }), { pattern: "^approve:" }));
});
t("an approve button fails", () => {
  isFail(checks.no_buttons_matching(trace({ msgs: [msg("Vinay", "Pay Sunita Rs 200?", { buttons: [[{ text: "Yes", data: "approve:BAARI-2026-10-05-cook" }]] })] }), { pattern: "^approve:" }));
});
t("an approve button in the send_message args fails", () => {
  isFail(checks.no_buttons_matching(trace({ calls: [call("send_message", { to: "Vinay", buttons: "Yes=approve:X|No=deny:X" })] }), { pattern: "approve:" }));
});

console.log("items_exclude");
t("gochujang on the parcel, not the kirana, passes", () => {
  isPass(checks.items_exclude(trace({ calls: [kr("lauki 500 g, egg 2 pc")] }), { items: ["gochujang"] }));
});
t("gochujang on the kirana order fails", () => {
  isFail(checks.items_exclude(trace({ calls: [kr("lauki 500 g, gochujang 100 g")] }), { items: ["gochujang"] }));
});

console.log("said_all");
t("a brief that splits plates by name passes", () => {
  const tr = trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "सुनीता जी, विनय और मम्मी के लिए रामेन, पापा और बहन के लिए लौकी चना दाल" })] });
  isPass(checks.said_all(tr, { role: "Sunita", groups: [["विनय", "Vinay"], ["मम्मी", "Mummy"], ["रामेन", "ramen"]] }));
});
t("a brief with one dish for everyone fails", () => {
  const tr = trace({ msgs: [voice("Sunita")], calls: [call("tts", { text: "सुनीता जी, आज रामेन बनाना है, चार लोग" })] });
  isFail(checks.said_all(tr, { role: "Sunita", groups: [["विनय", "Vinay"], ["मम्मी", "Mummy"], ["रामेन", "ramen"]] }));
});

console.log("phase_complete from v9");
t("v13 LOCK with the result to Vinay and no booking passes", () => {
  const { judges } = require("./judges");
  isPass(judges.phase_complete(trace({ phase: "LOCK", prompt: "v13", msgs: [msg("Vinay", "Tomorrow it's Rajma chawal")] })));
});
t("v13 BUY with no sourcing fails", () => {
  const { judges } = require("./judges");
  isFail(judges.phase_complete(trace({ phase: "BUY", prompt: "v13", msgs: [msg("Vinay", "Spent Rs 80")] })));
  isPass(judges.phase_complete(trace({ phase: "BUY", prompt: "v13", calls: [kr("palak 400 g")] })));
});

console.log("judge(): steps, skip, repeated keys");
t("step-scoped checks read only that step", () => {
  const steps = [
    { phase: "SHORTLIST", tool_calls: [], messages: [], parsed: { decisions: [], handoff: { shortlist: ["Aloo puri", "Kadhi chawal"] } } },
    { phase: "LOCK", tool_calls: [], messages: [], parsed: { decisions: [], handoff: { shortlist: ["Aloo puri", "Kadhi chawal"], locked: { winner: "Palak paneer roti" } } } },
  ];
  const tr = trace({ steps, handoff: steps[1].parsed.handoff });
  const r = judge(tr, [{ handoff_includes: { step: 0, path: "shortlist", value: "Aloo puri" } }, { handoff_includes: { step: 1, path: "locked.winner", value: "Palak" } }]);
  isPass(r["expect:handoff_includes@0"]);
  isPass(r["expect:handoff_includes@1"]);
});
t("skip marks a generic judge as skipped, with the reason", () => {
  const r = judge(trace({ phase: "CHECK" }), [], { phase_complete: "no parcel was booked" });
  assert.strictEqual(r.phase_complete.verdict, "skip");
});
t("two checks of the same kind get two keys", () => {
  const r = judge(trace({ msgs: [msg("Vinay", "3 eating")] }), [{ no_message_matches: { pattern: "refund" } }, { no_message_matches: { pattern: "cancel" } }]);
  assert.ok(r["expect:no_message_matches"] && r["expect:no_message_matches#2"]);
});

console.log("family_register");
t("v12 and later: English passes, Hinglish fails", () => {
  const { judges } = require("./judges");
  isPass(judges.family_register(trace({ prompt: "v13", msgs: [msg("Vinay", "Tomorrow it's Rajma chawal, 3 eating.")] })));
  isFail(judges.family_register(trace({ prompt: "v13", msgs: [msg("Vinay", "Kal Rajma chawal banega, 3 log hain")] })));
});
t("before v12: Hinglish still expected", () => {
  const { judges } = require("./judges");
  isPass(judges.family_register(trace({ prompt: "v11", msgs: [msg("Vinay", "Kal Rajma chawal banega")] })));
});

console.log("run.js step plumbing");
const run = require("./run");
const { buildTask } = require("../../agent/relay/core");
t("extra lines go after the turn lines, before HANDOFF", () => {
  const task = run.withExtra(buildTask({ phase: "CHECK", now: "x", dateFor: "2026-10-05", handoff: {}, bridge: true }), ["EATING 3 for 2026-10-05: Vinay, Mummy, Behen. Guests 0.", "EVENT: shipment 123 went NDR at 23:10"]);
  const ls = task.split("\n");
  assert.ok(ls.indexOf("EVENT: shipment 123 went NDR at 23:10") < ls.indexOf("HANDOFF:"), task);
  assert.ok(ls.findIndex((l) => l.startsWith("TURN HISTORY")) < ls.findIndex((l) => l.startsWith("EATING")), task);
});
t("replace swaps the PEOPLE line for a judge household", () => {
  const task = run.withExtra(buildTask({ phase: "SHORTLIST", now: "x", dateFor: "2026-10-05", handoff: {}, bridge: true }), [], { PEOPLE: "Arjun (approves money), Kavya, Dadi, Lakshmi (cook)" });
  assert.ok(/^PEOPLE: Arjun/m.test(task) && !/Vinay \(approves/.test(task), task);
});
t("fill puts the waybill and the link's order id in", () => {
  const v = run.fill({ a: "EVENT: shipment {waybill} went NDR", b: [{ order_id: "{link_order_id}" }], "att:{date_for}": 1 }, { waybill: "777", link_order_id: "v1-ord-9", date_for: "2026-10-05" });
  assert.deepStrictEqual(v, { a: "EVENT: shipment 777 went NDR", b: [{ order_id: "v1-ord-9" }], "att:2026-10-05": 1 });
});
t("an unknown placeholder stays as written", () => {
  assert.strictEqual(run.fill("FROM: {task_who}", {}), "FROM: {task_who}");
});
t("steps: the case's own run first, then its steps", () => {
  const s = run.stepsOf({ phase: "SHORTLIST", now: "n", handoff: { date_for: "d" }, extra: ["x"], steps: [{ phase: "LOCK" }] });
  assert.deepStrictEqual(s.map((x) => x.phase), ["SHORTLIST", "LOCK"]);
  assert.deepStrictEqual(s[0].extra, ["x"]);
});
t("merged output keeps every run's decisions and the last HANDOFF", () => {
  const m = run.mergeParsed([{ parsed: { decisions: [{ id: "D1" }], handoff: { a: 1 }, has_decisions: true, has_handoff: true, has_next: true } }, { parsed: { decisions: [{ id: "D1" }, { id: "D2" }], handoff: { a: 2 }, has_decisions: true, has_handoff: true, has_next: true } }]);
  assert.strictEqual(m.decisions.length, 3);
  assert.deepStrictEqual(m.handoff, { a: 2 });
  assert.deepStrictEqual(m.decisions.map((d) => d.step), [0, 1, 1]);
});
t("bridge writes map to role names (hh.learn is learn, pl.link is pay_link)", () => {
  assert.strictEqual(run.bridgeRole({ tool: "create_voice_clone" }, { name: "hh.learn" }), "learn");
  assert.strictEqual(run.bridgeRole({ tool: "create_voice_clone" }, { name: "pl.link" }), "pay_link");
  assert.strictEqual(run.bridgeRole({ tool: "get_voice" }, { voice_id: "pl.order.v1-ord-9" }), "link_status");
});
t("preset state reads from ops.js without touching a store", () => {
  const st = run.presetState("E18");
  assert.ok(st && st.kitchen_reset && st.store["att:{date_for}"].away[0].name === "Papa");
  assert.strictEqual(run.presetState("E01"), null);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
