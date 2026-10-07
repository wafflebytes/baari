import { initInstall } from "./install.js";
import { glass } from "./glass.js";
import { splash, fab } from "./shell.js";
import { onboard, needsOnboarding } from "./onboard.js";
import { haptic, burst, steam, pullToRefresh, enableShake, tilt, dragger, longPress, touch, justDragged } from "./play.js";
import { toast, cookFinder, nudgeSheet } from "./extras.js";

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
  "Rajma chawal": { file: "rajma", tint: "#F7DCCF", hi: "राजमा चावल", mins: 50 },
  "Lauki chana dal": { file: "lauki-chana-dal", tint: "#E6EFCF", hi: "लौकी चना दाल", mins: 35 },
  "Palak paneer roti": { file: "palak-paneer", tint: "#D9EBD5", hi: "पालक पनीर रोटी", mins: 40 },
  "Kadhi chawal": { file: "kadhi", tint: "#FBE9B8", hi: "कढ़ी चावल", mins: 45 },
  "Aloo puri": { file: "aloo-puri", tint: "#F8E3C4", hi: "आलू पूरी", mins: 40 },
  "Egg bhurji paratha": { file: "egg-bhurji", tint: "#FBEDBE", hi: "अंडा भुर्जी पराठा", mins: 30 },
};
const PEOPLE = ["Vinay", "Mummy", "Papa"];
const BRAND = {
  pinelabs: { name: "Pine Labs", src: "/img/brands/pinelabs.svg" },
  delhivery: { name: "Delhivery", src: "/img/brands/delhivery.png" },
  gnani: { name: "Gnani", src: "/img/brands/gnani.svg" },
  telegram: { name: "Telegram", src: "/img/brands/telegram.svg" },
};

// The language picked in onboarding: English, Hinglish or Hindi.
function setup() { try { return JSON.parse(localStorage.getItem("baari:setup")) || {}; } catch (e) { return {}; } }
const LANG = setup().ui || "hing";
const T = (en, hing, hi) => (LANG === "en" ? en : LANG === "hi" ? hi : hing);

// What this phone has played with: seats at the table, extra items on each
// plate, leftovers, a shuffled dish, treat night. Prototype only; none of it
// reaches the agent yet.
const local = (() => { try { return JSON.parse(localStorage.getItem("baari:local")) || {}; } catch (e) { return {}; } })();
const saveLocal = () => { try { localStorage.setItem("baari:local", JSON.stringify(local)); } catch (e) {} };

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
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2 12 3.8l9 7.4-1.3 1.5L19 12.1V20a1 1 0 0 1-1 1h-4.5v-6h-3v6H6a1 1 0 0 1-1-1v-7.9l-.7.6z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 20.5 4l-4 16.5-5-4.5-2.5 3v-4.8l8-7.7-9.7 6.3z"/></svg>',
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
  hyperlocal_create_order: "Looking for a rider", track: "Tracking the parcel", knowledge_base_search: "Reading the household notes",
};
function doing() {
  const recent = [...events].reverse().find((e) => DOING[e.tool]);
  if (recent && Date.now() - istMs(recent.at_ist) < 90000) return { busy: true, text: `${DOING[recent.tool]}…` };
  const step = steps(state).find((s) => !s.done);
  return { busy: false, text: step ? `Next: ${step.next}` : "All done for today" };
}

// Header, Muse-style: you on the left, the house on the right, and Baari in
// the middle as a live island. The bar lives outside the screens, so a
// redraw never rebuilds it: only the words and the edge change. The
// island's own outline is the progress line, drawn round the pill.
function header(title, opts = {}) {
  return title ? `<div class="title rv" style="--i:1"><h1>${esc(title)}</h1>${opts.sub ? `<p class="title-sub">${opts.sub}</p>` : ""}</div>` : "";
}
function renderTop() {
  const top = $("#top");
  if (!top || !state) return;
  const L = liveNow();
  const stale = !FIXTURE && Date.now() - lastOk > 15000;
  const d = doing();
  const tone = stale ? "off" : d.busy ? "busy" : L.cur < 0 ? "done" : "on";
  const line = stale ? T("Offline, retrying", "Offline, phir try", "ऑफ़लाइन") : L.short;
  if (!top.firstElementChild) {
    top.innerHTML = `<button class="hb hb-me" type="button" data-pop="me" aria-label="${T("You", "Aap", "आप")}"></button>
      <button class="isl" type="button" data-isl><svg class="isl-edge" aria-hidden="true"><rect class="isl-eb" pathLength="100"/><rect class="isl-ef" pathLength="100"/></svg>
        <img class="isl-mark" src="/img/baari-mark.png" alt=""><span class="isl-t"></span><span class="isl-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="isl-n" aria-hidden="true"></span></button>
      <button class="hb hb-home" type="button" data-pop="home" aria-label="${T("Your home", "Aapka ghar", "आपका घर")}">${ICON.home}</button>`;
    new ResizeObserver(() => sizeEdge()).observe(top.querySelector(".isl"));
  }
  const me_ = top.querySelector(".hb-me"), isl = top.querySelector(".isl"), t = top.querySelector(".isl-t");
  const av = avatar(me().name, "me");
  if (me_.dataset.av !== av) { me_.innerHTML = av; me_.dataset.av = av; }
  isl.className = `isl ${tone}${asks().length ? " has-n" : ""}${isl.classList.contains("alerting") ? " alerting" : ""}`;
  isl.setAttribute("aria-label", `${L.title}. ${T("Open tonight's run", "Aaj raat ka run kholo", "आज रात का रन खोलो")}`);
  if (t.textContent !== line) {
    t.textContent = line;
    if (t.dataset.ready) { t.classList.remove("swap"); void t.offsetWidth; t.classList.add("swap"); }
    t.dataset.ready = "1";
  }
  t.classList.toggle("t-shimmer", d.busy);
  isl.style.setProperty("--p", (L.cur < 0 ? 1 : Math.max(0.04, L.pct)).toFixed(3));
  // Things waiting for you sit in the island as a small count.
  const n = asks().length, nb = top.querySelector(".isl-n");
  if (nb.textContent !== String(n || "")) { nb.textContent = n || ""; if (n) { nb.classList.remove("bump"); void nb.offsetWidth; nb.classList.add("bump"); } }
}
// The edge is a ring just outside the pill, with a hairline of page between
// them; pathLength 100 makes the dash a straight percentage of the way round.
const EDGE = 5;
function sizeEdge() {
  const isl = document.querySelector("#top .isl");
  if (!isl) return;
  const w = isl.offsetWidth + EDGE * 2, h = isl.offsetHeight + EDGE * 2;
  const svg = isl.querySelector(".isl-edge");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.querySelectorAll("rect").forEach((r) => { r.setAttribute("x", 1.25); r.setAttribute("y", 1.25); r.setAttribute("width", w - 2.5); r.setAttribute("height", h - 2.5); r.setAttribute("rx", (h - 2.5) / 2); });
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
  const hero = local.treat ? treatHero() : locked ? lockedHero(s) : list.length ? voteHero(s, list) : waitingHero();
  return `${header("")}${hero}${locked && !local.treat ? plates() : ""}${locked && !local.treat ? todo(s) : ""}${table(s)}${poweredBy("Runs on", ["pinelabs", "delhivery", "gnani", "telegram"])}`;
}

// Faces are emoji on a soft tint. The family can be edited on this phone;
// the names are what the votes on rails are keyed by.
const FACE = { Vinay: ["🧔🏽", "sand"], Mummy: ["👩🏽", "rose"], Papa: ["👨🏽‍🦳", "sky"], Sunita: ["👩🏽‍🍳", "mint"] };
function fam() { return local.family && local.family.length ? local.family : PEOPLE.map((n) => ({ name: n, face: FACE[n][0], tint: FACE[n][1] })); }
function me() {
  const set = setup();
  return { name: (state && state.household && state.household.duty_holder) || "Vinay", face: set && set.me && set.me.face, tint: set && set.me && set.me.tint };
}
function avatar(name, cls = "") {
  const f = fam().find((x) => x.name === name);
  let [face, tint] = f ? [f.face, f.tint] : FACE[name] || ["🙂", "sand"];
  const m = me();
  if (name === m.name && m.face && !(local.family && f)) { face = m.face; tint = m.tint || tint; }
  return `<span class="av t-${tint} ${cls}" aria-hidden="true">${face}</span>`;
}
function duty() { return local.duty || (state.household && state.household.duty_holder) || "Vinay"; }

// The dish on the table tonight: the locked winner, unless this phone
// shuffled it.
function pickDish() {
  const w = state && state.locked && state.locked.winner;
  if (!w) return null;
  return local.pick && local.pick.from === w && DISHES[local.pick.dish] ? local.pick.dish : w;
}

