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

const crypto = require("crypto");
const store = require("./store");
const { istString } = require("./util");

const BASE = (process.env.PINE_ENV || "sandbox") === "production" ? "https://api.pluralpay.in/api" : "https://pluraluat.v2.pinepg.in/api";
const ID = (process.env.PINE_ID || "").trim();
const SECRET = (process.env.PINE_SECRET || "").trim();
const PAID = new Set(["PROCESSED", "AUTHORIZED"]);

const configured = () => !!(ID && SECRET);

async function logCall(request, status, response, ms) {
  await require("./ops").log({ at_ist: istString(), kind: "rest", rail: "pinelabs", via: "uat (real)", request, status, response: JSON.stringify(response).slice(0, 800), ms });
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

async function call(method, path, body) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}${path}`, { method, headers: headers(await token()), body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let response = text;
  try {
    response = JSON.parse(text);
  } catch {}
  await logCall(`${method} ${path}`, r.status, response, Date.now() - t0);
  return { endpoint: `${method} ${path} (Pine Labs UAT)`, http_status: r.status, response };
}

// One link per reference: asking again returns the same order while it's open.
async function createLink({ amount_paise, reference, base }) {
  if (!configured()) return { endpoint: "POST /checkout/v1/orders (Pine Labs UAT)", http_status: 503, response: { code: "NOT_CONFIGURED", message: "PINE_ID and PINE_SECRET are not set on rails" } };
  const amount = Math.round(Number(amount_paise));
  if (!reference || !(amount > 0)) return { endpoint: "POST /checkout/v1/orders (Pine Labs UAT)", http_status: 400, response: { code: "INVALID_REQUEST", message: "pay_link needs amount_paise and reference" } };
  const prior = await store.get(`pl:link:ref:${reference}`);
  if (prior && prior.amount_paise === amount) {
    const o = await order(prior.order_id);
    const st = o.response && o.response.data && o.response.data.status;
    if (o.http_status === 200 && !["FAILED", "CANCELLED", "EXPIRED"].includes(st)) return { ...o, link: prior, reused: true };
  }
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
    callback_url: `${/^https:\/\//.test(base || "") ? base : process.env.PINE_CALLBACK_BASE || "https://baari-rails.vercel.app"}/pinelabs/return`,
    notes: `Baari · ${reference}`.slice(0, 100), // Pine Labs allows 100 characters
    purchase_details: { customer: { first_name: "Vinay", last_name: "Sharma", email_id: "vinay.sharma402@example.com", mobile_number: "9999999999", country_code: "91" } },
  });
  const p = r.response || {};
  if (r.http_status === 200 && p.order_id && p.redirect_url) {
    const link = { order_id: p.order_id, url: p.redirect_url, reference, merchant_ref, amount_paise: amount, created_at: istString() };
    await store.set(`pl:link:ref:${reference}`, link, 7 * 86400);
    await store.set(`pl:link:order:${p.order_id}`, link, 7 * 86400);
    return { ...r, link };
  }
  return r;
}

async function order(order_id) {
  if (!configured()) return { endpoint: "GET /pay/v1/orders (Pine Labs UAT)", http_status: 503, response: { code: "NOT_CONFIGURED" } };
  return call("GET", `/pay/v1/orders/${encodeURIComponent(order_id)}`);
}

// Read the order from Pine Labs (never trust a redirect) and record a paid
// one once: the reference is paid, and the shipment guard and Khata see it.
async function settle(order_id) {
  const o = await order(order_id);
  const d = (o.response && o.response.data) || {};
  const link = (await store.get(`pl:link:order:${order_id}`)) || null;
  const paid = PAID.has(String(d.status || "").toUpperCase());
  let fresh = false;
  if (paid && link && (await store.setnx(`pl:link:done:${order_id}`, 1, 7 * 86400))) {
    fresh = true;
    const rec = { order_id, reference: link.reference, amount_paise: (d.order_amount && d.order_amount.value) || link.amount_paise, status: d.status, paid_at: istString() };
    await store.set(`pl:link:paid:${link.reference}`, rec, 7 * 86400);
    const day = (String(link.reference).match(/BAARI-(\d{4}-\d{2}-\d{2})/) || [])[1];
    if (day) await store.set(`pl:link:paidday:${day}`, ((await store.get(`pl:link:paidday:${day}`)) || 0) + rec.amount_paise, 7 * 86400);
  }
  return { order: o, status: d.status || null, paid, fresh, link };
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
  if (s.fresh) {
    const ops = require("./ops");
    const telegram = require("./telegram");
    const cast = await ops.getCast();
    const chat_id = cast.roles.Vinay || cast.operator || null;
    const rs = (s.order.response.data.order_amount.value / 100).toFixed(2);
    const u = { update_id: await ops.nextUpdateId(), source: "pinelabs", kind: "payment", chat_id, role: "Vinay", from_name: "Pine Labs", date_ist: istString(), text: `Paid Rs ${rs} on Pine Labs for ${s.link.reference} (order ${order_id}, ${s.status})` };
    await store.push("tg:updates", u, 2000);
    if (chat_id) await telegram.statusNote(chat_id, `✅ Pine Labs: Rs ${rs} mil gaye. Baari ab aage badhti hai.`).catch(() => {});
    const wake = require("./wake");
    wake.later(wake.tick("Pine Labs payment from Vinay", base, null, chat_id ? { chat_id, role: "Vinay" } : null));
  }
  return { ok: true, order_id, status: s.status, paid: s.paid, reference: s.link && s.link.reference };
}

// Paid by link for that night (the shipment guard lets a prepaid order through).
async function paidForDay(day) {
  return Number((await store.get(`pl:link:paidday:${day}`)) || 0);
}

module.exports = { createLink, order, settle, onCallback, paidForDay, configured, BASE };
