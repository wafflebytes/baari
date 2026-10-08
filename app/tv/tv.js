// Baari TV (/tv): the 9pm living-room vote screen (PRD 17 item 3, DESIGN 7).
// Reads /app/state only. Shows who has voted, never what they chose. The
// 60 second ring is for the room; the real vote closes on rails.
//
// Built round the Hooked loop. Trigger: the 8:30 shortlist lands with a
// chime, and a QR on screen. Action: scan, vote on the phone. Variable
// reward: each vote pings in, the first voter gets the crown, and the lock is
// a drumroll before the stamp. Investment: the family's voting streak, and
// whose baari it is next.
//
// Keys: space restarts the ring, F goes full screen, S turns the sound on.
// ?fixture=lock loads the fixture, ?t=90 changes the ring length.
import { faceHtml, lookFor, LOOKS } from "/avatars.js";
import { drawQr } from "/invite.js";
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

const BOT_LINK = "https://t.me/Baari_ken_bot";
const $ = (s) => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const faceOf = (name) => faceHtml(LOOKS[String(name).toLowerCase()] || lookFor(name), "sand");
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// ---- sound: off until someone in the room presses a key or taps, which is
// also what the browser needs before it may play anything.
let ac = null;
function soundOn() {
  if (ac) return;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  $("#snd").classList.add("on");
  $("#snd").lastChild.textContent = "Awaaz on";
  chime([660, 880]);
}
function chime(freqs, gap = 0.11, dur = 0.5) {
  if (!ac) return;
  const t = ac.currentTime;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * gap);
    g.gain.linearRampToValueAtTime(0.16, t + i * gap + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * gap + dur);
    o.connect(g).connect(ac.destination);
    o.start(t + i * gap); o.stop(t + i * gap + dur + 0.05);
  });
}
const tick = () => chime([1200], 0, 0.06);

// Confetti of food, from a point on the 1920 x 1080 stage.
function burst(x, y, items, n = 24) {
  if (reduce) return;
  const st = $("#stage");
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "burst"; el.textContent = items[i % items.length];
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    st.appendChild(el);
    const a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 260;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 160;
    el.animate([{ transform: "translate(-50%,-50%) scale(0.3)", opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 320}px)) scale(0.8) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 0 }], { duration: 1500 + Math.random() * 600, easing: "cubic-bezier(0.22,1,0.36,1)" }).onfinish = () => el.remove();
  }
}

// One line slides in under the title when something happens.
function ping(html) {
  const el = $("#ping");
  el.innerHTML = html;
  el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
  clearTimeout(ping.t); ping.t = setTimeout(() => el.classList.remove("in"), 3600);
}
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
let revealed = "";
let revealing = false;

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

  const voters = PEOPLE.filter((p) => !p.cook);
  const voted = new Set((s.votes && s.votes.voted) || []);
  const order = (s.votes && s.votes.voted) || [];
  const left = voters.filter((p) => !voted.has(p.name));
  const duty = (s.household && s.household.duty_holder) || voters[0].name;
  const nextUp = voters[(voters.findIndex((p) => p.name === duty) + 1) % voters.length].name;

  // Lock: the first time this screen sees a winner, it drumrolls between the
  // two dishes before the stamp comes down.
  const stamp = $("#stamp");
  if (locked && revealed !== winner && !revealing && dishes.length >= 2) { reveal(dishes, winner); }
  else if (locked && !revealing) {
    const left2 = dishes.length < 2 || dishes[0].name === winner;
    stamp.className = `stamp ${left2 ? "left" : "right"}`;
    $("#stamp-dish").textContent = winner;
    stamp.hidden = false;
  } else if (!locked) {
    stamp.hidden = true; revealed = "";
  }
  $("#ring").hidden = locked || !dishes.length || revealing;

  if (!revealing) {
    $("#title").textContent = locked ? `Kal: ${winner}` : !dishes.length ? "Kal kya banega?" : left.length === 1 && order.length ? `Bas ${left[0].name} baaki!` : left.length ? "Kal kya banega? Phone se vote karo" : "Sab ne vote kar diya!";
  }

  // Faces: a face pops in the first time its vote shows up, and that vote
  // pings with a chime. Whoever voted first wears the crown tonight.
  $("#faces").innerHTML = PEOPLE.map((p) => {
    const v = voted.has(p.name);
    const pop = v && !seenVoted.has(p.name) && !firstRender;
    const first = order[0] === p.name;
    const sub = p.cook ? p.role : v ? (first ? "Sabse pehle" : "Vote ho gaya") : locked ? "Vote nahi kiya" : p.name === duty ? "Aaj ki baari" : "Baaki hai";
    return `<div class="face ${v ? "v" : ""} ${p.cook ? "cook" : ""} ${pop ? "pop" : ""} ${first ? "first" : ""}"><span class="fwrap">${faceOf(p.name)}${first ? '<i class="crown">👑</i>' : ""}${v && !p.cook ? '<i class="ok">✓</i>' : ""}</span><b>${esc(p.name)}</b><small>${esc(sub)}</small></div>`;
  }).join("");
  const fresh = [...voted].filter((n) => !seenVoted.has(n));
  if (!firstRender && fresh.length && !locked) {
    const n = fresh[fresh.length - 1];
    ping(`<b>${esc(n)}</b> ne vote kiya ${order[0] === n ? "<em>👑 sabse pehle</em>" : ""}<span>${voted.size} / ${voters.length}</span>`);
    chime([784, 1047]);
  }
  seenVoted = voted;
  firstRender = false;

  // The meter: one pip per person, filled as votes come in. Never who chose what.
  $("#meter").innerHTML = voters.map((p) => `<i class="${voted.has(p.name) ? "on" : ""}"></i>`).join("") + `<span>${voted.size} / ${voters.length} ne vote kiya</span>`;
  $("#meter").hidden = !dishes.length;

  // Investment: the streak the family keeps, and whose turn is next.
  const st = streak(s, locked, voted.size === voters.length);
  $("#keep").innerHTML = `${st >= 2 ? `<div class="kp streak"><span class="fl">🔥</span><div><b>${st} din</b><small>se poori family vote kar rahi hai</small></div></div>` : ""}
    <div class="kp next">${faceOf(locked ? nextUp : duty)}<div><b>${esc(locked ? nextUp : duty)}</b><small>${locked ? "ki baari kal. Woh chunenge." : "ki baari aaj. Tie hua toh yahi todenge."}</small></div></div>`;

  // Trigger and action: the QR goes straight to the vote.
  $("#qr").hidden = locked || !dishes.length;

  $("#note").textContent = locked
    ? "Kisne kya chuna, TV pe nahi dikhta. Kabhi nahi."
    : `Kisne kya chuna, TV pe nahi dikhta. Vote band ${(s.votes && s.votes.closes_at) || "21:30"} pe.`;
}

