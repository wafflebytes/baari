// Pine Labs Online UPI Reserve Pay (SBMD) mock. Paths and fields follow
// pinelabs.com/docs/online-payments/upi-reserve-pay/integration-steps.
// All amounts are in paisa, as in the Pine Labs API.
//
// The platform's own pinelabs_plural connector only offers create_order and
// check_order_status, so Reserve Pay has to be mocked.
//
// Capability C7 (not a Pine Labs API today) lives at
// /ps/api/v1/public/subscriptions/{id}/presentations/payee: a Reserve Pay
// debit that settles to a named UPI ID (the kirana) instead of the merchant.

const store = require("./store");
const { takeOverride } = require("./scenario");
const { fault } = require("./faults");
const { pineId, alnum, digits, json, istDate } = require("./util");

// Second layer for the daily cap (ENGINEERING 1.4, part of invented
// capability C7): debits that are not FAILED count against today's IST total.
const dayKey = (subId) => `pl:day:${subId}:${istDate()}`;
async function spentToday(subId) {
  return Number((await store.get(dayKey(subId))) || 0);
}
async function addToday(subId, paise) {
  await store.set(dayKey(subId), (await spentToday(subId)) + paise, 2 * 86400);
}

const MAX_RESERVE = 1000000; // Rs 10,000
const MAX_DAYS = 90;
const SETTLE_MS = Number(process.env.PINE_SETTLE_MS || 4000);

const err = (status, code, message) => json(status, { code, message });

function body(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return null;
    }
  }
  return req.body || {};
}

function authed(req) {
  return /^Bearer\s+\S+/.test(req.headers.authorization || "");
}

async function token(req) {
  const f = await fault(await takeOverride("/api/auth/v1/token"));
  if (f) return f;
  const b = body(req) || {};
  if (!b.client_id || !b.client_secret || b.grant_type !== "client_credentials") {
    return err(400, "INVALID_REQUEST", "client_id, client_secret and grant_type=client_credentials are required");
  }
  return json(200, { access_token: "eyJhbGciOiJIUzI1NiJ9." + alnum(40) + "." + alnum(30), expires_in: 3600 });
}

async function createCustomer(req) {
  const f = await fault(await takeOverride("/api/v1/customer"));
  if (f) return f;
  const b = body(req) || {};
  if (!b.mobile_number) return err(400, "INVALID_REQUEST", "mobile_number is required");
  const now = new Date().toISOString();
  const c = {
    customer_id: pineId("cust-v1-"),
    global_customer_id: pineId("pl-v1-"),
    customer_key: pineId("ck-v1-"),
    merchant_customer_reference: b.merchant_customer_reference || "",
    first_name: b.first_name || "",
    last_name: b.last_name || "",
    country_code: b.country_code || "91",
    mobile_number: b.mobile_number,
    email_id: b.email_id || "",
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
    brand_wallet_enabled: false,
    brand_wallet_created_on: "null",
  };
  await store.set(`pl:cust:${c.customer_id}`, c);
  return json(201, c);
}

function publicSub(s) {
  if (s.status !== "ACTIVE") {
    const { allowed_payees, approve_url, ...rest } = s;
    return rest;
  }
  return {
    subscription_id: s.subscription_id,
    order_id: s.order_id,
    customer_id: s.customer_id,
    status: s.status,
    start_date: s.start_date,
    end_date: s.end_date,
    currency: s.plan_details.currency,
    total_blocked_amount: s.plan_details.reserve_amount,
    debited_amount: s.debited_amount,
    remaining_balance: s.plan_details.reserve_amount - s.debited_amount,
    ...(s.max_daily_debit ? { max_daily_debit: s.max_daily_debit } : {}),
  };
}

