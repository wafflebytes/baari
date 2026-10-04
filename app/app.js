// Baari household app. A window onto what the agent did: every number comes
// from GET /app/state (rails, PRD 11.3), the activity from /app/events. No
// state of its own, no decisions. Votes deep-link into the Telegram bot.
const RAILS = "https://baari-rails.vercel.app";
const onPages = /pages\.dev$|baari\./.test(location.hostname);
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
const BOT = "Baari_ken_bot";

// The six dishes in the household KB. file: the thali render in /img/dishes
// (webp, png fallback). mins: cook time. Anything else on rails is a test.
const DISHES = {
  "Rajma chawal": { file: "rajma", hi: "राजमा चावल", mins: 50 },
  "Lauki chana dal": { file: "lauki-chana-dal", hi: "लौकी चना दाल", mins: 35 },
  "Palak paneer roti": { file: "palak-paneer", hi: "पालक पनीर रोटी", mins: 40 },
  "Kadhi chawal": { file: "kadhi", hi: "कढ़ी चावल", mins: 45 },
  "Aloo puri": { file: "aloo-puri", hi: "आलू पूरी", mins: 40 },
  "Egg bhurji paratha": { file: "egg-bhurji", hi: "अंडा भुर्जी पराठा", mins: 30 },
};
const PEOPLE = ["Vinay", "Mummy", "Papa"];
const BRAND = {
  pinelabs: { name: "Pine Labs", src: "/img/brands/pinelabs.svg" },
  delhivery: { name: "Delhivery", src: "/img/brands/delhivery.png" },
  gnani: { name: "Gnani", src: "/img/brands/gnani.svg" },
  telegram: { name: "Telegram", src: "/img/brands/telegram.svg" },
};

let state = null;
let events = [];
let lastOk = 0;
let lastEvent = 0;
let failed = false;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (t) => String(t || "").charAt(0).toUpperCase() + String(t || "").slice(1);
const dishName = (d) => (d && typeof d === "object" ? d.dish : d) || "";
const dish = (name) => DISHES[name] || { file: null, hi: "", mins: 40 };

// Rails keeps last night's parcel, rider and brief until tonight's run
// overwrites them, and a clock test can leave a shortlist behind. Show only
// what belongs to tonight: KB dishes, and delivery or brief once a dish is locked.
function fresh(s) {
  if (!s) return s;
  const out = { ...s };
  out.shortlist = (s.shortlist || []).filter((d) => DISHES[dishName(d)]);
  if (out.shortlist.length < 2) out.shortlist = [];
  const won = s.locked && DISHES[s.locked.winner];
  if (!won) out.locked = null;
  if (!won) out.delivery = { kirana_pickup: [] };
  if (!won || !/BRIEF|COOK/.test(s.phase || "")) out.brief = {};
  return out;
}

// The last good state paints instantly on reopen; the poll replaces it.
const CACHE_KEY = "baari:state";
if (!FIXTURE) {
  try { state = fresh(JSON.parse(localStorage.getItem(CACHE_KEY))); } catch (e) { state = null; }
}

// Indian grouping, rupees from paise: 476000 -> "₹4,760"
function rs(paise) {
  return "₹" + Math.round((paise || 0) / 100).toLocaleString("en-IN");
}
function hhmm(iso) {
  if (!iso) return "";
  const m = String(iso).match(/T(\d{2}):(\d{2})/) || String(iso).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}
// "21:30" -> "9:30 pm"
function clock(t) {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
}
const istMs = (iso) => (iso ? Date.parse(String(iso).replace(" ", "T") + (/[+Z]/.test(String(iso).slice(10)) ? "" : "+05:30")) || 0 : 0);
const nowMs = () => istMs(state && state.now_ist) || Date.now();

function brand(k, cls = "") {
  const b = BRAND[k];
  return `<img class="brand-logo ${cls} b-${k}" src="${b.src}" alt="${b.name}" loading="lazy">`;
}

// The thali render, with a steel thali drawn in CSS underneath in case the
// image fails.
function thali(name, cls = "") {
  const f = dish(name).file;
  const css = `<span class="thali-css" aria-hidden="true"><i></i><i></i><i></i></span>`;
  if (!f) return `<span class="thali nophoto ${cls}">${css}</span>`;
  return `<span class="thali ${cls}"><picture><source srcset="/img/dishes/${f}.webp" type="image/webp"><img src="/img/dishes/${f}.png" alt="" decoding="async" onerror="this.closest('.thali').classList.add('nophoto')"></picture>${css}</span>`;
}

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 5.3 20 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.2l-4.3-4.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V6a5 5 0 0 1 10 0v1h3l1 15H3L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h12v10H2zm12 4h4.5l3.5 3.5V15h-8zM6 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 2.5A9.5 9.5 0 1 0 21.5 16 8 8 0 0 1 14.5 2.5z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M11 1h2v4h-2zm0 18h2v4h-2zM1 11h4v2H1zm18 0h4v2h-4zM4.2 2.8l2.9 2.9-1.4 1.4-2.9-2.9zm14.1 14.1 2.9 2.9-1.4 1.4-2.9-2.9zM2.8 19.8l2.9-2.9 1.4 1.4-2.9 2.9zM16.9 5.7l2.9-2.9 1.4 1.4-2.9 2.9z"/></svg>',
  pot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v3h-2zM4 8h16v2h1v2h-1v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6H3v-2h1zm2-1.5c0-.8.7-1.5 1.5-1.5h9c.8 0 1.5.7 1.5 1.5V7H6z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>',
};

