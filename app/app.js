import { initInstall } from "./install.js";
import { splash, fab } from "./shell.js";
import { onboard, needsOnboarding } from "./onboard.js";
import { haptic, burst, steam, pullToRefresh, enableShake, tilt, dragger, longPress, touch, justDragged } from "./play.js";
import { toast, cookFinder, nudgeSheet } from "./extras.js";
import { faceHtml, lookFor } from "./avatars.js";
import { editorHtml, wireEditor } from "./faceedit.js";
import { mx } from "./icons.js";
import { glass } from "./glass.js";
import { verb } from "./verbs.js";
import { inviteHtml, wireInvite, sendInvite, drawQr, JOIN } from "./invite.js";
import { voiceCard, openVoice } from "./voice.js";
import { cuisineCard, openCuisine } from "./cuisine.js";

// Baari household app. A window onto what the agent did: every number comes
// from GET /app/state (rails, PRD 11.3), the activity from /app/events. No
// state of its own, no decisions. Votes deep-link into the Telegram bot.
const RAILS = "https://baari-rails.vercel.app";
const onPages = /pages\.dev$|baari\./.test(location.hostname);
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
// ?offline pretends the network dropped after the first load (for testing
// the offline island without pulling the cable).
const SIMOFF = qs.has("offline");
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
  "Chole chawal": { file: "chole-chawal", tint: "#F3DFC6", hi: "छोले चावल", mins: 50 },
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
// Names come from this house's setup, never from the demo. The demo values
// are only the fallback when nothing was set.
const cookN = () => setup().cook || "Sunita";
const cookHi = () => (cookN() === "Sunita" ? "सुनीता" : cookN());
const cookAt = () => setup().time || "8:00";
const cookLang = () => setup().lang || "Hindi";
const homeN = () => (state && state.household && state.household.name) || setup().home || "Sharma";
// Light, dark or follow the phone. The switch itself is a view transition
// that wipes the new theme in from the button you tapped.
// Bade akshar: everything on the page a size up, for whoever finds the
// default small (often Papa and Mummy). Set before first paint in index.html.
function bigText() { try { return localStorage.getItem("baari:big") === "1"; } catch (e) { return false; } }
function setBig(on) {
  try { localStorage.setItem("baari:big", on ? "1" : "0"); } catch (e) {}
  const go = () => document.documentElement.classList.toggle("big", on);
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(go); else go();
  haptic(8);
}
function theme() { try { return localStorage.getItem("baari:theme") || "system"; } catch (e) { return "system"; } }
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const t = theme(), dk = t === "dark" || (t === "system" && darkMQ.matches);
  document.documentElement.classList.toggle("dk", dk);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = dk ? "#0F0E0C" : "#F6F4EF";
}
darkMQ.addEventListener?.("change", applyTheme);
function setTheme(t, btn) {
  try { localStorage.setItem("baari:theme", t); } catch (e) {}
  haptic(8);
  const swap = () => {
    applyTheme();
    document.querySelectorAll("[data-theme-set]").forEach((b) => { const on = b.dataset.themeSet === t; b.setAttribute("aria-checked", String(on)); b.querySelector("svg").outerHTML = mx({ light: "sun-1", system: "setting-2", dark: "moon" }[b.dataset.themeSet], on); });
  };
  const was = document.documentElement.classList.contains("dk");
  const will = t === "dark" || (t === "system" && darkMQ.matches);
  if (was === will || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) { swap(); return; }
  const r = btn.getBoundingClientRect();
  document.documentElement.style.setProperty("--tx", `${r.left + r.width / 2}px`);
  document.documentElement.style.setProperty("--ty", `${r.top + r.height / 2}px`);
  document.documentElement.classList.add("theme-vt");
  const v = document.startViewTransition(swap);
  v.ready.catch(() => {});
  v.finished.catch(() => {}).finally(() => document.documentElement.classList.remove("theme-vt"));
}
const shopN = () => ((state && state.khata && state.khata.payees) || [])[0] || "Sharma Kirana";
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
// Whoever reads Hindi sees the dish in Devanagari first, Latin under it.
const hiFirst = () => LANG === "hi";
const dishLabel = (n) => (hiFirst() && dish(n).hi) || n;

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
// It keeps its age and the recent events too, so with no network the app
// still shows the whole evening, stamped with how old it is.
const CACHE_KEY = "baari:state";
let savedAt = 0;
if (!FIXTURE) {
  try {
    state = fresh(JSON.parse(localStorage.getItem(CACHE_KEY)));
    savedAt = +localStorage.getItem("baari:stateAt") || 0;
    events = JSON.parse(localStorage.getItem("baari:events")) || [];
    if (events.length) lastEvent = events[events.length - 1].id;
  } catch (e) { state = null; events = []; }
}
// "abhi", "6 min", "2 ghante": how old the cached state is
function age(ms) {
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return T("just now", "abhi ka", "अभी का");
  if (m < 60) return T(`${m} min old`, `${m} min purana`, `${m} मिनट पुराना`);
  const h = Math.floor(m / 60);
  return T(`${h} hr old`, `${h} ghante purana`, `${h} घंटे पुराना`);
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

// Icons are mx-icons (icons.js), bold so they sit well at small sizes.
const ICON = {
  arrow: mx("arrow-right", true), check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>', bag: mx("bag-2", true), truck: mx("truck", true),
  play: mx("play", true), pause: mx("pause", true), lock: mx("lock", true), copy: mx("copy", true),
  moon: mx("moon", true), sun: mx("sun-1", true), pot: mx("chef-hat", true), home: mx("home-2", true), send: mx("send-2", true),
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
    if (SIMOFF && state) throw new Error("offline (simulated)");
    if (FIXTURE) {
      state = await (await fetch(`/fixtures/${FIXTURE}.json`)).json();
      savedAt = Date.now() - (SIMOFF ? 6 * 60000 : 0);
    } else {
      const base = onPages ? "/api" : `${RAILS}/app`;
      const [s, e] = await Promise.all([
        fetch(`${base}/state`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${base}/events?after=${lastEvent}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);
      state = fresh(s);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch (err) { /* private mode */ }
      const seen = lastEvent;
      for (const ev of e.events || []) if (!events.some((x) => x.id === ev.id)) events.push(ev);
      // A new thing someone did on Telegram or in the app flashes in the
      // island for a few seconds (not on the first load).
      const news = seen ? (e.events || []).filter((x) => x.id > seen && x.kind && evKind(x)).pop() : null;
      if (news) ISL.news = { text: evKind(news).t, until: Date.now() + 6000 };
      events.sort((a, b) => a.id - b.id);
      if (events.length) lastEvent = events[events.length - 1].id;
      events = events.slice(-200);
      savedAt = Date.now();
      try { localStorage.setItem("baari:stateAt", String(savedAt)); localStorage.setItem("baari:events", JSON.stringify(events.slice(-80))); } catch (err) {}
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
  "tg.send": "Messaging the family", "tg.voice": `Sending ${cookN()} her voice note`, "tg.updates": "Reading Telegram",
  "pl.balance": "Checking the Reserve Pay block", fetch_sbmd_subscription: "Checking the Reserve Pay block",
  "pl.debit": "Paying through Pine Labs", "pl.payee": `Paying ${shopN()}`, speech_to_text: "Listening to a voice note",
  text_to_speech: `Recording ${cookN()}'s brief`, pincode_serviceability: "Checking Delhivery reaches Rohini",
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
  return title ? `<div class="title rv ${opts.obj ? "has-obj" : ""}" style="--i:1"><h1>${opts.obj ? `<img class="title-obj" src="/img/obj/${opts.obj}.webp" alt="" decoding="async">` : ""}${esc(title)}</h1>${opts.sub ? `<p class="title-sub">${opts.sub}</p>` : ""}</div>` : "";
}
function renderTop() {
  const top = $("#top");
  if (!top || !state) return;
  const L = liveNow();
  // Offline means the last fetch failed, not that one hasn't landed yet, so
  // a reopen doesn't flash "offline" before the first answer comes back.
  const stale = failed && (!FIXTURE || SIMOFF);
  const d = doing();
  const tone = stale ? "off" : d.busy ? "busy" : L.cur < 0 ? "done" : "on";
  const line = stale ? `${T("Offline", "Offline", "ऑफ़लाइन")} · ${age(savedAt)}` : ISL.text || L.short;
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
  t.classList.toggle("t-shimmer", d.busy || !!ISL.text);
  isl.style.setProperty("--p", (L.cur < 0 ? 1 : Math.max(0.04, L.pct)).toFixed(3));
  // Things waiting for you sit in the island as a small count.
  const n = asks().length, nb = top.querySelector(".isl-n");
  if (nb.textContent !== String(n || "")) { nb.textContent = n || ""; if (n) { nb.classList.remove("bump"); void nb.offsetWidth; nb.classList.add("bump"); } }
}
// The island is never a still label while Baari works. When a tool is
// running it trades between a kitchen verb (verbs.js) and the real task;
// otherwise every so often it says what it's keeping an eye on for the
// current step, then goes back to the status.
const WATCH = {
  short: () => T("Reading everyone's rules", "Sabke niyam padh rahi hoon", "सबके नियम पढ़ रही हूँ"),
  vote: () => T("Counting votes", "Vote gin rahi hoon", "वोट गिन रही हूँ"),
  buy: () => T("Checking prices", "Daam dekh rahi hoon", "दाम देख रही हूँ"),
  land: () => T("Watching the parcel", "Parcel pe nazar", "पार्सल पर नज़र"),
  brief: () => T(`Writing ${cookN()}'s note`, `${cookN()} ka note likh rahi hoon`, `${cookHi()} का नोट लिख रही हूँ`),
  cook: () => T("Keeping an eye on lunch", "Lunch pe nazar", "लंच पर नज़र"),
};
// The agent's steps in plain words while a run is going (S4), from rails'
// run.steps. Each tool gets its own line in the app's language; rails' own
// English line is the fallback.
const STEP_T = {
  "tg.updates": () => T("Reading the family's messages", "Family ke messages padh rahi hoon", "परिवार के मैसेज पढ़ रही हूँ"),
  "hh.kitchen": () => T("Checking the kitchen", "Rasoi dekh rahi hoon", "रसोई देख रही हूँ"),
  knowledge_base_search: () => T("Reading the house notes", "Ghar ke niyam padh rahi hoon", "घर के नियम पढ़ रही हूँ"),
  "kr.order": (x) => T(x.text, x.text.replace("Sharma Kirana order:", "Sharma Kirana se order:"), x.text),
  "pl.payee": (x) => T(x.text, x.text.replace(/^Paid Sharma Kirana (Rs \d+) on Pine Labs$/, "Pine Labs se Sharma Kirana ko $1"), x.text),
  "pl.debit": (x) => T(x.text, x.text.replace(/^Paid (.+) on Pine Labs$/, "Pine Labs se $1"), x.text),
  "pl.balance": () => T("Checking the Pine Labs block", "Pine Labs block dekh rahi hoon", "पाइन लैब्स ब्लॉक देख रही हूँ"),
  create_shipment: () => T("Booking Delhivery", "Delhivery book kar rahi hoon", "डेल्हीवरी बुक कर रही हूँ"),
  text_to_speech: () => T("Recording a voice note", "Voice note bana rahi hoon", "वॉइस नोट बना रही हूँ"),
  speech_to_text: () => T("Listening to a voice note", "Voice note sun rahi hoon", "वॉइस नोट सुन रही हूँ"),
};
const stepLine = (x) => (STEP_T[x.tool] ? STEP_T[x.tool](x) : x.text);
function runLive() {
  const r = state && state.run;
  if (!r || !r.running || !r.steps || !r.steps.length) return null;
  const last = r.steps[r.steps.length - 1];
  return Date.now() - istMs(last.at_ist) < 120000 ? last : null;
}
const ISL = { n: 0, text: null, v: null, news: null };
setInterval(() => {
  if (!state || document.visibilityState !== "visible" || document.querySelector(".islx")) return;
  ISL.n++;
  const d = doing(), L = liveNow();
  let text = null;
  const live = runLive();
  if (ISL.news && Date.now() < ISL.news.until) text = ISL.news.text;
  else if (live) text = `${stepLine(live)}…`;
  else if (d.busy) { const ph = ISL.n % 5; if (ph === 0 || !ISL.v) ISL.v = verb(LANG); text = ph < 3 ? ISL.v : null; }
  else if (L.cur >= 0 && WATCH[L.x.key] && ISL.n % 16 >= 13) text = `${WATCH[L.x.key]()}…`;
  if (text !== ISL.text) { ISL.text = text; renderTop(); }
}, 1000);

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
  const out = [
    { key: "short", at: "8:30 pm", title: "Two dishes sent", done: list.length > 0, next: "two dishes at 8:30 pm", brand: "telegram",
      body: list.length ? `${esc(list.join(" or "))}, to everyone on Telegram` : "Picked from the pantry and everyone's rules" },
    { key: "vote", at: clock(v.closes_at || "21:30"), title: win ? `${esc(win)} won` : "Votes close", done: !!win, next: `votes close at ${clock(v.closes_at || "21:30")}`,
      body: win ? `${headcount()} eating${L.runner_up ? ` · ${esc(L.runner_up)} goes first next time` : ""}` : list.length ? `${voted} of ${PEOPLE.length} have voted` : "Everyone votes privately" },
    { key: "buy", at: "", title: nothingToBuy ? "Nothing to buy" : "Staples ordered", done: !!(d.waybill || paid || nothingToBuy), next: "order what's missing", brand: paid ? "pinelabs" : null,
      body: d.waybill || paid ? `${staples.length ? esc(staples.join(", ")) + " · " : ""}${paid ? `${rs(paid.amount)} from Reserve Pay` : "booked"}` : nothingToBuy ? "The pantry has it all" : "Dry staples by Delhivery, fresh from the kirana" },
    { key: "land", at: eta ? clock(hhmm(d.expected)) : "", title: dl ? "Parcel delivered" : "Parcel lands", done: !!(dl || nothingToBuy), next: "the parcel", brand: d.waybill ? "delhivery" : null, warn: spare !== null && spare < 0 && !dl,
      body: d.waybill ? (dl ? "In the kitchen" : spare >= 0 ? `${spare} min before the 7:30 cutoff` : `${-spare} min past the cutoff. Baari has a backup`) : "Before 7:30 am" },
    { key: "brief", at: "7:45 am", title: `${cookN()}'s brief`, done: !!b.audio_url, next: `${cookN()}'s brief at 7:45 am`, brand: b.audio_url ? "gnani" : null,
      body: b.audio_url ? "Hindi voice note sent" : "A Hindi voice note: the dish, the count, the pickup" },
    { key: "cook", at: `${cookAt()} am`, title: win ? `${cookN()} cooks` : `${cookN()} cooks`, done: reply === "confirmed_with_counts", next: `${cookN()} at ${cookAt()} am`,
      body: reply === "confirmed_with_counts" ? "She confirmed the counts" : b.reply_text ? "She replied, Baari is checking" : win ? `${esc(win)} for ${headcount()}` : "Lunch for the family" },
  ];
  return pineStep(s, out);
}

// When the block can't or mustn't pay alone, Baari asks the approver on
// Telegram with a Pine Labs checkout link. The buy step shows that ask and
// its answer: paid, said no, or still waiting.
function pineStep(s, out) {
  const req = ((s.pinelabs || {}).requests || []).slice(-1)[0];
  const buy = out.find((x) => x.key === "buy");
  if (!req || !buy) return out;
  const who = req.approver || "Vinay";
  const demo = req.api === "demo" ? " (demo checkout)" : "";
  if (req.status === "WAITING") Object.assign(buy, { title: `Waiting for ${esc(who)}'s yes`, done: false, brand: "pinelabs", body: `${rs(req.amount)} pay request on Pine Labs${demo}` });
  else if (req.status === "PAID") Object.assign(buy, { title: "Staples ordered", done: true, brand: "pinelabs", body: `${esc(who)} paid ${rs(req.amount)} on Pine Labs${demo}` });
  else Object.assign(buy, { title: `${esc(who)} said no`, done: true, brand: "pinelabs", body: `${rs(req.amount)} not paid${demo}. Baari planned around it` });
  return out;
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

// Which part of the day it is at home (IST). People open Baari at 9:35 pm
// to vote and at 7:50 am to check the morning, so Ghar leads with what
// matters now. ?at=morning|day|night forces one for testing.
function moment() {
  const f = qs.get("at");
  if (/^(morning|day|night)$/.test(f || "")) return f;
  const h = new Date(nowMs() + 5.5 * 3600e3).getUTCHours();
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "day" : "night";
}
function ghar() {
  const s = state;
  const list = s.shortlist || [];
  const locked = s.locked && s.locked.winner;
  const at = moment();
  const hero = local.treat ? treatHero() : locked ? lockedHero(s) : list.length ? voteHero(s, list) : waitingHero();
  const cooking = locked && !local.treat;
  // Night: the vote, then what it sets off. Morning: did the parcel land,
  // did the cook hear the brief, then the rest. Afternoon: lunch is done,
  // so whose baari it is tonight comes up first.
  const vc = voiceCard({ T, local, cook: cookN() }) + cuisineCard({ T, local });
  const parts = at === "morning" && cooking ? [morningCard(s), todo(s), plates(), vc, table(s)]
    : at === "day" ? [vc, table(s), cooking ? plates() : "", cooking ? todo(s) : ""]
    : [cooking ? plates() : "", cooking ? todo(s) : "", vc, table(s)];
  return `${header("")}${demoBadge()}${hero}${taskCard()}${parts.join("")}${inviteCard()}${poweredBy("Runs on", ["pinelabs", "delhivery", "gnani", "telegram"])}`;
}

// The morning at a glance: the three things that decide whether lunch
// happens, each a tap away from its own screen.
function morningCard(s) {
  const d = s.delivery || {}, b = s.brief || {}, L = s.locked || {};
  const by = Object.fromEntries(steps(s).map((x) => [x.key, x]));
  const n = headcount();
  const reply = b.reply_extract && b.reply_extract.commitment;
  const dl = by.land.done, eta = d.expected ? clock(hhmm(d.expected)) : "";
  const now = clock(hhmm(new Date(nowMs() + 5.5 * 3600e3).toISOString()));
  const rows = [
    { ic: ICON.truck, href: "#/delivery", done: dl,
      t: !d.waybill && dl ? T("Nothing to buy today", "Aaj kuch mangana nahi tha", "आज कुछ मँगाना नहीं था") : dl ? T("The staples are in", "Saamaan aa gaya", "सामान आ गया") : T("Parcel on the way", "Parcel raaste mein", "पार्सल रास्ते में"),
      s: dl ? (d.seen_at ? T(`In the kitchen since ${clock(hhmm(d.seen_at))}`, `${clock(hhmm(d.seen_at))} se kitchen mein`, `${clock(hhmm(d.seen_at))} से रसोई में`) : T("The pantry had it all", "Ghar mein sab tha", "घर में सब था")) : eta ? T(`Lands by ${eta}`, `${eta} tak pahunchega`, `${eta} तक पहुँचेगा`) : by.land.body },
    { ic: mx("microphone", true), href: "#/sunita", done: !!b.audio_url,
      t: b.audio_url ? T(`${cookN()} has the brief`, `${cookN()} ko brief mil gaya`, `${cookHi()} को ब्रीफ़ मिल गया`) : T(`${cookN()}'s brief at 7:45`, `${cookN()} ka brief 7:45 pe`, `${cookHi()} का ब्रीफ़ 7:45 पर`),
      s: b.reply_text ? `<q lang="hi">${esc(b.reply_text)}</q>` : b.audio_url ? T("Waiting for her reply", "Jawab ka intezaar", "जवाब का इंतज़ार") : T("A voice note: the dish, the count, the pickup", "Voice note: dish, kitne log, pickup", "वॉइस नोट: डिश, कितने लोग, पिकअप") },
    { ic: mx("chef-hat", true), href: "#/sunita", done: reply === "confirmed_with_counts",
      t: T(`${cookN()} at ${cookAt()} am`, `${cookN()} ${cookAt()} baje`, `${cookHi()} ${cookAt()} बजे`),
      s: reply === "confirmed_with_counts" ? T(`Confirmed: ${esc(pickDish())} for ${n}`, `Pakka: ${esc(pickDish())}, ${n} log`, `पक्का: ${esc(pickDish())}, ${n} लोग`) : `${esc(pickDish())}, ${n} ${T("eating", "log", "लोग")}` },
  ];
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>${T("This morning", "Subah ka haal", "सुबह का हाल")}</h2><span class="sec-k">${now}</span></div>
    <ul class="rows mo">${rows.map((r) => `<li class="${r.done ? "done" : ""}"><a href="${r.href}"><span class="ic">${r.ic}</span><p><b>${r.t}</b><span>${r.s}</span></p><span class="mo-st">${r.done ? ICON.check : ""}</span></a></li>`).join("")}</ul></section>`;
}

// Faces are Personas avatars on a soft tint (avatars.js). The family can be
// edited on this phone; the names are what the votes on rails are keyed by.
const TINT_OF = { Vinay: "sand", Mummy: "rose", Papa: "sky", Sunita: "mint" };
function fam() { return local.family && local.family.length ? local.family : PEOPLE.map((n) => ({ name: n, tint: TINT_OF[n] })); }
function me() {
  const set = setup();
  return { name: (state && state.household && state.household.duty_holder) || "Vinay", look: set && set.me && set.me.look, tint: set && set.me && set.me.tint };
}
function avatar(name, cls = "") {
  const f = fam().find((x) => x.name === name);
  let look = f && f.look, tint = (f && f.tint) || TINT_OF[name] || "sand";
  const m = me();
  if (name === m.name && m.look && !(f && f.look)) { look = m.look; tint = m.tint || tint; }
  return faceHtml(look || lookFor(name), tint, cls);
}
// Who's eating (S6): rails' attendance when it exists, else the locked
// count plus this phone's guests (an older feed or a fixture).
function att() { return !FIXTURE && state && state.attendance ? state.attendance : (state && state.attendance) || null; }
function headcount() { const a = att(); if (a) return a.headcount; const L = (state && state.locked) || {}; return (L.headcount || 4) + (local.guests || 0); }

// The turn lives on rails (Y1): Telegram's /baari, passes and picks move it,
// and so does this card. A fixture or an old feed falls back to this phone.
function railTurn() { const t = !FIXTURE && state && state.turn; return t && Array.isArray(t.order) && t.order.length ? t : null; }
function duty() { const t = railTurn(); return (t && (t.holder || t.next)) || local.duty || (state.household && state.household.duty_holder) || "Vinay"; }

// Every write goes through the Pages proxy, which adds the household key.
async function api(path, body) {
  const r = await fetch(`/api/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
// A turn change shows at once, then saves. If rails says no, it goes back
// and says why in one line. Undo sends the opposite change.
async function turnWrite(body, patch, label, back) {
  const t = railTurn();
  const was = JSON.stringify(t);
  patch(t); haptic(12); wbMove(render);
  if (label) undoable(label, null, back ? () => turnWrite(back.body, back.patch, null, null) : null);
  try { await api("turn", { ...body, by: me().name }); load(); }
  catch (e) {
    Object.assign(state.turn, JSON.parse(was)); wbMove(render);
    toast({ icon: "🪙", title: T("Couldn't change the baari", "Baari nahi badli", "बारी नहीं बदली"), body: String(e.message || e).slice(0, 120) });
  }
}

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
function inBaari() { const t = railTurn(); if (t) return t.order.slice(); const out = local.out || []; const r = seats().filter((p) => !out.includes(p)); return r.length ? r : seats(); }
function mode() { const t = railTurn(); return (t && t.mode) || local.mode || setup().mode || "pick"; }
const wbUI = { edit: false };
// What today's person is doing, in one line. Changes with the mode.
function wbSub(s, d) {
  const open = (s.shortlist || []).length && !(s.locked && s.locked.winner);
  const two = (s.shortlist || []).slice(0, 2).map(dishName).filter(Boolean).map((x) => x.split(" ")[0]);
  const pick = mode() === "pick";
  if (open && two.length === 2) return pick ? T(`Picks ${two[0]} or ${two[1]} by 9:30. Others can veto once.`, `${two[0]} ya ${two[1]}, 9:30 tak chunenge. Baaki ek veto.`, `${two[0]} या ${two[1]}, 9:30 तक चुनेंगे।`)
    : T(`Everyone votes on ${two[0]} or ${two[1]}. ${d} breaks a tie.`, `${two[0]} ya ${two[1]}, sab vote karein. Tie ${d} todenge.`, `${two[0]} या ${two[1]}, सब वोट करें। टाई ${d} तोड़ेंगे।`);
  return pick ? T(`Tomorrow's lunch is their call. Others can veto once.`, `Kal ka lunch inki pasand. Baaki ek veto.`, `कल का लंच इनकी पसंद। बाकी एक वीटो।`)
    : T(`Everyone votes. ${d} breaks a tie.`, `Sab vote karein. Tie ${d} todenge.`, `सब वोट करें। टाई ${d} तोड़ेंगे।`);
}
// Whose baari: today's person big at the top, the queue after them in
// order, the people who only eat in a quiet row under it. Tap a face in the
// queue to give them the turn, "Aage" passes it on; every move is a view
// transition so the faces slide into their new seats. "Badlo" puts the
// card in edit mode, where tapping a face takes them in or out.
function table(s) {
  const voted = (s.votes && s.votes.voted) || [];
  const open = (s.shortlist || []).length && !(s.locked && s.locked.winner);
  const order = seats(), ring = inBaari();
  const d = ring.includes(duty()) ? duty() : ring[0];
  const at = ring.indexOf(d);
  const queue = ring.slice(at + 1).concat(ring.slice(0, at));
  const outs = order.filter((p) => !ring.includes(p));
  const pick = mode() === "pick";
  const vt = (p) => `--vt:wb-${order.indexOf(p)}`;
  const ed = wbUI.edit;
  const tag = (p, i) => open && !pick ? (voted.includes(p) ? `<small class="ok">${T("Voted", "Vote diya", "वोट दिया")}</small>` : `<small>${T("Waiting", "Baaki", "बाकी")}</small>`)
    : `<small>${i === 0 ? T("Next", "Agla", "अगला") : T("Then", "Phir", "फिर")}</small>`;
  const face = (p, i, out) => `<li><button type="button" class="wb-f ${out ? "out" : ""}" ${ed ? `data-inb="${esc(p)}"` : out ? "" : `data-turn="${esc(p)}"`} aria-label="${esc(p)}"><span class="wb-av" style="${vt(p)}">${avatar(p, "")}${ed ? `<i class="wb-x">${out ? mx("add") : mx("minus")}</i>` : ""}</span><b>${esc(p)}</b>${out ? "" : tag(p, i)}</button></li>`;
  return `<section class="sec rv" style="--i:5"><div class="sec-h"><h2>${T("Whose baari", "Kiski baari", "किसकी बारी")}</h2><button type="button" class="wb-ed ${ed ? "on" : ""}" data-wbedit>${ed ? T("Done", "Ho gaya", "हो गया") : T("Edit", "Badlo", "बदलो")}</button></div>
    <div class="wb card-w ${ed ? "editing" : ""}" data-nopull>
      <div class="wb-top">
        <span class="wb-me" style="${vt(d)}">${avatar(d, "")}<img class="wb-coin" src="/img/baari-mark.png" alt=""></span>
        <div class="wb-t"><p class="wb-k">${T("Today's turn", "Aaj ki baari", "आज की बारी")}</p><h3>${esc(d)}</h3><p class="wb-sub" data-wbsub>${esc(wbSub(s, d))}</p></div>
      </div>
      <div class="wb-q">
        <ol class="wb-l">${queue.map((p, i) => face(p, i, false)).join("")}</ol>
        ${ed ? "" : `<button type="button" class="wb-pass" data-pass aria-label="${T("Pass the turn", "Baari aage do", "बारी आगे दो")}"><span>${T("Pass", "Aage", "आगे")}</span>${mx("arrow-right")}</button>`}
      </div>
      ${outs.length ? `<div class="wb-o"><p>${T("Only eat, no turn", "Sirf khaate, baari nahi", "सिर्फ़ खाते, बारी नहीं")}</p><ol class="wb-l">${outs.map((p, i) => face(p, i, true)).join("")}</ol></div>` : ""}
      <div class="wb-m"><span>${T("How it's decided", "Kaise tay hoga", "कैसे तय होगा")}</span>
        <div class="f2-mode" role="radiogroup"><button type="button" role="radio" data-mode="pick" class="${pick ? "on" : ""}" aria-checked="${pick}">${T("Turn picks", "Baari wala", "बारी वाला")}</button><button type="button" role="radio" data-mode="vote" class="${pick ? "" : "on"}" aria-checked="${!pick}">${T("Everyone votes", "Sab vote", "सब वोट")}</button><i class="f2-mpill"></i></div></div>
      <a class="f2-cook" href="#/sunita">${avatar(cookN(), "sm")}<span><b>${cookN()} ji</b><small>${T(`Cooks at ${cookAt()} am, not in the baari`, `Subah ${cookAt()} baje, baari se bahar`, `सुबह ${cookAt()} बजे, बारी से बाहर`)}</small></span>${ICON.arrow}</a>
    </div></section>`;
}
// Re-render with the faces sliding to their new seats.
// ---- undo. One-tap changes (whose turn, who eats, cancelling a treat,
// deleting a rule) happen at once and can be taken back for four seconds,
// instead of asking "are you sure?" first. A parent's stray tap costs a tap.
const snapLocal = () => JSON.stringify(local);
const turnLine = (p) => T(`${p}'s turn now`, `Ab ${p} ki baari`, `अब ${p} की बारी`);
let undoT = 0;
function undoable(label, snap, after) {
  clearTimeout(undoT);
  document.querySelector(".undo")?.remove();
  const el = document.createElement("div");
  el.className = "undo";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="undo-t">${esc(label)}</span><button type="button" class="undo-b"><b>${T("Undo", "Wapas lo", "वापस लो")}</b></button><i class="undo-bar" aria-hidden="true"></i>`;
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add("is-shown");
  const hide = () => { clearTimeout(undoT); el.classList.remove("is-shown"); el.classList.add("is-hiding"); setTimeout(() => el.remove(), 300); };
  el.querySelector(".undo-b").addEventListener("click", () => {
    if (snap) { for (const k of Object.keys(local)) delete local[k]; Object.assign(local, JSON.parse(snap)); saveLocal(); }
    haptic(8); hide(); after && after();
  });
  undoT = setTimeout(hide, 4000);
}

function wbMove(fn) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) { fn(); return; }
  document.documentElement.classList.add("wb-vt");
  const v = document.startViewTransition(() => { fn(); app.classList.remove("enter"); });
  v.ready.catch(() => {});
  v.finished.catch(() => {}).finally(() => document.documentElement.classList.remove("wb-vt"));
}
// The mode switch pill slides like the Diary filter.
function placeMode() {
  const box = document.querySelector(".f2-mode");
  if (!box) return;
  const on = box.querySelector(".on"), pill = box.querySelector(".f2-mpill");
  pill.style.width = `${on.offsetWidth}px`;
  pill.style.transform = `translateX(${on.offsetLeft - 3}px)`;
}

// ---- every plate its own way. One dish for the house; each person's row
// shows what they eat with it. Tap a row and it opens in place into eight
// sides: tap one to add it, tap again for another, − to take one back.
// The ink line at the bottom is what goes to the cook.
const SIDES = [
  { k: "roti", e: "🫓", l: ["Roti", "Roti", "रोटी"] }, { k: "chawal", e: "🍚", l: ["Rice", "Chawal", "चावल"] }, { k: "raita", e: "🥣", l: ["Raita", "Raita", "रायता"] }, { k: "salad", e: "🥗", l: ["Salad", "Salad", "सलाद"] },
  { k: "papad", e: "🍘", l: ["Papad", "Papad", "पापड़"] }, { k: "achaar", e: "🫙", l: ["Pickle", "Achaar", "अचार"] }, { k: "dahi", e: "🥛", l: ["Curd", "Dahi", "दही"] }, { k: "nimbu", e: "🍋", l: ["Lemon", "Nimbu", "नींबू"] },
];
const sideOf = (k) => SIDES.find((x) => x.k === k) || { e: "🍽️", l: [k, k, k] };
const sideL = (k) => T(...sideOf(k).l);
const ui = { plate: null, bumped: null };
function plateOf(p) {
  local.plates = local.plates || {};
  if (!local.plates[p]) local.plates[p] = { roti: 2 };
  return local.plates[p];
}
function plateCard() {
  const people = fam().map((p) => p.name);
  const open = people.includes(ui.plate) ? ui.plate : null;
  const win = pickDish();
  const tot = {};
  people.forEach((p) => Object.entries(plateOf(p)).forEach(([k, n]) => { if (n > 0) tot[k] = (tot[k] || 0) + n; }));
  const order = (pl) => SIDES.map((x) => [x.k, pl[x.k] || 0]).filter(([, n]) => n > 0);
  const row = (p) => {
    const pl = plateOf(p), on = open === p, items = order(pl);
    return `<li class="pt-r ${on ? "open" : ""}" data-pt="${esc(p)}">
      <button type="button" class="pt-h" data-plate="${esc(p)}" aria-expanded="${on}">${avatar(p, "sm")}<b>${esc(p)}</b>
        <span class="pt-cs">${items.length ? items.map(([k, n]) => `<span class="pt-c" title="${esc(sideL(k))}">${sideOf(k).e}${n > 1 ? `<em>${n}</em>` : ""}</span>`).join("") : `<span class="pt-none">${T("Just the dish", "Bas dish", "बस डिश")}</span>`}</span>
        <i class="pt-chev">${mx("arrow-down")}</i></button>
      <div class="pt-ed"><div class="pt-ed-in">
        <div class="pt-g">${SIDES.map((x) => { const n = pl[x.k] || 0; return `<span class="pt-s ${n ? "on" : ""} ${ui.bumped === x.k && on ? "bump" : ""}"><button type="button" class="pt-add" data-side="${x.k}" aria-label="${esc(T(...x.l))}, ${n}"><span>${x.e}</span><small>${esc(T(...x.l))}</small></button>${n ? `<i class="pt-n">${n}</i><button type="button" class="pt-m" data-unside="${x.k}" aria-label="${T("One less", "Ek kam", "एक कम")}">${mx("minus")}</button>` : ""}</span>`; }).join("")}</div>
        ${people.length > 1 ? `<button type="button" class="pt-same" data-same="${esc(p)}">${mx("copy")}${T(`Give everyone ${esc(p)}'s plate`, `Sabko ${esc(p)} jaisi thali`, `सबको ${esc(p)} जैसी थाली`)}</button>` : ""}
      </div></div></li>`;
  };
  return `<div class="pt card-w">
      <div class="pt-dish">${win && dish(win).file ? thali(win, "pan-img pt-ph") : `<span class="pt-emo">🍛</span>`}<div><b>${esc(win || T("Tomorrow's dish", "Kal ki dish", "कल की डिश"))}</b><span>${T("Same dish for all. The sides are each one's own.", "Dish sabki ek. Saath mein kya, sabka apna.", "डिश सबकी एक। साथ में क्या, सबका अपना।")}</span></div></div>
      <ul class="pt-l">${people.map(row).join("")}</ul>
      <div class="pt-sum"><p><b>${T(`For ${esc(cookN())}`, `${esc(cookN())} ke liye`, `${esc(cookHi())} के लिए`)}</b>${Object.keys(tot).length ? SIDES.filter((x) => tot[x.k]).map((x) => `<span><i>${tot[x.k]}</i> ${esc(T(...x.l).toLowerCase())}</span>`).join("") : `<span>${T("just the dish", "bas dish", "बस डिश")}</span>`}</p>
        <small>${mx("microphone", true)}${T("Goes into her 7:45 voice note", "7:45 ke voice note mein jayega", "7:45 के वॉइस नोट में जाएगा")}</small></div>
    </div>`;
}
function plates() {
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>${T("Every plate, its own way", "Har thali alag", "हर थाली अलग")}</h2><span class="sec-k">${T("Tap a name", "Naam tap karo", "नाम टैप करो")}</span></div>${plateCard()}</section>`;
}
// Patch only the card, so an open row stays open and nothing else moves.
function patchPlates() {
  saveLocal();
  const old = document.querySelector(".pt");
  if (!old) { render(); return; }
  const t = document.createElement("div"); t.innerHTML = plateCard();
  old.replaceWith(t.firstElementChild);
  ui.bumped = null;
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
    ? T(`${lots[0].l}: ${LEVEL[lv[lots[0].k]].toLowerCase()} left. Tomorrow it becomes ${lots[0].k === "chawal" ? "lemon rice" : lots[0].k === "roti" ? "roti noodles" : "parathas"}, and ${cookN()} cooks less.`, `${lots[0].l} ${LEVEL[lv[lots[0].k]].toLowerCase()} bacha. Kal iske ${lots[0].k === "chawal" ? "nimbu chawal" : lots[0].k === "roti" ? "roti noodles" : "parathe"} banenge, naya kam banega.`, `${lots[0].l} ${LEVEL[lv[lots[0].k]]} बचा। कल इससे ${lots[0].k === "chawal" ? "नींबू चावल" : lots[0].k === "roti" ? "रोटी नूडल्स" : "पराठे"} बनेंगे।`)
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
// What Baari still wants to know, one at a time in the island. Each answer
// changes something real: what gets cooked, how much, what gets ordered,
// how the vote runs, how far the money can go without asking.
const RS = (v) => "₹" + v.toLocaleString("en-IN");
const ASK = [
  { q: T("Which fasts does the house keep?", "Ghar mein kaun se vrat rakhte hain?", "घर में कौन से व्रत रखते हैं?"), multi: true, a: [T("Tuesdays", "Mangalvaar", "मंगलवार"), "Ekadashi", "Navratri", T("Sawan Mondays", "Sawan Somvaar", "सावन सोमवार"), T("Thursdays", "Guruvaar", "गुरुवार")], none: T("Nobody fasts", "Koi nahi", "कोई नहीं") },
  { q: T("At lunch, how many rotis does an adult usually eat?", "Lunch mein ek bada aadmi kitni roti khaata hai?", "लंच में एक बड़ा कितनी रोटी खाता है?"), why: T("So the atta and the cook's count come out right.", "Taaki atta aur cook ki ginti sahi rahe.", "ताकि आटा और गिनती सही रहे।"), step: { v: 3, by: 1, min: 1, max: 8, fmt: (v) => T(`${v} roti`, `${v} roti`, `${v} रोटी`) } },
  { q: T("Roti or rice, what goes faster?", "Roti ya chawal, zyada kya chalta hai?", "रोटी या चावल, ज़्यादा क्या चलता है?"), a: ["Roti", "Chawal", T("Both", "Dono", "दोनों")] },
  { q: T("How spicy does the house like it?", "Ghar mein teekha kitna chalta hai?", "घर में तीखा कितना चलता है?"), a: [T("Mild", "Halka", "हल्का"), T("Medium", "Medium", "मीडियम"), T("Proper spicy", "Ekdum teekha", "एकदम तीखा"), T("Differs by person", "Sabka alag", "सबका अलग")] },
  { q: T("Anything someone won't touch?", "Kuch jo koi nahi khata?", "कुछ जो कोई नहीं खाता?"), multi: true, a: ["Karela", "Baingan", "Lauki", "Bhindi", "Arbi", "Tinda"], none: T("All good", "Sab chalta hai", "सब चलता है") },
  { q: T("Does anyone have a health goal Baari should cook for?", "Kisi ka sehat ka koi goal hai, jiske hisaab se banana hai?", "किसी का सेहत का कोई लक्ष्य है?"), multi: true, a: [T("Sugar control", "Sugar control", "शुगर कंट्रोल"), T("Blood pressure", "BP", "बीपी"), T("Losing weight", "Wazan kam", "वज़न कम"), T("More protein", "Protein zyada", "प्रोटीन ज़्यादा"), T("Easy on the stomach", "Halka pet", "हल्का पेट")], none: T("Nothing specific", "Kuch khaas nahi", "कुछ ख़ास नहीं") },
  { q: T("How often can the same dish come back?", "Ek dish kitni jaldi dobara aa sakti hai?", "एक डिश कितनी जल्दी दोबारा आ सकती है?"), a: [T("Once a week, max", "Hafte mein ek baar", "हफ़्ते में एक बार"), T("Twice is fine", "Do baar chalega", "दो बार चलेगा"), T("Rajma any day", "Rajma toh kabhi bhi", "राजमा तो कभी भी")] },
  { q: T("The vote ties. What then?", "Vote barabar ho gaya. Ab?", "वोट बराबर हो गया। अब?"), a: [T("Whoever's turn decides", "Jiski baari, woh tode", "जिसकी बारी, वो तोड़े"), T("The dish we had longest ago", "Jo sabse pehle bani thi", "जो सबसे पहले बनी थी"), T("Baari flips a coin", "Baari sikka uchhale", "बारी सिक्का उछाले")] },
  { q: T("Someone hasn't voted by 9:15. Should Baari nudge them?", "9:15 tak kisi ne vote nahi kiya. Baari yaad dilaye?", "9:15 तक वोट नहीं किया। याद दिलाएँ?"), a: [T("One gentle nudge", "Ek baar, pyaar se", "एक बार, प्यार से"), T("Twice, then skip them", "Do baar, phir chhodo", "दो बार, फिर छोड़ो"), T("Don't nudge", "Mat bhejo", "मत भेजो")] },
  { q: T("Food budget for the month?", "Mahine ka khaane ka budget?", "महीने का खाने का बजट?"), why: T("Baari plans the week inside it and shows you where it went.", "Baari hafta isi ke andar plan karti hai aur hisaab dikhati hai.", "बारी हफ़्ता इसी में प्लान करती है।"), step: { v: 8000, by: 500, min: 2000, max: 40000, fmt: RS } },
  { q: T("Biggest single order Baari can pay without asking you?", "Ek order mein Baari bina pooche kitna de sakti hai?", "एक ऑर्डर में बारी बिना पूछे कितना दे सकती है?"), why: T("Above this, you get a tap to approve on Telegram.", "Isse upar, Telegram pe ek tap se haan karna hoga.", "इससे ऊपर, टेलीग्राम पर एक टैप।"), step: { v: 400, by: 100, min: 100, max: 3000, fmt: RS } },
  { q: T("Where should groceries come from first?", "Saamaan pehle kahan se aaye?", "सामान पहले कहाँ से आए?"), multi: true, a: [T("The kirana nearby", "Paas ki kirana", "पास की किराना"), T("Quick delivery apps", "Quick delivery app", "क्विक डिलीवरी ऐप"), T("The sabzi cart", "Sabzi wala thela", "सब्ज़ी वाला ठेला"), T("Weekend mandi run", "Weekend mandi", "वीकेंड मंडी")], none: T("Whatever's cheapest", "Jo sasta ho", "जो सस्ता हो") },
  { q: T("What usually happens to leftovers?", "Bacha khaana aksar kya hota hai?", "बचा खाना अक्सर क्या होता है?"), a: [T("Next day's lunch", "Agle din lunch mein", "अगले दिन लंच में"), T("The cook takes some home", "Didi le jaati hain", "दीदी ले जाती हैं"), T("Hardly any left", "Bachta hi nahi", "बचता ही नहीं")] },
  { q: T("Which days is the cook usually off?", "Cook aksar kis din chhutti leti hain?", "कुक अक्सर किस दिन छुट्टी लेती हैं?"), why: T("Baari plans an easy dish or a treat on those days.", "Un dinon Baari aasaan dish ya treat plan karegi.", "उन दिनों आसान डिश या ट्रीट।"), multi: true, a: [T("Sunday", "Ravivaar", "रविवार"), T("Saturday", "Shanivaar", "शनिवार"), T("Festivals", "Tyohaar", "त्योहार"), T("First of the month", "Mahine ki 1 tareekh", "महीने की 1 तारीख़")], none: T("No fixed day", "Koi fix nahi", "कोई फ़िक्स नहीं") },
  { q: T("When do guests usually turn up?", "Mehmaan aksar kab aate hain?", "मेहमान अक्सर कब आते हैं?"), a: [T("Weekends", "Weekend pe", "वीकेंड पर"), T("Festivals", "Tyohaar pe", "त्योहार पर"), T("Without warning", "Bina bataye", "बिना बताए"), T("Rarely", "Kabhi kabhi", "कभी-कभी")] },
  { q: T("Do the kids take a tiffin?", "Bachche tiffin le jaate hain?", "बच्चे टिफ़िन ले जाते हैं?"), a: [T("Yes, every school day", "Haan, roz", "हाँ, रोज़"), T("Sometimes", "Kabhi kabhi", "कभी-कभी"), T("No", "Nahi", "नहीं")] },
  { q: T("Should Baari plan only lunch, or more?", "Baari sirf lunch plan kare, ya aur bhi?", "बारी सिर्फ़ लंच प्लान करे, या और भी?"), a: [T("Just lunch", "Sirf lunch", "सिर्फ़ लंच"), T("Lunch and breakfast", "Lunch aur nashta", "लंच और नाश्ता"), T("All three meals", "Teeno time", "तीनों समय")] },
  { q: T("Who should the cook hear from when plans change?", "Plan badle toh cook ko kaun bataye?", "प्लान बदले तो कुक को कौन बताए?"), a: [T("Only Baari, one voice", "Sirf Baari, ek awaaz", "सिर्फ़ बारी"), T("Baari, and me if urgent", "Baari, aur zaroori ho toh main", "बारी, और ज़रूरी हो तो मैं"), T("Whoever's turn it is", "Jiski baari ho", "जिसकी बारी हो")] },
  { q: T("Try one new dish a week?", "Hafte mein ek nayi dish try karein?", "हफ़्ते में एक नई डिश?"), why: T("New dishes only enter the vote, never get forced.", "Nayi dish sirf vote mein aayegi, zabardasti nahi.", "नई डिश सिर्फ़ वोट में आएगी।"), a: [T("Yes, keep it interesting", "Haan, maza aayega", "हाँ, मज़ा आएगा"), T("Once a month", "Mahine mein ek", "महीने में एक"), T("We like what we know", "Jo pata hai wahi", "जो पता है वही")] },
];
function asks() {
  if (!state) return [];
  const out = [];
  // Money first: a waiting Pine Labs link (PL2, step 9) and the kirana's
  // Haan/Nahi (Y6), the same asks the account holder has on Telegram.
  if (waitingLink()) out.push("pl");
  if (openApproval()) out.push("ok");
  { const t = nightTask(); if (t && t.status === "open" && t.who === me().name) out.push("task"); }
  if (!local.leaveOk) out.push("leave");
  if (state.locked && state.locked.winner && !local.leftDone) out.push("left");
  if (!local.fridgeDone) out.push("fridge");
  if (((local.learn || {}).i || 0) < ASK.length) out.push("q");
  return out;
}
function waitingLink() {
  const r = ((state && state.pinelabs && state.pinelabs.requests) || []).filter((x) => x.status === "WAITING" && x.checkout_url);
  return r[r.length - 1] || null;
}
function openApproval() {
  const a = (state && state.approvals) || [];
  return a.find((x) => x && x.reference && !(local.answered || {})[x.reference]) || null;
}
const ASK_HEAD = {
  pl: () => [T("Payment", "Payment", "भुगतान"), "💳"],
  ok: () => [T("Your yes", "Aapki haan", "आपकी हाँ"), "🛒"],
  task: () => [T("Tonight's job", "Raat ka kaam", "रात का काम"), "🫘"],
  leave: () => [T("Heads-up", "Khabar", "ख़बर"), "📅"],
  left: () => [T("After dinner", "Khaane ke baad", "खाने के बाद"), "🍲"],
  fridge: () => [T("Fridge", "Fridge", "फ़्रिज"), "🧊"],
  q: () => [T("Getting to know you", "Thoda aur jaanna hai", "थोड़ा और जानना है"), "💬"],
};
function askCard(k) {
  const [lab, em] = ASK_HEAD[k]();
  let body = "";
  if (k === "pl") {
    const r = waitingLink();
    body = `<div class="ac-pay"><p class="ac-amt">${rs(r.amount)}</p><h3>${esc(r.for || T("Tonight's staples", "Aaj ka saamaan", "आज का सामान"))}</h3>${r.reason ? `<p>${esc(PLAIN(r.reason))}</p>` : ""}<p class="ac-pl">${brand("pinelabs", "inline on-dark")}${r.api === "demo" ? `<span class="tag">${T("demo checkout", "demo checkout", "डेमो")}</span>` : `<span class="tag">${T("sandbox", "sandbox", "सैंडबॉक्स")}</span>`}</p></div>
      <div class="ac-acts"><a class="ac-go" href="${esc(r.checkout_url)}" target="_blank" rel="noopener" data-ak="pl-pay">${T(`Pay ${rs(r.amount)}`, `${rs(r.amount)} pay karo`, `${rs(r.amount)} चुकाओ`)}</a><button type="button" class="ac-no" data-ak="pl-no" data-ref="${esc(r.reference)}">${T("No", "Nahi", "नहीं")}</button></div>
      <p class="ac-note">${T("Same link as on Telegram. Pay in either place.", "Telegram wala hi link hai. Kahin se bhi pay karo.", "टेलीग्राम वाला ही लिंक।")}</p>`;
  }
  if (k === "task") {
    const t = nightTask();
    body = `<h3>${esc(T(`${cap(t.item)} ${t.qty_g} g, by ${clock(String(t.by_ist).slice(11, 16))}`, `${cap(t.item)} ${t.qty_g} g, ${clock(String(t.by_ist).slice(11, 16))} tak`, `${t.item} ${t.qty_g} ग्राम`))}</h3><p>${esc(T(`For tomorrow's ${t.dish}. ${cookN()} cooks it in the morning.`, `Kal ke ${t.dish} ke liye. ${cookN()} subah banayengi.`, `कल के ${t.dish} के लिए।`))}</p>
      <div class="ac-acts"><button type="button" class="ac-go" data-ak="task-done" data-ref="${esc(t.id)}">${t.task === "soak" ? T("Soaked", "Bhigo diya", "भिगो दिया") : T("Done", "Ho gaya", "हो गया")}</button></div>`;
  }
  if (k === "ok") {
    const a = openApproval();
    body = `<div class="ac-pay">${a.amount ? `<p class="ac-amt">${rs(a.amount)}</p>` : ""}<h3>${T(`${shopN()} needs your yes`, `${shopN()} ke liye aapki haan chahiye`, `${shopN()} के लिए आपकी हाँ`)}</h3><p>${esc(a.text)}</p></div>
      <div class="ac-acts"><button type="button" class="ac-go" data-ak="ok-yes" data-ref="${esc(a.reference)}">${T("Yes", "Haan", "हाँ")}</button><button type="button" class="ac-no" data-ak="ok-no" data-ref="${esc(a.reference)}">${T("No", "Nahi", "नहीं")}</button></div>`;
  }
  if (k === "leave") body = `<div class="ac-row">${avatar(cookN(), "")}<div><h3>${T(`${cookN()} ji is off tomorrow`, `${cookN()} ji kal chhutti pe`, `${cookHi()} जी कल छुट्टी पर`)}</h3><p>${T("She said so on Telegram at 6:10 pm.", "Unhone 6:10 pm pe Telegram pe bataya.", "उन्होंने 6:10 बजे बताया।")}</p></div></div>
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
    const pct = Math.min(96, Math.round(30 + (L.i / ASK.length) * 66));
    body = `<div class="aq" data-q="${L.i}"><span class="aq-n">${L.i + 1}/${ASK.length}</span><h3>${q.q}</h3>${q.why ? `<p class="aq-why">${q.why}</p>` : ""}
      ${q.step ? `<div class="ln-a"><span class="xc on"><button type="button" data-lstep="-1" aria-label="Less">−</button><b>${q.step.fmt(L.v || q.step.v)}</b><button type="button" data-lstep="1" aria-label="More">+</button></span><button type="button" class="ln-ok" data-ans="${L.v || q.step.v}">${ICON.check}</button></div>`
        : q.multi ? `<p class="ln-m">${T("Pick all that apply", "Jitne bhi hain, sab chuno", "जितने भी हैं, सब चुनो")}</p><div class="ln-a ln-multi">${q.a.map((x) => `<button type="button" data-mans="${esc(x)}" aria-pressed="false"><i>${ICON.check}</i>${esc(x)}</button>`).join("")}<button type="button" data-ans="${esc(q.none)}">${esc(q.none)}</button></div><button type="button" class="ln-done" data-ans="" data-multi disabled>${T("Done", "Ho gaya", "हो गया")}</button>`
        : `<div class="ln-a">${q.a.map((x) => `<button type="button" data-ans="${esc(x)}">${esc(x)}</button>`).join("")}</div>`}
      <div class="aq-foot"><span class="aq-bar"><i style="width:${pct}%"></i></span><span>${L.i + 1} / ${ASK.length} · ${T(`Baari knows ${pct}%`, `Baari ${pct}% jaanti hai`, `बारी ${pct}% जानती है`)}</span></div>
      <div class="ln-alt"><button type="button" data-ans="">${T("Skip", "Chhodo", "छोड़ो")}</button><button type="button" data-call>📞 ${T("Or a 2 min call", "Ya 2 min call", "या 2 मिनट कॉल")}</button></div></div>`;
  }
  return `<article class="ac" data-card="${k}"><p class="ac-k"><span>${em}</span>${lab}</p>${body}</article>`;
}

// After the one question an auto-opened island asks, it checks in before
// taking more of your time. "Not now" folds the island away.
function moreCard() {
  const left = ASK.length - ((local.learn || {}).i || 0);
  return `<div class="aq aq-more"><span class="aq-more-ic">${ICON.check}</span><h3>${T("Thanks, that helps.", "Shukriya, kaam aayega.", "शुक्रिया, काम आएगा।")}</h3>
    <p class="aq-why">${T(`${left} more, about ${Math.max(1, Math.round(left / 4))} min. Keep going?`, `${left} aur hain, lagbhag ${Math.max(1, Math.round(left / 4))} min. Aur poochhun?`, `${left} और हैं, लगभग ${Math.max(1, Math.round(left / 4))} मिनट। और पूछूँ?`)}</p>
    <div class="aq-more-a"><button type="button" class="ac-go" data-more="1">${T("Yes, ask more", "Haan, aur poochho", "हाँ, और पूछो")}</button><button type="button" class="ac-no" data-more="0">${T("Not now", "Abhi nahi", "अभी नहीं")}</button></div></div>`;
}

// The island opens itself once the person has poked around the home screen
// a few times: by then they've seen what Baari does and a question lands as
// help, not a form. Once a session, never over a sheet or an alert, and it
// waits longer each time someone says "not now".
function watchTaps() {
  let n = 0;
  const t0 = performance.now();
  try { if (sessionStorage.getItem("baari:autoisl")) return; } catch (e) {}
  const need = () => 6 + 4 * Math.min(3, local.islNo || 0);
  const on = (e) => {
    if (e.target.closest(".islx, .vx, .sheet-w, .isa, .take, .ag, [data-isl]")) return;
    n++;
    if (n < need() || performance.now() - t0 < 8000) return;
    if (routeNow() !== "" || !asks().includes("q") || document.querySelector(".islx, .vx, .sheet-w, .isa.is-shown, .take, .ag")) return;
    removeEventListener("pointerup", on, true);
    try { sessionStorage.setItem("baari:autoisl", "1"); } catch (e) {}
    setTimeout(() => openIsland("q", { auto: true }), 350);
  };
  addEventListener("pointerup", on, true);
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
  // Tonight's pick, veto and wishes from the event stream (Y3), so a tap on
  // Telegram shows here within one poll.
  const tn = tonightEvents();
  const pk = [...tn].reverse().find((e) => e.kind === "pick");
  const vt = [...tn].reverse().find((e) => e.kind === "veto");
  const wishes = tn.filter((e) => e.kind === "wish" && e.text).slice(-2);
  const pi = pk ? two.findIndex((n) => n && pk.dish && n.toLowerCase() === String(pk.dish).toLowerCase()) : -1;
  const won = vt && pi >= 0 ? 1 - pi : pi;
  const on = ui.hx === 1 || ui.hx === 0 ? ui.hx : won >= 0 ? won : 0;
  const picked = pick && pk ? (vt
    ? `${avatar(vt.who, "xs")}<span class="hx-w">${T(`${vt.who} vetoed, so ${two[won] || "the other dish"}`, `${vt.who} ka veto, ab ${two[won] || "doosri dish"}`, `${vt.who} का वीटो, अब ${two[won] || "दूसरी डिश"}`)}</span>`
    : `${avatar(pk.who, "xs")}<span class="hx-w">${T(`${pk.who} picked ${pk.dish}`, `${pk.who} ne ${pk.dish} chuna`, `${pk.who} ने ${pk.dish} चुना`)}</span>`) : "";
  const who = picked || (pick
    ? `${avatar(duty(), "xs")}<span class="hx-w">${T(`${duty()} picks`, `${duty()} chunenge`, `${duty()} चुनेंगे`)}</span>`
    : `<span class="faces">${ring.map((p, i) => `<span class="voter ${voted.includes(p) ? "in" : ""}" style="--i:${i}" title="${esc(p)}">${avatar(p, "xs")}</span>`).join("")}</span><span class="hx-w">${voted.length}/${ring.length}</span>`);
  return `<section class="hx vote rv" style="--i:2;--on:${on};--tint:${dish(two[on]).tint || "#F3EEE2"}" data-on="${on}" data-tints="${two.map((n) => dish(n).tint || "#F3EEE2").join(" ")}">
    <i class="hx-bg" aria-hidden="true"></i>
    <p class="hx-k"><span class="hx-ey">${T("Lunch tomorrow", "Kal ka lunch", "कल का लंच")}</span><span class="hx-t">${T(`till ${till}`, `${till} tak`, `${till} तक`)}</span></p>
    <h2 class="hx-q">${T(`What should ${cookN()} make?`, `${cookN()} kya banayein?`, `${cookHi()} क्या बनाएँ?`)}</h2>
    <div class="hx-stage">${two.map((n, i) => `<button type="button" class="hx-p" data-hxi="${i}" tabindex="-1" aria-label="${esc(n)}">${thali(n, "hx-img")}</button>`).join("")}</div>
    <div class="hx-seg" role="tablist">${two.map((n, i) => `<button type="button" role="tab" data-hxi="${i}" aria-selected="${i === on}"><b${hiFirst() && dish(n).hi ? ' lang="hi"' : ""}>${esc(dishLabel(n))}</b><small>${dish(n).mins} min</small></button>`).join("")}</div>
    <div class="hx-foot">
      <p class="hx-by">${who}</p>
      <a class="hx-go" href="https://t.me/${BOT}">${ICON.send}${pick ? T("Pick", "Chuno", "चुनो") : T("Vote", "Vote", "वोट")}</a>
    </div>
    ${wishes.length ? `<ul class="hx-wish">${wishes.map((w) => `<li>${avatar(w.who, "xs")}<q>${esc(String(w.text).slice(0, 90))}</q></li>`).join("")}</ul>` : ""}
  </section>`;
}
// Events from tonight's night: since the last demo start, else the last 12
// hours.
function tonightEvents() {
  const ds = events.filter((e) => e.kind === "demo" && e.on);
  const from = ds.length ? ds[ds.length - 1].id : 0;
  const since = nowMs() - 12 * 3600e3;
  return events.filter((e) => e.kind && e.id >= from && istMs(e.at_ist) >= since);
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
    <div class="hx-meta"><p class="hx-sub">${moment() !== "night" ? T(`Today, ${cookN()} makes`, `Aaj dopahar, ${cookN()} banayengi`, `आज दोपहर, ${cookHi()} बनाएँगी`) : T(`Tomorrow, ${cookN()} makes`, `Kal dopahar, ${cookN()} banayengi`, `कल दोपहर, ${cookHi()} बनाएँगी`)}</p>${facesStack()}</div>
    ${hiFirst() && hi ? `<h2 class="hx-name" lang="hi">${esc(hi)}</h2>
    <p class="hx-hi">${esc(name)}</p>` : `<h2 class="hx-name">${esc(name)}</h2>
    <p class="hx-hi" lang="hi">${esc(hi)}</p>`}
    <p class="skipnote" aria-live="polite"></p>
    ${facesRow()}
    <div class="hx-foot">
      <dl class="hx-facts">
        <div><dd>${esc(headcount())}</dd><dt>${T("eating", "log", "लोग")}</dt></div>
        <div><dd>${w.mins}</dd><dt>min</dt></div>
        <div><dd>${esc(cookAt())}</dd><dt>${T(`${cookN()}`, `${cookN()}`, `${cookHi()}`)}</dt></div>
      </dl>
      <button type="button" class="hx-tb hx-shuf" data-shuffle aria-label="${T("Shuffle the dish", "Dish badlo", "डिश बदलो")}">${mx("shuffle", true)}${T("Shuffle", "Badlo", "बदलो")}</button>
    </div>
  </section>`;
}

// Treat night: the kitchen gets the night off and Baari keeps the fridge
// from going to waste.
const TREATS = [{ k: "pizza", e: "🍕", l: "Pizza" }, { k: "biryani", e: "🍛", l: "Biryani" }, { k: "chinese", e: "🥡", l: "Chinese" }, { k: "dosa", e: "🥞", l: "Dosa" }, { k: "chaat", e: "🥙", l: "Chaat" }, { k: "momos", e: "🥟", l: "Momos" }];
// Anything typed in gets an emoji from what it sounds like.
const TREAT_E = [[/burger/i, "🍔"], [/pasta|spaghetti/i, "🍝"], [/roll|wrap|shawarma|kathi/i, "🌯"], [/ice ?cream|kulfi/i, "🍨"], [/sushi/i, "🍣"], [/cake|pastry/i, "🎂"],
  [/sandwich/i, "🥪"], [/paratha|naan|kulcha/i, "🫓"], [/noodle|ramen|maggi|thukpa/i, "🍜"], [/kebab|tikka|tandoor/i, "🍢"], [/thali/i, "🍱"], [/idli|vada|uttapam/i, "🍙"],
  [/taco|mexican|burrito/i, "🌮"], [/fries/i, "🍟"], [/chole|bhature|puri/i, "🫓"], [/samosa|pakod/i, "🥟"], [/jalebi|gulab|sweet|mithai/i, "🍮"], [/salad|bowl/i, "🥗"], [/fish|prawn|seafood/i, "🍤"], [/chicken|mutton|butter/i, "🍗"]];
const treatEmoji = (t) => (TREAT_E.find(([r]) => r.test(t)) || [0, "🍽️"])[1];
function treatHero() {
  const t = local.treat;
  const picks = TREATS.filter((x) => (t.what || []).includes(x.k)).concat((t.custom || []).map((l) => ({ k: l, e: treatEmoji(l), l })));
  const em = picks.length ? picks.map((x) => x.e) : ["🍕"];
  return `<section class="hero treat rv" style="--i:2">
    <div class="glow" aria-hidden="true"></div>
    <div class="treat-pile" data-nopull>${em.concat(em, em).slice(0, 6).map((e, i) => `<button type="button" class="tp" data-tp style="--i:${i}">${e}</button>`).join("")}</div>
    <p class="kicker"><span class="pill swap">${T("Treat night", "Aaj treat", "आज ट्रीट")}</span>${T("Tomorrow, lunch from outside", "Kal lunch bahar se", "कल लंच बाहर से")}</p>
    <h2>${esc(picks.map((x) => x.l).join(" + ") || "Pizza")}</h2>
    <ul class="treat-did">
      <li>${ICON.check}${T(`${cookN()} ji gets the day off, paid in full`, `${cookN()} ji ki chhutti, paise poore`, `${cookHi()} जी की छुट्टी, पैसे पूरे`)}</li>
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
    return `<li><span class="ic ${kirana ? "k" : ""}">${kirana ? ICON.bag : ICON.truck}</span><p><b>${esc(cap(item))}</b><span>${kirana ? T(`${cookN()} picks up at ${shopN()}, 7:40 am`, `${cookN()} 7:40 pe ${shopN()} se le aayengi`, `${cookHi()} 7:40 पर ${shopN()} से ले आएँगी`) : `Delhivery${d.status ? ` · ${esc(STAGES[stageIndex(d.status)].toLowerCase())}` : ""}`}</span></p></li>`;
  };
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>${T("To get", "Lana hai", "लाना है")}</h2><a class="more" href="#/delivery">${T("Track", "Dekho", "देखो")} ${ICON.arrow}</a></div>
    <ul class="rows">${missing.map(row).join("")}</ul></section>`;
}

// Raat ka kaam (G9, section 13 step 13): tonight's prep task, who it's for,
// a countdown to its deadline, and Done, which posts /api/prep. Done turns
// haldi with the success check; missed shows the quick plan the cook got.
function nightTask() {
  const p = state && state.prep;
  const ts = (p && p.tasks) || [];
  return ts.find((t) => t.status === "open") || ts[ts.length - 1] || null;
}
const VERB_HI = { soak: ["soak", "bhigo do", "भिगो दो"], set_curd: ["set as curd", "dahi jama do", "दही जमा दो"], ferment: ["ferment", "khameer utha do", "ख़मीर उठा दो"], marinate: ["marinate", "marinate karo", "मैरिनेट करो"] };
function taskCard() {
  const t = nightTask();
  if (!t) return "";
  const left = Math.round((istMs(t.by_ist) - nowMs()) / 60000);
  const v = VERB_HI[t.task] || VERB_HI.soak;
  const head = T(`${cap(t.item)} ${t.qty_g} g: ${v[0]}`, `${cap(t.item)} ${t.qty_g} g ${v[1]}`, `${t.item} ${t.qty_g} ग्राम ${v[2]}`);
  const st = t.status === "done" ? `<p class="ntk-s ok">${ICON.check}${T(`${t.done_by} did it at ${clock(String(t.at_ist).slice(11, 16))}`, `${t.done_by} ne ${clock(String(t.at_ist).slice(11, 16))} pe kar diya`, `${t.done_by} ने ${clock(String(t.at_ist).slice(11, 16))} पर कर दिया`)}</p>`
    : t.status === "missed" ? `<p class="ntk-s miss">${T("Nobody got to it. The plan B:", "Reh gaya. Plan B:", "रह गया। प्लान बी:")} ${esc(t.quick || "")}</p>`
    : `<p class="ntk-s">${left > 720 ? T(`By ${clock(String(t.by_ist).slice(11, 16))}`, `${clock(String(t.by_ist).slice(11, 16))} tak`, `${clock(String(t.by_ist).slice(11, 16))} तक`) : left > 0 ? T(`${inMin(left)}, by ${clock(String(t.by_ist).slice(11, 16))}`, `${inMin(left)}, ${clock(String(t.by_ist).slice(11, 16))} tak`, `${inMin(left)}, ${clock(String(t.by_ist).slice(11, 16))} तक`) : T("Past the time", "Time nikal gaya", "समय निकल गया")}</p>`;
  return `<section class="sec rv" style="--i:2"><div class="ntk card-w ${t.status}">
    <div class="ntk-h"><span class="ntk-ic">${mx("timer-1", true)}</span><div><p class="ntk-k">${T("Tonight's job", "Raat ka kaam", "रात का काम")} · ${esc(t.dish)}</p><h3>${esc(head)}</h3></div>${avatar(t.who, "sm")}</div>
    ${st}
    ${t.status === "open" ? `<button type="button" class="btn ntk-go" data-task="${esc(t.id)}">${t.task === "soak" ? T("Soaked", "Bhigo diya", "भिगो दिया") : T("Done", "Ho gaya", "हो गया")}</button>` : ""}
  </div></section>`;
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
  return `${header(T("Khata", "Khata", "खाता"), { sub: T(`Every rupee Baari spends, inside limits only ${vin} can change`, `Baari ka har rupaya, ${vin} ki limit ke andar`, `बारी का हर रुपया, ${vin} की लिमिट के अंदर`), obj: "khata-book" })}
    <section class="sec rv" style="--i:2"><div class="bahi" data-bahi role="button" tabindex="0" aria-label="${T("Open the khata", "Khata kholo", "खाता खोलो")}">
      <div class="bahi-page">
        <p class="bp-h">${T(`${vin}'s limits`, `${vin} ke niyam`, `${vin} के नियम`)}</p>
        <ol class="bp-l">
          <li><b>${rs(capToday)}</b> ${T("a day, all payments together", "roz, sab milake", "रोज़, सब मिलाकर")}</li>
          <li><b>₹300+</b> ${T(`waits for ${vin}'s yes`, `pe ${vin} ki haan chahiye`, `पर ${vin} की हाँ`)}</li>
          <li><b>${T("One shop", "Ek dukaan", "एक दुकान")}</b> ${esc((k.payees || [`${shopN()}`]).join(", "))}</li>
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
    ${pineCard()}
    <section class="sec rv" style="--i:3"><div class="kd card-w" data-nopull>
      <div class="kd-top"><div><p class="kd-k">${T("Spent today", "Aaj ka kharch", "आज का ख़र्च")}</p><p class="kd-v"><b>${num("spent", rs(spent))}</b><span>/ ${rs(capToday)}</span></p></div>
        <p class="kd-left"><b>${rs(Math.max(0, capToday - spent))}</b><small>${T("still allowed", "aur ho sakta", "और हो सकता")}</small></p></div>
      <div class="kd-coins" aria-label="${T(`${coins - gone} of ${coins} coins left`, `${coins} mein se ${coins - gone} sikke bache`, `${coins - gone} सिक्के बचे`)}">${Array.from({ length: coins }, (_, i) => `<span class="cn ${i >= coins - gone ? "spent" : ""}" style="--i:${i}"><img src="/img/baari-mark.png" alt=""></span>`).join("")}</div>
      <p class="kd-cap">${T("Each coin is ₹50 of today's limit. A spent coin goes hollow.", "Har sikka aaj ki limit ka ₹50. Kharch hua toh khaali.", "हर सिक्का ₹50। ख़र्च हुआ तो ख़ाली।")}</p>
      <div class="kd-led">
        <div class="kd-lh"><b>${T("Today's page", "Aaj ka hisaab", "आज का हिसाब")}</b><span>${new Date(nowMs() + 5.5 * 3600e3).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" })}</span>${debits.length ? `<button class="kd-rc" type="button" data-receipt>${T("Receipt", "Parchi", "पर्ची")} ${ICON.arrow}</button>` : ""}</div>
        ${debits.length ? debits.map((d, i) => `<details class="pg-r ${d.status === "FAILED" ? "bad" : ""}" style="--i:${i}"><summary><span class="pg-ic ${kind(d) === "kirana" ? "shop" : "staples"}">${kind(d) === "kirana" ? ICON.bag : ICON.truck}</span><span class="pg-t"><b>${esc(d.to || "Baari staples hub")}</b><small>${WHAT[kind(d)]}</small></span><b class="pg-a">${rs(d.amount)}</b>${stamp(d)}</summary>
          <div class="pg-x"><p><span>${T("Why", "Kyun", "क्यों")}</span>${kind(d) === "kirana" ? WHY.B1 : WHY.B2}, ${WHY.M7}</p><p><span>Ref</span><code>${esc(d.ref || "")}</code></p><p><span>${T("Paid by", "Kisne diya", "किसने दिया")}</span>Pine Labs, UPI Reserve Pay</p></div></details>`).join("") + `<p class="pg-tot"><span>${T("Total paid", "Kul diya", "कुल दिया")}</span><b>${rs(okSum)}</b></p>`
          : `<p class="kd-empty">${T("A clean page. The first payment happens after the vote.", "Saaf panna. Pehla payment vote ke baad.", "साफ़ पन्ना। पहला भुगतान वोट के बाद।")}</p>`}
      </div>
    </div></section>
    <section class="sec rv" style="--i:4"><div class="sec-h"><h2>${T("Spending", "Kharch", "ख़र्च")}</h2><span class="sec-k">${T("Earlier days are a sample", "Pichhle din sample hain", "पिछले दिन नमूना")}</span></div>
      ${spendCard({ spent, capToday, left, dayN })}</section>
    ${settleCard({ spent, dayN, vin })}
    <p class="fine rv" style="--i:6">${T(`Baari can't add a shop or raise a limit. Only ${vin} can, from his bank app.`, `Baari na dukaan jod sakti hai, na limit badha sakti. Sirf ${vin}, apne bank app se.`, `बारी न दुकान जोड़ सकती है, न लिमिट बढ़ा सकती।`)}</p>
    ${poweredBy("Payments by", ["pinelabs"])}`;
}

// ---- Pine Labs: the household's Reserve Pay mandate and each pay request
// Baari sent the approver. Every line says whether it ran on the real
// Pine Labs sandbox or on Baari's demo stand-in.
function pineCard() {
  const p = state.pinelabs;
  if (!p) return "";
  // Pay links always go to the account holder, whoever has the baari tonight.
  const who = ((p.requests || []).slice(-1)[0] || {}).approver || "Vinay";
  // Rails names a stand-in payer "the guest"; say it the way the page speaks.
  const vin = /guest|mehmaan/i.test(who) ? T("the guest", "Mehmaan", "मेहमान") : who;
  const m = p.mandate || {};
  const real = m.real;
  const ST = {
    WAITING: ["wait", T("WAITING", "RUKA", "रुका")],
    PAID: ["ok", T("PAID", "PAID", "चुकाया")],
    DECLINED: ["bad", T("SAID NO", "NAHI", "नहीं")],
    CLOSED: ["bad", T("CLOSED", "BAND", "बंद")],
  };
  const reqs = (p.requests || []).slice().reverse();
  const last = p.last_call;
  return `<section class="sec rv" style="--i:3"><div class="sec-h"><h2>Pine Labs</h2>${last ? `<span class="sec-k">${T("Last call", "Aakhri call", "आख़िरी कॉल")} ${hhmm(last.at_ist)}</span>` : ""}</div>
    <div class="kd card-w pl-card" data-nopull>
      <div class="pl-m"><div><p class="kd-k">${T("Reserve Pay mandate", "Reserve Pay mandate", "रिज़र्व पे मैंडेट")}</p>
        <p class="pl-mv"><b>${rs(real ? real.total : (m.limits || {}).block || 500000)}</b>${real ? ` <span>${esc(real.status)}</span>` : ""}</p>
        ${real ? `<p class="pl-id"><code>${esc(real.id)}</code></p>` : ""}</div>${brand("pinelabs")}</div>
      <p class="pl-why">${real ? T("The mandate is on Pine Labs' sandbox.", "Mandate Pine Labs sandbox par hai.", "मैंडेट Pine Labs सैंडबॉक्स पर है।") : T("Pine Labs' sandbox didn't answer.", "Pine Labs sandbox ne jawab nahi diya.", "Pine Labs सैंडबॉक्स ने जवाब नहीं दिया।")}
        ${m.runs_on === "real" ? T("Debits run on it.", "Debit isi se hote hain.", "डेबिट इसी से।") : T(`Until ${vin} approves it on UPI, debits run on Baari's demo block with the same limits.`, `Jab tak ${vin} UPI par approve nahi karte, debit Baari ke demo block se, wahi limit.`, `मंज़ूरी तक डेबिट डेमो ब्लॉक से।`)}</p>
      <div class="kd-led">
        <div class="kd-lh"><b>${T(`Asked ${vin}`, `${vin} se poocha`, `${vin} से पूछा`)}</b><span>${T("Over ₹300, or more than the block has", "₹300 se zyada, ya block se zyada", "₹300 से ज़्यादा")}</span></div>
        ${reqs.length ? reqs.map((r, i) => `<details class="pg-r ${ST[r.status] && ST[r.status][0] === "bad" ? "bad" : ""}" style="--i:${i}"><summary><span class="pg-ic">${ICON.lock}</span><span class="pg-t"><b>${T("Pay request", "Payment ki maang", "भुगतान की माँग")}</b><small>${T("Sent on Telegram", "Telegram par bheja", "Telegram पर भेजा")} ${hhmm(r.asked_at)}</small></span><b class="pg-a">${rs(r.amount)}</b><span class="stp ${(ST[r.status] || ST.WAITING)[0]}">${(ST[r.status] || ST.WAITING)[1]}</span></summary>
          <div class="pg-x"><p><span>${T("Order", "Order", "ऑर्डर")}</span><code>${esc(r.order_id)}</code></p><p><span>Ref</span><code>${esc(r.reference)}</code></p></div></details>`).join("")
          : `<p class="kd-empty">${T(`Nothing asked yet. Baari asks ${vin} only when a payment needs his yes.`, `Abhi kuch nahi poocha. Baari ${vin} se tabhi poochti hai jab haan chahiye.`, `अभी कुछ नहीं पूछा।`)}</p>`}
      </div>
    </div></section>`;
}

// ---- hisaab barabar. The block is one person's money; whoever else shares
// the kitchen settles up with them once a week. Pick who shares, and each
// row is a UPI QR to scan across the table, a WhatsApp ask, or a tick once
// it's paid. Baari never moves this money; UPI does.
const weekKey = (dayN) => `w${Math.floor((dayN.getTime() / 864e5 + 3) / 7)}`;
function settle(dayN, spent, vin) {
  const total = Array.from({ length: 7 }, (_, b) => dayAmt(b, spent)).reduce((a, v) => a + v, 0);
  const names = fam().map((p) => p.name);
  const who = (local.split || names).filter((n) => names.includes(n));
  if (!who.includes(vin)) who.unshift(vin);
  const each = Math.ceil(total / Math.max(1, who.length) / 100) * 100;
  const paid = ((local.settled || {})[weekKey(dayN)]) || [];
  return { total, names, who, each, paid, owe: who.filter((n) => n !== vin) };
}
const upiId = () => setup().upi || "";
const upiLink = (vin, amt) => `upi://pay?pa=${encodeURIComponent(upiId())}&pn=${encodeURIComponent(vin)}&am=${(amt / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Baari hisaab")}`;
function settleCard({ spent, dayN, vin }) {
  const S = settle(dayN, spent, vin);
  settleCard.ctx = { spent, dayN, vin };
  const rows = S.owe.map((p) => {
    const done = S.paid.includes(p);
    return `<li class="${done ? "paid" : ""}">${avatar(p, "sm")}<p><b>${esc(p)}</b><small>${done ? T("Settled", "Mil gaya", "मिल गया") : T(`to ${esc(vin)}`, `${esc(vin)} ko`, `${esc(vin)} को`)}</small></p>
      <b class="hs-amt">${rs(S.each)}</b>
      ${done ? `<span class="hs-ok">${ICON.check}</span>` : `<button type="button" class="hs-b" data-stqr="${esc(p)}" aria-label="${T(`UPI QR for ${esc(p)}`, `${esc(p)} ke liye UPI QR`, `${esc(p)} के लिए UPI QR`)}">${mx("qr-code", true)}</button><button type="button" class="hs-b tg" data-stask="${esc(p)}" aria-label="${T(`Ask ${esc(p)} on Telegram`, `${esc(p)} se Telegram pe maango`, `${esc(p)} से टेलीग्राम पर माँगो`)}">${mx("telegram", true)}</button><button type="button" class="hs-b ok" data-stok="${esc(p)}" aria-label="${T("Mark settled", "Mil gaya", "मिल गया")}">${ICON.check}</button>`}</li>`;
  }).join("");
  return `<section class="sec rv" style="--i:5"><div class="sec-h"><h2>${T("Settle up", "Hisaab barabar", "हिसाब बराबर")}</h2><button type="button" class="more hs-share" data-stshare>${mx("gallery-export")}${T("Share", "Bhejo", "भेजो")}</button></div>
    <div class="hs card-w" data-nopull>
      <p class="hs-sum"><b>${rs(S.total)}</b><span>${T(`from ${esc(vin)}'s block, split ${S.who.length} ways`, `${esc(vin)} ke block se, ${S.who.length} mein baanta`, `${esc(vin)} के ब्लॉक से, ${S.who.length} में बँटा`)}</span></p>
      <div class="hs-who" role="group" aria-label="${T("Who shares", "Kaun baantega", "कौन बाँटेगा")}">${S.names.map((n) => `<button type="button" data-stw="${esc(n)}" aria-pressed="${S.who.includes(n)}" ${n === vin ? "disabled" : ""}>${avatar(n, "xs")}<span>${esc(n)}</span></button>`).join("")}</div>
      ${S.owe.length ? `<ul class="hs-l">${rows}</ul>` : `<p class="hs-none">${T("Nobody else shares this week. The block covers it.", "Is hafte koi aur nahi baant raha. Block se ho gaya.", "इस हफ़्ते कोई और नहीं बाँट रहा।")}</p>`}
      <p class="hs-upi">${upiId() ? `UPI <code>${esc(upiId())}</code>` : T("Add your UPI ID to show a pay QR", "Pay QR ke liye apna UPI ID jodo", "पे QR के लिए अपना UPI ID जोड़ो")}<button type="button" data-stupi>${upiId() ? T("Change", "Badlo", "बदलो") : T("Add", "Jodo", "जोड़ो")}</button></p>
    </div></section>`;
}
// The week as a picture for the family group: drawn straight onto a canvas
// (4:5, what WhatsApp shows uncropped), so it works offline and needs no
// library. Shared through the phone's own share sheet.
const TINT_HEX = { sand: "#FBEFD9", rose: "#FBE4E8", sky: "#E2EEFA", mint: "#DFF2E7", clay: "#F5E3D8", stone: "#ECEAE4" };
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
async function hisaabImage() {
  const { spent, dayN, vin } = settleCard.ctx;
  const S = settle(dayN, spent, vin);
  await document.fonts.ready;
  // height follows the rows, so two people don't leave a hole; WhatsApp is happy anywhere from 1:1 to 4:5
  const W = 1080, H = Math.min(1350, Math.max(1080, 600 + S.owe.length * 152 + 230)), cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const D = (w, px) => `${w} ${px}px Family, Inter, system-ui, sans-serif`, B = (w, px) => `${w} ${px}px Inter, system-ui, sans-serif`;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  g.fillStyle = "#F6F4EF"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900); glow.addColorStop(0, "rgba(242,183,5,0.22)"); glow.addColorStop(1, "rgba(242,183,5,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.save(); g.shadowColor = "rgba(60,40,0,0.14)"; g.shadowBlur = 60; g.shadowOffsetY = 24; g.fillStyle = "#fff"; rr(60, 60, W - 120, H - 120, 56); g.fill(); g.restore();
  const mark = await loadImg("/img/baari-mark.png");
  if (mark) g.drawImage(mark, 120, 120, 72, 72);
  g.fillStyle = "#15130F"; g.font = D(800, 44); g.textBaseline = "middle"; g.fillText("baari", 208, 158);
  const from = new Date(dayN.getTime() - 6 * 864e5), f = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  g.textAlign = "right"; g.fillStyle = "#6B675F"; g.font = B(600, 30); g.fillText(T(`${f(from)} to ${f(dayN)}`, `${f(from)} se ${f(dayN)}`, `${f(from)} से ${f(dayN)}`), W - 120, 158); g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#6B675F"; g.font = B(600, 30); g.fillText(T(`${homeN()} home, this week`, `${homeN()} ghar, is hafte`, `${homeN()} घर, इस हफ़्ते`), 120, 300);
  g.fillStyle = "#15130F"; g.font = D(800, 150); g.fillText(rs(S.total), 112, 450);
  g.fillStyle = "#6B675F"; g.font = B(500, 32); g.fillText(T(`from ${vin}'s block, split ${S.who.length} ways, ${rs(S.each)} each`, `${vin} ke block se, ${S.who.length} mein baanta, ${rs(S.each)} har ek`, `${vin} के ब्लॉक से, ${S.who.length} में बँटा, ${rs(S.each)} हर एक`), 120, 510);
  let y = 600;
  for (const p of S.owe) {
    const done = S.paid.includes(p);
    g.fillStyle = "#F6F4EF"; rr(120, y, W - 240, 132, 34); g.fill();
    const av = avatar(p), src = (av.match(/src="([^"]+)"/) || [])[1], tint = (av.match(/t-(\w+)/) || [])[1];
    g.fillStyle = TINT_HEX[tint] || "#FBEFD9"; g.beginPath(); g.arc(196, y + 66, 44, 0, Math.PI * 2); g.fill();
    const im = src && (await loadImg(src));
    if (im) { g.save(); g.beginPath(); g.arc(196, y + 66, 44, 0, Math.PI * 2); g.clip(); g.drawImage(im, 152, y + 22, 88, 88); g.restore(); }
    g.fillStyle = "#15130F"; g.font = B(700, 36); g.fillText(p, 268, y + 60);
    g.fillStyle = "#6B675F"; g.font = B(500, 27); g.fillText(T(`to ${vin}`, `${vin} ko`, `${vin} को`), 268, y + 100);
    g.textAlign = "right";
    g.fillStyle = done ? "#A29E95" : "#15130F"; g.font = D(800, 48); g.fillText(rs(S.each), W - 330, y + 82);
    const tag = done ? T("Settled", "Mil gaya", "मिल गया") : T("Due", "Baaki", "बाक़ी");
    g.font = B(700, 26); const tw = g.measureText(tag).width + 44;
    g.fillStyle = done ? "#E3F4EA" : "#FDF2D3"; rr(W - 150 - tw, y + 42, tw, 50, 25); g.fill();
    g.fillStyle = done ? "#0B6E49" : "#855C00"; g.textAlign = "center"; g.fillText(tag, W - 150 - tw / 2, y + 76);
    g.textAlign = "left";
    y += 152;
  }
  g.fillStyle = "#A29E95"; g.font = B(500, 26);
  g.fillText(upiId() ? `UPI · ${upiId()}` : T("Paid from the Reserve Pay block, through Pine Labs", "Reserve Pay block se, Pine Labs ke through", "रिज़र्व पे ब्लॉक से, पाइन लैब्स के ज़रिए"), 120, H - 140);
  g.textAlign = "right"; g.fillText("baari.pages.dev", W - 120, H - 140); g.textAlign = "left";
  return cv;
}
async function shareCanvas(cv, name, text) {
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return "shared"; } catch (e) { if (e.name === "AbortError") return "cancel"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "saved";
}
async function shareHisaab(btn) {
  btn.classList.add("busy");
  try {
    const cv = await hisaabImage();
    const r = await shareCanvas(cv, `baari-hisaab.png`, T("This week's kitchen, from Baari", "Is hafte ka hisaab, Baari se", "इस हफ़्ते का हिसाब, बारी से"));
    if (r === "saved") toast({ icon: "🧾", title: T("Picture saved", "Photo save ho gayi", "फ़ोटो सेव हो गई"), body: T("Send it in the family group", "Family group mein bhej do", "फ़ैमिली ग्रुप में भेज दो"), ms: 3500 });
  } catch (e) { console.warn(e); }
  btn.classList.remove("busy");
}
function settleMark(p, on) {
  const { dayN } = settleCard.ctx, k = weekKey(dayN);
  const was = snapLocal();
  local.settled = local.settled || {};
  const set = new Set(local.settled[k] || []);
  on ? set.add(p) : set.delete(p);
  local.settled[k] = [...set];
  saveLocal(); haptic(on ? 14 : 6); render();
  if (on) undoable(T(`${p} settled`, `${p} se mil gaya`, `${p} से मिल गया`), was, render);
}
function upiSheet(then) {
  const s = sheet(`<div class="sheet-h"><p class="k">UPI</p><h2>${T("Your UPI ID", "Aapka UPI ID", "आपका UPI ID")}</h2><p class="sub">${T("Only on this phone. It goes into the QR and the WhatsApp ask, nowhere else.", "Sirf is phone pe. QR aur WhatsApp message mein jaata hai, aur kahin nahi.", "सिर्फ़ इस फ़ोन पर। QR और WhatsApp संदेश में जाता है।")}</p></div>
    <form class="hs-form" data-stform><input name="upi" value="${esc(upiId())}" placeholder="naam@okhdfcbank" inputmode="email" autocapitalize="off" autocomplete="off" spellcheck="false" enterkeyhint="done"><button class="btn" type="submit">${T("Save", "Rakho", "रखो")}</button><p class="hs-err" aria-live="polite"></p></form>`, "upi");
  const f = s.w.querySelector("[data-stform]"), inp = f.querySelector("input");
  setTimeout(() => inp.focus(), 350);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!/^[\w.-]{2,}@[a-z][\w.]{1,}$/i.test(v)) { f.querySelector(".st-err").textContent = T("That doesn't look like a UPI ID", "Yeh UPI ID jaisa nahi lag raha", "यह UPI ID जैसा नहीं लग रहा"); inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); return; }
    const st = setup(); st.upi = v; localStorage.setItem("baari:setup", JSON.stringify(st));
    s.close(); render(); then && setTimeout(then, 380);
  });
}
function qrSheet(p) {
  const { spent, dayN, vin } = settleCard.ctx;
  if (!upiId()) { upiSheet(() => qrSheet(p)); return; }
  const S = settle(dayN, spent, vin);
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Settle up", "Hisaab barabar", "हिसाब बराबर")}</p><h2>${T(`${esc(p)} pays ${rs(S.each)}`, `${esc(p)} se ${rs(S.each)}`, `${esc(p)} से ${rs(S.each)}`)}</h2><p class="sub">${T("Scan with any UPI app: GPay, PhonePe, Paytm, BHIM", "Koi bhi UPI app se scan karo: GPay, PhonePe, Paytm, BHIM", "किसी भी UPI ऐप से स्कैन करें")}</p></div>
    <div class="hs-qr"><div class="hs-qr-c" data-stqrbox></div><p>${esc(vin)} · <code>${esc(upiId())}</code></p></div>
    <button class="btn" type="button" data-stdone>${ICON.check}${T("Got it", "Mil gaya", "मिल गया")}</button>`, "upi");
  drawQr(s.w.querySelector("[data-stqrbox]"), upiLink(vin, S.each));
  s.w.querySelector("[data-stdone]").addEventListener("click", () => { s.close(); settleMark(p, true); });
}
function settleAsk(p) {
  const { spent, dayN, vin } = settleCard.ctx;
  const S = settle(dayN, spent, vin);
  const msg = T(`${p}, this week's kitchen: ${rs(S.total)} split ${S.who.length} ways, so ${rs(S.each)} from you.${upiId() ? ` UPI: ${upiId()}` : ""} (Baari)`,
    `${p}, is hafte ka khaane ka hisaab: ${rs(S.total)}, ${S.who.length} mein baanta, toh aapke ${rs(S.each)}.${upiId() ? ` UPI: ${upiId()}` : ""} (Baari)`,
    `${p}, इस हफ़्ते का खाने का हिसाब: ${rs(S.total)}, ${S.who.length} में बँटा, तो आपके ${rs(S.each)}।${upiId() ? ` UPI: ${upiId()}` : ""} (बारी)`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(location.origin + "/receipt/")}&text=${encodeURIComponent(msg)}`, "_blank", "noopener");
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
  // The month is a drawer of its own: a calendar is too much for the card.
  spendCard.month = `<div class="ks ks-sheet" data-ks="m">
    <div class="ks-h"><div class="ks-read" aria-live="polite"><p class="ks-k" data-ksk>${cur.name}</p><p class="ks-v" data-ksv>${rs(cur.tot)}</p></div>
      <span hidden data-ksm="m" data-k="${cur.name}" data-v="${rs(cur.tot)}"></span><button type="button" class="sheet-x" data-close aria-label="${T("Close", "Band karo", "बंद करो")}">${mx("add")}</button></div>
    <div class="ks-p ks-m">
      <div class="kc-nav"><button type="button" data-kmo="1" aria-label="${T("Earlier month", "Pichhla mahina", "पिछला महीना")}">${ICON.chev}</button><b data-kmn>${cur.name}</b><button type="button" data-kmo="-1" disabled aria-label="${T("Later month", "Agla mahina", "अगला महीना")}">${ICON.chev}</button></div>
      <div data-mos data-m="0" ${months.map((M, i) => `data-k${i}="${M.name}" data-v${i}="${rs(M.tot)}"`).join(" ")}>${months.map(moPane).join("")}</div>
      <div class="ks-run"><span>${ICON.lock}</span><p>${T(`About ${rs(avg)} a day. At this pace the block lasts till`, `Roz lagbhag ${rs(avg)}. Is raftaar se block chalega`, `रोज़ लगभग ${rs(avg)}। इस रफ़्तार से ब्लॉक चलेगा`)} <b>${dL(lasts)}</b>${T("", " tak", " तक")}.</p></div>
    </div>
  </div>`;
  return `<div class="ks card-w" data-ks="w" data-nopull>
    <div class="ks-h">
      <div class="ks-read" aria-live="polite"><p class="ks-k" data-ksk>${T("This week", "Is hafte", "इस हफ़्ते")}</p><p class="ks-v" data-ksv>${rs(wTot)}</p></div>
      <span hidden data-ksm="w" data-k="${T("This week", "Is hafte", "इस हफ़्ते")}" data-v="${rs(wTot)}"></span>
      <button type="button" class="ks-mo" data-ksmonth><span class="ks-moi">${mx("calendar")}</span>${cur.name.slice(0, 3)}<b>${rs(cur.tot)}</b></button>
    </div>
    <div class="ks-p ks-w">
      <div class="kw-plot"><span class="kw-cap" style="--h:${((capToday / max) * 100).toFixed(1)}%"><b>${T("limit", "limit", "लिमिट")} ${rs(capToday)}</b></span>
        ${wk.map((x, i) => `<button type="button" class="kw-b ${x.back === 0 ? "on" : ""}" style="--h:${((x.v / max) * 100).toFixed(1)}%;--i:${i}" data-kd data-k="${x.back === 0 ? T("Today", "Aaj", "आज") : `${wkL(day(x.back))}, ${dL(day(x.back))}`}" data-v="${x.v ? rs(x.v) : T("Nothing", "Kuch nahi", "कुछ नहीं")}" aria-label="${wkL(day(x.back))}"></button>`).join("")}</div>
      <div class="kw-x">${wk.map((x) => `<small class="${x.back === 0 ? "on" : ""}">${x.back === 0 ? T("Today", "Aaj", "आज") : wkL(day(x.back)).slice(0, 2)}</small>`).join("")}</div>
      <p class="ks-note">${T(`Never over the ${rs(capToday)} limit this week`, `Is hafte ${rs(capToday)} ki limit kabhi paar nahi`, `इस हफ़्ते लिमिट कभी पार नहीं`)}</p>
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
  const sub = !locked ? T("After the vote, Baari works out what comes from where.", "Vote ke baad Baari tay karti hai kya kahan se aayega.", "वोट के बाद बारी तय करती है।") : coming.length ? T(`${coming.length} things on the way, the rest is already at home`, `${coming.length} cheezein aa rahi hain, baaki ghar mein hai`, `${coming.length} चीज़ें आ रही हैं, बाकी घर में`) : T("Everything's at home. Nothing to order.", "Sab ghar mein hai. Kuch nahi mangana.", "सब घर में है।");
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
        ${done ? "" : `<p class="ov-chip">${late ? T(`${-spare} min past 7:30. Rider backup is on.`, `7:30 se ${-spare} min late. Rider tayyar.`, `${-spare} मिनट देर।`) : T(`${spare} min before the 7:30 cutoff`, `7:30 cutoff se ${spare} min pehle`, `7:30 से ${spare} मिनट पहले`)}</p>`}
        <div class="ov-track"><i class="ov-line"></i><i class="ov-fill"></i><span class="ov-truck">${ICON.truck}</span>
          <ol>${STAGES.map((x, i) => `<li class="${i < pos || done ? "done" : i === pos ? "cur" : ""}"><i></i><span>${x.replace("Out for delivery", "Out")}</span></li>`).join("")}</ol></div>
        ${night.length ? `<p class="ov-items"><span>${T("In the box", "Dabbe mein", "डिब्बे में")}</span>${night.map((j) => `${j.e} ${esc(j.l)}${j.h.qty ? ` ${esc(j.h.qty)}` : ""}`).join(", ")}</p>` : ""}`
      : `<p class="ov-k">${T("Nothing ships tonight", "Aaj raat kuch nahi aa raha", "आज रात कुछ नहीं")}</p><p class="ov-t sm"><b>${locked ? T("Pantry has it", "Pantry mein hai", "पेंट्री में है") : "9:30 pm"}</b></p><p class="ov-chip">${locked ? T("No parcel needed", "Parcel ki zaroorat nahi", "पार्सल नहीं चाहिए") : T("Booked after the vote, if a dry staple is short", "Vote ke baad, agar sookha saamaan kam ho", "वोट के बाद, अगर कम हो")}</p>`}
    </div></section>`;
  const walk = `<section class="sec rv" style="--i:4"><div class="sec-h"><h2>${T("On her way in", "Raaste mein", "रास्ते में")}</h2><span class="sec-k">${T(`${cookN()}, 7:40 am`, `${cookN()}, 7:40 am`, `${cookHi()}, 7:40`)}</span></div>
    <div class="walk card-w">
      <ol class="wk-path">
        <li>${avatar(cookN(), "sm")}<div><b>${T("Leaves home", "Ghar se nikalti hain", "घर से निकलती हैं")}</b><small>7:30</small></div></li>
        <li class="${kir.length ? "stop" : "skip"}"><span class="wp-ic">${ICON.bag}</span><div><b>Sharma Kirana</b><small>${kir.length ? kir.map((j) => `${j.e} ${esc(j.l)}${j.h.qty ? ` ${esc(j.h.qty)}` : ""}`).join(", ") : T("Nothing to pick up today", "Aaj kuch nahi lena", "आज कुछ नहीं")}</small></div>${kir.length ? `<span class="wp-pay">${ICON.lock}${T("Baari pays", "Baari degi", "बारी देगी")}</span>` : ""}</li>
        <li><span class="wp-ic home">${ICON.home}</span><div><b>${T("Your kitchen", "Aapki rasoi", "आपकी रसोई")}</b><small>8:00</small></div></li>
      </ol>
    </div></section>`;
  const rider = `<section class="sec rv" style="--i:5"><div class="lane-rider2 ${d.hop ? "on" : ""}">
      <span class="lr-ic">${ICON.truck}</span><div><b>${T("15-minute rider", "15 minute rider", "15 मिनट राइडर")}</b><small>${d.hop ? T("Kirana to your door", "Kirana se ghar tak", "किराने से घर तक") : T("At 6:30 am Baari checks the parcel. If it won't make 7:30, a rider brings it from the kirana.", "6:30 baje Baari parcel dekhti hai. 7:30 tak nahi pahunchega toh rider kirana se laayega.", "6:30 बजे बारी पार्सल देखती है।")}</small></div><span class="lr-t">${d.hop ? T("Live", "Chalu", "चालू") : T("Standby", "Taiyaar", "तैयार")}</span>
    </div>${d.hop ? riderCard(d.hop) : ""}</section>`;
  return `${header(T("Groceries", "Saamaan", "सामान"), { sub, obj: "parcel" })}${shelf}${road}${kiranaCard(d.kirana_order)}${walk}${rider}${poweredBy("Shipping by", ["delhivery"])}`;
}

// "Kal kaun kha raha hai" (S6, section 13 step 2): the family's faces on the
// hero. Away is greyed with a "bahar" tag and where it came from. A tap opens
// a sheet: not eating, back, and guests. Hidden when rails has no attendance.
const SRC = { telegram: "Telegram", telegram_voice: "voice", app: "app", call: "call" };
function facesRow() {
  const a = att();
  if (!a) return "";
  const line = a.changed_after === "BRIEF" ? T(`${cookN()} ji was told: ${a.headcount}`, `${cookN()} ji ko bata diya: ${a.headcount} log`, `${cookHi()} जी को बता दिया: ${a.headcount} लोग`)
    : a.changed_after === "BUY" ? T("Already ordered. The extra goes to the pantry", "Order ho chuka, extra pantry mein jaayega", "ऑर्डर हो चुका, बचा पेंट्री में")
    : a.away.length || a.guests ? T("Baari updated the plan", "Baari ne list badal di", "बारी ने लिस्ट बदल दी") : "";
  return line ? `<p class="eat-n">${esc(line)}</p>` : "";
}
// Who's eating, as a small overlapped stack that sits beside the subtitle.
// One tap opens the list.
function facesStack() {
  const a = att();
  if (!a) return "";
  return `<button type="button" class="eat-s" data-eat aria-label="${T("Who's eating", "Kaun kha raha hai", "कौन खा रहा है")}">${a.eating.slice(0, 5).map((n) => avatar(n, "xs")).join("")}${a.guests ? `<span class="eat-g">+${a.guests}</span>` : ""}</button>`;
}
function eatSheet() {
  const a0 = att();
  if (!a0) return;
  // Everyone in a fixed order, so a row doesn't jump when it's switched.
  const names = [...a0.eating, ...a0.away.map((x) => x.name).filter((n) => !a0.eating.includes(n))];
  let g = a0.guests || 0;
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Kal ka lunch", "Kal ka lunch", "कल का लंच")}</p><h2>${T("Who's eating", "Kaun kha raha hai", "कौन खा रहा है")}</h2></div>
    <ul class="eat-l">${names.map((n) => `<li><label class="eat-r"><span class="eat-rn">${avatar(n, "sm")}<b>${esc(n)}</b></span><span class="tg"><input type="checkbox" data-eatp="${esc(n)}" ${a0.eating.includes(n) ? "checked" : ""}><i></i></span></label></li>`).join("")}</ul>
    <div class="eat-gs"><span>${T("Guests tomorrow", "Kal mehmaan", "कल मेहमान")}</span><span class="xc on"><button type="button" data-eg="-1" aria-label="Fewer">−</button><em data-egn>${g}</em><button type="button" data-eg="1" aria-label="More">+</button></span><button type="button" class="ln-ok" data-egok aria-label="${T("Save guests", "Mehmaan save karo", "सेव करो")}">${ICON.check}</button></div>`);
  const count = () => { const a = state.attendance; a.headcount = a.eating.length + (a.guests || 0); };
  s.w.addEventListener("change", async (e) => {
    const cb = e.target.closest("[data-eatp]");
    if (!cb) return;
    const name = cb.dataset.eatp, back = cb.checked, a = state.attendance, was = JSON.stringify(a);
    // Show it at once, then save. Switching it again is the undo.
    if (back) { a.away = a.away.filter((x) => x.name !== name); a.eating = [...a.eating, name]; }
    else { a.away = [...a.away, { name, by: me().name, via: "app" }]; a.eating = a.eating.filter((x) => x !== name); }
    count(); haptic(6); render();
    try { await api("away", { name, back, by: me().name }); load(); }
    catch (err) { state.attendance = JSON.parse(was); cb.checked = !back; render(); toast({ icon: "⚠️", title: T("Didn't save", "Save nahi hua", "सेव नहीं हुआ"), body: String(err.message || err).slice(0, 120) }); }
  });
  s.w.addEventListener("click", async (e) => {
    const step = e.target.closest("[data-eg]"), okg = e.target.closest("[data-egok]");
    if (step) { g = Math.max(0, Math.min(12, g + +step.dataset.eg)); s.w.querySelector("[data-egn]").textContent = g; haptic(4); return; }
    if (!okg) return;
    const was = JSON.stringify(state.attendance), prev = state.attendance.guests || 0;
    state.attendance.guests = g; count();
    s.close(); haptic(10); render();
    const undo = () => api("guests", { n: prev, by: me().name }).then(load);
    undoable(T(`${g} guests tomorrow`, `Kal ${g} mehmaan`, `कल ${g} मेहमान`), null, () => { state.attendance = JSON.parse(was); render(); undo().catch(() => {}); });
    try { await api("guests", { n: g, by: me().name }); load(); }
    catch (err) { state.attendance = JSON.parse(was); render(); toast({ icon: "⚠️", title: T("Didn't save", "Save nahi hua", "सेव नहीं हुआ"), body: String(err.message || err).slice(0, 120) }); }
  });
}

// Demo nights (Y8): the same /demo the family runs on Telegram, started
// from here. Everyone's phones get the night; the app follows it.
function demoBadge() {
  // A guest's night (Y9): the judge holds the baari as Mehmaan.
  const t = railTurn();
  if (t && t.holder === "Mehmaan") return `<p class="demo-b guest rv" style="--i:1"><i></i>${T("A guest's night: Mehmaan picks tonight", "Aaj Mehmaan ki baari", "आज मेहमान की बारी")}</p>`;
  return "";
}
function demoSheet() {
  const on = !!(state && state.household && state.household.demo);
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Demo night", "Demo raat", "डेमो रात")}</p><h2>${on ? T("A demo night is running", "Demo raat chal rahi hai", "डेमो रात चल रही है") : T("A whole night in about 10 minutes", "Poori raat, lagbhag 10 minute mein", "पूरी रात, लगभग 10 मिनट में")}</h2></div>
    <p class="demo-s">${T("Dishes go out on Telegram, the turn holder picks or everyone votes, Baari orders, pays inside the limits and briefs the cook. Every phone in the house gets it.", "Telegram pe dishes jaayengi, baari wala chunega ya sab vote karenge, Baari order karegi, limit ke andar pay karegi aur cook ko brief degi. Ghar ke har phone pe aayega.", "टेलीग्राम पर डिश जाएँगी, बारी वाला चुनेगा या सब वोट करेंगे, बारी ऑर्डर करेगी और कुक को ब्रीफ़ देगी।")}</p>
    ${on ? `<button type="button" class="btn ghost" data-demo="stop">${T("Stop the demo", "Demo band karo", "डेमो बंद करो")}</button>`
      : `<div class="demo-a"><button type="button" class="btn" data-demo="pick">${T("Turn picks", "Baari wala chunega", "बारी वाला चुनेगा")}</button><button type="button" class="btn ghost" data-demo="vote">${T("Everyone votes", "Sab vote", "सब वोट")}</button></div>`}`, "demo");
  s.w.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-demo]");
    if (!b || b.disabled) return;
    b.disabled = true; haptic(10);
    const m = b.dataset.demo;
    try {
      await api("demo", m === "stop" ? { stop: true } : { mode: m, by: me().name });
      s.close(); load();
      toast({ icon: m === "stop" ? "⏹️" : "🎬", title: m === "stop" ? T("Demo stopped", "Demo band", "डेमो बंद") : T("Demo night started", "Demo raat shuru", "डेमो रात शुरू"), body: m === "stop" ? "" : T("Dishes reach Telegram in about a minute.", "Ek minute mein Telegram pe dishes aayengi.", "एक मिनट में टेलीग्राम पर डिश आएँगी।") });
    } catch (err) {
      b.disabled = false;
      toast({ icon: "⚠️", title: T("Couldn't start it", "Shuru nahi hua", "शुरू नहीं हुआ"), body: String(err.message || err).slice(0, 120) });
    }
  });
  return s;
}

