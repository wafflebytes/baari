// Baari Live (/live): the screen we record (PRD 17 item 1, DESIGN 7).
// Everything on it comes from rails /app/state and /app/events. Nothing is
// canned: with no events the screen says "Baari ka intezaar" and waits.
const RAILS = "https://baari-rails.vercel.app";
const onPages = location.hostname.endsWith("pages.dev") || location.hostname.startsWith("baari");
const BASE = onPages ? "/api" : `${RAILS}/app`;
const MEDIA = onPages ? "/api" : RAILS;

const TRACKS = [
  { rail: "gnani", label: "Gnani", tag: "real", y: 70 },
  { rail: "telegram", label: "Telegram", tag: "real", y: 185 },
  { rail: "pinelabs", label: "Pine Labs", tag: "mock", y: 300 },
  { rail: "delhivery", label: "Delhivery", tag: "mock", y: 415 },
];
const W = 760, SIGNAL = 470, STATION = 600, CAR_W = 136;
const SWITCH_X = 250, SPUR_Y = 515;
const STOPS = [
  { phase: "SHORTLIST", at: "20:30", label: "Shortlist" },
  { phase: "LOCK", at: "21:30", label: "Vote band" },
  { phase: "CHECK", at: "22:45", label: "Delivery check" },
  { phase: "BRIEF", at: "07:45", label: "Sunita brief" },
  { phase: "SUNITA", at: "08:00", label: "Sunita aati hain", sunita: true },
  { phase: "COOK_REPLY", at: "08:05", label: "Unka jawab" },
];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rs = (p) => "Rs " + Math.round((p || 0) / 100).toLocaleString("en-IN");
const hhmm = (iso) => { const m = String(iso || "").match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : ""; };
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

let state = null;
let lastId = 0;
let lastEventAt = 0;
let lastTool = "";
const seen = new Set();
const track = {}; // rail -> { calls, fails, lastText, lamp, cars:[], queue:[], busy }
const chats = { Papa: [], Sunita: [] };

// ---- fit the 1440 x 900 stage to the window
function fit() {
  document.documentElement.style.setProperty("--fit", Math.min(innerWidth / 1440, innerHeight / 900));
}
addEventListener("resize", fit);
fit();

// ---- rail map
function drawMap() {
  const svg = $("#rails");
  svg.innerHTML = "";
  for (const t of TRACKS) {
    const g = svgEl("g", { class: "track", "data-rail": t.rail }, svg);
    svgEl("text", { x: 0, y: t.y - 30, class: "lbl" }, g).textContent = t.label;
    const tag = svgEl("text", { x: t.label.length * 10.5 + 10, y: t.y - 30, class: "tag", fill: t.tag === "real" ? "#037A40" : "#7A5A00", "data-tag": t.rail }, g);
    tag.textContent = t.tag === "real" ? "REAL API" : "MOCK, REAL SHAPE";
    for (let x = 6; x < W; x += 20) svgEl("line", { x1: x, x2: x, y1: t.y - 10, y2: t.y + 10, class: "sleeper" }, g);
    svgEl("line", { x1: 0, x2: W, y1: t.y - 6, y2: t.y - 6, class: "rail" }, g);
    svgEl("line", { x1: 0, x2: W, y1: t.y + 6, y2: t.y + 6, class: "rail" }, g);
    // signal post
    svgEl("line", { x1: SIGNAL, x2: SIGNAL, y1: t.y - 14, y2: t.y - 44, class: "post" }, g);
    const lamp = svgEl("circle", { cx: SIGNAL, cy: t.y - 50, r: 7, class: "lamp" }, g);
    // station
    svgEl("rect", { x: STATION + 10, y: t.y - 58, width: W - STATION - 10, height: 30, rx: 8, class: "station" }, g);
    const count = svgEl("text", { x: STATION + 22, y: t.y - 38, class: "count" }, g);
    const last = svgEl("text", { x: 0, y: t.y + 32, class: "last" }, g);
    const cars = svgEl("g", {}, g);
    track[t.rail] = { ...t, calls: 0, fails: 0, lamp, count, last, carsG: cars, queue: [], busy: false };
  }
  // kirana spur off the Delhivery track: when a Delhivery leg fails, the
  // points switch and the staples go to Sunita's 7:40 pickup instead
  const d = TRACKS[3];
  const spur = svgEl("g", { class: "spur", id: "spur" }, svg);
  const dx = 90;
  for (let i = 0; i <= dx; i += 20) svgEl("line", { x1: SWITCH_X + i - 7, x2: SWITCH_X + i + 7, y1: d.y + (i / dx) * (SPUR_Y - d.y), y2: d.y + (i / dx) * (SPUR_Y - d.y), class: "sleeper" }, spur);
  for (let x = SWITCH_X + dx; x < W; x += 20) svgEl("line", { x1: x, x2: x, y1: SPUR_Y - 10, y2: SPUR_Y + 10, class: "sleeper" }, spur);
  for (const off of [-6, 6]) {
    svgEl("polyline", { points: `${SWITCH_X},${d.y + off} ${SWITCH_X + dx},${SPUR_Y + off} ${W},${SPUR_Y + off}`, class: "rail", fill: "none" }, spur);
  }
  const sl = svgEl("text", { x: SWITCH_X + dx + 10, y: SPUR_Y + 34, class: "lbl", style: "font-size:15px" }, spur);
  sl.id = "spur-lbl";
  sl.textContent = "Sharma Kirana · Sunita 7:40";
  svgEl("rect", { x: SWITCH_X - 2, y: d.y - 2.5, width: 46, height: 5, rx: 2.5, class: "points", id: "points" }, svg);
}

