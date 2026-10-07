// Telegram and Pine Labs through the native ElevenLabs connector.
//
// The AgenticOrg validator rejects every custom MCP tool on our tenant except
// Delhivery's names (agenticorg-cli/V1_RESULT.md). The native connector
// `elevenlabs_gnanibaari` is attached to Baari, passes the validator and
// already points its Base URL here for Gnani speech. Its spare tools carry the
// other two rails:
//
//   get_voice(voice_id)            GET /v1/voices/<command>   reads
//     tg.updates.<after_update_id>   Telegram updates after an id (0 = all)
//     tg.contacts                    people who started the bot
//     pl.balance.<subscription_id>   Reserve Pay balance (fetch SBMD)
//     pl.debit.<presentation_id>     a debit's status (get presentation)
//     hh.kitchen                     live pantry, last cooked, last lost by
//
//   create_voice_clone(name, labels, description)   POST /v1/voices/add   writes
//     name tg.send   labels {to, text, buttons?}   buttons "Label=data|Label=data"
//     name tg.voice  labels {to, audio_url, caption?}
//       to is a role (Vinay, Mummy, Papa, Sunita) resolved through the cast;
//       chat_id works instead of to.
//     subscription_id may be left out or "household" for the Sharma mandate.
//     name pl.debit  labels {subscription_id, amount_paise, reference}
//     name pl.payee  labels {subscription_id, amount_paise, reference, vpa, payee_name?, note?}
//
// Every write calls the real Telegram Bot API or the Pine Labs mock at its
// documented path, so the call log and the faults are the same as over MCP.
// `description` may carry the message text when it is long or multi-line.

const crypto = require("crypto");
const store = require("./store");
const telegram = require("./telegram");
const { istString } = require("./util");
const ops = require("./ops");
const household = require("./household");

const sub = (id) => (!id || id === "household" ? ops.SUB_ID : id);

const json = (status, body) => ({ status, body });

async function log(tool, args, result, ms) {
  await ops.log({
    at_ist: istString(),
    kind: "tool",
    connector: "bridge (via elevenlabs adapter)",
    tool,
    args: JSON.stringify(args).slice(0, 800),
    result: JSON.stringify(result).slice(0, 1200),
    ms,
  });
}

// Telegram updates as the model sees them: only the fields it uses.
function trimUpdate(u) {
  const out = { update_id: u.update_id, kind: u.kind, chat_id: u.chat_id, from_name: u.from_name, date_ist: u.date_ist };
  if (u.role) out.role = u.role;
  if (u.text) out.text = u.text;
  if (u.button_data) out.button_data = u.button_data;
  // file_base64 is the URL itself, base64'd: copy it into speech_to_text as is.
  if (u.voice) out.voice = { audio_url: u.voice.audio_url, file_base64: Buffer.from(String(u.voice.audio_url)).toString("base64") };
  if (u.reply_to_message_id) out.reply_to_message_id = u.reply_to_message_id;
  return out;
}

// "Rajma chawal=rajma|Lauki chana dal=lauki" or a JSON array of rows.
function parseButtons(b) {
  if (!b) return undefined;
  if (Array.isArray(b)) return b;
  const s = String(b).trim();
  if (s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {}
  }
  return [s.split("|").filter(Boolean).map((p) => {
    const [text, data] = p.split("=");
    return { text: text.trim(), data: (data || text).trim() };
  })];
}

