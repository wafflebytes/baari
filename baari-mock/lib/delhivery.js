// Delhivery B2C mock. Paths, parameters and request fields follow
// one.delhivery.com/developer-portal/documents/b2c exactly. Response shapes
// follow what the live API returns.
//
// The one thing Delhivery does not offer today lives under /api/hyperlocal/
// (capability C10: a kirana-to-flat hop inside a delivery window).

const store = require("./store");
const { takeOverride } = require("./scenario");
const { fault } = require("./faults");
const { istString, istDate, digits, json } = require("./util");

const WAREHOUSES = (process.env.DELHIVERY_WAREHOUSES || "sharma_kirana,baari_staples_hub")
  .split(",")
  .map((s) => s.trim());

const PINS = {
  110042: { district: "North West Delhi", city: "Delhi", state_code: "DL", sort_code: "DEL/BAM" },
  110053: { district: "North East Delhi", city: "Delhi", state_code: "DL", sort_code: "DEL/SHD" },
  122002: { district: "Gurgaon", city: "Gurugram", state_code: "HR", sort_code: "GGN/SEC" },
  208001: { district: "Kanpur Nagar", city: "Kanpur", state_code: "UP", sort_code: "KNU/CTY" },
  560034: { district: "Bangalore", city: "Bengaluru", state_code: "KA", sort_code: "BLR/KRM" },
  400086: { district: "Mumbai", city: "Mumbai", state_code: "MH", sort_code: "BOM/GHT" },
};
// 110099 is not serviceable at all; 110098 is under a temporary embargo.
const NSZ = new Set(["110099"]);
const EMBARGO = new Set(["110098"]);

// Whole demo timeline for a normal shipment, in minutes from manifest to
// delivery. The real thing takes a night; the recording cannot.
const DEMO_MINUTES = Number(process.env.DEMO_MINUTES || 6);

function authed(req) {
  const h = req.headers.authorization || "";
  const token = h.replace(/^Token\s+/i, "") || req.query.token || "";
  if (!token) return false;
  return !process.env.DELHIVERY_TOKEN || token === process.env.DELHIVERY_TOKEN;
}

const unauth = () => json(401, { detail: "Authentication credentials were not provided." });

function pinRecord(pin) {
  const p = PINS[pin] || { district: "Delhi", city: "Delhi", state_code: "DL", sort_code: "DEL/GEN" };
  return {
    postal_code: {
      district: p.district,
      pin: Number(pin),
      max_amount: 0,
      pre_paid: "Y",
      cash: "Y",
      pickup: "Y",
      repl: "Y",
      covid_zone: "",
      cod: "Y",
      country_code: "IN",
      is_oda: "N",
      protect_blacklist: false,
      sort_code: p.sort_code,
      state_code: p.state_code,
      max_weight: 0,
      city: p.city,
      remarks: EMBARGO.has(String(pin)) ? "Embargo" : "",
      center: [{ code: `IND${pin}AAA`, e: "", cn: `${p.city}_Hub (${p.state_code})`, s: "" }],
    },
  };
}

async function pincodes(req) {
  const pin = String(req.query.filter_codes || "").trim();
  const ov = await takeOverride("/c/api/pin-codes/json/");
  const f = await fault(ov);
  if (f) return f;
  if (!pin) return json(200, { delivery_codes: [] });
  if (NSZ.has(pin) || ov === "nsz") return json(200, { delivery_codes: [] });
  return json(200, { delivery_codes: [pinRecord(pin)] });
}

function newWaybill() {
  // 13 digits like live waybills: a fixed series prefix plus random digits.
  return "2471" + digits(9);
}

async function waybillBulk(req) {
  const count = Math.min(Number(req.query.count || 1), 10000);
  const f = await fault(await takeOverride("/waybill/api/bulk/json/"));
  if (f) return f;
  return json(200, Array.from({ length: count }, newWaybill).join(","));
}

async function waybillSingle() {
  const f = await fault(await takeOverride("/waybill/api/fetch/json/"));
  if (f) return f;
  return json(200, newWaybill());
}

