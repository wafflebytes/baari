// Real Pine Labs, sandbox (UAT). Not a mock: every call here goes to
// pluraluat.v2.pinepg.in with the team's UAT keys (PINE_ID, PINE_SECRET).
//
// Used for the one money step a person has to approve: when a purchase is
// over Rs 300 (M5) or the Reserve Pay block can't cover it (B2), Baari sends
// Vinay a Pine Labs hosted-checkout link for that amount. Paying it pays for
// the purchase, so no Reserve Pay debit follows for that reference.
//
// AgenticOrg's own pinelabs_plural connector would be the natural pipe, but it
// can't connect on the platform today (its connect() authenticates before it
// has an HTTP client), so the agent reaches this file through the bridge.
//
//   createLink({amount_paise, reference, base})        POST /api/checkout/v1/orders
//   order(order_id)                                     GET  /api/pay/v1/orders/{id}
//   settle(order_id)   reads the order and, once it's PROCESSED, records the
//                      payment for its reference exactly once
//   mandate()          the household's real Reserve Pay mandate (SBMD) on the sandbox
//   reservePay(...)    a Reserve Pay call on the real mandate, or the reason
//                      it has to run on the demo block (lib/pinelabs.js)
//
// Fallback: when the real sandbox can't make a link (not configured, down,
// refused), Baari still sends one. It points at a demo checkout on rails
// (/pinelabs/demo/<order_id>) that says it's a demo. Every call is logged
// with api "real" or "demo", so the log always says which one ran.

const crypto = require("crypto");
const store = require("./store");
const { istString } = require("./util");

const BASE = (process.env.PINE_ENV || "sandbox") === "production" ? "https://api.pluralpay.in/api" : "https://pluraluat.v2.pinepg.in/api";
// Reserve Pay (/ps/...) lives at the host root, not under /api.
const HOST = BASE.replace(/\/api$/, "");
// The household's Rs 5,000 Reserve Pay mandate, created on the sandbox.
const MANDATE_ID = (process.env.PINE_SBMD_ID || "v1-sub-261008111141-aa-QThjtv").trim();
// The sandbox customer the mandate belongs to (created with the UAT keys).
const CUSTOMER_ID = (process.env.PINE_CUSTOMER_ID || "cust-v1-261008111136-aa-Dnq2Tu").trim();
const SANDBOX = (process.env.PINE_ENV || "sandbox") !== "production";
const DEAD = new Set(["EXPIRED", "FAILED", "CANCELLED", "REJECTED"]);
const ID = (process.env.PINE_ID || "").trim();
const SECRET = (process.env.PINE_SECRET || "").trim();
const PAID = new Set(["PROCESSED", "AUTHORIZED"]);
const FAILED = new Set(["FAILED", "CANCELLED", "EXPIRED"]);

const configured = () => !!(ID && SECRET);

async function logCall(request, status, response, ms, api = "real") {
  await require("./ops").log({ at_ist: istString(), kind: "rest", rail: "pinelabs", api, via: api === "real" ? "Pine Labs sandbox (REAL API)" : "rails demo (DEMO API)", request, status, response: JSON.stringify(response).slice(0, 800), ms });
}

// A line that says why a call ran on the demo instead of the real API.
async function logFallback(what, reason) {
  await require("./ops").log({ at_ist: istString(), kind: "pine", rail: "pinelabs", api: "demo", note: `DEMO API used for ${what}: real Pine Labs ${reason}` });
}