function parseLabels(v) {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

function makeBridge({ rest }) {
  // Pine Labs mock over its REST paths, with a token like a real client.
  let token = null;
  async function pl(method, path, body) {
    if (!token) {
      const t = await rest({ method: "POST", path: "/api/auth/v1/token", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_id: "baari-client", client_secret: "baari-secret", grant_type: "client_credentials" }), via: "bridge" });
      token = (typeof t.body === "string" ? JSON.parse(t.body) : t.body).access_token;
    }
    const r = await rest({
      method,
      path,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "request-id": crypto.randomUUID(), "request-timestamp": new Date().toISOString() },
      body: body ? JSON.stringify(body) : undefined,
      via: "bridge",
    });
    let response = r.body;
    if (typeof response === "string") {
      try {
        response = JSON.parse(response);
      } catch {}
    }
    return { endpoint: `${method} ${path}`, http_status: r.status, response };
  }

  async function read(cmd) {
    let m;
    if ((m = cmd.match(/^tg\.updates(?:\.(\d+))?$/))) {
      const r = await telegram.getUpdates({ after_update_id: m[1] && m[1] !== "0" ? Number(m[1]) : undefined });
      return { now_ist: r.now_ist, count: r.count, updates: r.updates.map(trimUpdate) };
    }
    if (cmd === "tg.contacts") return telegram.listContacts();
    if ((m = cmd.match(/^pl\.balance(?:\.(.+))?$/))) return pl("GET", `/ps/api/v1/public/subscriptions/sbmd/${sub(m[1])}`);
    if ((m = cmd.match(/^pl\.debit\.(.+)$/))) return pl("GET", `/ps/api/v1/public/presentations/${m[1]}`);
    // The live kitchen: pantry after what was bought and cooked, and when
    // each dish was last cooked and lost (lib/household.js).
    if (cmd === "hh.kitchen") {
      const { raw, ...view } = await household.kitchenView();
      return view;
    }
    return null;
  }

  async function write(action, a, description) {
    switch (action) {
      case "tg.send": {
        if (!(a.to || a.chat_id) || !(a.text || description)) return { ok: false, error: "tg.send needs labels.to (or chat_id) and labels.text (or description)" };
        const buttons = parseButtons(a.buttons);
        // A pick, wish or vote button must name one of the six household
        // dishes (lib/household.js). Anything else is refused before it
        // reaches a phone.
        const bad = [buttons || []].flat(3).map((x) => String((x && x.data) || "")).filter((d) => {
          const m = d.match(/^(vote|pick|wish):(.+)$/i);
          return m && !/^(kuch bhi|koi bhi|anything)$/i.test(m[2].trim()) && !household.dishName(m[2]);
        });
        if (bad.length) return { ok: false, error: `not a household dish: ${bad.join(", ")}. Only ${household.NAMES.join(", ")}` };
        return telegram.sendMessage({ to: a.to, chat_id: a.chat_id, text: a.text || description, buttons });
      }
      case "tg.voice": {
        // "last" (or nothing) = the most recent Gnani TTS clip: the platform's
        // TTS tool gives the model base64, not a URL.
        // "last", a URL, or the base64'd URL the platform's tts handed the model.
        let audio_url = !a.audio_url || a.audio_url === "last" ? await store.get("tts:last") : String(a.audio_url).trim();
        if (audio_url && !/^https?:\/\//.test(audio_url)) {
          const dec = Buffer.from(audio_url, "base64").toString("utf8").trim();
          audio_url = /^https?:\/\/\S+$/.test(dec) ? dec : await store.get("tts:last");
        }
        if (!(a.to || a.chat_id) || !audio_url) return { ok: false, error: "tg.voice needs labels.to (or chat_id), and a TTS clip first (audio_url last)" };
        return telegram.sendVoice({ to: a.to, chat_id: a.chat_id, audio_url, caption: a.caption }, a._loadAudio);
      }
      case "pl.debit":
      case "pl.payee": {
        // Household rule M5: a single debit over Rs 300 needs Vinay's "Haan"
        // button first. Checked here, on rails, so no prompt slip can skip it.
        const ok = await household.takeApproval(a.reference, a.amount_paise);
        if (!ok.ok) {
          return { endpoint: `POST ${action}`, http_status: 403, response: { code: "APPROVAL_REQUIRED", message: `Rs ${(Number(a.amount_paise) / 100).toFixed(2)} is over Rs 300. Ask Vinay with buttons "Haan=approve:${a.reference || "<reference>"}|Nahi=deny:${a.reference || "<reference>"}" and debit after he taps Haan. Baari rails household rule, not a Pine Labs error.` } };
        }
        const amount = { value: Number(a.amount_paise), currency: "INR" };
        if (action === "pl.debit") {
          return pl("POST", "/ps/api/v1/public/presentations", { subscription_id: sub(a.subscription_id), amount, merchant_presentation_reference: a.reference });
        }
        return pl("POST", `/ps/api/v1/public/subscriptions/${sub(a.subscription_id)}/presentations/payee`, {
          subscription_id: sub(a.subscription_id),
          amount,
          merchant_presentation_reference: a.reference,
          payee: { vpa: a.vpa, name: a.payee_name || "" },
          note: a.note || description || "",
        });
      }
      default:
        return null;
    }
  }

  return { read, write };
}

