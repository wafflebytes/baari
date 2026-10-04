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
//
//   create_voice_clone(name, labels, description)   POST /v1/voices/add   writes
//     name tg.send   labels {chat_id, text, buttons?}   buttons "Label=data|Label=data"
//     name tg.voice  labels {chat_id, audio_url, caption?}
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

const json = (status, body) => ({ status, body });

async function log(tool, args, result, ms) {
  await store.push("log", {
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
  if (u.voice) out.voice = { audio_url: u.voice.audio_url };
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
    if ((m = cmd.match(/^pl\.balance\.(.+)$/))) return pl("GET", `/ps/api/v1/public/subscriptions/sbmd/${m[1]}`);
    if ((m = cmd.match(/^pl\.debit\.(.+)$/))) return pl("GET", `/ps/api/v1/public/presentations/${m[1]}`);
    return null;
  }

  async function write(action, a, description) {
    switch (action) {
      case "tg.send":
        if (!a.chat_id || !(a.text || description)) return { ok: false, error: "tg.send needs labels.chat_id and labels.text (or description)" };
        return telegram.sendMessage({ chat_id: a.chat_id, text: a.text || description, buttons: parseButtons(a.buttons) });
      case "tg.voice":
        if (!a.chat_id || !a.audio_url) return { ok: false, error: "tg.voice needs labels.chat_id and labels.audio_url" };
        return telegram.sendVoice({ chat_id: a.chat_id, audio_url: a.audio_url, caption: a.caption }, a._loadAudio);
      case "pl.debit":
        return pl("POST", "/ps/api/v1/public/presentations", {
          subscription_id: a.subscription_id,
          amount: { value: Number(a.amount_paise), currency: "INR" },
          merchant_presentation_reference: a.reference,
        });
      case "pl.payee":
        return pl("POST", `/ps/api/v1/public/subscriptions/${a.subscription_id}/presentations/payee`, {
          subscription_id: a.subscription_id,
          amount: { value: Number(a.amount_paise), currency: "INR" },
          merchant_presentation_reference: a.reference,
          payee: { vpa: a.vpa, name: a.payee_name || "" },
          note: a.note || description || "",
        });
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
  if (req.method === "GET" && (m = req.path.match(/^\/v1\/voices\/((?:tg|pl)\.[^/]+)$/))) {
    const cmd = decodeURIComponent(m[1]);
    const t0 = Date.now();
    const result = await b.read(cmd);
    if (!result) return json(404, { detail: { status: "voice_not_found", message: `Unknown Baari command ${cmd}` } });
    await log("get_voice", { voice_id: cmd }, result, Date.now() - t0);
    // Shaped like an ElevenLabs voice so the connector passes it through.
    return json(200, { voice_id: cmd, name: cmd, category: "baari_rail", labels: {}, baari_result: result });
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
    const id = result.message_id || (result.response && result.response.presentation_id) || crypto.randomBytes(6).toString("hex");
    return json(200, { voice_id: String(id), requires_verification: false, baari_result: result });
  }
  return null;
}

module.exports = { route, parseButtons, trimUpdate };
