// Baari household app. A window onto what the agent did: every number comes
// from GET /app/state (rails, PRD 11.3), the activity from /app/events. No
// state of its own, no decisions. Votes deep-link into the Telegram bot.
const RAILS = "https://baari-rails.vercel.app";
const onPages = /pages\.dev$|baari\./.test(location.hostname);
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
const BOT = "Baari_ken_bot";

// file: the 3D thali render in /img/dishes (webp, png fallback). mins: cook time.
const DISHES = {
  "Rajma chawal": { file: "rajma", hi: "राजमा चावल", mins: 50 },
  "Lauki chana dal": { file: "lauki-chana-dal", hi: "लौकी चना दाल", mins: 35 },
  "Palak paneer roti": { file: "palak-paneer", hi: "पालक पनीर रोटी", mins: 40 },
  "Kadhi chawal": { file: "kadhi", hi: "कढ़ी चावल", mins: 45 },
  "Aloo puri": { file: "aloo-puri", hi: "आलू पूरी", mins: 40 },
  "Egg bhurji paratha": { file: "egg-bhurji", hi: "अंडा भुर्जी पराठा", mins: 30 },
  "Chole chawal": { file: null, hi: "छोले चावल", mins: 45 },
};
const PEOPLE = ["Vinay", "Mummy", "Papa"];
const RAIL_NAME = { telegram: "Telegram", gnani: "Gnani", pinelabs: "Pine Labs", delhivery: "Delhivery", system: "Baari", kb: "Yaaddasht" };

let state = null;
let events = [];
let lastOk = 0;
let lastEvent = 0;
let failed = false;

// The last good state paints instantly on reopen; the poll replaces it.
const CACHE_KEY = "baari:state";
if (!FIXTURE) {
  try { state = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { state = null; }
}

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Indian grouping, rupees from paise: 476000 -> "Rs 4,760"
function rs(paise) {
  const r = Math.round((paise || 0) / 100);
  return "Rs " + r.toLocaleString("en-IN");
}
function hhmm(iso) {
  if (!iso) return "";
  const m = String(iso).match(/T(\d{2}):(\d{2})/) || String(iso).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}
const cap = (t) => String(t || "").charAt(0).toUpperCase() + String(t || "").slice(1);
const dishName = (d) => (d && typeof d === "object" ? d.dish : d) || "";
const dish = (name) => DISHES[name] || { file: null, hi: "", mins: 40 };

// The thali render. A dish without one gets an empty steel thali drawn in CSS.
function thali(name, cls = "") {
  const f = dish(name).file;
  if (!f) return `<span class="thali-css ${cls}" aria-hidden="true"><i></i><i></i></span>`;
  return `<picture class="thali ${cls}"><source srcset="/img/dishes/${f}.webp" type="image/webp"><img src="/img/dishes/${f}.png" alt="" decoding="async"></picture>`;
}

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 5.3 20 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.2l-4.3-4.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 4.1 2.9 11.3c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5zM8.3 14l9.8-6.2c.5-.3.9-.1.5.2l-8.3 7.5-.3 3.4z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V6a5 5 0 0 1 10 0v1h3l1 15H3L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h12v10H2zm12 4h4.5l3.5 3.5V15h-8zM6 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  rupee: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v2h-3.3c.6.6 1 1.4 1.2 2.3H18v2h-2.1a5 5 0 0 1-4.9 4.2h-.6l6.3 7.5h-2.6l-6.3-7.5V11.5H11a3 3 0 0 0 2.8-2.2H6v-2h7.8A3 3 0 0 0 11 5H6z"/></svg>',
  pot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v3h-2zM4 8h16v2h1v2h-1v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6H3v-2h1zm2-1.5c0-.8.7-1.5 1.5-1.5h9c.8 0 1.5.7 1.5 1.5V7H6z"/></svg>',
};
const RAIL_ICON = {
  telegram: ICON.tg,
  gnani: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"/></svg>',
  pinelabs: ICON.rupee,
  delhivery: ICON.truck,
  system: ICON.pot,
};

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
      state = s;
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