async function token() {
  const cached = await store.get("pl:uat:token");
  if (cached && cached.exp > Date.now() + 60e3) return cached.token;
  const r = await fetch(`${BASE}/auth/v1/token`, { method: "POST", headers: headers(), body: JSON.stringify({ client_id: ID, client_secret: SECRET, grant_type: "client_credentials" }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Pine Labs token HTTP ${r.status}: ${j.code || j.message || "no token"}`);
  const exp = Date.parse(j.expires_at || "") || Date.now() + 50 * 60e3;
  await store.set("pl:uat:token", { token: j.access_token, exp }, Math.max(60, Math.round((exp - Date.now()) / 1000)));
  return j.access_token;
}

function headers(t) {
  return { "content-type": "application/json", accept: "application/json", "Request-ID": crypto.randomUUID(), "Request-Timestamp": new Date().toISOString(), ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// http_status 0 means Pine Labs couldn't be reached (network, token, timeout).
async function call(method, path, body, root = BASE) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${root}${path}`, { method, headers: headers(await token()), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12e3) });
    const text = await r.text();
    let response = text;
    try {
      response = JSON.parse(text);
    } catch {}
    await logCall(`${method} ${path}`, r.status, response, Date.now() - t0);
    return { endpoint: `${method} ${path} (Pine Labs UAT)`, http_status: r.status, response, api: "real" };
  } catch (e) {
    const response = { code: "PINE_UNREACHABLE", message: String(e.message || e).slice(0, 200) };
    await logCall(`${method} ${path}`, 0, response, Date.now() - t0);
    return { endpoint: `${method} ${path} (Pine Labs UAT)`, http_status: 0, response, api: "real" };
  }
}

// Pine Labs errors come as {code, message} or {error_code, error_message}.
const why = (r) => {
  const p = r.response || {};
  const said = [p.code || p.error_code, p.message || p.error_message].filter(Boolean).join(": ").slice(0, 120);
  return `answered HTTP ${r.http_status}${said ? ` (${said})` : ""}`;
};