// The drawn check (transitions.dev success check). It draws only when the
// thing it marks has just become true; otherwise it sits still.
function tick(key, done) {
  if (!done) return "";
  const isNew = render.prevDone && !render.prevDone.has(key);
  render.nextDone.add(key);
  return `<span class="t-success-check" data-state="${isNew ? "in" : "static"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
// Number pop-in: a figure that changed since the last paint re-enters digit by digit.
function num(key, text) {
  const prev = render.prevNums && render.prevNums[key];
  render.nextNums[key] = text;
  if (prev === undefined || prev === text) return `<span class="numv">${esc(text)}</span>`;
  const ch = [...text];
  return `<span class="t-digit-group is-animating numv" aria-label="${esc(text)}">${ch.map((c, i) => `<span class="t-digit"${i === ch.length - 2 ? ' data-stagger="1"' : i === ch.length - 1 ? ' data-stagger="2"' : ""} aria-hidden="true">${esc(c)}</span>`).join("")}</span>`;
}

async function load() {
  try {
    if (FIXTURE) {
      state = await (await fetch(`/fixtures/${FIXTURE}.json`)).json();
    } else {
      const base = onPages ? "/api" : `${RAILS}/app`;
      const [s, e] = await Promise.all([
        fetch(`${base}/state`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${base}/events?after=${lastEvent}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);
      state = fresh(s);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch (err) { /* private mode */ }
      for (const ev of e.events || []) if (!events.some((x) => x.id === ev.id)) events.push(ev);
      events.sort((a, b) => a.id - b.id);
      if (events.length) lastEvent = events[events.length - 1].id;
      events = events.slice(-200);
    }
    lastOk = Date.now();
    failed = false;
  } catch (err) {
    console.warn("state fetch failed", err);
    failed = true;
  }
  render();
}

// ---- what Baari is doing this second, from the newest event

const DOING = {
  "tg.send": "Messaging the family", "tg.voice": "Sending Sunita her voice note", "tg.updates": "Reading Telegram",
  "pl.balance": "Checking the Reserve Pay block", fetch_sbmd_subscription: "Checking the Reserve Pay block",
  "pl.debit": "Paying through Pine Labs", "pl.payee": "Paying Sharma Kirana", speech_to_text: "Listening to a voice note",
  text_to_speech: "Recording Sunita's brief", pincode_serviceability: "Checking Delhivery reaches Rohini",
  calculate_shipping_cost: "Pricing the parcel", create_shipment: "Booking Delhivery", track_shipment: "Tracking the parcel",
  hyperlocal_create_order: "Looking for a rider",
};
function doing() {
  const ev = events[events.length - 1];
  if (ev && Date.now() - istMs(ev.at_ist) < 90000) return { busy: true, text: `${DOING[ev.tool] || "Working"}…` };
  const step = steps(state).find((s) => !s.done);
  return { busy: false, text: step ? `Next: ${step.next}` : "All done for today" };
}

function header(title, opts = {}) {
  const stale = !FIXTURE && Date.now() - lastOk > 15000;
  const d = doing();
  const h = state.household || {};
  return `<header class="top rv" style="--i:0">
    <div class="who"><span class="mark" aria-hidden="true"></span><span>${esc(h.name || "Sharma")} ghar <em>·</em> Flat ${esc(h.flat || "402")}</span></div>
    <span class="live ${stale ? "stale" : d.busy ? "busy" : ""}" role="status"><i></i>${stale ? "Reconnecting" : FIXTURE ? "Demo" : "Live"}</span>
  </header>
  <div class="title rv" style="--i:1">
    <h1>${esc(title)}</h1>
    ${opts.sub ? `<p class="title-sub">${opts.sub}</p>` : `<p class="status ${d.busy ? "on" : ""}"><i aria-hidden="true"></i><span class="t-shimmer" data-text="${esc(d.text)}">${esc(d.text)}</span></p>`}
  </div>`;
}

// ---- the night, step by step

function steps(s) {
  const L = s.locked || {};
  const win = L.winner;
  const list = (s.shortlist || []).map(dishName).filter(Boolean);
  const v = s.votes || {};
  const voted = (v.voted || []).length;
  const d = s.delivery || {};
  const k = s.khata || {};
  const b = s.brief || {};
  const dl = d.waybill && stageIndex(d.status) >= 4;
  const paid = (k.debits || []).find((x) => x.status === "SUCCESS");
  const staples = (s.missing || []).filter((m) => m.route !== "kirana").map((m) => cap(m.item || m));
  const eta = istMs(d.expected);
  const spare = eta ? Math.round((deadlineMs() - eta) / 60000) : null;
  const reply = b.reply_extract && b.reply_extract.commitment;
  const nothingToBuy = !!win && !(s.missing || []).length && !d.waybill;
  return [
    { key: "short", at: "8:30 pm", title: "Two dishes sent", done: list.length > 0, next: "two dishes at 8:30 pm", brand: "telegram",
      body: list.length ? `${esc(list.join(" or "))}, to everyone on Telegram` : "Picked from the pantry and everyone's rules" },
    { key: "vote", at: clock(v.closes_at || "21:30"), title: win ? `${esc(win)} won` : "Votes close", done: !!win, next: `votes close at ${clock(v.closes_at || "21:30")}`,
      body: win ? `${L.headcount || 4} eating${L.runner_up ? ` · ${esc(L.runner_up)} goes first next time` : ""}` : list.length ? `${voted} of ${PEOPLE.length} have voted` : "Everyone votes privately" },
    { key: "buy", at: "", title: nothingToBuy ? "Nothing to buy" : "Staples ordered", done: !!(d.waybill || paid || nothingToBuy), next: "order what's missing", brand: paid ? "pinelabs" : null,
      body: d.waybill || paid ? `${staples.length ? esc(staples.join(", ")) + " · " : ""}${paid ? `${rs(paid.amount)} from Reserve Pay` : "booked"}` : nothingToBuy ? "The pantry has it all" : "Dry staples by Delhivery, fresh from the kirana" },
    { key: "land", at: eta ? clock(hhmm(d.expected)) : "", title: dl ? "Parcel delivered" : "Parcel lands", done: !!(dl || nothingToBuy), next: "the parcel", brand: d.waybill ? "delhivery" : null, warn: spare !== null && spare < 0 && !dl,
      body: d.waybill ? (dl ? "In the kitchen" : spare >= 0 ? `${spare} min before the 7:30 cutoff` : `${-spare} min past the cutoff. Baari has a backup`) : "Before 7:30 am" },
    { key: "brief", at: "7:45 am", title: "Sunita's brief", done: !!b.audio_url, next: "Sunita's brief at 7:45 am", brand: b.audio_url ? "gnani" : null,
      body: b.audio_url ? "Hindi voice note sent" : "A Hindi voice note: the dish, the count, the pickup" },
    { key: "cook", at: "8:00 am", title: win ? `Sunita cooks` : "Sunita cooks", done: reply === "confirmed_with_counts", next: "Sunita at 8:00 am",
      body: reply === "confirmed_with_counts" ? "She confirmed the counts" : b.reply_text ? "She replied, Baari is checking" : win ? `${esc(win)} for ${L.headcount || 4}` : "Lunch for the family" },
  ];
}

function night(s, i0) {
  const st = steps(s);
  const cur = st.findIndex((x) => !x.done);
  return `<section class="sec rv" style="--i:${i0}"><div class="sec-h"><h2>Tonight</h2><span class="sec-k">8:30 pm → 8:00 am</span></div>
    <ol class="night">${st.map((x, i) => `<li class="${x.done ? "done" : i === cur ? "cur" : ""}${x.warn ? " warn" : ""}">
      <span class="node">${tick(`step:${x.key}`, x.done)}</span>
      <div class="n-body"><p class="n-t"><b>${x.title}</b>${x.at ? `<span>${x.at}</span>` : ""}</p><p class="n-s">${x.body}</p></div>
      ${x.brand && x.done ? brand(x.brand, "n-brand") : ""}
    </li>`).join("")}</ol></section>`;
}

function ghar() {
  const s = state;
  const list = s.shortlist || [];
  const locked = s.locked && s.locked.winner;
  const hero = locked ? lockedHero(s) : list.length ? voteHero(s, list) : waitingHero();
  return `${header("Ghar")}${hero}${locked ? todo(s) : ""}${night(s, 4)}${poweredBy("Runs on", ["pinelabs", "delhivery", "gnani", "telegram"])}`;
}

function waitingHero() {
  return `<section class="hero rv" style="--i:2">
    <div class="glow" aria-hidden="true"></div>
    <div class="fan" aria-hidden="true">${["Palak paneer roti", "Rajma chawal", "Kadhi chawal"].map((n, i) => thali(n, `fan-${i}`)).join("")}</div>
    <p class="kicker">Tomorrow · six dishes in the rotation</p>
    <h2>What should Sunita cook?</h2>
    <p class="hero-sub">Two dishes arrive on Telegram at 8:30 pm, picked from the pantry and everyone's rules. Votes close at 9:30.</p>
  </section>`;
}

function voteHero(s, list) {
  const votes = s.votes || {};
  const voted = votes.voted || [];
  const card = (d, i) => {
    const name = dishName(d);
    const need = (d.missing || []).length;
    return `<article class="opt" style="--d:${i}">
      ${thali(name, "opt-img")}
      <h3>${esc(name)}</h3><p class="hi" lang="hi">${esc(d.hindi || dish(name).hi)}</p>
      <p class="opt-m">${dish(name).mins} min · ${need ? `${need} to buy` : "all in the pantry"}</p>
    </article>`;
  };
  return `<section class="hero vote rv" style="--i:2">
    <div class="glow" aria-hidden="true"></div>
    <p class="kicker">Tomorrow · votes close ${clock(votes.closes_at || "21:30")}</p>
    <div class="opts">${card(list[0], 0)}<span class="vs" aria-hidden="true">or</span>${card(list[1], 1)}</div>
    <div class="voters"><div class="faces">${PEOPLE.map((p, i) => `<span class="voter ${voted.includes(p) ? "in" : ""}" style="--i:${i}" title="${p}${voted.includes(p) ? " voted" : ""}"><b>${p[0]}</b><i>${ICON.check}</i></span>`).join("")}</div>
      <p><b>${voted.length === PEOPLE.length ? "Everyone's in" : `${voted.length} of ${PEOPLE.length} voted`}</b><span>Only Vinay sees who picked what</span></p></div>
    <a class="btn light" href="https://t.me/${BOT}">${brand("telegram", "btn-ic")}Vote on Telegram</a>
  </section>`;
}

function lockedHero(s) {
  const L = s.locked;
  const w = dish(L.winner);
  return `<section class="hero locked rv" style="--i:2">
    <div class="glow" aria-hidden="true"></div>
    <div class="hero-plate">${thali(L.winner, "hero-img")}</div>
    <p class="kicker"><span class="pill">${ICON.check}Locked</span>Tomorrow, Sunita makes</p>
    <h2>${esc(L.winner)}</h2>
    <p class="hero-hi" lang="hi">${esc(L.winner_hindi || w.hi)}</p>
    <dl class="facts">
      <div><dt>Eating</dt><dd>${esc(L.headcount || 4)}</dd></div>
      <div><dt>Cook time</dt><dd>${w.mins}<small> min</small></dd></div>
      <div><dt>Sunita</dt><dd>8:00<small> am</small></dd></div>
    </dl>
    ${L.runner_up && DISHES[L.runner_up] ? `<div class="runner">${thali(L.runner_up, "runner-img")}<p><span>Runner-up</span><b>${esc(L.runner_up)}</b></p><em>First in line next time</em></div>` : ""}
  </section>`;
}

function todo(s) {
  const missing = s.missing || [];
  if (!missing.length) return "";
  const d = s.delivery || {};
  const row = (m) => {
    const item = m.item || m;
    const kirana = m.route === "kirana" || (d.kirana_pickup || []).some((p) => (p.item || p) === item);
    return `<li><span class="ic ${kirana ? "k" : ""}">${kirana ? ICON.bag : ICON.truck}</span><p><b>${esc(cap(item))}</b><span>${kirana ? "Sunita picks up at Sharma Kirana, 7:40 am" : `Delhivery${d.status ? ` · ${esc(STAGES[stageIndex(d.status)].toLowerCase())}` : ""}`}</span></p></li>`;
  };
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>To get</h2><a class="more" href="#/delivery">Track ${ICON.arrow}</a></div>
    <ul class="rows">${missing.map(row).join("")}</ul></section>`;
}