function header(title, sub) {
  const stale = Date.now() - lastOk > 15000;
  const duty = (state && state.household && state.household.duty_holder) || "Vinay";
  return `<header class="top">
    <div><h1>${esc(title)}</h1>${sub ? `<p class="top-sub">${esc(sub)}</p>` : ""}</div>
    <span class="live ${stale ? "stale" : ""}" role="status"><i></i>${stale ? "Purana data" : "Live"}</span>
  </header>
  <p class="duty"><span class="duty-av">${esc(duty[0])}</span>Aaj kiski baari? <b>${esc(duty)} ki</b></p>`;
}

// ---- Ghar

function ghar() {
  const s = state;
  const list = (s.shortlist || []).filter((d) => dishName(d));
  const locked = s.locked && s.locked.winner;
  const flat = (s.household && s.household.flat) || "402";
  let body;
  if (locked) body = lockedHero(s) + todo(s) + tiles(s);
  else if (list.length) body = voteCards(s, list) + tiles(s);
  else body = waiting() + tiles(s);
  return `${header("Ghar", `${(s.household && s.household.name) || "Sharma"} parivar, Flat ${flat}`)}${dayline(s)}${body}${recent(3)}`;
}

// Where tonight's run is, from 8:30 pm to Sunita's 8:00 am. Read off the state,
// never off the clock, so a replayed run shows the same steps.
const DAY = [["8:30", "Do dish"], ["9:30", "Vote band"], ["9:35", "Saamaan book"], ["7:45", "Sunita ko brief"], ["8:00", "Khana banega"]];
function dayStep(s) {
  const b = s.brief || {};
  if (b.reply_text || (b.reply_extract && b.reply_extract.commitment)) return 4;
  if (b.audio_url) return 3;
  if (s.locked && s.locked.winner) return 2;
  if ((s.shortlist || []).some((d) => dishName(d))) return 1;
  return 0;
}
function dayline(s) {
  const at = dayStep(s);
  return `<ol class="day" aria-label="Aaj raat se kal subah tak">${DAY.map(([t, l], i) => `<li class="${i < at ? "done" : i === at ? "cur" : ""}"${i === at ? ' aria-current="step"' : ""}><i aria-hidden="true">${i < at ? ICON.check : ""}</i><b>${t}</b><span>${l}</span></li>`).join("")}</ol>`;
}

function waiting() {
  return `<section class="hero hero-empty">
    ${thali("", "hero-img")}
    <h2>Kal kya banega?</h2>
    <p>Baari raat 8:30 baje do dish bhejega, sabko alag se Telegram pe. Vote 9:30 tak.</p>
  </section>`;
}

function voteCards(s, list) {
  const votes = s.votes || { voted: [], pending: PEOPLE };
  const voted = votes.voted || [];
  return `<section class="sec">
    <div class="sec-h"><div><h2>Kal ka khana</h2><p class="sub">Do mein se ek. Vote ${esc(votes.closes_at || "21:30")} tak.</p></div></div>
    <div class="pick">${list.slice(0, 2).map((d, i) => {
      const name = dishName(d);
      const m = dish(name);
      const need = (d.missing || []).length;
      return `<article class="pick-card">
        ${thali(name, "pick-img")}
        <h3>${esc(name)}</h3>
        <p class="hi" lang="hi">${esc(d.hindi || m.hi)}</p>
        <p class="pick-meta"><span>${m.mins} min</span><span>${need ? `${need} cheez laani hai` : "Sab ghar mein hai"}</span></p>
      </article>`;
    }).join("")}</div>
    <a class="btn tg" href="https://t.me/${BOT}">${ICON.tg}Telegram pe vote karo</a>
    ${voters(voted)}
  </section>`;
}

function voters(voted) {
  return `<div class="voters">
    <div class="faces">${PEOPLE.map((p) => `<span class="face ${voted.includes(p) ? "v" : ""}"><b>${p[0]}</b><small>${p}</small></span>`).join("")}</div>
    <p class="sub">${voted.length === PEOPLE.length ? "Sabne vote kar diya." : `${voted.length} of ${PEOPLE.length} ne vote kiya.`} Kisne kya chuna, yeh sirf Vinay dekhte hain.</p>
  </div>`;
}

