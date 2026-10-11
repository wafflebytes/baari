// Baari landing page. Plain ES module, no build step. Faces come from the
// app's own Personas set so the Sharmas look the same here as in the app.
import { faceUri, LOOKS, lookFor } from "/avatars.js";
import { mountArt } from "./hero-art.js";
import { mountDawn } from "./sombra.js";

window.__landing = true;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const face = (k) => faceUri(LOOKS[k] || lookFor(k));
for (const img of $$("img[data-face]")) img.src = face(img.dataset.face);
mountArt();
mountDawn($("#dawnG"), $("#dawn"));

/* ---------- reveal on scroll, and on/paused for anything that loops ---------- */
const reveal = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });
// whatever is already on screen shows now, without waiting for the observer
for (const el of $$(".rv")) {
  const r = el.getBoundingClientRect();
  if (r.top < innerHeight * 0.94 && r.bottom > 0) el.classList.add("in"); else reveal.observe(el);
}

const live = new IntersectionObserver((es) => {
  for (const e of es) {
    e.target.classList.toggle("paused", !e.isIntersecting);
    if (e.isIntersecting && !e.target.classList.contains("on")) {
      e.target.classList.add("on");
      e.target.dispatchEvent(new Event("firstview"));
    }
  }
}, { threshold: 0.2 });
$$(".hero, .bc, .tc, .vis, .det, .safe-art, .scene, .marq, .sky").forEach((el) => live.observe(el));

