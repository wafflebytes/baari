// Baari household app. A window onto what the agent did: every number comes
// from GET /app/state (rails, PRD 11.3), the activity from /app/events. No
// state of its own, no decisions. Votes deep-link into the Telegram bot.
const RAILS = "https://baari-rails.vercel.app";
const onPages = /pages\.dev$|baari\./.test(location.hostname);
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
const BOT = "Baari_ken_bot";

const DISHES = {
  "Rajma chawal": { hi: "राजमा चावल", mins: 50, bg: "linear-gradient(135deg,#7A2E1B,#B5532E)", tint: "#F7E6DF" },
  "Lauki chana dal": { hi: "लौकी चना दाल", mins: 35, bg: "linear-gradient(135deg,#5B7A2A,#97B04A)", tint: "#EEF3E1" },
  "Palak paneer roti": { hi: "पालक पनीर रोटी", mins: 40, bg: "linear-gradient(135deg,#1F5E3A,#3E8F5C)", tint: "#E3F0E7" },
  "Kadhi chawal": { hi: "कढ़ी चावल", mins: 45, bg: "linear-gradient(135deg,#B88A10,#E2B33C)", tint: "#FBF1D6" },
  "Aloo puri": { hi: "आलू पूरी", mins: 40, bg: "linear-gradient(135deg,#A8641A,#D99642)", tint: "#F9EBD9" },
  "Egg bhurji paratha": { hi: "अंडा भुर्जी पराठा", mins: 30, bg: "linear-gradient(135deg,#9C7A12,#D4B23E)", tint: "#F8F0D4" },
};
const PEOPLE = ["Vinay", "Mummy", "Papa"];
const RAIL = { telegram: "TG", gnani: "GN", pinelabs: "PL", delhivery: "DL", bridge: "TG", kb: "KB" };

let state = null;
let events = [];
let lastOk = 0;
let lastEvent = 0;

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
const dish = (name) => DISHES[name] || { hi: "", mins: 40, bg: "linear-gradient(135deg,#333,#666)", tint: "#F1F1F1" };
// 3D dish render in /img/dishes/<slug>.png (design/dish-photos.md). Until a
// file exists the img removes itself and the gradient card shows.
const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dishImg = (name) => `<img class="dimg" src="/img/dishes/${slug(name)}.png" alt="" loading="lazy" decoding="async" onerror="this.remove()">`;
const phStyle = (name) => `background:${dish(name).bg};--tint:${dish(name).tint}`;

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
      for (const ev of e.events || []) if (!events.some((x) => x.id === ev.id)) events.push(ev);
      events.sort((a, b) => a.id - b.id);
      if (events.length) lastEvent = events[events.length - 1].id;
      events = events.slice(-200);
    }
    lastOk = Date.now();
  } catch (err) {
    console.warn("state fetch failed", err);
  }
  render();
}

function header(title, sub) {
  const stale = Date.now() - lastOk > 15000;
  const asks = state && state.open_asks && state.open_asks.length;
  return `<header class="top">
    <h1>${esc(title)} ${sub ? `<small>${esc(sub)}</small>` : ""}</h1>
    <span class="bell" aria-label="${asks ? "Ek sawaal pending" : "Koi naya update nahi"}"><svg viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>${asks ? '<i class="dot"></i>' : ""}</span>
  </header>
  <div><span class="duty">Aaj kiski baari? ${esc((state && state.household && state.household.duty_holder) || "Vinay")} ki</span><span class="live ${stale ? "stale" : ""}"><i></i>${stale ? "Purana data" : "Live"}</span></div>`;
}