// ---- the family, and the baari itself. Everyone who eats is in the row;
// only the people in the rotation get a stop on the rail, and the gold ब
// sits on whoever's turn it is. Two ways to run a day: the person whose
// turn it is picks (the others can veto), or everyone votes and they break
// the tie. Slide the ब to pass the turn; tap "In the baari" under a face to
// take someone in or out.
const SAYS = {
  Vinay: ["Rajma please 🙏", "Vote ho gaya!", "Aaj kuch naya?"], Mummy: ["Kam tel, haan!", "Sabzi bhi khao", "Roti garam hai?"],
  Papa: ["Aloo nahi, beta", "Daal mein namak kam", "Bas do roti"], Sunita: ["Kal kya banana hai?", "Tamatar le aayi", "Chai piyoge?"],
};
function seats() { return fam().map((p) => p.name); }
function inBaari() { const out = local.out || []; const r = seats().filter((p) => !out.includes(p)); return r.length ? r : seats(); }
function mode() { return local.mode || setup().mode || "pick"; }
function table(s) {
  const voted = (s.votes && s.votes.voted) || [];
  const open = (s.shortlist || []).length && !(s.locked && s.locked.winner);
  const order = seats(), ring = inBaari();
  const d = ring.includes(duty()) ? duty() : ring[0];
  const next = ring[(ring.indexOf(d) + 1) % ring.length];
  const n = order.length;
  const pick = mode() === "pick";
  const st = (p) => {
    if (!ring.includes(p)) return `<span class="f2-s">${T("Just eats", "Sirf khaate", "सिर्फ़ खाते")}</span>`;
    if (open) return pick ? (p === d ? `<span class="f2-s duty">${T("Picking", "Chun rahe", "चुन रहे")}</span>` : `<span class="f2-s">${T("Can veto", "Veto kar sakte", "वीटो कर सकते")}</span>`)
      : voted.includes(p) ? `<span class="f2-s ok">${T("Voted", "Vote diya", "वोट दिया")}</span>` : `<span class="f2-s">${T("Waiting", "Baaki", "बाकी")}</span>`;
    return p === d ? `<span class="f2-s duty">${T("Today", "Aaj", "आज")}</span>` : p === next ? `<span class="f2-s">${T("Next", "Agla", "अगला")}</span>` : `<span class="f2-s">${T("In line", "Line mein", "लाइन में")}</span>`;
  };
  const x = (p) => ((order.indexOf(p) + 0.5) / n) * 100;
  return `<section class="sec rv" style="--i:5"><div class="sec-h"><h2>${T("Whose baari", "Kiski baari", "किसकी बारी")}</h2><span class="sec-k">${T(`${next} is next`, `Agli baari ${next} ki`, `अगली बारी ${next} की`)}</span></div>
    <div class="fam2 card-w" data-nopull style="--n:${n}">
      <div class="f2-mode" role="radiogroup"><button type="button" role="radio" data-mode="pick" class="${pick ? "on" : ""}" aria-checked="${pick}">${T("Turn picks", "Baari wala chune", "बारी वाला चुने")}</button><button type="button" role="radio" data-mode="vote" class="${pick ? "" : "on"}" aria-checked="${!pick}">${T("Everyone votes", "Sab vote karein", "सब वोट करें")}</button><i class="f2-mpill"></i></div>
      <p class="f2-what">${pick ? T(`${d} picks today's dish from the two. The rest get a heads-up and can veto once.`, `Aaj ${d} do dishes mein se chunenge. Baaki ko khabar milegi, ek veto sabka.`, `आज ${d} चुनेंगे। बाकी एक बार वीटो कर सकते हैं।`) : T(`Everyone in the baari votes. ${d} breaks a tie.`, `Baari wale sab vote karte hain. Tie ${d} todenge.`, `सब वोट करते हैं। टाई ${d} तोड़ेंगे।`)}</p>
      <div class="f2-row">${order.map((p) => `<div class="f2-c ${ring.includes(p) ? "" : "out"}"><button type="button" class="f2-p ${p === d ? "is-duty" : ""}" data-seat="${esc(p)}">${avatar(p, "lg")}<b>${esc(p)}</b>${st(p)}</button></div>`).join("")}</div>
      <div class="f2-rail" data-rail>${ring.map((p) => `<i class="f2-stop" style="left:${x(p)}%"></i>`).join("")}<i class="f2-track" style="left:${x(ring[0])}%;right:${100 - x(ring[ring.length - 1])}%"></i><span class="coin" data-coin role="slider" aria-label="${T("Whose turn", "Kiski baari", "किसकी बारी")}" aria-valuetext="${esc(d)}" style="left:${x(d)}%"><img src="/img/baari-mark.png" alt=""></span></div>
      <div class="f2-ins">${order.map((p) => `<button type="button" class="f2-in ${ring.includes(p) ? "on" : ""}" data-inb="${esc(p)}" aria-pressed="${ring.includes(p)}">${ring.includes(p) ? T("In", "Baari mein", "बारी में") : T("Add", "Jodo", "जोड़ो")}</button>`).join("")}</div>
      <a class="f2-cook" href="#/sunita">${avatar("Sunita", "sm")}<span><b>Sunita ji</b><small>${T("Cooks at 8:00 am, not in the baari", "Subah 8 baje, baari se bahar", "सुबह 8 बजे, बारी से बाहर")}</small></span>${ICON.arrow}</a>
    </div></section>`;
}
// The mode switch pill slides like the Diary filter.
function placeMode() {
  const box = document.querySelector(".f2-mode");
  if (!box) return;
  const on = box.querySelector(".on"), pill = box.querySelector(".f2-mpill");
  pill.style.width = `${on.offsetWidth}px`;
  pill.style.transform = `translateX(${on.offsetLeft - 3}px)`;
}

// ---- every plate its own way. One dish for the house, then each person
// adds what they want on the side by dragging it onto their thali. Counts
// change in place; Baari adds it all up for the cook.
const SIDES = [
  { k: "roti", e: "🫓", l: "Roti" }, { k: "chawal", e: "🍚", l: "Chawal" }, { k: "raita", e: "🥣", l: "Raita" }, { k: "salad", e: "🥗", l: "Salad" },
  { k: "papad", e: "🍘", l: "Papad" }, { k: "achaar", e: "🫙", l: "Achaar" }, { k: "dahi", e: "🥛", l: "Dahi" }, { k: "nimbu", e: "🍋", l: "Nimbu" },
];
const ui = { plate: null, sel: null };
function plateOf(p) {
  local.plates = local.plates || {};
  if (!local.plates[p]) local.plates[p] = { roti: 2 };
  return local.plates[p];
}
function plates() {
  const people = fam().map((p) => p.name);
  const who = people.includes(ui.plate) ? ui.plate : people[0];
  ui.plate = who;
  const pl = plateOf(who);
  const items = Object.entries(pl).filter(([, n]) => n > 0);
  const win = pickDish();
  const tot = {};
  people.forEach((p) => Object.entries(plateOf(p)).forEach(([k, n]) => { if (n > 0) tot[k] = (tot[k] || 0) + n; }));
  const sel = ui.sel && pl[ui.sel] > 0 ? ui.sel : null;
  const side = (k) => SIDES.find((x) => x.k === k) || { e: "🍽️", l: k };
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>${T("Every plate, its own way", "Har thali alag", "हर थाली अलग")}</h2><span class="sec-k">${T("Drag onto the plate", "Thali pe kheencho", "थाली पर खींचो")}</span></div>
    <div class="tb card-w" data-nopull>
      <div class="tb-who">${people.map((p) => `<button type="button" class="${p === who ? "on" : ""}" data-plate="${esc(p)}">${avatar(p, "sm")}<span>${esc(p)}</span></button>`).join("")}</div>
      <div class="tb-plate" data-drop>
        <span class="tb-main">${win && dish(win).file ? `<img src="/img/dishes/${dish(win).file}.webp" alt="">` : "🍛"}</span>
        ${items.map(([k, n], i) => `<button type="button" class="tb-it ${sel === k ? "sel" : ""} ${ui.added === k ? "new" : ""}" data-it="${k}" style="--a:${(i * 360) / Math.max(5, items.length)}deg">${side(k).e}${n > 1 ? `<i>${n}</i>` : ""}</button>`).join("")}
        ${items.length ? "" : `<span class="tb-hint">${T("Empty plate", "Khaali thali", "खाली थाली")}</span>`}
      </div>
      <div class="tb-step">${sel ? `<span class="xc on"><button type="button" data-step="-1" aria-label="Less">−</button><b>${side(sel).e} ${esc(side(sel).l)} <em>${pl[sel]}</em></b><button type="button" data-step="1" aria-label="More">+</button></span>` : `<span class="tb-tip">${T("Tap something on the plate to change how many", "Thali pe kuch tap karo, ginti badlo", "थाली पर कुछ टैप करो, गिनती बदलो")}</span>`}</div>
      <div class="tb-tray">${SIDES.map((x) => `<button type="button" class="tb-src" data-src="${x.k}"><span>${x.e}</span><small>${x.l}</small></button>`).join("")}</div>
      <div class="tb-sum"><p><b>${T(`${esc(cap(SIDES.length && win ? win : "Dish"))} for ${people.length}`, `${esc(win || "Dish")}, ${people.length} log`, `${esc(win || "डिश")}, ${people.length} लोग`)}</b>${Object.entries(tot).map(([k, n]) => ` · ${n} ${esc(side(k).l.toLowerCase())}`).join("")}</p>
        <span>${T("Goes into Sunita's 7:45 voice note", "Sunita ke 7:45 ke voice note mein jayega", "सुनीता के 7:45 के वॉइस नोट में जाएगा")}</span></div>
      <button type="button" class="tb-same" data-same>${T(`Give everyone ${esc(who)}'s plate`, `Sabko ${esc(who)} jaisi thali`, `सबको ${esc(who)} जैसी थाली`)}</button>
    </div></section>`;
}

// ---- what's waiting for you. Leftovers, the fridge, a small question, a
// heads-up: none of it sits on the home screen. It lives in the island,
// which counts it, nudges once, and opens into a stack of cards.
const LEVEL = [T("All gone", "Khatam", "ख़त्म"), T("A little", "Thoda sa", "थोड़ा सा"), T("Half", "Aadha", "आधा"), T("Lots", "Kaafi", "काफ़ी"), T("Untouched", "Poora", "पूरा")];
function lastDish() { return pickDish() || (state.shortlist && dishName(state.shortlist[0])) || "Lauki chana dal"; }
function bowls() {
  const d = lastDish();
  const main = /dal|kadhi|rajma|paneer|bhurji|aloo/i.test(d) ? d.split(" ")[0] : d.split(" ")[0];
  return [{ k: "main", l: main, e: "🍲" }, { k: "roti", l: "Roti", e: "🫓" }, { k: "chawal", l: "Chawal", e: "🍚" }];
}
function leftPlan() {
  const lv = local.left || {};
  const b = bowls();
  const lots = b.filter((x) => (lv[x.k] || 0) >= 2);
  const some = b.filter((x) => (lv[x.k] || 0) === 1);
  return lots.length
    ? T(`${lots[0].l}: ${LEVEL[lv[lots[0].k]].toLowerCase()} left. Tomorrow it becomes ${lots[0].k === "chawal" ? "lemon rice" : lots[0].k === "roti" ? "roti noodles" : "parathas"}, and Sunita cooks less.`, `${lots[0].l} ${LEVEL[lv[lots[0].k]].toLowerCase()} bacha. Kal iske ${lots[0].k === "chawal" ? "nimbu chawal" : lots[0].k === "roti" ? "roti noodles" : "parathe"} banenge, naya kam banega.`, `${lots[0].l} ${LEVEL[lv[lots[0].k]]} बचा। कल इससे ${lots[0].k === "chawal" ? "नींबू चावल" : lots[0].k === "roti" ? "रोटी नूडल्स" : "पराठे"} बनेंगे।`)
    : some.length ? T("A little left. It goes in tomorrow's tiffin.", "Thoda sa bacha. Kal ke tiffin mein jayega.", "थोड़ा सा बचा। कल के टिफ़िन में जाएगा।")
    : T("Nothing left. Same amount tomorrow.", "Kuch nahi bacha. Kal utna hi banega.", "कुछ नहीं बचा। कल उतना ही बनेगा।");
}
const FRIDGE = [
  { k: "palak", e: "🥬", l: "Palak", d: 0, max: 3 }, { k: "dhaniya", e: "🌿", l: "Dhaniya", d: 1, max: 4 }, { k: "paneer", e: "🧀", l: "Paneer", d: 2, max: 5 },
  { k: "dahi", e: "🥛", l: "Dahi", d: 3, max: 5 }, { k: "tomato", e: "🍅", l: "Tamatar", d: 4, max: 7 }, { k: "nimbu", e: "🍋", l: "Nimbu", d: 9, max: 14 },
];
const days = (d) => (d <= 0 ? T("today", "aaj", "आज") : d === 1 ? T("1 day", "1 din", "1 दिन") : T(`${d} days`, `${d} din`, `${d} दिन`));
function fridgeLine() {
  const gone = local.gone || [];
  const soon = FRIDGE.filter((f) => f.d <= 1 && !gone.includes(f.k));
  if (gone.includes("palak")) return T("Palak's used up, so Palak paneer leaves tomorrow's vote.", "Palak khatam, toh kal ke vote se Palak paneer hata diya.", "पालक ख़त्म, कल के वोट से पालक पनीर हटा।");
  return soon.length ? T(`${soon.map((f) => f.l).join(" and ")} go first, so Palak paneer leads tomorrow's vote.`, `${soon.map((f) => f.l).join(" aur ")} pehle jaayenge, isliye kal Palak paneer vote mein sabse upar.`, `${soon.map((f) => f.l).join(" और ")} पहले, इसलिए कल पालक पनीर सबसे ऊपर।`) : T("Nothing's about to spoil.", "Kuch kharab hone wala nahi.", "कुछ ख़राब होने वाला नहीं।");
}
const ASK = [
  { q: T("Does anyone fast?", "Koi vrat rakhta hai?", "कोई व्रत रखता है?"), a: [T("Tuesdays", "Mangalvaar", "मंगलवार"), "Ekadashi", "Navratri", T("Nobody", "Koi nahi", "कोई नहीं")] },
  { q: T("Roti or rice, what goes faster?", "Roti ya chawal, zyada kya chalta hai?", "रोटी या चावल, ज़्यादा क्या चलता है?"), a: ["Roti", "Chawal", T("Both", "Dono", "दोनों")] },
  { q: T("Anything someone won't touch?", "Kuch jo koi nahi khata?", "कुछ जो कोई नहीं खाता?"), a: ["Karela 🙅", "Baingan", "Lauki", T("All good", "Sab chalta hai", "सब चलता है")] },
  { q: T("Food budget for the month?", "Mahine ka khaane ka budget?", "महीने का खाने का बजट?"), step: { v: 8000, by: 500, fmt: (v) => "₹" + v.toLocaleString("en-IN") } },
  { q: T("Do the kids take a tiffin?", "Bachche tiffin le jaate hain?", "बच्चे टिफ़िन ले जाते हैं?"), a: [T("Yes", "Haan", "हाँ"), T("No", "Nahi", "नहीं")] },
];
function asks() {
  if (!state) return [];
  const out = [];
  if (!local.leaveOk) out.push("leave");
  if (state.locked && state.locked.winner && !local.leftDone) out.push("left");
  if (!local.fridgeDone) out.push("fridge");
  if (((local.learn || {}).i || 0) < ASK.length) out.push("q");
  return out;
}
const ASK_HEAD = {
  leave: () => [T("Heads-up", "Khabar", "ख़बर"), "📅"],
  left: () => [T("After dinner", "Khaane ke baad", "खाने के बाद"), "🍲"],
  fridge: () => [T("Fridge", "Fridge", "फ़्रिज"), "🧊"],
  q: () => [T("Getting to know you", "Thoda aur jaanna hai", "थोड़ा और जानना है"), "💬"],
};
function askCard(k) {
  const [lab, em] = ASK_HEAD[k]();
  let body = "";
  if (k === "leave") body = `<div class="ac-row">${avatar("Sunita", "")}<div><h3>${T("Sunita ji is off tomorrow", "Sunita ji kal chhutti pe", "सुनीता जी कल छुट्टी पर")}</h3><p>${T("She said so on Telegram at 6:10 pm.", "Unhone 6:10 pm pe Telegram pe bataya.", "उन्होंने 6:10 बजे बताया।")}</p></div></div>
      <div class="ac-acts"><button type="button" class="ac-go" data-ak="find">${T("Find a cook", "Cook dhoondho", "कुक ढूँढो")}</button><button type="button" class="ac-no" data-ak="leave-ok">${T("We'll manage", "Hum dekh lenge", "हम देख लेंगे")}</button></div>`;
  if (k === "left") {
    const lv = local.left || {};
    body = `<h3>${T(`Anything left of the ${lastDish()}?`, `${lastDish()} kitna bacha?`, `${lastDish()} कितना बचा?`)}</h3><p>${T("Run a finger along each row.", "Har line pe ungli phirao.", "हर लाइन पर उँगली फिराओ।")}</p>
      <div class="lv">${bowls().map((x) => `<div class="lv-r"><span class="lv-l">${esc(x.l)}</span><div class="scr" data-scr="${x.k}" style="--v:${lv[x.k] || 0}" role="slider" aria-label="${esc(x.l)}" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${lv[x.k] || 0}">${[1, 2, 3, 4].map((n) => `<i class="${(lv[x.k] || 0) >= n ? "on" : ""}">${x.e}</i>`).join("")}</div><b class="lv-w">${LEVEL[lv[x.k] || 0]}</b></div>`).join("")}</div>
      <p class="ac-plan" data-plan><img src="/img/baari-mark.png" alt=""><span>${esc(leftPlan())}</span></p>
      <div class="ac-acts"><button type="button" class="ac-go" data-ak="left-done">${T("Done", "Ho gaya", "हो गया")}</button></div>`;
  }
  if (k === "fridge") {
    const gone = local.gone || [];
    body = `<h3>${T("What goes off first", "Pehle kya kharab hoga", "पहले क्या ख़राब होगा")}</h3><p>${T("Tap anything that's already used up.", "Jo khatam ho gaya, use tap karo.", "जो ख़त्म हो गया, उसे टैप करो।")}</p>
      <div class="fz">${FRIDGE.map((f) => { const left = Math.max(0.04, f.d / f.max); return `<button type="button" class="fz-i ${gone.includes(f.k) ? "gone" : ""} ${f.d <= 0 ? "red" : f.d <= 1 ? "amber" : ""}" data-fz="${f.k}" style="--f:${left.toFixed(2)}"><span class="fz-ring"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" pathLength="100"/><circle cx="20" cy="20" r="17" pathLength="100" class="f"/></svg><span>${f.e}</span></span><b>${f.l}</b><small>${gone.includes(f.k) ? T("used", "khatam", "ख़त्म") : days(f.d)}</small></button>`; }).join("")}</div>
      <p class="ac-plan" data-fline><img src="/img/baari-mark.png" alt=""><span>${esc(fridgeLine())}</span></p>
      <div class="ac-acts"><button type="button" class="ac-go" data-ak="fridge-done">${T("Looks right", "Sahi hai", "सही है")}</button></div>`;
  }
  if (k === "q") {
    const L = local.learn || { i: 0 };
    const q = ASK[L.i];
    const pct = Math.min(95, 40 + L.i * 11);
    body = `<div class="aq" data-q="${L.i}"><span class="aq-n">${L.i + 1}/${ASK.length}</span><h3>${q.q}</h3>
      ${q.step ? `<div class="ln-a"><span class="xc on"><button type="button" data-lstep="-1" aria-label="Less">−</button><b>${q.step.fmt(L.v || q.step.v)}</b><button type="button" data-lstep="1" aria-label="More">+</button></span><button type="button" class="ln-ok" data-ans="${L.v || q.step.v}">${ICON.check}</button></div>`
        : `<div class="ln-a">${q.a.map((x) => `<button type="button" data-ans="${esc(x)}">${esc(x)}</button>`).join("")}</div>`}
      <div class="aq-foot"><span class="aq-bar"><i style="width:${pct}%"></i></span><span>${L.i + 1} / ${ASK.length} · ${T(`Baari knows ${pct}%`, `Baari ${pct}% jaanta hai`, `बारी ${pct}% जानता है`)}</span></div>
      <div class="ln-alt"><button type="button" data-ans="">${T("Skip", "Chhodo", "छोड़ो")}</button><button type="button" data-call>📞 ${T("Or a 2 min call", "Ya 2 min call", "या 2 मिनट कॉल")}</button></div></div>`;
  }
  return `<article class="ac" data-card="${k}"><p class="ac-k"><span>${em}</span>${lab}</p>${body}</article>`;
}

// The hero is one quiet card that changes state in place: waiting, then two
// plates to choose from, then the plate that won. The thali carries the
// colour; the card stays white so nothing else competes with the food.
function waitingHero() {
  const m = untilMin("8:30 pm");
  return `<section class="hx wait rv" style="--i:2">
    <p class="hx-k"><span>${T("Tonight 8:30", "Aaj 8:30 baje", "आज 8:30 बजे")}</span>${m !== null && m < 600 ? `<span class="hx-t">${inMin(m)}</span>` : ""}</p>
    <div class="hx-fan" aria-hidden="true">${["Palak paneer roti", "Rajma chawal", "Kadhi chawal"].map((n, i) => thali(n, `hx-f hx-f${i}`)).join("")}</div>
    <h2 class="hx-q">${T("What's for lunch tomorrow?", "Kal lunch mein kya?", "कल लंच में क्या?")}</h2>
    <p class="hx-s">${T("Two dishes reach Telegram, picked from the pantry and everyone's rules.", "Do dishes Telegram pe aayengi, pantry aur sabke niyam dekh kar.", "दो डिश टेलीग्राम पर आएँगी।")}</p>
  </section>`;
}

// Two plates, one on stage at a time. The segmented control (or a tap on
// the plate peeking in from the side) swaps them; the card's wash takes the
// colour of whichever dish is in front. The bottom bar says who decides and
// hands you to Telegram, where the vote actually happens.
function voteHero(s, list) {
  const votes = s.votes || {};
  const voted = votes.voted || [];
  const ring = inBaari();
  const pick = mode() === "pick";
  const till = clock(votes.closes_at || "21:30");
  const two = [dishName(list[0]), dishName(list[1])];
  const on = ui.hx === 1 ? 1 : 0;
  const who = pick
    ? `${avatar(duty(), "xs")}<span class="hx-w">${T(`${duty()} picks`, `${duty()} chunenge`, `${duty()} चुनेंगे`)}</span>`
    : `<span class="faces">${ring.map((p, i) => `<span class="voter ${voted.includes(p) ? "in" : ""}" style="--i:${i}" title="${esc(p)}">${avatar(p, "xs")}</span>`).join("")}</span><span class="hx-w">${voted.length}/${ring.length}</span>`;
  return `<section class="hx vote rv" style="--i:2;--on:${on};--tint:${dish(two[on]).tint || "#F3EEE2"}" data-on="${on}" data-tints="${two.map((n) => dish(n).tint || "#F3EEE2").join(" ")}">
    <i class="hx-bg" aria-hidden="true"></i>
    <p class="hx-k"><span class="hx-ey">${T("Lunch tomorrow", "Kal ka lunch", "कल का लंच")}</span><span class="hx-t">${T(`till ${till}`, `${till} tak`, `${till} तक`)}</span></p>
    <h2 class="hx-q">${T("What should Sunita make?", "Sunita kya banayein?", "सुनीता क्या बनाएँ?")}</h2>
    <div class="hx-stage">${two.map((n, i) => `<button type="button" class="hx-p" data-hxi="${i}" tabindex="-1" aria-label="${esc(n)}">${thali(n, "hx-img")}</button>`).join("")}</div>
    <div class="hx-seg" role="tablist">${two.map((n, i) => `<button type="button" role="tab" data-hxi="${i}" aria-selected="${i === on}"><b>${esc(n)}</b><small>${dish(n).mins} min</small></button>`).join("")}</div>
    <div class="hx-foot">
      <p class="hx-by">${who}</p>
      <a class="hx-go" href="https://t.me/${BOT}">${ICON.send}${pick ? T("Pick", "Chuno", "चुनो") : T("Vote", "Vote", "वोट")}</a>
    </div>
  </section>`;
}
function hxPick(btn) {
  const hx = btn.closest(".hx");
  const i = +btn.dataset.hxi;
  if (+hx.dataset.on === i) return;
  ui.hx = i;
  hx.dataset.on = i;
  hx.style.setProperty("--on", i);
  hx.style.setProperty("--tint", hx.dataset.tints.split(" ")[i]);
  hx.querySelectorAll(".hx-seg [data-hxi]").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.hxi === i)));
  haptic(6);
}

// The locked dish. Same card, one plate. Swipe the plate or tap Badlo (or
// shake the phone) to shuffle to the next dish that keeps everyone's rules.
function lockedHero(s) {
  const L = s.locked;
  const name = pickDish();
  const w = dish(name);
  const swapped = name !== L.winner;
  const hi = swapped ? w.hi : L.winner_hindi || w.hi;
  return `<section class="hx locked rv" style="--i:2;--tint:${w.tint || "#F3EEE2"}">
    <i class="hx-bg" aria-hidden="true"></i>
    <p class="hx-k">${swapped
      ? `<span class="hx-ok swap">${T("Changed by you", "Aapne badla", "आपने बदला")}</span><button type="button" class="hx-tb" data-unshuffle>${T("Undo", "Wapas", "वापस")}</button>`
      : `<span class="hx-ok">${ICON.check}${T("Final", "Pakka", "पक्का")}</span><span class="hx-t">9:30 pm</span>`}</p>
    <div class="hero-plate hx-plate" data-plate-swipe data-nopull>${thali(name, "hero-img hx-img")}</div>
    <p class="hx-sub">${T("Tomorrow, Sunita makes", "Kal dopahar, Sunita banayengi", "कल दोपहर, सुनीता बनाएँगी")}</p>
    <h2 class="hx-name" data-reel>${esc(name)}</h2>
    <p class="hx-hi" lang="hi">${esc(hi)}</p>
    <p class="skipnote" aria-live="polite"></p>
    <div class="hx-foot">
      <dl class="hx-facts">
        <div><dd>${esc((L.headcount || 4) + (local.guests || 0))}</dd><dt>${T("eating", "log", "लोग")}</dt></div>
        <div><dd>${w.mins}</dd><dt>min</dt></div>
        <div><dd>8:00</dd><dt>${T("Sunita", "Sunita", "सुनीता")}</dt></div>
      </dl>
      <button type="button" class="hx-tb hx-shuf" data-shuffle aria-label="${T("Shuffle the dish", "Dish badlo", "डिश बदलो")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3l4 4-4 4V8h-2.6l-7 9H3v-2h3.4l7-9H17zM3 7h4.4l2 2.6-1.3 1.6L6.4 9H3zm12.4 8H17v-3l4 4-4 4v-3h-2.6l-2.6-3.3 1.3-1.6z"/></svg>${T("Shuffle", "Badlo", "बदलो")}</button>
    </div>
  </section>`;
}

// Treat night: the kitchen gets the night off and Baari keeps the fridge
// from going to waste.
const TREATS = [{ k: "pizza", e: "🍕", l: "Pizza" }, { k: "biryani", e: "🍛", l: "Biryani" }, { k: "chinese", e: "🥡", l: "Chinese" }, { k: "dosa", e: "🥞", l: "Dosa" }, { k: "chaat", e: "🥙", l: "Chaat" }, { k: "momos", e: "🥟", l: "Momos" }];
function treatHero() {
  const t = local.treat;
  const picks = TREATS.filter((x) => (t.what || []).includes(x.k));
  const em = picks.length ? picks.map((x) => x.e) : ["🍕"];
  return `<section class="hero treat rv" style="--i:2">
    <div class="glow" aria-hidden="true"></div>
    <div class="treat-pile" data-nopull>${em.concat(em, em).slice(0, 6).map((e, i) => `<button type="button" class="tp" data-tp style="--i:${i}">${e}</button>`).join("")}</div>
    <p class="kicker"><span class="pill swap">${T("Treat night", "Aaj treat", "आज ट्रीट")}</span>${T("Tomorrow, lunch from outside", "Kal lunch bahar se", "कल लंच बाहर से")}</p>
    <h2>${esc(picks.map((x) => x.l).join(" + ") || "Pizza")}</h2>
    <ul class="treat-did">
      <li>${ICON.check}${T("Sunita ji gets the day off, paid in full", "Sunita ji ki chhutti, paise poore", "सुनीता जी की छुट्टी, पैसे पूरे")}</li>
      <li>${ICON.check}${T("Tomorrow's grocery order is on hold, ₹106 saved", "Kal ka saamaan roka, ₹106 bache", "कल का सामान रोका, ₹106 बचे")}</li>
      <li>${ICON.check}${T("Palak moves to Thursday so it doesn't spoil", "Palak Thursday pe, kharab nahi hogi", "पालक गुरुवार को, ख़राब नहीं होगी")}</li>
    </ul>
    <button type="button" class="btn light" data-untreat>${T("Cancel the treat", "Treat cancel karo", "ट्रीट कैंसिल करो")}</button>
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

// ---- Khata. Literally the household ledger, so it looks like one: a red
// cloth bahi with gold lettering holds what's left in the Reserve Pay
// block. Open the cover and the first page is the three limits Vinay set,
// in ink. Below, today's coins (the daily cap as ₹50 coins, spent ones
// hollow), the week, and today's page of the ledger with a stamp per entry.
const WHAT = { staples: T("Dry staples, shipped overnight", "Sookha saamaan, raat bhar mein", "सूखा सामान, रात भर में"), kirana: T("Fresh things, picked up on the way", "Taaza saamaan, raaste se", "ताज़ा सामान, रास्ते से") };
function khata() {
  const k = state.khata || {};
  const used = k.used || 0;
  const total = k.block_total || 500000;
  const capToday = k.cap_today || 40000;
  const spent = k.spent_today || 0;
  const left = k.left ?? total - used;
  const debits = (k.debits || []).slice();
  const okSum = debits.filter((d) => d.status === "SUCCESS").reduce((a, d) => a + (d.amount || 0), 0);
  const coins = Math.round(capToday / 5000);
  const gone = Math.min(coins, Math.ceil(spent / 5000));
  const vin = (state.household && state.household.duty_holder) || "Vinay";
  const dayN = new Date(nowMs() + 5.5 * 3600e3);
  const kind = (d) => (/kirana/i.test(d.to || "") ? "kirana" : "staples");
  const stamp = (d) => d.status === "SUCCESS" ? `<span class="stp ok">${T("PAID", "PAID", "चुकाया")}</span>` : d.status === "FAILED" ? `<span class="stp bad">${T("FAILED", "FAIL", "फ़ेल")}</span>` : `<span class="stp wait">${T("WAITING", "RUKA", "रुका")}</span>`;
  return `${header(T("Khata", "Khata", "खाता"), { sub: T(`Every rupee Baari spends, inside limits only ${vin} can change`, `Baari ka har rupaya, ${vin} ki limit ke andar`, `बारी का हर रुपया, ${vin} की लिमिट के अंदर`) })}
    <section class="sec rv" style="--i:2"><div class="bahi" data-bahi role="button" tabindex="0" aria-label="${T("Open the khata", "Khata kholo", "खाता खोलो")}">
      <div class="bahi-page">
        <p class="bp-h">${T(`${vin}'s limits`, `${vin} ke niyam`, `${vin} के नियम`)}</p>
        <ol class="bp-l">
          <li><b>${rs(capToday)}</b> ${T("a day, all payments together", "roz, sab milake", "रोज़, सब मिलाकर")}</li>
          <li><b>₹300+</b> ${T(`waits for ${vin}'s yes`, `pe ${vin} ki haan chahiye`, `पर ${vin} की हाँ`)}</li>
          <li><b>${T("One shop", "Ek dukaan", "एक दुकान")}</b> ${esc((k.payees || ["Sharma Kirana"]).join(", "))}</li>
        </ol>
        <p class="bp-sign">${T(`Set by ${vin} in his bank app. Baari can't change a line.`, `${vin} ne bank app se lagaya. Baari ek line nahi badal sakta.`, `${vin} ने बैंक ऐप से लगाया।`)}</p>
      </div>
      <div class="bahi-cover">
        <span class="bc-band" aria-hidden="true"></span>
        <div class="bc-top"><span lang="hi">खाता</span>${brand("pinelabs", "on-dark")}</div>
        <p class="bc-k">${T("Left in the Reserve Pay block", "Reserve Pay mein bacha", "रिज़र्व पे में बचा")}</p>
        <p class="bc-v">${num("left", rs(left))}</p>
        <div class="bc-bar"><i style="width:${Math.max(1.5, (used / total) * 100).toFixed(1)}%"></i></div>
        <p class="bc-f"><span>${rs(used)} ${T("spent of", "kharch, block", "ख़र्च, ब्लॉक")} ${rs(total)}</span><span class="bc-open">${T("Open", "Kholo", "खोलो")} ${ICON.arrow}</span></p>
      </div>
    </div></section>
    <section class="sec rv" style="--i:3"><div class="kd card-w" data-nopull>
      <div class="kd-top"><div><p class="kd-k">${T("Spent today", "Aaj ka kharch", "आज का ख़र्च")}</p><p class="kd-v"><b>${num("spent", rs(spent))}</b><span>/ ${rs(capToday)}</span></p></div>
        <p class="kd-left"><b>${rs(Math.max(0, capToday - spent))}</b><small>${T("still allowed", "aur ho sakta", "और हो सकता")}</small></p></div>
      <div class="kd-coins" aria-label="${T(`${coins - gone} of ${coins} coins left`, `${coins} mein se ${coins - gone} sikke bache`, `${coins - gone} सिक्के बचे`)}">${Array.from({ length: coins }, (_, i) => `<span class="cn ${i >= coins - gone ? "spent" : ""}" style="--i:${i}"><img src="/img/baari-mark.png" alt=""></span>`).join("")}</div>
      <p class="kd-cap">${T("Each coin is ₹50 of today's limit. A spent coin goes hollow.", "Har sikka aaj ki limit ka ₹50. Kharch hua toh khaali.", "हर सिक्का ₹50। ख़र्च हुआ तो ख़ाली।")}</p>
      <div class="kd-led">
        <div class="kd-lh"><b>${T("Today's page", "Aaj ka hisaab", "आज का हिसाब")}</b><span>${new Date(nowMs() + 5.5 * 3600e3).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" })}</span>${debits.length ? `<button class="kd-rc" type="button" data-receipt>${T("Receipt", "Parchi", "पर्ची")} ${ICON.arrow}</button>` : ""}</div>
        ${debits.length ? debits.map((d, i) => `<details class="pg-r ${d.status === "FAILED" ? "bad" : ""}" style="--i:${i}"><summary><span class="pg-ic ${kind(d)}">${kind(d) === "kirana" ? ICON.bag : ICON.truck}</span><span class="pg-t"><b>${esc(d.to || "Baari staples hub")}</b><small>${WHAT[kind(d)]}</small></span><b class="pg-a">${rs(d.amount)}</b>${stamp(d)}</summary>
          <div class="pg-x"><p><span>${T("Why", "Kyun", "क्यों")}</span>${kind(d) === "kirana" ? WHY.B1 : WHY.B2}, ${WHY.M7}</p><p><span>Ref</span><code>${esc(d.ref || "")}</code></p><p><span>${T("Paid by", "Kisne diya", "किसने दिया")}</span>Pine Labs, UPI Reserve Pay</p></div></details>`).join("") + `<p class="pg-tot"><span>${T("Total paid", "Kul diya", "कुल दिया")}</span><b>${rs(okSum)}</b></p>`
          : `<p class="kd-empty">${T("A clean page. The first payment happens after the vote.", "Saaf panna. Pehla payment vote ke baad.", "साफ़ पन्ना। पहला भुगतान वोट के बाद।")}</p>`}
      </div>
    </div></section>
    <section class="sec rv" style="--i:4"><div class="sec-h"><h2>${T("Spending", "Kharch", "ख़र्च")}</h2><span class="sec-k">${T("Earlier days are a sample", "Pichhle din sample hain", "पिछले दिन नमूना")}</span></div>
      ${spendCard({ spent, capToday, left, dayN })}</section>
    <p class="fine rv" style="--i:6">${T(`Baari can't add a shop or raise a limit. Only ${vin} can, from his bank app.`, `Baari na dukaan jod sakta hai, na limit badha sakta. Sirf ${vin}, apne bank app se.`, `बारी न दुकान जोड़ सकता है, न लिमिट बढ़ा सकता।`)}</p>
    ${poweredBy("Payments by", ["pinelabs"])}`;
}

// Spending, week or month. Today is real; earlier days are a sample until
// rails keeps history. Tap a bar or a day and the number up top becomes
// that day's.
const WK_SAMPLE = [12100, 0, 9800, 14600, 0, 8200];
function dayAmt(back, spent) {
  if (back === 0) return spent;
  if (back <= 6) return WK_SAMPLE[back - 1];
  return (back * 13) % 7 === 0 || (back * 5) % 9 === 0 ? 0 : 6000 + ((back * 7919) % 10000);
}
function spendCard({ spent, capToday, left, dayN }) {
  const day = (back) => new Date(dayN.getTime() - back * 864e5);
  const fmt = (d, o) => d.toLocaleDateString("en-IN", { ...o, timeZone: "UTC" });
  // week
  const wk = Array.from({ length: 7 }, (_, i) => ({ back: 6 - i, v: dayAmt(6 - i, spent) }));
  const wTot = wk.reduce((a, x) => a + x.v, 0);
  const max = Math.max(capToday, ...wk.map((x) => x.v)) * 1.15;
  // months: this one so far and the two before it, browsed with arrows
  const today = dayN.getUTCDate();
  const month = (mb) => {
    const y = dayN.getUTCFullYear(), m0 = dayN.getUTCMonth() - mb;
    const first = new Date(Date.UTC(y, m0, 1));
    const nDays = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    const back0 = Math.round((Date.UTC(dayN.getUTCFullYear(), dayN.getUTCMonth(), today) - first.getTime()) / 864e5);
    const vals = Array.from({ length: nDays }, (_, i) => (back0 - i < 0 ? null : dayAmt(back0 - i, spent)));
    const tot = vals.reduce((x, v) => x + (v || 0), 0);
    return { first, nDays, lead: (first.getUTCDay() + 6) % 7, vals, tot, max: Math.max(...vals.map((v) => v || 0), 1), name: fmt(first, { month: "long" }) };
  };
  const months = [0, 1, 2].map(month);
  const cur = months[0];
  const avg = [months[1], cur].reduce((x, m) => x + m.tot, 0) / Math.max(1, months[1].nDays + today);
  const lasts = new Date(dayN.getTime() + Math.floor(left / Math.max(1, avg)) * 864e5);
  const top = [["🫘", "Rajma", 21200, 2], ["🍅", T("Tomatoes", "Tamatar", "टमाटर"), 18000, 6], ["🧀", "Paneer", 34000, 2]];
  const wkL = (d) => fmt(d, { weekday: "short" });
  const dL = (d) => fmt(d, { day: "numeric", month: "short" });
  const moPane = (M, mi) => {
    const staples = Math.round(M.tot * 0.64), f = M.tot / Math.max(1, months[1].tot);
    return `<div class="kc-mo" data-mo="${mi}" ${mi ? "hidden" : ""}>
      <div class="kc-w">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<small>${d}</small>`).join("")}</div>
      <div class="kc-g">${"<i></i>".repeat(M.lead)}${M.vals.map((v, i) => {
        const d = new Date(M.first.getTime() + i * 864e5), isT = !mi && i + 1 === today;
        return v === null ? `<span class="kc fut">${i + 1}</span>` : `<button type="button" class="kc ${isT ? "on" : ""} ${v ? "" : "zero"}" style="--a:${(0.12 + (v / M.max) * 0.88).toFixed(2)};--i:${i}" data-kd data-k="${isT ? T("Today", "Aaj", "आज") : `${wkL(d)}, ${dL(d)}`}" data-v="${v ? rs(v) : T("Nothing", "Kuch nahi", "कुछ नहीं")}">${i + 1}</button>`;
      }).join("")}</div>
      <div class="ks-split"><p><b>${T("Where it went", "Kahan gaya", "कहाँ गया")}</b></p>
        <div class="ks-bar"><i class="st" style="--w:${((staples / Math.max(1, M.tot)) * 100).toFixed(1)}%"></i><i class="ki"></i></div>
        <div class="ks-leg"><span><i class="st"></i>${T("Staples, overnight", "Sookha saamaan", "सूखा सामान")} <b>${rs(staples)}</b></span><span><i class="ki"></i>${T("Kirana, fresh", "Kirana, taaza", "किराना, ताज़ा")} <b>${rs(M.tot - staples)}</b></span></div></div>
      <ul class="ks-top">${top.map(([e, n, v, c], i) => `<li style="--i:${i}"><span class="ks-e">${e}</span><b>${n}</b><small>${Math.max(1, Math.round(c * f))}× ${mi ? T("that month", "us mahine", "उस महीने") : T("this month", "is mahine", "इस महीने")}</small><em>${rs(Math.round((v * f) / 100) * 100)}</em></li>`).join("")}</ul>
    </div>`;
  };
  return `<div class="ks card-w" data-ks="w" data-nopull>
    <div class="ks-h">
      <div class="ks-read" aria-live="polite"><p class="ks-k" data-ksk>${T("This week", "Is hafte", "इस हफ़्ते")}</p><p class="ks-v" data-ksv>${rs(wTot)}</p></div>
      <div class="ks-seg" role="tablist"><span class="ks-pill" aria-hidden="true"></span>
        <button type="button" role="tab" aria-selected="true" data-ksm="w" data-k="${T("This week", "Is hafte", "इस हफ़्ते")}" data-v="${rs(wTot)}">${T("Week", "Hafta", "हफ़्ता")}</button>
        <button type="button" role="tab" aria-selected="false" data-ksm="m" data-k="${cur.name}" data-v="${rs(cur.tot)}">${T("Month", "Mahina", "महीना")}</button></div>
    </div>
    <div class="ks-p ks-w">
      <div class="kw-plot"><span class="kw-cap" style="--h:${((capToday / max) * 100).toFixed(1)}%"><b>${T("limit", "limit", "लिमिट")} ${rs(capToday)}</b></span>
        ${wk.map((x, i) => `<button type="button" class="kw-b ${x.back === 0 ? "on" : ""}" style="--h:${((x.v / max) * 100).toFixed(1)}%;--i:${i}" data-kd data-k="${x.back === 0 ? T("Today", "Aaj", "आज") : `${wkL(day(x.back))}, ${dL(day(x.back))}`}" data-v="${x.v ? rs(x.v) : T("Nothing", "Kuch nahi", "कुछ नहीं")}" aria-label="${wkL(day(x.back))}"></button>`).join("")}</div>
      <div class="kw-x">${wk.map((x) => `<small class="${x.back === 0 ? "on" : ""}">${x.back === 0 ? T("Today", "Aaj", "आज") : wkL(day(x.back)).slice(0, 2)}</small>`).join("")}</div>
      <p class="ks-note">${T(`Never over the ${rs(capToday)} limit this week`, `Is hafte ${rs(capToday)} ki limit kabhi paar nahi`, `इस हफ़्ते लिमिट कभी पार नहीं`)}</p>
    </div>
    <div class="ks-p ks-m">
      <div class="kc-nav"><button type="button" data-kmo="1" aria-label="${T("Earlier month", "Pichhla mahina", "पिछला महीना")}">${ICON.chev}</button><b data-kmn>${cur.name}</b><button type="button" data-kmo="-1" disabled aria-label="${T("Later month", "Agla mahina", "अगला महीना")}">${ICON.chev}</button></div>
      <div data-mos data-m="0" ${months.map((M, i) => `data-k${i}="${M.name}" data-v${i}="${rs(M.tot)}"`).join(" ")}>${months.map(moPane).join("")}</div>
      <div class="ks-run"><span>${ICON.lock}</span><p>${T(`About ${rs(avg)} a day. At this pace the block lasts till`, `Roz lagbhag ${rs(avg)}. Is raftaar se block chalega`, `रोज़ लगभग ${rs(avg)}। इस रफ़्तार से ब्लॉक चलेगा`)} <b>${dL(lasts)}</b>${T("", " tak", " तक")}.</p></div>
    </div>
  </div>`;
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

// Saamaan starts from the dish, not the courier: a kitchen shelf of jars,
// one per thing the dish needs. Full jars are at home; an empty jar wears
// a tag saying how it's coming. Under it, the two ways things arrive: the
// overnight parcel as a truck on a road through the night (the sky goes
// from moon to sunrise as it gets closer to the 7:30 cutoff), and Sunita's
// walk in through the kirana. The rider is a quiet backup line.
const INGR = {
  "Rajma chawal": [["rajma", "🫘", "Rajma"], ["chawal", "🍚", "Chawal"], ["tomato", "🍅", "Tamatar"], ["pyaaz", "🧅", "Pyaaz"], ["adrak", "🫚", "Adrak"], ["masala", "🌶️", "Masala"]],
  "Lauki chana dal": [["lauki", "🥒", "Lauki"], ["chana", "🫘", "Chana dal"], ["tomato", "🍅", "Tamatar"], ["jeera", "🌰", "Jeera"], ["haldi", "🟡", "Haldi"], ["dhaniya", "🌿", "Dhaniya"]],
  "Palak paneer roti": [["palak", "🥬", "Palak"], ["paneer", "🧀", "Paneer"], ["aata", "🌾", "Aata"], ["tomato", "🍅", "Tamatar"], ["lehsun", "🧄", "Lehsun"], ["masala", "🌶️", "Masala"]],
  "Kadhi chawal": [["dahi", "🥛", "Dahi"], ["besan", "🌾", "Besan"], ["chawal", "🍚", "Chawal"], ["pyaaz", "🧅", "Pyaaz"], ["methi", "🌱", "Methi"], ["haldi", "🟡", "Haldi"]],
  "Aloo puri": [["aloo", "🥔", "Aloo"], ["aata", "🌾", "Aata"], ["tel", "🫗", "Tel"], ["tomato", "🍅", "Tamatar"], ["jeera", "🌰", "Jeera"], ["dhaniya", "🌿", "Dhaniya"]],
  "Egg bhurji paratha": [["anda", "🥚", "Ande"], ["aata", "🌾", "Aata"], ["pyaaz", "🧅", "Pyaaz"], ["tomato", "🍅", "Tamatar"], ["mirch", "🌶️", "Mirch"], ["makhan", "🧈", "Makhan"]],
};
const ALIAS = { tomato: /tomat|tamatar/i, rajma: /rajma/i, lauki: /lauki/i, palak: /palak|spinach/i, paneer: /paneer/i, dahi: /dahi|curd/i, anda: /egg|anda/i, aloo: /aloo|potato/i, dhaniya: /dhaniya|coriander/i, pyaaz: /pyaaz|onion/i };
function delivery() {
  const d = state.delivery || {};
  const locked = state.locked && state.locked.winner;
  const name = pickDish() || dishName((state.shortlist || [])[0]) || "Rajma chawal";
  const idx = stageIndex(d.status);
  const eta = istMs(d.expected);
  const done = idx >= 4;
  const late = eta && eta > deadlineMs() && !done;
  const spare = eta ? Math.round((deadlineMs() - eta) / 60000) : 0;
  const missing = state.missing || [];
  const pickup = (d.kirana_pickup || []).map((p) => String(p.item || p));
  const how = (k) => {
    const re = ALIAS[k] || new RegExp(k, "i");
    const m = missing.find((x) => re.test(String(x.item || x)));
    if (!m && !pickup.some((p) => re.test(p))) return null;
    const kir = (m && m.route === "kirana") || pickup.some((p) => re.test(p));
    return { kir, qty: String((m && (m.item || m)) || pickup.find((p) => re.test(p)) || "").replace(/^\S+\s*/, "") };
  };
  const ing = INGR[name] || INGR["Rajma chawal"];
  const jars = ing.map(([k, e, l]) => ({ k, e, l, h: locked ? how(k) : null }));
  const coming = jars.filter((j) => j.h);
  const kir = jars.filter((j) => j.h && j.h.kir);
  const night = jars.filter((j) => j.h && !j.h.kir);
  const sub = !locked ? T("After the vote, Baari works out what comes from where.", "Vote ke baad Baari tay karta hai kya kahan se aayega.", "वोट के बाद बारी तय करता है।") : coming.length ? T(`${coming.length} things on the way, the rest is already at home`, `${coming.length} cheezein aa rahi hain, baaki ghar mein hai`, `${coming.length} चीज़ें आ रही हैं, बाकी घर में`) : T("Everything's at home. Nothing to order.", "Sab ghar mein hai. Kuch nahi mangana.", "सब घर में है।");
  const arrived = (j) => j.h && (j.h.kir ? false : done);
  const home = jars.length - coming.length + jars.filter(arrived).length;
  // The pantry: one steel katori per thing the dish needs. Full ones are in
  // the kitchen; an empty one has a dashed rim in the colour of how it's
  // coming, ink for the overnight parcel, haldi for Sunita's kirana stop.
  const st = (j) => (!j.h || arrived(j) ? "in" : j.h.kir ? "kir" : "night");
  const shelf = `<section class="sec rv" style="--i:2"><div class="pan card-w">
      <div class="pan-h">${thali(name, "pan-img")}<div class="pan-n"><p>${locked ? T("Tomorrow's", "Kal ke liye", "कल के लिए") : T("If it's", "Agar ye bana", "अगर ये बना")}</p><b>${esc(name)}</b></div>
        <span class="pan-r" style="--f:${(home / jars.length).toFixed(3)}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" pathLength="100"/><circle cx="22" cy="22" r="19" pathLength="100" class="f"/></svg><b>${home}<small>/${jars.length}</small></b></span></div>
      <ul class="pan-g">${jars.map((j, i) => `<li class="kt ${st(j)}" style="--i:${i}"><span class="kt-b"><span>${j.e}</span></span><b>${esc(j.l)}</b><small>${st(j) === "in" ? T("at home", "ghar mein", "घर में") : st(j) === "kir" ? T("kirana, 7:40", "kirana, 7:40", "किराना, 7:40") : j.h.qty ? esc(j.h.qty) : T("tonight", "raat mein", "रात में")}</small></li>`).join("")}</ul>
      <p class="pan-key"><span><i class="in"></i>${T("At home", "Ghar mein", "घर में")}</span><span><i class="night"></i>${T("Overnight", "Raat bhar", "रात भर")}</span><span><i class="kir"></i>${T("Kirana", "Kirana", "किराना")}</span></p>
    </div></section>`;
  // Overnight: a night card. The big number is the only thing to read at a
  // glance; under it, five stops on one line with their names right below
  // their dots, and the truck sitting on the line where the parcel is.
  const et = eta ? new Date(eta + 5.5 * 3600e3) : null;
  const eh = et ? et.getUTCHours() : 0;
  const etime = et ? `${eh % 12 || 12}:${String(et.getUTCMinutes()).padStart(2, "0")}` : "";
  const eday0 = d.expected ? whenLabel(d.expected).split(",")[0] : "";
  const eday = eday0 === "Tomorrow" ? T("Tomorrow", "Kal subah", "कल सुबह") : eday0 === "Today" ? T("Today", "Aaj", "आज") : eday0;
  const pos = done ? 4 : idx;
  const road = `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>${T("Overnight", "Raat bhar", "रात भर")}</h2><span class="sec-k">${T("Dry staples", "Sookha saamaan", "सूखा सामान")}</span></div>
    <div class="ov ${late ? "late" : ""} ${done ? "done" : ""}" style="--p:${(pos / 4).toFixed(2)}">
      <i class="ov-stars" aria-hidden="true"></i><i class="ov-dawn" aria-hidden="true"></i>
      <div class="ov-top">${brand("delhivery", "on-dark")}${d.waybill ? `<button class="copy ov-wb" data-copy="${esc(d.waybill)}" aria-label="Copy waybill"><span class="mono">${esc(d.waybill)}</span><span class="t-icon-swap"><span class="ic-a">${ICON.copy}</span><span class="ic-b">${ICON.check}</span></span></button>` : ""}</div>
      ${d.waybill ? `<p class="ov-k">${done ? T("Delivered", "Pahunch gaya", "पहुँच गया") : T("Lands", "Pahunchega", "पहुँचेगा")}${eday ? ` · ${esc(eday)}` : ""}</p>
        <p class="ov-t"><b>${etime || "7:00"}</b><span>${eh < 12 ? "am" : "pm"}</span></p>
        <p class="ov-chip">${done ? T("In the kitchen", "Rasoi mein", "रसोई में") : late ? T(`${-spare} min past 7:30. Rider backup is on.`, `7:30 se ${-spare} min late. Rider tayyar.`, `${-spare} मिनट देर।`) : T(`${spare} min before the 7:30 cutoff`, `7:30 cutoff se ${spare} min pehle`, `7:30 से ${spare} मिनट पहले`)}</p>
        <div class="ov-track"><i class="ov-line"></i><i class="ov-fill"></i><span class="ov-truck">${ICON.truck}</span>
          <ol>${STAGES.map((x, i) => `<li class="${i < pos || done ? "done" : i === pos ? "cur" : ""}"><i></i><span>${x.replace("Out for delivery", "Out")}</span></li>`).join("")}</ol></div>
        ${night.length ? `<p class="ov-items"><span>${T("In the box", "Dabbe mein", "डिब्बे में")}</span>${night.map((j) => `${j.e} ${esc(j.l)}${j.h.qty ? ` ${esc(j.h.qty)}` : ""}`).join(", ")}</p>` : ""}`
      : `<p class="ov-k">${T("Nothing ships tonight", "Aaj raat kuch nahi aa raha", "आज रात कुछ नहीं")}</p><p class="ov-t sm"><b>${locked ? T("Pantry has it", "Pantry mein hai", "पेंट्री में है") : "9:30 pm"}</b></p><p class="ov-chip">${locked ? T("No parcel needed", "Parcel ki zaroorat nahi", "पार्सल नहीं चाहिए") : T("Booked after the vote, if a dry staple is short", "Vote ke baad, agar sookha saamaan kam ho", "वोट के बाद, अगर कम हो")}</p>`}
    </div></section>`;
  const walk = `<section class="sec rv" style="--i:4"><div class="sec-h"><h2>${T("On her way in", "Raaste mein", "रास्ते में")}</h2><span class="sec-k">${T("Sunita, 7:40 am", "Sunita, 7:40 am", "सुनीता, 7:40")}</span></div>
    <div class="walk card-w">
      <ol class="wk-path">
        <li>${avatar("Sunita", "sm")}<div><b>${T("Leaves home", "Ghar se nikalti hain", "घर से निकलती हैं")}</b><small>7:30</small></div></li>
        <li class="${kir.length ? "stop" : "skip"}"><span class="wp-ic">${ICON.bag}</span><div><b>Sharma Kirana</b><small>${kir.length ? kir.map((j) => `${j.e} ${esc(j.l)}${j.h.qty ? ` ${esc(j.h.qty)}` : ""}`).join(", ") : T("Nothing to pick up today", "Aaj kuch nahi lena", "आज कुछ नहीं")}</small></div>${kir.length ? `<span class="wp-pay">${ICON.lock}${T("Baari pays", "Baari dega", "बारी देगा")}</span>` : ""}</li>
        <li><span class="wp-ic home">${ICON.home}</span><div><b>${T("Your kitchen", "Aapki rasoi", "आपकी रसोई")}</b><small>8:00</small></div></li>
      </ol>
      <p class="wk-note">${T("She never pays from her own pocket. The shop gets UPI from Baari.", "Woh apni jeb se kabhi nahi deti. Dukaan ko UPI Baari se.", "वो अपनी जेब से कभी नहीं देतीं।")}</p>
    </div></section>`;
  const rider = `<section class="sec rv" style="--i:5"><div class="lane-rider2 ${d.hop ? "on" : ""}">
      <span class="lr-ic">${ICON.truck}</span><div><b>${T("15-minute rider", "15 minute rider", "15 मिनट राइडर")}</b><small>${d.hop ? T("Kirana to your door", "Kirana se ghar tak", "किराने से घर तक") : T("At 6:30 am Baari checks the parcel. If it won't make 7:30, a rider brings it from the kirana.", "6:30 baje Baari parcel dekhta hai. 7:30 tak nahi pahunchega toh rider kirana se laayega.", "6:30 बजे बारी पार्सल देखता है।")}</small></div><span class="lr-t">${d.hop ? T("Live", "Chalu", "चालू") : T("Standby", "Taiyaar", "तैयार")}</span>
    </div>${d.hop ? riderCard(d.hop) : ""}</section>`;
  return `${header(T("Groceries", "Saamaan", "सामान"), { sub })}${shelf}${road}${walk}${rider}${poweredBy("Shipping by", ["delhivery"])}`;
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

// Sunita's page is her morning, in order, and the actual conversation: the
// voice note Baari sent, what she said back, and what Baari understood.
function sunita() {
  const b = state.brief || {};
  const label = { confirmed_with_counts: ["Confirmed, with counts", "ok"], vague_yes: ["Said yes, no counts", "warn"], item_missing: ["Something ran out", "warn"], refusal: ["Can't make it", "bad"], unclear: ["Unclear, asked again", "warn"] };
  const x = b.reply_extract || {};
  const qty = Object.entries(x.quantities || {}).map(([k, v]) => `${cap(k)} ${v && typeof v === "object" ? v.value : v}`);
  const l = label[b.reply_label || x.commitment] || null;
  const L = state.locked || {};
  const win = L.winner;
  const count = L.headcount || 4;
  const pickup = ((state.delivery && state.delivery.kirana_pickup) || []).map((p) => cap(p.item || p));
  const audio = b.audio_url && !/dummy\.invalid/.test(b.audio_url) ? b.audio_url : null;
  const words = String(b.text || "").split(/\s+/).filter(Boolean);
  const replied = !!b.reply_text;
  const morning = [
    { t: "7:40", h: "Sharma Kirana", s: pickup.length ? `Picks up ${esc(pickup.join(", "))}. Baari pays the shop.` : "Nothing to pick up today", done: !!audio && !!pickup.length, ic: ICON.bag },
    { t: "7:45", h: "Voice note from Baari", s: audio ? "Sent in Hindi, under 45 seconds" : "The dish, how many, what to pick up", done: !!audio, ic: ICON.play },
    { t: "8:00", h: win ? `Cooks ${esc(win)}` : "Starts cooking", s: win ? `For ${count}${dish(win).mins ? ` · about ${dish(win).mins} min` : ""}` : "Dish locks at 9:30 pm the night before", done: replied, ic: ICON.pot },
    { t: "8:05", h: "Her reply", s: replied ? (l ? l[0] : "Replied") : "A voice note back with the counts", done: replied, ic: ICON.check },
  ];
  return `${header("")}
    <section class="cook-hero rv" style="--i:1">
      <div class="cook-bg" aria-hidden="true"></div>
      ${avatar("Sunita", "xl")}
      <h1>Sunita ji</h1>
      <p class="cook-role">Cooks for the Sharmas · 8:00 am · Hindi</p>
      <div class="cook-tags"><span>${ICON.play} Voice notes only</span><span>${ICON.lock} Never pays from her pocket</span></div>
      ${win ? `<div class="cook-today">${thali(win, "cook-img")}<div><p class="k">Kal subah</p><p class="v">${esc(win)}</p><p class="hi" lang="hi">${esc(dish(win).hi)} · ${count} log</p></div></div>` : ""}
    </section>
    <section class="sec rv" style="--i:2"><div class="sec-h"><h2>Uski subah</h2><span class="sec-k">Her morning</span></div>
      <ol class="morning glass-card">${morning.map((m) => `<li class="${m.done ? "done" : ""}"><span class="m-t">${m.t}</span><span class="m-ic">${m.icon || m.ic}</span><div><b>${m.h}</b><p>${m.s}</p></div></li>`).join("")}</ol>
    </section>
    <section class="sec rv" style="--i:3"><div class="sec-h"><h2>Telegram pe baat</h2>${brand("telegram", "inline")}</div>
      <div class="thread">
        <p class="day">Aaj, 7:45 am</p>
        ${audio ? `<div class="msg out"><div class="note">
            <button class="pp" data-play="${esc(audio)}" aria-label="Play the brief"><span class="t-icon-swap"><span class="ic-a">${ICON.play}</span><span class="ic-b">${ICON.pause}</span></span></button>
            <div class="wave" data-wave>${bars(audio, 34).map((h) => `<i style="height:${h}%"></i>`).join("")}</div>
            <span class="dur" data-dur>0:00</span></div>
          ${words.length ? `<p class="script" lang="hi" data-script>${words.map((w) => `<span>${esc(w)}</span>`).join(" ")}</p>` : ""}
          <small>Baari · voice by ${brand("gnani", "inline")}</small></div>`
          : `<div class="msg out ghost"><p>Kal subah 7:45 pe yahan Baari ka voice note aayega: ${win ? `${esc(win)}, ${count} log` : "kya banana hai, kitne log"}${pickup.length ? `, aur Sharma Kirana se ${esc(pickup.join(", "))}` : ""}.</p><small>Scheduled</small></div>`}
        ${replied ? `<div class="msg in">${avatar("Sunita", "sm")}<div><p lang="hi">${esc(b.reply_text)}</p><small>Voice note · transcribed by Gnani</small></div></div>
          <div class="heard"><span class="k">Baari ne samjha</span>${l ? `<span class="chip ${l[1]}">${esc(l[0])}</span>` : ""}${qty.map((q) => `<span class="chip">${esc(q)}</span>`).join("")}</div>`
          : audio ? `<p class="wait-line"><i></i>Waiting for her reply. No answer by 8:05 and Baari asks once more.</p>` : ""}
      </div>
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

const PLAIN = (t) => String(t || "").replace(/,?\s*BAARI-[\w-]+/g, "").replace(/Pine Labs debit SUCCESS/gi, "Payment went through").replace(/\bSUCCESS\b/g, "done").replace(/\bFAILED\b/g, "failed").replace(/\b(?:[A-Z]{1,2}\d{1,2}|E\d{2})\b[:,]?\s*/g, "").replace(/\s*\((?:rule|via)[^)]*\)/gi, "").replace(/\s{2,}/g, " ").trim();
// Diary. The agent logs one line per decision, with a rule code, a phase
// and, inside quotes, the exact message it sent. A family member doesn't
// care about the rule or the tool; they care about four moments a night and
// anything that needs them. So: one chapter per phase, a headline written
// from the state, the reason in plain words, the real messages as chat
// bubbles (three identical ones become one, to three faces), and the
// routine bits folded away.
const WHY = {
  S1: T("fits everyone's plate rules", "sabke thali ke niyam mein fit", "सबके थाली के नियम में"), S2: T("not cooked in the last 3 days", "pichhle 3 din mein nahi bana", "पिछले 3 दिन में नहीं बना"),
  V1: T("only each person's last tap counts", "har kisi ka aakhri tap hi ginta hai", "हर किसी का आख़िरी टैप ही गिना"), V2: T("a vote that breaks someone's rule moves to the other dish", "niyam todne wala vote doosri dish ko jaata hai", "नियम तोड़ने वाला वोट दूसरी डिश को"),
  V3: T("'kuch bhi' isn't a vote", "'kuch bhi' vote nahi hai", "'कुछ भी' वोट नहीं है"), V4: T("no clear winner means the first dish", "barabari mein pehli dish", "बराबरी में पहली डिश"),
  T3: T("who voted what stays private", "kisne kya chuna, private rehta hai", "किसने क्या चुना, निजी रहता है"), M2: T("checked the pantry first", "pehle pantry dekhi", "पहले पेंट्री देखी"),
  B1: T("fresh things come from the kirana", "taaza cheezein kirana se", "ताज़ी चीज़ें किराने से"), B2: T("dry staples come by Delhivery overnight", "sookha saamaan Delhivery se raat mein", "सूखा सामान डेल्हीवरी से"),
  M7: T("paid inside the daily limit", "din ki limit ke andar", "दिन की लिमिट के अंदर"), K1: T("the cook gets it as a voice note, in Hindi", "cook ko Hindi voice note", "कुक को हिंदी वॉइस नोट"), K4: T("Baari pays the shop, never the cook", "dukaan ko Baari deta hai, cook nahi", "दुकान को बारी देता है"),
};
const CHAP = {
  SHORTLIST: { at: "8:30 pm", ic: "send", t: T("Two dishes went out", "Do dishes bheji", "दो डिश भेजीं") },
  LOCK: { at: "9:30 pm", ic: "check", t: T("Votes counted", "Vote gine gaye", "वोट गिने गए") },
  CHECK: { at: "10:45 pm", ic: "moon", t: T("Night check", "Raat ki jaanch", "रात की जाँच") },
  BRIEF: { at: "7:45 am", ic: "play", t: T("Sunita got her brief", "Sunita ko brief mila", "सुनीता को ब्रीफ़ मिला") },
  COOK: { at: "8:05 am", ic: "pot", t: T("Sunita replied", "Sunita ka jawab", "सुनीता का जवाब") },
};
function phaseOf(d) {
  if (d.phase && CHAP[d.phase]) return d.phase;
  const h = +(String(d.at || "").split(":")[0] || 0);
  if (h >= 20 && String(d.at) < "21:30") return "SHORTLIST";
  if (String(d.at) >= "21:30" && h < 22) return "LOCK";
  if (h >= 22 || h < 7) return "CHECK";
  if (/reply|bataya|Kirana ko pay/i.test(d.text || "")) return "COOK";
  return "BRIEF";
}
// The message inside the decision, if it was sent to a person.
function said(d) {
  const t = String(d.text || "");
  const m = t.match(/"([^"]{8,})"\s*$/);
  if (!m) return null;
  let q = m[1];
  if (/text=/.test(q)) q = q.split("text=")[1];
  if (/^(tool |get_|elevenlabs|\{)|voice_id=|result |query=|\b[a-z]+_[a-z_]+\b|\w=\S/.test(q)) return null;
  return q.replace(/^tg\.send to \w+:\s*/, "");
}
function toWhom(d) {
  const t = String(d.text || "");
  const m = t.match(/to (Vinay|Mummy|Papa|Sunita)/) || t.match(/(Sunita)/);
  if (m) return [m[1]];
  if (/vote with buttons|without vote breakdown/.test(t)) return null;
  return null;
}
function chapters() {
  const s = state;
  const dec = s.decisions || [];
  const win = s.locked && s.locked.winner;
  const list = (s.shortlist || []).map(dishName);
  const paid = ((s.khata || {}).debits || []).filter((x) => x.status === "SUCCESS");
  const failed = ((s.khata || {}).debits || []).filter((x) => x.status === "FAILED");
  const by = {};
  dec.forEach((d) => { const p = phaseOf(d); (by[p] = by[p] || []).push(d); });
  return Object.keys(CHAP).filter((p) => by[p]).map((p) => {
    const ds = by[p];
    const rules = [...new Set(ds.flatMap((d) => String(d.rule || "").split(/[,\s]+/)))].filter((r) => WHY[r]);
    // Group identical messages: the same text to three people is one bubble.
    const msgs = [];
    ds.forEach((d, i) => {
      const q = said(d);
      if (!q) return;
      const who = toWhom(d) || [PEOPLE[i % PEOPLE.length]];
      const same = msgs.find((m) => m.q === q);
      if (same) who.forEach((w) => { if (!same.who.includes(w)) same.who.push(w); });
      else msgs.push({ q, who: [...who] });
    });
    const all = ds.map((d) => d.text).join(" ");
    let head = CHAP[p].t, sub = "", tone = "", kind = "note", money = 0;
    if (p === "SHORTLIST") { sub = list.length ? `${list.join(T(" or ", " ya ", " या "))}` : ""; kind = "msg"; }
    if (p === "LOCK") {
      head = win ? T(`${win} won`, `${win} jeeta`, `${win} जीता`) : head;
      sub = /kuch bhi/i.test(all) ? T("Everyone said 'kuch bhi', so the first dish won", "Sabne 'kuch bhi' kaha, toh pehli dish jeeti", "सबने 'कुछ भी' कहा, तो पहली डिश जीती")
        : /aloo/i.test(all) ? T("Papa's vote moved: no potato on his plate", "Papa ka vote badla: unki thali mein aloo nahi", "पापा का वोट बदला: उनकी थाली में आलू नहीं") : "";
      money = paid.reduce((a, x) => a + (x.amount || 0), 0);
      kind = money ? "money" : "msg";
      if (failed.length) { tone = "bad"; sub = T("A payment didn't go through. Vinay was told.", "Ek payment nahi hua. Vinay ko bataya.", "एक भुगतान नहीं हुआ। विनय को बताया।"); }
    }
    if (p === "CHECK") { const quiet = /nothing sent|no shipment/i.test(all); sub = quiet ? T("All quiet. Nothing to do.", "Sab theek. Kuch karna nahi pada.", "सब ठीक। कुछ करना नहीं पड़ा।") : T("Checked the parcel and messages", "Parcel aur messages dekhe", "पार्सल और मैसेज देखे"); tone = quiet ? "quiet" : ""; }
    if (p === "BRIEF") { sub = win ? T(`${win} for ${(s.locked || {}).headcount || 4}, in a Hindi voice note`, `${win}, ${(s.locked || {}).headcount || 4} log, Hindi voice note mein`, `${win}, ${(s.locked || {}).headcount || 4} लोग, हिंदी वॉइस नोट`) : ""; kind = "cook"; }
    if (p === "COOK") { kind = /pay|Rs/i.test(all) ? "money" : "cook"; sub = PLAIN(ds[ds.length - 1].text); }
    const tag = tone === "bad" ? "need" : kind === "money" ? "money" : tone === "quiet" ? "quiet" : msgs.length ? "msg" : kind;
    return { p, at: ds[0].at || CHAP[p].at, ic: CHAP[p].ic, head, sub, rules, msgs, tone, tag, money, raw: ds };
  });
}
const DF = () => [["top", T("Highlights", "Khaas", "ख़ास")], ["money", T("Money", "Paisa", "पैसा")], ["msg", T("Messages", "Messages", "मैसेज")], ["all", T("Everything", "Sab", "सब")]];
function chapterHtml(c, i) {
  const audio = c.p === "BRIEF" && state.brief && state.brief.audio_url && !/dummy\.invalid/.test(state.brief.audio_url) ? state.brief.audio_url : null;
  return `<li class="ch ${c.tone}" style="--i:${i}" data-tag="${c.tag}">
    <span class="ch-ic">${ICON[c.ic] || ICON.check}</span>
    <div class="ch-b">
      <p class="ch-t"><b>${esc(c.head)}</b><span class="at">${esc(clock(c.at) || c.at)}</span></p>
      ${c.sub ? `<p class="ch-s">${esc(c.sub)}</p>` : ""}
      ${c.money ? `<p class="ch-money">${ICON.lock}<b>${rs(c.money)}</b> ${T("paid from Reserve Pay", "Reserve Pay se diya", "रिज़र्व पे से दिया")}</p>` : ""}
      ${c.msgs.length ? `<div class="ch-msgs">${c.msgs.slice(0, 2).map((m) => `<div class="bub"><span class="bub-who">${m.who.slice(0, 4).map((w) => avatar(w, "xs")).join("")}</span><p>${esc(m.q)}</p></div>`).join("")}${c.msgs.length > 2 ? `<p class="ch-more">+${c.msgs.length - 2} ${T("more", "aur", "और")}</p>` : ""}</div>` : ""}
      ${audio ? `<button class="ch-play" type="button" data-play="${esc(audio)}"><span class="t-icon-swap"><span class="ic-a">${ICON.play}</span><span class="ic-b">${ICON.pause}</span></span>${T("Play what she heard", "Jo unhone suna, woh suno", "जो उन्होंने सुना, वो सुनो")}</button>` : ""}
      ${c.rules.length ? `<p class="ch-why"><span>${T("Why", "Kyun", "क्यों")}</span>${esc(c.rules.map((r) => WHY[r]).join(", "))}</p>` : ""}
    </div>
  </li>`;
}
const diaryUI = { f: "top", newest: false };
function baari() {
  const ch = chapters();
  const f = diaryUI.f;
  const keep = (c) => f === "all" || (f === "top" ? c.tone !== "quiet" : c.tag === f || (f === "msg" && c.msgs.length));
  let shown = ch.filter(keep);
  const hidden = ch.length - shown.length;
  if (diaryUI.newest) shown = shown.slice().reverse();
  const paid = ((state.khata || {}).debits || []).filter((x) => x.status === "SUCCESS").reduce((a, x) => a + (x.amount || 0), 0);
  const msgN = ch.reduce((a, c) => a + c.msgs.reduce((b, m) => b + m.who.length, 0), 0);
  const need = ch.filter((c) => c.tone === "bad").length;
  const evs = events.filter((e) => e.tool).slice(-30).reverse();
  const today = new Date(nowMs() + 5.5 * 3600e3);
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * 864e5));
  return `${header(T("Diary", "Diary", "डायरी"), { sub: T("Last night, in four moments.", "Kal raat, chaar pal mein.", "कल रात, चार पल में।") })}
    <div class="days rv" style="--i:1" data-nopull>${days.map((d, i) => `<button type="button" class="${i === 6 ? "on" : "past"}" ${i === 6 ? "" : 'aria-disabled="true"'}><small>${d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</small><b>${d.getUTCDate()}</b></button>`).join("")}</div>
    <section class="sec rv dy-sum" style="--i:2">
      <div><b>${num("dpaid", rs(paid))}</b><span>${T("spent", "kharch", "ख़र्च")}</span></div>
      <div><b>${msgN}</b><span>${T("messages", "messages", "मैसेज")}</span></div>
      <div class="${need ? "need" : ""}"><b>${need}</b><span>${T("need you", "aapke liye", "आपके लिए")}</span></div>
    </section>
    <div class="dfil rv" style="--i:3">
      <div class="dseg" role="tablist">${DF().map(([k, l]) => `<button type="button" role="tab" data-df="${k}" class="${f === k ? "on" : ""}" aria-selected="${f === k}">${l}</button>`).join("")}<i class="dseg-pill"></i></div>
      <button type="button" class="dsort" data-dsort aria-label="${T("Change order", "Order badlo", "क्रम बदलो")}">${diaryUI.newest ? "↑" : "↓"}</button>
    </div>
    <section class="sec rv" style="--i:4">${shown.length ? `<ol class="chs">${shown.map(chapterHtml).join("")}</ol>` : `<div class="empty"><b>${ch.length ? T("Nothing here for this filter", "Is filter mein kuch nahi", "इस फ़िल्टर में कुछ नहीं") : T("Tonight's story starts at 8:30 pm", "Aaj ki kahani 8:30 baje shuru hogi", "आज की कहानी 8:30 बजे शुरू होगी")}</b></div>`}
      ${hidden && f === "top" ? `<button type="button" class="dy-quiet" data-df="all">${T(`${hidden} routine check${hidden > 1 ? "s" : ""}, all fine. Show`, `${hidden} routine jaanch, sab theek. Dikhao`, `${hidden} रूटीन जाँच, सब ठीक। दिखाओ`)}</button>` : ""}
    </section>
    ${evs.length ? `<details class="sec techlog rv" style="--i:5"><summary>${T("Show the technical log", "Technical log dikhao", "तकनीकी लॉग दिखाओ")}<span class="chev">${ICON.chev}</span></summary>
      <ul class="calls">${evs.map((ev) => `<li class="${evBad(ev) ? "bad" : ""}">${BRAND[ev.rail] ? `<span class="call-b">${brand(ev.rail)}</span>` : `<span class="call-b sys">${ICON.pot}</span>`}<p>${esc(cap(evText(ev)))}</p><span class="at">${esc(hhmm(ev.at_ist))}</span></li>`).join("")}</ul></details>` : ""}`;
}

// ---- the island: where tonight stands in one short line, and the run
// behind it when you tap.
const STEP_IC = { short: "send", vote: "lock", buy: "bag", land: "truck", brief: "play", cook: "pot" };
const SHORT = {
  short: () => T("Dishes go out 8:30", "8:30 pe dishes", "8:30 पर डिश"),
  vote: () => T("Votes close 9:30", "Vote 9:30 tak", "वोट 9:30 तक"),
  buy: () => T("Ordering saamaan", "Saamaan mangana", "सामान मँगाना"),
  land: () => T("Parcel on the way", "Parcel raaste mein", "पार्सल रास्ते में"),
  brief: () => T("Brief at 7:45", "7:45 pe brief", "7:45 पर ब्रीफ़"),
  cook: () => T("Waiting on Sunita", "Sunita ka intezaar", "सुनीता का इंतज़ार"),
};
function liveNow() {
  const st = steps(state);
  const cur = st.findIndex((x) => !x.done);
  const x = cur < 0 ? st[st.length - 1] : st[cur];
  const d = doing();
  const win = pickDish();
  const title = cur < 0 ? T("All done for today", "Aaj ka kaam ho gaya", "आज का काम हो गया") : d.busy ? d.text : x.at ? `${x.title} · ${x.at}` : x.title;
  const sub = cur < 0 ? T("Sunita confirmed. Next run 8:30 pm", "Sunita ne confirm kiya. Agla run 8:30 pm", "सुनीता ने पक्का किया। अगला रन 8:30 pm") : x.body.replace(/<[^>]+>/g, "");
  const short = local.treat ? T("Treat night 🍕", "Aaj treat 🍕", "आज ट्रीट 🍕") : d.busy ? d.text.replace(/…$/, "") : cur < 0 ? T("All done", "Sab ho gaya", "सब हो गया") : (SHORT[x.key] || (() => x.title))();
  return { st, cur, x, title, sub, short, win, pct: (cur < 0 ? st.length : cur) / st.length };
}

// Minutes from now until a step's clock time ("9:30 pm", "7:45 am").
function untilMin(at) {
  const m = String(at || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return null;
  let h = +m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0);
  const n = new Date(nowMs() + 5.5 * 3600e3);
  let d = h * 60 + +m[2] - (n.getUTCHours() * 60 + n.getUTCMinutes());
  if (d < 0) d += 1440;
  return d;
}
const inMin = (d) => (d < 60 ? T(`in ${d} min`, `${d} min mein`, `${d} मिनट में`) : T(`in ${Math.floor(d / 60)}h ${d % 60}m`, `${Math.floor(d / 60)} ghante ${d % 60} min mein`, `${Math.floor(d / 60)} घंटे ${d % 60} मिनट में`));

// The island grows into a card that takes the top half of the screen: a
// clip-path opens from the pill's own outline, so it reads as the same
// object getting bigger. Up top, where tonight stands; below, a stack of
// cards for whatever needs you.
function openIsland(focus) {
  const pill = document.querySelector(".isl");
  if (!pill || document.querySelector(".islx")) return;
  const L = liveNow();
  const ak = asks();
  haptic(8);
  const nxt = L.cur >= 0 ? untilMin(L.x.at) : null;
  const w = document.createElement("div");
  w.className = "islx";
  w.innerHTML = `<div class="islx-scrim"></div><section class="islx-card" role="dialog" aria-modal="true" aria-label="${T("Tonight", "Aaj raat", "आज रात")}">
    <div class="islx-in">
      <div class="islx-now">
        ${L.win && dish(L.win).file ? `<span class="islx-th"><img src="/img/dishes/${dish(L.win).file}.webp" alt=""></span>` : `<span class="islx-th mk"><img src="/img/baari-mark.png" alt=""></span>`}
        <div class="islx-nt"><p class="islx-k">${L.cur < 0 ? T("Tonight's done", "Aaj ka ho gaya", "आज का हो गया") : nxt !== null ? `${esc(L.x.title)} · ${inMin(nxt)}` : esc(L.x.title)}</p><h2>${esc(L.short)}</h2></div>
        <button type="button" class="islx-x" aria-label="Close">${ICON.chev}</button>
      </div>
      <ol class="track6" style="--p:${(L.cur < 0 ? 1 : L.cur / (L.st.length - 1)).toFixed(3)}">${L.st.map((y, i) => `<li class="${y.done ? "done" : i === L.cur ? "cur" : ""}" style="--i:${i}"><span>${y.done ? ICON.check : ICON[STEP_IC[y.key]]}</span><small>${esc(y.at ? y.at.replace(/ (am|pm)/, "") : "")}</small></li>`).join("")}</ol>
      <p class="islx-sub">${esc(L.sub)}</p>
      ${ak.length ? `<div class="islx-h"><b>${T("For you", "Aapke liye", "आपके लिए")}</b><span data-akn>${ak.length}</span></div>
        <div class="acs" data-acs>${ak.map(askCard).join("")}</div>
        <div class="acs-dots">${ak.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`
        : `<p class="islx-clear">${ICON.check}${T("Nothing needs you. Baari has it.", "Aapke liye kuch nahi. Baari sambhal raha hai.", "आपके लिए कुछ नहीं। बारी सँभाल रहा है।")}</p>`}
    </div>
  </section>`;
  document.body.appendChild(w);
  const card = w.querySelector(".islx-card");
  const clipFrom = () => {
    const r = pill.getBoundingClientRect(), c = card.getBoundingClientRect();
    return `inset(${r.top - c.top}px ${c.right - r.right}px ${c.bottom - r.bottom}px ${r.left - c.left}px round ${r.height / 2}px)`;
  };
  card.style.clipPath = clipFrom();
  document.documentElement.classList.add("isl-open");
  void card.offsetHeight;
  w.classList.add("is-open");
  card.style.clipPath = "inset(0 round 34px)";
  const close = () => {
    if (w.classList.contains("is-closing")) return;
    w.classList.remove("is-open");
    w.classList.add("is-closing");
    card.style.clipPath = clipFrom();
    document.documentElement.classList.remove("isl-open");
    setTimeout(() => { w.remove(); renderTop(); }, 420);
  };
  w.querySelector(".islx-scrim").onclick = close;
  w.querySelector(".islx-x").onclick = close;
  const acs = w.querySelector("[data-acs]");
  if (acs) {
    // One card at a time, paged by a swipe the app owns (not native
    // scroll), so it always settles on a whole card and never drifts
    // sideways. The strip takes the shown card's height.
    let idx = 0;
    const step = () => acs.clientWidth + 16;
    const fit = () => { const c = acs.children[idx]; if (c) acs.style.height = `${c.offsetHeight}px`; };
    const go = (n, anim = true) => {
      idx = Math.max(0, Math.min(acs.children.length - 1, n));
      acs.classList.toggle("drag", !anim);
      acs.style.setProperty("--x", `${-idx * step()}px`);
      w.querySelectorAll(".acs-dots i").forEach((d, k) => d.classList.toggle("on", k === idx));
      fit();
    };
    acs.go = (n) => go(n ?? idx);
    new ResizeObserver(() => go(idx, false)).observe(acs);
    [...acs.children].forEach((c) => new ResizeObserver(fit).observe(c));
    requestAnimationFrame(() => go(0, false));
    if (focus) { const c = acs.querySelector(`[data-card="${focus}"]`); if (c) requestAnimationFrame(() => go([...acs.children].indexOf(c), false)); }
    let sw = null, dragAt = 0;
    // The lift after a drag isn't a tap.
    acs.addEventListener("click", (c) => { if (performance.now() - dragAt < 350) { c.stopPropagation(); c.preventDefault(); } }, true);
    acs.addEventListener("pointerdown", (e) => {
      if (e.target.closest("[data-scr], input")) return;
      sw = { x: e.clientX, y: e.clientY, t: performance.now(), on: false, id: e.pointerId };
    });
    acs.addEventListener("pointermove", (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (!sw.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
        if (Math.abs(dx) < 8) return;
        sw.on = true;
        acs.setPointerCapture(e.pointerId);
      }
      const edge = (idx === 0 && dx > 0) || (idx === acs.children.length - 1 && dx < 0);
      acs.classList.add("drag");
      acs.style.setProperty("--x", `${-idx * step() + (edge ? dx / 3 : dx)}px`);
    });
    const end = (e) => {
      if (!sw) return;
      const s0 = sw; sw = null;
      if (!s0.on) return;
      const dx = e.clientX - s0.x, v = dx / Math.max(1, performance.now() - s0.t);
      const n = dx < -step() / 3 || v < -0.4 ? idx + 1 : dx > step() / 3 || v > 0.4 ? idx - 1 : idx;
      if (n !== idx && n >= 0 && n < acs.children.length) haptic(4);
      go(n);
      dragAt = performance.now();
    };
    acs.addEventListener("pointerup", end);
    acs.addEventListener("pointercancel", () => { if (sw && sw.on) go(idx); sw = null; });
    w.querySelector(".acs-dots").addEventListener("click", (e) => { const d = e.target.closest("i"); if (d) go([...d.parentElement.children].indexOf(d)); });
    wireAsks(w, acs, close);
  }
  // Swipe the top of it back up into the island.
  let y0 = null, dy = 0;
  const head = w.querySelector(".islx-now");
  head.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; y0 = e.clientY; dy = 0; head.setPointerCapture(e.pointerId); });
  head.addEventListener("pointermove", (e) => { if (y0 === null) return; dy = Math.min(0, e.clientY - y0); if (dy < 0) card.style.transform = `translateY(${dy * 0.5}px) scale(${1 + dy / 2000})`; });
  head.addEventListener("pointerup", () => { if (y0 === null) return; y0 = null; card.style.transform = ""; if (dy < -50) close(); });
  addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); removeEventListener("keydown", k); } });
}

// The cards inside the island. A finished card folds away and the count in
// the island ticks down.
function wireAsks(w, acs, close) {
  const finish = (card, msg) => {
    haptic(12);
    card.classList.add("done");
    card.insertAdjacentHTML("beforeend", `<div class="ac-ok"><span class="t-success-check" data-state="in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>${esc(msg)}</b></div>`);
    saveLocal();
    setTimeout(() => {
      card.classList.add("fold");
      setTimeout(() => {
        const i = [...acs.children].indexOf(card);
        card.remove();
        w.querySelectorAll(".acs-dots i")[i]?.remove();
        acs.go?.();
        const n = acs.children.length;
        const nb = w.querySelector("[data-akn]");
        if (nb) nb.textContent = n;
        renderTop();
        if (!n) { w.querySelector(".islx-h")?.remove(); acs.outerHTML = `<p class="islx-clear">${ICON.check}${T("All caught up.", "Sab ho gaya.", "सब हो गया।")}</p>`; }
      }, 380);
    }, 900);
  };
  w.addEventListener("click", (e) => {
    const t = e.target;
    const card = t.closest(".ac");
    if (!card) return;
    const ak = t.closest("[data-ak]");
    if (ak) {
      const k = ak.dataset.ak;
      if (k === "find") { local.leaveOk = 1; saveLocal(); close(); setTimeout(() => cookFinder({ cook: "Sunita", dish: pickDish() || "" }), 300); return; }
      if (k === "leave-ok") { local.leaveOk = 1; finish(card, T("Okay. Baari tells the family.", "Theek. Baari family ko bata dega.", "ठीक। बारी परिवार को बता देगा।")); return; }
      if (k === "left-done") { local.leftDone = 1; finish(card, T("Got it. Tomorrow's amounts change.", "Samajh gaya. Kal ki quantity badlegi.", "समझ गया। कल की मात्रा बदलेगी।")); return; }
      if (k === "fridge-done") { local.fridgeDone = 1; finish(card, T("Noted. The vote follows the fridge.", "Note kiya. Vote fridge ke hisaab se.", "नोट किया।")); return; }
    }
    const fz = t.closest("[data-fz]");
    if (fz) {
      const g = new Set(local.gone || []);
      g.has(fz.dataset.fz) ? g.delete(fz.dataset.fz) : g.add(fz.dataset.fz);
      local.gone = [...g]; saveLocal(); haptic(6);
      fz.classList.toggle("gone");
      const f = FRIDGE.find((x) => x.k === fz.dataset.fz);
      fz.querySelector("small").textContent = fz.classList.contains("gone") ? T("used", "khatam", "ख़त्म") : days(f.d);
      swapText(card.querySelector("[data-fline] span"), fridgeLine());
      return;
    }
    if (t.closest("[data-call]")) { toast({ icon: "📞", title: T("Baari will call at 7 pm", "Baari 7 baje call karega", "बारी 7 बजे कॉल करेगा"), body: T("Two minutes, in Hinglish. Prototype.", "2 minute, Hinglish mein. Prototype.", "2 मिनट। प्रोटोटाइप।") }); return; }
    const ans = t.closest("[data-ans]");
    if (ans) {
      local.learn = local.learn || { i: 0 };
      if (ans.dataset.ans) { local.learn.a = { ...(local.learn.a || {}), [local.learn.i]: ans.dataset.ans }; haptic(8); }
      local.learn.i++; local.learn.v = null; saveLocal();
      const q = card.querySelector(".aq");
      q.classList.add("out");
      setTimeout(() => {
        if (local.learn.i >= ASK.length) { finish(card, T("That's plenty. Baari learns the rest by itself.", "Kaafi hai. Baaki Baari khud seekh lega.", "काफ़ी है।")); return; }
        const fresh = document.createElement("div"); fresh.innerHTML = askCard("q");
        q.replaceWith(fresh.querySelector(".aq"));
      }, 180);
      return;
    }
    const ls = t.closest("[data-lstep]");
    if (ls) {
      const st = ASK[(local.learn || {}).i || 0].step;
      local.learn = local.learn || { i: 0 };
      local.learn.v = Math.max(2000, (local.learn.v || st.v) + st.by * +ls.dataset.lstep);
      const v = card.querySelector(".xc b"); v.textContent = st.fmt(local.learn.v);
      card.querySelector(".ln-ok").dataset.ans = local.learn.v;
      v.classList.remove("tick-up", "tick-down"); void v.offsetWidth; v.classList.add(+ls.dataset.lstep > 0 ? "tick-up" : "tick-down");
      haptic(4);
    }
  });
  // Leftover rows: one drag along the row sets how much is left, with a
  // tick at every step. A tap on a cell sets it too.
  let sc = null;
  acs.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-scr]");
    if (!el) return;
    sc = { el, v: -1 };
    el.setPointerCapture(e.pointerId);
    scrub(e);
  });
  const scrub = (e) => {
    const r = sc.el.getBoundingClientRect();
    const v = Math.max(0, Math.min(4, Math.ceil(((e.clientX - r.left) / r.width) * 4 - 0.15)));
    if (v === sc.v) return;
    sc.v = v;
    sc.el.style.setProperty("--v", v);
    sc.el.setAttribute("aria-valuenow", v);
    sc.el.querySelectorAll("i").forEach((c, k) => { const on = k < v; if (on !== c.classList.contains("on")) { c.classList.toggle("on", on); if (on) { c.classList.remove("bop"); void c.offsetWidth; c.classList.add("bop"); } } });
    sc.el.parentElement.querySelector(".lv-w").textContent = LEVEL[v];
    local.left = { ...(local.left || {}), [sc.el.dataset.scr]: v };
    haptic(4);
    swapText(sc.el.closest(".ac").querySelector("[data-plan] span"), leftPlan());
  };
  acs.addEventListener("pointermove", (e) => { if (sc) scrub(e); });
  acs.addEventListener("pointerup", () => { if (sc) { sc = null; saveLocal(); } });
  acs.addEventListener("pointercancel", () => { sc = null; });
}
// The week/month switch: the pill slides, the card tweens to the new
// height, the readout swaps its text.
function spendMode(btn) {
  const c = btn.closest(".ks"), m = btn.dataset.ksm;
  if (c.dataset.ks === m) return;
  const h0 = c.offsetHeight;
  c.dataset.ks = m;
  c.querySelectorAll("[data-ksm]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
  c.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
  swapText(c.querySelector("[data-ksk]"), btn.dataset.k);
  swapText(c.querySelector("[data-ksv]"), btn.dataset.v);
  const h1 = c.offsetHeight;
  c.style.height = `${h0}px`; void c.offsetHeight;
  c.style.height = `${h1}px`;
  setTimeout(() => (c.style.height = ""), 420);
  haptic(6);
}
function spendMonth(btn) {
  const c = btn.closest(".ks"), box = c.querySelector("[data-mos]");
  const n = Math.max(0, Math.min(2, +box.dataset.m + +btn.dataset.kmo));
  if (n === +box.dataset.m) return;
  const dir = +btn.dataset.kmo;
  box.dataset.m = n;
  box.querySelectorAll("[data-mo]").forEach((p) => { const on = +p.dataset.mo === n; p.hidden = !on; if (on) { p.style.setProperty("--dir", dir); p.classList.remove("in"); void p.offsetWidth; p.classList.add("in"); } });
  c.querySelectorAll("[data-kmo]").forEach((b) => (b.disabled = (+b.dataset.kmo > 0 && n === 2) || (+b.dataset.kmo < 0 && n === 0)));
  c.querySelectorAll("[data-kd].sel").forEach((x) => x.classList.remove("sel"));
  const mb = c.querySelector('[data-ksm="m"]');
  mb.dataset.k = box.dataset[`k${n}`]; mb.dataset.v = box.dataset[`v${n}`];
  swapText(c.querySelector("[data-kmn]"), mb.dataset.k);
  swapText(c.querySelector("[data-ksk]"), mb.dataset.k);
  swapText(c.querySelector("[data-ksv]"), mb.dataset.v);
  haptic(5);
}
function spendDay(el) {
  const c = el.closest(".ks"), on = el.classList.contains("sel");
  c.querySelectorAll("[data-kd].sel").forEach((x) => x.classList.remove("sel"));
  const src = on ? c.querySelector(`[data-ksm="${c.dataset.ks}"]`) : el;
  if (!on) el.classList.add("sel");
  swapText(c.querySelector("[data-ksk]"), src.dataset.k);
  swapText(c.querySelector("[data-ksv]"), src.dataset.v);
  haptic(4);
}

// Text swap (transitions.dev): the old line blurs out, the new one in.
function swapText(el, text) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
}

