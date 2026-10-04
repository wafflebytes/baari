// The F3 relay (PRD 6.2): the platform validator rejects our Telegram and Pine
// Labs tools, so the agent writes those actions in an OUTBOX block and this
// relay performs them after the run, through rails, exactly as written. It
// makes no decisions. It also builds each run's task text: NOW, PEOPLE,
// BALANCE, INBOX (new messages) and RESULTS (what last run's OUTBOX did).
//
// One core, two transports: `rails` (real Telegram, Pine Labs mock) for the
// demo and recordings, and the eval harness's simulated people.

const PEOPLE = ["Vinay", "Mummy", "Papa", "Sunita"];

function buildTask({ phase, now, dateFor, balance, inbox, results, handoff, tag }) {
  const lines = [
    `PHASE: ${phase}`,
    `NOW: ${now}`,
    `DATE_FOR: ${dateFor}`,
    `PEOPLE: Vinay (duty-holder), Mummy, Papa, Sunita (cook)`,
    `BALANCE: ${balance ? JSON.stringify(balance) : "not read"}`,
    `INBOX: ${JSON.stringify(inbox || [])}`,
    `RESULTS: ${JSON.stringify(results || [])}`,
    "HANDOFF:",
    "```json",
    JSON.stringify(handoff || {}),
    "```",
  ];
  if (tag) lines.unshift(`RECORDING: ${tag}`);
  return lines.join("\n");
}

// "O1 | send_message | {json}" lines between OUTBOX and HANDOFF.
function parseOutbox(text) {
  const t = String(text || "").replace(/\r/g, "");
  const start = t.search(/(^|\n)\s*\**OUTBOX/);
  if (start < 0) return { items: [], found: false, errors: [] };
  const end = t.slice(start).search(/\n\s*\**HANDOFF/);
  const block = end > 0 ? t.slice(start, start + end) : t.slice(start);
  const items = [];
  const errors = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*[-*]?\s*(O\d+)\s*\|\s*([a-z_]+)\s*\|\s*(\{.*\})\s*$/);
    if (!m) continue;
    try {
      items.push({ id: m[1], action: m[2], args: JSON.parse(m[3]) });
    } catch (e) {
      errors.push({ id: m[1], action: m[2], error: `bad JSON: ${e.message}` });
    }
  }
  return { items, found: true, errors };
}

// transport: { sendMessage({to,text,buttons}), sendVoice({to,audio_url,caption}),
//              pine(tool, args) -> parsed MCP result, subscriptionId }
async function executeOutbox(items, transport, { pollMs = 1200, maxPolls = 5 } = {}) {
  const results = [];
  for (const it of items) {
    const a = it.args || {};
    let r;
    try {
      if (it.action === "send_message") {
        if (!PEOPLE.includes(a.to)) r = { ok: false, error: `unknown person ${a.to}` };
        else r = await transport.sendMessage({ to: a.to, text: a.text || "", buttons: a.buttons || null });
      } else if (it.action === "send_voice") {
        if (!PEOPLE.includes(a.to)) r = { ok: false, error: `unknown person ${a.to}` };
        else r = await transport.sendVoice({ to: a.to, audio_url: a.audio_url, caption: a.caption || "" });
      } else if (it.action === "debit" || it.action === "pay_kirana") {
        r = await debit(it.action, a, transport, { pollMs, maxPolls });
      } else r = { ok: false, error: `unknown action ${it.action}` };
    } catch (e) {
      r = { ok: false, error: String(e.message || e) };
    }
    results.push({ id: it.id, action: it.action, to: a.to, reference: a.reference, result: r });
  }
  return results;
}

async function debit(action, a, transport, { pollMs, maxPolls }) {
  const body = {
    subscription_id: transport.subscriptionId,
    amount: { value: Math.round(Number(a.amount_paise) || 0), currency: "INR" },
    merchant_presentation_reference: a.reference,
  };
  let tool = "create_presentation";
  if (action === "pay_kirana") {
    tool = "create_payee_presentation";
    body.payee = { vpa: a.vpa || "sharmakirana@okaxis", name: a.payee_name || "Sharma Kirana" };
    body.note = a.note || "Baari · Flat 402 · Sunita";
  }
  const calls = [];
  const resp = (x) => (x && x.response !== undefined ? x.response : x) || {};
  // E1 for OUTBOX debits: the agent can't retry a call it doesn't make, so the
  // relay does it for it. A timeout, 5xx or a body with no presentation_id gets
  // one retry with the same body, so the same reference.
  let created = await transport.pine(tool, body).catch((e) => ({ http_status: 0, error: String(e.message || e) }));
  calls.push({ tool, args: body, result: created });
  const transient = (x) => !resp(x).presentation_id && !(x && x.http_status >= 400 && x.http_status < 500);
  if (transient(created)) {
    created = await transport.pine(tool, body).catch((e) => ({ http_status: 0, error: String(e.message || e) }));
    calls.push({ tool, args: body, result: created, retry: "E1" });
  }
  let p = resp(created);
  const id = p.presentation_id;
  let status = p.status || null;
  for (let i = 0; id && status === "PENDING" && i < maxPolls; i++) {
    await new Promise((res) => setTimeout(res, pollMs));
    const g = await transport.pine("get_presentation", { presentation_id: id });
    calls.push({ tool: "get_presentation", args: { presentation_id: id }, result: g });
    p = resp(g);
    status = p.status || status;
  }
  return {
    ok: status === "SUCCESS",
    http_status: created && created.http_status,
    status: status || "NOT_CREATED",
    presentation_id: id || null,
    amount_paise: body.amount.value,
    error: status ? p.failure_reason || null : JSON.stringify(resp(created)).slice(0, 300),
    calls,
  };
}

// What the next run sees: no raw tool chatter, just the outcome per item.
function resultsForNextRun(results) {
  return results.map((r) => {
    const x = r.result || {};
    if (r.action === "debit" || r.action === "pay_kirana") return { id: r.id, action: r.action, reference: r.reference, status: x.status, amount_paise: x.amount_paise, presentation_id: x.presentation_id, error: x.error || undefined };
    return { id: r.id, action: r.action, to: r.to, ok: !!x.ok, error: x.ok ? undefined : x.error };
  });
}

module.exports = { buildTask, parseOutbox, executeOutbox, resultsForNextRun, PEOPLE };
