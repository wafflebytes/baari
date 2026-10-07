// The app around the screens: splash, first-run onboarding and the action
// menu that grows out of the + beside the nav.
const BOT = "Baari_ken_bot";
const qs = new URLSearchParams(location.search);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const tap = () => { if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) {} };
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

// ---- onboarding: language, who eats, who you are (and your face), plate
// rules, the cook, whose turn. Every step is a tap, nothing to type except
// the cook's name, and it fits one phone screen without scrolling.

const L3 = (en, hing, hi) => ({ en, hing, hi });
const COPY = {
  kick0: L3("Decided by 9:30 pm. Ready by 8 am.", "Raat 9:30 tak tay. Subah 8 baje taiyaar.", "रात 9:30 तक तय। सुबह 8 बजे तैयार।"),
  h0: L3("What's for<br>lunch tomorrow?", "Kal kya<br>banega?", "कल क्या<br>बनेगा?"),
  p0: L3("Baari asks your family on Telegram, settles it, gets the groceries in overnight and tells your cook in her language.", "Baari family se Telegram pe poochta hai, tay karta hai, raat mein saamaan mangata hai aur cook ko unki bhasha mein batata hai.", "बारी परिवार से टेलीग्राम पर पूछता है, तय करता है, रात में सामान मँगाता है और कुक को उनकी भाषा में बताता है।"),
  start: L3("Get started", "Shuru karein", "शुरू करें"),
  peek: L3("Look around the Sharma home first", "Pehle Sharma ghar dekho", "पहले शर्मा घर देखो"),
  next: L3("Continue", "Aage", "आगे"), done: L3("Set up my home", "Ghar banao", "घर बनाओ"), skip: L3("Skip", "Skip", "छोड़ें"),
  h1: L3("Who eats<br>at home?", "Ghar mein<br>kaun kaun?", "घर में<br>कौन कौन?"),
  p1: L3("Everyone who eats gets a vote.", "Jo khaata hai, uska vote.", "जो खाता है, उसका वोट।"),
  count: L3("people eat", "log khaate hain", "लोग खाते हैं"),
  h2: L3("Which one<br>are you?", "Aap kaun<br>ho?", "आप कौन<br>हो?"),
  p2: L3("Pick yourself, then your face and colour.", "Khud ko chuno, phir chehra aur rang.", "खुद को चुनो, फिर चेहरा और रंग।"),
  h3: L3("Plate<br>rules", "Thali ke<br>niyam", "थाली के<br>नियम"),
  p3: L3("Baari never breaks these, whatever the vote says.", "Vote kuch bhi kahe, Baari ye kabhi nahi todta.", "वोट कुछ भी कहे, बारी ये कभी नहीं तोड़ता।"),
  h4: L3("Who<br>cooks?", "Khana kaun<br>banata hai?", "खाना कौन<br>बनाता है?"),
  p4: L3("A voice note every morning. No app, never her own money.", "Har subah ek voice note. Na app, na apna paisa.", "हर सुबह एक वॉइस नोट। न ऐप, न अपना पैसा।"),
  name: L3("Her name", "Unka naam", "उनका नाम"), at: L3("Comes at", "Kitne baje", "कितने बजे"), in: L3("Voice notes in", "Voice note ki bhasha", "वॉइस नोट की भाषा"),
  h5: L3("Whose turn<br>this week?", "Is hafte kiski<br>baari?", "इस हफ़्ते किसकी<br>बारी?"),
  p5: L3("They break ties and okay anything over ₹300. It rotates on Mondays.", "Tie todte hain, ₹300 se upar haan bolte hain. Har Somvaar badalti hai.", "टाई तोड़ते हैं, ₹300 से ऊपर हाँ बोलते हैं। हर सोमवार बदलती है।"),
  turn: L3("on duty", "ki baari", "की बारी"),
  own: L3("Your own rule", "Apna niyam", "अपना नियम"), ownph: L3("Say it or type it, any language", "Bolo ya likho, kisi bhi bhasha mein", "बोलो या लिखो, किसी भी भाषा में"),
  later: L3("Not sure yet? Skip it. Baari asks one small question at a time later, or calls you for two minutes.", "Abhi pata nahi? Chhod do. Baari baad mein ek-ek chhota sawaal poochega, ya 2 minute call kar lega.", "अभी पता नहीं? छोड़ दो। बारी बाद में एक-एक छोटा सवाल पूछेगा।"),
  prep: [L3("Counting the pantry…", "Pantry gin rahe hain…", "पेंट्री गिन रहे हैं…"), L3("Teaching Baari your plate rules…", "Thali ke niyam yaad kar rahe hain…", "थाली के नियम याद कर रहे हैं…"), L3("Setting up her voice note…", "Voice note set kar rahe hain…", "वॉइस नोट सेट कर रहे हैं…")],
  ready: L3("All set", "Sab set", "सब तैयार"), yours: L3("Your home", "Aapka ghar", "आपका घर"),
  people: L3("people", "log", "लोग"), rules: L3("rules", "niyam", "नियम"), cook: L3("Cook", "Cook", "कुक"), duty: L3("This week", "Is hafte", "इस हफ़्ते"), brief: L3("Brief", "Brief", "ब्रीफ़"),
  hj: L3("Now bring the family<br>onto Telegram", "Ab family ko<br>Telegram pe jodo", "अब परिवार को<br>टेलीग्राम पर जोड़ो"),
  pj: L3("Everyone taps one link. Votes and anything that needs a yes come through there.", "Sab ek link tap karein. Vote aur jo bhi haan chahiye, wahin aata hai.", "सब एक लिंक टैप करें। वोट और जो भी हाँ चाहिए, वहीं आता है।"),
  tg: L3("Join on Telegram", "Telegram pe jodo", "टेलीग्राम पर जोड़ो"),
  night: L3("First, watch a night at the Sharmas'", "Pehle Sharma ghar ki ek raat dekho", "पहले शर्मा घर की एक रात देखो"),
};
const MEMBERS = [
  { k: "main", l: L3("Me", "Main", "मैं"), em: "🙋🏽" }, { k: "mummy", l: L3("Mummy", "Mummy", "मम्मी"), em: "👩🏽" },
  { k: "papa", l: L3("Papa", "Papa", "पापा"), em: "👨🏽‍🦳" }, { k: "didi", l: L3("Didi", "Didi", "दीदी"), em: "👧🏽" },
  { k: "bhaiya", l: L3("Bhaiya", "Bhaiya", "भैया"), em: "👦🏽" }, { k: "dadi", l: L3("Dadi", "Dadi", "दादी"), em: "👵🏽" },
  { k: "dadaji", l: L3("Dada ji", "Dada ji", "दादा जी"), em: "👴🏽" }, { k: "bachche", l: L3("Kids", "Bachche", "बच्चे"), em: "🧒🏽" },
];
const RULES = [
  { k: "aloo", l: L3("No potato on Papa's plate", "Papa ki thali mein aloo nahi", "पापा की थाली में आलू नहीं") },
  { k: "tue", l: L3("No non-veg on Tuesdays", "Mangalvaar ko non-veg nahi", "मंगलवार को नॉन-वेज नहीं") },
  { k: "oil", l: L3("Less oil for Mummy", "Mummy ke liye kam tel", "मम्मी के लिए कम तेल") },
  { k: "teekha", l: L3("Less spice for the kids", "Bachchon ke liye kam teekha", "बच्चों के लिए कम तीखा") },
  { k: "navratri", l: L3("No onion or garlic in Navratri", "Navratri mein pyaaz-lehsun nahi", "नवरात्रि में प्याज़-लहसुन नहीं") },
  { k: "egg", l: L3("Eggs only on weekends", "Anda sirf weekend pe", "अंडा सिर्फ़ वीकेंड पर") },
  { k: "repeat", l: L3("No dish twice a week", "Ek hafte mein ek dish do baar nahi", "एक हफ़्ते में एक डिश दो बार नहीं") },
];
const FACES = ["🧔🏽", "👨🏽", "👩🏽", "👱🏽‍♀️", "🧕🏽", "👳🏽‍♂️", "👨🏽‍🦳", "👵🏽", "👧🏽", "👦🏽", "🧑🏽‍💻", "🙋🏽"];
const TINTS = ["sand", "rose", "sky", "mint", "clay", "stone"];
const LANGS = ["Hindi", "Marathi", "Bangla", "Tamil", "Kannada"];
const TIMES = ["7:00", "7:30", "8:00", "8:30", "9:00"];
const mins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const hm = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
const MIC_OK = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"/></svg>';
const DISH_IMG = ["rajma", "palak-paneer", "kadhi", "aloo-puri", "lauki-chana-dal", "egg-bhurji"];
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 5.3 20 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.2l-4.3-4.3z"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.7l5.5 5.5L20 8.7l-1.5-1.5z"/></svg>';