function poweredBy(label, keys) {
  return `<footer class="powered rv" style="--i:7"><span>${label}</span><div>${keys.map((k) => brand(k)).join("")}</div></footer>`;
}

// ---- Khata

function khata() {
  const k = state.khata || {};
  const used = k.used || 0;
  const total = k.block_total || 500000;
  const capToday = k.cap_today || 40000;
  const spent = k.spent_today || 0;
  const left = k.left ?? total - used;
  const pct = Math.min(1, spent / capToday);
  const debits = (k.debits || []).slice().reverse();
  const R = 52, C = 2 * Math.PI * R;
  const status = (d, i) => d.status === "SUCCESS" ? `<span class="st ok">${tick(`debit:${d.ref || i}`, true)}Paid</span>` : d.status === "FAILED" ? '<span class="st bad">Failed</span>' : '<span class="st wait"><i></i>Pending</span>';
  return `${header("Khata", { sub: "Every rupee Baari spends, inside limits it can't change" })}
    <section class="sec rv" style="--i:2"><div class="t-tilt"><div class="card t-tilt-card">
      <div class="card-glare" aria-hidden="true"></div>
      <div class="card-top"><span>UPI Reserve Pay</span>${brand("pinelabs", "on-dark")}</div>
      <p class="card-k">Left in the block</p>
      <p class="card-v">${num("left", rs(left))}</p>
      <div class="card-bar"><i style="width:${Math.max(1, Math.round((used / total) * 100))}%"></i></div>
      <div class="card-foot"><span>${rs(used)} used of ${rs(total)}</span><span>Set up by Vinay</span></div>
    </div></div></section>
    <section class="sec rv" style="--i:3"><div class="today">
      <div class="ring-w"><svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="ring-bg"/><circle cx="60" cy="60" r="${R}" class="ring-fg ${pct >= 0.8 ? "warn" : ""}" stroke-dasharray="${C.toFixed(1)}" style="--c:${C.toFixed(1)};--off:${(C * (1 - pct)).toFixed(1)}"/></svg>
      <div class="ring-c"><b>${num("spent", rs(spent))}</b><span>of ${rs(capToday)}</span></div></div>
      <ul class="rules">
        <li>${ICON.lock}<span><b>${rs(capToday)} a day</b>All payments together</span></li>
        <li>${ICON.lock}<span><b>Above ₹300</b>Waits for Vinay's yes</span></li>
        <li>${ICON.lock}<span><b>One shop</b>Sharma Kirana, nobody else</span></li>
      </ul>
    </div></section>
    <section class="sec rv" style="--i:4"><div class="sec-h"><h2>Today</h2>${state.date_for ? `<a class="more" href="/receipt/${esc(state.date_for)}">Receipt ${ICON.arrow}</a>` : ""}</div>
      ${debits.length ? `<ul class="rows ledger">${debits.map((d, i) => `<li><span class="ic ${/kirana/i.test(d.to || "") ? "k" : ""}">${/kirana/i.test(d.to || "") ? ICON.bag : ICON.truck}</span><p><b>${esc(d.to || "Baari staples hub")}</b><span class="mono">${esc(d.ref || d.note || "")}</span></p><div class="r"><b class="amt">${rs(d.amount)}</b>${status(d, i)}</div></li>`).join("")}</ul>` : '<div class="empty"><b>Nothing spent yet</b>The first payment happens after the vote.</div>'}
    </section>
    <p class="fine rv" style="--i:5">Baari can't add a shop or raise a limit. Only Vinay can, from his bank app.</p>
    ${poweredBy("Payments by", ["pinelabs"])}`;
}