// One link per reference: asking again returns the same order while it's open.
const publicBase = (base) => (/^https:\/\//.test(base || "") ? base : process.env.PINE_CALLBACK_BASE || "https://baari-rails.vercel.app");

async function createLink({ amount_paise, reference, base }) {
  const amount = Math.round(Number(amount_paise));
  if (!reference || !(amount > 0)) return { endpoint: "POST /checkout/v1/orders (Pine Labs UAT)", http_status: 400, response: { code: "INVALID_REQUEST", message: "pay_link needs amount_paise and reference" } };
  const prior = await store.get(`pl:link:ref:${reference}`);
  if (prior && prior.amount_paise === amount) {
    const o = await order(prior.order_id);
    const st = o.response && o.response.data && o.response.data.status;
    if (o.http_status === 200 && !FAILED.has(st)) return { ...o, link: prior, reused: true };
  }
  if (!configured()) return demoLink({ amount, reference, base, reason: "is not configured (PINE_ID, PINE_SECRET unset)" });
  let r = await realLink({ amount, reference, base });
  // The sandbox has answered 500 to a cached token that still read the
  // mandate fine (8 Oct, 20:46); one retry with a fresh token, then the demo.
  if (!r.link && r.http_status >= 500) {
    await store.del("pl:uat:token");
    r = await realLink({ amount, reference, base });
  }
  return r.link ? r : demoLink({ amount, reference, base, reason: why(r) });
}

async function realLink({ amount, reference, base }) {
  // A fresh merchant reference per attempt: Pine Labs refuses a reused one.
  const merchant_ref = `${reference}-${Date.now().toString(36)}`.slice(0, 50);
  const r = await call("POST", "/checkout/v1/orders", {
    merchant_order_reference: merchant_ref,
    order_amount: { value: amount, currency: "INR" },
    integration_mode: "REDIRECT",
    pre_auth: false,
    allowed_payment_methods: ["UPI", "CARD", "NETBANKING"],
    // Pine Labs' firewall refuses a localhost callback (403), so a local run
    // hands it the public rails address.
    callback_url: `${publicBase(base)}/pinelabs/return`,
    notes: `Baari · ${reference}`.slice(0, 100), // Pine Labs allows 100 characters
    purchase_details: { customer: { first_name: "Vinay", last_name: "Sharma", email_id: "vinay.sharma402@example.com", mobile_number: "9999999999", country_code: "91" } },
  });
  const p = r.response || {};
  if (r.http_status === 200 && p.order_id && p.redirect_url) {
    const link = { order_id: p.order_id, url: p.redirect_url, reference, merchant_ref, amount_paise: amount, created_at: istString(), api: "real" };
    await store.set(`pl:link:ref:${reference}`, link, 7 * 86400);
    await store.set(`pl:link:order:${p.order_id}`, link, 7 * 86400);
    return { ...r, link };
  }
  return r;
}

// Who the pay request went to (Vinay, or the guest standing in for him).
async function setApprover(link, who) {
  const l = { ...link, approver: who };
  await store.set(`pl:link:ref:${l.reference}`, l, 7 * 86400);
  await store.set(`pl:link:order:${l.order_id}`, l, 7 * 86400);
}

// The demo checkout: same order shape as Pine Labs, kept on rails.
async function demoLink({ amount, reference, base, reason }) {
  const order_id = `demo-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
  const url = `${publicBase(base)}/pinelabs/demo/${order_id}`;
  await logFallback(`the pay link for ${reference} (Rs ${(amount / 100).toFixed(2)})`, reason);
  const data = { order_id, status: "CREATED", order_amount: { value: amount, currency: "INR" }, merchant_order_reference: reference, created_at: istString() };
  await store.set(`pl:demo:${order_id}`, data, 7 * 86400);
  await logCall("POST /checkout/v1/orders", 200, { order_id, redirect_url: url }, 0, "demo");
  const link = { order_id, url, reference, amount_paise: amount, created_at: istString(), api: "demo", fallback_reason: reason };
  await store.set(`pl:link:ref:${reference}`, link, 7 * 86400);
  await store.set(`pl:link:order:${order_id}`, link, 7 * 86400);
  return { endpoint: "POST /checkout/v1/orders (Pine Labs demo fallback)", http_status: 200, response: { order_id, redirect_url: url }, link, api: "demo" };
}

// For eval presets: a demo-checkout link for a reference, already in a state.
async function demoLinkFor({ amount_paise, reference, base, status }) {
  const r = await demoLink({ amount: amount_paise, reference, base, reason: "set by an eval preset" });
  const data = await store.get(`pl:demo:${r.link.order_id}`);
  if (status && status !== "CREATED") await store.set(`pl:demo:${r.link.order_id}`, { ...data, status, updated_at: istString() }, 7 * 86400);
  await setApprover(r.link, "Vinay");
  return r.link;
}

const isDemo = (order_id) => String(order_id || "").startsWith("demo-");

async function order(order_id) {
  if (isDemo(order_id)) {
    const data = await store.get(`pl:demo:${order_id}`);
    const response = data ? { data } : { code: "ORDER_NOT_FOUND" };
    await logCall(`GET /pay/v1/orders/${order_id}`, data ? 200 : 404, response, 0, "demo");
    return { endpoint: `GET /pay/v1/orders/${order_id} (Pine Labs demo fallback)`, http_status: data ? 200 : 404, response, api: "demo" };
  }
  if (!configured()) return { endpoint: "GET /pay/v1/orders (Pine Labs UAT)", http_status: 503, response: { code: "NOT_CONFIGURED" }, api: "real" };
  return call("GET", `/pay/v1/orders/${encodeURIComponent(order_id)}`);
}

// The demo checkout's two buttons.
async function demoAct(order_id, pay) {
  const data = await store.get(`pl:demo:${order_id}`);
  if (!data) return null;
  if (data.status === "CREATED") {
    data.status = pay ? "PROCESSED" : "CANCELLED";
    data.updated_at = istString();
    await store.set(`pl:demo:${order_id}`, data, 7 * 86400);
    await logCall(`demo checkout ${pay ? "pay" : "cancel"} ${order_id}`, 200, { status: data.status }, 0, "demo");
  }
  return data;
}

// ---- Reserve Pay: the real mandate when Pine Labs can run it

async function readMandate(id) {
  const r = await call("GET", `/ps/api/v1/public/subscriptions/sbmd/${id}`, null, HOST);
  const d = r.response || {};
  return r.http_status === 200 && d.subscription_id
    ? { ok: true, id: d.subscription_id, status: d.status, total: d.total_blocked_amount, remaining: d.remaining_balance, debited: d.debited_amount, end_date: d.end_date }
    : { ok: false, id, reason: why(r) };
}

// The sandbox lets an unapproved mandate lapse. When it has, ask Pine Labs
// for a new Rs 5,000 one on the same customer (at most every 5 minutes).
async function renewMandate(old) {
  if (!SANDBOX || !(await store.setnx("pl:uat:renew", 1, 300))) return null;
  const r = await call("POST", "/ps/api/v1/public/subscriptions/sbmd", {
    merchant_subscription_reference: `BAARI-SBMD-${Date.now().toString(36)}`,
    customer_id: CUSTOMER_ID,
    plan_details: { reserve_amount: old.total || 500000, currency: "INR", validity_days: 30, description: "Baari household block" },
  }, HOST);
  const id = r.response && r.response.subscription_id;
  await require("./ops").log({ at_ist: istString(), kind: "pine", rail: "pinelabs", api: "real", note: id ? `REAL API: mandate ${old.id} was ${old.status}, created ${id} on the Pine Labs sandbox` : `REAL API: mandate ${old.id} was ${old.status}, and a new one failed: ${why(r)}` });
  if (!id) return null;
  await store.set("pl:uat:mandate_id", id, 30 * 86400);
  return readMandate(id);
}

async function mandate() {
  const cached = await store.get("pl:uat:mandate");
  if (cached && cached.checked_ms > Date.now() - 60e3) return cached;
  let m;
  const id = (await store.get("pl:uat:mandate_id")) || MANDATE_ID;
  if (!configured()) m = { ok: false, id, reason: "is not configured" };
  else {
    m = await readMandate(id);
    if (m.ok && DEAD.has(String(m.status).toUpperCase())) m = (await renewMandate(m)) || m;
  }
  m.checked_ms = Date.now();
  m.checked_at = istString();
  await store.set("pl:uat:mandate", m, 600);
  return m;
}

// For /app/state: the last mandate read at once, refreshed after the
// response when it's over a minute old. Only a cold cache waits for Pine Labs.
async function mandateFast() {
  const c = await store.get("pl:uat:mandate");
  if (!c || !c.id) return mandate();
  if (!(c.checked_ms > Date.now() - 60e3)) require("./wake").later(mandate());
  return c;
}

// A Reserve Pay call (path on the demo block's id). Returns { result } from
// the real mandate, or { fallback: reason } and the caller uses the demo
// block. The real one runs only once the payer has approved the mandate.
async function reservePay(method, path, body, demoId) {
  const what = `Reserve Pay ${method} ${path.split(demoId).join("<mandate>")}`;
  const m = await mandate();
  const presId = (path.match(/\/presentations\/([^/]+)$/) || [])[1];
  let reason = null;
  if (!m.ok) reason = m.reason;
  else if (m.status !== "ACTIVE") reason = `mandate ${m.id} is ${m.status}: the payer hasn't approved it on UPI yet (UPI isn't enabled on the sandbox merchant)`;
  else if (/\/payee$/.test(path)) reason = "has no payee debit on a Reserve Pay mandate";
  else if (presId && presId !== "payee" && !(await store.get(`pl:real:pres:${presId}`))) reason = "never saw this debit (it ran on the demo block)";
  if (reason) {
    await logFallback(what, reason);
    return { fallback: reason };
  }
  const r = await call(method, path.split(demoId).join(m.id), body && body.subscription_id ? { ...body, subscription_id: m.id } : body, HOST);
  if (r.http_status === 0 || r.http_status >= 500) {
    await logFallback(what, why(r));
    return { fallback: why(r) };
  }
  if (r.response && r.response.presentation_id) await store.set(`pl:real:pres:${r.response.presentation_id}`, 1, 30 * 86400);
  await store.set("pl:uat:mandate", { checked_ms: 0 }, 1);
  return { result: r };
}

// Read the order from Pine Labs (never trust a redirect) and record a paid
// one once: the reference is paid, and the shipment guard and Khata see it.
async function settle(order_id) {
  const o = await order(order_id);
  const d = (o.response && o.response.data) || {};
  const saved = (await store.get(`pl:link:order:${order_id}`)) || null;
  // A link from a night that was reset counts for nothing tonight.
  const link = saved && !saved.retired ? saved : null;
  const paid = PAID.has(String(d.status || "").toUpperCase());
  if (link && d.status) await store.set(`pl:link:status:${order_id}`, d.status, 7 * 86400);
  let fresh = false;
  if (paid && link && (await store.setnx(`pl:link:done:${order_id}`, 1, 7 * 86400))) {
    fresh = true;
    const rec = { order_id, reference: link.reference, amount_paise: (d.order_amount && d.order_amount.value) || link.amount_paise, status: d.status, paid_at: istString() };
    await store.set(`pl:link:paid:${link.reference}`, rec, 7 * 86400);
    const day = (String(link.reference).match(/BAARI-(\d{4}-\d{2}-\d{2})/) || [])[1];
    if (day) await store.set(`pl:link:paidday:${day}`, ((await store.get(`pl:link:paidday:${day}`)) || 0) + rec.amount_paise, 7 * 86400);
    const rs = (rec.amount_paise / 100).toFixed(2);
    const by = link.approver || "Vinay";
    await editMessage(link, `✅ ${by === "the guest" ? "Our guest" : by} paid Rs ${rs} on Pine Labs${link.api === "demo" ? " (demo checkout)" : ""}.`);
    await event("link_paid", { reference: link.reference, order_id, amount: rec.amount_paise, by, api: link.api || "real", pine_status: d.status, summary: `Rs ${rs} paid on Pine Labs by ${by}` });
  }
  // A closed order that will never be paid is a "no", like the Nahi button.
  // ATTEMPTED (a try failed, the link still works) is not: Vinay can retry.
  const failed = FAILED.has(String(d.status || "").toUpperCase());
  const freshFail = !!(failed && link && (await store.setnx(`pl:link:failed:${order_id}`, 1, 7 * 86400)));
  if (freshFail) {
    const rs = (link.amount_paise / 100).toFixed(2);
    await editMessage(link, `✗ This link closed without a payment (${String(d.status).toLowerCase()}). Baari is finding another way.`);
    await event("link_closed", { reference: link.reference, order_id, amount: link.amount_paise, pine_status: d.status, api: link.api || "real", summary: `Rs ${rs} link ${String(d.status).toLowerCase()} on Pine Labs, not paid` });
  }
  return { order: o, status: d.status || null, paid, fresh, failed, freshFail, link };
}

// Pine Labs sends the payer's browser back to /pinelabs/return (and can post a
// webhook) after checkout. Whatever arrives, the order is read back from Pine
// Labs before anything counts. A newly paid order becomes a message from
// Vinay in the inbox, so the phase holding the ask (CHECK) wakes and reads it.
function orderIdFrom(req) {
  const q = req.query || {};
  if (q.order_id || q.orderId) return String(q.order_id || q.orderId);
  const raw = typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "";
  try {
    const j = JSON.parse(raw);
    const d = j.data || j;
    if (d.order_id || d.orderId) return String(d.order_id || d.orderId);
  } catch {}
  const f = new URLSearchParams(raw);
  return f.get("order_id") || f.get("orderId") || null;
}

async function onCallback(req, base) {
  const order_id = orderIdFrom(req);
  if (!order_id) return { ok: false, error: "no order_id" };
  const s = await settle(order_id);
  if (!s.link) return { ok: true, order_id, status: s.status, paid: s.paid, reference: null };
  const ops = require("./ops");
  const telegram = require("./telegram");
  const cast = await ops.getCast();
  // The payer hears back: Vinay, or the guest who stood in for him.
  const chat_id = cast.roles.Vinay || ((await ops.approver()) === ops.GUEST ? (await ops.resolveTo(ops.GUEST)).chat_id : null) || cast.operator || null;
  const d = (s.order.response && s.order.response.data) || {};
  const rs = ((d.order_amount ? d.order_amount.value : s.link.amount_paise) / 100).toFixed(2);
  // Paid (yes) or closed unpaid (no): either way the ask is answered, so it
  // becomes a message from Vinay and the phase holding the ask (CHECK) wakes.
  if (s.fresh || s.freshFail) {
    const text = s.fresh ? `Paid Rs ${rs} on Pine Labs${s.link.api === "demo" ? " (demo checkout)" : ""} for ${s.link.reference} (order ${order_id}, ${s.status})` : `Pine Labs payment of Rs ${rs} for ${s.link.reference} did not go through (order ${order_id}, ${s.status})`;
    await store.push("tg:updates", { update_id: await ops.nextUpdateId(), source: "pinelabs", kind: "payment", chat_id, role: "Vinay", from_name: "Pine Labs", date_ist: istString(), text }, 2000);
    const tag = s.link.api === "demo" ? " (demo)" : "";
    if (chat_id) await telegram.statusNote(chat_id, s.fresh ? `✅ Pine Labs${tag}: got Rs ${rs}. Baari is moving ahead.` : `❌ Pine Labs${tag}: the Rs ${rs} payment didn't go through. Baari is finding another way.`).catch(() => {});
    const wake = require("./wake");
    wake.later(wake.tick(s.fresh ? "Pine Labs payment from Vinay" : "Pine Labs payment failed", base, null, chat_id ? { chat_id, role: "Vinay" } : null));
  } else if (!s.paid && String(s.status || "").toUpperCase() === "ATTEMPTED" && chat_id) {
    // A try that failed while the link still works: Vinay decides.
    await telegram.statusNote(chat_id, `Pine Labs: the Rs ${rs} payment didn't go through. Tap the same button to try again, or tap "No".`).catch(() => {});
  }
  return { ok: true, order_id, status: s.status, paid: s.paid, failed: s.failed, reference: s.link.reference, api: s.link.api || "real" };
}