function carLabel(ev) {
  const to = String(ev.summary || "").match(/"to":"(\w+)"/);
  const role = ev.chat && ev.chat.role;
  const who = role || (to && to[1]);
  return `${ev.tool || "call"}${who ? ` → ${who}` : ""}`.slice(0, 19);
}

function lastLine(ev) {
  const s = String(ev.summary || "");
  if (ev.money && ev.money.amount_paise) return `${ev.tool} ${rs(ev.money.amount_paise)} ${ev.money.status || ""}`.trim();
  if (/^\{/.test(s)) {
    const m = s.match(/"(status|rmk|error|code)":"?([^",}]{1,40})/);
    return `${ev.tool}${m ? ` · ${m[2]}` : ""}`;
  }
  return `${ev.tool} · ${s}`.slice(0, 70);
}

function settle(t, ev) {
  t.calls++;
  if (ev.ok === false) t.fails++;
  t.count.textContent = `${t.calls} call${t.calls === 1 ? "" : "s"}${t.fails ? ` · ${t.fails} fail` : ""}`;
  t.last.textContent = `${hhmm(ev.at_ist)}  ${lastLine(ev)}`;
  t.lamp.setAttribute("class", `lamp ${ev.ok === false ? "red" : "green"}`);
}

function runCar(t, ev) {
  t.busy = true;
  // a stopped car from an earlier failure leaves when the next one comes
  for (const old of t.carsG.querySelectorAll(".car.bad")) { old.style.opacity = 0; setTimeout(() => old.remove(), 450); }
  const g = svgEl("g", { class: "car" }, t.carsG);
  g.style.transform = `translate(${-CAR_W - 10}px, ${t.y - 15}px)`;
  svgEl("rect", { width: CAR_W, height: 30, rx: 9, class: "body" }, g);
  svgEl("circle", { cx: CAR_W - 11, cy: 15, r: 5, class: "light" }, g);
  svgEl("text", { x: 11, y: 19.5 }, g).textContent = carLabel(ev);
  const fail = ev.ok === false;
  const target = fail ? SIGNAL - CAR_W - 10 : STATION - CAR_W / 2;
  requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `translate(${target}px, ${t.y - 15}px)`; }));
  setTimeout(() => {
    g.classList.add(fail ? "bad" : "ok");
    settle(t, ev);
    if (!fail) setTimeout(() => { g.style.opacity = 0; setTimeout(() => g.remove(), 450); }, 1100);
    t.busy = false;
    next(t);
  }, 620);
}

function next(t) {
  if (t.busy || !t.queue.length) return;
  const ev = t.queue.shift();
  setTimeout(() => runCar(t, ev), 120);
}

