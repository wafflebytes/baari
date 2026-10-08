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
const CLOCK = { SHORTLIST: "20:30", LOCK: "21:30", BUY: "21:35", CHECK: "22:45", BRIEF: "07:45", COOK_REPLY: "08:05" };
const EVENING = new Set(["SHORTLIST", "LOCK", "BUY", "CHECK"]);
// LOCK decides and tells; BUY books and pays (a run that tries both stops
// halfway, seen 7 Oct), then CHECK and BRIEF.
const CHAIN = { LOCK: "BUY", BUY: "CHECK", CHECK: "BRIEF" };
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
  // Only people with their own chat are waited for. A solo-mode stand-in can
  // still answer for someone (a Reply to their message counts), but nobody
  // waits on them; the deadline closes the night instead.
  const reachable = (order) => order.filter((r) => cast.roles[r]);
  const night = { date_for: h.date_for };
  const T = await timing();
  const now = Date.now();
  const timeUp = (k) => T.date_for === h.date_for && T[k] && now >= T[k];
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
    const voters = reachable(t.order);
    const dishes = (h.shortlist || []).map((n) => (typeof n === "string" ? n : (n && (n.dish || n.name)) || "")).filter(Boolean);
    const txt = (u) => (u.kind === "text" ? (u.text || "").trim().toLowerCase() : "");
    const btn = (u) => (u.kind === "button" ? String(u.button_data || "") : "");
    const isPass = (u) => u.role === holder && (/^pass\b/i.test(btn(u)) || /^(aaj nahi|pass|agle ko|skip)\b/.test(txt(u)));
    const isVote = (u) => /^(vote|pick|wish):/i.test(btn(u)) || /kuch bhi|koi bhi|anything/.test(txt(u)) || (!!txt(u) && dishes.some((d) => txt(u).includes(d.toLowerCase().split(/\s+/)[0])));
    const isVeto = (u) => u.role !== holder && (/^veto\b/i.test(btn(u)) || /^(veto|nahi chahiye|mat banao|don'?t want)\b/.test(txt(u)));
    const isOk = (u) => u.role !== holder && (/^ok\b/i.test(btn(u)) || /^(theek|thik|ok|okay|chalega|done)\b/.test(txt(u)));
    const latest = updates[updates.length - 1];
    // Someone asking about the dishes who never got their card: the INBOX
    // run that answers them sends it too.
    const ask = async (u) => {
      const r = inbox(u, h.date_for);
      if (!(await cardSent(h.date_for, u.role))) r.extra = `CARD MISSING: ${u.role} has no dish buttons for tonight yet. With your reply, send ${u.role} the dish card now (S3), two dishes that keep L3 for tomorrow.`;
      return r;
    };
    // The holder hands the turn on: rails moves it, and Baari sends the new
    // holder the card (INBOX, prompt I8). decide() only reads; tick() passes.
    if (latest && isPass(latest)) return { phase: "INBOX", pass: holder, from: holder, date_for: h.date_for };
    if (latest && latest.role === "Sunita") return inbox(latest, h.date_for);
    const since = (await telegram.getUpdates({ after_update_id: h.last_update_id || 0, limit: 200 })).updates.filter((u) => u.role && !isCommand(u));
    const heard = new Set(h.votes_heard || []);

    if (t.mode === "vote") {
      if (latest && t.order.includes(latest.role) && !isVote(latest)) return ask(latest);
      const voted = new Set([...heard, ...since.filter(isVote).map((u) => u.role)]);
      const missing = voters.filter((r) => !voted.has(r));
      if (!missing.length && voted.size) return { phase: "LOCK", ...night };
      if (timeUp("vote_ms")) return { phase: "LOCK", ...night, why: "voting time is up" };
      if (!latest) return { wait: `votes from ${missing.join(", ")}` };
      return waitFor(`votes from ${missing.join(", ")}`, `Got your vote. Waiting for ${missing.join(", ")} to vote.`);
    }

    // pick
    const pickMsg = [...since].reverse().find((u) => u.role === holder && isVote(u));
    const picked = !!holder && (heard.has(holder) || !!pickMsg);
    if (latest && t.order.includes(latest.role) && !(latest.role === holder ? isVote(latest) : picked && (isVeto(latest) || isOk(latest)))) return ask(latest);
    if (!picked) {
      if (timeUp("vote_ms")) return { phase: "LOCK", ...night, why: `${holder || "nobody"} didn't pick in time` };
      return latest ? waitFor(`${holder || "nobody"}'s pick`, `Got it. It's ${holder || "someone"}'s baari tonight; waiting for their pick.`) : { wait: `${holder || "nobody"}'s pick` };
    }
    const after = pickMsg ? since.filter((u) => u.update_id > pickMsg.update_id) : since;
    const veto = h.veto_by || (after.find(isVeto) || {}).role;
    if (veto) return { phase: "LOCK", ...night };
    const others = voters.filter((r) => r !== holder);
    const answered = new Set(after.filter((u) => isOk(u) || isVeto(u)).map((u) => u.role));
    const waiting = others.filter((r) => !answered.has(r));
    if (!waiting.length) return { phase: "LOCK", ...night };
    if (timeUp("veto_ms") || timeUp("vote_ms")) return { phase: "LOCK", ...night, why: "no veto came in time" };
    const dish = household.dishName(pickMsg ? btn(pickMsg) || txt(pickMsg) : "") || household.dishName((h.turn && h.turn.dish) || "") || (pickMsg ? (btn(pickMsg) || txt(pickMsg)).replace(/^\w+:/, "") : "their pick");
    const dmo = await demo();
    const by = dmo.on ? `in ${Math.max(1, Math.round(dmo.veto_s / 60))} minute(s)` : "by 9:30";
    const d = waitFor(`${waiting.join(", ")} to okay or veto ${holder}'s pick`, latest && latest.role === holder ? `Done, ${dish}. I've told the family; unless someone vetoes ${by}, that's dinner.` : `Got it. Waiting for ${waiting.join(", ")}.`);
    // The heads-up with the veto buttons goes out once, as soon as the pick
    // is known: a button, a typed dish, or one Baari heard in a voice note.
    d.vetoAsk = { date_for: h.date_for, holder, dish, to: others };
    return d;
  }
  // Nobody wrote: the heartbeat's checks. A chain step that never started
  // (its Vercel call died) starts now, and Sunita's silence after the brief
  // runs COOK_REPLY on its no-reply path once her time is up.
  if (!from.size) {
    const s = await settings();
    const next = CHAIN[done];
    // The brief waits while Vinay hasn't answered a Pine Labs link.
    if (next === "BRIEF" && (await payAskOpen(h))) return { wait: "Vinay's answer on the Pine Labs link" };
    if (next && s.chain && !(await store.get("wake:lock"))) {
      const lastEnd = Number((await store.get("wake:last_end")) || 0);
      if (now - lastEnd > 40000) return { phase: next, ...night, why: `chain repair after ${done}`, repair: true };
    }
    if (done === "BRIEF" && timeUp("reply_ms")) return { phase: "COOK_REPLY", ...night, why: "Sunita didn't reply in time" };
    return { wait: "a message from the household" };
  }
  // Everything else goes to the agent as INBOX, from the newest sender.
  if (done === "LOCK" || done === "BUY" || done === "CHECK") {
    // Vinay, or the guest answering in his place tonight (ops.approver).
    const payer = await require("./ops").approver();
    if (from.has(payer) && (h.open_asks || []).length) return { phase: "CHECK", ...night };
    return inbox(newest(), h.date_for);
  }
  // After the brief, Sunita's reply goes to COOK_REPLY; anyone else's message
  // may start the next night, which INBOX decides.
  if (done === "BRIEF" || done === "COOK_REPLY") {
    // A Pine Labs link still open after the brief (the wait ran out): his
    // answer, a payment or a Nahi, still goes to CHECK, which acts on it.
    if (from.has(await require("./ops").approver()) && (h.open_asks || []).some((a) => a && a.order_id)) return { phase: "CHECK", ...night };
    if (from.has("Sunita")) return { phase: "COOK_REPLY", ...night };
    return inbox(newest("Sunita"), fresh.date_for);
  }
  return inbox(newest(), fresh.date_for);
}