// A bottom sheet: grabber, rises with a spring, drag down or tap out to close.
function sheet(html, cls = "") {
  const w = document.createElement("div");
  w.className = `sheet-w ${cls}`;
  w.innerHTML = `<div class="sheet-scrim"></div><section class="sheet" role="dialog" aria-modal="true"><span class="sheet-grab" aria-hidden="true"></span>${html}</section>`;
  document.body.appendChild(w);
  document.documentElement.classList.add("sheet-open");
  // Paint the closed position first, or the sheet just appears.
  void w.offsetHeight;
  w.classList.add("is-open");
  haptic(6);
  const sh = w.querySelector(".sheet");
  const close = () => {
    w.classList.remove("is-open");
    w.classList.add("is-closing");
    sh.style.transform = "";
    document.documentElement.classList.remove("sheet-open");
    setTimeout(() => w.remove(), 320);
  };
  w.querySelector(".sheet-scrim").onclick = close;
  w.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  let y0 = null, dy = 0;
  sh.addEventListener("pointerdown", (e) => { if (sh.scrollTop <= 0 && e.target.closest(".sheet-grab, .sheet-h")) { y0 = e.clientY; sh.setPointerCapture(e.pointerId); sh.style.transition = "none"; } });
  sh.addEventListener("pointermove", (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; });
  sh.addEventListener("pointerup", () => { if (y0 === null) return; y0 = null; sh.style.transition = ""; if (dy > 90) close(); else sh.style.transform = ""; dy = 0; });
  return { w, close };
}