// Paid by link for that night (the shipment guard lets a prepaid order through).
async function paidForDay(day) {
  return Number((await store.get(`pl:link:paidday:${day}`)) || 0);
}

// ---- what a link is for, and what happened to it (finale PL2 to PL4)

// Rule ids (M5, B2, L7) and the tool trace mean nothing to the family.
function plain(s) {
  return String(s || "")
    .replace(/:?\s*"?tool [\s\S]*$/, "")
    .replace(/\b(?:rules?\s+)?[A-Z]\d{1,2}[a-z]?\b:?/g, "")
    .replace(/\s*\(\s*[,;\s]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim()
    .slice(0, 240);
}

// "BAARI-2026-10-09-staples" -> "Staples for 9 Oct".
function purposeOf(reference) {
  const m = String(reference || "").match(/BAARI-(\d{4})-(\d{2})-(\d{2})-?(.*)$/i);
  if (!m) return String(reference || "");
  const when = `${Number(m[3])} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]}`;
  const what = (m[4] || "order").replace(/[-_]+/g, " ").trim();
  return `${what[0].toUpperCase()}${what.slice(1)} for ${when}`;
}

// Why Baari is paying, as the agent said it when it paid (labels.purpose,
// labels.reason) or as rails can tell from the reference.
async function noteWhy(reference, { purpose, reason, rule } = {}) {
  if (!reference) return;
  const old = (await store.get(`pl:why:${reference}`)) || {};
  await store.set(`pl:why:${reference}`, { purpose: plain(purpose) || old.purpose || purposeOf(reference), reason: plain(reason) || old.reason || null, rule: rule || old.rule || null }, 7 * 86400);
}
async function whyOf(reference) {
  return (await store.get(`pl:why:${reference}`)) || { purpose: purposeOf(reference), reason: null, rule: null };
}

// A Pine Labs event for the app's Diary and /app/events: link, link_paid,
// link_declined, link_closed, refuse. Kept in its own list too, so Delhivery
// polling can't push them out of the call log.
async function event(kind, fields) {
  const rec = { id: await store.incr("log:seq"), at_ist: istString(), kind: "event", event: kind, rail: "pinelabs", ...fields };
  const recording = await store.get("recording");
  if (recording) rec.recording = recording;
  await store.push("log", rec);
  await store.push("pl:events", rec, 300);
  return rec;
}
async function events(n = 100) {
  return store.range("pl:events", n);
}

// The Telegram message that carried the link, so it can say what happened.
async function noteMessage(link, sent, text) {
  if (!link || !sent || !sent.ok || sent.sim) return;
  const l = { ...((await store.get(`pl:link:order:${link.order_id}`)) || link), msg: { chat_id: sent.chat_id, message_id: sent.message_id, text } };
  await store.set(`pl:link:ref:${l.reference}`, l, 7 * 86400);
  await store.set(`pl:link:order:${l.order_id}`, l, 7 * 86400);
}

// Once per link: the buttons go and one line says how it ended.
async function editMessage(link, line) {
  const m = link && link.msg;
  if (!m || !m.message_id || !(await store.setnx(`pl:link:edited:${link.order_id}`, 1, 7 * 86400))) return false;
  const r = await require("./telegram").call("editMessageText", { chat_id: m.chat_id, message_id: m.message_id, text: `${m.text}\n\n${line}` }).catch(() => null);
  return !!(r && r.ok);
}

// A "no" to a waiting link, from Telegram's No button or the app. Idempotent:
// the second "no" for the same link changes nothing.
async function decline(reference, by, via) {
  const link = reference && (await store.get(`pl:link:ref:${reference}`));
  if (!link) return { ok: false, error: `no pay link for ${reference}` };
  const paid = await store.get(`pl:link:paid:${reference}`);
  if (paid && paid.order_id === link.order_id) return { ok: false, error: "already paid", status: "PAID" };
  if (!(await store.setnx(`pl:link:declined:${link.order_id}`, { by, via, at_ist: istString() }, 7 * 86400))) return { ok: true, already: true, status: "DECLINED" };
  // Telegram's own tap already folded the buttons; the app's needs the edit.
  if (via === "telegram") await store.setnx(`pl:link:edited:${link.order_id}`, 1, 7 * 86400);
  else await editMessage(link, `✗ ${by || "Vinay"} said no in the Baari app. Baari is finding another way.`);
  const rs = (link.amount_paise / 100).toFixed(2);
  await event("link_declined", { reference, order_id: link.order_id, amount: link.amount_paise, by: by || null, via, summary: `${by || "Vinay"} said no to Rs ${rs} (${via})` });
  return { ok: true, status: "DECLINED", order_id: link.order_id };
}

// A link for that night still waiting on its payer. A parcel isn't booked
// while one is open: the money question isn't settled yet (PL1).
async function waitingForDay(day) {
  return (await requests(day)).filter((r) => r.status === "WAITING");
}

// Rails turned a debit or a booking down. Plain words, the amount, the limit.
async function refusal({ code, reference, amount_paise, message, limit_paise }) {
  const rs = (p) => `Rs ${(Number(p) / 100).toFixed(0)}`;
  const why =
    {
      APPROVAL_REQUIRED: `${rs(amount_paise)} is over the Rs 300 limit for one order, so it needs Vinay's yes`,
      ALREADY_PAID_BY_LINK: "Already paid by Pine Labs link, so a second debit would charge twice",
      INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION: `${rs(amount_paise)} is more than what's left in the household block`,
      DAILY_LIMIT_EXCEEDED: `${rs(amount_paise)} would go over today's Rs ${limit_paise ? (limit_paise / 100).toFixed(0) : 400} cap`,
      PAYEE_NOT_ALLOWED: "That shop isn't on the household's list",
      BLOCK_CANT_PAY: `The block can't pay ${rs(amount_paise)} today, so the parcel wasn't booked`,
      LINK_WAITING: "A Pine Labs link for this night isn't paid yet, so the parcel waits",
    }[code] || plain(message) || code;
  const rec = { at_ist: istString(), code, reference: reference || null, amount: Number(amount_paise) || null, limit: limit_paise || null, why };
  await store.push("pl:refusals", rec, 100);
  await event("refuse", { ...rec, summary: why });
  return rec;
}

// Refusals for the app, each with what Baari did next for that reference.
async function refusals(day) {
  const links = await allLinks();
  const asks = (await store.range("tg:updates", 500)).filter((u) => u.kind === "button" && /^approve:/.test(u.button_data || ""));
  return (await store.range("pl:refusals", 50))
    .filter((r) => !day || !r.reference || String(r.reference).includes(day))
    .map((r) => {
      const link = links.find((l) => l.reference === r.reference && String(l.created_at) >= String(r.at_ist));
      const yes = asks.find((u) => u.button_data.slice(8) === r.reference && String(u.date_ist) >= String(r.at_ist));
      const instead = link ? `Sent ${link.approver || "Vinay"} a Pine Labs link for Rs ${(link.amount_paise / 100).toFixed(0)}` : yes ? `${yes.role || "Vinay"} said yes, then Baari paid` : null;
      return { at_ist: r.at_ist, amount: r.amount, why: r.why, code: r.code, reference: r.reference, asked: !!(link || yes), instead };
    });
}

async function allLinks() {
  const ks = (await store.keys("pl:link:order:*")).filter((k) => !k.includes("EVAL"));
  return (await Promise.all(ks.map((k) => store.get(k)))).filter((l) => l && !l.retired && !String(l.reference).includes("EVAL"));
}

// A new night (ops.resetDay) reuses BAARI-<date>-staples. Last run's links
// retire: they leave the app and the parcel guard, a paid one no longer
// counts as tonight's payment, and the next pl.link makes a fresh order.
async function resetNight() {
  let n = 0;
  for (const k of await store.keys("pl:link:order:*")) {
    const l = await store.get(k);
    if (!l || l.retired || String(l.reference).includes("EVAL")) continue;
    await store.set(k, { ...l, retired: istString() }, 7 * 86400);
    n++;
  }
  for (const pat of ["pl:link:ref:BAARI-*", "pl:link:paid:BAARI-*", "pl:link:paidday:*", "pl:why:BAARI-*"]) {
    for (const k of await store.keys(pat)) if (!k.includes("BAARI-EVAL-")) await store.del(k);
  }
  await store.del("pl:refusals");
  return n;
}

// Tonight's pay requests for the app and Telegram: amount, what it's for, who
// answers, the checkout while it's open, and how it went. Built from what
// rails stored; it never calls Pine Labs, so it's fast.
async function requests(day) {
  const denies = (await store.range("tg:updates", 500)).filter((u) => u.kind === "button" && /^deny:/.test(u.button_data || ""));
  const links = (await allLinks()).filter((l) => !day || String(l.reference).includes(day));
  const out = await Promise.all(
    links.map(async (l) => {
      const [paid, st, dec, why] = await Promise.all([store.get(`pl:link:paid:${l.reference}`), store.get(`pl:link:status:${l.order_id}`), store.get(`pl:link:declined:${l.order_id}`), whyOf(l.reference)]);
      const s = String(st || "").toUpperCase();
      // Older links (before 9 Oct) have no declined record: a No tap for the
      // reference after the link went out counts.
      const oldNo = !dec && denies.find((u) => u.button_data.slice(5) === l.reference && String(u.date_ist) >= String(l.created_at));
      const d = dec ? (typeof dec === "string" ? JSON.parse(dec) : dec) : oldNo ? { by: oldNo.role || null, via: "telegram", at_ist: oldNo.date_ist } : null;
      const isPaid = paid && paid.order_id === l.order_id;
      const status = isPaid ? "PAID" : FAILED.has(s) ? "CLOSED" : d ? "DECLINED" : "WAITING";
      return {
        order_id: l.order_id,
        reference: l.reference,
        amount: l.amount_paise,
        for: why.purpose,
        reason: why.reason,
        status,
        pine_status: s || null,
        checkout_url: status === "WAITING" ? l.url : null,
        api: l.api || "real",
        asked_at: l.created_at,
        approver: l.approver || "Vinay",
        paid_at: isPaid ? paid.paid_at : null,
        declined: d,
        telegram: !!l.msg,
      };
    }),
  );
  return out.sort((a, b) => String(a.asked_at).localeCompare(String(b.asked_at)));
}

module.exports = { createLink, setApprover, order, settle, onCallback, paidForDay, configured, mandate, mandateFast, reservePay, demoAct, requests, isDemo, BASE, MANDATE_ID, plain, purposeOf, noteWhy, whyOf, event, events, noteMessage, editMessage, decline, waitingForDay, refusal, refusals, resetNight, demoLinkFor };
