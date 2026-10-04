// Baari household sheet. Paste into Extensions > Apps Script of the Google
// Sheet, set SECRET, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Put the /exec URL in
// SHEETS_URL and the same secret in SHEETS_SECRET on Vercel.

const SECRET = "change-me";

// Run once from the editor (select setup, press Run). Builds every tab with
// the Sharma household as it stands after day 0 setup.
function setup() {
  const ss = SpreadsheetApp.getActive();
  const tabs = {
    Members: [
      ["name", "role", "telegram_chat_id", "language", "is_duty_holder", "is_admin", "notes"],
      ["Vinay", "son", "", "hi-en", "yes", "yes", "Duty-holder this week. Approves spends over cap."],
      ["Papa", "father", "", "hi-IN", "no", "no", "Played by Chaitanya. Health rule R1 applies."],
      ["Sunita", "cook", "", "hi-IN", "no", "no", "Played by Keshav. Arrives 8:00am. Gets voice notes only."],
    ],
    Rules: [
      ["rule_id", "type", "applies_to", "rule", "say_it_as"],
      ["R1", "health", "Papa", "No potato, no added sugar in his plate", "Papa ki thali mein aloo aur meetha nahi"],
      ["R2", "religion", "family", "No non-veg or egg on Tuesday", "Mangalvaar ko non-veg nahi"],
      ["R3", "budget", "family", "Daily food cap Rs 400 from the Reserve Pay block", ""],
      ["R4", "budget", "family", "Any single spend over Rs 300 needs the duty-holder's yes", ""],
      ["R5", "shops", "family", "Pay only shops on the Shops tab", ""],
    ],
    Dishes: [
      ["dish", "hindi_name", "cook_minutes", "ingredients_for_4", "has_potato", "is_nonveg", "last_cooked", "last_lost_by"],
      ["Rajma chawal", "राजमा चावल", 50, "rajma:250g, rice:400g, tomato:300g, onion:200g, ginger-garlic:30g", "no", "no", "2026-09-27", ""],
      ["Aloo puri", "आलू पूरी", 40, "potato:600g, atta:500g, oil:200ml", "yes", "no", "2026-09-21", ""],
      ["Lauki chana dal", "लौकी चना दाल", 35, "lauki:1kg, chana dal:200g, tomato:200g", "no", "no", "2026-09-30", "Vinay"],
      ["Palak paneer roti", "पालक पनीर रोटी", 40, "palak:500g, paneer:250g, atta:400g, onion:100g", "no", "no", "2026-09-25", "Papa"],
      ["Egg bhurji paratha", "अंडा भुर्जी पराठा", 30, "egg:8, atta:400g, onion:150g, tomato:150g", "no", "yes", "2026-09-29", ""],
      ["Kadhi chawal", "कढ़ी चावल", 45, "curd:500g, besan:100g, rice:400g", "no", "no", "2026-09-23", ""],
    ],
    Pantry: [
      ["item", "qty", "unit", "confidence", "updated_at"],
      ["rice", 2000, "g", "high", "2026-10-02"],
      ["atta", 3000, "g", "high", "2026-10-02"],
      ["rajma", 0, "g", "high", "2026-10-02"],
      ["chana dal", 300, "g", "medium", "2026-10-02"],
      ["tomato", 100, "g", "low", "2026-10-02"],
      ["onion", 500, "g", "medium", "2026-10-02"],
      ["ginger-garlic", 50, "g", "medium", "2026-10-02"],
      ["potato", 1000, "g", "high", "2026-10-02"],
      ["paneer", 0, "g", "high", "2026-10-02"],
      ["palak", 0, "g", "high", "2026-10-02"],
      ["lauki", 0, "g", "high", "2026-10-02"],
      ["curd", 200, "g", "low", "2026-10-02"],
      ["besan", 400, "g", "high", "2026-10-02"],
      ["oil", 1000, "ml", "high", "2026-10-02"],
      ["egg", 0, "pcs", "high", "2026-10-02"],
    ],
    Shops: [
      ["shop", "kind", "upi_id", "delhivery_warehouse", "on_cook_route", "detour_minutes", "address", "pin"],
      ["Sharma Kirana", "kirana", "sharmakirana@okaxis", "sharma_kirana", "yes", 2, "Sector 7 market, Rohini", "110085"],
      ["Baari staples hub", "delivery", "", "baari_staples_hub", "no", "", "Bamnoli, Delhi", "110077"],
    ],
    Config: [
      ["key", "value"],
      ["household", "Sharma family, Flat 402"],
      ["address", "Flat 402, Tower B, Sector 9, Rohini, Delhi"],
      ["pin", "110042"],
      ["phone", "9999999999"],
      ["headcount_default", 3],
      ["cook_arrives", "08:00"],
      ["daily_cap_rupees", 400],
      ["pinelabs_customer_id", "cust-v1-sharma402"],
      ["pinelabs_subscription_id", ""],
    ],
    Days: [
      ["date", "phase", "shortlist", "votes", "winner", "runner_up", "headcount", "cart", "payment", "shipment", "brief", "cook_reply", "outcome", "notes"],
    ],
  };
  Object.keys(tabs).forEach(function (name) {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    s.clear();
    const v = tabs[name];
    s.getRange(1, 1, v.length, v[0].length).setValues(v);
    s.getRange(1, 1, 1, v[0].length).setFontWeight("bold");
    s.setFrozenRows(1);
  });
  const first = ss.getSheetByName("Sheet1");
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function doPost(e) {
  const req = JSON.parse(e.postData.contents);
  if (req.secret !== SECRET) return out({ ok: false, error: "bad secret" });
  try {
    return out(handle(req));
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(tab) {
  const s = SpreadsheetApp.getActive().getSheetByName(tab);
  if (!s) throw new Error("No tab named " + tab);
  return s;
}

function rows(tab) {
  const v = sheet(tab).getDataRange().getValues();
  const head = v[0].map(String);
  return { head: head, data: v.slice(1).map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = r[j] instanceof Date ? Utilities.formatDate(r[j], "Asia/Kolkata", "yyyy-MM-dd HH:mm") : r[j]; });
    return o;
  }) };
}

function matches(row, match) {
  return Object.keys(match || {}).every(function (k) { return String(row[k]) === String(match[k]); });
}

function handle(req) {
  if (req.action === "tabs") {
    return { ok: true, tabs: SpreadsheetApp.getActive().getSheets().map(function (s) { return s.getName(); }) };
  }
  if (req.action === "read") {
    const r = rows(req.tab);
    return { ok: true, tab: req.tab, columns: r.head, rows: r.data.filter(function (x) { return matches(x, req.match); }) };
  }
  if (req.action === "append") {
    const r = rows(req.tab);
    sheet(req.tab).appendRow(r.head.map(function (h) { return req.row[h] !== undefined ? req.row[h] : ""; }));
    return { ok: true, appended: req.row };
  }
  if (req.action === "update") {
    const r = rows(req.tab);
    const s = sheet(req.tab);
    let n = 0;
    r.data.forEach(function (row) {
      if (!matches(row, req.match)) return;
      Object.keys(req.set).forEach(function (k) {
        const col = r.head.indexOf(k);
        if (col >= 0) s.getRange(row._row, col + 1).setValue(req.set[k]);
      });
      n++;
    });
    return { ok: true, updated_rows: n };
  }
  throw new Error("Unknown action " + req.action);
}
