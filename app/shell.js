// The app around the screens: splash, first-run onboarding and the action
// menu that grows out of the + beside the nav.
const BOT = "Baari_ken_bot";
const qs = new URLSearchParams(location.search);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

// ---- splash: the mark drops in, a ring turns once round it ("whose turn"),
// then the whole thing lifts away. At least 1.1 s so it never just flickers.
export function splash({ skip } = {}) {
  const el = document.getElementById("splash");
  if (!el) return;
  if (skip) { el.remove(); return; }
  const t0 = performance.now();
  el.classList.add("is-in");
  return async function done() {
    await wait(Math.max(0, 1150 - (performance.now() - t0)));
    el.classList.add("is-out");
    await wait(450);
    el.remove();
  };
}

// ---- onboarding

const MEMBERS = [
  { k: "main", label: "Main", sub: "you", em: "🙋" },
  { k: "mummy", label: "Mummy", em: "👩🏽" },
  { k: "papa", label: "Papa", em: "👨🏽" },
  { k: "didi", label: "Didi", em: "👧🏽" },
  { k: "bhaiya", label: "Bhaiya", em: "👦🏽" },
  { k: "dadi", label: "Dadi", em: "👵🏽" },
  { k: "dadaji", label: "Dada ji", em: "👴🏽" },
  { k: "bachche", label: "Bachche", em: "🧒🏽" },
];
const RULES = [
  { k: "aloo", label: "Papa ki thali mein aloo nahi" },
  { k: "tue", label: "Mangalvaar ko non-veg nahi" },
  { k: "oil", label: "Mummy ke liye kam tel" },
  { k: "teekha", label: "Bachchon ke liye kam teekha" },
  { k: "navratri", label: "Navratri mein pyaaz-lehsun nahi" },
  { k: "egg", label: "Anda sirf weekend pe" },
  { k: "repeat", label: "Ek hafte mein ek dish do baar nahi" },
];
const LANGS = ["Hindi", "Marathi", "Bangla", "Tamil", "Kannada"];
const TIMES = ["7:00", "7:30", "8:00", "8:30", "9:00"];
const DISH_IMG = ["rajma", "palak-paneer", "kadhi", "aloo-puri", "lauki-chana-dal", "egg-bhurji"];
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 5.3 20 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.2l-4.3-4.3z"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>';
const TG = '<img src="/img/brands/telegram.svg" alt="" class="ob-tg">';

export function needsOnboarding() {
  if (qs.has("onboard")) return true;
  if (qs.has("fixture") || qs.has("skip")) return false;
  return !store.get("baari:onboarded");
}