const visible = (el) => el.classList.contains("on") && !el.classList.contains("paused") && !document.hidden;
const loop = (el, ms, fn) => setInterval(() => { if (visible(el)) fn(); }, ms);
const soft = (el) => el.animate(
  [{ opacity: 0, transform: "translateY(5px)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "none" }],
  { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });

/* ---------- nav ---------- */
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
const menu = $("#navMenu"), sheet = $("#navSheet");
const setMenu = (open) => { menu.setAttribute("aria-expanded", String(open)); sheet.hidden = !open; };
menu.addEventListener("click", () => setMenu(sheet.hidden));
sheet.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

/* ---------- a word that rolls up and out, its box easing to the new width ---------- */
function roll(box, text) {
  const old = box.querySelector("b:not(.out)");
  if (old) { old.classList.add("out"); setTimeout(() => old.remove(), 480); }
  const b = document.createElement("b");
  b.textContent = text;
  b.className = "inn";
  box.appendChild(b);
  box.style.width = b.offsetWidth + "px";
}

/* ---------- hero ---------- */
const hero = $(".hero");
const turnBox = $("#heroTurn");
turnBox.style.width = turnBox.firstElementChild.offsetWidth + "px";
const TURNS = ["Papa ki", "Mummy ki", "Vinay ki"];
let ti = 0;
loop(hero, 2600, () => { ti = (ti + 1) % TURNS.length; roll(turnBox, TURNS[ti]); });

const DISHES = [
  ["rajma", "Rajma chawal."], ["kadhi", "Kadhi chawal."], ["masala-dosa", "Masala dosa."], ["pav-bhaji", "Pav bhaji."],
  ["chole-bhature", "Chole bhature."], ["palak-paneer", "Palak paneer."], ["aloo-paratha", "Aloo paratha."], ["veg-momos", "Veg momos."],
];
DISHES.forEach(([f]) => { const i = new Image(); i.src = `/img/dishes/${f}.webp`; });
const reel = $("#reel"), reelImg = $("#reelImg");
let reelCur = reel.querySelector(".reel-w");
reel.style.width = reelCur.offsetWidth + "px";
reel.classList.add("js-reel");
let di = 0;
function nextDish() {
  di = (di + 1) % DISHES.length;
  const [f, name] = DISHES[di];
  const w = document.createElement("span");
  w.className = "reel-w";
  w.textContent = name;
  reel.appendChild(w);
  reel.style.width = w.offsetWidth + "px";
  const out = reelCur;
  requestAnimationFrame(() => { out.classList.remove("is-in"); out.classList.add("is-out"); w.classList.add("is-in"); });
  setTimeout(() => out.remove(), 650);
  reelCur = w;
  reelImg.src = `/img/dishes/${f}.webp`;
  reelImg.classList.remove("swap"); void reelImg.offsetWidth; reelImg.classList.add("swap");
}
if (!reduce) loop(hero, 2800, nextDish);
// Family arrives after first paint; widths measured before it are short
document.fonts.ready.then(() => {
  reel.style.width = reelCur.offsetWidth + "px";
  const b = turnBox.querySelector("b:not(.out)");
  if (b) turnBox.style.width = b.offsetWidth + "px";
});

/* ---------- bento ---------- */
{
  const card = $("#dlist").closest(".bc"), rows = $$("#dlist .dl-row");
  let k = 0;
  loop(card, 1700, () => { rows[k].classList.remove("on"); k = (k + 1) % rows.length; rows[k].classList.add("on"); });
}
{
  const card = $("#turnRow").closest(".bc"), faces = $$("#turnRow .tf"), ring = $("#turnRow .turn-ring"), nameEl = $("#turnName");
  const NAMES = ["Vinay", "Mummy"];
  let k = 2;
  ring.style.setProperty("--k", k);
  loop(card, 2300, () => {
    faces[k].classList.remove("on");
    k = (k + 1) % faces.length;
    faces[k].classList.add("on");
    ring.style.setProperty("--k", k);
    nameEl.textContent = NAMES[k];
    nameEl.classList.remove("pop"); void nameEl.offsetWidth; nameEl.classList.add("pop");
  });
}
{
  const card = $("#tl").closest(".bc"), steps = $$("#tl li");
  let s = 0;
  const paint = () => steps.forEach((li, i) => { li.classList.toggle("done", i < s); li.classList.toggle("cur", i === s); });
  paint();
  loop(card, 1500, () => { s = (s + 1) % (steps.length + 2); paint(); });
}
{
  // the app's Khata meter: eight ब coins of ₹50, a spent coin goes hollow
  const card = $("#spent").closest(".bc"), out = $("#spent"), row = $("#coins");
  const coins = Array.from({ length: 8 }, () => { const c = document.createElement("i"); c.className = "cn"; c.textContent = "ब"; row.appendChild(c); return c; });
  const VALS = [40, 120, 240, 280, 360, 240];
  let k = 2, shown = 240;
  const set = (v) => {
    const from = shown, t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      shown = Math.round(lerp(from, v, e));
      out.textContent = shown;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const left = Math.floor((400 - v) / 50);
    coins.forEach((c, i) => {
      const spent = i >= left;
      if (c.classList.contains("spent") !== spent) { c.classList.toggle("spent", spent); c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip"); }
    });
    card.classList.toggle("hot", v / 400 >= 0.8);
  };
  set(240);
  loop(card, 2000, () => { k = (k + 1) % VALS.length; set(VALS[k]); });
}
{
  const box = $("#orbs"), card = box.closest(".bc");
  const SET = ["rajma", "masala-dosa", "veg-momos", "pav-bhaji", "kadhi", "tawa-pizza", "chole-bhature"];
  const TINT = ["#FFE1A8", "#FFD3DE", "#D2EFD0", "#DCD5FA", "#CFE6FA", "#FFD9C2", "#F5E6B8"];
  const orbs = SET.map((f, i) => {
    const o = document.createElement("span");
    o.className = "orb";
    o.style.setProperty("--t", TINT[i]);
    o.innerHTML = `<img src="/img/dishes/${f}.webp" alt="">`;
    box.appendChild(o);
    return { el: o, p: i - 3 };
  });
  const place = (o) => {
    const a = Math.abs(o.p);
    o.el.style.transform = `translateX(${o.p * 82}px) scale(${o.p === 0 ? 1.55 : 1 - a * 0.08})`;
    o.el.style.opacity = a >= 3 ? 0 : 1 - a * 0.18;
    o.el.style.zIndex = 10 - a;
  };
  orbs.forEach(place);
  loop(card, 1800, () => orbs.forEach((o) => {
    o.p -= 1;
    if (o.p < -3) { o.p = 3; o.el.classList.add("jump"); place(o); void o.el.offsetWidth; o.el.classList.remove("jump"); }
    else place(o);
  }));
}

/* ---------- Sunita's brief: real audio, word-timed ---------- */
{
  const LANGS = [["Hindi", "hi"], ["Marathi", "mr"], ["Bangla", "bn"], ["Tamil", "ta"], ["Telugu", "te"], ["Kannada", "kn"]];
  const box = $("#kara"), tabs = $("#karaTabs"), text = $("#karaText"), wave = $("#karaWave"), tEl = $("#karaT"), audio = $("#karaAudio");
  let data = null, lang = "Hindi", words = [], bars = [], raf = 0, fake = null;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const dur = () => (data && data[lang] ? data[lang].dur : 11.5);
  const now = () => (fake ? fake.off + (performance.now() - fake.t0) / 1000 : audio.currentTime);

  // bar heights are stable per language, so the waveform doesn't jitter
  function buildWave() {
    wave.innerHTML = "";
    let seed = [...lang].reduce((a, c) => a + c.charCodeAt(0), 7);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    bars = Array.from({ length: 56 }, (_, i) => {
      const b = document.createElement("i");
      const env = Math.sin((i / 55) * Math.PI) * 0.5 + 0.5;
      b.style.setProperty("--h", Math.round((0.22 + rnd() * 0.78 * env) * 100) + "%");
      wave.appendChild(b);
      return b;
    });
  }
  function render() {
    const L = LANGS.find((l) => l[0] === lang);
    text.lang = L[1];
    text.innerHTML = "";
    words = (data?.[lang]?.words || []).map(([w, s, e]) => {
      const sp = document.createElement("span");
      sp.className = "w";
      sp.textContent = w;
      text.append(sp, " ");
      return { sp, s, e };
    });
    text.classList.remove("swap"); void text.offsetWidth; text.classList.add("swap");
    buildWave();
    tEl.textContent = fmt(dur());
    audio.src = `/audio/brief-${lang.toLowerCase()}.mp3`;
  }
  function paint(t) {
    for (const w of words) { w.sp.classList.toggle("said", w.e <= t); w.sp.classList.toggle("now", w.s <= t && t < w.e); }
    const p = clamp(t / dur());
    bars.forEach((b, i) => b.classList.toggle("p", i / bars.length < p));
    tEl.textContent = fmt(Math.max(0, dur() - t));
  }
  function tick() {
    const t = now();
    paint(t);
    if (t >= dur() + 0.2) return stop(true);
    raf = requestAnimationFrame(tick);
  }
  function startFake(off = 0) { fake = { t0: performance.now(), off }; }
  function play() {
    box.classList.add("playing");
    fake = null;
    audio.play().catch(() => startFake(audio.currentTime || 0));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function stop(ended) {
    cancelAnimationFrame(raf);
    audio.pause();
    fake = null;
    box.classList.remove("playing");
    if (ended) { audio.currentTime = 0; setTimeout(() => { if (!box.classList.contains("playing")) paint(0); }, 1200); }
  }
  audio.addEventListener("error", () => { if (box.classList.contains("playing") && !fake) startFake(0); });
  $("#karaPlay").addEventListener("click", () => (box.classList.contains("playing") ? stop(false) : play()));
  wave.addEventListener("click", (e) => {
    const r = wave.getBoundingClientRect(), t = clamp((e.clientX - r.left) / r.width) * dur();
    if (fake) fake = { t0: performance.now(), off: t }; else audio.currentTime = t;
    paint(t);
  });
  LANGS.forEach(([name]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.role = "tab";
    b.textContent = name;
    b.setAttribute("aria-selected", String(name === lang));
    b.addEventListener("click", () => {
      if (name === lang) return;
      const was = box.classList.contains("playing");
      stop(false);
      lang = name;
      $$("button", tabs).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      render();
      paint(0);
      if (was) play();
    });
    tabs.appendChild(b);
  });
  fetch("/audio/brief.json").then((r) => r.json()).then((d) => { data = d; render(); paint(0); }).catch(() => {
    text.textContent = "दीदी, नमस्ते। कल दोपहर राजमा चावल बनाना है, चार लोगों के लिए।";
  });
}

/* ---------- one night, start to finish ---------- */
{
  const sky = $("#sky"), scrub = $("#scrub"), knob = $("#knob"), fill = $("#scrubFill"), ticks = $("#ticks");
  const timeEl = $("#skyTime"), railEl = $("#skyRail"), card = $("#skyCard"), objEl = $("#skyObj"), phEl = $("#skyPhase"), txEl = $("#skyText"), orb = $("#orb");
  const PH = [
    [20.5, "Shortlist", "Telegram", "/img/obj/ballot.webp", "Baari checks the pantry and the house rules, then sends tonight's holder two dishes."],
    [21.5, "Lock", "Telegram", "/img/dishes/rajma.webp", "Picks close. A veto flips it, silence means dish one. Everyone hears whose baari is next."],
    [21.584, "Buy", "Pine Labs", "/img/obj/kirana-bag.webp", "Fresh things go to the kirana, staples go by parcel. Anything over ₹300 waits for a Pine Labs payment."],
    [22.75, "Check", "Delhivery", "/img/obj/parcel.webp", "Is the parcel on time? Baari checks quietly and lets everyone sleep."],
    [30.5, "Check again", "Delhivery", "/img/obj/parcel.webp", "Still late? A rider, a kirana pickup or the runner-up dish. You only hear if the plan changed."],
    [31.75, "Brief", "Gnani", "/img/obj/voice-note.webp", "Sunita gets her voice note: the dish, how many are eating, whose plate skips what."],
    [32.084, "Cook's reply", "Gnani", "/img/obj/pressure-cooker.webp", "She replies by voice. A vague \"haan haan\" gets one follow-up. Then the cooker goes on."],
  ];
  // Phases sit evenly along the slider, so the quiet hours rush past and the
  // busy minutes get room. Position to time is piecewise linear.
  const ANCH = [[0, 20.25], ...PH.map((p, i) => [(i + 1) / (PH.length + 1), p[0]]), [1, 32.5]];
  const timeAt = (x) => {
    for (let i = 1; i < ANCH.length; i++) if (x <= ANCH[i][0]) {
      const [x0, t0] = ANCH[i - 1], [x1, t1] = ANCH[i];
      return lerp(t0, t1, (x - x0) / (x1 - x0));
    }
    return 32.5;
  };
  const SKY = [
    [20.25, "#E98A6E", "#F7C8A0"], [21.0, "#7A5FA8", "#E592A0"], [22.0, "#2C2869", "#5A4796"], [23.5, "#14163A", "#2A2766"],
    [29.5, "#14163A", "#2A2766"], [30.5, "#47498C", "#E39C7E"], [31.3, "#8CC0EE", "#FFD6A2"], [32.5, "#B2DAFF", "#FFF2DA"],
  ];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => `rgb(${hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], t))).join(",")})`;
  const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const fmtT = (t) => {
    let mins = Math.round((t * 60) / 5) * 5, h = Math.floor(mins / 60) % 24, m = mins % 60;
    const pm = h >= 12, h12 = h % 12 || 12;
    return [`${h12}:${String(m).padStart(2, "0")}`, pm ? "pm" : "am"];
  };

  // stars
  for (let i = 0; i < 70; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 62 + "%";
    s.style.animationDelay = -Math.random() * 3 + "s";
    if (Math.random() < 0.2) s.style.width = s.style.height = "3px";
    $("#stars").appendChild(s);
  }
  PH.forEach((p, i) => {
    const s = document.createElement("span");
    s.style.left = ((i + 1) / (PH.length + 1)) * 100 + "%";
    s.textContent = fmtT(p[0]).join(" ");
    ticks.appendChild(s);
  });
  const tickEls = $$("span", ticks);

  let pos = 0, phase = -1;
  function set(x) {
    pos = clamp(x);
    const t = timeAt(pos);
    let k = 0;
    while (k < SKY.length - 2 && t > SKY[k + 1][0]) k++;
    const u = clamp((t - SKY[k][0]) / (SKY[k + 1][0] - SKY[k][0]));
    const a = mix(SKY[k][1], SKY[k + 1][1], u), b = mix(SKY[k][2], SKY[k + 1][2], u);
    sky.style.setProperty("--sky-a", a);
    sky.style.setProperty("--sky-b", b);
    sky.style.setProperty("--sky-ink", (lum(a) + lum(b)) / 2 > 0.62 ? "#1C1A17" : "#FFFFFF");
    sky.style.setProperty("--star", clamp(Math.min((t - 21.6) / 0.8, (30.6 - t) / 0.6)));
    // sun sets, moon crosses, sun rises
    let ox, oy, kind;
    if (t < 21.3) { kind = "sun"; ox = 80; oy = lerp(66, 118, clamp((t - 20.25) / 1.05)); }
    else if (t < 30.6) { kind = "moon"; const v = clamp((t - 21.9) / 8.4); ox = lerp(14, 86, v); oy = 78 - Math.sin(v * Math.PI) * 56; if (t < 21.9) oy = 120; }
    else { kind = "sun"; const v = clamp((t - 30.6) / 1.9); ox = lerp(12, 34, v); oy = lerp(112, 36, v); }
    orb.className = "sky-orb " + kind;
    orb.style.setProperty("--ox", ox + "%");
    orb.style.setProperty("--oy", oy + "%");

    const [hm, ap] = fmtT(t);
    timeEl.innerHTML = `${hm}<small>${ap}</small>`;
    const pct = pos * 100 + "%";
    scrub.style.setProperty("--p", pct);
    knob.setAttribute("aria-valuenow", Math.round(pos * 100));
    knob.setAttribute("aria-valuetext", `${hm} ${ap}`);

    let ph = 0;
    PH.forEach((p, i) => { if (t >= p[0] - 0.001) ph = i; });
    tickEls.forEach((el, i) => { el.classList.toggle("past", i <= ph && t >= PH[0][0]); el.classList.toggle("now", i === ph); });
    if (ph !== phase) {
      phase = ph;
      const [, name, rail, img, txt] = PH[ph];
      phEl.textContent = name; railEl.textContent = rail; txEl.textContent = txt; objEl.src = img;
      card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap");
    }
  }
  set(0.06);

  // autoplay until someone touches it
  let auto = !reduce, t0 = 0, raf = 0;
  const AUTO_MS = 16000;
  function run(ts) {
    if (!auto) return;
    if (!visible(sky)) { t0 = 0; raf = requestAnimationFrame(run); return; }
    if (!t0) t0 = ts - pos * AUTO_MS;
    const x = (ts - t0) / AUTO_MS;
    if (x > 1.12) { t0 = ts; set(0); } else set(Math.min(x, 1));
    raf = requestAnimationFrame(run);
  }
  sky.addEventListener("firstview", () => { if (auto) raf = requestAnimationFrame(run); });
  const take = () => { auto = false; cancelAnimationFrame(raf); };

  const fromX = (cx) => { const r = scrub.getBoundingClientRect(); return (cx - r.left) / r.width; };
  scrub.addEventListener("pointerdown", (e) => {
    take();
    scrub.classList.add("drag");
    scrub.setPointerCapture(e.pointerId);
    set(fromX(e.clientX));
    knob.focus({ preventScroll: true });
  });
  scrub.addEventListener("pointermove", (e) => { if (scrub.classList.contains("drag")) set(fromX(e.clientX)); });
  const end = () => scrub.classList.remove("drag");
  scrub.addEventListener("pointerup", end);
  scrub.addEventListener("pointercancel", end);
  knob.addEventListener("keydown", (e) => {
    const stops = PH.map((_, i) => (i + 1) / (PH.length + 1));
    let x = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") x = pos + 0.02;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") x = pos - 0.02;
    if (e.key === "PageUp") x = stops.find((s) => s > pos + 0.001) ?? 1;
    if (e.key === "PageDown") x = [...stops].reverse().find((s) => s < pos - 0.001) ?? 0;
    if (e.key === "Home") x = 0;
    if (e.key === "End") x = 1;
    if (x !== null) { e.preventDefault(); take(); set(x); }
  });
}

/* ---------- setup by talking ---------- */
{
  const fig = $("#said").closest(".tc"), said = $("#said"), chips = $("#suChips");
  const LINE = "Papa aloo nahi khate. Mummy Tuesday ko vrat rakhti hain. Dadi Jain hain.";
  let i = 0, hold = 0;
  setInterval(() => {
    if (!visible(fig)) return;
    if (hold > 0) { hold--; if (hold === 0) { i = 0; said.textContent = ""; chips.classList.remove("show"); } return; }
    if (i < LINE.length) { i++; said.textContent = LINE.slice(0, i); }
    else { chips.classList.add("show"); hold = 70; }
  }, 50);
}

/* ---------- ghumao ---------- */
{
  const wheel = $("#wheel"), fig = wheel.closest(".tc"), res = $("#spinRes");
  const WHO = [["Vinay", 0], ["Mummy", 90], ["Papa", 180], ["Dadi", 270]];
  let rot = 0, last = -1;
  const spin = () => {
    let k;
    do k = Math.floor(Math.random() * WHO.length); while (k === last);
    last = k;
    const target = (360 - WHO[k][1]) % 360;
    rot += 360 * 4 + ((target - (rot % 360) + 360) % 360);
    wheel.style.setProperty("--r", rot + "deg");
    res.textContent = "Ghoom raha hai";
    setTimeout(() => { res.textContent = `Pehli baari: ${WHO[k][0]}`; res.classList.remove("pop"); void res.offsetWidth; res.classList.add("pop"); }, 3400);
  };
  fig.addEventListener("firstview", () => setTimeout(spin, 600));
  loop(fig, 7500, spin);
}

/* ---------- pressure cooker ---------- */
{
  const art = $(".safe-art"), out = $("#whistle");
  let n = 1;
  loop(art, 2400, () => { n = (n % 3) + 1; out.textContent = n; out.classList.remove("pop"); void out.offsetWidth; out.classList.add("pop"); });
}

/* ---------- heard in six homes ---------- */
{
  const Q = [
    ["Husband and I alternate but each thinks we are doing it all the time.", "Survey response", "The Ken, What to cook today", "#FFE1A8"],
    ["When there's total confusion and no one can agree on what to cook, we usually make something quick and simple that everyone enjoys, like puri.", "Household 1", "Interview", "#D2EFD0"],
    ["I get completely confused about what to do, especially managing dietary needs like diabetes along with everyone else's preferences.", "Household 2", "Interview", "#FFD3DE"],
    ["It's usually my mom asking me or my dad what should be made today.", "Household 6", "Interview", "#CFE6FA"],
    ["Mostly mental notes. About 90 to 92 percent of it is handled in the mind.", "Household 2", "Interview", "#DCD5FA"],
    ["Tried the whole plan every Sunday for the coming week but it just doesn't consistently happen.", "Survey response", "The Ken, What to cook today", "#FFD9C2"],
    ["Every morning I have to tell my cook what to make. But it gets annoying and many times I end up just telling her nothing and ordering out.", "Survey response", "The Ken, What to cook today", "#F5E6B8"],
    ["Mummy and I just discuss what to make over the next two or three days.", "Household 1", "Interview", "#FFE1A8"],
    ["She kind of left it to me to decide what everyone should eat today.", "Household 6", "Interview", "#D2EFD0"],
    ["If it goes over quantity, it will be wasted for morning.", "Household 4", "Interview", "#FFD3DE"],
    ["No, we just make something simple. I need a cook!", "Household 2", "Interview", "#CFE6FA"],
  ];
  const card = ([q, who, src, tint], i) =>
    `<figure class="qc"><div class="qc-top"><img src="${face("q" + i + who)}" alt="" style="--t:${tint}"><div><b>${who}</b><small>${src}</small></div></div><p>"${q}"</p></figure>`;
  const half = Math.ceil(Q.length / 2);
  const rows = [Q.slice(0, half), Q.slice(half)];
  $("#marq").innerHTML = rows.map((r, ri) => {
    const html = r.map((q, i) => card(q, i + ri * half)).join("");
    return `<div class="mrow${ri ? " rev" : ""}" style="--dur:${ri ? 78 : 66}s">${html}${html}</div>`;
  }).join("");
}

/* ---------- faq: animate open and close ---------- */
for (const d of $$(".q")) {
  const sum = $("summary", d), body = $(".a", d);
  sum.addEventListener("click", (e) => {
    if (reduce) return;
    e.preventDefault();
    if (d.open) {
      const a = body.animate([{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      d.classList.add("closing");
      a.onfinish = () => { d.open = false; d.classList.remove("closing"); };
    } else {
      d.open = true;
      body.animate([{ height: "0px", opacity: 0 }, { height: body.offsetHeight + "px", opacity: 1 }], { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
  });
}