// Sharma Kirana's order book (Y4): the shop gets tomorrow's order the night
// before, packs it, and is paid at once, so the cook only collects. It's our
// invention on rails, and the card says so.
const KR_STAGES = ["PLACED", "PACKED", "READY"];
function kiranaCard(o) {
  if (!o) return "";
  const at = Math.max(0, KR_STAGES.indexOf(o.status));
  return `<section class="sec rv" style="--i:4"><div class="sec-h"><h2>${esc(shopN())}</h2><span class="sec-k">${T("Packed the night before", "Raat ko hi pack", "रात को ही पैक")}</span></div>
    <div class="kr card-w">
      <ol class="kr-st">${KR_STAGES.map((x, i) => `<li class="${i < at ? "done" : i === at ? "cur" : ""}"><i></i><span>${{ PLACED: T("Placed", "Diya", "दिया"), PACKED: T("Packed", "Pack", "पैक"), READY: T("Ready", "Taiyaar", "तैयार") }[x]}</span></li>`).join("")}</ol>
      <ul class="kr-l">${(o.lines || []).map((l) => `<li><span>${esc(cap(l.item))}</span><small>${esc(l.qty)}</small><b>₹${esc(Math.round(Number(l.amount_rupees)))}</b></li>`).join("")}</ul>
      <div class="kr-t"><span>${T("Total", "Kul", "कुल")}</span><b>₹${esc(Math.round(Number(o.total_rupees)))}</b></div>
      <p class="kr-pay ${o.paid ? "ok" : ""}">${o.paid ? `${ICON.check}${T("Paid from the Pine Labs block", "Pine Labs block se paid", "पाइन लैब्स ब्लॉक से चुकाया")}${o.utr ? ` <span class="mono">UTR ${esc(o.utr)}</span>` : ""}` : T("Payment pending", "Payment baaki", "भुगतान बाकी")}</p>
      <p class="kr-who">${avatar(o.picker || cookN(), "sm")}<span>${T(`${esc(o.picker || cookN())} collects at ${esc(clock(o.pickup_by || "07:40"))}`, `${esc(o.picker || cookN())} ${esc(clock(o.pickup_by || "07:40"))} baje le lengi`, `${esc(o.picker || cookN())} ${esc(clock(o.pickup_by || "07:40"))} बजे ले लेंगी`)}</span></p>
    </div></section>`;
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
  // Her reply's label from Gnani's extraction (Y12). A vague yes or an
  // unclear note means Baari asked once more for the counts.
  const label = {
    confirmed_with_counts: [T("Counts confirmed", "Counts pakke", "गिनती पक्की"), "ok"],
    vague_yes: [T("Said yes, no counts. Baari asked again", "Haan bola, counts nahi. Baari ne dobara poocha", "हाँ बोला, गिनती नहीं। बारी ने दोबारा पूछा"), "warn"],
    item_missing: [T("Something ran out. Baari is sorting it", "Kuch khatam hai. Baari dekh rahi hai", "कुछ ख़त्म है। बारी देख रही है"), "warn"],
    refusal: [T("Can't make it. Vinay told", "Nahi aa paayengi. Vinay ko bataya", "नहीं आ पाएँगी। विनय को बताया"), "bad"],
    unclear: [T("Unclear. Baari asked again", "Saaf nahi. Baari ne dobara poocha", "साफ़ नहीं। बारी ने दोबारा पूछा"), "warn"],
  };
  const x = b.reply_extract || {};
  const qty = Object.entries(x.quantities || {}).map(([k, v]) => `${cap(k)} ${v && typeof v === "object" ? v.value : v}`);
  const l = label[b.reply_label || x.commitment] || null;
  const L = state.locked || {};
  const win = L.winner;
  const count = headcount();
  const pickup = ((state.delivery && state.delivery.kirana_pickup) || []).map((p) => cap(p.item || p));
  const audio = b.audio_url && !/dummy\.invalid/.test(b.audio_url) ? b.audio_url : null;
  const words = String(b.text || "").split(/\s+/).filter(Boolean);
  const replied = !!b.reply_text;
  const morning = [
    { t: "7:40", h: `${shopN()}`, s: pickup.length ? `Picks up ${esc(pickup.join(", "))}. Baari pays the shop.` : "Nothing to pick up today", done: !!audio && !!pickup.length, ic: ICON.bag },
    ...(nightTask() ? [{ t: clock(String(nightTask().by_ist).slice(11, 16)).replace(/ [ap]m$/, ""), h: T("Night prep", "Raat ki taiyaari", "रात की तैयारी"), s: nightTask().status === "done" ? T(`${cap(nightTask().item)} done by ${nightTask().done_by}. The brief says so.`, `${cap(nightTask().item)} ${nightTask().done_by} ne kar diya. Brief mein bataya.`, "हो गया।") : nightTask().status === "missed" ? T(`Missed. The brief has plan B: ${nightTask().quick}`, `Reh gaya. Brief mein plan B: ${nightTask().quick}`, "रह गया।") : T("Not done yet", "Abhi baaki", "अभी बाकी"), done: nightTask().status === "done", ic: mx("timer-1", true) }] : []),
    { t: "7:45", h: "Voice note from Baari", s: audio ? "Sent in Hindi, under 45 seconds" : "The dish, how many, what to pick up", done: !!audio, ic: ICON.play },
    { t: cookAt(), h: win ? `Cooks ${esc(win)}` : "Starts cooking", s: win ? `For ${count}${dish(win).mins ? ` · about ${dish(win).mins} min` : ""}` : "Dish locks at 9:30 pm the night before", done: replied, ic: ICON.pot },
    { t: "8:05", h: "Her reply", s: replied ? (l ? l[0] : "Replied") : "A voice note back with the counts", done: replied, ic: ICON.check },
  ];
  return `${header("")}
    <section class="cook-hero rv" style="--i:1">
      <div class="cook-bg" aria-hidden="true"></div>
      ${avatar(cookN(), "xl")}
      <h1>${esc(cookN())} ji</h1>
      <p class="cook-role">Cooks for the ${esc(homeN())}s · ${cookAt()} am · ${esc(cookLang())}</p>
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
        ${replied ? `<div class="msg in">${avatar(cookN(), "sm")}<div><p lang="hi">${esc(b.reply_text)}</p><small>Voice note · transcribed by Gnani</small></div></div>
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
    case "tg.voice": return ev.ok === false ? "Voice note failed to send" : `Voice note to ${to || `${cookN()}`}`;
    case "tg.updates": return said ? `Read: "${said}"` : "Read new Telegram messages";
    case "pl.balance": case "fetch_sbmd_subscription": return ev.ok === false ? "Couldn't reach the Reserve Pay block" : "Checked the Reserve Pay block";
    case "pl.debit": case "pl.payee": {
      const who = ev.tool === "pl.payee" ? `${shopN()}` : "Staples";
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
// Household events (rails lib/events.js and Pine Labs): what a person did on
// Telegram or in the app, in one line each, in the app's language.
const VIA = { telegram: ["Telegram", "Telegram", "टेलीग्राम"], app: ["the app", "app", "ऐप"], telegram_voice: ["a voice note", "voice note", "वॉइस नोट"], call: ["a call", "call", "कॉल"], sim: ["a test", "test", "टेस्ट"], routine: ["routine", "routine", "रूटीन"] };
const viaL = (v) => (VIA[v] ? T(...VIA[v]) : "");
const COOK_L = { confirmed_with_counts: ["confirmed the counts", "counts pakke kiye", "गिनती पक्की की"], vague_yes: ["said haan, no counts", "haan bola, counts nahi", "हाँ बोला, गिनती नहीं"], item_missing: ["said something ran out", "boli kuch khatam hai", "बोलीं कुछ ख़त्म है"], refusal: ["can't come", "nahi aa paayengi", "नहीं आ पाएँगी"], unclear: ["wasn't clear", "saaf nahi tha", "साफ़ नहीं था"] };
function evKind(ev) {
  const w = ev.who || ev.by || "", d = ev.dish || "", amt = ev.amount ? rs(ev.amount) : "";
  const m = (en, hing, hi, ic = "check", tone = "") => ({ t: T(en, hing, hi), ic, tone, who: w });
  switch (ev.kind) {
    case "pick": return m(`${w} picked ${d}`, `${w} ne ${d} chuna`, `${w} ने ${d} चुना`, "check");
    case "ok": return m(`${w} okayed the pick`, `${w} ne haan kaha`, `${w} ने हाँ कहा`, "check");
    case "veto": return m(`${w} vetoed${d ? ` ${d}` : ""}`, `${w} ne veto kiya${d ? `: ${d} nahi` : ""}`, `${w} ने वीटो किया`, "close-circle", "warn");
    case "vote": return m(`${w} voted`, `${w} ne vote diya`, `${w} ने वोट दिया`, "check");
    case "wish": return { ...m(`${w}'s wish to ${ev.to || "the holder"}`, `${w} ki wish ${ev.to || "baari wale"} ko`, `${w} की इच्छा ${ev.to || ""} को`, "send"), q: ev.text };
    case "pass": return m(`${w} passed the baari${ev.to ? ` to ${ev.to}` : ""}`, `${w} ne baari aage di${ev.to ? `, ab ${ev.to}` : ""}`, `${w} ने बारी आगे दी`, "forward");
    case "voice": return m(`${w} sent a voice note`, `${w} ka voice note`, `${w} का वॉइस नोट`, "microphone");
    case "msg": return m(`${w} wrote to Baari`, `${w} ne Baari ko likha`, `${w} ने बारी को लिखा`, "send");
    case "approve": return m(`${w} said yes to ${amt || "a payment"}`, `${w} ne ${amt || "payment"} ki haan di`, `${w} ने ${amt || "भुगतान"} की हाँ दी`, "check");
    case "deny": return m(`${w} said no to ${amt || "a payment"}`, `${w} ne ${amt || "payment"} ko na kaha`, `${w} ने ${amt || "भुगतान"} को ना कहा`, "close-circle", "warn");
    case "turn": return ev.mode ? m(ev.mode === "vote" ? "Everyone votes now" : "The turn picks now", ev.mode === "vote" ? "Ab sab vote karenge" : "Ab baari wala chunega", ev.mode === "vote" ? "अब सब वोट करेंगे" : "अब बारी वाला चुनेगा", "shuffle")
      : ev.to ? m(`The baari went to ${ev.to}`, `Baari ab ${ev.to} ki`, `बारी अब ${ev.to} की`, "forward")
      : ev.name ? m(`${ev.name} ${ev.in_baari ? "joined" : "left"} the baari`, `${ev.name} ${ev.in_baari ? "baari mein aaye" : "baari se bahar"}`, `${ev.name} ${ev.in_baari ? "बारी में आए" : "बारी से बाहर"}`, "people") : m(ev.summary || "", ev.summary || "", ev.summary || "", "shuffle");
    case "demo": return ev.on ? m("Demo night started", "Demo raat shuru", "डेमो रात शुरू", "play") : m("Demo night stopped", "Demo raat band", "डेमो रात बंद", "stop");
    case "cook_reply": { const l = COOK_L[ev.label] || ["replied", "ne jawab diya", "ने जवाब दिया"]; return { ...m(`${cookN()} ${l[0]}`, `${cookN()} ${l[1]}`, `${cookHi()} ${l[2]}`, "chef-hat", ev.label === "confirmed_with_counts" ? "" : "warn"), who: cookN(), q: ev.text }; }
    case "away": return { ...m(`${ev.name} ${ev.back ? "is eating tomorrow after all" : "won't eat tomorrow"}${w ? `, said ${w}` : ""}`, `${ev.name} ${ev.back ? "kal khayenge" : "kal bahar"}${w ? `, ${w} ne ${viaL(ev.via)} pe bataya` : ""}`, `${ev.name} ${ev.back ? "कल खाएँगे" : "कल बाहर"}`, "user-add"), who: ev.name };
    case "guests": return m(`${ev.n} guest${ev.n === 1 ? "" : "s"} tomorrow`, `Kal ${ev.n} mehmaan`, `कल ${ev.n} मेहमान`, "user-add");
    case "link": return m(`Pine Labs link for ${amt}${ev.for ? `: ${ev.for}` : ""}`, `${amt} ka Pine Labs link${ev.for ? `: ${ev.for}` : ""}`, `${amt} का पाइन लैब्स लिंक`, "link");
    case "link_paid": return m(`${amt} paid on Pine Labs`, `${amt} Pine Labs pe mil gaye`, `${amt} पाइन लैब्स पर मिल गए`, "money");
    case "link_declined": return m(`${w || "Someone"} said no to the ${amt} link`, `${w || "Kisi"} ne ${amt} link ko na kaha`, `${amt} लिंक को ना`, "close-circle", "warn");
    case "link_closed": return m(`The ${amt} link closed unpaid`, `${amt} ka link bina pay band hua`, `${amt} का लिंक बंद हुआ`, "close-circle", "warn");
    case "refuse": return { ...m(`Rails stopped ${amt || "a payment"}`, `${amt || "Payment"} rails ne roka`, `${amt || "भुगतान"} रोका गया`, "lock", "warn"), q: ev.why || ev.summary };
    case "refund": return m(`${amt} refunded to the block`, `${amt} block mein wapas`, `${amt} वापस`, "money");
    case "prefs": return m(`${w} changed a voice or language`, `${w} ne awaaz ya bhasha badli`, `${w} ने आवाज़ या भाषा बदली`, "microphone");
    case "cuisine": return m(`${w} picked new dishes`, `${w} ne nayi dishes chuni`, `${w} ने नई डिश चुनीं`, "magic-star");
    case "pair": return m(`${w} joined on Telegram`, `${w} Telegram pe jud gaye`, `${w} टेलीग्राम पर जुड़े`, "telegram");
    case "say": return { ...m(`${w} asked Baari`, `${w} ne Baari se poocha`, `${w} ने बारी से पूछा`, "message-text"), q: ev.text };
    case "reply": return { ...m(`Baari replied${ev.to ? ` to ${ev.to}` : ""}`, `Baari ka jawab${ev.to ? ` ${ev.to} ko` : ""}`, `बारी का जवाब`, "message-text"), who: "", q: ev.text };
    case "call": return { ...m(`A call with Baari${d ? `: ${d}` : ""}${ev.seconds ? ` · ${Math.round(ev.seconds / 60)} min` : ""}`, `Baari se call${d ? `: ${d}` : ""}${ev.seconds ? ` · ${Math.round(ev.seconds / 60)} min` : ""}`, `बारी से कॉल${d ? `: ${d}` : ""}`, "sms"), q: ev.bill, lines: ev.lines };
    case "answer": return { ...m(`${w} answered`, `${w} ne jawab diya`, `${w} ने जवाब दिया`, "tick-circle"), q: ev.a };
    case "prep_ask": return m(`${ev.to || w} has tonight's task`, `${ev.to || w} ko raat ka kaam`, `रात का काम`, "timer");
    case "prep_done": return m(`${w} did tonight's task`, `${w} ne raat ka kaam kar diya`, `${w} ने रात का काम किया`, "tick-circle");
    case "prep_missed": return m("Tonight's task was missed", "Raat ka kaam reh gaya", "रात का काम रह गया", "danger", "warn");
  }
  return null;
}
function feedHtml() {
  const evs = events.filter((e) => e.kind && evKind(e)).slice(-20).reverse();
  if (!evs.length) return "";
  return `<section class="sec rv" style="--i:5"><div class="sec-h"><h2>${T("At home", "Ghar mein kya hua", "घर में क्या हुआ")}</h2><span class="sec-k">${T("Telegram and app", "Telegram aur app", "टेलीग्राम और ऐप")}</span></div>
    <ul class="feed card-w">${evs.map((e) => { const k = evKind(e); return `<li class="${k.tone}"><span class="fd-ic">${k.who && fam().some((p) => p.name === k.who) ? avatar(k.who, "xs") : mx(k.ic, true)}</span><p><b>${esc(k.t)}</b>${k.q ? `<q>${esc(String(k.q).slice(0, k.lines ? 400 : 140))}</q>` : ""}${k.lines && k.lines.length ? `<details class="fd-call"><summary>${T("What was said", "Kya baat hui", "क्या बात हुई")}</summary><ol>${k.lines.map((l) => `<li class="${l.who === "baari" ? "b" : "f"}"><b>${l.who === "baari" ? "Baari" : T("Family", "Family", "परिवार")}</b> ${esc(l.text)}</li>`).join("")}</ol></details>` : ""}${e.via && VIA[e.via] ? `<small>${esc(viaL(e.via))}</small>` : ""}</p><span class="at">${esc(hhmm(e.at_ist))}</span></li>`; }).join("")}</ul></section>`;
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
  M7: T("paid inside the daily limit", "din ki limit ke andar", "दिन की लिमिट के अंदर"), K1: T("the cook gets it as a voice note, in Hindi", "cook ko Hindi voice note", "कुक को हिंदी वॉइस नोट"), K4: T("Baari pays the shop, never the cook", "dukaan ko Baari deti hai, cook nahi", "दुकान को बारी देती है"),
};
const CHAP = {
  SHORTLIST: { at: "8:30 pm", ic: "send", t: T("Two dishes went out", "Do dishes bheji", "दो डिश भेजीं") },
  LOCK: { at: "9:30 pm", ic: "check", t: T("Votes counted", "Vote gine gaye", "वोट गिने गए") },
  CHECK: { at: "10:45 pm", ic: "moon", t: T("Night check", "Raat ki jaanch", "रात की जाँच") },
  BRIEF: { at: "7:45 am", ic: "play", t: T(`${cookN()} got her brief`, `${cookN()} ko brief mila`, `${cookHi()} को ब्रीफ़ मिला`) },
  COOK: { at: "8:05 am", ic: "pot", t: T(`${cookN()} replied`, `${cookN()} ka jawab`, `${cookHi()} का जवाब`) },
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
      if (failed.length) { tone = "bad"; sub = T(`A payment didn't go through. ${me().name} was told.`, `Ek payment nahi hua. ${me().name} ko bataya.`, "एक भुगतान नहीं हुआ। विनय को बताया।"); }
    }
    if (p === "CHECK") { const quiet = /nothing sent|no shipment/i.test(all); sub = quiet ? T("All quiet. Nothing to do.", "Sab theek. Kuch karna nahi pada.", "सब ठीक। कुछ करना नहीं पड़ा।") : T("Checked the parcel and messages", "Parcel aur messages dekhe", "पार्सल और मैसेज देखे"); tone = quiet ? "quiet" : ""; }
    if (p === "BRIEF") { sub = win ? T(`${win} for ${headcount()}, in a Hindi voice note`, `${win}, ${headcount()} log, Hindi voice note mein`, `${win}, ${headcount()} लोग, हिंदी वॉइस नोट`) : ""; kind = "cook"; }
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
// The list under the Diary filter, rebuilt in place when the filter or the
// order changes so the pill can slide and the cards can rise again.
function diaryList() {
  const ch = chapters();
  const f = diaryUI.f;
  const keep = (c) => f === "all" || (f === "top" ? c.tone !== "quiet" : c.tag === f || (f === "msg" && c.msgs.length));
  let shown = ch.filter(keep);
  const hidden = ch.length - shown.length;
  if (diaryUI.newest) shown = shown.slice().reverse();
  return `${shown.length ? `<ol class="chs">${shown.map(chapterHtml).join("")}</ol>` : `<div class="empty"><b>${ch.length ? T("Nothing here for this filter", "Is filter mein kuch nahi", "इस फ़िल्टर में कुछ नहीं") : T("Tonight's story starts at 8:30 pm", "Aaj ki kahani 8:30 baje shuru hogi", "आज की कहानी 8:30 बजे शुरू होगी")}</b></div>`}
      ${hidden && f === "top" ? `<button type="button" class="dy-quiet" data-df="all">${T(`${hidden} routine check${hidden > 1 ? "s" : ""}, all fine. Show`, `${hidden} routine jaanch, sab theek. Dikhao`, `${hidden} रूटीन जाँच, सब ठीक। दिखाओ`)}</button>` : ""}`;
}
function diaryTo(f, newest) {
  diaryUI.f = f; diaryUI.newest = newest;
  document.querySelectorAll(".dseg [data-df]").forEach((b) => { b.classList.toggle("on", b.dataset.df === f); b.setAttribute("aria-selected", String(b.dataset.df === f)); });
  placeSeg(true);
  const so = document.querySelector("[data-dsort]");
  if (so) so.classList.toggle("up", newest);
  const L = document.querySelector("[data-dlist]");
  if (!L) { render(); return; }
  L.classList.add("dl-out");
  clearTimeout(L._t);
  L._t = setTimeout(() => { L.innerHTML = diaryList(); L.classList.remove("dl-out"); }, 140);
}
function baari() {
  const f = diaryUI.f;
  const ch = chapters();
  const paid = ((state.khata || {}).debits || []).filter((x) => x.status === "SUCCESS").reduce((a, x) => a + (x.amount || 0), 0);
  const msgN = ch.reduce((a, c) => a + c.msgs.reduce((b, m) => b + m.who.length, 0), 0);
  const need = ch.filter((c) => c.tone === "bad").length;
  const evs = events.filter((e) => e.tool && !e.kind).slice(-30).reverse();
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
      <button type="button" class="dsort ${diaryUI.newest ? "up" : ""}" data-dsort aria-label="${T("Change order", "Order badlo", "क्रम बदलो")}">${ICON.chev}</button>
    </div>
    <section class="sec rv dlist" style="--i:4" data-dlist>${diaryList()}</section>
    ${feedHtml()}
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
  cook: () => T(`Waiting on ${cookN()}`, `${cookN()} ka intezaar`, `${cookHi()} का इंतज़ार`),
};
function liveNow() {
  const st = steps(state);
  const cur = st.findIndex((x) => !x.done);
  const x = cur < 0 ? st[st.length - 1] : st[cur];
  const d = doing();
  const win = pickDish();
  const title = cur < 0 ? T("All done for today", "Aaj ka kaam ho gaya", "आज का काम हो गया") : d.busy ? d.text : x.at ? `${x.title} · ${x.at}` : x.title;
  const sub = cur < 0 ? T(`${cookN()} confirmed. Next run 8:30 pm`, `${cookN()} ne confirm kiya. Agla run 8:30 pm`, `${cookHi()} ने पक्का किया। अगला रन 8:30 pm`) : x.body.replace(/<[^>]+>/g, "");
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
function openIsland(focus, opts = {}) {
  const pill = document.querySelector(".isl");
  if (!pill || document.querySelector(".islx")) return;
  const L = liveNow();
  const ak = asks();
  haptic(8);
  const nxt = L.cur >= 0 ? untilMin(L.x.at) : null;
  const w = document.createElement("div");
  w.className = "islx";
  if (opts.auto) w.dataset.auto = "1";
  w.innerHTML = `<div class="islx-scrim"></div><section class="islx-card" role="dialog" aria-modal="true" aria-label="${T("Tonight", "Aaj raat", "आज रात")}">
    <div class="islx-in">
      <div class="islx-now">
        ${L.win && dish(L.win).file ? thali(L.win, "pan-img islx-th") : `<span class="islx-th mk"><img src="/img/baari-mark.png" alt=""></span>`}
        <div class="islx-nt"><p class="islx-k">${L.cur < 0 ? T("Tonight's done", "Aaj ka ho gaya", "आज का हो गया") : nxt !== null ? `${esc(L.x.title)} · ${inMin(nxt)}` : esc(L.x.title)}</p><h2>${esc(L.short)}</h2></div>
        <button type="button" class="islx-x" aria-label="Close">${ICON.chev}</button>
      </div>
      <ol class="track6" style="--p:${(L.cur < 0 ? 1 : L.cur / (L.st.length - 1)).toFixed(3)}">${L.st.map((y, i) => `<li class="${y.done ? "done" : i === L.cur ? "cur" : ""}" style="--i:${i}"><span>${y.done ? ICON.check : ICON[STEP_IC[y.key]]}</span><small>${esc(y.at ? y.at.replace(/ (am|pm)/, "") : "")}</small></li>`).join("")}</ol>
      <p class="islx-sub">${esc(L.sub)}</p>
      ${state.run && state.run.steps && state.run.steps.length ? `<details class="islx-run" ${state.run.running ? "open" : ""}><summary>${state.run.running ? `<span class="t-shimmer">${T("Baari is working", "Baari kaam kar rahi hai", "बारी काम कर रही है")}</span>` : T("What Baari did last", "Baari ne abhi kya kiya", "बारी ने अभी क्या किया")} · ${esc(state.run.phase)}</summary><ol>${state.run.steps.slice(-6).map((x) => `<li class="${x.ok === false ? "bad" : ""}"><span>${esc(stepLine(x))}</span><small>${esc(hhmm(x.at_ist))}</small></li>`).join("")}</ol></details>` : ""}
      ${ak.length ? `<div class="islx-h"><b>${T("For you", "Aapke liye", "आपके लिए")}</b><span data-akn>${ak.length}</span>${ak.length > 1 ? `<span class="islx-nav"><button type="button" data-acsgo="-1" aria-label="${T("Previous", "Pichhla", "पिछला")}" disabled>${ICON.chev}</button><button type="button" data-acsgo="1" aria-label="${T("Next", "Agla", "अगला")}">${ICON.chev}</button></span>` : ""}</div>
        <div class="acs" data-acs>${ak.map(askCard).join("")}</div>
        <div class="acs-dots">${ak.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`
        : `<p class="islx-clear">${ICON.check}${T("Nothing needs you. Baari has it.", "Aapke liye kuch nahi. Baari sambhal rahi hai.", "आपके लिए कुछ नहीं। बारी सँभाल रही है।")}</p>`}
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
      const [pv, nx] = w.querySelectorAll("[data-acsgo]");
      if (pv) { pv.disabled = idx === 0; nx.disabled = idx >= acs.children.length - 1; w.querySelector(".islx-nav").hidden = acs.children.length < 2; }
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
    w.querySelectorAll("[data-acsgo]").forEach((b) => b.addEventListener("click", () => { haptic(4); go(idx + +b.dataset.acsgo); }));
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
      if (k === "pl-pay") { haptic(10); return; }
      if (k === "task-done") {
        ak.disabled = true;
        api("prep", { id: ak.dataset.ref, done: true, by: me().name }).then(() => { finish(card, T("Noted. Sunita hears it in the morning.", "Note kiya. Subah Sunita ko pata chalega.", "नोट किया।")); load(); })
          .catch((err) => { ak.disabled = false; toast({ icon: "⚠️", title: T("Didn't save", "Save nahi hua", "सेव नहीं हुआ"), body: String(err.message || err).slice(0, 120) }); });
        return;
      }
      if (k === "pl-no" || k === "ok-yes" || k === "ok-no") {
        e.preventDefault();
        const ref = ak.dataset.ref;
        card.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        const call = k === "pl-no" ? api("paylink", { reference: ref, decline: true, by: me().name }) : api("approve", { reference: ref, yes: k === "ok-yes", by: me().name });
        call.then(() => {
          local.answered = { ...(local.answered || {}), [ref]: k };
          finish(card, k === "ok-yes" ? T("Done. Baari pays the shop.", "Ho gaya. Baari dukaan ko pay karegi.", "हो गया। बारी दुकान को देगी।") : T("Okay. Baari takes the other way.", "Theek. Baari doosra raasta legi.", "ठीक। बारी दूसरा रास्ता लेगी।"));
          load();
        }).catch((err) => {
          card.querySelectorAll("button").forEach((b) => { b.disabled = false; });
          toast({ icon: "⚠️", title: T("Didn't go through", "Nahi hua", "नहीं हुआ"), body: String(err.message || err).slice(0, 120) });
        });
        return;
      }
      if (k === "find") { local.leaveOk = 1; saveLocal(); close(); setTimeout(() => cookFinder({ cook: cookN(), dish: pickDish() || "" }), 300); return; }
      if (k === "leave-ok") { local.leaveOk = 1; finish(card, T("Okay. Baari tells the family.", "Theek. Baari family ko bata degi.", "ठीक। बारी परिवार को बता देगी।")); return; }
      if (k === "left-done") { local.leftDone = 1; finish(card, T("Got it. Tomorrow's amounts change.", "Samajh gayi. Kal ki quantity badlegi.", "समझ गया। कल की मात्रा बदलेगी।")); return; }
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
    if (t.closest("[data-call]")) { toast({ icon: "📞", title: T("Baari will call at 7 pm", "Baari 7 baje call karegi", "बारी 7 बजे कॉल करेगी"), body: T("Two minutes, in Hinglish. Prototype.", "2 minute, Hinglish mein. Prototype.", "2 मिनट। प्रोटोटाइप।") }); return; }
    const ma = t.closest("[data-mans]");
    if (ma) {
      const on = ma.getAttribute("aria-pressed") !== "true";
      ma.setAttribute("aria-pressed", String(on)); haptic(on ? 6 : 4);
      const picked = [...card.querySelectorAll('[data-mans][aria-pressed="true"]')].map((b) => b.dataset.mans);
      const done = card.querySelector("[data-multi]");
      done.disabled = !picked.length; done.dataset.ans = picked.join(", ");
      done.textContent = picked.length ? T(`Done · ${picked.length}`, `Ho gaya · ${picked.length}`, `हो गया · ${picked.length}`) : T("Done", "Ho gaya", "हो गया");
      acs.go?.();
      return;
    }
    const more = t.closest("[data-more]");
    if (more) {
      if (more.dataset.more === "0") { local.islNo = (local.islNo || 0) + 1; saveLocal(); haptic(6); close(); return; }
      haptic(8);
      const fresh = document.createElement("div"); fresh.innerHTML = askCard("q");
      card.querySelector(".aq").replaceWith(fresh.querySelector(".aq")); acs.go?.();
      return;
    }
    const ans = t.closest("[data-ans]");
    if (ans) {
      local.learn = local.learn || { i: 0 };
      if (ans.dataset.ans) { local.learn.a = { ...(local.learn.a || {}), [local.learn.i]: ans.dataset.ans }; haptic(8); }
      local.learn.i++; local.learn.v = null; saveLocal();
      const q = card.querySelector(".aq");
      q.classList.add("out");
      setTimeout(() => {
        if (local.learn.i >= ASK.length) { finish(card, T("That's plenty. Baari learns the rest by itself.", "Kaafi hai. Baaki Baari khud seekh legi.", "काफ़ी है।")); return; }
        const fresh = document.createElement("div");
        // Opened on its own: one question, then ask before taking more time.
        if (w.dataset.auto === "1") { w.dataset.auto = "asked"; fresh.innerHTML = moreCard(); q.replaceWith(fresh.firstElementChild); acs.go?.(); return; }
        fresh.innerHTML = askCard("q");
        q.replaceWith(fresh.querySelector(".aq"));
      }, 180);
      return;
    }
    const ls = t.closest("[data-lstep]");
    if (ls) {
      const st = ASK[(local.learn || {}).i || 0].step;
      local.learn = local.learn || { i: 0 };
      local.learn.v = Math.min(st.max ?? Infinity, Math.max(st.min ?? 0, (local.learn.v || st.v) + st.by * +ls.dataset.lstep));
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
// The month opens as a drawer: the calendar, where the money went and how
// long the block lasts. Days and months inside it work like on the card.
function monthSheet() {
  if (!spendCard.month) return;
  const { w } = sheet(spendCard.month, "month");
  w.addEventListener("click", (e) => {
    let el;
    if ((el = e.target.closest("[data-kmo]"))) spendMonth(el);
    else if ((el = e.target.closest("[data-kd]"))) spendDay(el);
  });
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
    if (!document.querySelector(".sheet-w.is-open")) document.documentElement.classList.remove("sheet-open");
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
  const row = (a, b, cls = "") => `<p class="rc-r ${cls}"><span>${a}</span><span>${b}</span></p>`;
  const paper = `<div class="rc-paper">
    <div class="rc-in">
      <img class="rc-mark" src="/img/baari-mark.png" alt="">
      <p class="rc-title">BAARI</p>
      <p class="rc-c">${esc(homeN())} ghar · Flat ${esc(h.flat || "402")}</p>
      <p class="rc-c">${esc(date)} · order ${esc(String(total).slice(-4) || "0000")}</p>
      <p class="rc-dash"></p>
      ${L.winner ? row("THALI", esc(L.winner).toUpperCase(), "b") + row("Log", esc(headcount())) + (L.runner_up ? row("Runner-up", esc(L.runner_up)) : "") : ""}
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
      <p class="rc-c">Paid by Baari, inside limits ${esc(me().name)} set.<br>${esc(cookN())} paid nothing.</p>
      <p class="rc-bar" aria-hidden="true"></p>
      <p class="rc-c">Agli baari: ${esc(inBaari()[(inBaari().indexOf(duty()) + 1) % inBaari().length])}</p>
    </div></div>`;
  const w = document.createElement("div");
  w.className = "rc-w";
  w.innerHTML = `<div class="rc-scrim"></div><div class="rc-slot" aria-hidden="true"></div><div class="rc-scroll">${paper}</div>
    <div class="rc-acts"><button type="button" class="rc-a" data-rc="share">${mx("telegram", true)}<span>Bhejo</span></button><button type="button" class="rc-a main" data-rc="tear">${ICON.check}<span>Tear off</span></button><a class="rc-a" href="/receipt/${esc(date)}" target="_blank" rel="noopener">${ICON.arrow}<span>Full</span></a></div>`;
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
    try { if (navigator.share) { await navigator.share({ title: "Baari receipt", url }); return; } } catch (e) { if (e.name === "AbortError") return; }
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(T("Today's thali receipt", "Aaj ki thali ki parchi", "आज की थाली की पर्ची"))}`, "_blank", "noopener");
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
      <label class="pop-row pop-big"><span>${mx("text", true)}<span><b>${T("Big text", "Bade akshar", "बड़े अक्षर")}</b><small>${T("Everything a size up", "Sab kuch ek size bada", "सब कुछ एक साइज़ बड़ा")}</small></span></span><span class="tg"><input type="checkbox" data-big ${bigText() ? "checked" : ""}><i></i></span></label>
      <button type="button" class="pop-row" data-nudges>${T("Reminders", "Reminders", "रिमाइंडर")}${ICON.arrow}</button>
      <a class="pop-row" href="/?onboard">${T("Redo setup", "Setup dobara", "सेटअप दोबारा")}${ICON.arrow}</a>`
    : `<p class="pop-k">${T("Your home", "Aapka ghar", "आपका घर")}</p><b class="pop-t">${esc(homeN())} ghar</b>
      <p class="pop-s">Flat ${esc(h.flat || "402")}, Tower B, Sector 9, Rohini 110042</p>
      <div class="pop-faces">${[...fam().map((p) => p.name), `${cookN()}`].map((p) => avatar(p, "sm")).join("")}</div>
      <button type="button" class="pop-row" data-editfam>${T("Edit family", "Family badlo", "परिवार बदलो")}${ICON.arrow}</button>
      <button type="button" class="pop-row pop-inv" data-invite>${mx("user-add")}${T("Invite family", "Family ko bulao", "परिवार को बुलाओ")}${ICON.arrow}</button>
      <div class="pop-theme" role="radiogroup" aria-label="${T("Look", "Rang", "रंग")}">${[["light", "sun-1", T("Light", "Din", "दिन")], ["system", "setting-2", T("Auto", "Auto", "ऑटो")], ["dark", "moon", T("Dark", "Raat", "रात")]].map(([k, ic, l]) => `<button type="button" role="radio" data-theme-set="${k}" aria-checked="${theme() === k}">${mx(ic, theme() === k)}<span>${l}</span></button>`).join("")}</div>`;
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

// ---- edit the family: a list you change in place. Tap a face to open the
// face editor, × to remove, + to add someone new.
const TINTS = ["sand", "rose", "sky", "mint", "clay", "stone"];
function editFamily() {
  let list = fam().map((p) => ({ ...p, look: p.look || (p.name === me().name && me().look) || lookFor(p.name), tint: p.tint || "sand" }));
  const rows = () => list.map((p, i) => `<li style="--i:${i}" data-row="${i}"><button type="button" class="ef-av" data-face="${i}" aria-label="${T("Change face", "Chehra badlo", "चेहरा बदलो")}">${faceHtml(p.look, p.tint, "")}<i class="ef-pen">${mx("edit", true)}</i></button>
      <input value="${esc(p.name)}" data-name="${i}" maxlength="16" autocomplete="off" enterkeyhint="done" aria-label="Name">
      <button type="button" class="ef-x" data-del="${i}" aria-label="Remove">×</button></li>`).join("");
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Family", "Ghar ke log", "घर के लोग")}</p><h2>${T("Who eats at home", "Ghar mein kaun kaun", "घर में कौन कौन")}</h2><p class="sub">${T("Tap a face to make it look like them.", "Chehre pe tap karo, unke jaisa banao.", "चेहरे पर टैप करो, उनके जैसा बनाओ।")}</p></div>
    <ul class="ef">${rows()}</ul>
    <button type="button" class="ef-add" data-add>${mx("user-add")}${T("Add someone", "Kisi ko jodo", "किसी को जोड़ो")}</button>
    <button type="button" class="btn" data-save>${T("Save", "Save karo", "सेव करो")}</button>`, "fam");
  const ul = s.w.querySelector(".ef");
  const repaint = () => { ul.innerHTML = rows(); };
  s.w.addEventListener("input", (e) => { const i = e.target.dataset.name; if (i !== undefined) list[i].name = e.target.value; });
  s.w.addEventListener("click", (e) => {
    const f = e.target.closest("[data-face]");
    if (f) {
      const p = list[f.dataset.face];
      faceSheet(p.name || T("New person", "Naya insaan", "नया व्यक्ति"), { look: { ...p.look }, tint: p.tint }, (st) => { p.look = st.look; p.tint = st.tint; repaint(); const av = ul.querySelector(`[data-face="${f.dataset.face}"] .av`); av && av.classList.add("bump"); });
      return;
    }
    const d = e.target.closest("[data-del]");
    if (d && list.length > 1) { const li = d.closest("li"); li.classList.add("gone"); haptic(10); setTimeout(() => { list.splice(+d.dataset.del, 1); repaint(); }, 220); return; }
    if (e.target.closest("[data-add]")) { list.push({ name: "", look: lookFor(`new${list.length}${Date.now()}`), tint: TINTS[list.length % TINTS.length] }); repaint(); ul.lastElementChild.querySelector("input").focus(); haptic(6); return; }
    if (e.target.closest("[data-save]")) {
      list = list.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() }));
      local.family = list; saveLocal(); s.close(); render(); renderTop(); toast({ icon: "👨‍👩‍👧", title: T("Family updated", "Family update ho gayi", "परिवार अपडेट हुआ"), body: T("Baari uses it from tonight's vote", "Aaj raat ke vote se lagu", "आज रात के वोट से लागू") });
    }
  });
}
// ---- invite: everyone the app knows about. The three voters are on Telegram
// already; anyone added in setup still needs the link.
const ROLE = { didi: ["Didi", "Didi", "दीदी"], bhaiya: ["Bhaiya", "Bhaiya", "भैया"], dadi: ["Dadi", "Dadi", "दादी"], dadaji: ["Dada ji", "Dada ji", "दादा जी"], beta: ["Son", "Beta", "बेटा"], beti: ["Daughter", "Beti", "बेटी"], bachche: ["Little one", "Chhotu", "छोटू"] };
function invitePeople() {
  const set = setup();
  // Who has really joined comes from rails (Y2); an old feed falls back to
  // the demo's family list.
  const rm = (state && state.household && state.household.members) || null;
  const joinedOf = (n) => (rm ? rm.some((m) => m.name === n && m.joined) : PEOPLE.includes(n));
  const known = fam().filter((p) => p.name !== me().name).map((p) => ({ name: p.name, look: p.look, tint: p.tint, joined: joinedOf(p.name) }));
  const ms = (set.members || []).filter((k) => ROLE[String(k).split("~")[0]]);
  const extra = ms.map((k) => {
    const b = String(k).split("~")[0], n = ms.filter((x) => String(x).split("~")[0] === b).length, at = String(k).split("~")[1] || 1;
    const name = T(...ROLE[b]) + (n > 1 ? ` ${at}` : "");
    return { name, look: lookFor(b), tint: "stone", joined: false };
  }).filter((p) => !known.some((x) => x.name === p.name));
  return [...known, ...extra];
}
// On Ghar: who's in, who isn't, one tap to bring them.
function inviteCard() {
  const ps = invitePeople(), left = ps.filter((p) => !p.joined), inn = ps.filter((p) => p.joined);
  const face = (p) => (p.look ? faceHtml(p.look, p.tint || "stone", "sm") : avatar(p.name, "sm"));
  const names = left.map((p) => p.name);
  const who = names.length === 1 ? T(`${names[0]} isn't in yet`, `${names[0]} abhi nahi jude`, `${names[0]} अभी नहीं जुड़े`)
    : names.length === 2 ? T(`${names[0]} and ${names[1]} aren't in yet`, `${names[0]} aur ${names[1]} abhi baaki`, `${names[0]} और ${names[1]} अभी बाकी`)
    : names.length ? T(`${names.length} people still to join`, `${names.length} log abhi baaki`, `${names.length} लोग अभी बाकी`) : T("Everyone's in. Add someone?", "Sab jud gaye. Kisi aur ko?", "सब जुड़ गए। किसी और को?");
  return `<section class="sec rv" style="--i:6"><div class="invc2">
    <button type="button" class="invc2-h" data-invite>
      <span class="invc2-f">${inn.slice(0, 3).map((p) => `<span class="in">${face(p)}</span>`).join("")}${left.slice(0, 3).map((p) => `<span class="out">${face(p)}</span>`).join("")}</span>
      <span class="invc2-t"><b>${esc(who)}</b><small>${T("Votes come to them on Telegram", "Vote Telegram pe aayega", "वोट टेलीग्राम पर आएगा")}</small></span>
    </button>
    <div class="invc2-a">
      <button type="button" class="invc2-wa" data-invq="tg">${mx("telegram", true)}${T("Send on Telegram", "Telegram pe bhejo", "टेलीग्राम पर भेजो")}</button>
      <button type="button" class="invc2-i" data-invq="copy" aria-label="${T("Copy link", "Link copy karo", "लिंक कॉपी करो")}"><span class="inv-ci">${mx("copy")}${mx("copy-success", true)}</span></button>
      <button type="button" class="invc2-i" data-invite aria-label="${T("More ways", "Aur tareeke", "और तरीके")}">${mx("qr-code")}</button>
    </div>
  </div></section>`;
}
function inviteSheet() {
  const h = state.household || {};
  const s = sheet(inviteHtml({ home: homeN(), people: invitePeople(), T }), "invite");
  wireInvite(s.w, { home: homeN(), cook: cookN(), T });
  return s;
}