export function onboard({ onDone } = {}) {
  const pick = store.get("baari:setup") || { members: ["main", "mummy", "papa"], rules: ["aloo"], cook: "Sunita", time: "8:00", lang: "Hindi", duty: "main" };
  const root = document.createElement("div");
  root.className = "ob";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Set up Baari");
  document.body.appendChild(root);
  document.documentElement.classList.add("ob-open");
  let step = 0;
  const TOTAL = 5;

  const people = () => pick.members.map((k) => MEMBERS.find((m) => m.k === k)).filter(Boolean);
  const screens = [
    () => `<div class="ob-orbit" aria-hidden="true">
        <div class="ob-ring r1">${DISH_IMG.slice(0, 3).map((f, i) => `<img src="/img/dishes/${f}.webp" style="--a:${i * 120}deg" alt="">`).join("")}</div>
        <div class="ob-ring r2">${DISH_IMG.slice(3).map((f, i) => `<img src="/img/dishes/${f}.webp" style="--a:${i * 120 + 60}deg" alt="">`).join("")}</div>
        <img class="ob-mark" src="/img/baari-mark.png" alt="">
      </div>
      <div class="ob-copy"><p class="ob-kick">Raat 9:30 tak tay. Subah 8 baje taiyaar.</p>
      <h1>Aaj kya<br>banega?</h1>
      <p>Baari asks your family on Telegram, settles it by 9:30, gets the saamaan home overnight and tells your cook in her language.</p></div>`,
    () => `<div class="ob-copy at-top"><p class="ob-kick">1 of 4</p><h1>Ghar mein<br>kaun kaun?</h1><p>Everyone who eats gets a vote. Tap to add.</p></div>
      <div class="ob-grid">${MEMBERS.map((m) => `<button type="button" class="ob-tile ${pick.members.includes(m.k) ? "on" : ""}" data-m="${m.k}"><span class="ob-em">${m.em}</span><b>${m.label}</b>${m.sub ? `<small>${m.sub}</small>` : ""}<i>${CHECK}</i></button>`).join("")}</div>
      <p class="ob-count"><b data-count>${pick.members.length}</b> log khaate hain</p>`,
    () => `<div class="ob-copy at-top"><p class="ob-kick">2 of 4</p><h1>Thali ke<br>niyam</h1><p>Baari never breaks these, even if the vote says otherwise.</p></div>
      <div class="ob-chips">${RULES.map((r) => `<button type="button" class="ob-chip ${pick.rules.includes(r.k) ? "on" : ""}" data-r="${r.k}"><i>${CHECK}</i>${r.label}</button>`).join("")}</div>
      <p class="ob-note">Health rules are said as a plate rule, never as a diagnosis.</p>`,
    () => `<div class="ob-copy at-top"><p class="ob-kick">3 of 4</p><h1>Khana kaun<br>banata hai?</h1><p>She gets a voice note every morning. No app, no reading, never her own money.</p></div>
      <div class="ob-cook">
        <div class="ob-cook-av"><span>${(pick.cook || "S")[0].toUpperCase()}</span></div>
        <label class="ob-field"><span>Her name</span><input data-cook value="${pick.cook}" maxlength="20" autocomplete="off"></label>
        <div class="ob-row"><span>Comes at</span><div class="ob-seg" data-seg="time">${TIMES.map((t) => `<button type="button" class="${pick.time === t ? "on" : ""}" data-v="${t}">${t}</button>`).join("")}</div></div>
        <div class="ob-row"><span>Voice notes in</span><div class="ob-seg" data-seg="lang">${LANGS.map((t) => `<button type="button" class="${pick.lang === t ? "on" : ""}" data-v="${t}">${t}</button>`).join("")}</div></div>
      </div>`,
    () => `<div class="ob-copy at-top"><p class="ob-kick">4 of 4</p><h1>Is hafte kiski<br>baari?</h1><p>The duty-holder breaks ties and says yes to anything over ₹300. It rotates every Monday.</p></div>
      <div class="ob-wheel">${people().map((m, i, all) => `<button type="button" class="ob-seat ${pick.duty === m.k ? "on" : ""}" data-d="${m.k}" style="--a:${(360 / all.length) * i}deg"><span>${m.em}</span><b>${m.label}</b></button>`).join("")}
        <div class="ob-hub"><img src="/img/baari-mark.png" alt=""><small>ki baari</small></div></div>`,
  ];

  const prep = () => `<div class="ob-prep">
      <div class="ob-card-ghost" aria-hidden="true"></div>
      <p class="ob-kick" data-prep>Rasoi set ho rahi hai…</p>
    </div>`;
  const ready = () => {
    const ppl = people();
    const duty = MEMBERS.find((m) => m.k === pick.duty) || ppl[0];
    return `<div class="ob-ready">
      <p class="ob-kick">Sab set</p>
      <div class="ob-house">
        <div class="ob-house-top"><img src="/img/baari-mark.png" alt=""><div><b>Aapka ghar</b><span>${ppl.length} log · ${pick.rules.length} niyam</span></div></div>
        <div class="ob-house-faces">${ppl.map((m) => `<span>${m.em}</span>`).join("")}</div>
        <dl><div><dt>Cook</dt><dd>${esc(pick.cook)} · ${pick.time} am</dd></div><div><dt>Is hafte</dt><dd>${duty ? duty.label : "Main"} ki baari</dd></div><div><dt>Brief</dt><dd>${pick.lang} voice note</dd></div></dl>
      </div>
      <h1 class="sm">Ab family ko<br>Telegram pe jodo</h1>
      <p>Everyone taps one link. Votes, the cook's brief and anything that needs a yes come through there.</p>
    </div>`;
  };

  function paint(dir = 1) {
    const last = step === TOTAL - 1;
    root.innerHTML = `<div class="ob-bg" aria-hidden="true"></div>
      <div class="ob-top">${step > 0 && step < TOTAL ? `<button type="button" class="ob-back" aria-label="Back">${BACK}</button>` : "<span></span>"}
        <div class="ob-dots">${step > 0 && step < TOTAL ? Array.from({ length: TOTAL - 1 }, (_, i) => `<i class="${i < step ? "on" : ""}"></i>`).join("") : ""}</div>
        ${step < TOTAL ? `<button type="button" class="ob-skip">Skip</button>` : "<span></span>"}</div>
      <div class="ob-body" style="--dir:${dir}">${step < TOTAL ? screens[step]() : step === TOTAL ? prep() : ready()}</div>
      <div class="ob-foot">${step === 0 ? `<button type="button" class="jelly ob-next">Shuru karein ${ARROW}</button><button type="button" class="ob-ghost ob-demo">Pehle Sharma ghar dekho</button>`
        : step < TOTAL ? `<button type="button" class="jelly ob-next">${last ? "Ghar banao" : "Aage"} ${ARROW}</button>`
        : step === TOTAL ? "" : `<a class="jelly ob-tg-btn" href="https://t.me/${BOT}?start=join" target="_blank" rel="noopener">${TG} Telegram pe jodo</a><button type="button" class="ob-ghost ob-demo">Pehle Sharma ghar ki ek raat dekho</button>`}</div>`;
    wire();
  }

  function wire() {
    root.querySelector(".ob-next")?.addEventListener("click", next);
    root.querySelector(".ob-back")?.addEventListener("click", () => { step--; paint(-1); });
    root.querySelector(".ob-skip")?.addEventListener("click", finish);
    root.querySelectorAll(".ob-demo").forEach((b) => b.addEventListener("click", finish));
    root.querySelector(".ob-tg-btn")?.addEventListener("click", () => setTimeout(finish, 400));
    root.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.m;
      const has = pick.members.includes(k);
      if (has && pick.members.length === 1) return;
      pick.members = has ? pick.members.filter((x) => x !== k) : [...pick.members, k];
      b.classList.toggle("on", !has);
      b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
      const c = root.querySelector("[data-count]");
      c.textContent = pick.members.length;
      c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
      if (!pick.members.includes(pick.duty)) pick.duty = pick.members[0];
    }));
    root.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.r;
      const has = pick.rules.includes(k);
      pick.rules = has ? pick.rules.filter((x) => x !== k) : [...pick.rules, k];
      b.classList.toggle("on", !has);
    }));
    root.querySelectorAll("[data-seg]").forEach((seg) => seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      pick[seg.dataset.seg] = b.dataset.v;
      seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    }));
    const cook = root.querySelector("[data-cook]");
    cook?.addEventListener("input", () => {
      pick.cook = cook.value.trim() || "Sunita";
      root.querySelector(".ob-cook-av span").textContent = pick.cook[0].toUpperCase();
    });
    root.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => {
      pick.duty = b.dataset.d;
      root.querySelectorAll("[data-d]").forEach((x) => x.classList.toggle("on", x === b));
    }));
  }

  async function next() {
    store.set("baari:setup", pick);
    step++;
    paint(1);
    if (step === TOTAL) {
      const line = root.querySelector("[data-prep]");
      for (const t of ["Pantry gin rahe hain…", `${pick.cook} ji ke liye ${pick.lang} voice set kar rahe hain…`, "Thali ke niyam yaad kar rahe hain…"]) {
        await wait(800);
        if (line) { line.classList.remove("swap"); void line.offsetWidth; line.textContent = t; line.classList.add("swap"); }
      }
      await wait(700);
      step++;
      paint(1);
    }
  }

  async function finish() {
    store.set("baari:onboarded", true);
    store.set("baari:setup", pick);
    root.classList.add("is-out");
    await wait(420);
    root.remove();
    document.documentElement.classList.remove("ob-open");
    onDone && onDone();
  }

  paint(1);
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// ---- the + beside the nav. It turns into an ×, the screen behind blurs and
// a grid of household actions pops out of it, one after another. Only what
// works today is live; the rest are greyed with a "Soon" pill.
const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
export const ACTIONS = [
  { k: "vote", label: "Vote now", icon: I("M4 12.5 9 17.5 20 6.5l-1.4-1.4L9 14.7l-3.6-3.6z"), href: `https://t.me/${BOT}`, live: true },
  { k: "brief", label: "Hear the brief", icon: I("M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"), href: "#/sunita", live: true },
  { k: "guest", label: "Guest aa rahe", icon: I("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4zm10-5V5h-2v3h-3v2h3v3h2v-3h3V8z") },
  { k: "skip", label: "Kal bahar khaana", icon: I("M8 3h2v8a3 3 0 0 1-2 2.8V21H6v-7.2A3 3 0 0 1 4 11V3h2v6h1V3h1zm10 0v18h-2v-7h-3V7a4 4 0 0 1 4-4z") },
  { k: "leave", label: "Cook ki chhutti", icon: I("M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm4.5 2 2.5 2.5 2.5-2.5 1.4 1.4-2.5 2.5 2.5 2.5-1.4 1.4-2.5-2.5-2.5 2.5-1.4-1.4 2.5-2.5-2.5-2.5z") },
  { k: "pantry", label: "Pantry bolo", icon: I("M5 3h14v4H5zm1 5h12v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm4 3v2h4v-2z") },
  { k: "veto", label: "Dish veto", icon: I("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 0 0-6.3 12.9L16.9 5.7A8 8 0 0 0 12 4zm6.3 3.1L7.1 18.3A8 8 0 0 0 18.3 7.1z") },
  { k: "pass", label: "Baari badlo", icon: I("M7 7h10V4l4 4-4 4V9H7zm10 10H7v3l-4-4 4-4v3h10z") },
  { k: "rule", label: "Niyam jodo", icon: I("M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5zM11 11v3H8v2h3v3h2v-3h3v-2h-3v-3z") },
];

export function fab() {
  const btn = document.querySelector(".fab");
  if (!btn) return;
  const scrim = document.createElement("div");
  scrim.className = "fab-scrim";
  const menu = document.createElement("div");
  menu.className = "fab-menu";
  menu.id = "fab-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = ACTIONS.map((a, i) => {
    const inner = `<span class="fa-ic">${a.icon}</span><b>${a.label}</b>${a.live ? "" : '<em class="soon">Soon</em>'}`;
    return a.live
      ? `<a role="menuitem" class="fa" href="${a.href}" ${a.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""} style="--i:${i}">${inner}</a>`
      : `<button role="menuitem" class="fa off" type="button" aria-disabled="true" style="--i:${i}">${inner}</button>`;
  }).join("");
  document.body.append(scrim, menu);
  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("fab-open", open);
    if (!open) { menu.classList.add("is-closing"); setTimeout(() => menu.classList.remove("is-closing"), 260); }
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  scrim.addEventListener("click", () => set(false));
  menu.addEventListener("click", (e) => {
    const off = e.target.closest(".fa.off");
    if (off) { off.classList.remove("nope"); void off.offsetWidth; off.classList.add("nope"); return; }
    if (e.target.closest(".fa")) set(false);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
}