function lockedHero(s) {
  const L = s.locked;
  const w = dish(L.winner);
  const ru = L.runner_up;
  return `<section class="hero">
    ${thali(L.winner, "hero-img")}
    <p class="hero-kicker"><span class="tag black">${ICON.check}Pakka</span>Kal ka khana</p>
    <h2>${esc(L.winner)}</h2>
    <p class="hero-hi" lang="hi">${esc(L.winner_hindi || w.hi)}</p>
    <dl class="facts">
      <div><dt>Log</dt><dd>${esc(L.headcount || 4)}</dd></div>
      <div><dt>Samay</dt><dd>${w.mins} min</dd></div>
      <div><dt>Sunita ji</dt><dd>8:00</dd></div>
    </dl>
    ${ru ? `<div class="runner">${thali(ru, "runner-img")}<p><b>${esc(ru)}</b><span>Is baar runner-up. Agli baar iski baari.</span></p></div>` : ""}
  </section>`;
}

function todo(s) {
  const missing = s.missing || [];
  if (!missing.length) return "";
  const d = s.delivery || {};
  const row = (m) => {
    const item = m.item || m;
    const kirana = m.route === "kirana" || (d.kirana_pickup || []).includes(item);
    return `<li><span class="todo-ic ${kirana ? "k" : "d"}">${kirana ? ICON.bag : ICON.truck}</span><p><b>${esc(cap(item))}</b><span>${kirana ? "Sunita 7:40 pe Sharma Kirana se, paise Baari dega" : `Delhivery se${d.status ? `, abhi ${esc(STAGES[stageIndex(d.status)].toLowerCase())}` : ""}`}</span></p></li>`;
  };
  return `<section class="sec">
    <div class="sec-h"><h2>Laana hai</h2><a class="arrow" href="#/delivery" aria-label="Delivery dekho">${ICON.arrow}</a></div>
    <ul class="todo">${missing.map(row).join("")}</ul>
  </section>`;
}

function tiles(s) {
  const k = s.khata || {};
  const cap = k.cap_today || 40000;
  const pct = Math.min(100, Math.round(((k.spent_today || 0) / cap) * 100));
  const d = s.delivery || {};
  const b = s.brief || {};
  const reply = b.reply_extract && b.reply_extract.commitment;
  const parcel = d.waybill ? (stageIndex(d.status) >= 4 ? "Pahunch gaya" : d.expected ? whenLabel(d.expected) : "Raaste mein") : "Abhi nahi";
  const cook = reply === "confirmed_with_counts" ? "Counts mil gaye" : b.reply_text ? "Jawaab aaya" : b.audio_url ? "Brief bheja" : "7:45 pe";
  return `<section class="sec tiles">
    <a class="tile" href="#/khata"><span class="tile-ic">${ICON.rupee}</span><span class="tile-k">Aaj ka kharcha</span><b>${rs(k.spent_today)}</b><span class="tile-meter"><i class="${pct >= 80 ? "warn" : ""}" style="width:${pct}%"></i></span><small>${rs(cap)} ki limit</small></a>
    <a class="tile" href="#/delivery"><span class="tile-ic">${ICON.truck}</span><span class="tile-k">Saamaan</span><b>${esc(parcel)}</b><small>${d.waybill ? "Delhivery" : "Vote ke baad book"}</small></a>
    <a class="tile" href="#/sunita"><span class="tile-ic">${ICON.pot}</span><span class="tile-k">Sunita ji</span><b>${esc(cook)}</b><small>Hindi voice note</small></a>
  </section>`;
}

// ---- Khata