// ---- receipt: a till slip prints out of a slot at the top of the screen,
// line by line, and can be torn off. Built from the state already on the
// phone, so it appears at once instead of loading a page.
function openReceipt() {
  const s = state;
  const k = s.khata || {};
  const debits = (k.debits || []).filter((d) => d.status !== "FAILED");
  const total = debits.reduce((a, d) => a + (d.amount || 0), 0);
  const L = s.locked || {};
  const missing = s.missing || [];
  const h = s.household || {};
  const date = s.date_for || (String(s.now_ist || "").slice(0, 10));
  const row = (a, b, cls = "") => `<p class="rr ${cls}"><span>${a}</span><span>${b}</span></p>`;
  const paper = `<div class="rc-paper">
    <div class="rc-in">
      <img class="rc-mark" src="/img/baari-mark.png" alt="">
      <p class="rc-title">BAARI</p>
      <p class="rc-c">${esc(h.name || "Sharma")} ghar · Flat ${esc(h.flat || "402")}</p>
      <p class="rc-c">${esc(date)} · order ${esc(String(total).slice(-4) || "0000")}</p>
      <p class="rc-dash"></p>
      ${L.winner ? row("THALI", esc(L.winner).toUpperCase(), "b") + row("Log", esc(L.headcount || 4)) + (L.runner_up ? row("Runner-up", esc(L.runner_up)) : "") : ""}
      <p class="rc-dash"></p>
      <p class="rc-h">SAAMAAN</p>
      ${missing.length ? missing.map((m) => row(esc(cap(m.item || m)), m.route === "kirana" ? "KIRANA" : "DELHIVERY")).join("") : row("Sab ghar mein tha", "-")}
      <p class="rc-dash"></p>
      <p class="rc-h">PAYMENTS · UPI RESERVE PAY</p>
      ${debits.map((d) => row(esc(d.to || "Staples hub"), rs(d.amount)) + `<p class="rc-ref">${esc(d.ref || "")}</p>`).join("")}
      <p class="rc-dash"></p>
      ${row("TOTAL", rs(total), "t")}
      ${row("Daily cap", rs(k.cap_today || 40000))}
      ${row("Left in block", rs(k.left ?? 0))}
      <p class="rc-dash"></p>
      <p class="rc-c b">*** GHAR KI COPY ***</p>
      <p class="rc-c">Paid by Baari, inside limits Vinay set.<br>Sunita paid nothing.</p>
      <p class="rc-bar" aria-hidden="true"></p>
      <p class="rc-c">Agli baari: ${esc(PEOPLE[(PEOPLE.indexOf(h.duty_holder || "Vinay") + 1) % PEOPLE.length])}</p>
    </div></div>`;
  const w = document.createElement("div");
  w.className = "rc-w";
  w.innerHTML = `<div class="rc-scrim"></div><div class="rc-slot" aria-hidden="true"></div><div class="rc-scroll">${paper}</div>
    <div class="rc-acts"><button type="button" class="rc-a" data-rc="share">${ICON.copy}<span>Share</span></button><button type="button" class="rc-a main" data-rc="tear">${ICON.check}<span>Tear off</span></button><a class="rc-a" href="/receipt/${esc(date)}" target="_blank" rel="noopener">${ICON.arrow}<span>Full</span></a></div>`;
  document.body.appendChild(w);
  document.documentElement.classList.add("sheet-open");
  requestAnimationFrame(() => w.classList.add("is-printing"));
  const close = () => {
    w.classList.add("is-tearing");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(() => w.remove(), 650);
  };
  w.querySelector(".rc-scrim").onclick = close;
  w.querySelector('[data-rc="tear"]').onclick = close;
  w.querySelector('[data-rc="share"]').onclick = async () => {
    const url = `${location.origin}/receipt/${date}`;
    try { if (navigator.share) await navigator.share({ title: "Baari receipt", url }); else await navigator.clipboard.writeText(url); } catch (e) {}
  };
}