async function createSbmd(req, base) {
  const ov = await takeOverride("/ps/api/v1/public/subscriptions/sbmd");
  const f = await fault(ov);
  if (f) return f;
  const b = body(req);
  if (!b) return err(400, "INVALID_REQUEST", "Malformed JSON body");
  const p = b.plan_details || {};
  if (!b.merchant_subscription_reference || !b.customer_id || !p.reserve_amount || !p.validity_days) {
    return err(400, "INVALID_REQUEST", "merchant_subscription_reference, customer_id and plan_details are required");
  }
  if (p.reserve_amount > MAX_RESERVE) {
    return err(422, "RESERVE_AMOUNT_LIMIT_EXCEEDED", "UPI Reserve Pay allows at most INR 10,000 per block");
  }
  if (p.validity_days > MAX_DAYS) {
    return err(422, "VALIDITY_LIMIT_EXCEEDED", "UPI Reserve Pay validity cannot exceed 90 days");
  }
  const active = await store.get(`pl:active:${b.customer_id}`);
  if (active || ov === "active_exists") {
    return err(409, "ACTIVE_SBMD_EXISTS", "Customer already has an active SBMD mandate");
  }
  if (ov === "bank_not_supported") {
    return err(422, "SBMD_NOT_SUPPORTED_BY_BANK", "Customer's bank does not support UPI Reserve Pay. Supported: ICICI, Axis");
  }
  const start = new Date();
  const end = new Date(start.getTime() + p.validity_days * 86400000);
  const s = {
    subscription_id: pineId("v1-sub-"),
    order_id: pineId("v1-"),
    customer_id: b.customer_id,
    status: "CREATED",
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    plan_details: { reserve_amount: p.reserve_amount, currency: p.currency || "INR", validity_days: p.validity_days, description: p.description || "" },
    expires_at: end.toISOString(),
    debited_amount: 0,
    allowed_payees: b.allowed_payees || [],
  };
  s.redirect_url = `${base}/pinelabs/approve/${s.subscription_id}`;
  await store.set(`pl:sub:${s.subscription_id}`, s);
  return json(201, { ...publicSub(s), redirect_url: s.redirect_url });
}

async function fetchSbmd(req, id) {
  const r = await fetchSbmdInner(req, id);
  // C7 extension: today's total next to the cap, so the agent can check L1.
  if (r.status === 200 && r.body.max_daily_debit) r.body.debited_today = await spentToday(id);
  return r;
}

async function fetchSbmdInner(req, id) {
  const f = await fault(await takeOverride("/ps/api/v1/public/subscriptions/sbmd/{id}"));
  if (f) return f;
  const s = await store.get(`pl:sub:${id}`);
  if (!s) return err(404, "SUBSCRIPTION_NOT_FOUND", `No subscription with id ${id}`);
  if (s.status === "ACTIVE" && new Date(s.end_date).getTime() < Date.now()) {
    s.status = "COMPLETED";
    await store.set(`pl:sub:${id}`, s);
    await store.del(`pl:active:${s.customer_id}`);
  }
  return json(200, publicSub(s));
}