// ElevenLabs paths the spare tools hit. Returns null when the path is not one
// of ours, so the Gnani voice handlers keep working.
async function route(req, { rest, loadAudio, form }) {
  const b = makeBridge({ rest });
  let m;
  if (req.method === "GET" && (m = req.path.match(/^\/v1\/voices\/((?:tg|pl|hh)\.[^/]+)$/))) {
    const cmd = decodeURIComponent(m[1]);
    const t0 = Date.now();
    const result = await b.read(cmd);
    if (!result) {
      // 200 with the error in labels: a 404 makes the connector raise, and
      // the model never sees why.
      return json(200, { voice_id: cmd, name: cmd, category: "baari_rail", labels: { error: `unknown command ${cmd}` } });
    }
    await log("get_voice", { voice_id: cmd }, result, Date.now() - t0);
    // The connector passes back only voice_id, name, category, labels,
    // settings and samples (W2's platform test, 17:35), so the result rides
    // in labels: key fields flat as strings, the whole result as JSON.
    return json(200, { voice_id: cmd, name: cmd, category: "baari_rail", labels: { ...flat(cmd, result), baari: JSON.stringify(result) }, baari_result: result });
  }
  if (req.method === "POST" && req.path === "/v1/voices/add") {
    let body = {};
    if (/multipart/i.test(req.headers["content-type"] || "")) body = form();
    else {
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      } catch {}
    }
    const action = String(body.name || "").trim();
    const labels = parseLabels(body.labels);
    const t0 = Date.now();
    const result = await b.write(action, { ...labels, _loadAudio: loadAudio }, body.description);
    if (!result) return null; // a real voice clone request; not supported, falls through
    await log("create_voice_clone", { name: action, labels, description: body.description }, result, Date.now() - t0);
    // voice_id is all the model gets back, so it carries the outcome.
    return json(200, { voice_id: outcome(result), requires_verification: false, baari_result: result });
  }
  return null;
}

// tg.*: "msg:<message_id>" or "fail:<reason>". pl.*: "<presentation_id>:<status>"
// or "fail:<code>". A failure is still HTTP 200, so the connector doesn't raise
// and the model reads the reason.
function outcome(r) {
  const short = (s) => String(s || "error").replace(/[^A-Za-z0-9_ .:-]/g, "").trim().slice(0, 80);
  if (r.endpoint) {
    const resp = r.response;
    if (typeof resp === "string") return `fail:MALFORMED_BODY_HTTP_${r.http_status}`;
    if (r.http_status >= 400 || !resp || !resp.presentation_id) return `fail:${short((resp && resp.code) || `HTTP_${r.http_status}`)}`;
    return `${resp.presentation_id}:${resp.status}`;
  }
  if (r.ok) return `msg:${r.message_id}`;
  return `fail:${short(r.error)}`;
}

// Key fields of a read, as strings, for labels.
function flat(cmd, r) {
  const s = (v) => (v === undefined || v === null ? "" : String(v));
  if (cmd.startsWith("pl.")) {
    const p = typeof r.response === "object" && r.response ? r.response : {};
    const out = { http_status: s(r.http_status) };
    if (typeof r.response === "string") out.error = "MALFORMED_BODY";
    else if (p.code) out.error = s(p.code);
    for (const k of ["status", "remaining_balance", "debited_today", "max_daily_debit", "presentation_id", "failure_reason", "utr"]) if (p[k] !== undefined) out[k] = s(p[k]);
    if (p.amount) out.amount_paise = s(p.amount.value);
    return out;
  }
  if (cmd.startsWith("tg.updates")) {
    const ups = r.updates || [];
    return { count: s(ups.length), last_update_id: s(ups.length ? ups[ups.length - 1].update_id : "") };
  }
  if (cmd === "tg.contacts") return { roles: (r.roles || []).map((x) => `${x.role}:${x.bound ? "bound" : "unbound"}`).join(",") };
  if (cmd === "hh.kitchen") return { as_of: s(r.as_of), pantry: s(r.pantry), dishes: s(r.dishes), not_cooked_yet: s(r.not_cooked_yet) };
  return {};
}

module.exports = { route, parseButtons, trimUpdate, outcome };