// ---- header popovers (transitions.dev menu dropdown): grow from the
// button that opened them, close a touch faster than they open. The page
// behind goes soft under a heavy blur.
function openPop(kind, btn) {
  const old = document.querySelector(".pop");
  if (old) { closePop(); if (old.dataset.kind === kind) return; }
  const h = state.household || {};
  const m = me();
  haptic(6);
  let scrim = document.querySelector(".pop-scrim");
  if (!scrim) { scrim = document.createElement("div"); scrim.className = "pop-scrim"; document.body.appendChild(scrim); }
  const el = document.createElement("div");
  el.className = "pop t-dropdown";
  el.dataset.kind = kind;
  el.dataset.origin = kind === "me" ? "top-left" : "top-right";
  el.innerHTML = kind === "me"
    ? `<div class="pop-me">${avatar(m.name, "lg")}<div><b>${esc(m.name)}</b><span>${duty() === m.name ? T("Your turn this week", "Is hafte aapki baari", "इस हफ़्ते आपकी बारी") : T(`${duty()}'s turn this week`, `Is hafte ${duty()} ki baari`, `इस हफ़्ते ${duty()} की बारी`)}</span></div></div>
      <p class="pop-k">${T("Language", "Bhasha", "भाषा")}</p>
      <div class="pop-seg">${[["en", "English"], ["hing", "Hinglish"], ["hi", "हिंदी"]].map(([k, l]) => `<button type="button" data-lang="${k}" class="${LANG === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <button type="button" class="pop-row" data-nudges>${T("Reminders", "Reminders", "रिमाइंडर")}${ICON.arrow}</button>
      <a class="pop-row" href="/?onboard">${T("Redo setup", "Setup dobara", "सेटअप दोबारा")}${ICON.arrow}</a>`
    : `<p class="pop-k">${T("Your home", "Aapka ghar", "आपका घर")}</p><b class="pop-t">${esc(h.name || "Sharma")} ghar</b>
      <p class="pop-s">Flat ${esc(h.flat || "402")}, Tower B, Sector 9, Rohini 110042</p>
      <div class="pop-faces">${[...fam().map((p) => p.name), "Sunita"].map((p) => avatar(p, "sm")).join("")}</div>
      <button type="button" class="pop-row" data-editfam>${T("Edit family", "Family badlo", "परिवार बदलो")}${ICON.arrow}</button>
      <a class="pop-row" href="https://t.me/${BOT}?start=join" target="_blank" rel="noopener">${T("Invite family on Telegram", "Family ko Telegram pe bulao", "परिवार को टेलीग्राम पर बुलाओ")}${ICON.arrow}</a>`;
  document.body.appendChild(el);
  const r = btn.getBoundingClientRect();
  el.style.top = `${r.bottom + 10}px`;
  if (kind === "me") el.style.left = `${Math.max(12, r.left)}px`; else el.style.right = `${Math.max(12, innerWidth - r.right)}px`;
  void el.offsetHeight;
  el.classList.add("is-open");
  btn.classList.add("is-on");
  document.documentElement.classList.add("pop-open");
}
function closePop() {
  const el = document.querySelector(".pop");
  document.documentElement.classList.remove("pop-open");
  document.querySelectorAll(".hb.is-on").forEach((b) => b.classList.remove("is-on"));
  if (!el) return;
  el.classList.remove("is-open");
  el.classList.add("is-closing");
  setTimeout(() => el.remove(), 150);
}

// ---- edit the family: a list you change in place. Tap a face to try the
// next one, long-press for a new colour, × to remove, + to add.
const FACES = ["🧔🏽", "👨🏽", "👩🏽", "👱🏽‍♀️", "🧕🏽", "👳🏽‍♂️", "👨🏽‍🦳", "👵🏽", "👴🏽", "👧🏽", "👦🏽", "🧒🏽"];
const TINTS = ["sand", "rose", "sky", "mint", "clay", "stone"];
function editFamily() {
  let list = fam().map((p) => ({ ...p }));
  const rows = () => list.map((p, i) => `<li style="--i:${i}" data-row="${i}"><button type="button" class="ef-av" data-face="${i}" aria-label="${T("Change face", "Chehra badlo", "चेहरा बदलो")}"><span class="av t-${p.tint}">${p.face}</span></button>
      <input value="${esc(p.name)}" data-name="${i}" maxlength="16" autocomplete="off" enterkeyhint="done" aria-label="Name">
      <button type="button" class="ef-x" data-del="${i}" aria-label="Remove">×</button></li>`).join("");
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Family", "Ghar ke log", "घर के लोग")}</p><h2>${T("Who eats at home", "Ghar mein kaun kaun", "घर में कौन कौन")}</h2><p class="sub">${T("Tap a face to change it, hold it for a new colour.", "Chehra tap karo badalne ko, dabaye rakho rang ke liye.", "चेहरा टैप करो, दबाए रखो रंग के लिए।")}</p></div>
    <ul class="ef">${rows()}</ul>
    <button type="button" class="ef-add" data-add>+ ${T("Add someone", "Kisi ko jodo", "किसी को जोड़ो")}</button>
    <button type="button" class="btn" data-save>${T("Save", "Save karo", "सेव करो")}</button>`, "fam");
  const ul = s.w.querySelector(".ef");
  const repaint = () => { ul.innerHTML = rows(); };
  s.w.addEventListener("input", (e) => { const i = e.target.dataset.name; if (i !== undefined) list[i].name = e.target.value; });
  s.w.addEventListener("click", (e) => {
    const f = e.target.closest("[data-face]");
    if (f) { const p = list[f.dataset.face]; p.face = FACES[(FACES.indexOf(p.face) + 1) % FACES.length]; const av = f.querySelector(".av"); av.textContent = p.face; av.classList.remove("bump"); void av.offsetWidth; av.classList.add("bump"); haptic(5); return; }
    const d = e.target.closest("[data-del]");
    if (d && list.length > 1) { const li = d.closest("li"); li.classList.add("gone"); haptic(10); setTimeout(() => { list.splice(+d.dataset.del, 1); repaint(); }, 220); return; }
    if (e.target.closest("[data-add]")) { list.push({ name: "", face: FACES[list.length % FACES.length], tint: TINTS[list.length % TINTS.length] }); repaint(); ul.lastElementChild.querySelector("input").focus(); haptic(6); return; }
    if (e.target.closest("[data-save]")) {
      list = list.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() }));
      local.family = list; saveLocal(); s.close(); render(); toast({ icon: "👨‍👩‍👧", title: T("Family updated", "Family update ho gayi", "परिवार अपडेट हुआ"), body: T("Baari uses it from tonight's vote", "Aaj raat ke vote se lagu", "आज रात के वोट से लागू") });
    }
  });
  longPress(ul, "[data-face]", (b) => { const p = list[b.dataset.face]; p.tint = TINTS[(TINTS.indexOf(p.tint) + 1) % TINTS.length]; b.querySelector(".av").className = `av t-${p.tint} bump`; });
}

// ---- a plate rule, in your own words. Say it or type it; Baari reads it
// back the way it understood it before keeping it.
const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"/></svg>';
function ruleSheet() {
  const set = setup();
  const list = () => (setup().custom || []).map((c, i) => `<li style="--i:${i}"><span>${esc(c)}</span><button type="button" data-rdel="${i}" aria-label="Remove">×</button></li>`).join("");
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Plate rules", "Thali ke niyam", "थाली के नियम")}</p><h2>${T("Tell Baari a rule", "Baari ko ek niyam batao", "बारी को एक नियम बताओ")}</h2><p class="sub">${T("Any language. Baari never breaks it, whatever the vote says.", "Kisi bhi bhasha mein. Vote kuch bhi kahe, Baari ye nahi todega.", "किसी भी भाषा में। बारी इसे कभी नहीं तोड़ेगा।")}</p></div>
    <div class="rs-in"><input data-rt placeholder="${T("e.g. No paneer on Mondays", "jaise: Somvaar ko paneer nahi", "जैसे: सोमवार को पनीर नहीं")}" maxlength="70" enterkeyhint="done" autocomplete="off">${R ? `<button type="button" class="rs-mic" data-rmic aria-label="Speak">${MIC_SVG}</button>` : ""}</div>
    <p class="rs-heard" data-heard hidden></p>
    <ul class="rs-list" data-rl>${list()}</ul>
    <button type="button" class="btn" data-rsave>${T("Keep this rule", "Ye niyam rakho", "ये नियम रखो")}</button>`, "rule");
  const inp = s.w.querySelector("[data-rt]"), heard = s.w.querySelector("[data-heard]");
  const readBack = () => {
    const v = inp.value.trim();
    heard.hidden = !v;
    if (v) heard.innerHTML = `<img src="/img/baari-mark.png" alt="">${T("Baari will read this as: ", "Baari samjhega: ", "बारी समझेगा: ")}<b>${esc(v.replace(/^./, (c) => c.toUpperCase()))}</b>, ${T("every day, every plate.", "har din, har thali.", "हर दिन, हर थाली।")}`;
  };
  inp.addEventListener("input", readBack);
  s.w.addEventListener("click", (e) => {
    const d = e.target.closest("[data-rdel]");
    if (d) { const st = setup(); st.custom.splice(+d.dataset.rdel, 1); localStorage.setItem("baari:setup", JSON.stringify(st)); s.w.querySelector("[data-rl]").innerHTML = list(); haptic(6); return; }
    if (e.target.closest("[data-rmic]")) {
      const b = e.target.closest("[data-rmic]"), rec = new R();
      rec.lang = LANG === "en" ? "en-IN" : "hi-IN";
      b.classList.add("rec");
      rec.onresult = (ev) => { inp.value = ev.results[0][0].transcript; readBack(); };
      rec.onend = () => b.classList.remove("rec");
      try { rec.start(); } catch (err) { b.classList.remove("rec"); }
      return;
    }
    if (e.target.closest("[data-rsave]")) {
      const v = inp.value.trim();
      if (!v) { inp.focus(); inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); return; }
      const st = setup(); st.custom = [...(st.custom || []), v]; localStorage.setItem("baari:setup", JSON.stringify(st));
      s.close();
      toast({ icon: "📜", title: T("Rule kept", "Niyam yaad rakha", "नियम याद रखा"), body: esc(v) });
    }
  });
  setTimeout(() => inp.focus(), 350);
  return set;
}

