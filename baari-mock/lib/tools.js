// Tool catalogs, one per AgenticOrg connector. AgenticOrg discovers these over
// MCP. Mock tools call the REST mock through `rest`, so every tool call hits
// the same Delhivery/Pine Labs paths and faults a direct API client would.

const crypto = require("crypto");
const telegram = require("./telegram");
const gnani = require("./gnani");
const sheets = require("./sheets");

const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const str = (description, extra = {}) => ({ type: "string", description, ...extra });
const int = (description) => ({ type: "integer", description });

// Turn a REST response into what the agent sees: status, endpoint and the
// body as returned, unparsed if it was not valid JSON.
function view(endpoint, r, ms) {
  if (!r) r = { status: 404, body: { detail: "Not found." } };
  let response = r.body;
  if (typeof response === "string") {
    try {
      response = JSON.parse(response);
    } catch {
      /* keep raw text: the agent has to notice it is broken */
    }
  }
  return { endpoint, http_status: r.status, latency_ms: ms, response };
}

function catalogs({ rest, base, loadAudio }) {
  const dlAuth = { authorization: `Token ${process.env.DELHIVERY_TOKEN || "baari-demo-token"}` };

  async function dl(method, path, { query, body, form } = {}) {
    const t0 = Date.now();
    const headers = { ...dlAuth, "content-type": form ? "application/x-www-form-urlencoded" : "application/json" };
    const r = await rest({ method, path, query: query || {}, headers, body: form || (body ? JSON.stringify(body) : undefined), via: "mcp" });
    const qs = query && Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";
    return view(`${method} ${path}${qs}`, r, Date.now() - t0);
  }

  let pineToken = null;
  async function pl(method, path, body) {
    if (!pineToken) {
      const t = await rest({
        method: "POST",
        path: "/api/auth/v1/token",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: process.env.PINE_CLIENT_ID || "baari-client", client_secret: process.env.PINE_CLIENT_SECRET || "baari-secret", grant_type: "client_credentials" }),
        via: "mcp",
      });
      const parsed = typeof t.body === "string" ? JSON.parse(t.body) : t.body;
      pineToken = parsed.access_token;
    }
    const t0 = Date.now();
    const r = await rest({
      method,
      path,
      query: {},
      headers: {
        authorization: `Bearer ${pineToken}`,
        "content-type": "application/json",
        "request-id": crypto.randomUUID(),
        "request-timestamp": new Date().toISOString(),
      },
      body: body ? JSON.stringify(body) : undefined,
      via: "mcp",
    });
    return view(`${method} ${path}`, r, Date.now() - t0);
  }

  const shipment = obj(
    {
      name: str("Consignee name"),
      order: str("Unique order id"),
      phone: str("Consignee phone"),
      add: str("Consignee address"),
      pin: str("Consignee pincode"),
      city: str("City"),
      state: str("State"),
      country: str("Country"),
      payment_mode: str("Prepaid, COD, Pickup or REPL"),
      products_desc: str("What is in the package"),
      total_amount: str("Order value in rupees"),
      quantity: str("Quantity"),
      weight: str("Weight in grams"),
      shipping_mode: str("Surface or Express"),
      transport_speed: str("F for next day, D for standard"),
      waybill: str("Optional pre-fetched waybill"),
    },
    ["name", "order", "phone", "add", "pin", "payment_mode"],
  );

  const delhivery = [
    {
      name: "pincode_serviceability",
      description: "Delhivery B2C Pincode Serviceability. GET /c/api/pin-codes/json/?filter_codes=<pin>. An empty delivery_codes list means the pincode is not serviceable; remarks 'Embargo' means temporarily not serviceable.",
      inputSchema: obj({ filter_codes: str("One 6-digit pincode") }, ["filter_codes"]),
      run: (a) => dl("GET", "/c/api/pin-codes/json/", { query: { filter_codes: a.filter_codes } }),
    },
    {
      name: "fetch_waybill",
      description: "Delhivery Fetch WayBill (bulk). GET /waybill/api/bulk/json/?count=<n>. Returns comma-separated waybill numbers.",
      inputSchema: obj({ count: int("How many waybills, max 10000") }, ["count"]),
      run: (a) => dl("GET", "/waybill/api/bulk/json/", { query: { count: String(a.count) } }),
    },
    {
      name: "create_shipment",
      description: "Delhivery Shipment Creation (manifest). POST /api/cmu/create.json with format=json&data={shipments:[...], pickup_location:{name}}. pickup_location.name must exactly match a registered warehouse. Check packages[].status and remarks for each shipment.",
      inputSchema: obj(
        {
          shipments: { type: "array", items: shipment, description: "One entry per package" },
          pickup_location: obj({ name: str("Registered warehouse name, case and space sensitive") }, ["name"]),
        },
        ["shipments", "pickup_location"],
      ),
      run: (a) =>
        dl("POST", "/api/cmu/create.json", {
          form: "format=json&data=" + encodeURIComponent(JSON.stringify({ shipments: a.shipments, pickup_location: a.pickup_location })),
        }),
    },
    {
      name: "track_shipment",
      description: "Delhivery Shipment Tracking. GET /api/v1/packages/json/?waybill=<wb>&ref_ids=<order>. Returns ShipmentData[].Shipment with Status (Status, StatusType UD/DL/RT, Instructions), ExpectedDeliveryDate and Scans.",
      inputSchema: obj({ waybill: str("Waybill number(s), comma separated, up to 50"), ref_ids: str("Order id(s), used when waybill is empty") }),
      run: (a) => dl("GET", "/api/v1/packages/json/", { query: { waybill: a.waybill || "", ref_ids: a.ref_ids || "" } }),
    },
    {
      name: "calculate_shipping_cost",
      description: "Delhivery Calculate Shipping Cost. GET /api/kinko/v1/invoice/charges/.json with md, cgm, o_pin, d_pin, ss, pt.",
      inputSchema: obj(
        {
          md: str("E for Express, S for Surface"),
          cgm: int("Chargeable weight in grams"),
          o_pin: str("Origin pincode"),
          d_pin: str("Destination pincode"),
          ss: str("Delivered, RTO or DTO"),
          pt: str("Pre-paid or COD"),
        },
        ["md", "cgm", "o_pin", "d_pin", "ss", "pt"],
      ),
      run: (a) => dl("GET", "/api/kinko/v1/invoice/charges/.json", { query: { md: a.md, cgm: String(a.cgm), o_pin: a.o_pin, d_pin: a.d_pin, ss: a.ss, pt: a.pt } }),
    },
    {
      name: "create_pickup_request",
      description: "Delhivery Pickup Request Creation. POST /fm/request/new/ with pickup_time (hh:mm:ss), pickup_date (YYYY-MM-DD), pickup_location, expected_package_count. Only one open request per warehouse per day (pr_exist).",
      inputSchema: obj(
        {
          pickup_time: str("hh:mm:ss"),
          pickup_date: str("YYYY-MM-DD"),
          pickup_location: str("Registered warehouse name"),
          expected_package_count: int("Number of packages"),
        },
        ["pickup_time", "pickup_date", "pickup_location", "expected_package_count"],
      ),
      run: (a) => dl("POST", "/fm/request/new/", { body: a }),
    },
    {
      name: "cancel_shipment",
      description: "Delhivery Shipment Cancellation. POST /api/p/edit with {waybill, cancellation: \"true\"}. Fails once the shipment is delivered.",
      inputSchema: obj({ waybill: str("Waybill to cancel") }, ["waybill"]),
      run: (a) => dl("POST", "/api/p/edit", { body: { waybill: a.waybill, cancellation: "true" } }),
    },
    {
      name: "ndr_action",
      description: "Delhivery NDR API. POST /api/p/update with {data:[{waybill, act}]}, act RE-ATTEMPT or PICKUP_RESCHEDULE. Returns request_id (UPL id) to check with ndr_status.",
      inputSchema: obj(
        { data: { type: "array", items: obj({ waybill: str("Waybill"), act: str("RE-ATTEMPT or PICKUP_RESCHEDULE") }, ["waybill", "act"]) } },
        ["data"],
      ),
      run: (a) => dl("POST", "/api/p/update", { body: { data: a.data } }),
    },
    {
      name: "ndr_status",
      description: "Delhivery GET NDR Status. GET /api/cmu/get_bulk_upl/<UPL id>?verbose=true.",
      inputSchema: obj({ upl_id: str("request_id from ndr_action") }, ["upl_id"]),
      run: (a) => dl("GET", `/api/cmu/get_bulk_upl/${a.upl_id}`, { query: { verbose: "true" } }),
    },
    {
      name: "hyperlocal_create_order",
      description: "CAPABILITY C10 (not a Delhivery API today). POST /api/hyperlocal/v1/orders. Books a rider to carry items from a kirana to the flat before deliver_by. Returns RIDER_ASSIGNED, NO_RIDER_AVAILABLE or SLOT_UNAVAILABLE, plus a fee quote and fee_exceeds_item_value.",
      inputSchema: obj(
        {
          client_order_id: str("Your reference"),
          pickup: obj({ name: str("Shop name"), address: str("Shop address"), pin: str("Pincode"), phone: str("Shop phone") }, ["name", "address"]),
          drop: obj({ name: str("Recipient"), address: str("Flat address"), pin: str("Pincode"), phone: str("Phone") }, ["name", "address"]),
          items_desc: str("Items, e.g. '500g tomato, 250g paneer'"),
          item_value: { type: "number", description: "Value of items in rupees" },
          deliver_by: str("ISO 8601 time the items must arrive by, with +05:30 offset"),
        },
        ["pickup", "drop", "items_desc", "item_value", "deliver_by"],
      ),
      run: (a) => dl("POST", "/api/hyperlocal/v1/orders", { body: a }),
    },
    {
      name: "hyperlocal_get_order",
      description: "CAPABILITY C10. GET /api/hyperlocal/v1/orders/<order_id>. Status RIDER_ASSIGNED, PICKED_UP, DELIVERED or CANCELLED_BY_RIDER.",
      inputSchema: obj({ order_id: str("order_id from hyperlocal_create_order") }, ["order_id"]),
      run: (a) => dl("GET", `/api/hyperlocal/v1/orders/${a.order_id}`),
    },
  ];

  const amount = obj({ value: int("Amount in paisa (Rs 1 = 100)"), currency: str("INR") }, ["value"]);

  const pinelabs = [
    {
      name: "create_sbmd_subscription",
      description: "Pine Labs UPI Reserve Pay: Create SBMD Subscription. POST /ps/api/v1/public/subscriptions/sbmd. Returns status CREATED and a redirect_url the admin must open to approve the block. Max Rs 10,000 and 90 days. Errors: ACTIVE_SBMD_EXISTS, RESERVE_AMOUNT_LIMIT_EXCEEDED, SBMD_NOT_SUPPORTED_BY_BANK.",
      inputSchema: obj(
        {
          merchant_subscription_reference: str("Unique reference"),
          customer_id: str("Pine Labs customer_id of the household admin"),
          plan_details: obj(
            { reserve_amount: int("Paisa"), currency: str("INR"), validity_days: int("Days, max 90"), description: str("What the block is for") },
            ["reserve_amount", "validity_days", "description"],
          ),
        },
        ["merchant_subscription_reference", "customer_id", "plan_details"],
      ),
      run: (a) => pl("POST", "/ps/api/v1/public/subscriptions/sbmd", a),
    },
    {
      name: "fetch_sbmd_subscription",
      description: "Pine Labs UPI Reserve Pay: Fetch SBMD Subscription. GET /ps/api/v1/public/subscriptions/sbmd/<subscription_id>. When ACTIVE returns total_blocked_amount, debited_amount and remaining_balance in paisa. Trust this over any ledger of your own.",
      inputSchema: obj({ subscription_id: str("Subscription id") }, ["subscription_id"]),
      run: (a) => pl("GET", `/ps/api/v1/public/subscriptions/sbmd/${a.subscription_id}`),
    },
    {
      name: "create_presentation",
      description: "Pine Labs UPI Reserve Pay: Create Presentation (debit the block). POST /ps/api/v1/public/presentations with subscription_id, amount {value paisa, currency}, merchant_presentation_reference. Starts PENDING; poll get_presentation until SUCCESS or FAILED. Error INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION when the block is too low. Reusing a merchant_presentation_reference returns the original debit instead of charging twice.",
      inputSchema: obj(
        { subscription_id: str("Subscription id"), amount, merchant_presentation_reference: str("Unique per debit; reuse it when retrying") },
        ["subscription_id", "amount", "merchant_presentation_reference"],
      ),
      run: (a) => pl("POST", "/ps/api/v1/public/presentations", a),
    },
    {
      name: "get_presentation",
      description: "Pine Labs UPI Reserve Pay: get a presentation (debit) by id. GET /ps/api/v1/public/presentations/<presentation_id>. Status PENDING, SUCCESS or FAILED (with failure_reason).",
      inputSchema: obj({ presentation_id: str("presentation_id") }, ["presentation_id"]),
      run: (a) => pl("GET", `/ps/api/v1/public/presentations/${a.presentation_id}`),
    },
    {
      name: "create_payee_presentation",
      description: "CAPABILITY C7 (not a Pine Labs API today). POST /ps/api/v1/public/subscriptions/<id>/presentations/payee. Debits the household block and settles straight to a named UPI ID (the kirana) that is on the mandate's approved payee list. Errors: PAYEE_NOT_ALLOWED, INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION. Settles async; poll get_presentation.",
      inputSchema: obj(
        {
          subscription_id: str("Subscription id"),
          amount,
          merchant_presentation_reference: str("Unique per debit"),
          payee: obj({ vpa: str("Payee UPI ID"), name: str("Payee name") }, ["vpa"]),
          note: str("Shown on the payee's UPI credit, e.g. 'Baari · Flat 402 · Sunita'"),
        },
        ["subscription_id", "amount", "merchant_presentation_reference", "payee"],
      ),
      run: (a) => pl("POST", `/ps/api/v1/public/subscriptions/${a.subscription_id}/presentations/payee`, a),
    },
  ];

  const gnaniTools = [
    {
      name: "speech_to_text",
      description: "Gnani Vachana STT (real). POST https://api.vachana.ai/stt/v3. Transcribes a voice note (OGG/WAV/MP3, up to 60s). Pass the audio_url from a Telegram voice update. language_code hi-IN handles Hindi and Hinglish; en-IN for English. bias_list boosts expected words like dish and ingredient names.",
      inputSchema: obj(
        { audio_url: str("audio_url of the voice note"), language_code: str("hi-IN (default), en-IN, mr-IN, ..."), bias_list: { type: "array", items: { type: "string" }, description: "Words to bias towards" } },
        ["audio_url"],
      ),
      run: (a) => gnani.speechToText(a, loadAudio),
    },
    {
      name: "text_to_speech",
      description: "Gnani Vachana TTS (real). POST https://api.vachana.ai/api/v1/tts/inference. Turns text into an OGG Opus voice note and returns its audio_url, which telegram_send_voice can send. Write Hindi in Devanagari for hi-IN. language: hi-IN (voice Chitra), en-IN (Kaveri), hi-en Hinglish (Poorvi).",
      inputSchema: obj({ text: str("What to say, under 60 seconds of speech"), language: str("hi-IN, en-IN or hi-en"), voice: str("Optional voice name") }, ["text"]),
      run: (a) => gnani.textToSpeech(a, base),
    },
  ];

  const telegramTools = [
    {
      name: "telegram_send_message",
      description: "Send a Telegram message from the Baari bot (real). Optional buttons: rows of {text, data}; a tap comes back as a 'button' update with button_data.",
      inputSchema: obj(
        {
          chat_id: str("Recipient chat_id"),
          text: str("Message text"),
          buttons: { type: "array", items: { type: "array", items: obj({ text: str("Label"), data: str("Value returned on tap, max 64 chars") }, ["text"]) }, description: "Rows of buttons" },
        },
        ["chat_id", "text"],
      ),
      run: (a) => telegram.sendMessage(a),
    },
    {
      name: "telegram_send_voice",
      description: "Send a voice note from the Baari bot (real). audio_url comes from Gnani text_to_speech.",
      inputSchema: obj({ chat_id: str("Recipient chat_id"), audio_url: str("audio_url from text_to_speech"), caption: str("Optional caption") }, ["chat_id", "audio_url"]),
      run: (a) => telegram.sendVoice(a, loadAudio),
    },
    {
      name: "telegram_get_updates",
      description: "Read messages people sent the Baari bot (text, voice notes, button taps), oldest first, with IST timestamps. Pass after_update_id to get only newer ones. Voice updates carry voice.audio_url for Gnani speech_to_text.",
      inputSchema: obj({ after_update_id: int("Only updates after this id"), chat_id: str("Only this chat"), limit: int("Max updates, default 50") }),
      run: (a) => telegram.getUpdates(a),
    },
    {
      name: "telegram_list_contacts",
      description: "People who have started the Baari bot, with their chat_id.",
      inputSchema: obj({}),
      run: () => telegram.listContacts(),
    },
  ];

  const sheetTools = [
    {
      name: "sheet_read",
      description: "Read rows from a tab of the household Google Sheet (real). Tabs: Members, Rules, Dishes, Pantry, Shops, Days. Optional match filters rows by exact column values.",
      inputSchema: obj({ tab: str("Tab name"), match: { type: "object", description: "Column -> value filter" } }, ["tab"]),
      run: (a) => sheets.read(a),
    },
    {
      name: "sheet_append",
      description: "Append one row to a tab. Keys are column headers.",
      inputSchema: obj({ tab: str("Tab name"), row: { type: "object", description: "Column -> value" } }, ["tab", "row"]),
      run: (a) => sheets.append(a),
    },
    {
      name: "sheet_update",
      description: "Update cells in rows whose columns equal match.",
      inputSchema: obj({ tab: str("Tab name"), match: { type: "object", description: "Column -> value to find rows" }, set: { type: "object", description: "Column -> new value" } }, ["tab", "match", "set"]),
      run: (a) => sheets.update(a),
    },
  ];

  return {
    delhivery: { title: "Delhivery (Baari mock)", tools: delhivery },
    pinelabs: { title: "Pine Labs Reserve Pay (Baari mock)", tools: pinelabs },
    gnani: { title: "Gnani Vachana speech", tools: gnaniTools },
    telegram: { title: "Telegram Baari bot", tools: telegramTools },
    sheets: { title: "Baari household sheet", tools: sheetTools },
  };
}


module.exports = { catalogs };