// The face editor in a sheet of its own, over whatever opened it.
function faceSheet(name, st, done) {
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Face", "Chehra", "चेहरा")}</p><h2>${esc(name)}</h2></div>
    ${editorHtml(st, LANG)}
    <button type="button" class="btn" data-fdone>${T("Done", "Ho gaya", "हो गया")}</button>
    <p class="fe-credit">${T("Faces: Personas by Draftbit, CC BY 4.0", "Chehre: Personas by Draftbit, CC BY 4.0", "चेहरे: Personas by Draftbit, CC BY 4.0")}</p>`, "face");
  wireEditor(s.w, st, () => haptic(4));
  s.w.addEventListener("click", (e) => { if (e.target.closest("[data-fdone]")) { done(st); s.close(); haptic(8); } });
}

// ---- a plate rule, in your own words. Say it or type it; Baari reads it
// back the way it understood it before keeping it.
const MIC_SVG = mx("microphone-2", true);
function ruleSheet() {
  const set = setup();
  const list = () => (setup().custom || []).map((c, i) => `<li style="--i:${i}"><span>${esc(c)}</span><button type="button" data-rdel="${i}" aria-label="Remove">×</button></li>`).join("");
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Plate rules", "Thali ke niyam", "थाली के नियम")}</p><h2>${T("Tell Baari a rule", "Baari ko ek niyam batao", "बारी को एक नियम बताओ")}</h2><p class="sub">${T("Any language. Baari never breaks it, whatever the vote says.", "Kisi bhi bhasha mein. Vote kuch bhi kahe, Baari ye nahi todegi.", "किसी भी भाषा में। बारी इसे कभी नहीं तोड़ेगी।")}</p></div>
    <div class="rs-in"><input data-rt placeholder="${T("e.g. No paneer on Mondays", "jaise: Somvaar ko paneer nahi", "जैसे: सोमवार को पनीर नहीं")}" maxlength="70" enterkeyhint="done" autocomplete="off">${R ? `<button type="button" class="rs-mic" data-rmic aria-label="Speak">${MIC_SVG}</button>` : ""}</div>
    <p class="rs-heard" data-heard hidden></p>
    <ul class="rs-list" data-rl>${list()}</ul>
    <button type="button" class="btn" data-rsave>${T("Keep this rule", "Ye niyam rakho", "ये नियम रखो")}</button>`, "rule");
  const inp = s.w.querySelector("[data-rt]"), heard = s.w.querySelector("[data-heard]");
  const readBack = () => {
    const v = inp.value.trim();
    heard.hidden = !v;
    if (v) heard.innerHTML = `<img src="/img/baari-mark.png" alt="">${T("Baari will read this as: ", "Baari samjhegi: ", "बारी समझेगा: ")}<b>${esc(v.replace(/^./, (c) => c.toUpperCase()))}</b>, ${T("every day, every plate.", "har din, har thali.", "हर दिन, हर थाली।")}`;
  };
  inp.addEventListener("input", readBack);
  s.w.addEventListener("click", (e) => {
    const d = e.target.closest("[data-rdel]");
    if (d) {
      const st = setup(), was = JSON.stringify(st);
      st.custom.splice(+d.dataset.rdel, 1); localStorage.setItem("baari:setup", JSON.stringify(st)); s.w.querySelector("[data-rl]").innerHTML = list(); haptic(6);
      undoable(T("Rule removed", "Niyam hata diya", "नियम हटा दिया"), null, () => { localStorage.setItem("baari:setup", was); const rl = s.w.querySelector("[data-rl]"); if (rl) rl.innerHTML = list(); });
      return;
    }
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
  const pick = new Set(["pizza"]), own = [];
  const s = sheet(`<div class="sheet-h"><p class="k">${T("Treat night", "Treat night", "ट्रीट नाइट")}</p><h2>${T("Ordering in tomorrow?", "Kal bahar se mangaa rahe?", "कल बाहर से मँगा रहे?")}</h2><p class="sub">${T("Pick what's coming. Baari handles the kitchen.", "Kya aa raha hai chuno. Rasoi Baari sambhalegi.", "क्या आ रहा है चुनो। रसोई बारी सँभालेगी।")}</p></div>
    <div class="tr-pick">${TREATS.map((x) => `<button type="button" class="${pick.has(x.k) ? "on" : ""}" data-tr="${x.k}"><span>${x.e}</span><b>${x.l}</b></button>`).join("")}<button type="button" class="tr-own" data-trown><span>${mx("add")}</span><b>${T("Something else", "Kuch aur", "कुछ और")}</b></button></div>
    <form class="tr-in" data-trform hidden><span class="tr-ie" data-trie>🍽️</span><input data-trtext maxlength="28" placeholder="${T("Rajasthani thali, burgers…", "Rajasthani thali, burger…", "राजस्थानी थाली, बर्गर…")}" enterkeyhint="done" autocomplete="off"><button type="submit" aria-label="${T("Add", "Jodo", "जोड़ो")}">${mx("add")}</button></form>
    <ol class="tr-plan" hidden></ol>
    <button type="button" class="btn" data-go>${T("Make it a treat night", "Treat pakka karo", "ट्रीट पक्का करो")} 🎉</button>`, "treat");
  // Your own treat: the tile opens a field, the emoji guesses along as
  // you type, and Enter drops it into the grid as a picked tile.
  const form = s.w.querySelector("[data-trform]"), txt = form.querySelector("[data-trtext]"), ie = form.querySelector("[data-trie]");
  txt.addEventListener("input", () => { const e = treatEmoji(txt.value); if (ie.textContent !== e) { ie.textContent = e; ie.classList.remove("bump"); void ie.offsetWidth; ie.classList.add("bump"); } });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = txt.value.trim().replace(/^./, (c) => c.toUpperCase());
    if (!v) { form.classList.remove("nope"); void form.offsetWidth; form.classList.add("nope"); return; }
    own.push(v);
    s.w.querySelector("[data-trown]").insertAdjacentHTML("beforebegin", `<button type="button" class="on bump own" data-trc="${esc(v)}"><span>${treatEmoji(v)}</span><b>${esc(v)}</b></button>`);
    txt.value = ""; ie.textContent = "🍽️"; form.hidden = true; haptic(8);
  });
  s.w.addEventListener("click", async (e) => {
    if (e.target.closest("[data-trown]")) { form.hidden = false; txt.focus(); haptic(5); return; }
    const c = e.target.closest("[data-trc]");
    if (c) { const i = own.indexOf(c.dataset.trc); if (i >= 0) own.splice(i, 1); c.remove(); haptic(5); return; }
    const b = e.target.closest("[data-tr]");
    if (b) { pick.has(b.dataset.tr) ? pick.delete(b.dataset.tr) : pick.add(b.dataset.tr); b.classList.toggle("on"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); haptic(5); return; }
    const go = e.target.closest("[data-go]");
    if (!go || go.disabled) return;
    go.disabled = true;
    const plan = s.w.querySelector(".tr-plan");
    s.w.querySelector(".tr-pick").classList.add("folded");
    plan.hidden = false;
    const lines = [
      T(`Telling ${cookN()} ji: day off, paid in full`, `${cookN()} ji ko bata rahe: chhutti, paise poore`, `${cookHi()} जी को बता रहे: छुट्टी, पैसे पूरे`),
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
    local.treat = { what: [...pick], custom: [...own] }; saveLocal();
    const r = go.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, TREATS.filter((x) => pick.has(x.k)).map((x) => x.e).concat(own.map(treatEmoji), ["🎉"]), 18);
    haptic(20);
    go.textContent = T("Enjoy!", "Maze karo!", "मज़े करो!");
    setTimeout(() => { s.close(); render(); }, 900);
  });
}