export function needsOnboarding() {
  if (qs.has("onboard")) return true;
  if (qs.has("fixture") || qs.has("skip")) return false;
  return !store.get("baari:onboarded");
}

export function onboard({ onDone } = {}) {
  const pick = { ui: "hing", members: ["main", "mummy", "papa"], rules: ["aloo"], cook: "Sunita", time: "8:00", lang: "Hindi", duty: "main", me: { who: "main", face: "🧔🏽", tint: "sand" }, ...(store.get("baari:setup") || {}) };
  const root = document.createElement("div");
  root.className = "ob";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  document.body.appendChild(root);
  document.documentElement.classList.add("ob-open");
  let step = 0;
  const STEPS = 6; // 0 welcome, 1..5 questions, then prep, then ready
  const t = (k) => (COPY[k] ? COPY[k][pick.ui] : k);
  const lbl = (m) => m.l[pick.ui];
  const people = () => pick.members.map((k) => MEMBERS.find((m) => m.k === k)).filter(Boolean);
  const meAv = (cls = "") => `<span class="av t-${pick.me.tint} ${cls}">${pick.me.face}</span>`;
  // Times: tap one and it opens sideways into − 8:00 +, 15 minutes a step.
  const near = () => TIMES.reduce((b, x) => (Math.abs(mins(x) - mins(pick.time)) < Math.abs(mins(b) - mins(pick.time)) ? x : b), TIMES[0]);
  const timeChips = () => TIMES.map((x) => (x === near() ? `<span class="xc on"><button type="button" data-tstep="-15" aria-label="15 min earlier">−</button><b data-tv>${pick.time}</b><button type="button" data-tstep="15" aria-label="15 min later">+</button></span>` : `<button type="button" class="xc" data-t="${x}"><b>${x}</b></button>`)).join("");
  const head = (n) => `<div class="ob-copy"><h1>${t("h" + n)}</h1><p>${t("p" + n)}</p></div>`;

  const screens = [
    () => `<div class="ob-lang" role="radiogroup">${[["en", "English"], ["hing", "Hinglish"], ["hi", "हिंदी"]].map(([k, l]) => `<button type="button" role="radio" aria-checked="${pick.ui === k}" class="${pick.ui === k ? "on" : ""}" data-ui="${k}">${l}</button>`).join("")}<i class="ob-lang-pill"></i></div>
      <div class="ob-orbit" aria-hidden="true"><div class="ob-ring">${DISH_IMG.map((f, i) => `<span style="--a:${i * 60}deg"><img src="/img/dishes/${f}.webp" alt=""></span>`).join("")}</div><img class="ob-mark" src="/img/baari-mark.png" alt=""></div>
      <div class="ob-copy end"><p class="ob-kick">${t("kick0")}</p><h1>${t("h0")}</h1><p>${t("p0")}</p></div>`,
    () => `${head(1)}<div class="ob-grid">${MEMBERS.map((m) => `<button type="button" class="ob-tile ${pick.members.includes(m.k) ? "on" : ""}" data-m="${m.k}" aria-pressed="${pick.members.includes(m.k)}"><span class="ob-em">${m.em}</span><b>${lbl(m)}</b><i>${CHECK}</i></button>`).join("")}</div>
      <p class="ob-count"><b data-count>${pick.members.length}</b> ${t("count")}</p>`,
    () => `${head(2)}<div class="ob-me">${meAv("ob-me-av")}
        <div class="ob-who">${people().map((m) => `<button type="button" class="${pick.me.who === m.k ? "on" : ""}" data-who="${m.k}">${lbl(m)}</button>`).join("")}</div>
        <div class="ob-faces">${FACES.map((f) => `<button type="button" class="${pick.me.face === f ? "on" : ""}" data-face="${f}">${f}</button>`).join("")}</div>
        <div class="ob-tints">${TINTS.map((c) => `<button type="button" class="t-${c} ${pick.me.tint === c ? "on" : ""}" data-tint="${c}" aria-label="${c}"></button>`).join("")}</div></div>`,
    () => `${head(3)}<div class="ob-chips">${RULES.map((r) => `<button type="button" class="ob-chip ${pick.rules.includes(r.k) ? "on" : ""}" data-r="${r.k}" aria-pressed="${pick.rules.includes(r.k)}"><i>${CHECK}</i>${lbl(r)}</button>`).join("")}
        ${(pick.custom || []).map((c, i) => `<button type="button" class="ob-chip on own" data-own="${i}"><i>${CHECK}</i>${esc(c)}</button>`).join("")}
        <div class="ob-ownw"><button type="button" class="ob-chip add" data-addown>+ ${t("own")}</button>
          <div class="ob-own"><input data-owntext placeholder="${t("ownph")}" maxlength="60" enterkeyhint="done" autocomplete="off">${MIC_OK ? `<button type="button" class="ob-mic" data-mic aria-label="Speak">${MIC}</button>` : ""}<button type="button" class="ob-ownok" data-ownok aria-label="Add">${CHECK}</button></div></div></div>
        <p class="ob-later">${t("later")}</p>`,
    () => `${head(4)}<div class="ob-cook"><div class="ob-cook-top"><span class="av t-mint ob-cook-av">👩🏽‍🍳</span><label class="ob-field"><span>${t("name")}</span><input data-cook value="${esc(pick.cook)}" maxlength="20" autocomplete="off" enterkeyhint="done"></label></div>
        <div class="ob-row"><span>${t("at")}</span><div class="ob-times" data-times>${timeChips()}</div></div>
        <div class="ob-row"><span>${t("in")}</span><div class="ob-seg" data-seg="lang">${LANGS.map((x) => `<button type="button" class="${pick.lang === x ? "on" : ""}" data-v="${x}">${x}</button>`).join("")}</div></div></div>`,
    () => `${head(5)}<div class="ob-wheel">${people().map((m, i, all) => `<button type="button" class="ob-seat ${pick.duty === m.k ? "on" : ""}" data-d="${m.k}" style="--a:${(360 / all.length) * i}deg"><span>${m.k === pick.me.who ? `<span class="av t-${pick.me.tint} xs">${pick.me.face}</span>` : m.em}</span><b>${lbl(m)}</b></button>`).join("")}
        <div class="ob-hub"><img src="/img/baari-mark.png" alt=""><small data-dutyname>${lbl(MEMBERS.find((m) => m.k === pick.duty) || people()[0])} ${t("turn")}</small></div></div>`,
  ];
  const prep = () => `<div class="ob-prep"><div class="ob-card-ghost" aria-hidden="true"><i></i><i></i><i></i></div><p class="ob-kick" data-prep>${COPY.prep[0][pick.ui]}</p></div>`;
  const ready = () => {
    const ppl = people();
    const duty = MEMBERS.find((m) => m.k === pick.duty) || ppl[0];
    return `<div class="ob-ready"><p class="ob-kick">${t("ready")}</p>
      <div class="ob-house"><div class="ob-house-top"><img src="/img/baari-mark.png" alt=""><div><b>${t("yours")}</b><span>${ppl.length} ${t("people")} · ${pick.rules.length} ${t("rules")}</span></div></div>
        <div class="ob-house-faces">${ppl.map((m) => (m.k === pick.me.who ? `<span class="av t-${pick.me.tint} sm">${pick.me.face}</span>` : `<span class="av t-stone sm">${m.em}</span>`)).join("")}</div>
        <dl><div><dt>${t("cook")}</dt><dd>${esc(pick.cook)} · ${pick.time}</dd></div><div><dt>${t("duty")}</dt><dd>${duty ? lbl(duty) : ""}</dd></div><div><dt>${t("brief")}</dt><dd>${pick.lang}</dd></div></dl></div>
      <div class="ob-copy"><h1 class="sm">${t("hj")}</h1><p>${t("pj")}</p></div></div>`;
  };

  function paint(dir = 1) {
    const q = step >= 1 && step < STEPS;
    root.innerHTML = `<div class="ob-top">${q ? `<button type="button" class="ob-back" aria-label="Back">${BACK}</button>` : "<span></span>"}
        <div class="ob-dots">${q ? Array.from({ length: STEPS - 1 }, (_, i) => `<i class="${i < step ? "on" : ""}"></i>`).join("") : ""}</div>
        ${step < STEPS ? `<button type="button" class="ob-skip">${t("skip")}</button>` : "<span></span>"}</div>
      <div class="ob-body s${step}" style="--dir:${dir}">${step < STEPS ? screens[step]() : step === STEPS ? prep() : ready()}</div>
      <div class="ob-foot">${step === 0 ? `<button type="button" class="ob-cta ob-next">${t("start")} ${ARROW}</button><button type="button" class="ob-ghost ob-demo">${t("peek")}</button>`
        : step < STEPS ? `<button type="button" class="ob-cta ob-next">${step === STEPS - 1 ? t("done") : t("next")} ${ARROW}</button>`
        : step === STEPS ? "" : `<a class="ob-cta ob-tg-btn" href="https://t.me/${BOT}?start=join" target="_blank" rel="noopener"><img src="/img/brands/telegram.svg" alt="" class="ob-tg"> ${t("tg")}</a><button type="button" class="ob-ghost ob-demo">${t("night")}</button>`}</div>`;
    root.querySelector(".ob-lang") && placeLang();
    wire();
  }
  function placeLang() {
    const box = root.querySelector(".ob-lang"), on = box.querySelector(".on"), pill = box.querySelector(".ob-lang-pill");
    pill.style.width = `${on.offsetWidth}px`; pill.style.transform = `translateX(${on.offsetLeft - 4}px)`;
  }
  const bump = (el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };

  function wire() {
    root.querySelector(".ob-next")?.addEventListener("click", next);
    root.querySelector(".ob-back")?.addEventListener("click", () => { step--; paint(-1); });
    root.querySelector(".ob-skip")?.addEventListener("click", finish);
    root.querySelectorAll(".ob-demo").forEach((b) => b.addEventListener("click", finish));
    root.querySelector(".ob-tg-btn")?.addEventListener("click", () => setTimeout(finish, 400));
    root.querySelectorAll("[data-ui]").forEach((b) => b.addEventListener("click", () => {
      pick.ui = b.dataset.ui;
      root.querySelectorAll("[data-ui]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); });
      placeLang();
      const body = root.querySelector(".ob-copy.end"), foot = root.querySelector(".ob-foot");
      body.classList.add("swap-out"); foot.classList.add("swap-out");
      setTimeout(() => {
        body.innerHTML = `<p class="ob-kick">${t("kick0")}</p><h1>${t("h0")}</h1><p>${t("p0")}</p>`;
        foot.querySelector(".ob-next").innerHTML = `${t("start")} ${ARROW}`;
        foot.querySelector(".ob-demo").textContent = t("peek");
        root.querySelector(".ob-skip").textContent = t("skip");
        body.classList.remove("swap-out"); foot.classList.remove("swap-out");
      }, 150);
    }));
    root.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.m, has = pick.members.includes(k);
      if (has && pick.members.length === 1) return bump(b);
      pick.members = has ? pick.members.filter((x) => x !== k) : [...pick.members, k];
      b.classList.toggle("on", !has); b.setAttribute("aria-pressed", String(!has)); bump(b);
      const c = root.querySelector("[data-count]"); c.textContent = pick.members.length; bump(c);
      if (!pick.members.includes(pick.duty)) pick.duty = pick.members[0];
      if (!pick.members.includes(pick.me.who)) pick.me.who = pick.members[0];
    }));
    const meEl = root.querySelector(".ob-me-av");
    const setMe = (key, val, attr) => {
      pick.me[key] = val;
      root.querySelectorAll(`[${attr}]`).forEach((x) => x.classList.toggle("on", x.getAttribute(attr) === val));
      meEl.className = `av t-${pick.me.tint} ob-me-av`; meEl.textContent = pick.me.face; bump(meEl);
    };
    root.querySelectorAll("[data-who]").forEach((b) => b.addEventListener("click", () => {
      const m = MEMBERS.find((x) => x.k === b.dataset.who);
      setMe("who", b.dataset.who, "data-who");
      if (m && m.k !== "main") setMe("face", m.em, "data-face");
    }));
    root.querySelectorAll("[data-face]").forEach((b) => b.addEventListener("click", () => setMe("face", b.dataset.face, "data-face")));
    root.querySelectorAll("[data-tint]").forEach((b) => b.addEventListener("click", () => setMe("tint", b.dataset.tint, "data-tint")));
    root.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.r, has = pick.rules.includes(k);
      pick.rules = has ? pick.rules.filter((x) => x !== k) : [...pick.rules, k];
      b.classList.toggle("on", !has); b.setAttribute("aria-pressed", String(!has));
    }));
    root.querySelectorAll("[data-seg]").forEach((seg) => seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      pick[seg.dataset.seg] = b.dataset.v;
      seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }));
    const tbox = root.querySelector("[data-times]");
    tbox?.addEventListener("click", (e) => {
      const st = e.target.closest("[data-tstep]");
      if (st) {
        const n = Math.max(mins("5:00"), Math.min(mins("11:45"), mins(pick.time) + +st.dataset.tstep));
        pick.time = hm(n);
        const cur = [...tbox.children].indexOf(tbox.querySelector(".xc.on"));
        if (TIMES.indexOf(near()) !== cur) tbox.innerHTML = timeChips();
        const nv = tbox.querySelector("[data-tv]");
        nv.textContent = pick.time;
        nv.classList.remove("tick-up", "tick-down"); void nv.offsetWidth; nv.classList.add(+st.dataset.tstep > 0 ? "tick-up" : "tick-down");
        tap();
        return;
      }
      const c = e.target.closest("[data-t]");
      if (c) { pick.time = c.dataset.t; tbox.innerHTML = timeChips(); tap(); }
    });
    const ownw = root.querySelector(".ob-ownw");
    const addOwn = () => {
      const inp = root.querySelector("[data-owntext]");
      const v = inp.value.trim();
      if (!v) return;
      pick.custom = [...(pick.custom || []), v];
      store.set("baari:setup", pick);
      paint(0);
      tap();
    };
    root.querySelector("[data-addown]")?.addEventListener("click", () => { ownw.classList.add("open"); setTimeout(() => root.querySelector("[data-owntext]").focus(), 200); });
    root.querySelector("[data-ownok]")?.addEventListener("click", addOwn);
    root.querySelector("[data-owntext]")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addOwn(); });
    root.querySelectorAll("[data-own]").forEach((b) => b.addEventListener("click", () => { pick.custom.splice(+b.dataset.own, 1); paint(0); }));
    root.querySelector("[data-mic]")?.addEventListener("click", (e) => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new R();
      rec.lang = pick.ui === "en" ? "en-IN" : "hi-IN";
      const b = e.currentTarget;
      b.classList.add("rec");
      rec.onresult = (ev) => { root.querySelector("[data-owntext]").value = ev.results[0][0].transcript; };
      rec.onend = () => b.classList.remove("rec");
      try { rec.start(); } catch (err) { b.classList.remove("rec"); }
    });
    const cook = root.querySelector("[data-cook]");
    cook?.addEventListener("input", () => { pick.cook = cook.value.trim() || "Sunita"; });
    root.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => {
      pick.duty = b.dataset.d;
      root.querySelectorAll("[data-d]").forEach((x) => x.classList.toggle("on", x === b));
      const n = root.querySelector("[data-dutyname]");
      n.textContent = `${lbl(MEMBERS.find((m) => m.k === pick.duty))} ${t("turn")}`; bump(n);
    }));
  }

  async function next() {
    store.set("baari:setup", pick);
    step++;
    paint(1);
    if (step === STEPS) {
      const line = root.querySelector("[data-prep]");
      for (const p of COPY.prep.slice(1)) {
        await wait(850);
        line.classList.remove("swap"); void line.offsetWidth; line.textContent = p[pick.ui]; line.classList.add("swap");
      }
      await wait(800);
      step++;
      paint(1);
    }
  }

  async function finish() {
    const langChanged = (store.get("baari:setup") || {}).ui !== pick.ui;
    store.set("baari:onboarded", true);
    store.set("baari:setup", pick);
    root.classList.add("is-out");
    await wait(420);
    if (qs.has("onboard") || langChanged) { location.replace("/"); return; }
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
  { k: "vote", l: L3("Vote now", "Vote karo", "वोट करो"), icon: I("M4 12.5 9 17.5 20 6.5l-1.4-1.4L9 14.7l-3.6-3.6z"), href: `https://t.me/${BOT}`, live: true },
  { k: "treat", l: L3("Treat night", "Aaj treat", "आज ट्रीट"), icon: I("M8 3h2v8a3 3 0 0 1-2 2.8V21H6v-7.2A3 3 0 0 1 4 11V3h2v6h1V3h1zm10 0v18h-2v-7h-3V7a4 4 0 0 1 4-4z"), act: true, live: true },
  { k: "guest", l: L3("Guests coming", "Mehmaan aa rahe", "मेहमान आ रहे"), icon: I("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4zm10-5V5h-2v3h-3v2h3v3h2v-3h3V8z"), act: true, live: true },
  { k: "leave", l: L3("Cook on leave", "Cook ki chhutti", "कुक की छुट्टी"), icon: I("M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm4.5 2 2.5 2.5 2.5-2.5 1.4 1.4-2.5 2.5 2.5 2.5-1.4 1.4-2.5-2.5-2.5 2.5-1.4-1.4 2.5-2.5-2.5-2.5z"), act: true, live: true },
  { k: "shuffle", l: L3("Shuffle dish", "Dish badlo", "डिश बदलो"), icon: I("M17 3l4 4-4 4V8h-2.6l-7 8H4v-2h2.6l7-8H17zm0 10 4 4-4 4v-3h-3.4l-2.3-2.6 1.4-1.6 1.8 2.2H17zM4 6h3.4l2.3 2.6-1.4 1.6L6.5 8H4z"), act: true, live: true },
  { k: "left", l: L3("Log leftovers", "Bacha khaana", "बचा खाना"), icon: I("M3 11h18a9 9 0 0 1-18 0zm4-7c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3zm5 0c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3zm5 0c1 1 1 2 0 3s-1 2 0 3h-2c-1-1-1-2 0-3s1-2 0-3z"), act: true, live: true },
  { k: "brief", l: L3("Hear the brief", "Brief suno", "ब्रीफ़ सुनो"), icon: I("M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V20h-2v-3.1A6 6 0 0 1 6 11z"), href: "#/sunita", live: true },
  { k: "pantry", l: L3("Say the pantry", "Pantry bolo", "पेंट्री बोलो"), icon: I("M5 3h14v4H5zm1 5h12v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm4 3v2h4v-2z") },
  { k: "rule", l: L3("Add a rule", "Niyam jodo", "नियम जोड़ो"), icon: I("M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5zM11 11v3H8v2h3v3h2v-3h3v-2h-3v-3z") },
];

export function fab({ onAct } = {}) {
  const ui = (store.get("baari:setup") || {}).ui || "hing";
  const btn = document.querySelector(".fab");
  if (!btn) return;
  const scrim = document.createElement("div");
  scrim.className = "fab-scrim";
  const menu = document.createElement("div");
  menu.className = "fab-menu";
  menu.id = "fab-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = ACTIONS.map((a, i) => {
    const inner = `<span class="fa-ic">${a.icon}</span><b>${a.l[ui]}</b>${a.live ? "" : '<em class="soon">Soon</em>'}`;
    if (a.act) return `<button role="menuitem" class="fa" type="button" data-act="${a.k}" style="--i:${i}">${inner}</button>`;
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
    const act = e.target.closest("[data-act]");
    // Guests: the tile itself turns into a − n + stepper; the rest close
    // the menu and run.
    if (act && act.dataset.act === "guest") { onAct && onAct("guest", act, () => set(false)); return; }
    if (act) { set(false); setTimeout(() => onAct && onAct(act.dataset.act, act), 200); return; }
    if (e.target.closest(".fa")) set(false);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
}