function khata() {
  const k = state.khata || {};
  const used = k.used || 0;
  const total = k.block_total || 500000;
  const cap = k.cap_today || 40000;
  const spent = k.spent_today || 0;
  const pct = Math.min(100, Math.round((spent / cap) * 100));
  const debits = (k.debits || []).slice().reverse();
  const chip = (st) => (st === "SUCCESS" ? `<span class="tag">${ICON.check}Paid</span>` : st === "FAILED" ? '<span class="tag red">Failed</span>' : '<span class="tag grey">Pending</span>');
  return `${header("Khata", "UPI Reserve Pay, Pine Labs")}
    <section class="sec"><div class="block">
      <div class="block-k"><span>Reserve Pay block</span><span class="bank">ICICI</span></div>
      <div class="block-v">${rs(k.left ?? total - used)}</div>
      <div class="block-k"><span>bacha hai, ${rs(total)} mein se. Vinay ne approve kiya.</span></div>
      <div class="bar"><i style="width:${Math.round((used / total) * 100)}%"></i></div>
    </div></section>
    <section class="sec"><div class="panel">
      <div class="cap"><div><b>Aaj ki limit</b><span>Saare payments milake, roz</span></div><p class="amt">${rs(spent)}<small> / ${rs(cap)}</small></p></div>
      <div class="meter"><i class="${pct >= 80 ? "warn" : ""}" style="width:${pct}%"></i></div>
      <p class="sub">Rs 300 se upar ka koi bhi payment Vinay ke "Haan" ke bina nahi hota.</p>
    </div></section>
    <section class="sec"><div class="sec-h"><h2>Aaj ke payments</h2>${state.date_for ? `<a class="arrow" href="/receipt/${esc(state.date_for)}" aria-label="Aaj ki receipt">${ICON.arrow}</a>` : ""}</div>
      ${debits.length ? `<ul class="list">${debits.map((d) => `<li><span class="list-ic">${/kirana/i.test(d.to || "") ? ICON.bag : ICON.truck}</span><p><b>${esc(d.to || "Baari staples hub")}</b><span>${esc(d.note || d.ref || "")}</span></p><div class="r"><p class="amt">${rs(d.amount)}</p>${chip(d.status)}</div></li>`).join("")}</ul>` : '<div class="panel empty"><b>Abhi tak kuch nahi</b>Pehla payment vote ke baad hoga.</div>'}
    </section>
    <section class="sec"><div class="sec-h"><h2>Approved dukaan</h2></div>
      <ul class="list"><li><span class="list-ic">${ICON.bag}</span><p><b>Sharma Kirana</b><span>sharmakirana@okaxis, Sunita ke raaste mein</span></p><div class="r"><span class="tag">Approved</span></div></li></ul></section>
    <p class="note">Baari naye dukaan add nahi kar sakta, na limit badha sakta hai. Yeh sirf Vinay kar sakte hain.</p>`;
}

// ---- Delivery

// "Aaj shaam 6:20 tak", "Kal subah 7:10": day relative to the run's NOW
function whenLabel(iso) {
  const t = Date.parse(String(iso).replace(" ", "T") + (/[+Z]/.test(String(iso).slice(10)) ? "" : "+05:30"));
  if (!t) return "";
  const ist = (ms) => new Date(ms + 5.5 * 3600e3);
  const nowMs = Date.parse(String((state && state.now_ist) || "").replace(" ", "T") + "+05:30") || Date.now();
  const a = ist(t), n = ist(nowMs);
  const days = Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 864e5);
  const h = a.getUTCHours(), m = String(a.getUTCMinutes()).padStart(2, "0");
  const part = h < 12 ? "subah" : h < 16 ? "dopahar" : h < 19 ? "shaam" : "raat";
  const day = days === 0 ? "Aaj" : days === 1 ? "Kal" : days === -1 ? "Kal raat" : a.toISOString().slice(5, 10);
  return `${day} ${part} ${h % 12 || 12}:${m}`;
}
// Sunita cooks at 8:00, so the staples must land by 7:30 the next morning.
function deadlineMs() {
  const nowMs = Date.parse(String((state && state.now_ist) || "").replace(" ", "T") + "+05:30") || Date.now();
  const n = new Date(nowMs + 5.5 * 3600e3);
  let d = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 7, 30) - 5.5 * 3600e3;
  if (d <= nowMs) d += 864e5;
  return d;
}