// ---- shuffle: the plate and the name slide out, the next dish that breaks
// nobody's rule slides in. Skipped dishes say why.
const RULE_SKIP = { "Aloo puri": T("Skipped Aloo puri: no potato on Papa's plate", "Aloo puri skip: Papa ki thali mein aloo nahi", "आलू पूरी छोड़ी: पापा की थाली में आलू नहीं"), "Egg bhurji paratha": T("Skipped Egg bhurji: eggs only on weekends", "Egg bhurji skip: anda sirf weekend", "अंडा भुर्जी छोड़ी: अंडा सिर्फ़ वीकेंड") };
let spinning = false;
function shuffle() {
  const card = document.querySelector(".hx.locked");
  const L = state.locked;
  if (!card || !L || spinning) return;
  spinning = true;
  const all = Object.keys(DISHES);
  const cur = pickDish();
  let i = all.indexOf(cur), skipped = null, next = cur;
  for (let k = 0; k < all.length; k++) {
    i = (i + 1) % all.length;
    if (RULE_SKIP[all[i]]) { skipped = skipped || all[i]; continue; }
    if (all[i] !== cur) { next = all[i]; break; }
  }
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // After the swap the card eases to its new height instead of jumping (a
  // long name can wrap to two lines).
  const h0 = card.offsetHeight;
  card.classList.add("hx-leave");
  haptic(6);
  setTimeout(() => {
    local.pick = next === L.winner ? null : { dish: next, from: L.winner };
    saveLocal();
    spinning = false;
    render();
    const nc = document.querySelector(".hx.locked");
    if (nc && !calm) {
      nc.classList.add("hx-arrive");
      setTimeout(() => nc.classList.remove("hx-arrive"), 700);
      const h1 = nc.offsetHeight;
      if (h0 && Math.abs(h1 - h0) > 1) { nc.style.overflow = "hidden"; nc.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }).onfinish = () => { nc.style.overflow = ""; }; }
    }
    haptic(10);
    const note = document.querySelector(".skipnote");
    if (note && skipped) { note.textContent = RULE_SKIP[skipped]; note.classList.add("on"); setTimeout(() => note.classList.remove("on"), 2600); }
  }, calm ? 0 : 200);
}

