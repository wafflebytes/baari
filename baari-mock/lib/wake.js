// Wake on message. A Telegram message from someone in the household starts
// the phase that is waiting for it, through the baari-clock Worker's /fire.
// Rails only picks when a run starts and which phase's turn it is. Every
// decision (votes, money, what to say to whom) still happens inside the run.
//
//   SHORTLIST done, pick mode   holder picked, then a veto or everyone okayed -> LOCK
//   SHORTLIST done, vote mode   everyone in the rotation who can has voted    -> LOCK
//   SHORTLIST done   the holder taps "Aaj nahi" (passes the turn)             -> INBOX
//   SHORTLIST done   a chat message or a voice note                      -> INBOX
//   (a pick or a wish is a button, or a text naming a shortlisted dish or
//    kuch bhi; a spoken one counts once Baari adds it to votes_heard)
//   /start and other bot commands                                         -> nothing
//   LOCK or CHECK done   Vinay answers an open ask                        -> CHECK
//   BRIEF or COOK_REPLY done   Sunita writes                              -> COOK_REPLY
//   any time   Vinay sends /new                                          -> SHORTLIST
//   anything else                                                        -> INBOX
// INBOX is the agent's own call (prompt I1 to I6): "aaj kya banega" starts
// a night as SHORTLIST, anything else gets a reply from household facts.
// A vote that has to wait for the others gets a one-line note.
//
// Chain (on by default): CHECK runs right after LOCK, and BRIEF right after
// CHECK, so a whole night fits in a few minutes. POST /admin/wake {on, chain}.
// Only messages that came in after the last phase started count.

const store = require("./store");
const ops = require("./ops");
const telegram = require("./telegram");
const turn = require("./turn");
const household = require("./household");
const { istString, istDate } = require("./util");

const CLOCK_URL = (process.env.CLOCK_URL || "").replace(/\/$/, "");
const CLOCK_KEY = process.env.CLOCK_KEY;
const DEBOUNCE_MS = Number(process.env.WAKE_DEBOUNCE_MS || 4000);
// Rails' status note to whoever's message started a phase, so the wait for
// the run doesn't feel like silence. Never to Sunita: she only gets Hindi
// voice notes (T2), so she sees "recording a voice message…" instead.
const ACK = {
  SHORTLIST: "⏳ Baari kal ke khane ke options dekh rahi hai. Vote thodi der mein shuru hoga.",
  LOCK: "⏳ Aaj ki baari ka faisla aa gaya. Baari result aur saamaan ka plan bana rahi hai.",
  CHECK: "⏳ Baari aapka jawab dekh rahi hai.",
};
const CLOCK = { SHORTLIST: "20:30", LOCK: "21:30", CHECK: "22:45", BRIEF: "07:45", COOK_REPLY: "08:05" };
const EVENING = new Set(["SHORTLIST", "LOCK", "CHECK"]);
const CHAIN = { LOCK: "CHECK", CHECK: "BRIEF" };
const VOTERS = ["Vinay", "Mummy", "Papa"];
const NEW_NIGHT = /^\/(new|naya|reset)\b/i;
const isCommand = (u) => u.kind === "text" && /^\//.test(u.text || "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shiftDay(d, n) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

async function note(text, extra) {
  await ops.log({ at_ist: istString(), kind: "wake", note: text, ...(extra || {}) });
}

// Vercel keeps the function alive for a promise passed to waitUntil after the
// response has gone. Locally the promise just runs.
function later(promise) {
  const p = Promise.resolve(promise).catch((e) => note(`error: ${String(e.message || e).slice(0, 300)}`).catch(() => {}));
  const ctx = globalThis[Symbol.for("@vercel/request-context")]?.get?.();
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
  return p;
}

async function settings() {
  return { on: true, chain: true, ...((await store.get("wake:settings")) || {}) };
}

async function setSettings(body) {
  const s = await settings();
  if (body.on !== undefined) s.on = !!body.on;
  if (body.chain !== undefined) s.chain = !!body.chain;
  await store.set("wake:settings", s);
  return s;
}