const STAGES = ["Book hua", "Utha liya", "Raaste mein", "Delivery pe nikla", "Pahunch gaya"];
function stageIndex(st) {
  const s = String(st || "").toLowerCase();
  if (/deliver(ed)?$|^dl$/.test(s) && !/out/.test(s)) return 4;
  if (/out for/.test(s)) return 3;
  if (/transit|pending|dispatched/.test(s)) return 2;
  if (/picked/.test(s)) return 1;
  return 0;
}

function delivery() {
  const d = state.delivery || {};
  const idx = stageIndex(d.status);
  const expMs = d.expected ? Date.parse(String(d.expected).replace(" ", "T") + (/[+Z]/.test(String(d.expected).slice(10)) ? "" : "+05:30")) : 0;
  const late = expMs && expMs > deadlineMs() && idx < 4;
  const hop = d.hop;
  const pickup = d.kirana_pickup || [];
  const done = idx >= 4;
  const parcelItems = d.waybill ? (state.missing || []).filter((m) => m.route !== "kirana" && !pickup.some((p) => (p.item || p) === (m.item || m))).map((m) => m.item || m) : [];
  const map = `<div class="map"><svg viewBox="0 0 400 220" aria-hidden="true">
    <path d="M0 70H400M0 160H400M100 0V220M240 0V220M340 0V220" stroke="#fff" stroke-width="12"/>
    <path d="M0 115H400M170 0V220" stroke="#fff" stroke-width="5"/>
    <path d="M44 150C120 140 150 104 240 92S330 52 356 40" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="${done ? "0" : "2 10"}"/>
    <circle cx="44" cy="150" r="8" fill="#000"/><circle cx="356" cy="40" r="13" fill="${done ? "#06C167" : "#000"}"/><circle cx="356" cy="40" r="5" fill="#fff"/>
    <text x="28" y="176" font-size="12" font-family="Inter" font-weight="600" fill="#000">Staples hub, 110077</text>
    <text x="232" y="22" font-size="12" font-family="Inter" font-weight="600" fill="#000">Flat 402, Rohini</text></svg></div>`;
  const title = done ? "Pahunch gaya" : d.waybill ? `${esc(d.expected ? whenLabel(d.expected) : "Kal subah 7:30")} tak` : "Abhi koi parcel nahi";
  return `${header("Raat ka saamaan")}
    <section class="sec">${map}
    <div class="sheet">
      <h2>${title}</h2>
      <p class="sub">${d.waybill ? `Delhivery, waybill ${esc(d.waybill)}` : "Dry saamaan vote ke baad book hota hai."}</p>
      ${d.waybill ? `<ol class="segs">${STAGES.map((st, i) => `<li class="${i <= idx ? (late ? "late" : "on") : ""}"><span>${esc(st)}</span></li>`).join("")}</ol>
      <p class="sub">${esc(STAGES[idx])}${d.seen_at ? `, Baari ne ${esc(hhmm(d.seen_at))} pe dekha` : ""}.${!late && !done ? " Sunita ji ke aane se pehle aa jayega." : ""}</p>` : ""}
      ${parcelItems.length ? `<p class="parcel"><span>Parcel mein</span>${esc(parcelItems.map(cap).join(", "))}</p>` : ""}
      ${late ? `<div class="banner"><b aria-hidden="true">!</b><span>Delhivery 7:30 ke baad pahunchega. Baari backup plan bana raha hai.</span></div>` : ""}
      ${pickup.length ? `<div class="banner green"><b aria-hidden="true">${ICON.bag}</b><span>Sunita ji 7:40 pe Sharma Kirana se le aayengi: ${esc(pickup.map((p) => cap(p.item || p)).join(", "))}. Paise Baari dega.</span></div>` : ""}
      ${hop ? riderCard(hop) : ""}
    </div></section>`;
}