function points() {
  const d = (state && state.delivery) || {};
  const hop = JSON.stringify(d.hop || "");
  const dl = track.delhivery;
  const rerouted = /NO_RIDER|fail|cancel/i.test(hop) || (dl && dl.fails > 0 && (d.kirana_pickup || []).length > 0);
  $("#points").style.transform = rerouted ? "rotate(21deg)" : "rotate(0deg)";
  $("#spur").classList.toggle("on", (d.kirana_pickup || []).length > 0);
  const items = (d.kirana_pickup || []).join(", ");
  $("#spur-lbl").textContent = `Sharma Kirana · Sunita 7:40${items ? ` · ${items}` : ""}`;
}

// ---- chats: from ev.chat / ev.chats when rails sends them, else Sunita's
// brief from /app/state
function addChat(c, ev) {
  const who = c.role === "Sunita" ? "Sunita" : c.role === "Papa" ? "Papa" : null;
  if (!who) return;
  chats[who].push({ ...c, at: hhmm(ev.at_ist), key: `${ev.id}:${chats[who].length}` });
}

function bubble(m) {
  const cls = `bub ${m.dir === "out" ? "out" : ""} ${m.audio_url ? "voice" : ""}`;
  const time = `<small>${esc(m.at || "")}</small>`;
  const btns = m.buttons && m.buttons.length ? `<div class="btns">${m.buttons.map((b) => `<span>${esc(String(b).split("=")[0])}</span>`).join("")}</div>` : "";
  if (m.audio_url) {
    const url = /^https?:/.test(m.audio_url) ? m.audio_url : `${MEDIA}/${String(m.audio_url).replace(/^\//, "")}`;
    const words = m.text || m.transcript || "";
    return `<div class="${cls}" data-key="${esc(m.key)}"><button data-play="${esc(url)}" aria-label="Play">▶</button><div style="flex:1"><div class="wave"></div>${words ? `<span class="tr" lang="${/[ऀ-ॿ]/.test(words) ? "hi" : "en"}">${esc(words)}</span>` : ""}${time}</div></div>`;
  }
  const text = m.text || (m.button_data ? `Button: ${String(m.button_data).split(":").pop()}` : "");
  return `<div class="${cls}" data-key="${esc(m.key)}"><span lang="${/[ऀ-ॿ]/.test(text) ? "hi" : "en"}">${esc(text)}</span>${btns}${time}</div>`;
}

function renderChat(who, list) {
  const el = $(`#chat-${who.toLowerCase()}`);
  if (!list.length) {
    if (!el.querySelector(".empty")) el.innerHTML = `<div class="empty">Baari ka intezaar</div>`;
    return;
  }
  const have = new Set([...el.querySelectorAll(".bub")].map((b) => b.dataset.key));
  el.querySelector(".empty")?.remove();
  for (const m of list.slice(-8)) if (!have.has(m.key)) el.insertAdjacentHTML("beforeend", bubble(m));
  while (el.children.length > 8) el.firstElementChild.remove();
}

function sunitaFromState() {
  const b = (state && state.brief) || {};
  const out = [];
  if (b.audio_url || b.text) out.push({ dir: "out", audio_url: b.audio_url, text: b.text, key: "brief", at: "07:45" });
  if (b.reply_text || b.reply_label) out.push({ dir: "in", text: b.reply_text || b.reply_label, key: "reply", at: "08:05" });
  return out;
}

// ---- feed, khata, clock
function renderFeed() {
  const dec = ((state && state.decisions) || []).slice().reverse();
  $("#dcount").textContent = dec.length ? `${dec.length} decision${dec.length === 1 ? "" : "s"}` : "";
  const el = $("#feed");
  if (!dec.length) { el.innerHTML = `<li class="empty" style="display:block">Aaj ka pehla run abhi baaki hai.</li>`; return; }
  const key = (d) => `${d.phase || ""}:${d.id}:${d.text}`.slice(0, 120);
  const have = new Set([...el.children].map((li) => li.dataset.key));
  const want = dec.slice(0, 12);
  if (want.every((d) => have.has(key(d))) && el.children.length === want.length) return;
  el.innerHTML = want.map((d) => {
    const s = `${d.rule || ""} ${d.text || ""}`;
    const cls = /fail|FAILED|error|INSUFFICIENT/i.test(s) ? "bad" : /retry|late|delay|NO_RIDER|\bE\d|\bC4|veto|\bV2|Haan|ask/i.test(s) ? "warn" : "";
    const isNew = !have.has(key(d));
    return `<li class="${cls}" data-key="${esc(key(d))}" style="${isNew ? "" : "animation:none"}"><span class="dot"></span><div><div class="t">${esc(d.at || "")}${d.phase ? ` · ${esc(d.phase)}` : ""}${d.rule ? `<span class="rule">${esc(d.rule)}</span>` : ""}</div><p>${esc(d.text || "")}</p></div></li>`;
  }).join("");
}