// ---- treat night: pick what's coming, then watch Baari tidy up the
// kitchen plan line by line.
function treatSheet() {
  const pick = new Set(["pizza"]);
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Treat night", "Treat night", "ट्रीट नाइट")}</p><h2>${T("Ordering in tomorrow?", "Kal bahar se mangaa rahe?", "कल बाहर से मँगा रहे?")}</h2><p class="sub">${T("Pick what's coming. Baari handles the kitchen.", "Kya aa raha hai chuno. Rasoi Baari sambhalega.", "क्या आ रहा है चुनो। रसोई बारी सँभालेगा।")}</p></div>
    <div class="tr-pick">${TREATS.map((x) => `<button type="button" class="${pick.has(x.k) ? "on" : ""}" data-tr="${x.k}"><span>${x.e}</span><b>${x.l}</b></button>`).join("")}</div>
    <ol class="tr-plan" hidden></ol>
    <button type="button" class="btn" data-go>${T("Make it a treat night", "Treat pakka karo", "ट्रीट पक्का करो")} 🎉</button>`, "treat");
  s.w.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-tr]");
    if (b) { pick.has(b.dataset.tr) ? pick.delete(b.dataset.tr) : pick.add(b.dataset.tr); b.classList.toggle("on"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); haptic(5); return; }
    const go = e.target.closest("[data-go]");
    if (!go || go.disabled) return;
    go.disabled = true;
    const plan = s.w.querySelector(".tr-plan");
    s.w.querySelector(".tr-pick").classList.add("folded");
    plan.hidden = false;
    const lines = [
      T("Telling Sunita ji: day off, paid in full", "Sunita ji ko bata rahe: chhutti, paise poore", "सुनीता जी को बता रहे: छुट्टी, पैसे पूरे"),
      T("Holding tomorrow's grocery order", "Kal ka saamaan rok rahe", "कल का सामान रोक रहे"),
      T("Palak expires today, moving it to Thursday's dish", "Palak aaj tak, Thursday ki dish mein daal rahe", "पालक आज तक, गुरुवार की डिश में"),
      T("Paneer is fine till Saturday", "Paneer Saturday tak theek", "पनीर शनिवार तक ठीक"),
      T("Vote opens again tomorrow, 8:30 pm", "Vote kal phir 8:30 pm", "वोट कल फिर 8:30 pm"),
    ];
    for (const [i, l] of lines.entries()) {
      plan.insertAdjacentHTML("beforeend", `<li class="tr-l" style="--i:${i}"><span class="tr-dot"></span>${esc(l)}</li>`);
      await new Promise((r) => setTimeout(r, 420));
      plan.lastElementChild.classList.add("ok");
      plan.lastElementChild.querySelector(".tr-dot").innerHTML = ICON.check;
      haptic(5);
    }
    local.treat = { what: [...pick] }; saveLocal();
    const r = go.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, TREATS.filter((x) => pick.has(x.k)).map((x) => x.e).concat(["🎉"]), 18);
    haptic(20);
    go.textContent = T("Enjoy!", "Maze karo!", "मज़े करो!");
    setTimeout(() => { s.close(); render(); }, 900);
  });
}

// ---- shuffle: names spin past like a slot machine and stop on the next
// dish that breaks nobody's rule. Skipped dishes say why.
const RULE_SKIP = { "Aloo puri": T("Skipped Aloo puri: no potato on Papa's plate", "Aloo puri skip: Papa ki thali mein aloo nahi", "आलू पूरी छोड़ी: पापा की थाली में आलू नहीं"), "Egg bhurji paratha": T("Skipped Egg bhurji: eggs only on weekends", "Egg bhurji skip: anda sirf weekend", "अंडा भुर्जी छोड़ी: अंडा सिर्फ़ वीकेंड") };
let spinning = false;
function shuffle() {
  const h2 = document.querySelector("[data-reel]");
  const L = state.locked;
  if (!h2 || !L || spinning) return;
  spinning = true;
  const all = Object.keys(DISHES);
  const cur = pickDish();
  let i = all.indexOf(cur), skipped = null, next = cur;
  for (let k = 0; k < all.length; k++) {
    i = (i + 1) % all.length;
    if (RULE_SKIP[all[i]]) { skipped = skipped || all[i]; continue; }
    if (all[i] !== cur) { next = all[i]; break; }
  }
  const seq = [cur, ...Array.from({ length: 9 }, (_, k) => all[(all.indexOf(cur) + k + 1) % all.length]), next];
  h2.innerHTML = `<span class="reel"><span class="reel-in" style="--n:${seq.length - 1}">${seq.map((x) => `<span>${esc(x)}</span>`).join("")}</span></span>`;
  const plate = document.querySelector(".hero-plate");
  plate && plate.classList.add("spin");
  let ticks = 0;
  const tk = setInterval(() => { haptic(3); if (++ticks > 8) clearInterval(tk); }, 90);
  setTimeout(() => {
    local.pick = next === L.winner ? null : { dish: next, from: L.winner };
    saveLocal();
    spinning = false;
   
    render();
    haptic(16);
    const note = document.querySelector(".skipnote");
    if (note && skipped) { note.textContent = RULE_SKIP[skipped]; note.classList.add("on"); setTimeout(() => note.classList.remove("on"), 2600); }
  }, 1100);
}

// Tab labels follow the language picked in onboarding.
function labelTabs() {
  const L = { ghar: T("Home", "Ghar", "घर"), khata: T("Money", "Khata", "खाता"), delivery: T("Groceries", "Saamaan", "सामान"), sunita: "Sunita", baari: T("Diary", "Diary", "डायरी") };
  document.querySelectorAll(".nav a").forEach((a) => { const sp = a.querySelector("span"); if (sp && L[a.dataset.tab]) sp.textContent = L[a.dataset.tab]; });
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
   
    return;
  }
  if (!state) {
    app.innerHTML = `<div class="skel" aria-label="Loading"><i style="width:44%;height:14px"></i><i style="width:60%;height:44px"></i><i style="height:360px;border-radius:32px;margin-top:28px"></i><i style="height:64px"></i><i style="height:64px"></i></div>`;
    return;
  }
  // The poll runs every 5 s: redraw only when something changed. Sections
  // rise in on a new screen, not on every redraw; a check or a number
  // animates only when it changed since the last paint.
  renderTop();
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
  const paint = () => {
    app.innerHTML = html;
    app.querySelectorAll(".dec-h").forEach((b) => {
      if (open.includes(b.querySelector(".dec-t").textContent)) b.setAttribute("aria-expanded", "true");
    });
    syncPlayer();
    placeSeg(false);
    placeMode();
  };
  // When the vote locks while you watch, the winning plate travels into the
  // locked card instead of the card being swapped out (View Transitions).
  const won = sameRoute && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches
    && html.includes('class="hx locked') && [...app.querySelectorAll(".hx.vote .hx-p")].find((b) => b.getAttribute("aria-label") === pickDish());
  if (won) {
    won.querySelector(".thali").style.viewTransitionName = "hx-plate";
    app.classList.remove("enter");
    ui.hx = null;
    document.startViewTransition(paint);
  } else paint();
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
  if (e.target.closest(".ag")) return;
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
  const pb = e.target.closest("[data-pop]");
  if (pb) { openPop(pb.dataset.pop, pb); return; }
  const lg = e.target.closest("[data-lang]");
  if (lg) { const set = setup(); set.ui = lg.dataset.lang; localStorage.setItem("baari:setup", JSON.stringify(set)); location.reload(); return; }
  if (!e.target.closest(".pop")) closePop();
  if (e.target.closest("[data-receipt]")) { openReceipt(); return; }
  if (e.target.closest("[data-isl]")) { openIsland(); return; }
  play(e);
});

// Everything you can poke on the home screen and the Diary.
const SAY_DEFAULT = ["Bhookh lagi!", "Kya bana hai?", "Main aa gaya"];
let lastSlide = 0;
function play(e) {
  if (justDragged() || Date.now() - lastSlide < 350) return;
  const t = e.target;
  const q = (sel) => t.closest(sel);
  let el;
  const redraw = () => { saveLocal(); render(); };
  if (q("[data-nudges]")) { closePop(); nudgeSheet(sheet); return; }
  if (q("[data-editfam]")) { closePop(); editFamily(); return; }
  if ((el = q("[data-bahi]"))) { el.classList.toggle("open"); haptic(8); return; }
  if ((el = q("[data-ksm]"))) { spendMode(el); return; }
  if ((el = q("[data-kd]"))) { spendDay(el); return; }
  if ((el = q("[data-kmo]"))) { spendMonth(el); return; }
  if ((el = q("[data-mode]"))) { local.mode = el.dataset.mode; haptic(6); redraw(); return; }
  if ((el = q("[data-inb]"))) {
    const p = el.dataset.inb, out = new Set(local.out || []);
    if (!out.has(p) && inBaari().length <= 2) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); toast({ icon: "🪙", title: T("A baari needs two", "Baari ke liye do log chahiye", "बारी के लिए दो लोग चाहिए"), body: T("Add someone before taking this one out.", "Pehle kisi aur ko jodo.", "पहले किसी और को जोड़ो।") }); return; }
    out.has(p) ? out.delete(p) : out.add(p);
    local.out = [...out];
    if (out.has(duty())) local.duty = inBaari()[0];
    haptic(8); redraw(); return;
  }
  if ((el = q("[data-coin]"))) { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); haptic(8); return; }
  if ((el = q("[data-seat]"))) {
    const who = el.dataset.seat, lines = SAYS[who] || SAY_DEFAULT;
    el.querySelector(".say")?.remove();
    el.insertAdjacentHTML("beforeend", `<span class="say">${esc(lines[Math.floor(Math.random() * lines.length)])}</span>`);
    el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
    haptic(5);
    setTimeout(() => el.querySelector(".say")?.remove(), 1700);
    return;
  }
  if ((el = q("[data-plate]"))) { ui.plate = el.dataset.plate; ui.sel = null; haptic(5); render(); return; }
  if ((el = q("[data-src]"))) { addSide(el.dataset.src, el); return; }
  if ((el = q("[data-it]"))) { ui.sel = ui.sel === el.dataset.it ? null : el.dataset.it; haptic(4); render(); return; }
  if ((el = q("[data-step]"))) {
    const pl = plateOf(ui.plate);
    pl[ui.sel] = Math.max(0, Math.min(12, (pl[ui.sel] || 0) + +el.dataset.step));
    if (!pl[ui.sel]) { delete pl[ui.sel]; ui.sel = null; }
    haptic(4); redraw();
    const v = document.querySelector(".tb-step em");
    if (v) { v.classList.remove("tick-up", "tick-down"); void v.offsetWidth; v.classList.add(+el.dataset.step > 0 ? "tick-up" : "tick-down"); }
    return;
  }
  if (q("[data-same]")) {
    const src = plateOf(ui.plate);
    fam().forEach((p) => { local.plates[p.name] = { ...src }; });
    haptic(10); redraw();
    document.querySelectorAll(".tb-who .av").forEach((a, i) => { a.style.animationDelay = `${i * 60}ms`; a.classList.add("bump"); });
    return;
  }
  if ((el = q("[data-hxi]"))) { hxPick(el); return; }
  if (q("[data-shuffle]")) { enableShake(shuffle); shuffle(); return; }
  if (q("[data-unshuffle]")) { local.pick = null; haptic(8); redraw(); return; }
  if (q("[data-untreat]")) { local.treat = null; haptic(10); redraw(); return; }
  if ((el = q("[data-tp]"))) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, [el.textContent, "✨"], 6); el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); haptic(6); return; }
  if ((el = q("[data-df]"))) { diaryUI.f = el.dataset.df; haptic(4); render(); placeSeg(true); return; }
  if (q("[data-dsort]")) { diaryUI.newest = !diaryUI.newest; haptic(4); render(); placeSeg(false); return; }
}

// An item flies from the tray onto the plate.
function addSide(k, from) {
  const pl = plateOf(ui.plate);
  const plate = document.querySelector(".tb-plate");
  if (from && plate) {
    const a = from.getBoundingClientRect(), b = plate.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "fly";
    f.textContent = (SIDES.find((x) => x.k === k) || {}).e || "🍽️";
    f.style.left = `${a.left + a.width / 2}px`; f.style.top = `${a.top + a.height / 2}px`;
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    f.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - 60}px)) scale(1.4)`, offset: 0.5 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.4 }], { duration: 420, easing: "cubic-bezier(0.22,1,0.36,1)" }).onfinish = () => f.remove();
  }
  setTimeout(() => {
    pl[k] = Math.min(12, (pl[k] || 0) + 1);
    ui.sel = k;
    ui.added = k;
    saveLocal(); render(); haptic(8);
    ui.added = null;
    const p = document.querySelector(".tb-plate");
    p && (p.classList.remove("got"), void p.offsetWidth, p.classList.add("got"));
  }, from ? 380 : 0);
}