// ---- Delivery

// Sunita cooks at 8:00, so the staples must land by 7:30 the next morning.
function deadlineMs() {
  const n = new Date(nowMs() + 5.5 * 3600e3);
  let d = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 7, 30) - 5.5 * 3600e3;
  if (d <= nowMs()) d += 864e5;
  return d;
}
function whenLabel(iso) {
  const t = istMs(iso);
  if (!t) return "";
  const ist = (ms) => new Date(ms + 5.5 * 3600e3);
  const a = ist(t), n = ist(nowMs());
  const days = Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 864e5);
  const h = a.getUTCHours(), m = String(a.getUTCMinutes()).padStart(2, "0");
  const day = days === 0 ? "Today" : days === 1 ? "Tomorrow" : a.toISOString().slice(5, 10);
  return `${day}, ${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

const STAGES = ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"];
function stageIndex(st) {
  const s = String(st || "").toLowerCase();
  if (/deliver(ed)?$|^dl$/.test(s) && !/out/.test(s)) return 4;
  if (/out for/.test(s)) return 3;
  if (/transit|pending|dispatched/.test(s)) return 2;
  if (/picked/.test(s)) return 1;
  return 0;
}

// The night as a sky, 9 pm to 8:30 am. The parcel sits at its expected
// time; the 7:30 cutoff is a hard line.
function sky(d) {
  const end = deadlineMs() + 60 * 60000;
  const start = end - 11.5 * 3600e3;
  const x = (ms) => Math.max(3, Math.min(97, ((ms - start) / (end - start)) * 100));
  const eta = istMs(d.expected);
  const late = eta > deadlineMs();
  const ticks = [["10 pm", 1], ["midnight", 3], ["2 am", 5], ["4 am", 7], ["6 am", 9]].map(([l, h]) => `<span class="tk" style="left:${x(start + h * 3600e3)}%">${l}</span>`).join("");
  return `<div class="sky ${late ? "late" : ""}">
    <span class="sky-moon">${ICON.moon}</span><span class="sky-sun">${ICON.sun}</span>
    <div class="track"><span class="cut" style="left:${x(deadlineMs())}%"><b>7:30 cutoff</b></span>
      ${eta ? `<span class="parcel" style="--x:${x(eta)}%">${ICON.truck}</span>` : ""}</div>
    <div class="ticks">${ticks}</div>
  </div>`;
}

function delivery() {
  const d = state.delivery || {};
  const idx = stageIndex(d.status);
  const eta = istMs(d.expected);
  const done = idx >= 4;
  const late = eta && eta > deadlineMs() && !done;
  const spare = eta ? Math.round((deadlineMs() - eta) / 60000) : 0;
  const pickup = (d.kirana_pickup || []).map((p) => cap(p.item || p));
  if (!d.waybill) {
    return `${header("Delivery", { sub: "Dry staples ship overnight. Fresh things come from the kirana." })}
      <div class="empty rv" style="--i:2"><b>No parcel tonight</b>Baari books Delhivery right after the vote, and only if something's missing.</div>
      ${pickup.length ? kirana(pickup) : ""}${d.hop ? `<section class="sec rv" style="--i:6">${riderCard(d.hop)}</section>` : ""}
      ${poweredBy("Shipping by", ["delhivery"])}`;
  }
  const parcel = (state.missing || []).filter((m) => m.route !== "kirana" && !pickup.includes(cap(m.item || m))).map((m) => cap(m.item || m));
  return `${header("Delivery", { sub: `${done ? "Delivered" : late ? "Running late" : "On its way"} · waybill ${esc(d.waybill)}` })}
    <section class="sec rv" style="--i:2"><div class="night-card ${late ? "late" : ""}">
      <p class="eta-k">${done ? "Delivered" : "Lands"}</p>
      <p class="eta-v">${esc(d.expected ? whenLabel(d.expected) : "Before 7:30 am")}</p>
      ${!done && eta ? `<p class="eta-s">${late ? `${-spare} min past the 7:30 cutoff. Baari is lining up a backup.` : `${spare} min before Sunita needs it`}</p>` : ""}
      ${sky(d)}
    </div></section>
    <section class="sec rv" style="--i:3"><ol class="stages">${STAGES.map((st, i) => `<li class="${i < idx || done ? "done" : i === idx ? "cur" : ""}"><span class="node">${tick(`stage:${i}`, i < idx || done)}</span><b>${st}</b>${i === idx && d.seen_at && !done ? `<span>Checked ${esc(clock(hhmm(d.seen_at)))}</span>` : ""}</li>`).join("")}</ol></section>
    <section class="sec rv" style="--i:4"><dl class="slab">
      ${parcel.length ? `<div><dt>In the box</dt><dd>${esc(parcel.join(", "))}</dd></div>` : ""}
      <div><dt>Waybill</dt><dd><button class="copy" data-copy="${esc(d.waybill)}" aria-label="Copy waybill"><span class="mono">${esc(d.waybill)}</span><span class="t-icon-swap"><span class="ic-a">${ICON.copy}</span><span class="ic-b">${ICON.check}</span></span></button></dd></div>
      <div><dt>From</dt><dd>Baari staples hub, 110077</dd></div>
      <div><dt>To</dt><dd>Flat 402, Rohini, 110042</dd></div>
    </dl></section>
    ${pickup.length ? kirana(pickup) : ""}
    ${d.hop ? `<section class="sec rv" style="--i:6">${riderCard(d.hop)}</section>` : ""}
    ${poweredBy("Shipping by", ["delhivery"])}`;
}

function kirana(pickup) {
  return `<section class="sec rv" style="--i:5"><div class="kirana"><span class="ic k">${ICON.bag}</span><p><b>${esc(pickup.join(", "))}</b><span>Sunita picks this up at Sharma Kirana on her way in, 7:40 am. Baari pays the shop.</span></p></div></section>`;
}

// The kirana-to-flat rider hop (C10). rider is {name, phone_masked, vehicle}.
const HOP = {
  RIDER_ASSIGNED: ["Rider assigned, heading to the kirana", ""],
  PICKED_UP: ["Picked up from the kirana", ""],
  DELIVERED: ["Delivered to the flat", ""],
  NO_RIDER_AVAILABLE: ["No rider nearby. Baari switched to a backup.", "bad"],
  SLOT_UNAVAILABLE: ["No slot free. Baari switched to a backup.", "bad"],
  CANCELLED_BY_RIDER: ["The rider cancelled. Baari switched to a backup.", "bad"],
};
function riderCard(hop) {
  const name = hop.rider && typeof hop.rider === "object" ? hop.rider.name : hop.rider;
  const [line, tone] = HOP[hop.status] || [cap(String(hop.status || "").toLowerCase().replace(/_/g, " ")), ""];
  const fee = hop.fee && hop.fee.fee;
  return `<div class="rider ${tone}">
    <span class="av">${tone ? "!" : esc((name || "R")[0])}</span>
    <div class="rider-t"><b>${esc(name || "Rider, kirana to flat")}</b><p>${esc(line)}${hop.eta && !tone ? ` · by ${esc(clock(hhmm(hop.eta)))}` : ""}</p>${fee ? `<p>Quote ₹${esc(fee)}${hop.fee.fee_exceeds_item_value ? ", more than the items" : ""}</p>` : ""}</div>
    ${hop.code ? `<span class="code">${esc(hop.code)}</span>` : ""}
  </div>`;
}

// ---- Sunita

// A fixed waveform per clip, so the same note always draws the same shape.
function bars(seed, n = 46) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const env = Math.sin(((i + 0.5) / n) * Math.PI) * 0.6 + 0.4;
    out.push(Math.round((0.3 + (h % 1000) / 1000 * 0.7) * env * 100));
  }
  return out;
}

function sunita() {
  const b = state.brief || {};
  const label = { confirmed_with_counts: ["Confirmed, with counts", "ok"], vague_yes: ["Said yes, no counts", "warn"], item_missing: ["Something ran out", "warn"], refusal: ["Can't make it", "bad"], unclear: ["Unclear, asked again", "warn"] };
  const x = b.reply_extract || {};
  const qty = Object.entries(x.quantities || {}).map(([k, v]) => `${cap(k)} ${v && typeof v === "object" ? v.value : v}`);
  const l = label[b.reply_label || x.commitment] || null;
  const win = state.locked && state.locked.winner;
  const pickup = ((state.delivery && state.delivery.kirana_pickup) || []).map((p) => cap(p.item || p));
  const audio = b.audio_url && !/dummy\.invalid/.test(b.audio_url) ? b.audio_url : null;
  const words = String(b.text || "").split(/\s+/).filter(Boolean);
  return `${header("Sunita ji", { sub: "Cooks at 8:00 every morning. Prefers Hindi voice notes." })}
    <section class="sec rv" style="--i:2"><div class="job ${win ? "" : "none"}">
      ${win ? thali(win, "job-img") : ""}
      <p class="k">Tomorrow she makes</p>
      <p class="v">${esc(win || "Decided at 9:30 pm")}</p>${win ? `<p class="hi" lang="hi">${esc(dish(win).hi)}</p>` : ""}
      <dl><div><dt>For</dt><dd>${esc((state.locked && state.locked.headcount) || 4)}</dd></div><div><dt>Pick up at 7:40</dt><dd>${pickup.length ? esc(pickup.join(", ")) : "Nothing"}</dd></div></dl>
    </div></section>
    <section class="sec rv" style="--i:3"><div class="sec-h"><h2>Morning brief</h2><span class="sec-k">7:45 am</span></div>
    ${audio ? `<div class="note">
        <button class="pp" data-play="${esc(audio)}" aria-label="Play the brief"><span class="t-icon-swap"><span class="ic-a">${ICON.play}</span><span class="ic-b">${ICON.pause}</span></span></button>
        <div class="wave" data-wave>${bars(audio).map((h) => `<i style="height:${h}%"></i>`).join("")}</div>
        <span class="dur" data-dur>0:00</span>
      </div>
      ${words.length ? `<p class="script" lang="hi" data-script>${words.map((w) => `<span>${esc(w)}</span>`).join(" ")}</p>` : ""}
      <p class="by">Voice by ${brand("gnani", "inline")}</p>` : '<div class="empty"><b>Not recorded yet</b>At 7:45 Baari sends her a Hindi voice note: the dish, how many are eating, what to pick up.</div>'}
    </section>
    <section class="sec rv" style="--i:4"><div class="sec-h"><h2>Her reply</h2></div>
    ${b.reply_text ? `<div class="bubble-row"><span class="av">S</span><div class="bubble"><p lang="hi">${esc(b.reply_text)}</p><small>Voice note · transcribed by Gnani</small></div></div>
      <div class="heard"><span class="k">Baari heard</span>${l ? `<span class="chip ${l[1]}">${esc(l[0])}</span>` : ""}${qty.map((q) => `<span class="chip">${esc(q)}</span>`).join("")}</div>` : '<div class="empty"><b>No reply yet</b>Nothing by 8:05 and Baari resends once. By 8:20 it asks Vinay to play the note when she walks in.</div>'}
    </section>`;
}

// ---- Why: every decision and every call

function evText(ev) {
  const s = String(ev.summary || "");
  const val = (k) => { const m = s.match(new RegExp(`"?${k}"?:\\s*"?([^",}]+)`)); return m ? m[1].trim() : ""; };
  const to = val("to");
  const status = val("status") || val("code");
  const said = (s.match(/^text: (.+)/) || [])[1];
  switch (ev.tool) {
    case "tg.send": return ev.ok === false ? `Message to ${to || "the family"} failed` : `Messaged ${to || "the family"}`;
    case "tg.voice": return ev.ok === false ? "Voice note failed to send" : `Voice note to ${to || "Sunita"}`;
    case "tg.updates": return said ? `Read: "${said}"` : "Read new Telegram messages";
    case "pl.balance": case "fetch_sbmd_subscription": return ev.ok === false ? "Couldn't reach the Reserve Pay block" : "Checked the Reserve Pay block";
    case "pl.debit": case "pl.payee": {
      const who = ev.tool === "pl.payee" ? "Sharma Kirana" : "Staples";
      if (ev.ok === false || /INSUFFICIENT|FAIL/i.test(status)) return `${who} payment failed${/INSUFFICIENT/.test(status) ? ": not enough in the block" : ""}`;
      return /SUCCESS/i.test(status) ? `${who} paid` : `${who} payment sent, waiting on the bank`;
    }
    case "speech_to_text": return ev.ok === false ? "Couldn't make out a voice note" : said ? `Heard: "${said}"` : "Transcribed a voice note";
    case "text_to_speech": return ev.ok === false ? "Hindi voice note failed" : "Recorded a Hindi voice note";
    case "pincode_serviceability": return "Checked Delhivery reaches 110042";
    case "calculate_shipping_cost": return "Priced the parcel";
    case "create_shipment": return /success\\?"?:\s*fa|ClientWarehouse|"error":true/.test(s) ? "Delhivery booking failed" : "Booked Delhivery";
    case "track_shipment": return `Tracked the parcel${status ? `: ${status}` : ""}`;
    case "hyperlocal_create_order": return ev.ok === false ? "No rider found" : "Booked a rider";
  }
  if (said) return said;
  return s.startsWith("{") ? `${ev.tool} ran` : s.slice(0, 120);
}
function evBad(ev) {
  return ev.ok === false || /failed|No rider|Couldn't/.test(evText(ev));
}

function decItem(d) {
  const s = `${d.rule} ${d.text}`;
  const tone = /fail|FAILED|INSUFFICIENT|nahi mila/i.test(s) ? "bad" : /nahi|late|retry|error|\bE\d|veto|\bV2|\bC4|\bM5/i.test(s) ? "warn" : "ok";
  const more = d.input || d.said_did || d.via;
  return `<li class="dec ${tone}">
    <button class="dec-h" ${more ? `aria-expanded="false"` : "disabled"}><span class="rule">${esc(d.rule || "·")}</span><span class="dec-t">${esc(d.text || d.decided || "")}</span><span class="at">${esc(d.at || "")}</span>${more ? `<span class="chev">${ICON.chev}</span>` : ""}</button>
    ${more ? `<div class="t-acc-panel"><div class="t-acc-panel-inner">${d.input ? `<p><span>Saw</span>${esc(d.input)}</p>` : ""}${d.said_did ? `<p><span>Did</span>${esc(d.said_did)}</p>` : ""}${d.via ? `<p><span>Via</span>${esc(d.via)}</p>` : ""}</div></div>` : ""}
  </li>`;
}

function baari() {
  const dec = (state.decisions || []).slice().reverse();
  const evs = events.slice(-30).reverse();
  return `${header("Why", { sub: "Every decision Baari made, with the household rule behind it" })}
    <section class="sec rv" style="--i:2">${dec.length ? `<ol class="decs">${dec.map(decItem).join("")}</ol>` : '<div class="empty"><b>Tonight\'s first run hasn\'t started</b>Dishes go out at 8:30 pm. Votes close at 9:30.</div>'}</section>
    <section class="sec rv" style="--i:3"><div class="sec-h"><h2>Every call</h2><span class="sec-k">Live</span></div>
    ${evs.length ? `<ul class="calls">${evs.map((ev) => `<li class="${evBad(ev) ? "bad" : ""}">${BRAND[ev.rail] ? `<span class="call-b">${brand(ev.rail)}</span>` : `<span class="call-b sys">${ICON.pot}</span>`}<p>${esc(cap(evText(ev)))}</p><span class="at">${esc(hhmm(ev.at_ist))}</span></li>`).join("")}</ul>` : '<div class="empty"><b>Quiet right now</b>Calls show up here the moment a run starts.</div>'}</section>`;
}

// ---- render

const ROUTES = { "": ghar, khata, delivery, sunita, baari };
function routeNow() { return location.hash.replace(/^#\/?/, "").split("/")[0]; }
function render() {
  const route = routeNow();
  const view = ROUTES[route] || ghar;
  movePill(route, render.route !== undefined);
  const app = $("#app");
  if (!state && failed) {
    app.innerHTML = `<div class="empty offline"><b>Can't reach Baari</b>Check the connection. Trying again every 5 seconds.</div>`;
    render.last = null;
    return;
  }
  if (!state) {
    app.innerHTML = `<div class="skel" aria-label="Loading"><i style="width:44%;height:14px"></i><i style="width:60%;height:44px"></i><i style="height:360px;border-radius:32px;margin-top:28px"></i><i style="height:64px"></i><i style="height:64px"></i></div>`;
    return;
  }
  // The poll runs every 5 s: redraw only when something changed. Sections
  // rise in on a new screen, not on every redraw; a check or a number
  // animates only when it changed since the last paint.
  const sameRoute = route === render.route && render.last;
  render.nextDone = new Set();
  render.nextNums = {};
  if (!sameRoute) { render.prevDone = null; render.prevNums = null; }
  const html = view();
  if (html === render.last && sameRoute) return;
  app.classList.toggle("enter", !sameRoute);
  render.last = html;
  render.route = route;
  render.prevDone = render.nextDone;
  render.prevNums = render.nextNums;
  const open = [...app.querySelectorAll('.dec-h[aria-expanded="true"] .dec-t')].map((p) => p.textContent);
  app.innerHTML = html;
  app.querySelectorAll(".dec-h").forEach((b) => {
    if (open.includes(b.querySelector(".dec-t").textContent)) b.setAttribute("aria-expanded", "true");
  });
  syncPlayer();
}

