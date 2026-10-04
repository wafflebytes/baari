// Thali receipt (/receipt/<date>): the closing shot (PRD 17 item 5, DESIGN 7).
// Built only from /app/state: the locked dish, where each missing item came
// from, and every Pine Labs debit with its UPI note. "Save image" draws the
// card to a PNG in the browser with html2canvas.
//
// /receipt/2026-10-05 reaches this page through functions/receipt/[date].js.
// Locally use /receipt/?date=2026-10-05, and ?fixture=lock for the fixture.
const RAILS = "https://baari-rails.vercel.app";
const onPages = location.hostname.endsWith("pages.dev") || location.hostname.startsWith("baari");
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
const ASKED = (location.pathname.match(/\/receipt\/(\d{4}-\d{2}-\d{2})/) || [])[1] || (qs.get("date") || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || "";
const H2C = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

const DISHES = {
  "Rajma chawal": { file: "rajma", hi: "राजमा चावल", bg: "linear-gradient(135deg,#7A2E1B,#B5532E)" },
  "Lauki chana dal": { file: "lauki-chana-dal", hi: "लौकी चना दाल", bg: "linear-gradient(135deg,#5B7A2A,#97B04A)" },
  "Palak paneer roti": { file: "palak-paneer", hi: "पालक पनीर रोटी", bg: "linear-gradient(135deg,#1F5E3A,#3E8F5C)" },
  "Kadhi chawal": { file: "kadhi", hi: "कढ़ी चावल", bg: "linear-gradient(135deg,#B88A10,#E2B33C)" },
  "Aloo puri": { file: "aloo-puri", hi: "आलू पूरी", bg: "linear-gradient(135deg,#A8641A,#D99642)" },
  "Egg bhurji paratha": { file: "egg-bhurji", hi: "अंडा भुर्जी पराठा", bg: "linear-gradient(135deg,#9C7A12,#D4B23E)" },
};
const PEOPLE = ["Vinay", "Mummy", "Papa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dishOf = (name) => DISHES[name] || { file: slug(name), hi: "", bg: "linear-gradient(135deg,#333,#666)" };
// Indian grouping, rupees from paise: 10626 -> "Rs 106.26", 40000 -> "Rs 400"
function rs(paise) {
  const p = Math.round(paise || 0);
  const whole = Math.floor(p / 100).toLocaleString("en-IN");
  return p % 100 ? `Rs ${whole}.${String(p % 100).padStart(2, "0")}` : `Rs ${whole}`;
}
const cap = (t) => String(t || "").charAt(0).toUpperCase() + String(t || "").slice(1);

let state = null;
let source = "live";

async function getJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
// The Pages proxy first, then rails directly (CORS open), then the fixture.
async function load() {
  const tries = FIXTURE ? [[`/fixtures/${FIXTURE}.json`, "fixture"]] : [[onPages ? "/api/state" : `${RAILS}/app/state`, "live"], [onPages ? `${RAILS}/app/state` : "/api/state", "live"], ["/fixtures/lock.json", "fixture"]];
  for (const [url, src] of tries) {
    try {
      state = await getJson(url);
      source = src;
      break;
    } catch {
      /* next */
    }
  }
  render();
}

// Which day is this receipt for: the one asked for, else date_for from the
// HANDOFF, else the day on the debit refs (BAARI-2026-10-05-staples), else
// the day after the run's now.
function dayOf(s) {
  if (ASKED) return ASKED;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.date_for || "")) return s.date_for;
  for (const d of (s.khata && s.khata.debits) || []) {
    const m = String(d.ref || "").match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const now = Date.parse(String(s.now_ist || "").replace(" ", "T") + "+05:30") || Date.now();
  return new Date(now + 5.5 * 3600e3 + 864e5).toISOString().slice(0, 10);
}
function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[wd]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

// Votes never say who chose what. The decisions do say whose vote moved
// where (V2) or who asked for the dish, so take the name from there.
function whosePick(s, winner) {
  const lc = winner.toLowerCase();
  for (const d of s.decisions || []) {
    const t = String(d.text || "");
    if (!t.toLowerCase().includes(lc)) continue;
    const who = PEOPLE.find((p) => new RegExp(`\\b${p}\\b`).test(t));
    if (who) return { who, why: t, rule: d.rule };
  }
  return null;
}

function debitsFor(s, day) {
  return ((s.khata && s.khata.debits) || []).filter((d) => String(d.ref || "").includes(day) || String(d.at || "").startsWith(day));
}

const ROUTES = {
  delhivery: { ic: "DL", name: "Delhivery staples hub", sub: (s) => { const d = s.delivery || {}; return d.waybill ? `Raat ko bheja, waybill ${d.waybill}${d.status ? ` · ${d.status}` : ""}` : "Raat ko bheja, subah tak"; } },
  kirana: { ic: "SK", name: "Sharma Kirana pickup", sub: () => "Sunita 7:40 pe raaste mein le aayengi" },
  hop: { ic: "RD", name: "Rider se", sub: (s) => { const h = (s.delivery && s.delivery.hop) || {}; return h.rider ? `${h.rider}${h.eta ? `, ${h.eta}` : ""}` : "Kirana se ghar tak"; } },
};

function sources(s) {
  const groups = {};
  for (const m of s.missing || []) {
    const r = String(m.route || "pantry").toLowerCase();
    (groups[r] = groups[r] || []).push(m.item || m);
  }
  const rows = Object.entries(groups).map(([r, items]) => {
    const def = ROUTES[r] || { ic: r.slice(0, 2).toUpperCase(), name: cap(r), sub: () => "" };
    return `<div class="src-row"><span class="ic">${esc(def.ic)}</span><div><b>${esc(def.name)}</b><span>${esc(items.join(", "))}</span>${def.sub(s) ? `<span>${esc(def.sub(s))}</span>` : ""}</div></div>`;
  });
  rows.push(`<div class="src-row"><span class="ic">GH</span><div><b>Ghar ki pantry</b><span>${rows.length ? "Baaki sab pehle se ghar mein tha" : "Sab kuch ghar mein tha, kuch mangana nahi pada"}</span></div></div>`);
  return rows.join("");
}

function statusTag(st) {
  if (st === "SUCCESS") return '<span class="tag">Paid</span>';
  if (st === "FAILED") return '<span class="tag red">Failed</span>';
  return '<span class="tag grey">Pending</span>';
}

function render() {
  const box = $("#receipt");
  if (!state) {
    box.innerHTML = `<p class="empty">Data nahi mila. Thodi der mein phir try karo.</p>`;
    return;
  }
  const s = state;
  const day = dayOf(s);
  const flat = (s.household && s.household.flat) || "402";
  const family = (s.household && s.household.name) || "Sharma";
  const winner = s.locked && s.locked.winner;
  const runner = s.locked && s.locked.runner_up;
  const k = s.khata || {};
  const capToday = k.cap_today || 40000;
  const debits = debitsFor(s, day);
  const total = debits.filter((d) => d.status !== "FAILED").reduce((a, d) => a + (d.amount || 0), 0);
  const pct = Math.min(100, Math.round((total / capToday) * 100));
  const pick = winner ? whosePick(s, winner) : null;
  const voted = (s.votes && s.votes.voted) || [];

  $("#src").textContent = source === "fixture" ? "Fixture data" : "Live data";
  document.title = `Baari receipt, ${day}`;

  const dishBlock = winner
    ? `<div class="dish"><div class="ph" style="background:${dishOf(winner).bg}"><img src="/img/dishes/${dishOf(winner).file}.png" alt="" onerror="this.remove()"></div>
        <div><h2>${esc(winner)}</h2><span class="hi" lang="hi">${esc(s.locked.winner_hindi || dishOf(winner).hi)}</span>
        <span class="tag">${pick ? `${esc(pick.who)} ki pasand jeeti` : "Ghar ki pasand jeeti"}</span>
        <div class="sub" style="margin-top:4px">${voted.length} of ${PEOPLE.length} ne vote kiya · ${esc(s.locked.headcount || 4)} log${runner ? ` · runner-up ${esc(runner)}` : ""}</div></div></div>`
    : `<div class="dish"><div><h2>Abhi lock nahi hua</h2><div class="sub">Vote ${esc((s.votes && s.votes.closes_at) || "21:30")} pe band hoga, phir receipt banegi.</div></div></div>`;

  const lines = debits.length
    ? debits.map((d) => {
        const note = d.note || `Baari · Flat ${flat} · ${d.to || "Staples hub"}`;
        return `<div class="line"><b>${esc(d.to || "Baari staples hub")}</b><span class="amt">${rs(d.amount)}</span><span class="note">UPI note: ${esc(note)}</span><span class="note">Ref ${esc(d.ref || "")}</span><span class="st">${statusTag(d.status)}</span></div>`;
      }).join("")
    : `<p class="empty" style="margin:0">Is din koi payment nahi hua.</p>`;

  box.innerHTML = `
    <div class="head"><span class="logo"></span><b>Baari</b><span class="who">${esc(family)} parivar<br>Flat ${esc(flat)}</span></div>
    <h1 class="title">Aaj ki thali</h1>
    <p class="sub">${esc(dayLabel(day))}</p>
    ${dishBlock}
    ${pick ? `<p class="sub" style="margin:12px 0 0">${esc(pick.why)}${pick.rule ? ` <span class="tag grey" style="margin:0">${esc(pick.rule)}</span>` : ""}</p>` : ""}
    <hr class="tear">
    <h3>Kahan se aaya</h3>
    ${winner ? sources(s) : `<p class="empty" style="margin:0">Dish lock hone ke baad pata chalega.</p>`}
    <hr class="tear">
    <h3>Har rupaya</h3>
    ${lines}
    <hr class="tear">
    <div class="total"><b>Total</b><span class="amt">${rs(total)}</span></div>
    <div class="meter"><i class="${pct >= 80 ? "warn" : ""}" style="width:${pct}%"></i></div>
    <div class="sub">${rs(capToday)} roz ki limit mein se ${rs(Math.max(0, capToday - total))} bache. Pine Labs UPI Reserve Pay block se.</div>
    <hr class="tear">
    <p class="closing">Aaj kya banega? Kisi ko poochna nahi pada.</p>
    <div class="foot">baari.pages.dev/receipt/${esc(day)}</div>`;
  $("#save").disabled = false;
}

function loadScript(src) {
  return new Promise((ok, fail) => {
    if (window.html2canvas) return ok();
    const el = document.createElement("script");
    el.src = src;
    el.onload = ok;
    el.onerror = () => fail(new Error("html2canvas load failed"));
    document.head.appendChild(el);
  });
}

$("#save").addEventListener("click", async () => {
  const btn = $("#save");
  const hint = $("#hint");
  btn.disabled = true;
  hint.textContent = "Image ban rahi hai";
  try {
    await loadScript(H2C);
    await document.fonts.ready;
    const canvas = await window.html2canvas($("#receipt"), { backgroundColor: "#F3F3F3", scale: 2, useCORS: true, logging: false });
    const a = document.createElement("a");
    a.download = `baari-receipt-${dayOf(state)}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    hint.textContent = "Save ho gayi";
  } catch (err) {
    console.warn(err);
    hint.textContent = "Image nahi bani. Screenshot le lo.";
  }
  btn.disabled = false;
});

load();
