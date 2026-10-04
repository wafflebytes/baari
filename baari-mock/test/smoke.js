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
})();