// create.json takes either form-encoded `format=json&data={...}` or raw JSON.
function parseManifest(req) {
  let b = req.body;
  if (typeof b === "string") {
    const params = new URLSearchParams(b);
    if (params.has("data")) b = { format: params.get("format"), data: params.get("data") };
    else {
      try {
        b = JSON.parse(b);
      } catch {
        return null;
      }
    }
  }
  if (b && typeof b.data === "string") {
    try {
      return JSON.parse(b.data);
    } catch {
      return null;
    }
  }
  return b && b.shipments ? b : null;
}

// Baari rails guard, not Delhivery: a prepaid Baari order goes out only if
// the household's Reserve Pay block can pay for its items today. The model
// sometimes books before it reads the balance (eval E04); this stops a parcel
// nobody can pay for. Returns the refusal text, or null to go ahead.
async function unpaid(s) {
  if (!/^BAARI-/i.test(String(s.order || "")) || String(s.payment_mode || "").toLowerCase() === "cod") return null;
  const need = Math.round(Number(s.total_amount || 0) * 100);
  if (!need) return null;
  const uat = require("./pinelabs_uat");
  const day = (String(s.order).match(/BAARI-(\d{4}-\d{2}-\d{2})/) || [])[1];
  // Vinay paid for this night through a Pine Labs link (lib/pinelabs_uat.js):
  // the order is paid without the block.
  if (day && (await uat.paidForDay(day)) >= need) return null;
  // A link for this night still waiting: the parcel goes out only once Pine
  // Labs says PROCESSED, or after a No moves the staples elsewhere.
  const waiting = day ? await uat.waitingForDay(day) : [];
  if (waiting.length) {
    await uat.refusal({ code: "LINK_WAITING", reference: waiting[0].reference, amount_paise: need });
    return `Baari rails guard: the Pine Labs link for ${waiting[0].reference} (Rs ${(waiting[0].amount / 100).toFixed(2)}) isn't paid yet. Not booked. Book after it reads PROCESSED; if it's declined or closed, send the staples to the kirana or switch to the runner-up.`;
  }
  const h = await require("./pinelabs").headroom(require("./ops").SUB_ID);
  if (!h || h.can_pay >= need) return null;
  const rs = (p) => `Rs ${(p / 100).toFixed(2)}`;
  await uat.refusal({ code: "BLOCK_CANT_PAY", reference: s.order, amount_paise: need });
  return `Baari rails guard: Reserve Pay can pay ${rs(h.can_pay)} today (${rs(h.left)} left in the block, ${rs(Math.max(0, h.cap_left))} under the cap); this prepaid order needs ${rs(need)}. Not booked. Read the balance before booking.`;
}

async function createShipment(req) {
  const ov = await takeOverride("/api/cmu/create.json");
  const f = await fault(ov);
  if (f) return f;

  const data = parseManifest(req);
  if (!data) return json(200, { success: false, rmk: "format key missing in POST", error: true });

  const wh = data.pickup_location && data.pickup_location.name;
  if (!wh || !WAREHOUSES.includes(wh)) {
    return json(200, {
      success: false,
      rmk: "ClientWarehouse matching query does not exist.",
      error: true,
      packages: [],
    });
  }

  const packages = [];
  let prepaid = 0;
  let cod = 0;
  let short;
  for (const s of data.shipments || []) {
    const pin = String(s.pin || "");
    const missing = ["name", "order", "phone", "add", "pin", "payment_mode"].filter((k) => !s[k]);
    const dup = ov === "duplicate_order" || (await store.get(`dl:order:${s.order}`));
    let pkg;
    if (missing.length) {
      pkg = { status: "Fail", remarks: [`Missing mandatory fields: ${missing.join(", ")}`], serviceable: true };
    } else if (NSZ.has(pin) || EMBARGO.has(pin)) {
      pkg = { status: "Fail", remarks: ["Non serviceable pincode"], serviceable: false };
    } else if (dup) {
      pkg = { status: "Fail", remarks: [`Duplicate order id ${s.order}`], serviceable: true };
    } else if ((short = await unpaid(s))) {
      pkg = { status: "Fail", remarks: [short], serviceable: true };
    } else {
      const waybill = s.waybill || newWaybill();
      pkg = { status: "Success", remarks: [], serviceable: true, waybill };
      await store.set(`dl:wb:${waybill}`, {
        waybill,
        order: s.order,
        name: s.name,
        pin,
        city: s.city || (PINS[pin] || {}).city || "Delhi",
        products_desc: s.products_desc || "",
        payment_mode: s.payment_mode,
        total_amount: s.total_amount || "",
        pickup_location: wh,
        created_ms: Date.now(),
        cancelled: false,
      });
      await store.set(`dl:order:${s.order}`, waybill);
    }
    if (pkg.status === "Success") s.payment_mode === "COD" ? cod++ : prepaid++;
    packages.push({
      status: pkg.status,
      client: "BAARI SURFACE",
      sort_code: (PINS[pin] || {}).sort_code || "DEL/GEN",
      remarks: pkg.remarks,
      waybill: pkg.waybill || "",
      cod_amount: Number(s.cod_amount || 0),
      payment: s.payment_mode === "COD" ? "COD" : "Pre-paid",
      serviceable: pkg.serviceable,
      refnum: s.order,
    });
  }
  const ok = packages.length > 0 && packages.every((p) => p.status === "Success");
  return json(200, {
    cash_pickups_count: 0,
    package_count: packages.length,
    upload_wbn: "UPL" + digits(17),
    replacement_count: 0,
    rmk: ok ? "" : "An internal Error has occurred, Please get in touch with client.support@delhivery.com",
    pickups_count: 0,
    packages,
    cash_pickups: 0,
    cod_count: cod,
    success: ok,
    prepaid_count: prepaid,
    cod_amount: 0,
  });
}