// Tab labels follow the language picked in onboarding.
function labelTabs() {
  const L = { ghar: T("Home", "Ghar", "घर"), khata: T("Money", "Khata", "खाता"), delivery: T("Groceries", "Saamaan", "सामान"), sunita: `${cookN()}`, baari: T("Diary", "Diary", "डायरी") };
  const IC = { ghar: "home-2", khata: "empty-wallet", delivery: "truck", sunita: "chef-hat", baari: "book" };
  document.querySelectorAll(".nav a").forEach((a) => {
    const k = a.dataset.tab, sp = a.querySelector(".nv-l"), ic = a.querySelector(".nv-i");
    if (sp && L[k]) { sp.textContent = L[k]; a.setAttribute("aria-label", L[k]); }
    if (ic && !ic.firstChild) ic.innerHTML = `<span class="nv-o">${mx(IC[k])}</span><span class="nv-f">${mx(IC[k], true)}</span>`;
  });
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
    app.innerHTML = `<div class="empty offline"><b>${T("Can't reach Baari", "Baari tak nahi pahunch pa rahe", "बारी तक नहीं पहुँच पा रहे")}</b>${T("It opens by itself when the net is back.", "Net aate hi khud khul jayega.", "नेट आते ही अपने आप खुल जाएगा।")}</div>`;
   
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
    const vt = document.startViewTransition(paint);
    vt.ready.catch(() => {}); vt.finished.catch(() => {});
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
  // The tabs share the bar like a segmented control: each one is its label
  // plus an equal share of the spare width, so the pill (exactly the active
  // tab) always has the same breathing room around its label and is always
  // centred on it. The pill is a capsule 8px inside the bar, so its ends
  // follow the bar's own curve (31px bar, 23px pill). If the labels can't
  // keep 10px either side on a narrow phone, they all shrink together.
  const labels = [...nav.querySelectorAll(".nv-l")];
  labels.forEach((l) => { l.style.fontSize = ""; });
  const fit = Math.min(1, ...labels.map((l) => (l.parentElement.clientWidth - 20) / l.scrollWidth));
  if (fit < 1) {
    const base = parseFloat(getComputedStyle(labels[0]).fontSize) || 10.5;
    labels.forEach((l) => { l.style.fontSize = `${Math.max(8.5, base * fit).toFixed(2)}px`; });
  }
  const set = () => {
    const h = pill.offsetHeight || 46;
    pill.style.transform = `translateX(${on.offsetLeft}px)`; pill.style.width = `${on.offsetWidth}px`;
    pill.style.borderRadius = `${h / 2}px`;
  };
  if (!animate) {
    const prev = pill.style.transition;
    pill.style.transition = "none";
    set();
    void pill.offsetWidth;
    pill.style.transition = prev;
  } else set();
}
addEventListener("resize", () => movePill(routeNow(), false));
// The tabs size from their labels, so re-measure once the font lands and
// whenever the bar itself changes width (FAB shown, rotation, text size).
document.fonts?.ready.then(() => movePill(routeNow(), false));
if (window.ResizeObserver) { let nw = 0; new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w && w !== nw) { nw = w; movePill(routeNow(), false); } }).observe($(".nav")); }

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
  if (e.target.closest("[data-cuisine]")) { haptic(8); openCuisine({ T, local, save: saveLocal, people: fam().map((f) => f.name), cook: cookN(), haptic, toast }); document.addEventListener("cz-close", () => { const sec = $("[data-cuisine]")?.closest("section"); if (sec) sec.outerHTML = cuisineCard({ T, local }); }, { once: true }); return; }
  if (e.target.closest("[data-voice]")) { haptic(8); openVoice({ T, local, save: () => { saveLocal(); }, cook: cookN(), haptic, toast }); document.addEventListener("vx-close", () => { const sec = $("[data-voice]")?.closest("section"); if (sec) { sec.outerHTML = voiceCard({ T, local, cook: cookN() }); } }, { once: true }); return; }
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
  if ((el = q("[data-theme-set]"))) { setTheme(el.dataset.themeSet, el); return; }
  if ((el = q("[data-stw]"))) {
    const { vin } = settleCard.ctx, names = fam().map((p) => p.name);
    const who = new Set(local.split || names);
    who.has(el.dataset.stw) ? who.delete(el.dataset.stw) : who.add(el.dataset.stw);
    who.add(vin);
    local.split = names.filter((n) => who.has(n)); saveLocal(); haptic(5); render(); return;
  }
  if ((el = q("[data-stok]"))) { settleMark(el.dataset.stok, true); return; }
  if ((el = q("[data-stqr]"))) { qrSheet(el.dataset.stqr); return; }
  if ((el = q("[data-stask]"))) { settleAsk(el.dataset.stask); return; }
  if (q("[data-stupi]")) { upiSheet(); return; }
  if ((el = q("[data-stshare]"))) { shareHisaab(el); return; }
  if (q("[data-editfam]")) { closePop(); editFamily(); return; }
  if ((el = q("[data-invq]"))) {
    haptic(8);
    if (el.dataset.invq === "copy") {
      (navigator.clipboard ? navigator.clipboard.writeText(JOIN) : Promise.reject()).catch(() => {});
      el.classList.add("ok"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("ok"), 1600);
      toast({ icon: "🔗", title: T("Link copied", "Link copy ho gaya", "लिंक कॉपी हुआ"), body: T("Paste it in the family group.", "Family group mein daal do.", "फ़ैमिली ग्रुप में डाल दो।"), ms: 2200 });
    } else sendInvite(el.dataset.invq, { home: homeN(), cook: cookN(), T });
    return;
  }
  if (q("[data-invite]")) { closePop(); inviteSheet(); return; }
  if ((el = q("[data-bahi]"))) { el.classList.toggle("open"); haptic(8); return; }
  if (q("[data-ksmonth]")) { monthSheet(); return; }
  if ((el = q("[data-kd]"))) { spendDay(el); return; }
  if ((el = q("[data-kmo]"))) { spendMonth(el); return; }
  if ((el = q("[data-mode]"))) {
    if (el.classList.contains("on")) return;
    const rt = railTurn(), was = mode();
    if (rt && el.dataset.mode !== was) { const m = el.dataset.mode; turnWrite({ action: "mode", mode: m }, (t) => { t.mode = m; }, null, null); return; }
    local.mode = el.dataset.mode; saveLocal(); haptic(6);
    el.parentElement.querySelectorAll("[data-mode]").forEach((b) => { b.classList.toggle("on", b === el); b.setAttribute("aria-checked", String(b === el)); });
    placeMode();
    const sub = document.querySelector("[data-wbsub]");
    if (sub) swapText(sub, wbSub(state, inBaari().includes(duty()) ? duty() : inBaari()[0]));
    return;
  }
  if ((el = q("[data-task]"))) {
    const id = el.dataset.task, t = nightTask();
    el.disabled = true; haptic(14);
    const was = JSON.stringify(state.prep);
    if (t) { t.status = "done"; t.done_by = me().name; t.at_ist = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 19); }
    render();
    api("prep", { id, done: true, by: me().name }).then(load).catch((err) => { state.prep = JSON.parse(was); render(); toast({ icon: "⚠️", title: T("Didn't save", "Save nahi hua", "सेव नहीं हुआ"), body: String(err.message || err).slice(0, 120) }); });
    return;
  }
  if ((el = q("[data-eat]"))) { haptic(6); eatSheet(); return; }
  if (q("[data-wbedit]")) { wbUI.edit = !wbUI.edit; haptic(6); wbMove(render); return; }
  if ((el = q("[data-turn]")) && railTurn()) {
    const p = el.dataset.turn, prev = duty(), key = railTurn().holder ? "holder" : "next";
    turnWrite({ action: "give", name: p }, (t) => { t[key] = p; }, turnLine(p), { body: { action: "give", name: prev }, patch: (t) => { t[key] = prev; } });
    return;
  }
  if (q("[data-pass]") && railTurn()) {
    const r = inBaari(), d = duty(), nx = r[(r.indexOf(d) + 1) % r.length], key = railTurn().holder ? "holder" : "next";
    turnWrite({ action: "pass" }, (t) => { t[key] = nx; t.passed = [...(t.passed || []), d]; }, turnLine(nx), null);
    return;
  }
  if ((el = q("[data-inb]")) && railTurn()) {
    const p = el.dataset.inb, isIn = inBaari().includes(p);
    if (isIn && inBaari().length <= 2) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); toast({ icon: "🪙", title: T("A baari needs two", "Baari ke liye do log chahiye", "बारी के लिए दो लोग चाहिए"), body: T("Add someone before taking this one out.", "Pehle kisi aur ko jodo.", "पहले किसी और को जोड़ो।") }); return; }
    const act = isIn ? "out" : "in", undo = isIn ? "in" : "out";
    const apply = (a) => (t) => { t.order = a === "in" ? [...new Set([...t.order, p])] : t.order.filter((x) => x !== p); };
    turnWrite({ action: act, name: p }, apply(act), isIn ? T(`${p} is out of the baari`, `${p} baari se bahar`, `${p} बारी से बाहर`) : T(`${p} is back in`, `${p} wapas baari mein`, `${p} वापस बारी में`), { body: { action: undo, name: p }, patch: apply(undo) });
    return;
  }
  if ((el = q("[data-turn]"))) { const was = snapLocal(); local.duty = el.dataset.turn; saveLocal(); haptic(12); wbMove(render); undoable(turnLine(local.duty), was, () => wbMove(render)); return; }
  if (q("[data-pass]")) { const was = snapLocal(), r = inBaari(), d = r.includes(duty()) ? duty() : r[0]; local.duty = r[(r.indexOf(d) + 1) % r.length]; saveLocal(); haptic(12); wbMove(render); undoable(turnLine(local.duty), was, () => wbMove(render)); return; }
  if ((el = q("[data-inb]"))) {
    const p = el.dataset.inb, out = new Set(local.out || []);
    if (!out.has(p) && inBaari().length <= 2) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); toast({ icon: "🪙", title: T("A baari needs two", "Baari ke liye do log chahiye", "बारी के लिए दो लोग चाहिए"), body: T("Add someone before taking this one out.", "Pehle kisi aur ko jodo.", "पहले किसी और को जोड़ो।") }); return; }
    const was = snapLocal();
    out.has(p) ? out.delete(p) : out.add(p);
    local.out = [...out];
    undoable(out.has(p) ? T(`${p} is out of the baari`, `${p} baari se bahar`, `${p} बारी से बाहर`) : T(`${p} is back in`, `${p} wapas baari mein`, `${p} वापस बारी में`), was, () => wbMove(render));
    if (out.has(duty())) local.duty = inBaari()[0];
    haptic(8); saveLocal(); wbMove(render); return;
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
  if ((el = q("[data-plate]"))) {
    const p = el.dataset.plate, li = el.closest(".pt-r"), was = ui.plate === p;
    ui.plate = was ? null : p; haptic(5);
    document.querySelectorAll(".pt-r").forEach((r) => { const on = r === li && !was; r.classList.toggle("open", on); r.querySelector(".pt-h").setAttribute("aria-expanded", String(on)); });
    return;
  }
  if ((el = q("[data-side]")) || (el = q("[data-unside]"))) {
    const k = el.dataset.side || el.dataset.unside, up = !!el.dataset.side, pl = plateOf(ui.plate);
    if (up && (pl[k] || 0) >= 9) { haptic(12); return; }
    pl[k] = Math.max(0, (pl[k] || 0) + (up ? 1 : -1));
    if (!pl[k]) delete pl[k];
    ui.bumped = k; haptic(up ? 6 : 4); patchPlates();
    return;
  }
  if ((el = q("[data-same]"))) {
    const was = snapLocal(), src = plateOf(el.dataset.same);
    fam().forEach((p) => { local.plates[p.name] = { ...src }; });
    haptic(10); patchPlates();
    document.querySelectorAll(".pt-r .av").forEach((a, i) => { a.style.animationDelay = `${i * 60}ms`; a.classList.add("bump"); });
    undoable(T(`Everyone gets ${el.dataset.same}'s plate`, `Sabko ${el.dataset.same} jaisi thali`, `सबको ${el.dataset.same} जैसी थाली`), was, render);
    return;
  }
  if ((el = q("[data-hxi]"))) { hxPick(el); return; }
  if (q("[data-shuffle]")) { enableShake(shuffle); shuffle(); return; }
  if (q("[data-unshuffle]")) { const was = snapLocal(); local.pick = null; haptic(8); redraw(); undoable(T("Back to the vote's dish", "Vote wali dish wapas", "वोट वाली डिश वापस"), was, render); return; }
  if (q("[data-untreat]")) { const was = snapLocal(); local.treat = null; haptic(10); redraw(); undoable(T("Treat cancelled", "Treat cancel ho gaya", "ट्रीट कैंसिल"), was, render); return; }
  if ((el = q("[data-tp]"))) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, [el.textContent, "✨"], 6); el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); haptic(6); return; }
  if ((el = q("[data-df]"))) { if (el.dataset.df !== diaryUI.f) { haptic(4); diaryTo(el.dataset.df, diaryUI.newest); } return; }
  if (q("[data-dsort]")) { haptic(4); diaryTo(diaryUI.f, !diaryUI.newest); return; }
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
    if (railTurn()) { const prev = duty(), key = railTurn().holder ? "holder" : "next"; turnWrite({ action: "give", name: who }, (t) => { t[key] = who; }, turnLine(who), { body: { action: "give", name: prev }, patch: (t) => { t[key] = prev; } }); return; }
    local.duty = who; saveLocal(); haptic(14); render();
    toast({ icon: "🪙", title: T(`${who}'s baari now`, `Ab ${who} ki baari`, `अब ${who} की बारी`), body: mode() === "pick" ? T("They pick tonight's dish. Others can veto once.", "Aaj ki dish wahi chunenge. Baaki ek veto.", "आज की डिश वही चुनेंगे।") : T("They break ties and okay anything over ₹300.", "Tie wahi todenge, ₹300 se upar unki haan.", "टाई वही तोड़ेंगे।") });
  });
  dragger(app, ".tp", {});
}