function ghar() {
  const s = state;
  const list = s.shortlist && s.shortlist.length ? s.shortlist : [];
  const locked = s.locked && s.locked.winner;
  const votes = s.votes || { voted: [], pending: PEOPLE };
  const missing = s.missing || [];
  let cards;
  if (locked) {
    const w = dish(s.locked.winner);
    const ru = s.locked.runner_up;
    cards = `<div class="cards">
      <a class="dish" href="#/baari"><div class="ph" style="${phStyle(s.locked.winner)}"><span class="thali"></span>${dishImg(s.locked.winner)}<span class="tag black">Locked</span><span class="big">${esc(s.locked.winner)}</span></div>
        <h3>${esc(s.locked.winner)} <span class="hi" lang="hi">${esc(w.hi)}</span></h3>
        <div class="meta">${w.mins} min · ${s.locked.headcount || 4} log${missing.length ? ` · laana hai: ${esc(missing.map((m) => m.item || m).join(", "))}` : ""}</div></a>
      ${ru ? `<div class="dish lost"><div class="ph" style="${phStyle(ru)}">${dishImg(ru)}<span class="tag grey">Runner-up</span><span class="big">${esc(ru)}</span></div><h3>${esc(ru)} <span class="hi" lang="hi">${esc(dish(ru).hi)}</span></h3><div class="meta">Agli baar pakka</div></div>` : ""}
    </div>`;
  } else if (list.length) {
    cards = `<div class="cards">${list
      .map((d, i) => {
        const name = d.dish || d;
        const m = dish(name);
        return `<div class="dish"><div class="ph" style="${phStyle(name)}"><span class="thali"></span>${dishImg(name)}<span class="tag">${i === 0 ? "Ghar mein zyada hai" : "Iski baari hai"}</span><span class="big">${esc(name)}</span></div>
          <h3>${esc(name)} <span class="hi" lang="hi">${esc(d.hindi || m.hi)}</span></h3>
          <div class="meta">${m.mins} min · 4 log${d.missing && d.missing.length ? ` · laana: ${esc(d.missing.join(", "))}` : ""}</div>
          <a class="btn small" style="margin-top:10px" href="https://t.me/${BOT}?start=vote_${i + 1}">Vote on Telegram</a></div>`;
      })
      .join("")}</div>`;
  } else {
    cards = `<div class="panel empty"><b>Shortlist 8:30 pe aayegi</b>Baari raat ko do dish bhejega, sabko Telegram pe.</div>`;
  }
  const voted = votes.voted || [];
  const faces = PEOPLE.map((p) => `<span class="face ${voted.includes(p) ? "v" : ""}" title="${p}">${p[0]}</span>`).join("");
  return `${header("Ghar", `Flat ${esc((s.household && s.household.flat) || "402")}`)}
    <div class="chips"><a class="chip on" href="#/">Kal ka khana</a><a class="chip" href="#/khata">Khata</a><a class="chip" href="#/delivery">Saamaan</a><a class="chip" href="#/sunita">Sunita</a></div>
    <section class="sec"><div class="sec-h"><div><h2>${locked ? `Kal: ${esc(s.locked.winner)}` : "Kal ka khana"}</h2><p class="sub">${locked ? "Vote ho gaya, saamaan ka intezaam chal raha hai" : `Vote band ${esc(votes.closes_at || "21:30")} pe`}</p></div><a class="arrow" href="#/baari" aria-label="Baari ne kyun kiya">→</a></div>
    ${cards}
    <div class="voters"><div><div class="count">${voted.length} of ${PEOPLE.length} ne vote kiya</div><div class="sub">Kisne kya chuna, sirf Vinay ko dikhta hai</div></div><div class="faces">${faces}</div></div></section>
    ${moneyStrip(s)}
    ${recent(4)}`;
}

function moneyStrip(s) {
  const k = s.khata || {};
  const cap = k.cap_today || 40000;
  const pct = Math.min(100, Math.round(((k.spent_today || 0) / cap) * 100));
  return `<section class="sec"><div class="sec-h"><h2>Aaj ka kharcha</h2><a class="arrow" href="#/khata" aria-label="Khata">→</a></div>
    <div class="panel"><div class="row" style="border:0;padding:0"><div class="l"><b>${rs(k.spent_today)} of ${rs(cap)}</b><span>roz ki limit, Baari isse upar nahi jaata</span></div><div class="r amt">${rs(cap - (k.spent_today || 0))} bache</div></div>
    <div class="meter"><i class="${pct >= 80 ? "warn" : ""}" style="width:${pct}%"></i></div></div></section>`;
}

