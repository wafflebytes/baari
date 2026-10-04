// Baari TV (/tv): the 9pm living-room vote screen (PRD 17 item 3, DESIGN 7).
// Reads /app/state only. Shows who has voted, never what they chose. The
// 60 second ring is for the room; the real vote closes on rails.
//
// Keys: space restarts the ring, F goes full screen. ?fixture=lock loads the
// fixture, ?t=90 changes the ring length.
const RAILS = "https://baari-rails.vercel.app";
const onPages = location.hostname.endsWith("pages.dev") || location.hostname.startsWith("baari");
const qs = new URLSearchParams(location.search);
const FIXTURE = qs.get("fixture");
const RING_S = Number(qs.get("t")) || 60;
const CIRC = 2 * Math.PI * 96;

const DISHES = {
  "Rajma chawal": { file: "rajma", hi: "राजमा चावल", bg: "linear-gradient(135deg,#7A2E1B,#B5532E)" },
  "Lauki chana dal": { file: "lauki-chana-dal", hi: "लौकी चना दाल", bg: "linear-gradient(135deg,#5B7A2A,#97B04A)" },
  "Palak paneer roti": { file: "palak-paneer", hi: "पालक पनीर रोटी", bg: "linear-gradient(135deg,#1F5E3A,#3E8F5C)" },
  "Kadhi chawal": { file: "kadhi", hi: "कढ़ी चावल", bg: "linear-gradient(135deg,#B88A10,#E2B33C)" },
  "Aloo puri": { file: "aloo-puri", hi: "आलू पूरी", bg: "linear-gradient(135deg,#A8641A,#D99642)" },
  "Egg bhurji paratha": { file: "egg-bhurji", hi: "अंडा भुर्जी पराठा", bg: "linear-gradient(135deg,#9C7A12,#D4B23E)" },
};
// Sunita cooks; she doesn't vote, but she's part of the room.
const PEOPLE = [
  { name: "Vinay", role: "Aaj ki baari" },
  { name: "Mummy", role: "" },
  { name: "Papa", role: "" },
  { name: "Sunita", role: "Khana banayengi", cook: true },
];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dishOf = (name) => DISHES[name] || { file: slug(name), hi: "", bg: "linear-gradient(135deg,#2A2A2A,#555)" };

let state = null;
let source = "live";
let lastOk = 0;
let ringStart = 0;
let seenVoted = new Set();
let firstRender = true;
let lastKey = "";

function fit() {
  document.documentElement.style.setProperty("--fit", Math.min(innerWidth / 1920, innerHeight / 1080));
}
addEventListener("resize", fit);
fit();

// The Pages proxy first, then rails directly (CORS open), then the fixture,
// so the screen still renders on a local static server.
async function getJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
async function load() {
  const tries = FIXTURE ? [[`/fixtures/${FIXTURE}.json`, "fixture"]] : [[onPages ? "/api/state" : `${RAILS}/app/state`, "live"], [onPages ? `${RAILS}/app/state` : "/api/state", "live"], ["/fixtures/lock.json", "fixture"]];
  for (const [url, src] of tries) {
    try {
      state = await getJson(url);
      source = src;
      lastOk = Date.now();
      break;
    } catch {
      /* try the next one */
    }
  }
  render();
}

// Rails clears locked.winner to "" on a new day, so a winner name is the
// signal. A LOCK-or-later phase with no winner yet still counts as voting.
function isLocked(s) {
  return Boolean(s.locked && s.locked.winner);
}

function pair(s) {
  const list = (s.shortlist || []).map((d) => ({ name: d.dish || d, hindi: d.hindi, photo: d.photo })).filter((d) => d.name);
  if (list.length >= 2) return list.slice(0, 2);
  if (s.locked && s.locked.winner) {
    const out = [{ name: s.locked.winner, hindi: s.locked.winner_hindi }];
    if (s.locked.runner_up) out.push({ name: s.locked.runner_up, hindi: s.locked.runner_up_hindi });
    return out;
  }
  return list;
}

// rails gives "rajma.jpg"; the renders in /img/dishes are .png
function photoSrc(d) {
  const file = d.photo ? String(d.photo).replace(/\.[a-z]+$/i, "") : dishOf(d.name).file;
  return `/img/dishes/${file}.png`;
}