function renderKhata() {
  const k = (state && state.khata) || {};
  const cap = k.cap_today || 40000, spent = k.spent_today || 0;
  $("#k-spent").textContent = rs(spent);
  $("#k-cap").textContent = `of ${rs(cap)} aaj ki limit`;
  const bar = $("#k-bar");
  bar.style.width = `${Math.min(100, (spent / cap) * 100)}%`;
  bar.classList.toggle("high", spent / cap > 0.75);
  const lastDebit = (k.debits || []).slice(-1)[0];
  const lastTxt = lastDebit ? ` · aakhri: ${rs(lastDebit.amount_paise || lastDebit.amount)} ${lastDebit.status || ""}` : "";
  // Pine Labs: the request to Vinay, and whether the last call hit the real
  // sandbox or Baari's demo stand-in.
  const p = (state && state.pinelabs) || {};
  const req = (p.requests || []).slice(-1)[0];
  const reqTxt = req ? ` · Vinay se ${rs(req.amount)}: ${{ WAITING: "jawab ka intezaar", PAID: "paid", DECLINED: "Nahi", CLOSED: "band" }[req.status] || req.status}` : "";
  $("#k-sub").textContent = `Pine Labs block mein bache ${rs(k.left)}${lastTxt}${reqTxt}`;
  const tag = document.querySelector('[data-tag="pinelabs"]');
  if (tag && p.last_call) {
    const real = p.last_call.api === "real";
    tag.textContent = real ? "REAL API (SANDBOX)" : "DEMO FALLBACK";
    tag.setAttribute("fill", real ? "#037A40" : "#7A5A00");
  }
}

function renderClock() {
  const ph = state && state.phase;
  $("#now").textContent = hhmm(state && state.now_ist) || "--:--";
  $("#phase").textContent = ph ? `Phase: ${ph}` : "Run ka intezaar";
  let cur = STOPS.findIndex((s) => s.phase === ph);
  if (ph === "COOK_REPLY") cur = STOPS.length - 1;
  $("#line").innerHTML = STOPS.map((s, i) => {
    const cls = [i < cur ? "done" : "", i === cur ? "cur" : "", s.sunita ? "sunita" : ""].join(" ");
    return `<div class="stop ${cls}" style="left:${6 + (i * 86) / (STOPS.length - 1)}%"><i></i>${esc(s.at)} ${esc(s.label)}</div>`;
  }).join("");
}

function renderBusy() {
  const el = $("#busy");
  const ago = (Date.now() - lastEventAt) / 1000;
  if (lastEventAt && ago < 12) { el.className = "busy on"; el.textContent = `Baari kaam kar raha hai · ${lastTool}`; }
  else if (!lastEventAt || ago > 300) { el.className = "busy idle"; el.textContent = "Baari ka intezaar"; }
  else { el.className = "busy idle"; el.textContent = `Sab shaant · aakhri call ${Math.round(ago / 60) || 1} min pehle`; }
}

// ---- data
function ingest(ev, animate) {
  if (seen.has(ev.id)) return;
  seen.add(ev.id);
  lastId = Math.max(lastId, ev.id);
  if (ev.rail === "system" && /new day/i.test(ev.summary || "")) {
    for (const t of Object.values(track)) { t.calls = 0; t.fails = 0; t.count.textContent = ""; t.last.textContent = ""; t.lamp.setAttribute("class", "lamp"); t.carsG.innerHTML = ""; }
    chats.Papa.length = 0; chats.Sunita.length = 0;
    return;
  }
  if (ev.chat) addChat(ev.chat, ev);
  for (const c of ev.chats || []) addChat(c, ev);
  const t = track[ev.rail];
  if (!t) return;
  if (animate) { t.queue.push(ev); next(t); lastEventAt = Date.now(); lastTool = ev.tool || ev.rail; }
  else settle(t, ev);
}