function scan(status, type, code, instructions, location, at) {
  return {
    ScanDetail: {
      Scan: status,
      ScanType: type,
      StatusCode: code,
      Instructions: instructions,
      ScannedLocation: location,
      ScanDateTime: istString(at),
      StatusDateTime: istString(at),
    },
  };
}

// Build the scan history a shipment would have by now, given its scenario.
function timeline(rec, scenario) {
  const t0 = new Date(rec.created_ms);
  const step = (DEMO_MINUTES * 60 * 1000) / 4;
  const at = (i) => new Date(t0.getTime() + step * i);
  const now = Date.now();
  const hub = `${rec.city}_Hub (${(PINS[rec.pin] || {}).state_code || "DL"})`;
  const origin = `${rec.pickup_location}_Origin`;

  const all = [
    scan("Manifested", "UD", "X-UCI", "Manifest uploaded", origin, at(0)),
    scan("Picked Up", "UD", "X-PPOM", "Shipment picked up", origin, at(1)),
    scan("In Transit", "UD", "X-DLL2F", "Bag received at facility", hub, at(2)),
    scan("Dispatched", "UD", "X-DDD3FD", "Out for delivery", hub, at(3)),
    scan("Delivered", "DL", "EOD-38", "Delivered to consignee", hub, at(4)),
  ];
  let scans = all.filter((s) => new Date(s.ScanDetail.ScanDateTime + "Z").getTime() - 5.5 * 3600 * 1000 <= now);

  if (rec.cancelled) {
    scans = scans.filter((s) => s.ScanDetail.Scan !== "Delivered");
    scans.push(scan("Cancelled", "UD", "X-UNCO", "Shipment cancelled by client", origin, new Date(rec.cancelled_ms)));
  } else if (scenario === "delayed") {
    scans = all.slice(0, 3);
    scans.push(
      scan("In Transit", "UD", "ST-108", "Shipment delayed: vehicle breakdown on linehaul", hub, new Date(Math.min(now, at(3).getTime()))),
    );
  } else if (scenario === "ndr") {
    scans = all.slice(0, 4);
    scans.push(scan("Pending", "UD", "EOD-11", "Consignee unavailable", hub, new Date(Math.min(now, at(4).getTime()))));
  } else if (scenario === "rto") {
    scans = all.slice(0, 4);
    scans.push(scan("In Transit", "RT", "RT-101", "Returned as per client instructions", hub, new Date(Math.min(now, at(4).getTime()))));
  }
  return scans;
}