// What the + menu's live actions do.
function onAct(k, tile, closeMenu) {
  if (k === "treat") return treatSheet();
  if (k === "leave") return cookFinder({ cook: cookN(), dish: pickDish() || "" });
  if (k === "shuffle") { if (routeNow()) location.hash = "#/"; setTimeout(() => { document.querySelector(".hx, .hero")?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(shuffle, 450); }, 120); return; }
  if (k === "left") { local.leftDone = 0; saveLocal(); setTimeout(() => openIsland("left"), 80); return; }
  if (k === "rule") return ruleSheet();
  if (k === "demo") return demoSheet();
  if (k === "invite") return inviteSheet();
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
          toast({ icon: "🙏", title: n ? T(`${n} guest${n > 1 ? "s" : ""} tomorrow`, `Kal ${n} mehmaan`, `कल ${n} मेहमान`) : T("No guests", "Koi mehmaan nahi", "कोई मेहमान नहीं"), body: n ? T(`${cookN()} cooks for ${4 + n}. About ${n * 3} extra roti.`, `${cookN()} ${4 + n} logon ka banayengi. Lagbhag ${n * 3} roti extra.`, `${cookHi()} ${4 + n} लोगों का बनाएँगी।`) : "" });
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
wirePlay();
pullToRefresh(() => load());
labelTabs();
glass($(".nav"), { borderRadius: 32, backgroundOpacity: 0.28, saturation: 1.9, blur: 10, brightness: 70, distortionScale: -110 });
render();
// The splash never waits on the network: the cached state is already on
// screen, and /app/state can take seconds. Give a fresh fetch 0.7 s at most.
Promise.race([load(), new Promise((r) => setTimeout(r, 700))]).then(async () => {
  if (ready) await ready();
  if (needsOnboarding()) onboard({ onDone: () => { movePill(routeNow(), false); initInstall(); watchTaps(); } });
  else { initInstall({ quiet: !!FIXTURE }); watchTaps(); }
  // Once a session the island speaks up: first whatever's waiting, later
  // the cook's leave (the demo moment for the cook finder).
  if (!needsOnboarding() && routeNow() === "") {
    let seen = false;
    try { seen = sessionStorage.getItem("baari:peek"); sessionStorage.setItem("baari:peek", "1"); } catch (e) {}
    const ak = asks();
    if (!seen && ak.includes("left")) setTimeout(() => toast({ icon: "🍲", title: T("Anything left from dinner?", "Raat ka khaana bacha?", "रात का खाना बचा?"), body: T("Five seconds. Tomorrow's amounts change.", "5 second. Kal ki quantity uske hisaab se.", "5 सेकंड। कल की मात्रा उसी हिसाब से।"), action: { label: T("Tell", "Batao", "बताओ"), run: () => openIsland("left") }, ms: 7000 }), 2600);
    if (!seen && ak.includes("leave")) setTimeout(() => toast({ icon: avatar(cookN(), "sm"), title: T(`${cookN()} ji is off tomorrow`, `${cookN()} ji kal chhutti pe hain`, `${cookHi()} जी कल छुट्टी पर`), body: T("Find a cook nearby?", "Paas mein cook dhoondhein?", "पास में कुक ढूँढें?"), action: { label: T("Find", "Dhoondho", "ढूँढो"), run: () => cookFinder({ cook: cookN(), dish: pickDish() || "" }) }, ms: 8000 }), 14000);
  }
});
setInterval(() => {
  if (document.visibilityState === "visible") load();
}, 5000);
// The phone knows before the poll does: retry the moment the network is back.
document.addEventListener("change", (e) => { if (e.target.matches("[data-big]")) setBig(e.target.checked); });
addEventListener("online", () => load());
addEventListener("offline", () => { failed = true; renderTop(); });
if ("serviceWorker" in navigator && !FIXTURE) navigator.serviceWorker.register("/sw.js").catch(() => {});