async function poll(first) {
  try {
    const [s, e] = await Promise.all([
      fetch(`${BASE}/state`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`${BASE}/events?after=${lastId}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ events: [] })),
    ]);
    state = s;
    const evs = (e.events || []).slice().sort((a, b) => a.id - b.id);
    if (first) {
      // history settles without animation, from the last new-day reset on
      for (const ev of evs) ingest(ev, false);
      const last = evs[evs.length - 1];
      if (last) { lastEventAt = Date.parse(String(last.at_ist).replace(" ", "T") + "+05:30") || 0; lastTool = last.tool || last.rail; }
    } else for (const ev of evs) ingest(ev, true);
    if (s.household) $("#house").textContent = `${s.household.name} parivar · Flat ${s.household.flat}`;
    renderFeed(); renderKhata(); renderClock(); points();
    renderChat("Papa", chats.Papa);
    renderChat("Sunita", chats.Sunita.length ? chats.Sunita : sunitaFromState());
  } catch (err) {
    console.error("live poll", err);
    $("#busy").className = "busy idle";
    $("#busy").textContent = "Rails se connection toota, dobara koshish…";
  }
}

let audio;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-play]");
  if (!b) return;
  if (audio && !audio.paused) { audio.pause(); return; }
  audio = new Audio(b.dataset.play);
  audio.play().catch(() => {});
});

// ---- chaos panel (/live?chaos=1, PRD 17 item 2): five presets on rails.
// It only arms the failure; the next phase run is where Baari meets it.
const CHAOS = [
  ["chaos_no_rider", "Rider nahi mila", "Delhivery late, hop finds no rider"],
  ["chaos_low_balance", "Paisa kam hai", "Reserve Pay block almost empty"],
  ["chaos_timeout", "Server so gaya", "next debit hangs past the timeout"],
  ["chaos_malformed", "Kachra reply", "tracking returns a broken body"],
  ["chaos_papa_voice", "Papa ka voice note", "Papa asks for aloo puri, in Hindi"],
];
function devKey() {
  try { const v = JSON.parse(localStorage.getItem("baari-dev:key") || "null"); if (v) return v; } catch {}
  const k = prompt("Dev key (same as /dev)") || "";
  try { if (k) localStorage.setItem("baari-dev:key", JSON.stringify(k)); } catch {}
  return k;
}
function chaosPanel() {
  const el = document.createElement("section");
  el.className = "chaos";
  el.setAttribute("aria-label", "Chaos panel");
  el.innerHTML = `<h3>Jury, ek musibat chuniye</h3><div class="chaos-row">${CHAOS.map(([n, l, d]) => `<button data-chaos="${n}"><b>${esc(l)}</b><small>${esc(d)}</small></button>`).join("")}</div><p id="chaos-msg" aria-live="polite">Button dabao, phir agla phase chalao. Baari khud raasta dhoondhega.</p>`;
  $(".stage").appendChild(el);
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-chaos]");
    if (!b || b.disabled) return;
    const msg = $("#chaos-msg");
    for (const x of el.querySelectorAll("button")) x.disabled = true;
    msg.textContent = "Laga rahe hain…";
    try {
      let key = devKey();
      let res = await fetch("/api/chaos", { method: "POST", headers: { "content-type": "application/json", "x-dev-key": key }, body: JSON.stringify({ name: b.dataset.chaos }) });
      if (res.status === 401) {
        try { localStorage.removeItem("baari-dev:key"); } catch {}
        key = devKey();
        res = await fetch("/api/chaos", { method: "POST", headers: { "content-type": "application/json", "x-dev-key": key }, body: JSON.stringify({ name: b.dataset.chaos }) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      for (const x of el.querySelectorAll("button")) x.classList.toggle("armed", x === b);
      msg.textContent = `"${b.querySelector("b").textContent}" laga diya. Ab agla phase chalao.`;
    } catch (err) {
      msg.textContent = `Nahi laga: ${err.message}`;
    } finally {
      for (const x of el.querySelectorAll("button")) x.disabled = false;
    }
  });
}

drawMap();
if (new URLSearchParams(location.search).get("chaos") === "1") chaosPanel();
poll(true);
setInterval(() => poll(false), 1500);
setInterval(renderBusy, 1000);