async function track(req) {
  const ov = await takeOverride("/api/v1/packages/json/");
  const f = await fault(ov);
  if (f) return f;

  let wbs = String(req.query.waybill || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!wbs.length && req.query.ref_ids) {
    for (const o of String(req.query.ref_ids).split(",")) {
      const wb = await store.get(`dl:order:${o.trim()}`);
      if (wb) wbs.push(wb);
    }
  }
  const out = [];
  for (const wb of wbs.slice(0, 50)) {
    const rec = await store.get(`dl:wb:${wb}`);
    if (!rec) continue;
    const scans = timeline(rec, ov);
    const last = scans[scans.length - 1].ScanDetail;
    const edd = new Date(rec.created_ms + DEMO_MINUTES * 60 * 1000 * (ov === "delayed" ? 40 : 1));
    out.push({
      Shipment: {
        AWB: rec.waybill,
        ReferenceNo: rec.order,
        Origin: `${rec.pickup_location}_Origin`,
        Destination: rec.city,
        PickUpDate: istString(new Date(rec.created_ms)),
        OrderType: rec.payment_mode === "COD" ? "COD" : "Pre-paid",
        CODAmount: 0,
        InvoiceAmount: Number(rec.total_amount || 0),
        ExpectedDeliveryDate: istString(edd),
        PromisedDeliveryDate: istString(new Date(rec.created_ms + DEMO_MINUTES * 60 * 1000)),
        Consignee: { Name: rec.name, City: rec.city, PinCode: Number(rec.pin), Country: "India" },
        Status: {
          Status: last.Scan,
          StatusType: last.ScanType,
          StatusCode: last.StatusCode,
          StatusDateTime: last.StatusDateTime,
          StatusLocation: last.ScannedLocation,
          Instructions: last.Instructions,
        },
        Scans: scans,
      },
    });
  }
  if (!out.length) return json(200, { Error: "No such waybill or Order Id found", Success: false });
  return json(200, { ShipmentData: out });
}

async function shippingCost(req) {
  const f = await fault(await takeOverride("/api/kinko/v1/invoice/charges/.json"));
  if (f) return f;
  const q = req.query;
  const missing = ["md", "cgm", "o_pin", "d_pin", "ss", "pt"].filter((k) => q[k] === undefined || q[k] === "");
  if (missing.length) return json(400, { error: `Missing required params: ${missing.join(", ")}` });
  const cgm = Number(q.cgm);
  const slabs = Math.max(1, Math.ceil(cgm / 500));
  const base = (q.md === "E" ? 48 : 35) * slabs;
  const fsc = Math.round(base * 0.12 * 100) / 100;
  const cod = q.pt === "COD" ? 30 : 0;
  const gross = base + fsc + cod;
  const gst = Math.round(gross * 0.09 * 100) / 100;
  return json(200, [
    {
      charge_ROV: 0,
      charge_REATTEMPT: 0,
      charge_RTO: 0,
      charge_MPS: 0,
      charge_pickup: 0,
      charge_CWH: 0,
      tax_data: { swacch_bharat_tax: 0, IGST: 0, SGST: gst, krishi_kalyan_cess: 0, CGST: gst },
      zone: String(q.o_pin).slice(0, 3) === String(q.d_pin).slice(0, 3) ? "A" : "B",
      wt_rule_id: null,
      charge_AIR: 0,
      charge_FSC: fsc,
      charge_LABEL: 0,
      charge_COD: cod,
      status: q.ss,
      charge_POD: 0,
      adhoc_data: {},
      charge_CCOD: 0,
      gross_amount: gross,
      charge_DTO: 0,
      charge_DL: base,
      charge_DPH: 0,
      charge_FOD: 0,
      charge_DOCUMENT: 0,
      charge_WOD: 0,
      charge_INS: 0,
      charge_FS: 0,
      charge_CNC: 0,
      charge_FOV: 0,
      total_amount: Math.round((gross + gst * 2) * 100) / 100,
      charged_weight: cgm,
    },
  ]);
}