// The Diary filter pill slides between options.
function placeSeg(animate) {
  const box = document.querySelector(".dseg");
  if (!box) return;
  const on = box.querySelector(".on"), pill = box.querySelector(".dseg-pill");
  if (!animate) pill.style.transition = "none";
  pill.style.width = `${on.offsetWidth}px`;
  pill.style.transform = `translateX(${on.offsetLeft - 3}px)`;
  if (!animate) { void pill.offsetWidth; pill.style.transition = ""; }
}

// Pointer play that needs more than a click: bowls you drag, the plate you
// swipe, seats, the coin, magnets and tray items you drag around.
function wirePlay() {
  const app = $("#app");
  // Swipe the hero plate sideways to shuffle.
  let sx = null;
  app.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-plate-swipe]")) sx = e.clientX; });
  app.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 60) { enableShake(shuffle); shuffle(); } else if (sx !== null) { const p = e.target.closest("[data-plate-swipe]"); p && steam(p); tilt(document.querySelector(".hero-plate")); } sx = null; });
  // The turn rail: drag the coin sideways, it ticks past each person in
  // the baari and snaps to the nearest one on release.
  let rl = null;
  app.addEventListener("pointerdown", (e) => {
    const c = e.target.closest("[data-coin]");
    if (!c) return;
    const rail = c.closest("[data-rail]"), box = c.closest(".fam2");
    rl = { c, rail, box, x0: e.clientX, moved: false, who: duty() };
    c.setPointerCapture(e.pointerId);
  });
  app.addEventListener("pointermove", (e) => {
    if (!rl) return;
    const r = rl.rail.getBoundingClientRect();
    if (Math.abs(e.clientX - rl.x0) > 4) rl.moved = true;
    if (!rl.moved) return;
    const n = seats().length, ring = inBaari();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    rl.c.classList.add("dragging");
    rl.c.style.left = `${f * 100}%`;
    const who = ring.reduce((b, p) => (Math.abs((seats().indexOf(p) + 0.5) / n - f) < Math.abs((seats().indexOf(b) + 0.5) / n - f) ? p : b), ring[0]);
    if (who !== rl.who) { rl.who = who; haptic(5); rl.box.querySelectorAll(".f2-p").forEach((p) => p.classList.toggle("near", p.dataset.seat === who)); }
  });
  app.addEventListener("pointerup", () => {
    if (!rl) return;
    const { c, moved, who } = rl;
    rl = null;
    c.classList.remove("dragging");
    if (!moved) return;
    lastSlide = Date.now();
    if (who === duty()) { c.style.left = `${((seats().indexOf(duty()) + 0.5) / seats().length) * 100}%`; return; }
    local.duty = who; saveLocal(); haptic(14); render();
    toast({ icon: "🪙", title: T(`${who}'s baari now`, `Ab ${who} ki baari`, `अब ${who} की बारी`), body: mode() === "pick" ? T("They pick tonight's dish. Others can veto once.", "Aaj ki dish wahi chunenge. Baaki ek veto.", "आज की डिश वही चुनेंगे।") : T("They break ties and okay anything over ₹300.", "Tie wahi todenge, ₹300 se upar unki haan.", "टाई वही तोड़ेंगे।") });
  });
  dragger(app, ".tb-src", { targets: "[data-drop]", drop(el, over) { if (!over) return false; addSide(el.dataset.src, null); return "stay"; } });
  dragger(app, ".tb-it", {
    targets: "[data-drop]",
    drop(el, over) {
      if (over) return false;
      const pl = plateOf(ui.plate);
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, ["💨"], 3);
      delete pl[el.dataset.it]; ui.sel = null; saveLocal(); haptic(10); render();
      return "stay";
    },
  });
  dragger(app, ".tp", {});
}