// The kirana-to-flat rider hop (C10). rider is {name, phone_masked, vehicle}.
const HOP = {
  RIDER_ASSIGNED: ["Rider mil gaya, kirana ja raha hai", ""],
  PICKED_UP: ["Kirana se utha liya, raaste mein", ""],
  DELIVERED: ["Ghar pahunch gaya", ""],
  NO_RIDER_AVAILABLE: ["Rider nahi mila. Baari ne doosra raasta liya.", "bad"],
  SLOT_UNAVAILABLE: ["Slot khaali nahi tha. Baari ne doosra raasta liya.", "bad"],
  CANCELLED_BY_RIDER: ["Rider ne cancel kar diya. Baari ne doosra raasta liya.", "bad"],
};
function riderCard(hop) {
  const name = hop.rider && typeof hop.rider === "object" ? hop.rider.name : hop.rider;
  const [line, tone] = HOP[hop.status] || [cap(String(hop.status || "").toLowerCase().replace(/_/g, " ")), ""];
  const fee = hop.fee && hop.fee.fee;
  const when = hop.eta ? hhmm(hop.eta) : "";
  return `<div class="rider ${tone}">
    <span class="face"><b>${tone ? "!" : esc((name || "R")[0])}</b></span>
    <div class="rider-t"><b>${esc(name || "Kirana se ghar tak rider")}</b><p class="sub">${esc(line)}${when && !tone ? `, ${esc(when)} tak` : ""}</p>${fee ? `<p class="sub">Fee Rs ${esc(fee)}${hop.fee.fee_exceeds_item_value ? ", saamaan se mehenga" : ""}</p>` : ""}</div>
    ${hop.code ? `<span class="pin">Kirana code ${esc(hop.code)}</span>` : ""}
  </div>`;
}

// ---- Sunita

function sunita() {
  const b = state.brief || {};
  const label = { confirmed_with_counts: ["Counts mil gaye", ""], vague_yes: ['Sirf "haan", counts nahi', "haldi"], item_missing: ["Kuch khatam hai", "haldi"], refusal: ["Mana kar diya", "red"], unclear: ["Saaf nahi tha, Baari ne dobara poocha", "haldi"] };
  const x = b.reply_extract || {};
  const qty = Object.entries(x.quantities || {}).map(([k, v]) => `${k} ${v && typeof v === "object" ? v.value : v}`).join(", ");
  const l = qty ? [`Counts mil gaye: ${qty}`, ""] : label[b.reply_label || x.commitment] || null;
  const win = state.locked && state.locked.winner;
  const pickup = ((state.delivery && state.delivery.kirana_pickup) || []).map((p) => p.item || p);
  const audio = b.audio_url && !/dummy\.invalid/.test(b.audio_url) ? b.audio_url : null;
  return `${header("Sunita ji", "Roz subah 8:00 baje aati hain")}
    <section class="sec cook-day">
      ${win ? thali(win, "cook-img") : ""}
      <div class="job">
        <p><span>Kal banega</span><b>${esc(win || "Vote ke baad pata chalega")}</b>${win && dish(win).hi ? `<small lang="hi">${esc(dish(win).hi)}</small>` : ""}</p>
        <p><span>Kitne log</span><b>${esc((state.locked && state.locked.headcount) || 4)}</b></p>
        <p class="wide"><span>7:40 pe Sharma Kirana se</span><b>${pickup.length ? esc(pickup.map(cap).join(", ")) : "Kuch nahi laana"}</b>${pickup.length ? "<small>Dukaan ko paise Baari dega</small>" : ""}</p>
      </div>
    </section>
    <section class="sec"><div class="sec-h"><div><h2>Subah 7:45 ka brief</h2><p class="sub">Hindi voice note, Gnani ki awaaz mein</p></div></div>
    ${audio ? `<button class="player" data-play="${esc(audio)}" aria-label="Brief chalao"><span class="play">${ICON.play}</span><span class="wave" aria-hidden="true"></span><span>Brief suno</span></button>` : '<div class="panel empty"><b>Brief 7:45 pe banega</b>Baari Sunita ji ko Hindi mein voice note bhejega.</div>'}
    ${b.text ? `<p class="quote" lang="hi">${esc(b.text)}</p>` : ""}</section>
    <section class="sec"><div class="sec-h"><h2>Unka jawaab</h2></div>
    ${b.reply_text ? `<div class="reply"><p class="quote" lang="hi">${esc(b.reply_text)}</p>${l ? `<span class="tag ${l[1]}">Baari ne samjha: ${esc(l[0])}</span>` : ""}</div>` : '<div class="panel empty"><b>Abhi jawaab nahi aaya</b>8:05 tak nahi aaya to Baari ek baar phir bhejega.</div>'}
    </section>`;
}