async function pickup(req) {
  const ov = await takeOverride("/fm/request/new/");
  const f = await fault(ov);
  if (f) return f;
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const missing = ["pickup_time", "pickup_date", "pickup_location", "expected_package_count"].filter((k) => !b[k]);
  if (missing.length) return json(400, { error: `Missing mandatory fields: ${missing.join(", ")}`, success: false });
  if (!WAREHOUSES.includes(b.pickup_location)) {
    return json(400, { error: "ClientWarehouse matching query does not exist.", success: false });
  }
  if (b.pickup_date < istDate()) {
    return json(400, { error: "Pickup date cannot be in past", success: false });
  }
  const open = await store.get(`dl:pr:${b.pickup_location}:${b.pickup_date}`);
  if (open || ov === "pr_exist") {
    return json(400, {
      pr_exist: true,
      error: `A pickup request already exists for ${b.pickup_location} on ${b.pickup_date}. A new request can be raised once it is closed.`,
      data: open || {},
    });
  }
  const res = {
    incoming_center_name: "Delhi_Bamnoli_PC (Delhi)",
    pickup_location_name: b.pickup_location,
    pickup_time: b.pickup_time,
    pickup_id: Number(digits(8)),
    pickup_date: b.pickup_date,
    expected_package_count: Number(b.expected_package_count),
  };
  await store.set(`dl:pr:${b.pickup_location}:${b.pickup_date}`, res, 86400);
  return json(200, res);
}

async function editShipment(req) {
  const f = await fault(await takeOverride("/api/p/edit"));
  if (f) return f;
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const rec = await store.get(`dl:wb:${b.waybill}`);
  if (!rec) return json(200, { status: false, waybill: b.waybill, error: "Waybill not found" });
  if (String(b.cancellation) === "true") {
    const delivered = Date.now() - rec.created_ms >= DEMO_MINUTES * 60 * 1000;
    if (delivered) {
      return json(200, { status: false, waybill: b.waybill, remark: "Shipment already Delivered, cannot be cancelled" });
    }
    rec.cancelled = true;
    rec.cancelled_ms = Date.now();
    await store.set(`dl:wb:${b.waybill}`, rec);
    // A cancelled Baari staples order: the staples hub (Baari's merchant, not
    // Delhivery) refunds its BAARI-<date>-staples debit to Reserve Pay.
    const refRef = /^BAARI-.+-1$/i.test(String(rec.order || "")) ? String(rec.order).replace(/-1$/, "-staples") : null;
    const back = refRef ? await require("./pinelabs").refundByReference(refRef) : 0;
    return json(200, {
      status: true,
      waybill: b.waybill,
      remark: "Shipment has been cancelled.",
      ...(back ? { baari_refund: { reference: refRef, amount_paise: back, note: `Baari staples hub refunded Rs ${(back / 100).toFixed(2)} to the household's Reserve Pay block.` } } : {}),
    });
  }
  for (const k of ["name", "add", "phone", "products_desc", "weight"]) if (b[k]) rec[k] = b[k];
  await store.set(`dl:wb:${b.waybill}`, rec);
  return json(200, { status: true, waybill: b.waybill, remark: "Shipment details updated." });
}

async function ndr(req) {
  const f = await fault(await takeOverride("/api/p/update"));
  if (f) return f;
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const id = "UPL" + digits(17);
  const results = [];
  for (const d of b.data || []) {
    const ok = ["RE-ATTEMPT", "PICKUP_RESCHEDULE"].includes(d.act) && (await store.get(`dl:wb:${d.waybill}`));
    results.push({
      waybill: d.waybill,
      status: ok ? "Success" : "Failure",
      remark: ok ? `${d.act} applied` : "Invalid waybill or action not allowed for current NSL",
    });
  }
  await store.set(`dl:upl:${id}`, results, 86400);
  return json(200, { request_id: id });
}

async function ndrStatus(req, id) {
  const results = await store.get(`dl:upl:${id}`);
  if (!results) return json(404, { status: "Failure", error: "Invalid UPL id" });
  return json(200, { status: "Success", request_id: id, results });
}

// ---- Capability C10: kirana-to-flat hop inside a window (not a Delhivery API today)