function khata() {
  const k = state.khata || {};
  const used = k.used || 0;
  const total = k.block_total || 500000;
  const cap = k.cap_today || 40000;
  const pct = Math.min(100, Math.round(((k.spent_today || 0) / cap) * 100));
  const debits = (k.debits || []).slice().reverse();
  const chip = (st) => (st === "SUCCESS" ? '<span class="tag">Paid</span>' : st === "FAILED" ? '<span class="tag red">Failed</span>' : `<span class="tag grey">${esc(st === "PENDING" ? "Pending" : st || "Pending")}</span>`);
  return `${header("Khata")}
    <section class="sec"><div class="block">
      <div class="k"><span>UPI Reserve Pay block</span><span class="bank">ICICI</span></div>
      <div class="v">${rs(k.left ?? total - used)}</div>
      <div class="k"><span>bacha hai, ${rs(total)} mein se · Vinay ne approve kiya</span></div>
      <div class="bar"><i style="width:${Math.round((used / total) * 100)}%"></i></div>
    </div></section>
    <section class="sec"><div class="panel">
      <div class="row" style="border:0;padding:0"><div class="l"><b>Aaj ki limit</b><span>Rs 400 roz, saare payments milake</span></div><div class="r amt">${rs(k.spent_today)} / ${rs(cap)}</div></div>
      <div class="meter"><i class="${pct >= 80 ? "warn" : ""}" style="width:${pct}%"></i></div>
      <div class="sub">Rs 300 se upar ka koi bhi payment Vinay ke "Haan" ke bina nahi hota.</div>
    </div></section>
    <section class="sec"><div class="sec-h"><h2>Aaj ke payments</h2></div>
      <div class="panel">${debits.length ? debits.map((d) => `<div class="row"><div class="l"><b>${esc(d.to || "Baari staples hub")}</b><span>${esc(d.ref || "")}</span></div><div class="r"><div class="amt">${rs(d.amount)}</div>${chip(d.status)}</div></div>`).join("") : '<div class="empty" style="padding:16px"><b>Abhi tak kuch nahi</b>Pehla payment vote ke baad hoga.</div>'}</div></section>
    <section class="sec"><div class="sec-h"><h2>Approved shops</h2></div>
      <div class="panel"><div class="row" style="border:0;padding:0"><div class="l"><b>Sharma Kirana</b><span>sharmakirana@okaxis · Sunita ke raaste mein, 2 min</span></div><div class="r"><span class="tag">Approved</span></div></div></div></section>
    <p class="note">Baari naye shop add nahi kar sakta, na limit badha sakta hai. Sirf Vinay profile mein kar sakte hain.</p>`;
}