// ---- Baari ne kyun kiya

// Rails summaries are short strings or raw JSON. Say what happened the way
// the family would.
function evText(ev) {
  const s = String(ev.summary || "");
  const val = (k) => { const m = s.match(new RegExp(`"?${k}"?:\\s*"?([^",}]+)`)); return m ? m[1].trim() : ""; };
  const to = val("to");
  const status = val("status") || val("code");
  const said = (s.match(/^text: (.+)/) || [])[1];
  switch (ev.tool) {
    case "tg.send": return ev.ok === false ? `${to || "Message"} nahi gaya` : `${to || "Family"} ko message gaya`;
    case "tg.voice": return ev.ok === false ? "Voice note nahi gaya" : `${to || "Sunita"} ko voice note gaya`;
    case "tg.updates": return said ? `Family ke naye messages padhe: "${said}"` : "Family ke naye messages padhe";
    case "pl.balance": case "fetch_sbmd_subscription": return ev.ok === false ? "Pine Labs block check nahi hua" : "Pine Labs block check kiya, chalu hai";
    case "pl.debit": case "pl.payee": {
      const who = ev.tool === "pl.payee" ? "Sharma Kirana ko " : "";
      if (ev.ok === false || /INSUFFICIENT|FAIL/i.test(status)) return `${who}payment nahi hua${/INSUFFICIENT/.test(status) ? ": block mein paise kam" : ""}`;
      return /SUCCESS/i.test(status) ? `${who}payment ho gaya` : `${who}payment bheja, bank ke confirm ka intezaar`;
    }
    case "speech_to_text": return ev.ok === false ? "Voice note samajh nahi aaya, Baari dobara poochega" : said ? `Suna: "${said}"` : "Voice note suna";
    case "text_to_speech": return ev.ok === false ? "Hindi voice note nahi bana" : "Hindi voice note banaya";
    case "pincode_serviceability": return "Delhivery Rohini tak jaata hai, check kiya";
    case "calculate_shipping_cost": return "Shipping ka kharcha nikala";
    case "create_shipment": return /success\\?"?:\s*fa|ClientWarehouse|"error":true/.test(s) ? "Delhivery booking nahi hui" : "Delhivery pe staples book kiye";
    case "track_shipment": return `Parcel track kiya${status ? `: ${status}` : ""}`;
    case "hyperlocal_create_order": return ev.ok === false ? "Rider nahi mila" : "Rider book kiya";
  }
  if (said) return said;
  return s.startsWith("{") ? `${ev.tool} chala` : s.slice(0, 120);
}
function evBad(ev) {
  return ev.ok === false || /booking nahi|nahi hua|nahi mila|nahi gaya|nahi bana|samajh nahi/.test(evText(ev));
}

function recent(n) {
  const dec = (state.decisions || []).slice(-n).reverse();
  if (!dec.length) return "";
  return `<section class="sec"><div class="sec-h"><h2>Baari ne kyun kiya</h2><a class="arrow" href="#/baari" aria-label="Sab decisions">${ICON.arrow}</a></div>
    <ol class="feed">${dec.map(decItem).join("")}</ol></section>`;
}