async function clock(method, path, body) {
  const r = await fetch(`${CLOCK_URL}${path}`, {
    method,
    headers: { "x-clock-key": CLOCK_KEY, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { http: r.status, ...j };
}

async function latestId() {
  const [u] = await store.range("tg:updates", 1);
  return u ? u.update_id : 0;
}

// Which phase, if any, is waiting on the messages that came in.
async function decide() {
  const h = (await store.get("handoff:last")) || {};
  let done = String(h.phase_done || "").toUpperCase();
  const today = istDate();
  const stale = !!h.date_for && h.date_for < today;
  if (stale) done = "";
  const floor = Number((await store.get("wake:floor")) || 0);
  const all = (await telegram.getUpdates({ after_update_id: floor, limit: 200 })).updates;
  // "/new" from Vinay starts a new night whatever state the last one is in.
  if (all.some((u) => u.role === "Vinay" && NEW_NIGHT.test(u.text || ""))) return { phase: "SHORTLIST", date_for: shiftDay(today, 1), reset: true };
  // Any other bot command (/start, a role link) is not a message to Baari.
  const updates = all.filter((u) => u.role && !isCommand(u));
  const from = new Set(updates.map((u) => u.role));

  const cast = await ops.getCast();
  const reachable = VOTERS.filter((r) => cast.roles[r] || (cast.solo && cast.operator));
  const night = { date_for: h.date_for };
  const fresh = { date_for: shiftDay(today, 1), reset: true };
  // say: rails' one-line reply to someone whose message has to wait, so
  // nobody is left in silence. Never sent to Sunita (voice only, T2).
  const waitFor = (wait, say) => ({ wait, say });
  const newest = (skip) => [...updates].reverse().find((u) => u.role !== skip);
  const inbox = (u, date_for) => ({ phase: "INBOX", from: u.role, date_for });

  if (done === "SHORTLIST") {
    // The night's baari is open. lib/turn.js says who holds it and the mode:
    //   pick  the holder picks; then the others get a heads-up with "Theek
    //         hai" and "Veto" (one veto between them). LOCK once a veto comes,
    //         or once everyone else has answered.
    //   vote  everyone in the rotation votes; LOCK once all who can have.
    // Messages are read from the shortlist's cursor, so a chat run in between
    // loses none. A button, or a text naming a shortlisted dish or "kuch
    // bhi", is a pick or a vote. Anything else, and every voice note, goes to
    // Baari (INBOX), which answers it and records a spoken pick or vote in
    // HANDOFF.votes_heard, a spoken veto in HANDOFF.veto_by (prompt I7).
    const t = turn.view(await turn.ensure(h.date_for));
    const holder = t.holder;
    const voters = reachable.filter((r) => t.order.includes(r));
    const dishes = (h.shortlist || []).map((n) => (typeof n === "string" ? n : (n && (n.dish || n.name)) || "")).filter(Boolean);
    const txt = (u) => (u.kind === "text" ? (u.text || "").trim().toLowerCase() : "");
    const btn = (u) => (u.kind === "button" ? String(u.button_data || "") : "");
    const isPass = (u) => u.role === holder && (/^pass\b/i.test(btn(u)) || /^(aaj nahi|pass|agle ko|skip)\b/.test(txt(u)));
    const isVote = (u) => /^(vote|pick|wish):/i.test(btn(u)) || /kuch bhi|koi bhi|anything/.test(txt(u)) || (!!txt(u) && dishes.some((d) => txt(u).includes(d.toLowerCase().split(/\s+/)[0])));
    const isVeto = (u) => u.role !== holder && (/^veto\b/i.test(btn(u)) || /^(veto|nahi chahiye|mat banao)\b/.test(txt(u)));
    const isOk = (u) => u.role !== holder && (/^ok\b/i.test(btn(u)) || /^(theek|thik|ok|okay|chalega|done)\b/.test(txt(u)));
    const latest = updates[updates.length - 1];
    // The holder hands the turn on: rails moves it, and Baari sends the new
    // holder the card (INBOX, prompt I8). decide() only reads; tick() passes.
    if (latest && isPass(latest)) return { phase: "INBOX", pass: holder, from: holder, date_for: h.date_for };
    if (latest && latest.role === "Sunita") return inbox(latest, h.date_for);
    const since = (await telegram.getUpdates({ after_update_id: h.last_update_id || 0, limit: 200 })).updates.filter((u) => u.role && !isCommand(u));
    const heard = new Set(h.votes_heard || []);

    if (t.mode === "vote") {
      if (latest && VOTERS.includes(latest.role) && !isVote(latest)) return inbox(latest, h.date_for);
      const voted = new Set([...heard, ...since.filter(isVote).map((u) => u.role)]);
      const missing = voters.filter((r) => !voted.has(r));
      if (!missing.length && voted.size) return { phase: "LOCK", ...night };
      if (!latest) return { wait: `votes from ${missing.join(", ")}` };
      return waitFor(`votes from ${missing.join(", ")}`, `✅ Vote mil gaya. Ab ${missing.join(", ")} ke vote ka intezaar hai.`);
    }

    // pick
    const pickMsg = [...since].reverse().find((u) => u.role === holder && isVote(u));
    const picked = !!holder && (heard.has(holder) || !!pickMsg);
    if (latest && VOTERS.includes(latest.role) && !(latest.role === holder ? isVote(latest) : picked && (isVeto(latest) || isOk(latest)))) return inbox(latest, h.date_for);
    if (!picked) return latest ? waitFor(`${holder || "nobody"}'s pick`, null) : { wait: `${holder || "nobody"}'s pick` };
    const after = pickMsg ? since.filter((u) => u.update_id > pickMsg.update_id) : since;
    const veto = h.veto_by || (after.find(isVeto) || {}).role;
    if (veto) return { phase: "LOCK", ...night };
    const others = voters.filter((r) => r !== holder);
    const answered = new Set(after.filter((u) => isOk(u) || isVeto(u)).map((u) => u.role));
    const waiting = others.filter((r) => !answered.has(r));
    if (!waiting.length) return { phase: "LOCK", ...night };
    const dish = household.dishName(pickMsg ? btn(pickMsg) || txt(pickMsg) : "") || (pickMsg ? (btn(pickMsg) || txt(pickMsg)).replace(/^\w+:/, "") : "unki pasand");
    const d = waitFor(`${waiting.join(", ")} to okay or veto ${holder}'s pick`, latest && latest.role === holder ? `✅ Pakka, ${dish}. Baaki ko bata diya; 9:30 tak koi veto na kare toh yahi banega.` : `✅ Mil gaya. Ab ${waiting.join(", ")} ka intezaar hai.`);
    // The heads-up with the veto buttons goes out once, right after the pick.
    if (latest && latest.role === holder) d.vetoAsk = { date_for: h.date_for, holder, dish, to: others };
    return d;
  }
  if (!from.size) return { wait: "a message from the household" };
  // Everything else goes to the agent as INBOX, from the newest sender.
  if (done === "LOCK" || done === "CHECK") {
    if (from.has("Vinay") && (h.open_asks || []).length) return { phase: "CHECK", ...night };
    return inbox(newest(), h.date_for);
  }
  // After the brief, Sunita's reply goes to COOK_REPLY; anyone else's message
  // may start the next night, which INBOX decides.
  if (done === "BRIEF" || done === "COOK_REPLY") {
    if (from.has("Sunita")) return { phase: "COOK_REPLY", ...night };
    return inbox(newest("Sunita"), fresh.date_for);
  }
  return inbox(newest(), fresh.date_for);
}

async function fire(phase, date_for, who, ack, from, extra) {
  const day = EVENING.has(phase) ? shiftDay(date_for, -1) : date_for;
  // INBOX runs on the real clock; the night's phases on their simulated times.
  const now = phase === "INBOX" ? istString().slice(0, 16).replace("T", " ") : `${day} ${CLOCK[phase]}`;
  const lines = [from ? `FROM: ${from}` : null, extra || null].filter(Boolean).join("\n");
  const body = { phase, now_ist: now, date_for, agent: "Baari", ...(lines ? { extra: lines } : {}) };
  await store.set("wake:floor", await latestId());
  await note(`starting ${phase} for ${date_for}`, { phase });
  // Keep Telegram's "typing…" (or "recording…" for Sunita) up until the run ends.
  let typing = null;
  if (who && who.chat_id) {
    const action = who.role === "Sunita" ? "record_voice" : "typing";
    if (ack && ACK[phase] && who.role !== "Sunita") await telegram.statusNote(who.chat_id, ACK[phase]).catch(() => {});
    telegram.chatAction(who.chat_id, action).catch(() => {});
    typing = setInterval(() => telegram.chatAction(who.chat_id, action).catch(() => {}), 4500);
  }
  try {
    return await fireAndWait(phase, body);
  } finally {
    if (typing) clearInterval(typing);
  }
}

async function fireAndWait(phase, body) {
  let r = await clock("POST", "/fire", body);
  if (r.http === 409) {
    // Someone else's run (the /dev panel, a cron) is in flight: wait it out.
    for (let i = 0; i < 24; i++) {
      await sleep(5000);
      const s = await clock("GET", "/status");
      if (!s.inflight) break;
    }
    r = await clock("POST", "/fire", body);
  }
  await note(r.ok ? `${phase} done: ${r.decisions_count ?? "?"} decisions, run ${r.run_id || "?"}` : `${phase} failed: ${String(r.error || r.http).slice(0, 200)}`, { phase, run_id: r.run_id || null, ok: !!r.ok });
  return r;
}

// One check at a time. A message that lands while a run is going sets
// wake:again, and the check runs once more when that run ends.
// who: {chat_id, role} of the message that woke us; none for a chain step.
async function tick(reason, base, forced, who) {
  if (!(await store.setnx("wake:lock", reason, 330))) {
    await store.set("wake:again", 1, 900);
    return { busy: true };
  }
  let next = null;
  let out;
  try {
    const d = forced ? { phase: forced, date_for: ((await store.get("handoff:last")) || {}).date_for || shiftDay(istDate(), 1) } : await decide();
    if (!d.phase) {
      if (who && d.say && who.role !== "Sunita") await telegram.statusNote(who.chat_id, d.say).catch(() => {});
      if (who && d.tell) await telegram.sendMessage(d.tell).catch(() => {});
      // Pick mode: tell the others what the holder chose, with the one veto.
      if (d.vetoAsk && (await store.setnx(`vetoask:${d.vetoAsk.date_for}`, 1, 86400))) {
        const v = d.vetoAsk;
        for (const to of v.to) {
          await telegram.sendMessage({ to, text: `🪙 Aaj ${v.holder} ki baari: kal ${v.dish} banega. Theek hai? Nahi chahiye toh Veto dabao (sabka ek veto, 9:30 tak).`, buttons: [[{ text: "Theek hai 👍", data: "ok" }, { text: "Veto ✋", data: "veto" }]] }).catch(() => {});
        }
        await note(`pick heads-up for ${v.date_for}: ${v.holder} picked ${v.dish}, sent to ${v.to.join(", ")}`);
      }
      await note(`${reason}: waiting for ${d.wait}`);
      return { waiting: d.wait };
    }
    if (d.reset) await ops.resetDay();
    // The holder handed tonight's baari on: move it, then Baari tells the
    // new holder (prompt I8).
    if (d.pass) {
      const r = await turn.pass(d.date_for, d.pass);
      if (r.ok) {
        d.from = r.to || d.pass;
        d.extra = r.to
          ? `TURN PASSED: ${d.pass} passed tonight's baari to ${r.to}. Send ${r.to} the holder card (I8).`
          : `TURN PASSED: ${d.pass} passed and everyone else already had; nobody holds tonight's baari, wishes decide at LOCK (I8).`;
        await note(`baari for ${d.date_for}: ${d.pass} passed to ${r.to || "nobody"}`);
      }
    }
    // A chain step shows "typing…" to whoever the phase talks to; a message
    // also gets the status note.
    const shown = who || (await ops.resolveTo(d.phase === "BRIEF" || d.phase === "COOK_REPLY" ? "Sunita" : "Vinay"));
    out = await fire(d.phase, d.date_for, shown, !!who, d.from, d.extra);
    if (out.ok && (await settings()).chain && CHAIN[d.phase]) next = CHAIN[d.phase];
    // A spoken vote heard in INBOX may have been the last one: check again.
    if (out.ok && d.phase === "INBOX") await store.set("wake:again", 1, 900);
  } finally {
    await store.del("wake:lock");
  }
  if (next) await kick(base, next);
  else if (await store.get("wake:again")) {
    await store.del("wake:again");
    await kick(base, null);
  }
  return out;
}

// Start the next step in a fresh function call, so no single call runs long.
async function kick(base, phase) {
  await fetch(`${base}/admin/wake/run`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY || "", "content-type": "application/json" },
    body: JSON.stringify(phase ? { phase, reason: "chain" } : { reason: "messages during the last run" }),
  });
}

// Called from the Telegram webhook for every household message. Waits a few
// seconds so a burst of messages (three votes, a voice note and a caption)
// wakes the agent once.
async function onMessage(n, base) {
  const s = await settings();
  if (!s.on) return;
  if (!CLOCK_URL || !CLOCK_KEY) return note("wake is on but CLOCK_URL or CLOCK_KEY is not set on rails");
  if (isCommand(n) && !NEW_NIGHT.test(n.text || "")) return;
  // "typing…" right away, so the sender sees Baari heard them.
  telegram.chatAction(n.chat_id, n.role === "Sunita" ? "record_voice" : "typing").catch(() => {});
  const token = String(n.update_id);
  await store.set("wake:token", token, 600);
  await sleep(DEBOUNCE_MS);
  if ((await store.get("wake:token")) !== token) return;
  await tick(`message from ${n.role}`, base, null, { chat_id: n.chat_id, role: n.role });
}

async function status() {
  return {
    settings: await settings(),
    configured: !!(CLOCK_URL && CLOCK_KEY),
    busy: await store.get("wake:lock"),
    floor: await store.get("wake:floor"),
    handoff_phase: ((await store.get("handoff:last")) || {}).phase_done || null,
    would: await decide(),
  };
}

module.exports = { later, onMessage, tick, status, setSettings };
