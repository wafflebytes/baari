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

const why = (r) => `answered HTTP ${r.http_status}${r.response && (r.response.code || r.response.message) ? ` (${[r.response.code, r.response.message].filter(Boolean).join(": ").slice(0, 120)})` : ""}`;

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
  const r = await realLink({ amount, reference, base });
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
  const link = (await store.get(`pl:link:order:${order_id}`)) || null;
  const paid = PAID.has(String(d.status || "").toUpperCase());
  if (link && d.status) await store.set(`pl:link:status:${order_id}`, d.status, 7 * 86400);
  let fresh = false;
  if (paid && link && (await store.setnx(`pl:link:done:${order_id}`, 1, 7 * 86400))) {
    fresh = true;
    const rec = { order_id, reference: link.reference, amount_paise: (d.order_amount && d.order_amount.value) || link.amount_paise, status: d.status, paid_at: istString() };
    await store.set(`pl:link:paid:${link.reference}`, rec, 7 * 86400);
    const day = (String(link.reference).match(/BAARI-(\d{4}-\d{2}-\d{2})/) || [])[1];
    if (day) await store.set(`pl:link:paidday:${day}`, ((await store.get(`pl:link:paidday:${day}`)) || 0) + rec.amount_paise, 7 * 86400);
  }
  // A closed order that will never be paid is a "no", like the Nahi button.
  // ATTEMPTED (a try failed, the link still works) is not: Vinay can retry.
  const failed = FAILED.has(String(d.status || "").toUpperCase());
  const freshFail = !!(failed && link && (await store.setnx(`pl:link:failed:${order_id}`, 1, 7 * 86400)));
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
  const chat_id = cast.roles.Vinay || cast.operator || null;
  const d = (s.order.response && s.order.response.data) || {};
  const rs = ((d.order_amount ? d.order_amount.value : s.link.amount_paise) / 100).toFixed(2);
  // Paid (yes) or closed unpaid (no): either way the ask is answered, so it
  // becomes a message from Vinay and the phase holding the ask (CHECK) wakes.
  if (s.fresh || s.freshFail) {
    const text = s.fresh ? `Paid Rs ${rs} on Pine Labs${s.link.api === "demo" ? " (demo checkout)" : ""} for ${s.link.reference} (order ${order_id}, ${s.status})` : `Pine Labs payment of Rs ${rs} for ${s.link.reference} did not go through (order ${order_id}, ${s.status})`;
    await store.push("tg:updates", { update_id: await ops.nextUpdateId(), source: "pinelabs", kind: "payment", chat_id, role: "Vinay", from_name: "Pine Labs", date_ist: istString(), text }, 2000);
    const tag = s.link.api === "demo" ? " (demo)" : "";
    if (chat_id) await telegram.statusNote(chat_id, s.fresh ? `✅ Pine Labs${tag}: Rs ${rs} mil gaye. Baari ab aage badhti hai.` : `❌ Pine Labs${tag}: Rs ${rs} ka payment nahi hua. Baari doosra raasta dekh rahi hai.`).catch(() => {});
    const wake = require("./wake");
    wake.later(wake.tick(s.fresh ? "Pine Labs payment from Vinay" : "Pine Labs payment failed", base, null, chat_id ? { chat_id, role: "Vinay" } : null));
  } else if (!s.paid && String(s.status || "").toUpperCase() === "ATTEMPTED" && chat_id) {
    // A try that failed while the link still works: Vinay decides.
    await telegram.statusNote(chat_id, `Pine Labs: Rs ${rs} ka payment nahi ho paya. Wahi button dobara dabaiye, ya "Nahi" dabaiye.`).catch(() => {});
  }
  return { ok: true, order_id, status: s.status, paid: s.paid, failed: s.failed, reference: s.link.reference, api: s.link.api || "real" };
}

// Paid by link for that night (the shipment guard lets a prepaid order through).
async function paidForDay(day) {
  return Number((await store.get(`pl:link:paidday:${day}`)) || 0);
}

// Tonight's pay requests for the app: amount, who answers, and how it went.
// Built from what rails stored; it never calls Pine Labs.
async function requests(day) {
  const out = [];
  const denied = new Set((await store.range("tg:updates", 500)).filter((u) => u.kind === "button" && /^deny:/.test(u.button_data || "")).map((u) => u.button_data.slice(5)));
  for (const k of await store.keys("pl:link:order:*")) {
    const l = await store.get(k);
    if (!l || (day && !String(l.reference).includes(day)) || String(l.reference).includes("EVAL")) continue;
    const paid = await store.get(`pl:link:paid:${l.reference}`);
    const st = String((await store.get(`pl:link:status:${l.order_id}`)) || "").toUpperCase();
    const status = paid && paid.order_id === l.order_id ? "PAID" : FAILED.has(st) ? "CLOSED" : denied.has(l.reference) ? "DECLINED" : "WAITING";
    out.push({ order_id: l.order_id, reference: l.reference, amount: l.amount_paise, status, api: l.api || "real", asked_at: l.created_at, approver: "Vinay" });
  }
  return out.sort((a, b) => String(a.asked_at).localeCompare(String(b.asked_at)));
}

module.exports = { createLink, order, settle, onCallback, paidForDay, configured, mandate, reservePay, demoAct, requests, isDemo, BASE, MANDATE_ID };