async function hyperlocalCreate(req) {
  const ov = await takeOverride("/api/hyperlocal/v1/orders");
  const f = await fault(ov);
  if (f) return f;
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const missing = ["pickup", "drop", "items_desc", "item_value", "deliver_by"].filter((k) => !b[k]);
  if (missing.length) return json(400, { success: false, error: `Missing mandatory fields: ${missing.join(", ")}` });

  // Baari rails guard: a rider can only collect what the pickup shop sells.
  // Sharma Kirana has no dry staples, so a rajma hop from there can't work,
  // and neither can Sunita's 7:40 pickup there.
  const hh = require("./household");
  const shop = String((b.pickup && b.pickup.name) || "");
  const gaps = new RegExp(hh.KIRANA, "i").test(shop) ? hh.notAtKirana(b.items_desc) : [];
  if (gaps.length) {
    return json(200, {
      success: false,
      order_id: "HL" + digits(10),
      client_order_id: b.client_order_id || "",
      status: "ITEM_NOT_AT_PICKUP",
      message: `${shop} doesn't stock ${gaps.join(", ")}, so no rider can collect it there, and Sunita's kirana pickup can't get it either. Baari rails guard: switch to the runner-up dish (C4) and cancel the parcel if it isn't delivered.`,
      not_stocked: gaps,
    });
  }

  const now = Date.now();
  const deadline = new Date(b.deliver_by).getTime();
  const fee = 35;
  const base = {
    order_id: "HL" + digits(10),
    client_order_id: b.client_order_id || "",
    quote: { fee, currency: "INR", fee_exceeds_item_value: fee > Number(b.item_value) },
    requested_window_end: b.deliver_by,
  };
  if (ov === "no_rider") {
    return json(200, {
      success: false,
      ...base,
      status: "NO_RIDER_AVAILABLE",
      message: "No rider available near pickup. Next check possible in 10 minutes.",
      retry_after_seconds: 600,
    });
  }
  if (!isNaN(deadline) && deadline - now < 12 * 60 * 1000) {
    return json(200, {
      success: false,
      ...base,
      status: "SLOT_UNAVAILABLE",
      message: "Earliest possible drop is 12 minutes from now; requested window cannot be met.",
      earliest_drop_at: istString(new Date(now + 12 * 60 * 1000)),
    });
  }
  const rec = {
    ...base,
    success: true,
    status: "RIDER_ASSIGNED",
    rider: { name: "Ravi K.", phone_masked: "98XXXXXX21", vehicle: "bike" },
    pickup_eta_minutes: 6,
    drop_eta: istString(new Date(now + 14 * 60 * 1000)),
    created_ms: now,
    cancel_after_assign: ov === "rider_cancelled",
  };
  await store.set(`dl:hl:${rec.order_id}`, rec, 86400);
  const { created_ms, cancel_after_assign, ...pub } = rec;
  return json(200, pub);
}

async function hyperlocalGet(req, id) {
  const f = await fault(await takeOverride("/api/hyperlocal/v1/orders/{id}"));
  if (f) return f;
  const rec = await store.get(`dl:hl:${id}`);
  if (!rec) return json(404, { success: false, error: "Order not found" });
  const mins = (Date.now() - rec.created_ms) / 60000;
  let status = "RIDER_ASSIGNED";
  if (rec.cancel_after_assign && mins >= 1) status = "CANCELLED_BY_RIDER";
  else if (mins >= 14) status = "DELIVERED";
  else if (mins >= 6) status = "PICKED_UP";
  const { created_ms, cancel_after_assign, ...pub } = rec;
  return json(200, { ...pub, status, updated_at: istString() });
}

// ---- Router

function pick(method, path) {
  if (method === "GET" && path === "/c/api/pin-codes/json/") return pincodes;
  if (method === "GET" && path === "/waybill/api/bulk/json/") return waybillBulk;
  if (method === "GET" && path === "/waybill/api/fetch/json/") return waybillSingle;
  if (method === "POST" && path === "/api/cmu/create.json") return createShipment;
  if (method === "GET" && path === "/api/v1/packages/json/") return track;
  if (method === "GET" && path === "/api/kinko/v1/invoice/charges/.json") return shippingCost;
  if (method === "POST" && path === "/fm/request/new/") return pickup;
  if (method === "POST" && path === "/api/p/edit") return editShipment;
  if (method === "POST" && path === "/api/p/update") return ndr;
  let m = path.match(/^\/api\/cmu\/get_bulk_upl\/([^/]+)$/);
  if (method === "GET" && m) return (req) => ndrStatus(req, m[1]);
  if (method === "POST" && path === "/api/hyperlocal/v1/orders") return hyperlocalCreate;
  m = path.match(/^\/api\/hyperlocal\/v1\/orders\/([^/]+)$/);
  if (method === "GET" && m) return (req) => hyperlocalGet(req, m[1]);
  return null;
}

async function route(req) {
  const handler = pick(req.method, req.path);
  if (!handler) return null;
  if (!authed(req)) return unauth();
  return handler(req);
}

module.exports = { route, unpaid };
