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
//     pl.order.<order_id>            a Pine Labs checkout link's order (real sandbox): status, paid
//     hh.kitchen                     live pantry, last cooked, last lost by
//     kr.order[.<order_id>]          a Sharma Kirana order: status, bill, paid (the last one if no id)
//
//   create_voice_clone(name, labels, description)   POST /v1/voices/add   writes
//     name tg.send   labels {to, text, buttons?}   buttons "Label=data|Label=data"
//     name tg.voice  labels {to, audio_url, caption?}
//       to is a role (Vinay, Mummy, Papa, Sunita) resolved through the cast;
//       chat_id works instead of to.
//     subscription_id may be left out or "household" for the Sharma mandate.
//     name pl.debit  labels {subscription_id, amount_paise, reference}
//     name pl.payee  labels {subscription_id, amount_paise, reference, vpa, payee_name?, note?}
//     name hh.away   labels {name, by, date_for?, back?, said?}   who isn't eating (S6);
//                    by is FROM. fail:NOT_ALLOWED if by may not mark name
//     name hh.guests labels {n, by, date_for?}   guests for that meal
//     name hh.task   labels {dish, who}   tonight's prep task to someone home (G9)
//     name pl.link   labels {to?, amount_paise, reference, text}   real Pine Labs sandbox checkout,
//                    sent to Vinay with a pay button (lib/pinelabs_uat.js)
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
const uat = require("./pinelabs_uat");

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