// What the + menu's live actions do.
function onAct(k, tile, closeMenu) {
  if (k === "treat") return treatSheet();
  if (k === "leave") return cookFinder({ cook: "Sunita", dish: pickDish() || "" });
  if (k === "shuffle") { if (routeNow()) location.hash = "#/"; setTimeout(() => { document.querySelector(".hx, .hero")?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(shuffle, 450); }, 120); return; }
  if (k === "left") { local.leftDone = 0; saveLocal(); setTimeout(() => openIsland("left"), 80); return; }
  if (k === "rule") return ruleSheet();
  if (k === "guest") {
    // The tile turns into a stepper in place.
    if (!tile.classList.contains("stepping")) {
      tile.classList.add("stepping");
      local.guests = local.guests || 1;
      tile.querySelector("b").innerHTML = `<span class="xc on"><span data-g="-1">−</span><em>${local.guests}</em><span data-g="1">+</span></span>`;
      haptic(6);
      tile.onclick = (e) => {
        const g = e.target.closest("[data-g]");
        e.stopPropagation();
        if (!g) { tile.classList.remove("stepping"); tile.onclick = null; closeMenu(); saveLocal(); render();
          const n = local.guests;
          toast({ icon: "🙏", title: n ? T(`${n} guest${n > 1 ? "s" : ""} tomorrow`, `Kal ${n} mehmaan`, `कल ${n} मेहमान`) : T("No guests", "Koi mehmaan nahi", "कोई मेहमान नहीं"), body: n ? T(`Sunita cooks for ${4 + n}. About ${n * 3} extra roti.`, `Sunita ${4 + n} logon ka banayengi. Lagbhag ${n * 3} roti extra.`, `सुनीता ${4 + n} लोगों का बनाएँगी।`) : "" });
          return; }
        local.guests = Math.max(0, Math.min(12, local.guests + +g.dataset.g));
        const em = tile.querySelector("em"); em.textContent = local.guests;
        em.classList.remove("tick-up", "tick-down"); void em.offsetWidth; em.classList.add(+g.dataset.g > 0 ? "tick-up" : "tick-down");
        haptic(4);
      };
    }
  }
}

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
  closePop();
  render();
  scrollTo({ top: 0 });
});

const ready = splash({ skip: !!FIXTURE && !qs.has("splash") });
fab({ onAct });
glass($(".nav"), { borderRadius: 32, backgroundOpacity: 0.28, saturation: 1.9, blur: 10, brightness: 70, distortionScale: -110 });
wirePlay();
pullToRefresh(() => load());
labelTabs();
render();
load().then(async () => {
  if (ready) await ready();
  if (needsOnboarding()) onboard({ onDone: () => { movePill(routeNow(), false); initInstall(); } });
  else initInstall({ quiet: !!FIXTURE });
  // Once a session the island speaks up: first whatever's waiting, later
  // the cook's leave (the demo moment for the cook finder).
  if (!needsOnboarding() && routeNow() === "") {
    let seen = false;
    try { seen = sessionStorage.getItem("baari:peek"); sessionStorage.setItem("baari:peek", "1"); } catch (e) {}
    const ak = asks();
    if (!seen && ak.includes("left")) setTimeout(() => toast({ icon: "🍲", title: T("Anything left from dinner?", "Raat ka khaana bacha?", "रात का खाना बचा?"), body: T("Five seconds. Tomorrow's amounts change.", "5 second. Kal ki quantity uske hisaab se.", "5 सेकंड। कल की मात्रा उसी हिसाब से।"), action: { label: T("Tell", "Batao", "बताओ"), run: () => openIsland("left") }, ms: 7000 }), 2600);
    if (!seen && ak.includes("leave")) setTimeout(() => toast({ icon: avatar("Sunita", "sm"), title: T("Sunita ji is off tomorrow", "Sunita ji kal chhutti pe hain", "सुनीता जी कल छुट्टी पर"), body: T("Find a cook nearby?", "Paas mein cook dhoondhein?", "पास में कुक ढूँढें?"), action: { label: T("Find", "Dhoondho", "ढूँढो"), run: () => cookFinder({ cook: "Sunita", dish: pickDish() || "" }) }, ms: 8000 }), 14000);
  }
});
setInterval(() => {
  if (document.visibilityState === "visible") load();
}, 5000);
if ("serviceWorker" in navigator && !FIXTURE) navigator.serviceWorker.register("/sw.js").catch(() => {});