async function fire(phase, date_for, who, ack, from, extra) {
  const day = EVENING.has(phase) ? shiftDay(date_for, -1) : date_for;
  // INBOX runs on the real clock; the night's phases on their simulated times.
  const now = phase === "INBOX" ? istString().slice(0, 16).replace("T", " ") : `${day} ${CLOCK[phase]}`;
  const dm = await demo();
  const demoLine = dm.on ? `DEMO: a demo night for judges. People answer within ${Math.max(1, Math.round(dm.window_s / 60))} minutes, so wherever a rule says "9:30 tak", say "${Math.max(1, Math.round(dm.window_s / 60))} minute mein".` : null;
  const guestLine = dm.on && dm.guest ? await require("./guest").taskLine() : null;
  // Who's eating for this night, in every phase (section 10's EATING line).
  const att = await require("./attendance").view(date_for).catch(() => null);
  const eatingLine = att ? require("./attendance").line(att) : null;
  // From LOCK's result on, rails says what the locked dish needs (household.needs).
  let needsLine = null;
  if (["BUY", "CHECK"].includes(phase)) {
    const h = (await store.get("handoff:last")) || {};
    if (h.locked && h.locked.winner && (!h.date_for || h.date_for === date_for)) needsLine = await household.needsLine(h.locked.winner, (att && att.headcount) || h.locked.headcount || 4).catch(() => null);
  }
  // Night prep (step 12): at SHORTLIST, which dishes can be prepped tonight;
  // at LOCK, the shortlist's; at BRIEF and COOK_REPLY, what was really done.
  const prep = require("./prep");
  let prepLine = null;
  if (phase === "SHORTLIST" || phase === "INBOX") prepLine = await prep.line(Object.keys(prep.PREP), date_for).catch(() => null);
  if (phase === "LOCK") prepLine = await prep.line(((await store.get("handoff:last")) || {}).shortlist || Object.keys(prep.PREP), date_for).catch(() => null);
  if (phase === "BRIEF" || phase === "COOK_REPLY" || phase === "CHECK") prepLine = await prep.briefLine(date_for).catch(() => null);
  const lines = [from ? `FROM: ${from}` : null, demoLine, guestLine, eatingLine, needsLine, prepLine, extra || null].filter(Boolean).join("\n");
  const body = { phase, now_ist: now, date_for, agent: "Baari", ...(lines ? { extra: lines } : {}) };
  await store.set("wake:floor", await latestId());
  await note(`starting ${phase} for ${date_for}`, { phase });
  // Keep Telegram's "typing…" (or "recording…" for Sunita) up until the run ends.
  let typing = null;
  if (who && who.chat_id) {
    const action = who.role === "Sunita" ? "record_voice" : "typing";
    telegram.chatAction(who.chat_id, action).catch(() => {});
    typing = setInterval(() => telegram.chatAction(who.chat_id, action).catch(() => {}), 4500);
  }
  try {
    return await fireAndWait(phase, body);
  } finally {
    if (typing) clearInterval(typing);
    await store.set("wake:last_end", Date.now(), 86400);
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
    // forced: a phase name, or {phase, from, extra} (the app passing the turn).
    const f = typeof forced === "string" ? { phase: forced } : forced;
    const d = f ? { ...f, date_for: f.date_for || ((await store.get("handoff:last")) || {}).date_for || shiftDay(istDate(), 1) } : await decide();
    if (!d.phase) {
      // Nobody who wrote is left in silence.
      const say = d.say || (who ? "Got it." : null);
      if (who && say && who.role !== "Sunita") await telegram.statusNote(who.chat_id, say).catch(() => {});
      if (who && d.tell) await telegram.sendMessage(d.tell).catch(() => {});
      // Pick mode: tell the others what the holder chose, with the one veto.
      if (d.vetoAsk && (await store.setnx(`vetoask:${d.vetoAsk.date_for}`, 1, 86400))) {
        const v = d.vetoAsk;
        const dm = await demo();
        const until = dm.on ? `within ${Math.round(dm.veto_s / 60) || 1} minute(s)` : "by 9:30";
        for (const to of v.to) {
          await telegram.sendMessage({ to, text: `It's ${v.holder === ops.GUEST && dm.guest ? (dm.guest.name ? `${dm.guest.name} (our guest)` : "our guest") : v.holder}'s baari tonight, and the pick for tomorrow is ${v.dish}.\nOK? If not, tap Veto ${until} (one veto between you).`, buttons: [[{ text: "OK", data: "ok" }, { text: "Veto", data: "veto" }]] }).catch(() => {});
        }
        await setTiming(v.date_for, { veto_ms: Date.now() + (dm.on ? dm.veto_s * 1000 : 30 * 60 * 1000) });
        await note(`pick heads-up for ${v.date_for}: ${v.holder} picked ${v.dish}, sent to ${v.to.join(", ")}`);
      }
      if (reason !== "heartbeat") await note(`${reason}: waiting for ${d.wait}`);
      return { waiting: d.wait };
    }
    // A chain repair or a timeout gets two tries per night, then stops, so
    // a phase that keeps failing can't loop.
    if (d.repair || d.why) {
      const k = `wake:retry:${d.date_for}:${d.phase}`;
      const n = await store.incr(k);
      if (n === 1) await store.set(k, 1, 86400);
      if (n > 2) {
        await note(`not starting ${d.phase} for ${d.date_for} again (${d.why}); it ran twice`);
        return { waiting: "manual restart" };
      }
      await note(`${d.phase} for ${d.date_for}: ${d.why}`);
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
    // A run that failed (the platform errored, the session lapsed) gets one
    // more try, and whoever wrote hears what's going on instead of silence.
    if (!out.ok) {
      const tell = (text) => (who && who.role !== "Sunita" ? telegram.statusNote(who.chat_id, text).catch(() => {}) : null);
      await tell("One moment, Baari didn't answer. Trying again.");
      await sleep(3000);
      out = await fire(d.phase, d.date_for, shown, false, d.from, d.extra);
      if (!out.ok) await tell("Baari isn't answering right now. Try again in a bit, or send /status.");
    }
    if (out.ok && (await settings()).chain && CHAIN[d.phase]) next = CHAIN[d.phase];
    // Hold the night before the brief while a Pine Labs link waits for
    // Vinay: his payment or Nahi wakes CHECK, which then chains on.
    if (next === "BRIEF" && (await payAskOpen((await store.get("handoff:last")) || {}))) {
      next = null;
      await note(`holding before BRIEF for ${d.date_for}: waiting for Vinay's answer on the Pine Labs link`);
    }
    // A spoken vote heard in INBOX may have been the last one: check again.
    if (out.ok && d.phase === "INBOX") await store.set("wake:again", 1, 900);
    if (out.ok) await afterRun(d.phase, base);
  } finally {
    await store.del("wake:lock");
  }
  // A follow-up afterRun asked for (a missing dish card).
  const pending = await store.get("wake:pending");
  if (pending) {
    await store.del("wake:pending");
    return tick("card watchdog", base, pending, null);
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

// ---- deadlines, demo nights and the heartbeat
//
// Every night has deadlines so nothing waits forever on someone who never
// answers: vote_ms (the pick or the votes close), veto_ms (pick mode, after
// the holder picks) and reply_ms (Sunita's answer to the brief). A normal
// night closes voting at 21:30 IST; a demo night after demo.window_s.
//
// The baari-clock Worker posts /admin/wake/heartbeat every minute. The
// heartbeat closes what's past its deadline, restarts a chain step whose
// call died, and tells the family when the Delhivery parcel or the kirana
// order changes status.

const DEMO = { window_s: 180, veto_s: 90, reply_s: 150 };

async function demo() {
  return { on: false, ...DEMO, ...((await store.get("demo")) || {}) };
}

async function timing() {
  return (await store.get("night:timing")) || {};
}

async function setTiming(date_for, patch) {
  const t = await timing();
  const next = t.date_for === date_for ? { ...t, ...patch } : { date_for, ...patch };
  await store.set("night:timing", next, 3 * 86400);
  return next;
}

// Tonight's turn-holder: the one person who gets the night's updates (the
// order card, the line about Sunita's brief). Everyone else hears only what
// they have to answer or need to know: the dishes, the veto, the result.
async function holderDest() {
  const t = turn.view(await turn.get());
  if (!t.holder) return null;
  const d = await ops.resolveTo(t.holder);
  return d.chat_id ? d : null;
}

async function tellHolder(text) {
  const d = await holderDest();
  if (d) await telegram.statusNote(d.chat_id, text).catch(() => {});
  else await note(`no holder to tell: ${text.slice(0, 80)}`);
}

// After a run: set the deadline the next step waits on, tell the holder what
// they'd want to know, and close a demo.
// A Pine Labs pay link Vinay hasn't answered yet (an open ask with an
// order_id). The night waits for it before the brief, up to PAY_WAIT_MS, so
// Sunita isn't briefed on a plan that still depends on his yes or no.
const PAY_WAIT_MS = 10 * 60 * 1000;
async function payAskOpen(h) {
  const ask = (h.open_asks || []).find((a) => a && a.order_id);
  if (!ask) return null;
  const k = `payask:since:${ask.order_id}`;
  await store.setnx(k, Date.now(), 86400);
  return Date.now() - Number((await store.get(k)) || Date.now()) < PAY_WAIT_MS ? ask : null;
}

// Did tonight's dish card reach this person? (set by lib/bridge.js tg.send)
async function cardSent(date_for, role) {
  return !!(await store.get(`cardsent:${date_for}:${String(role).toLowerCase()}`));
}

async function afterRun(phase, base) {
  const h = (await store.get("handoff:last")) || {};
  const dm = await demo();
  const now = Date.now();
  if (String(h.phase_done || "").toUpperCase() === "SHORTLIST" && h.date_for) {
    const t = await timing();
    if (t.date_for !== h.date_for || !t.vote_ms) {
      const close = Date.parse(`${shiftDay(h.date_for, -1)}T21:30:00+05:30`);
      await setTiming(h.date_for, { vote_ms: dm.on ? now + dm.window_s * 1000 : close > now ? close : now + 30 * 60 * 1000 });
    }
  }
  // The holder must have tonight's dish buttons. A card that never arrived
  // (a refused dish and then a failed retry, as on 8 Oct) leaves them asking
  // "kya options hai?" with nothing to tap: Baari gets one more go (INBOX),
  // once per night, run by tick() as soon as this run's lock is released.
  if (String(h.phase_done || "").toUpperCase() === "SHORTLIST" && h.date_for) {
    const t = turn.view(await turn.ensure(h.date_for));
    if (t.holder && !(await cardSent(h.date_for, t.holder)) && (await store.setnx(`cardwatch:${h.date_for}:${t.holder}`, 1, 86400))) {
      await store.set("wake:pending", { phase: "INBOX", from: t.holder, date_for: h.date_for, extra: `CARD MISSING: ${t.holder} never got tonight's dish buttons (the send failed). Send ${t.holder} the holder card now (S3), two dishes that keep L3 for tomorrow.` }, 600);
      await note(`${t.holder} has no dish card for ${h.date_for}; asking Baari to send it again`);
    }
  }
  // Staples LOCK marked for Delhivery need a parcel, or a Pine Labs pay link
  // when the block can't pay (B2). A BUY that did neither (8 Oct: atta left
  // out on a Rs 50 block) gets one more go, once per night.
  if (phase === "BUY" && h.date_for) {
    const staples = (h.missing || []).filter((m) => m && m.route === "delhivery");
    const shipped = h.shipment && (h.shipment.waybill || h.shipment.awb);
    const linked = await store.get(`pl:link:ref:BAARI-${h.date_for}-staples`);
    if (staples.length && !shipped && !linked && (await store.setnx(`buywatch:${h.date_for}`, 1, 86400))) {
      const list = staples.map((m) => `${m.item} ${m.qty_g} g`).join(", ");
      await store.set("wake:pending", { phase: "BUY", date_for: h.date_for, extra: `STAPLES SKIPPED: ${list} (route delhivery) has no parcel and no pay link. Do B2 for them now: shipping_cost, then balance; if they don't fit, pay_link Vinay. The kirana items are done, don't order them again.` }, 600);
      await note(`BUY left out ${list} for ${h.date_for}; asking Baari to do B2`);
    }
  }
  if (phase === "BUY") await orderCard(base);
  if (phase === "BRIEF") {
    await setTiming(h.date_for, { reply_ms: now + (dm.on ? dm.reply_s : 20 * 60) * 1000 });
    await tellHolder("Sunita, the cook, has tomorrow's plan as a Hindi voice note.");
  }
  if (phase === "COOK_REPLY" && dm.on) {
    // A guest night: thank the guest and hand the seat back.
    if (dm.guest) await require("./guest").finish(base, h.date_for);
    else await tellHolder(`Tonight's work is done. Receipt: https://baari.pages.dev/receipt/${h.date_for}`);
    await store.set("demo", { ...dm, on: false, ended_ist: istString() });
    await note("demo night finished");
    // Whoever is waiting for the table gets it now, after any demo night.
    await require("./guest").next(base);
  }
}

// /demo pick | /demo vote: a fresh night that runs end to end in about ten
// minutes, with short windows.
async function startDemo(mode, by, base, opts = {}) {
  const m = mode === "vote" ? "vote" : "pick";
  // A family /demo while a guest night runs takes the table back.
  if (!opts.guest) {
    const g = await require("./guest").state();
    if (g) await require("./guest").release(g, { quiet: true });
  }
  const dm = { ...DEMO, ...opts, on: true, mode: m, by: by || null, started_ist: istString() };
  await store.set("demo", dm);
  await setSettings({ on: true, chain: true });
  await ops.resetDay();
  const date_for = shiftDay(istDate(), 1);
  await store.del(`vetoask:${date_for}`);
  await store.del(`card:${date_for}`);
  for (const k of await store.keys(`picktap:${date_for}:*`)) await store.del(k);
  for (const p of ["SHORTLIST", "LOCK", "BUY", "CHECK", "BRIEF", "COOK_REPLY"]) await store.del(`wake:retry:${date_for}:${p}`);
  await store.del("night:timing");
  await store.del("wake:lock");
  await store.set("wake:floor", await latestId());
  // A demo pantry: every dry staple has run out, so whichever dish wins,
  // something ships by Delhivery and something comes from Sharma Kirana.
  await household.setKitchen({ pantry: { rice: 0, atta: 0, rajma: 0, "chana dal": 0, besan: 0, tomato: 0, curd: 0, palak: 0, paneer: 0, lauki: 0, egg: 0, onion: 300, "ginger-garlic": 50, potato: 1000, oil: 1000 } });
  // A test armed with /test survives the reset above (lib/testkit.js).
  const armed = await require("./testkit").reapply(base);
  if (armed) await note(`demo runs with test ${armed}`);
  await turn.ensure(date_for, { fresh: true });
  await turn.set({ mode: m, tonight: true });
  const t = turn.view(await turn.get());
  if (dm.guest) await require("./guest").scan(dm.guest.chat_id, dm.guest.scan_id).catch(() => {});
  // A call night: the conversation happens on the demo phone (lib/call.js),
  // so there's no Telegram shortlist; the call places the order.
  if (dm.call) {
    await tellHolder("The phone on the table will ring now. Tomorrow's dinner gets decided on that call; orders and bills keep showing here.");
    await note(`call demo started by ${by || "admin"} for ${date_for}`);
    await require("./events").emit("demo", { on: true, mode: "call", who: by || null, holder: t.holder, date_for });
    later(require("./call").dial(base, { date_for, sim: !!opts.sim }));
    return { ok: true, demo: dm, date_for, holder: t.holder, call: true };
  }
  if (!dm.guest) await tellHolder(`Demo night started: it's your baari tonight, and ${m === "vote" ? "everyone votes" : "you pick"}. Two dishes are on their way.`);
  await note(`demo started (${m}) by ${by || "admin"} for ${date_for}`);
  await require("./events").emit("demo", { on: true, mode: m, who: by || null, holder: t.holder, date_for });
  later(tick("demo", base, { phase: "SHORTLIST", date_for }));
  return { ok: true, demo: dm, date_for, holder: t.holder };
}

async function stopDemo(base) {
  const dm = await demo();
  await store.set("demo", { ...dm, on: false, stopped_ist: istString() });
  if (dm.on) await require("./events").emit("demo", { on: false, mode: dm.mode });
  const guest = require("./guest");
  const g = await guest.state();
  if (g) await guest.release(g, { quiet: true });
  // The next judge in line gets the table.
  if (base) await guest.next(base);
  return { ok: true };
}

// The order card: one message to tonight's holder, edited in place as the
// kirana packs, the parcel moves and the payments settle, instead of a new
// message for every status. Rails relays the shop's, the carrier's and Pine
// Labs' own status; no decision is made here.
const PARCEL = { Manifested: "booked", "Picked Up": "picked up", "In Transit": "on the way", Pending: "on the way", Dispatched: "out for delivery", Delivered: "delivered" };
const SHOP = { PLACED: "order placed", PACKED: "being packed", READY: "packed, ready for Sunita to collect" };

async function orderCard(base) {
  const h = (await store.get("handoff:last")) || {};
  const done = String(h.phase_done || "").toUpperCase();
  if (!h.date_for || !["BUY", "CHECK", "BRIEF", "COOK_REPLY"].includes(done)) return;
  const lines = [];
  const pl = require("./pinelabs");
  const paid = async (ref) => {
    const p = await pl.byReference(ref);
    return p && p.status === "SUCCESS" && !p.refunded ? (p.amount_paise || 0) / 100 : 0;
  };
  const o = await require("./kirana").lastOrder();
  if (o && o.order_ref && o.order_ref.includes(h.date_for)) {
    const items = (o.lines || []).map((l) => l.item).filter(Boolean).join(", ");
    const rs = (await paid(`BAARI-${h.date_for}-kirana`)) + (await paid(`BAARI-${h.date_for}-kirana-2`));
    lines.push(`Sharma Kirana: ${items || "fresh items"}, ${SHOP[o.status] || String(o.status).toLowerCase()}${rs ? `. Paid Rs ${Math.round(rs)}` : ""}`);
  }
  const wb = h.shipment && h.shipment.waybill;
  if (wb) {
    let status = "booked";
    try {
      const r = await fetch(`${base}/api/v1/packages/json/?waybill=${encodeURIComponent(wb)}`, { headers: { authorization: `Token ${process.env.DELHIVERY_TOKEN || "baari"}` } });
      const body = await r.json();
      const s = body && body.ShipmentData && body.ShipmentData[0] && body.ShipmentData[0].Shipment;
      if (s && s.Status) {
        status = PARCEL[s.Status.Status] || String(s.Status.Status).toLowerCase();
        const at = String(s.Status.StatusLocation || "").replace(/_/g, " ").replace(/\s*\(.*\)$/, "").replace(/\s+Origin$/i, "");
        if (at && /on the way|out for delivery/.test(status)) status += `, ${at}`;
        await require("./appfeed").noteTracking({ response: body });
      }
    } catch (e) {
      await note(`tracking read failed: ${String(e.message || e).slice(0, 120)}`);
    }
    const rs = await paid(`BAARI-${h.date_for}-staples`);
    lines.push(`Delhivery parcel (staples): ${status}${rs ? `. Paid Rs ${Math.round(rs)}` : ""}`);
  }
  if (!lines.length) return;
  const dish = h.locked && h.locked.winner;
  // Plain English on Telegram since prompt v12 (T1 on 8 Oct showed Hinglish here).
  const text = `Tomorrow's groceries${dish ? ` · ${dish}` : ""}\n\n${lines.join("\n")}\n\nPaid through Pine Labs Reserve Pay, inside the family's daily limit.`;
  const key = `card:${h.date_for}`;
  const card = (await store.get(key)) || {};
  if (card.text === text) return;
  const d = await holderDest();
  if (!d) return;
  const id = await telegram.liveMessage(d.chat_id, card.chat_id === d.chat_id ? card.message_id : null, text);
  await store.set(key, { chat_id: d.chat_id, message_id: id, text }, 3 * 86400);
}

async function relayStatus(base) {
  await orderCard(base);
}

// Once a minute, from the clock Worker.
async function heartbeat(base) {
  const s = await settings();
  if (!s.on) return { off: true };
  // Cheap exit when no night is in progress (Upstash free tier).
  const done = String(((await store.get("handoff:last")) || {}).phase_done || "").toUpperCase();
  // After the night closes the parcel keeps moving: relay until it's
  // delivered (relay keys stop repeats), but start no more phases.
  if (["BUY", "CHECK", "BRIEF", "COOK_REPLY"].includes(done)) await relayStatus(base);
  // Night tasks: one reminder, then missed with a wake (lib/prep.js).
  if (["LOCK", "BUY", "CHECK"].includes(done)) await require("./prep").tick(base).catch(() => null);
  if (!["SHORTLIST", "LOCK", "BUY", "CHECK", "BRIEF"].includes(done)) return { idle: true };
  if (await store.get("wake:lock")) return { busy: true };
  return tick("heartbeat", base, null, null);
}

async function status() {
  return {
    demo: await demo(),
    timing: await timing(),
    settings: await settings(),
    configured: !!(CLOCK_URL && CLOCK_KEY),
    busy: await store.get("wake:lock"),
    floor: await store.get("wake:floor"),
    handoff_phase: ((await store.get("handoff:last")) || {}).phase_done || null,
    would: await decide(),
  };
}

module.exports = { later, onMessage, tick, status, setSettings, heartbeat, startDemo, stopDemo, demo, cardSent };
