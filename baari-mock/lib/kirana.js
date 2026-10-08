// Sharma Kirana's order book: an invented capability, like the hyperlocal hop.
// Today Sunita walks in at 7:40 and buys with her own money or on credit.
// With this, Baari places the order the night before, the shop packs it,
// Baari pays the bill from the household's Reserve Pay block (pl.payee, the
// payee-routed debit), and Sunita only collects. Every response says it's a
// Baari invention.
//
//   POST /kirana/v1/orders        {order_ref, items: "tomato 300 g, onion 200 g" | [{item, qty_g|qty}], pickup_by?, picker?}
//   GET  /kirana/v1/orders/{id}   status PLACED -> PACKED -> READY, paid from the payment reference
//
// Prices are Sharma Kirana's morning rates (Rs per kg, eggs per piece).

const store = require("./store");
const { istString, digits } = require("./util");

const SHOP = { name: "Sharma Kirana", vpa: "sharmakirana@okaxis", address: "Sector 7 market, Rohini, Delhi 110085" };
const RATE = { tomato: 40, onion: 30, palak: 60, paneer: 440, curd: 80, lauki: 40, "ginger-garlic": 200, egg: 7, "idli batter": 120, milk: 66 };
// Packing takes 2 minutes on the mock so a demo can watch it change.
const PACK_MS = Number(process.env.KIRANA_PACK_MS || 2 * 60 * 1000);
const NOTE = "Invented capability: Sharma Kirana's order book on Baari's rails. Not a real shop API.";

const json = (status, body) => ({ status, headers: { "Content-Type": "application/json" }, body });

function parseItems(items) {
  const hh = require("./household");
  const list = Array.isArray(items)
    ? items
    : String(items || "")
        .split(/,|\band\b|\baur\b/i)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const m = p.match(/^(.+?)\s*([\d.]+)\s*(kg|g|gm|ml|pc|pcs|piece|pieces)?\s*$/i);
          if (!m) return { item: p, qty: 0 };
          const n = Number(m[2]);
          const unit = (m[3] || "").toLowerCase();
          return unit === "kg" ? { item: m[1], qty_g: n * 1000 } : /^p/.test(unit) ? { item: m[1], qty: n } : { item: m[1], qty_g: n };
        });
  return list.map((x) => ({ item: hh.itemKey ? hh.itemKey(x.item) : String(x.item).toLowerCase(), qty_g: Number(x.qty_g) || 0, qty: Number(x.qty) || 0 }));
}

async function createOrder(body) {
  const ref = String(body.order_ref || body.reference || "").trim();
  if (ref) {
    const prior = await store.get(`kr:ref:${ref}`);
    if (prior) return json(200, await view(await store.get(`kr:order:${prior}`), true));
  }
  const hh = require("./household");
  // A 0 g line is a mistake, not an order (T1, 8 October): drop it.
  const lines = parseItems(body.items).filter((l) => l.qty_g > 0 || l.qty > 0);
  if (!lines.length) return json(400, { success: false, error: "items is required, like \"tomato 300 g, onion 200 g\"" });
  const missing = lines.filter((l) => !hh.KIRANA_STOCK.includes(l.item));
  if (missing.length) {
    return json(200, { success: false, status: "ITEM_NOT_STOCKED", not_stocked: missing.map((l) => l.item), message: `${SHOP.name} doesn't stock ${missing.map((l) => l.item).join(", ")}. Dry staples come by Delhivery.`, note: NOTE });
  }
  const priced = lines.map((l) => {
    const rupees = l.item === "egg" ? (l.qty || 0) * RATE.egg : ((l.qty_g || 0) / 1000) * RATE[l.item];
    return { ...l, rate: l.item === "egg" ? `Rs ${RATE.egg}/pc` : `Rs ${RATE[l.item]}/kg`, amount_paise: Math.round(rupees * 100) };
  });
  const total = priced.reduce((s, l) => s + l.amount_paise, 0);
  const o = {
    order_id: "KR" + digits(8),
    order_ref: ref || null,
    shop: SHOP.name,
    shop_vpa: SHOP.vpa,
    lines: priced,
    total_paise: total,
    pickup_by: body.pickup_by || "07:40",
    picker: body.picker || "Sunita",
    created_ms: Date.now(),
    created_ist: istString(),
    payment_ref: ref || null,
  };
  await store.set(`kr:order:${o.order_id}`, o, 3 * 86400);
  if (ref) await store.set(`kr:ref:${ref}`, o.order_id, 3 * 86400);
  await store.set("kr:last", o.order_id, 3 * 86400);
  return json(201, await view(o, false));
}

// Paid when the household's payee debit with the order's reference settled.
async function paidState(o) {
  if (!o.payment_ref) return { paid: false };
  const id = await store.get(`pl:mpr:${o.payment_ref}`);
  const p = id && (await store.get(`pl:pres:${id}`));
  if (!p) return { paid: false };
  return { paid: p.status === "SUCCESS" && !p.refund, payment_status: p.status, paid_paise: p.amount && p.amount.value, utr: p.utr || null };
}

async function view(o, duplicate) {
  if (!o) return { success: false, error: "order not found" };
  const age = Date.now() - o.created_ms;
  const status = age >= PACK_MS ? "READY" : age >= PACK_MS / 2 ? "PACKED" : "PLACED";
  const pay = await paidState(o);
  return {
    success: true,
    ...(duplicate ? { duplicate: true } : {}),
    order_id: o.order_id,
    order_ref: o.order_ref,
    shop: o.shop,
    shop_vpa: o.shop_vpa,
    status,
    lines: o.lines.map((l) => ({ item: l.item, qty: l.item === "egg" ? `${l.qty} pc` : `${l.qty_g} g`, rate: l.rate, amount_rupees: (l.amount_paise / 100).toFixed(2) })),
    total_paise: o.total_paise,
    total_rupees: (o.total_paise / 100).toFixed(2),
    pickup_by: o.pickup_by,
    picker: o.picker,
    ...pay,
    note: NOTE,
  };
}

async function getOrder(id) {
  const o = await store.get(`kr:order:${id}`);
  return o ? json(200, await view(o, false)) : json(404, { success: false, error: `no order ${id}` });
}

async function lastOrder() {
  const id = await store.get("kr:last");
  const o = id && (await store.get(`kr:order:${id}`));
  return o ? view(o, false) : null;
}

async function route(req) {
  const p = req.path;
  let m;
  if (p === "/kirana/v1/orders" && req.method === "POST") {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    return createOrder(b);
  }
  if ((m = p.match(/^\/kirana\/v1\/orders\/([A-Z0-9]+)$/)) && req.method === "GET") return getOrder(m[1]);
  return null;
}

module.exports = { route, createOrder, getOrder, lastOrder, view, SHOP, RATE };