const STAGES = ["Manifested", "Picked up", "In transit", "Out for delivery", "Delivered"];
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
  const late = d.expected && hhmm(d.expected) > "07:30" && idx < 4;
  const hop = d.hop;
  const pickup = d.kirana_pickup || [];
  const map = `<div class="map"><svg viewBox="0 0 400 200" aria-hidden="true">
    <path d="M0 60H400M0 140H400M90 0V200M230 0V200M330 0V200" stroke="#fff" stroke-width="10"/>
    <path d="M40 170 C120 150 160 90 230 80 S330 40 360 30" stroke="#000" stroke-width="4" fill="none" stroke-dasharray="${idx >= 4 ? "0" : "8 8"}"/>
    <circle cx="40" cy="170" r="9" fill="#000"/><circle cx="360" cy="30" r="11" fill="${idx >= 4 ? "#06C167" : "#000"}"/>
    <text x="54" y="186" font-size="12" font-family="Inter" fill="#5E5E5E">Staples hub, 110077</text>
    <text x="268" y="58" font-size="12" font-family="Inter" fill="#5E5E5E">Flat 402, Rohini</text></svg></div>`;
  return `${header("Raat ka saamaan")}
    <section class="sec">${map}
    <div class="sheet">
      <h2>${idx >= 4 ? "Pahunch gaya" : d.waybill ? `Kal subah ${esc(hhmm(d.expected) || "7:30")} tak` : "Abhi koi shipment nahi"}</h2>
      <div class="sub">${d.waybill ? `Delhivery · waybill ${esc(d.waybill)} · ${esc(d.status || "")}` : "Dry staples vote ke baad book honge"}</div>
      <div class="segs">${STAGES.map((_, i) => `<i class="${i <= idx && d.waybill ? (late ? "late" : "on") : ""}"></i>`).join("")}</div>
      <div class="sub">${STAGES[idx]}${d.seen_at ? ` · last check ${esc(hhmm(d.seen_at))}` : ""}</div>
      ${late ? `<div class="banner"><b>!</b><span>Delhivery 7:30 ke baad pahunchega. Baari backup plan kar raha hai.</span></div>` : ""}
      ${pickup.length ? `<div class="banner green"><b>✓</b><span>Sunita 7:40 pe Sharma Kirana se le aayengi: ${esc(pickup.map((p) => p.item || p).join(", "))}</span></div>` : ""}
      ${hop ? `<div class="rider"><span class="face">${esc((hop.rider || "R")[0])}</span><div style="flex:1"><b>${esc(hop.rider || "Rider")}</b><div class="sub">${esc(hop.status || "")}${hop.deliver_by ? ` · ${esc(hhmm(hop.deliver_by))} tak` : ""}</div></div>${hop.code ? `<span class="pin">Kirana code ${esc(hop.code)}</span>` : ""}</div>` : ""}
    </div></section>`;
}

function sunita() {
  const b = state.brief || {};
  const label = { confirmed_with_counts: ["Counts mil gaye", ""], vague_yes: ['Sirf "haan"', "haldi"], item_missing: ["Item missing", "haldi"], refusal: ["Mana kar diya", "red"], unclear: ["Samajh nahi aaya", "haldi"] };
  const l = label[b.reply_label] || null;
  return `${header("Sunita ka brief")}
    <section class="sec"><div class="cookart"><svg width="90" height="110" viewBox="0 0 90 110" aria-hidden="true"><circle cx="45" cy="22" r="16" fill="#000"/><path d="M20 108V58a25 25 0 0 1 50 0v50z" fill="#000"/><path d="M62 70h20v26H62z" fill="#F2B705"/><path d="M66 70v-6a6 6 0 0 1 12 0v6" stroke="#000" stroke-width="3" fill="none"/></svg></div></section>
    <section class="sec"><div class="sec-h"><div><h2>Subah 7:45 ka voice note</h2><p class="sub">Gnani ki awaaz mein, Hindi mein</p></div></div>
    ${b.audio_url ? `<div class="player"><button aria-label="Play brief" data-play="${esc(b.audio_url)}">▶</button><span class="wave"></span><span class="sub">Brief</span></div>` : '<div class="panel empty"><b>Brief 7:45 pe banega</b>Baari Sunita ko Hindi mein voice note bhejega.</div>'}
    ${b.text ? `<p class="quote hi" lang="hi">${esc(b.text)}</p>` : ""}</section>
    <section class="sec"><div class="sec-h"><h2>Sunita ka jawaab</h2></div>
    ${b.reply_text ? `<div class="panel"><p class="quote hi" lang="hi" style="margin:0">${esc(b.reply_text)}</p>${l ? `<div style="margin-top:10px"><span class="tag ${l[1]}">Baari ne samjha: ${esc(l[0])}</span></div>` : ""}</div>` : '<div class="panel empty" style="padding:20px"><b>Abhi jawaab nahi aaya</b>8:05 tak nahi aaya to Baari ek baar phir bhejega.</div>'}
    ${b.audio_url ? `<button class="btn" style="margin-top:14px" data-play="${esc(b.audio_url)}">Play brief</button>` : ""}</section>`;
}

// Rails summaries are short strings, or raw JSON for Telegram sends.
function evText(ev) {
  const s = String(ev.summary || "");
  if (!s.startsWith("{")) return s;
  try {
    const j = JSON.parse(s);
    if (j.to && j.ok) return `${j.to} ko ${ev.tool === "tg.voice" ? "voice note" : "message"} gaya`;
    if (j.ok === false) return `Nahi gaya: ${j.error || ""}`;
  } catch {}
  const to = s.match(/"to":"(\w+)"/);
  return to ? `${to[1]} ko ${ev.tool === "tg.voice" ? "voice note" : "message"} gaya` : s.slice(0, 120);
}