function makeBridge({ rest, base }) {
  // Reserve Pay: the household's real mandate on the Pine Labs sandbox when
  // it can run the call, else the demo block (lib/pinelabs.js) at the same
  // documented path. The log says which one ran (api "real" or "demo").
  async function pl(method, path, body) {
    const real = path.startsWith("/ps/") ? await uat.reservePay(method, path, body, ops.SUB_ID) : { fallback: "not a Reserve Pay path" };
    if (real.result) return real.result;
    return { ...(await plDemo(method, path, body)), api: "demo", fallback_reason: real.fallback };
  }

  // Pine Labs demo block over its REST paths, with a token like a real client.
  let token = null;
  async function plDemo(method, path, body) {
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

  // Sharma Kirana's order book (lib/kirana.js), same shape as pl().
  async function kr(method, path, body) {
    const r = await rest({ method, path, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, via: "bridge" });
    return { endpoint: `${method} ${path}`, http_status: r.status, response: typeof r.body === "string" ? JSON.parse(r.body || "{}") : r.body };
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
    // A Pine Labs checkout link's order, read from the real sandbox.
    if ((m = cmd.match(/^pl\.order\.(.+)$/))) {
      const s = await uat.settle(m[1]);
      return { ...s.order, paid: s.paid, reference: s.link && s.link.reference };
    }
    // The live kitchen: pantry after what was bought and cooked, and when
    // each dish was last cooked and lost (lib/household.js).
    if ((m = cmd.match(/^kr\.order(?:\.([A-Z0-9]+))?$/))) {
      const id = m[1] || (await store.get("kr:last"));
      if (!id) return { endpoint: "GET /kirana/v1/orders", http_status: 404, response: { success: false, error: "no kirana order yet" } };
      return kr("GET", `/kirana/v1/orders/${id}`);
    }
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
        // A Haan/Nahi spend ask for Vinay goes to the guest when Vinay has no
        // chat tonight (ops.approver).
        if (/^vinay$/i.test(String(a.to || "")) && [buttons || []].flat(3).some((x) => /^(approve|deny|haan|nahi)\b/i.test(String((x && x.data) || "")))) {
          const who = await ops.approver();
          if (who !== "Vinay") a = { ...a, to: who, text: `Vinay is offline tonight, so you say yes or no in his place.\n\n${a.text || description}` };
        }
        // A pick, wish or vote button must name one of the six household
        // dishes (lib/household.js). Anything else is refused before it
        // reaches a phone.
        const bad = [buttons || []].flat(3).map((x) => String((x && x.data) || "")).filter((d) => {
          const m = d.match(/^(vote|pick|wish):(.+)$/i);
          return m && !/^(kuch bhi|koi bhi|anything)$/i.test(m[2].trim()) && !household.dishName(m[2]);
        });
        if (bad.length) return { ok: false, error: `not a household dish: ${bad.join(", ")}. Only ${household.NAMES.join(", ")}` };
        // Nor a dish a household rule keeps off tomorrow's table (L3): potato
        // for Papa every day, egg on Tuesdays. Seen 8 Oct: Aloo puri offered.
        const tn = (await require("./turn").get()).tonight;
        const night = (tn && tn.date_for) || ((await store.get("handoff:last")) || {}).date_for || null;
        const away = night ? ((await require("./attendance").view(night).catch(() => null)) || { away: [] }).away.map((x) => x.name) : [];
        const broken = [buttons || []].flat(3).map((x) => String((x && x.data) || "").match(/^(vote|pick|wish):(.+)$/i)).filter(Boolean).map((m) => household.ruleBreak(m[2], night, away)).filter(Boolean);
        if (broken.length) return { ok: false, error: `breaks a household rule: ${broken.join("; ")}. Offer another dish (S1)` };
        // Same rule for the words: a message offering a dish the rules keep
        // off the table ("Aloo puri ya Lauki chana dal") would tell the family
        // about a choice nobody can make. Seen 8 Oct in a guest night's
        // heads-up. Mentioning it (Papa's plate line, a V2 reply) still goes.
        const said = String(a.text || description || "");
        const offered = household.NAMES.filter((d) => new RegExp(`${d}\\s+ya\\b|\\bya\\s+${d}`, "i").test(said)).map((d) => household.ruleBreak(d, night, away)).filter(Boolean);
        if (offered.length) return { ok: false, error: `offers a dish a household rule keeps off tomorrow: ${offered.join("; ")}. Name only the dishes on the card` };
        // Someone who already tapped a pick tonight doesn't get the dish
        // buttons again: a run that read the chat just before the tap would
        // otherwise ask them twice. The text still goes.
        if (night && [buttons || []].flat(3).some((x) => /^(vote|pick):/i.test(String((x && x.data) || "")))) {
          const dest = await ops.resolveTo(a.to || a.chat_id);
          if (dest.chat_id && (await store.get(`picktap:${night}:${dest.chat_id}`))) {
            return telegram.sendMessage({ to: a.to, chat_id: a.chat_id, text: a.text || description });
          }
        }
        const sent = await telegram.sendMessage({ to: a.to, chat_id: a.chat_id, text: a.text || description, buttons });
        // An INBOX answer to whoever wrote is a "reply" event, so the app's
        // island thread shows it even when that member isn't on Telegram (S3).
        const cur = await store.get("run:current");
        if (cur && cur.phase === "INBOX" && cur.from && String(a.to || "").toLowerCase() === String(cur.from).toLowerCase()) {
          await require("./events").emit("reply", { to: cur.from, text: String(a.text || description || "").slice(0, 400), delivered: !!(sent && sent.ok) });
        }
        // A Haan/Nahi spend ask (the kirana's Rs 300 rule): kept so the app's
        // island can show the same ask and answer it (Y6, POST /app/approve).
        const ask = [buttons || []].flat(3).map((x) => String((x && x.data) || "").match(/^approve:(.+)$/i)).find(Boolean);
        if (sent.ok && ask) {
          const text = String(a.text || description || "");
          const rs = (text.match(/Rs\.?\s?(\d+)/i) || [])[1];
          await store.set("hh:ask", { reference: ask[1].trim(), text: text.slice(0, 300), to: a.to || null, amount: rs ? Number(rs) * 100 : null, at_ist: require("./util").istString() }, 12 * 3600);
          await require("./events").emit("approve_ask", { who: a.to || "Vinay", reference: ask[1].trim(), amount: rs ? Number(rs) * 100 : null, text: text.slice(0, 200) });
        }
        // A dish card that arrived: the shortlist watchdog (wake afterRun)
        // and the guest's "where are my dishes?" check read this.
        if (sent.ok && night && a.to && [buttons || []].flat(3).some((x) => /^(vote|pick):/i.test(String((x && x.data) || "")))) {
          await store.set(`cardsent:${night}:${String(a.to).toLowerCase()}`, 1, 2 * 86400);
        }
        return sent;
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
      // Who's eating (S6). by is who said it (the run's FROM); rails checks
      // who may mark whom and answers fail:NOT_ALLOWED otherwise.
      case "hh.away":
      case "hh.guests": {
        const att = require("./attendance");
        const by = a.by || a.from || null;
        const r = action === "hh.away"
          ? await att.setAway({ name: a.name, date_for: a.date_for, back: a.back === true || a.back === "true", by, via: a.via || "telegram", said: a.said })
          : await att.setGuests({ n: a.n, date_for: a.date_for, by, via: a.via || "telegram" });
        if (!r.ok) return { ok: false, error: r.error === "NOT_ALLOWED" ? `fail:NOT_ALLOWED ${r.why}` : r.error };
        return { ok: true, attendance: r.attendance, line: att.line(r.attendance) };
      }
      // Night task (step 12): who must be home, eating and not the cook.
      case "hh.task":
        return require("./prep").create({ dish: a.dish, who: a.who || a.to, date_for: a.date_for });
      case "kr.order":
        // Order the fresh items from Sharma Kirana for Sunita's 7:40 pickup.
        if (!a.items) return { ok: false, error: 'kr.order needs labels.items, like "tomato 300 g, onion 200 g"' };
        return kr("POST", "/kirana/v1/orders", { order_ref: a.reference, items: a.items, pickup_by: a.pickup_by || "07:40", picker: "Sunita" });
      case "pl.link": {
        // Real Pine Labs (sandbox): a hosted checkout for an amount the block
        // can't or mustn't pay alone, sent to Vinay with a pay button.
        const r = await uat.createLink({ amount_paise: a.amount_paise, reference: a.reference, base });
        if (!r.link) return r;
        const rs = (Number(r.link.amount_paise) / 100).toFixed(2);
        const demo = r.link.api === "demo";
        // Vinay approves; when he has no chat tonight, the guest does.
        const to = a.chat_id ? a.to : !a.to || /^vinay$/i.test(a.to) ? await ops.approver() : a.to;
        const stand = to === ops.GUEST ? "Vinay is offline tonight, so you approve this in his place. It's all Pine Labs test mode: no real money moves.\n\n" : "";
        const text = stand + (a.text || description || `Rs ${rs} to pay on Pine Labs.`);
        if (!a.chat_id) await uat.setApprover(r.link, to === ops.GUEST ? "the guest" : to);
        // What the money is for, and why, for the app's "Why?" (PL3).
        await uat.noteWhy(a.reference, { purpose: a.purpose || a.for, reason: a.reason || a.why || a.text || description, rule: a.rule });
        // A demo link says so: Pine Labs' sandbox didn't answer, so this one is rails' stand-in.
        const body = demo ? `${text}\n\n(Demo checkout: the Pine Labs sandbox isn't answering right now.)` : text;
        const sent = await telegram.sendMessage({
          to,
          chat_id: a.chat_id,
          text: body,
          buttons: [[{ text: `Pay Rs ${rs} · Pine Labs${demo ? " (demo)" : ""}`, url: r.link.url }], [{ text: "No", data: `deny:${a.reference}` }]],
        });
        // Kept so the message can say "paid" or "no" later, from either side (PL2).
        await uat.noteMessage(r.link, sent, body);
        if (!r.reused) await uat.event("link", { reference: a.reference, order_id: r.link.order_id, amount: r.link.amount_paise, to: to === ops.GUEST ? "the guest" : to, for: (await uat.whyOf(a.reference)).purpose, api: r.link.api || "real", summary: `Asked ${to === ops.GUEST ? "the guest" : to} to pay Rs ${rs} on Pine Labs` });
        return { ...r, sent };
      }
      case "pl.debit":
      case "pl.payee": {
        // Already paid through a Pine Labs link: a debit now would charge twice.
        await uat.noteWhy(a.reference, { purpose: a.purpose || a.for || a.note, reason: a.reason || a.why, rule: a.rule });
        const byLink = a.reference && (await store.get(`pl:link:paid:${a.reference}`));
        if (byLink) {
          await uat.refusal({ code: "ALREADY_PAID_BY_LINK", reference: a.reference, amount_paise: a.amount_paise });
          return { endpoint: `POST ${action}`, http_status: 409, response: { code: "ALREADY_PAID_BY_LINK", message: `Vinay paid ${a.reference} on Pine Labs (order ${byLink.order_id}). Don't debit it.` } };
        }
        // Household rule M5: a single debit over Rs 300 needs Vinay's "Haan"
        // button first. Checked here, on rails, so no prompt slip can skip it.
        const ok = await household.takeApproval(a.reference, a.amount_paise);
        if (!ok.ok) {
          await uat.refusal({ code: "APPROVAL_REQUIRED", reference: a.reference, amount_paise: a.amount_paise, limit_paise: household.BIG_DEBIT });
          return { endpoint: `POST ${action}`, http_status: 403, response: { code: "APPROVAL_REQUIRED", message: `Rs ${(Number(a.amount_paise) / 100).toFixed(2)} is over Rs 300. Ask Vinay with buttons "Haan=approve:${a.reference || "<reference>"}|Nahi=deny:${a.reference || "<reference>"}" and debit after he taps Haan. Baari rails household rule, not a Pine Labs error.` } };
        }
        const amount = { value: Number(a.amount_paise), currency: "INR" };
        const r =
          action === "pl.debit"
            ? await pl("POST", "/ps/api/v1/public/presentations", { subscription_id: sub(a.subscription_id), amount, merchant_presentation_reference: a.reference })
            : await pl("POST", `/ps/api/v1/public/subscriptions/${sub(a.subscription_id)}/presentations/payee`, {
                subscription_id: sub(a.subscription_id),
                amount,
                merchant_presentation_reference: a.reference,
                payee: { vpa: a.vpa, name: a.payee_name || "" },
                note: a.note || description || "",
              });
        // The block's own limits (balance, day cap, shop list) said no (PL4).
        const code = r && r.response && r.response.code;
        if (r && r.http_status >= 400 && ["INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION", "DAILY_LIMIT_EXCEEDED", "PAYEE_NOT_ALLOWED"].includes(code)) {
          await uat.refusal({ code, reference: a.reference, amount_paise: a.amount_paise, message: r.response.message, limit_paise: code === "DAILY_LIMIT_EXCEEDED" ? Number((/max_daily_debit (\d+)/.exec(r.response.message || "") || [])[1]) || null : null });
        }
        return r;
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
  const b = makeBridge({ rest, base: req.base });
  let m;
  if (req.method === "GET" && (m = req.path.match(/^\/v1\/voices\/((?:tg|pl|hh|kr)\.[^/]+)$/))) {
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
  if (r.endpoint && /Pine Labs (UAT|demo)/.test(r.endpoint)) {
    // pl.link: "<order_id>:LINK_SENT" once Vinay has the pay button.
    if (r.link && r.sent && r.sent.ok) return `${r.link.order_id}:LINK_SENT`;
    if (r.link) return `fail:LINK_NOT_SENT ${short(r.sent && r.sent.error)}`;
    return `fail:${short((r.response && (r.response.code || r.response.error_code || r.response.message)) || `HTTP_${r.http_status}`)}`;
  }
  if (r.endpoint && r.endpoint.includes("/kirana/")) {
    const resp = r.response || {};
    if (r.http_status >= 400 || !resp.success) return `fail:${short(resp.status || resp.error || `HTTP_${r.http_status}`)}`;
    return `${resp.order_id}:${resp.total_paise}`;
  }
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
  if (cmd.startsWith("pl.order.")) {
    const d = (r.response && r.response.data) || {};
    return { http_status: s(r.http_status), status: s(d.status), paid: s(!!r.paid), order_id: s(d.order_id), amount_paise: s(d.order_amount && d.order_amount.value), reference: s(r.reference), error: s(r.response && r.response.code), api: s(r.api) };
  }
  if (cmd.startsWith("pl.")) {
    const p = typeof r.response === "object" && r.response ? r.response : {};
    const out = { http_status: s(r.http_status) };
    if (typeof r.response === "string") out.error = "MALFORMED_BODY";
    else if (p.code) out.error = s(p.code);
    for (const k of ["status", "remaining_balance", "debited_today", "max_daily_debit", "presentation_id", "failure_reason", "utr"]) if (p[k] !== undefined) out[k] = s(p[k]);
    if (r.api) out.api = s(r.api);
    if (p.amount) out.amount_paise = s(p.amount.value);
    return out;
  }
  if (cmd.startsWith("tg.updates")) {
    const ups = r.updates || [];
    return { count: s(ups.length), last_update_id: s(ups.length ? ups[ups.length - 1].update_id : "") };
  }
  if (cmd === "tg.contacts") return { roles: (r.roles || []).map((x) => `${x.role}:${x.bound ? "bound" : "unbound"}`).join(",") };
  if (cmd.startsWith("kr.")) {
    const p = (r && r.response) || {};
    return { http_status: s(r.http_status), status: s(p.status), order_id: s(p.order_id), total_paise: s(p.total_paise), total_rupees: s(p.total_rupees), paid: s(p.paid), utr: s(p.utr), error: s(p.error) };
  }
  if (cmd === "hh.kitchen") return { as_of: s(r.as_of), pantry: s(r.pantry), dishes: s(r.dishes), not_cooked_yet: s(r.not_cooked_yet), kirana_stock: s(r.kirana_stock), staples_rates: s(r.staples_rates) };
  return {};
}

module.exports = { route, parseButtons, trimUpdate, outcome };