// Consecutive nights the whole family voted, kept on this TV. The fixture
// shows a week-long streak so the demo has something to protect.
function streak(s, locked, all) {
  if (s.streak && Number.isFinite(s.streak.days)) return s.streak.days;
  if (FIXTURE) return 6;
  const day = String(s.date_for || s.now_ist || "").slice(0, 10);
  const k = store.get("baari:tv:streak") || { last: "", n: 0 };
  if (locked && all && day && k.last !== day) {
    const y = new Date(day); y.setDate(y.getDate() - 1);
    k.n = k.last === y.toISOString().slice(0, 10) ? k.n + 1 : 1; k.last = day;
    store.set("baari:tv:streak", k);
  }
  return k.n;
}

async function reveal(dishes, winner) {
  revealing = true;
  revealed = winner;
  const cards = [...document.querySelectorAll(".card")];
  const wi = dishes.findIndex((d) => d.name === winner);
  cards.forEach((c) => c.classList.remove("won", "lost"));
  $("#stamp").hidden = true;
  $("#ring").hidden = true;
  $("#title").textContent = "Aur kal banega...";
  $("#stage").classList.add("drum");
  if (!reduce) {
    const steps = 13 + ((13 + wi) % 2 === 0 ? 0 : 1);
    for (let k = 0; k <= steps; k++) {
      cards.forEach((c, j) => c.classList.toggle("hot", j === (k % 2 === 0 ? (wi + steps) % 2 : 1 - ((wi + steps) % 2))));
      tick();
      await new Promise((r) => setTimeout(r, 90 + Math.pow(k / steps, 2.4) * 520));
    }
  }
  cards.forEach((c, j) => { c.classList.remove("hot"); c.classList.add(j === wi ? "won" : "lost"); });
  $("#stage").classList.remove("drum");
  const stamp = $("#stamp");
  stamp.className = `stamp ${wi === 0 ? "left" : "right"}`;
  $("#stamp-dish").textContent = winner;
  stamp.hidden = false;
  $("#title").textContent = `Kal: ${winner}`;
  chime([523, 659, 784, 1047], 0.12, 0.7);
  burst(wi === 0 ? 480 : 1440, 520, ["🍛", "🫓", "✨", "🎉", "🪙"], 36);
  revealing = false;
}

function tickRing() {
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
  soundOn();
  if (e.key === "s" || e.key === "S") return;
  if (e.key === " ") {
    ringStart = Date.now();
    tickRing();
    e.preventDefault();
  }
  if (e.key === "f" || e.key === "F") {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }
});
addEventListener("pointerdown", soundOn);
$("#stage").addEventListener("dblclick", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
});

drawQr($("#qr-c"), BOT_LINK);
render();
load();
setInterval(tickRing, 250);
setInterval(() => {
  if (document.visibilityState === "visible" && !FIXTURE) load();
}, 2500);