// Bottom nav: the active pill slides between tabs (transitions.dev tabs sliding).
function movePill(route, animate) {
  const nav = $(".nav");
  const pill = nav.querySelector(".nav-pill");
  let on = null;
  nav.querySelectorAll("a").forEach((a) => {
    const is = a.dataset.tab === (ROUTES[route] && route ? route : "ghar");
    a.classList.toggle("on", is);
    if (is) { on = a; a.setAttribute("aria-current", "page"); } else a.removeAttribute("aria-current");
  });
  if (!on) return;
  const set = () => { pill.style.transform = `translateX(${on.offsetLeft}px)`; pill.style.width = `${on.offsetWidth}px`; };
  if (!animate) {
    const prev = pill.style.transition;
    pill.style.transition = "none";
    set();
    void pill.offsetWidth;
    pill.style.transition = prev;
  } else set();
}
addEventListener("resize", () => movePill(routeNow(), false));

// ---- audio: the button swaps icons, the waveform fills, the script lights up

const player = { audio: null, url: null };
function fmt(s) { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function syncPlayer() {
  const btn = document.querySelector("[data-play]");
  if (!btn) return;
  const a = player.audio;
  const mine = a && player.url === btn.dataset.play;
  const p = mine && isFinite(a.duration) && a.duration ? a.currentTime / a.duration : 0;
  btn.classList.toggle("is-on", !!(mine && !a.paused));
  document.querySelectorAll("[data-wave] i").forEach((b, i, all) => b.classList.toggle("on", (i + 1) / all.length <= p));
  document.querySelectorAll("[data-script] span").forEach((w, i, all) => w.classList.toggle("on", !!mine && p > 0 && (i + 0.5) / all.length <= p + 0.04));
  const dur = document.querySelector("[data-dur]");
  if (dur && mine && isFinite(a.duration)) dur.textContent = fmt(a.currentTime > 0 ? a.currentTime : a.duration);
}
function tickPlayer() {
  syncPlayer();
  if (player.audio && !player.audio.paused) requestAnimationFrame(tickPlayer);
}

// Rails streams clips without a length, so the browser never learns the
// duration and the waveform can't fill. Load the clip once as a blob instead.
async function playClip(url) {
  if (!player.audio || player.url !== url) {
    if (player.audio) player.audio.pause();
    player.url = url;
    let src = url;
    try { src = URL.createObjectURL(await (await fetch(url)).blob()); } catch (err) { /* stream it */ }
    if (player.url !== url) return;
    const au = new Audio(src);
    player.audio = au;
    au.addEventListener("ended", () => { au.currentTime = 0; syncPlayer(); });
    // A clip with no length header reports Infinity until the browser has
    // scanned it; seeking far past the end forces the scan.
    await new Promise((ok) => { au.addEventListener("loadedmetadata", ok, { once: true }); setTimeout(ok, 3000); });
    if (!isFinite(au.duration)) {
      await new Promise((ok) => { au.addEventListener("durationchange", ok, { once: true }); au.currentTime = 1e101; setTimeout(ok, 1500); });
      au.currentTime = 0;
    }
  }
  player.audio.play().then(tickPlayer).catch(syncPlayer);
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-play]");
  if (b) {
    if (player.audio && player.url === b.dataset.play && !player.audio.paused) { player.audio.pause(); syncPlayer(); return; }
    playClip(b.dataset.play);
    return;
  }
  const c = e.target.closest("[data-copy]");
  if (c) {
    if (navigator.clipboard) navigator.clipboard.writeText(c.dataset.copy).catch(() => {});
    c.classList.add("is-copied");
    setTimeout(() => c.classList.remove("is-copied"), 1400);
    return;
  }
  const h = e.target.closest(".dec-h[aria-expanded]");
  if (h) h.setAttribute("aria-expanded", h.getAttribute("aria-expanded") === "true" ? "false" : "true");
});

// The Reserve Pay card leans toward the pointer (transitions.dev card tilt):
// tracked on the flat wrapper so the moving edges never slip out from under it.
document.addEventListener("pointermove", (e) => {
  const w = e.target.closest && e.target.closest(".t-tilt");
  document.querySelectorAll(".t-tilt.is-tilting").forEach((x) => { if (x !== w) x.classList.remove("is-tilting"); });
  if (!w || e.pointerType === "touch") return;
  const r = w.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  w.classList.add("is-tilting");
  w.style.setProperty("--rx", `${((0.5 - py) * 9).toFixed(2)}deg`);
  w.style.setProperty("--ry", `${((px - 0.5) * 12).toFixed(2)}deg`);
  w.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
  w.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
});

addEventListener("hashchange", () => {
  render();
  scrollTo({ top: 0 });
});

render();
load();
setInterval(() => {
  if (document.visibilityState === "visible") load();
}, 5000);
if ("serviceWorker" in navigator && !FIXTURE) navigator.serviceWorker.register("/sw.js").catch(() => {});