// The page the admin lands on from redirect_url. Stands in for the UPI app
// mandate screen, which a mock cannot reach.
async function approvePage(req, id) {
  const s = await store.get(`pl:sub:${id}`);
  if (!s) return { status: 404, headers: { "Content-Type": "text/html" }, body: "<h1>Mandate not found</h1>" };
  if (req.method === "POST") {
    s.status = "ACTIVE";
    await store.set(`pl:sub:${id}`, s);
    await store.set(`pl:active:${s.customer_id}`, id);
  }
  const rs = (s.plan_details.reserve_amount / 100).toLocaleString("en-IN");
  const html = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<title>Approve UPI Reserve Pay</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<h2>UPI Reserve Pay</h2><p>Baari wants to block <b>Rs ${rs}</b> for ${s.plan_details.validity_days} days.</p>
<p>${s.plan_details.description}</p>
${s.status === "ACTIVE" ? `<p style="color:green"><b>Approved.</b> The block is active.</p>` : `<form method=post><button style="font-size:18px;padding:10px 20px">Approve with UPI PIN</button></form>`}
<p style="color:#888;font-size:12px">Mock of the UPI app mandate screen</p></body>`;
  return { status: 200, headers: { "Content-Type": "text/html" }, body: html };
}

function publicPres(p) {
  const { settle_at, fail_with, ...rest } = p;
  return rest;
}

// Presentations start PENDING and settle a few seconds later, like the real
// flow where the bank confirms asynchronously.
async function settle(p) {
  if (p.status !== "PENDING" || Date.now() < p.settle_at) return p;
  const s = await store.get(`pl:sub:${p.subscription_id}`);
  if (p.fail_with) {
    p.status = "FAILED";
    p.failure_count = 1;
    p.failure_reason = p.fail_with;
    s.debited_amount -= p.amount.value; // release the hold
    if (s.max_daily_debit) await addToday(s.subscription_id, -p.amount.value);
    await store.set(`pl:sub:${s.subscription_id}`, s);
  } else {
    p.status = "SUCCESS";
    p.utr = digits(12);
    if (p.settlement) p.settlement.status = "SETTLED";
  }
  await store.set(`pl:pres:${p.presentation_id}`, p);
  return p;
}

async function createPresentation(req, subIdFromPath, payee) {
  const endpoint = payee
    ? "/ps/api/v1/public/subscriptions/{id}/presentations/payee"
    : "/ps/api/v1/public/presentations";
  const ov = await takeOverride(endpoint);
  const f = await fault(ov);
  if (f) return f;
  const b = body(req);
  if (!b) return err(400, "INVALID_REQUEST", "Malformed JSON body");
  const subId = subIdFromPath || b.subscription_id;
  const amt = b.amount || {};
  if (!subId || !amt.value) return err(400, "INVALID_REQUEST", "subscription_id and amount.value are required");
  if (amt.value < 100 || amt.value > 100000000) return err(400, "INVALID_AMOUNT", "amount.value must be between 100 and 100000000 paisa");

  const dupKey = b.merchant_presentation_reference && `pl:mpr:${b.merchant_presentation_reference}`;
  if (dupKey) {
    const prior = await store.get(dupKey);
    if (prior) return json(200, publicPres(await settle(await store.get(`pl:pres:${prior}`))));
  }

  const s = await store.get(`pl:sub:${subId}`);
  if (!s) return err(404, "SUBSCRIPTION_NOT_FOUND", `No subscription with id ${subId}`);
  if (s.status !== "ACTIVE") return err(422, "SUBSCRIPTION_NOT_ACTIVE", `Subscription is ${s.status}`);
  if (new Date(s.end_date).getTime() < Date.now()) return err(422, "SUBSCRIPTION_EXPIRED", "Mandate validity has ended");
  const remaining = s.plan_details.reserve_amount - s.debited_amount;
  if (amt.value > remaining) {
    return err(422, "INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION", `Debit of ${amt.value} exceeds remaining balance ${remaining}`);
  }

  if (s.max_daily_debit) {
    const today = await spentToday(subId);
    if (today + amt.value > s.max_daily_debit) {
      return err(422, "DAILY_LIMIT_EXCEEDED", `Debit of ${amt.value} would take today's total to ${today + amt.value}, over max_daily_debit ${s.max_daily_debit}`);
    }
  }

  let settlement;
  if (payee) {
    const vpa = (b.payee && b.payee.vpa) || "";
    if (!vpa) return err(400, "INVALID_REQUEST", "payee.vpa is required");
    if (!s.allowed_payees.map((p) => p.vpa).includes(vpa)) {
      return err(403, "PAYEE_NOT_ALLOWED", `${vpa} is not on this mandate's approved payee list`);
    }
    settlement = { payee_vpa: vpa, payee_name: b.payee.name || "", note: b.note || "", status: "PENDING" };
  }

  s.debited_amount += amt.value; // hold now so two debits cannot overspend
  await store.set(`pl:sub:${subId}`, s);
  if (s.max_daily_debit) await addToday(subId, amt.value);

  const p = {
    subscription_id: subId,
    presentation_id: pineId("v1-bil-"),
    due_date: new Date().toISOString(),
    amount: { value: amt.value, currency: amt.currency || "INR" },
    merchant_presentation_reference: b.merchant_presentation_reference || "",
    pdn_status: "NOT_APPLICABLE",
    status: "PENDING",
    failure_count: 0,
    order_id: pineId("v1-"),
    ...(settlement ? { settlement } : {}),
    settle_at: Date.now() + SETTLE_MS,
    fail_with:
      ov === "debit_declined" ? "DEBIT_DECLINED_BY_REMITTER_BANK" : ov === "payee_bank_down" ? "BENEFICIARY_BANK_UNAVAILABLE" : null,
  };
  await store.set(`pl:pres:${p.presentation_id}`, p);
  if (dupKey) await store.set(dupKey, p.presentation_id, 86400);
  return json(201, publicPres(p));
}