function evIcon(ev) {
  return RAIL[ev.rail] || String(ev.rail || "").slice(0, 2).toUpperCase();
}

function recent(n) {
  const dec = (state.decisions || []).slice(-n).reverse();
  if (!dec.length) return "";
  return `<section class="sec"><div class="sec-h"><h2>Baari ne kyun kiya</h2><a class="arrow" href="#/baari" aria-label="Sab decisions">→</a></div>
    <div class="feed">${dec.map(decItem).join("")}</div></section>`;
}

function decItem(d) {
  const bad = /fail|nahi|late|retry|error|E\d/i.test(`${d.rule} ${d.text}`);
  return `<div class="item ${bad ? "warn" : "ok"}"><span class="ic">${esc(d.id || "D")}</span><div><details><summary><div class="t">${esc(d.at || "")}${d.rule ? ` <span class="rule">${esc(d.rule)}</span>` : ""}</div><p>${esc(d.text || d.decided || "")}</p></summary>
    ${d.said_did || d.input ? `<div class="more">${d.input ? `Aaya: ${esc(d.input)}<br>` : ""}${d.said_did ? `Kiya: ${esc(d.said_did)}` : ""}${d.via ? `<br>Via: ${esc(d.via)}` : ""}</div>` : ""}</details></div></div>`;
}

function baari() {
  const dec = (state.decisions || []).slice().reverse();
  const evs = events.slice(-30).reverse();
  return `${header("Baari ne kyun kiya")}
    <p class="sub" style="margin-top:12px">Har decision ke saath rule ka number. Tap karke dekho kya aaya, kya kiya.</p>
    <section class="sec">${dec.length ? `<div class="feed">${dec.map(decItem).join("")}</div>` : '<div class="panel empty"><b>Aaj ka pehla run abhi baaki hai</b>Shortlist 8:30 pe, vote 9:30 pe band.</div>'}</section>
    <section class="sec"><div class="sec-h"><div><h2>Tools pe kya hua</h2><p class="sub">Telegram, Gnani, Pine Labs, Delhivery: har call live</p></div></div>
    ${evs.length ? `<div class="feed">${evs.map((ev) => `<div class="item ${ev.ok === false ? "bad" : "ok"}"><span class="ic">${esc(evIcon(ev))}</span><div><div class="t">${esc(hhmm(ev.at_ist))} · ${esc(ev.tool)}</div><p>${esc(evText(ev))}</p></div></div>`).join("")}</div>` : '<div class="panel empty" style="padding:20px">Abhi koi call nahi.</div>'}</section>`;
}

const ROUTES = { "": ghar, khata, delivery, sunita, baari };
function render() {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0];
  const view = ROUTES[route] || ghar;
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", (a.dataset.tab === "ghar" && !route) || a.dataset.tab === route));
  const app = $("#app");
  if (!state) {
    app.innerHTML = `${'<div class="empty" style="padding-top:120px"><b>Baari khul raha hai…</b></div>'}`;
    return;
  }
  const open = [...app.querySelectorAll("details[open]")].map((d) => d.querySelector("p") && d.querySelector("p").textContent);
  app.innerHTML = view();
  app.querySelectorAll("details").forEach((d) => {
    if (open.includes(d.querySelector("p") && d.querySelector("p").textContent)) d.open = true;
  });
}

let audio;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-play]");
  if (!b) return;
  if (audio && !audio.paused) return audio.pause();
  audio = new Audio(b.dataset.play);
  audio.play().catch(() => {});
});
addEventListener("hashchange", () => {
  render();
  scrollTo(0, 0);
});

load();
setInterval(() => {
  if (document.visibilityState === "visible") load();
}, 5000);
if ("serviceWorker" in navigator && !FIXTURE) navigator.serviceWorker.register("/sw.js").catch(() => {});