function decItem(d) {
  const s = `${d.rule} ${d.text}`;
  const tone = /fail|FAILED|INSUFFICIENT|nahi mila/i.test(s) ? "bad" : /nahi|late|retry|error|\bE\d|veto|\bV2|\bC4|\bM5/i.test(s) ? "warn" : "ok";
  const more = d.said_did || d.input;
  const head = `<span class="t">${esc(d.at || "")}${d.phase ? ` ${esc(d.phase)}` : ""}</span>${d.rule ? `<span class="rule">${esc(d.rule)}</span>` : ""}<p>${esc(d.text || d.decided || "")}</p>`;
  return `<li class="item ${tone}"><span class="dot" aria-hidden="true"></span><div>${more ? `<details><summary>${head}</summary><div class="more">${d.input ? `<p>Aaya: ${esc(d.input)}</p>` : ""}${d.said_did ? `<p>Kiya: ${esc(d.said_did)}</p>` : ""}${d.via ? `<p>Via: ${esc(d.via)}</p>` : ""}</div></details>` : head}</div></li>`;
}

function baari() {
  const dec = (state.decisions || []).slice().reverse();
  const evs = events.slice(-30).reverse();
  return `${header("Baari ne kyun kiya", "Har faisla, uske rule ke saath")}
    <section class="sec">${dec.length ? `<ol class="feed">${dec.map(decItem).join("")}</ol>` : '<div class="panel empty"><b>Aaj ka pehla run abhi baaki hai</b>Shortlist 8:30 pe aati hai, vote 9:30 pe band.</div>'}</section>
    <section class="sec"><div class="sec-h"><div><h2>Har call, live</h2><p class="sub">Telegram, Gnani, Pine Labs aur Delhivery pe Baari ne kya kiya</p></div></div>
    ${evs.length ? `<ul class="calls">${evs.map((ev) => `<li class="${evBad(ev) ? "bad" : ""}"><span class="call-ic" title="${esc(RAIL_NAME[ev.rail] || ev.rail)}">${RAIL_ICON[ev.rail] || ICON.pot}</span><p>${esc(cap(evText(ev)))}<span>${esc(RAIL_NAME[ev.rail] || ev.rail)}, ${esc(hhmm(ev.at_ist))}</span></p></li>`).join("")}</ul>` : '<div class="panel empty"><b>Abhi koi call nahi</b>Run shuru hote hi yahan dikhega.</div>'}</section>`;
}

const ROUTES = { "": ghar, khata, delivery, sunita, baari };
function render() {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0];
  const view = ROUTES[route] || ghar;
  document.querySelectorAll(".nav a").forEach((a) => {
    const on = (a.dataset.tab === "ghar" && !route) || a.dataset.tab === route;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const app = $("#app");
  if (!state && failed) {
    app.innerHTML = `<div class="panel empty offline"><b>Baari tak nahi pahunch paaye</b>Net check kijiye. Har 5 second mein phir koshish ho rahi hai.</div>`;
    render.last = null;
    return;
  }
  if (!state) {
    app.innerHTML = `<div class="skel" aria-label="Baari khul raha hai"><i style="width:40%;height:34px"></i><i style="width:64%;height:24px"></i><i style="height:300px;border-radius:28px"></i><i style="height:96px"></i><i style="height:96px"></i></div>`;
    return;
  }
  // The poll runs every 5 s: redraw only when something changed, and let the
  // thali land once per screen, not on every redraw.
  const html = view();
  if (html === render.last && route === render.route) return;
  app.classList.toggle("settled", route === render.route);
  render.last = html;
  render.route = route;
  const open = [...app.querySelectorAll("details[open] p")].map((p) => p.textContent);
  app.innerHTML = html;
  app.querySelectorAll("details").forEach((d) => {
    const p = d.querySelector("summary p");
    if (p && open.includes(p.textContent)) d.open = true;
  });
}

let audio;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-play]");
  if (!b) return;
  if (audio && !audio.paused) { audio.pause(); b.classList.remove("playing"); return; }
  audio = new Audio(b.dataset.play);
  b.classList.add("playing");
  audio.addEventListener("ended", () => b.classList.remove("playing"));
  audio.play().catch(() => b.classList.remove("playing"));
});
addEventListener("hashchange", () => {
  render();
  scrollTo(0, 0);
});

render();
load();
setInterval(() => {
  if (document.visibilityState === "visible") load();
}, 5000);
if ("serviceWorker" in navigator && !FIXTURE) navigator.serviceWorker.register("/sw.js").catch(() => {});