async function getPresentation(req, id) {
  const f = await fault(await takeOverride("/ps/api/v1/public/presentations/{id}"));
  if (f) return f;
  const p = await store.get(`pl:pres:${id}`);
  if (!p) return err(404, "PRESENTATION_NOT_FOUND", `No presentation with id ${id}`);
  return json(200, publicPres(await settle(p)));
}

async function route(req, base) {
  const { method, path } = req;
  let m;
  if ((m = path.match(/^\/pinelabs\/approve\/([^/]+)$/))) return approvePage(req, m[1]);
  if (method === "POST" && path === "/api/auth/v1/token") return token(req);
  if (!path.startsWith("/ps/") && path !== "/api/v1/customer") return null;
  if (!authed(req)) return err(401, "UNAUTHORIZED", "Missing or invalid access token");

  if (method === "POST" && path === "/api/v1/customer") return createCustomer(req);
  if (method === "POST" && path === "/ps/api/v1/public/subscriptions/sbmd") return createSbmd(req, base);
  if (method === "GET" && (m = path.match(/^\/ps\/api\/v1\/public\/subscriptions\/sbmd\/([^/]+)$/))) return fetchSbmd(req, m[1]);
  if (method === "POST" && path === "/ps/api/v1/public/presentations") return createPresentation(req, null, false);
  if (method === "POST" && (m = path.match(/^\/ps\/api\/v1\/public\/subscriptions\/([^/]+)\/presentations\/payee$/)))
    return createPresentation(req, m[1], true);
  if (method === "POST" && (m = path.match(/^\/ps\/api\/v1\/public\/subscriptions\/([^/]+)\/presentations$/)))
    return createPresentation(req, m[1], false);
  if (method === "GET" && (m = path.match(/^\/ps\/api\/v1\/public\/presentations\/([^/]+)$/))) return getPresentation(req, m[1]);
  return null;
}

// Set up the Sharma household's block as if S0 already happened: an ACTIVE
// mandate with the shops the family approved.
async function seed({ subscription_id, customer_id, reserve_rupees, debited_rupees, validity_days, allowed_payees, max_daily_debit, spent_today_paise }) {
  const start = new Date();
  const s = {
    subscription_id: subscription_id || pineId("v1-sub-"),
    order_id: pineId("v1-"),
    customer_id: customer_id || pineId("cust-v1-"),
    status: "ACTIVE",
    start_date: start.toISOString(),
    end_date: new Date(start.getTime() + (validity_days || 30) * 86400000).toISOString(),
    plan_details: {
      reserve_amount: Math.round((reserve_rupees || 5000) * 100),
      currency: "INR",
      validity_days: validity_days || 30,
      description: "Baari household food block, Flat 402",
    },
    debited_amount: Math.round((debited_rupees || 0) * 100),
    allowed_payees: allowed_payees || [],
    ...(max_daily_debit ? { max_daily_debit: Number(max_daily_debit) } : {}),
  };
  s.expires_at = s.end_date;
  await store.set(dayKey(s.subscription_id), Number(spent_today_paise || 0), 2 * 86400);
  const old = await store.get(`pl:active:${s.customer_id}`);
  if (old) await store.del(`pl:sub:${old}`);
  await store.set(`pl:sub:${s.subscription_id}`, s);
  await store.set(`pl:active:${s.customer_id}`, s.subscription_id);
  return s;
}

// What a block can still pay, in paise: what's left in it and what's left
// under today's cap. Rails uses it to stop a prepaid order the household
// can't pay for (Delhivery guard, lib/delhivery.js).
async function headroom(subId) {
  const s = await store.get(`pl:sub:${subId}`);
  if (!s) return null;
  const left = s.plan_details.reserve_amount - (s.debited_amount || 0);
  const capLeft = s.max_daily_debit ? s.max_daily_debit - (await spentToday(subId)) : Infinity;
  return { left, cap_left: capLeft, can_pay: Math.max(0, Math.min(left, capLeft)) };
}

module.exports = { route, seed, headroom };