function card(d, i, winner) {
  const m = dishOf(d.name);
  const cls = winner ? (d.name === winner ? "won" : "lost") : "";
  return `<article class="card ${cls}">
    <div class="ph" style="background:${m.bg}"><span class="big">${esc(d.name)}</span><img src="${photoSrc(d)}" alt="" decoding="async" onerror="this.remove()"></div>
    <div class="name"><span class="num">${winner ? (d.name === winner ? "Kal yahi banega" : "Agli baar") : `Option ${i + 1}`}</span><h2>${esc(d.name)}</h2>${d.hindi || m.hi ? `<span class="hi" lang="hi">${esc(d.hindi || m.hi)}</span>` : ""}</div>
  </article>`;
}

function render() {
  const live = $("#live");
  if (!state) {
    $("#cards").innerHTML = `<div class="empty"><div><b>Baari khul raha hai</b><span>Data aa raha hai</span></div></div>`;
    return;
  }
  const s = state;
  const stale = Date.now() - lastOk > 15000;
  live.className = `live ${source === "fixture" ? "fixture" : stale ? "stale" : ""}`;
  live.lastChild.textContent = source === "fixture" ? "Fixture" : stale ? "Purana data" : "Live";
  if (s.household) $("#house").textContent = `${s.household.name || "Sharma"} parivar · Flat ${s.household.flat || "402"}`;

  const dishes = pair(s);
  const locked = isLocked(s);
  const winner = locked ? s.locked.winner : "";

  // Rebuild the cards only when the dishes or the lock change, so photos
  // don't flicker on every poll.
  const key = dishes.map((d) => d.name).join("|") + "#" + winner;
  if (key !== lastKey) {
    lastKey = key;
    $("#cards").innerHTML = dishes.length
      ? dishes.map((d, i) => card(d, i, winner)).join("")
      : `<div class="empty"><div><b>Shortlist 8:30 pe aayegi</b><span>Baari do dish bhejega, sabko Telegram pe</span></div></div>`;
    if (dishes.length && !locked && !ringStart) ringStart = Date.now();
  }

  $("#title").textContent = locked ? `Kal: ${winner}` : dishes.length ? "Kal kya banega? Telegram pe vote karo" : "Kal kya banega?";

  const stamp = $("#stamp");
  if (locked) {
    const left = dishes.length < 2 || dishes[0].name === winner;
    stamp.className = `stamp ${left ? "left" : "right"}`;
    $("#stamp-dish").textContent = winner;
    if (stamp.hidden) stamp.hidden = false;
  } else {
    stamp.hidden = true;
  }
  $("#ring").hidden = locked || !dishes.length;

  // Faces: a face pops in the first time its vote shows up.
  const voted = new Set((s.votes && s.votes.voted) || []);
  $("#faces").innerHTML = PEOPLE.map((p) => {
    const v = voted.has(p.name);
    const pop = v && !seenVoted.has(p.name) && !firstRender;
    const sub = p.cook ? p.role : v ? "Vote ho gaya" : locked ? "Vote nahi kiya" : "Baaki hai";
    return `<div class="face ${v ? "v" : ""} ${p.cook ? "cook" : ""} ${pop ? "pop" : ""}"><span class="av">${esc(p.name[0])}</span>${esc(p.name)}<small>${esc(sub)}</small></div>`;
  }).join("");
  seenVoted = voted;
  firstRender = false;

  const n = PEOPLE.filter((p) => !p.cook).length;
  $("#note").textContent = locked
    ? `${voted.size} of ${n} ne vote kiya. Kisne kya chuna, TV pe nahi dikhta.`
    : `${voted.size} of ${n} ne vote kiya. Kisne kya chuna, TV pe nahi dikhta. Vote band ${(s.votes && s.votes.closes_at) || "21:30"} pe.`;
}

function tick() {
  const ring = $("#ring");
  if (!ringStart) {
    $("#ring-bar").style.strokeDashoffset = 0;
    return;
  }
  const left = Math.max(0, RING_S - Math.floor((Date.now() - ringStart) / 1000));
  $("#ring-bar").style.strokeDashoffset = String(CIRC * (1 - left / RING_S));
  ring.classList.toggle("low", left <= 10);
  ring.classList.toggle("done", left === 0);
  $("#ring-n").textContent = left ? String(left) : "Bas";
  $("#ring-s").textContent = left ? "second" : "lock ho raha hai";
}

addEventListener("keydown", (e) => {
  if (e.key === " ") {
    ringStart = Date.now();
    tick();
    e.preventDefault();
  }
  if (e.key === "f" || e.key === "F") {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }
});
$("#stage").addEventListener("dblclick", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
});

render();
load();
setInterval(tick, 250);
setInterval(() => {
  if (document.visibilityState === "visible" && !FIXTURE) load();
}, 2500);
